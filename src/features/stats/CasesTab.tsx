import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import { CaseView } from "../../components/CubeView";
import { Button, Empty, fmt, Section, StatusPill, Tabs } from "../../components/ui";
import { caseState } from "../../cube/cube";
import { getCase, getSet, VIEW } from "../../data/algsets";
import { type AlgSetId, type CaseKey, caseKey } from "../../data/types";
import type { Attempt, CaseProgress, Solve } from "../../db/db";
import { chosenAlg } from "../../db/progress";
import { aufMisses, type CaseCost, caseCosts, mixUps, okTimes, RECOG_TARGET_MS, type Trend, taggedPhaseTimes, trend } from "../../lib/analytics";
import { median } from "../../lib/stats";
import { TARGET_MS } from "../../srs/srs";
import { Metric } from "./common";

const SETS = ["OLL", "PLL", "F2L", "COLL", "WV"] as const;
const TOP = 5;

const caseName = (key: CaseKey) => {
  const def = getCase(key)!.def;
  return def.name === def.id ? def.id : `${def.id}: ${def.name}`;
};
const caseLink = (key: CaseKey) => `/library/${key.split(":")[0]}/${encodeURIComponent(getCase(key)!.def.id)}`;

function Thumb({ caseKey: key, progress, size = 40 }: { caseKey: CaseKey; progress: Map<string, CaseProgress>; size?: number }) {
  const set = key.split(":")[0] as AlgSetId;
  return <CaseView view={VIEW[set].view} mask={VIEW[set].mask} state={caseState(chosenAlg(key, progress.get(key)))} size={size} />;
}

export function CasesTab({ attempts, progress, solves }: { attempts: Attempt[]; progress: Map<string, CaseProgress>; solves: Solve[] }) {
  const [set, setSet] = useState<AlgSetId>("OLL");
  const inSet = useMemo(() => attempts.filter((a) => a.caseKey.startsWith(`${set}:`)), [attempts, set]);
  return (
    <>
      <div className="mb-6">
        <Tabs<AlgSetId> label="Set" value={set} onChange={setSet} options={SETS.map((s) => ({ value: s, label: s }))} />
      </div>
      {(set === "OLL" || set === "PLL") && (
        <>
          <NextSecond set={set} attempts={inSet} progress={progress} solves={solves} />
          <MixUps set={set} attempts={inSet} progress={progress} />
        </>
      )}
      <EveryCase set={set} attempts={inSet} progress={progress} />
    </>
  );
}

function NextSecond({ set, attempts, progress, solves }: { set: "OLL" | "PLL"; attempts: Attempt[]; progress: Map<string, CaseProgress>; solves: Solve[] }) {
  const navigate = useNavigate();
  const target = TARGET_MS[set];
  const costs = useMemo(() => caseCosts(set, attempts, progress, target), [set, attempts, progress, target]);
  const inSolves = useMemo(() => taggedPhaseTimes(solves, set), [solves, set]);

  const measured = costs.filter((c) => c.exec != null && c.recog != null);
  const share = measured.reduce((a, c) => a + c.probability, 0);
  const expected = share ? measured.reduce((a, c) => a + c.probability * (c.exec! + c.recog!), 0) / share : null;
  const ranked = costs.filter((c) => c.cost > 0).sort((a, b) => b.cost - a.cost);
  const top = ranked.slice(0, TOP);
  const saving = top.reduce((a, c) => a + c.cost, 0);
  const unlearned = costs.filter((c) => c.status === "new").sort((a, b) => b.probability - a.probability);
  const unlearnedShare = unlearned.reduce((a, c) => a + c.probability, 0);

  return (
    <Section title="Where your next second is">
      <p className="mb-2 max-w-[70ch] text-sm text-ink-2">
        A case costs you time in proportion to how often it comes up and how far you are from rough sub-10 targets: {fmt(RECOG_TARGET_MS)} s to
        recognise (answer included) and {fmt(target)} s to execute. Cases you haven't practised in the trainer and on the Recognise page aren't
        counted yet.
      </p>
      <div className="metric-grid">
        <Metric label={`Your ${set}, recognise and execute`} value={fmt(expected)} accent>
          {measured.length
            ? `Average per solve over ${measured.length} cases (${Math.round(share * 100)}% of solves). Target ${fmt(target + RECOG_TARGET_MS)}.`
            : "Practise cases in the trainer and on the Recognise page to see this."}
        </Metric>
        <Metric label={`Fixing your top ${top.length || TOP}`} value={saving ? `−${fmt(saving)}` : "–"}>
          Seconds saved per solve on average if they reached the targets.
        </Metric>
        <Metric label="Not learned yet" value={`${Math.round(unlearnedShare * 100)}%`}>
          {unlearned.length
            ? `Of solves get one of the ${unlearned.length} ${set} cases you haven't learned.`
            : `You've learned every ${set} case.`}
        </Metric>
      </div>

      {top.length > 0 ? (
        <>
          <CostTable rows={ranked.slice(0, 10)} progress={progress} inSolves={inSolves} target={target} />
          <Button className="mt-4" variant="primary" onClick={() => navigate("/train", { state: { drillKeys: top.map((c) => c.key) } })}>
            Drill the top {top.length} in the trainer
          </Button>
        </>
      ) : (
        <Empty>
          Nothing measured is behind the targets yet. Practise {set} cases in the trainer and on the Recognise page to find out where your time goes.
        </Empty>
      )}

      {unlearned.length > 0 && (
        <div className="mt-8">
          <h3 className="mb-1 font-display text-base font-bold">Most common cases you haven't learned</h3>
          <p className="mb-3 text-sm text-ink-2">Learning these first replaces the most two-look solves.</p>
          <ul className="flex flex-wrap gap-2">
            {unlearned.slice(0, 8).map((c) => (
              <li key={c.key}>
                <Link to={caseLink(c.key)} className="flex items-center gap-2 rounded-lg border border-rule bg-panel py-1.5 pr-3 pl-1.5 hover:border-ink-3">
                  <Thumb caseKey={c.key} progress={progress} size={36} />
                  <span className="text-sm">
                    <span className="font-semibold">{getCase(c.key)!.def.id}</span>
                    <span className="block text-ink-3">1 in {Math.round(1 / c.probability)} solves</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Section>
  );
}

function CostTable({
  rows,
  progress,
  inSolves,
  target,
}: {
  rows: CaseCost[];
  progress: Map<string, CaseProgress>;
  inSolves: Map<CaseKey, { ms: number; n: number }>;
  target: number;
}) {
  const hi = rows[0]?.cost ?? 1;
  const showSolves = rows.some((r) => inSolves.has(r.key));
  // On a phone each case is two lines: the case, then its bar and numbers.
  const grid = showSolves
    ? "grid grid-cols-[minmax(0,1fr)_3.5rem_3.5rem_3.5rem] items-center gap-x-3 sm:grid-cols-[minmax(0,15rem)_minmax(0,1fr)_4.5rem_4.5rem_4.5rem]"
    : "grid grid-cols-[minmax(0,1fr)_3.5rem_3.5rem] items-center gap-x-3 sm:grid-cols-[minmax(0,15rem)_minmax(0,1fr)_4.5rem_4.5rem]";
  const num = (v: number | null, slow: boolean) => <span className={`text-right font-display text-lg tabular-nums ${slow ? "text-warn" : ""}`}>{fmt(v)}</span>;
  return (
    <div>
      <div className={`${grid} border-b border-rule pb-1 text-sm text-ink-3`}>
        <span>Case</span>
        <span className="hidden sm:block">Time lost per solve</span>
        <span className="text-right">Recognise</span>
        <span className="text-right">Execute</span>
        {showSolves && (
          <span className="text-right" title="Median OLL or PLL split in timed solves where you tagged this case">
            In solves
          </span>
        )}
      </div>
      <ol className="divide-y divide-rule">
        {rows.map((r) => {
          const tagged = inSolves.get(r.key);
          const bar = (
            <span className="flex items-center gap-2">
              <span className="h-3 rounded-r bg-steel" style={{ width: `${(r.cost / hi) * 70}%` }} />
              <span className="text-sm whitespace-nowrap tabular-nums">{(r.cost / 1000).toFixed(3)} s</span>
            </span>
          );
          return (
            <li key={r.key} className={`${grid} py-1.5`}>
              <Link to={caseLink(r.key)} className="flex min-w-0 items-center gap-3 hover:underline">
                <Thumb caseKey={r.key} progress={progress} />
                <span className="min-w-0">
                  <span className="block truncate">{caseName(r.key)}</span>
                  <span className="block text-sm text-ink-3">1 in {Math.round(1 / r.probability)} solves</span>
                  <span className="mt-1 block sm:hidden">{bar}</span>
                </span>
              </Link>
              <span className="hidden sm:block">{bar}</span>
              {num(r.recog, (r.recog ?? 0) > RECOG_TARGET_MS)}
              {num(r.exec, (r.exec ?? 0) > target)}
              {showSolves && (
                <span className="text-right font-display text-lg tabular-nums">
                  {tagged ? fmt(tagged.ms) : "–"}
                  {tagged && <span className="block font-sans text-xs text-ink-3">{tagged.n} tagged</span>}
                </span>
              )}
            </li>
          );
        })}
      </ol>
      <p className="mt-2 text-sm text-ink-3">Times in amber are slower than the target. Bars show the time each case costs you per solve, on average.</p>
    </div>
  );
}

function MixUps({ set, attempts, progress }: { set: "OLL" | "PLL"; attempts: Attempt[]; progress: Map<string, CaseProgress> }) {
  const navigate = useNavigate();
  const pairs = useMemo(() => mixUps(attempts).slice(0, 8), [attempts]);
  const auf = useMemo(() => [...aufMisses(attempts)].sort((a, b) => b[1] - a[1]), [attempts]);
  const practise = () => {
    const focus = [...new Set(pairs.slice(0, 4).flatMap((p) => [p.actual, p.picked]))];
    navigate(`/recognise?mode=${set === "OLL" ? "OLL" : "PLL2"}`, { state: { focus } });
  };
  return (
    <Section title="Cases you mix up">
      {pairs.length === 0 ? (
        <Empty>
          No mix-ups recorded yet. From now on, every wrong answer on the{" "}
          <Link to={`/recognise?mode=${set === "OLL" ? "OLL" : "PLL2"}`} className="underline">
            Recognise
          </Link>{" "}
          page notes which case you named, and the pairs you confuse show up here.
        </Empty>
      ) : (
        <>
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(15rem,1fr))] gap-3">
            {pairs.map((p) => (
              <li key={`${p.actual}${p.picked}`} className="flex items-center gap-3 rounded-lg border border-rule bg-panel p-3">
                <Link to={caseLink(p.actual)} title={caseName(p.actual)}>
                  <Thumb caseKey={p.actual} progress={progress} size={56} />
                </Link>
                <Link to={caseLink(p.picked)} title={caseName(p.picked)}>
                  <Thumb caseKey={p.picked} progress={progress} size={56} />
                </Link>
                <span className="text-sm">
                  <span className="block font-semibold">
                    {getCase(p.actual)!.def.id} and {getCase(p.picked)!.def.id}
                  </span>
                  <span className="text-ink-2">
                    Mixed up {p.n} time{p.n === 1 ? "" : "s"}
                  </span>
                </span>
              </li>
            ))}
          </ul>
          <Button className="mt-4" variant="primary" onClick={practise}>
            Practise telling these apart
          </Button>
        </>
      )}
      {auf.length > 0 && (
        <p className="mt-4 text-sm text-ink-2">
          Right case, wrong U turn before the alg: {auf.slice(0, 6).map(([k, n]) => `${getCase(k)!.def.id} (${n})`).join(", ")}.
        </p>
      )}
    </Section>
  );
}

const TREND_LABEL: Record<Trend | "stalled", { text: string; className: string }> = {
  faster: { text: "Getting faster", className: "text-ready" },
  steady: { text: "Steady", className: "text-ink-2" },
  slower: { text: "Slower lately", className: "text-warn" },
  stalled: { text: "Stalled", className: "text-warn font-semibold" },
};

interface Row {
  key: CaseKey;
  status: CaseProgress["status"];
  exec: number | null;
  recog: number | null;
  accuracy: number | null;
  trend: Trend | "stalled" | null;
  n: number;
  due?: number;
}

function EveryCase({ set, attempts, progress }: { set: AlgSetId; attempts: Attempt[]; progress: Map<string, CaseProgress> }) {
  const [sort, setSort] = useState<"exec" | "recog" | "accuracy" | "stalled">("exec");
  const navigate = useNavigate();

  const rows = useMemo<Row[]>(() => {
    const by = new Map<string, Attempt[]>();
    for (const a of attempts) by.set(a.caseKey, [...(by.get(a.caseKey) ?? []), a]);
    return getSet(set).cases.map((c) => {
      const key = caseKey(set, c.id);
      const as = by.get(key) ?? [];
      const times = okTimes(as, "exec");
      const exec = median(times.slice(-20));
      const recog = as.filter((a) => a.kind === "recog");
      const t = trend(times);
      return {
        key,
        status: progress.get(key)?.status ?? "new",
        exec,
        recog: median(okTimes(recog, "recog").slice(-20)),
        accuracy: recog.length ? recog.filter((a) => a.ok).length / recog.length : null,
        // Not getting faster while still slower than the target.
        trend: t && t !== "faster" && exec != null && exec > TARGET_MS[set] ? "stalled" : t,
        n: as.length,
        due: progress.get(key)?.dueAt,
      };
    });
  }, [attempts, progress, set]);

  const sorted = rows
    .filter((r) => r.n > 0 && (sort !== "stalled" || r.trend === "stalled"))
    .sort((a, b) =>
      sort === "accuracy" ? (a.accuracy ?? 1) - (b.accuracy ?? 1) : ((b[sort === "stalled" ? "exec" : sort] ?? 0) as number) - ((a[sort === "stalled" ? "exec" : sort] ?? 0) as number),
    );
  const slowest = sorted.slice(0, 10).map((r) => r.key);
  const stalled = rows.filter((r) => r.trend === "stalled").length;

  return (
    <Section title={`Every ${set} case you've practised`}>
      <div className="mb-4">
        <Tabs
          label="Sort by"
          value={sort}
          onChange={setSort}
          options={[
            { value: "exec", label: "Slowest execution" },
            { value: "recog", label: "Slowest recognition" },
            { value: "accuracy", label: "Most misrecognised" },
            { value: "stalled", label: `Stalled (${stalled})` },
          ]}
        />
      </div>
      {sort === "stalled" && (
        <p className="mb-4 max-w-[70ch] text-sm text-ink-2">
          Your last 8 correct executions are no faster than the 8 before, and still slower than {fmt(TARGET_MS[set])} s. More reps of the same
          alg rarely fix this: check the fingertricks, try a different alg, or drill it slowly with the metronome.
        </p>
      )}
      {sorted.length === 0 ? (
        <Empty>
          {sort === "stalled" ? "No stalled cases. Each one is either still improving or already at target." : `No ${set} practice recorded yet. Train or recognise some cases and they'll show up here.`}
        </Empty>
      ) : (
        <>
          <Button className="mb-4" variant="primary" onClick={() => navigate("/train", { state: { drillKeys: slowest } })}>
            Drill these {slowest.length}
          </Button>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[44rem] tabular-nums">
              <thead>
                <tr className="text-left text-sm text-ink-3">
                  <th className="font-normal">Case</th>
                  <th className="font-normal">Status</th>
                  <th className="text-right font-normal">Execution</th>
                  <th className="font-normal pl-4">Lately</th>
                  <th className="text-right font-normal">Recognition</th>
                  <th className="text-right font-normal">Recognised right</th>
                  <th className="text-right font-normal">Next review</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rule">
                {sorted.map((r) => (
                  <tr key={r.key}>
                    <td className="py-1.5">
                      <Link to={caseLink(r.key)} className="flex items-center gap-3 hover:underline">
                        <Thumb caseKey={r.key} progress={progress} />
                        {caseName(r.key)}
                      </Link>
                    </td>
                    <td>
                      <StatusPill status={r.status} />
                    </td>
                    <td className="text-right font-display text-lg">{fmt(r.exec)}</td>
                    <td className={`pl-4 text-sm ${r.trend ? TREND_LABEL[r.trend].className : "text-ink-3"}`}>{r.trend ? TREND_LABEL[r.trend].text : "–"}</td>
                    <td className="text-right font-display text-lg">{fmt(r.recog)}</td>
                    <td className="text-right font-display text-lg">{r.accuracy == null ? "–" : `${Math.round(r.accuracy * 100)}%`}</td>
                    <td className="text-right text-sm text-ink-2">{r.due ? relativeDay(r.due) : "–"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Section>
  );
}

function relativeDay(t: number): string {
  const days = Math.round((t - Date.now()) / 86_400_000);
  if (days <= 0) return "due now";
  if (days === 1) return "tomorrow";
  return `in ${days} days`;
}
