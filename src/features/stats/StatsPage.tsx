import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import { CaseView } from "../../components/CubeView";
import { Button, Empty, fmt, PageHeader, Section, StatusPill, Tabs } from "../../components/ui";
import { caseState } from "../../cube/cube";
import { getSet, VIEW } from "../../data/algsets";
import { type AlgSetId, type CaseKey, caseKey } from "../../data/types";
import { type Attempt, type CaseProgress, db, type Solve } from "../../db/db";
import { chosenAlg } from "../../db/progress";
import { PHASE_NAMES, phaseDurations, resultOf } from "../../db/solves";
import { bestAverage, mean, median } from "../../lib/stats";
import { useLocalDay } from "../../lib/useLocalDay";
import { STATS_VISIT_KEY } from "../today/sessionProgress";

/** Rough stage targets for a sub-10 average (ms), from the research notes. */
const SUB10_SPLITS = [1300, 5300, 1600, 1600];

export default function StatsPage() {
  const day = useLocalDay();
  useEffect(() => {
    const recordVisit = () => {
      // A background Stats tab left open overnight is not a new visit until it is shown.
      if (document.visibilityState !== "visible") return;
      void db.meta.put({ key: STATS_VISIT_KEY, value: Date.now() }).catch((error) => console.error("Could not record Stats visit", error));
    };
    recordVisit();
    document.addEventListener("visibilitychange", recordVisit);
    return () => document.removeEventListener("visibilitychange", recordVisit);
  }, [day.start]);
  const solves = useLiveQuery(async () => (await db.solves.orderBy("at").toArray()).filter((s) => !s.deleted), []);
  const attempts = useLiveQuery(async () => (await db.attempts.toArray()).filter((a) => !a.deleted), []);
  const progress = useLiveQuery(async () => new Map((await db.progress.toArray()).map((p) => [p.id, p])), []);

  return (
    <>
      <PageHeader title="Stats">Where your time goes, and which cases are holding you back.</PageHeader>
      <TimerSection solves={solves} />
      <CasesSection attempts={attempts} progress={progress} />
    </>
  );
}

function TimerSection({ solves }: { solves?: Solve[] }) {
  if (!solves) return null;
  if (!solves.length)
    return (
      <Section title="Solves">
        <Empty>
          No timed solves yet. <Link to="/timer" className="underline">Open the timer</Link> and do an ao12 to get a baseline.
        </Empty>
      </Section>
    );
  const results = solves.map(resultOf);
  const days = new Map<string, number[]>();
  for (const s of solves) {
    const d = new Date(s.at).toISOString().slice(0, 10);
    if (Number.isFinite(resultOf(s))) days.set(d, [...(days.get(d) ?? []), resultOf(s)]);
  }
  const daily = [...days].slice(-30).map(([d, ts]) => ({ d, mean: mean(ts)!, n: ts.length }));
  const phases = solves.slice(-50).map(phaseDurations).filter((p): p is number[] => !!p);

  return (
    <Section title="Solves" aside={<span className="text-sm text-ink-3">{solves.length} timed solves</span>}>
      <table className="mb-6 w-full max-w-lg">
        <tbody className="divide-y divide-rule">
          {[
            ["Best single", Math.min(...results.filter(Number.isFinite))],
            ["Best ao5", bestAverage(results, 5)],
            ["Best ao12", bestAverage(results, 12)],
            ["Best ao100", bestAverage(results, 100)],
            ["Mean of last 100", mean(results.slice(-100).filter(Number.isFinite))],
          ].map(([label, v]) => (
            <tr key={label as string}>
              <th className="py-1.5 text-left font-normal text-ink-2">{label}</th>
              <td className="text-right font-display text-2xl">{fmt(v as number | null, v === Infinity)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {daily.length > 1 && <DailyChart daily={daily} />}

      {phases.length > 0 && (
        <div className="mt-8 max-w-lg">
          <h3 className="mb-1 font-display text-xl font-semibold">Where the time goes</h3>
          <p className="mb-3 text-sm text-ink-2">
            Mean of your last {phases.length} solves timed with split taps, next to rough sub-10 targets. The biggest gap is usually the best place to
            practise.
          </p>
          <table className="w-full">
            <thead>
              <tr className="text-sm text-ink-3">
                <th />
                <th className="text-right font-normal">You</th>
                <th className="text-right font-normal">Sub-10</th>
                <th className="text-right font-normal">Gap</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rule">
              {PHASE_NAMES.map((n, i) => {
                const you = mean(phases.map((p) => p[i]))!;
                return (
                  <tr key={n}>
                    <th className="py-1.5 text-left font-normal text-ink-2">{n}</th>
                    <td className="text-right font-display text-xl">{fmt(you)}</td>
                    <td className="text-right font-display text-xl text-ink-3">{fmt(SUB10_SPLITS[i])}</td>
                    <td className={`text-right font-display text-xl ${you - SUB10_SPLITS[i] > 800 ? "text-warn" : ""}`}>
                      {you > SUB10_SPLITS[i] ? `+${fmt(you - SUB10_SPLITS[i])}` : "on target"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {phases.length === 0 && (
        <p className="mt-6 max-w-[65ch] text-sm text-ink-2">
          Turn on Split taps in the timer (tap any key after the cross, F2L and OLL) to see which stage costs you the most time.
        </p>
      )}
    </Section>
  );
}

function DailyChart({ daily }: { daily: { d: string; mean: number; n: number }[] }) {
  const w = 640;
  const h = 160;
  const lo = Math.min(...daily.map((x) => x.mean)) * 0.95;
  const hi = Math.max(...daily.map((x) => x.mean)) * 1.02;
  const x = (i: number) => 30 + (i / (daily.length - 1)) * (w - 40);
  const y = (v: number) => 10 + (1 - (v - lo) / (hi - lo || 1)) * (h - 30);
  return (
    <figure className="max-w-2xl">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" role="img" aria-label="Daily mean time">
        {[lo, (lo + hi) / 2, hi].map((v) => (
          <g key={v}>
            <line x1={30} x2={w - 10} y1={y(v)} y2={y(v)} stroke="var(--rule)" />
            <text x={0} y={y(v) + 4} fontSize={11} fill="var(--ink-3)">
              {(v / 1000).toFixed(1)}
            </text>
          </g>
        ))}
        <polyline points={daily.map((p, i) => `${x(i)},${y(p.mean)}`).join(" ")} fill="none" stroke="var(--steel)" strokeWidth={2.5} strokeLinejoin="round" />
        {daily.map((p, i) => (
          <circle key={p.d} cx={x(i)} cy={y(p.mean)} r={3.5} fill="var(--steel)">
            <title>{`${p.d}: ${fmt(p.mean)} over ${p.n} solves`}</title>
          </circle>
        ))}
      </svg>
      <figcaption className="text-sm text-ink-3">Mean time per day, last {daily.length} days you practised.</figcaption>
    </figure>
  );
}

interface CaseRow {
  key: CaseKey;
  status: CaseProgress["status"];
  exec: number | null;
  recog: number | null;
  accuracy: number | null;
  n: number;
  due?: number;
}

function CasesSection({ attempts, progress }: { attempts?: Attempt[]; progress?: Map<string, CaseProgress> }) {
  const [set, setSet] = useState<AlgSetId>("OLL");
  const [sort, setSort] = useState<"exec" | "recog" | "accuracy">("exec");
  const navigate = useNavigate();

  const rows = useMemo<CaseRow[]>(() => {
    if (!attempts || !progress) return [];
    const by = new Map<string, Attempt[]>();
    for (const a of attempts) by.set(a.caseKey, [...(by.get(a.caseKey) ?? []), a]);
    return getSet(set).cases.map((c) => {
      const key = caseKey(set, c.id);
      const as = by.get(key) ?? [];
      const exec = as.filter((a) => a.kind === "exec" && a.ok).slice(-20).map((a) => a.ms);
      const recog = as.filter((a) => a.kind === "recog");
      return {
        key,
        status: progress.get(key)?.status ?? "new",
        exec: median(exec),
        recog: median(recog.filter((a) => a.ok).slice(-20).map((a) => a.ms)),
        accuracy: recog.length ? recog.filter((a) => a.ok).length / recog.length : null,
        n: as.length,
        due: progress.get(key)?.dueAt,
      };
    });
  }, [attempts, progress, set]);

  const sorted = rows
    .filter((r) => r.n > 0)
    .sort((a, b) => (sort === "accuracy" ? (a.accuracy ?? 1) - (b.accuracy ?? 1) : ((b[sort] ?? 0) as number) - ((a[sort] ?? 0) as number)));
  const slowest = sorted.slice(0, 10).map((r) => r.key);
  const { view, mask } = VIEW[set];

  return (
    <Section title="Cases">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Tabs<AlgSetId> label="Set" value={set} onChange={setSet} options={(["OLL", "PLL", "F2L", "COLL", "WV"] as const).map((s) => ({ value: s, label: s }))} />
        <Tabs
          label="Sort by"
          value={sort}
          onChange={setSort}
          options={[
            { value: "exec", label: "Slowest execution" },
            { value: "recog", label: "Slowest recognition" },
            { value: "accuracy", label: "Most misrecognised" },
          ]}
        />
      </div>
      {sorted.length === 0 ? (
        <Empty>No {set} practice recorded yet. Train or recognise some cases and they'll show up here.</Empty>
      ) : (
        <>
          <Button
            className="mb-4"
            variant="primary"
            onClick={() => navigate("/train", { state: { drillKeys: slowest } })}
          >
            Drill these {slowest.length}
          </Button>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[36rem]">
              <thead>
                <tr className="text-left text-sm text-ink-3">
                  <th className="font-normal">Case</th>
                  <th className="font-normal">Status</th>
                  <th className="text-right font-normal">Execution</th>
                  <th className="text-right font-normal">Recognition</th>
                  <th className="text-right font-normal">Recognised right</th>
                  <th className="text-right font-normal">Next review</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rule">
                {sorted.map((r) => {
                  const def = getSet(set).cases.find((c) => caseKey(set, c.id) === r.key)!;
                  return (
                    <tr key={r.key}>
                      <td className="py-1.5">
                        <Link to={`/library/${set}/${encodeURIComponent(def.id)}`} className="flex items-center gap-3 hover:underline">
                          <CaseView view={view} mask={mask} state={caseState(chosenAlg(r.key, progress?.get(r.key)))} size={40} />
                          {def.name === def.id ? def.id : `${def.id}: ${def.name}`}
                        </Link>
                      </td>
                      <td>
                        <StatusPill status={r.status} />
                      </td>
                      <td className="text-right font-display text-lg">{fmt(r.exec)}</td>
                      <td className="text-right font-display text-lg">{fmt(r.recog)}</td>
                      <td className="text-right font-display text-lg">{r.accuracy == null ? "–" : `${Math.round(r.accuracy * 100)}%`}</td>
                      <td className="text-right text-sm text-ink-2">{r.due ? relativeDay(r.due) : "–"}</td>
                    </tr>
                  );
                })}
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
