import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router";
import { CaseView } from "../../components/CubeView";
import { Player } from "../../components/Player";
import { TimerDisplay } from "../../components/TimerDisplay";
import { Button, fmt, Kbd } from "../../components/ui";
import { caseState, mirrorAlg } from "../../cube/cube";
import { type CaseScramble, scrambleForCase } from "../../cube/scramble";
import { getCase, getSet, VIEW } from "../../data/algsets";
import type { AlgSetId, CaseKey } from "../../data/types";
import { db, newId, now } from "../../db/db";
import { chosenAlg } from "../../db/progress";
import { useSettings } from "../../db/settings";
import { median } from "../../lib/stats";
import { useStackmat } from "../../lib/useStackmat";
import { type Grade, GRADE_LABEL, gradeAttempt, Rating, review, TARGET_MS } from "../../srs/srs";
import { type CaseHistory, drillWeight, type Item, pickWeighted, requeue } from "./queue";
import type { RunConfig } from "./TrainerPage";

const NOISE = { pll: getSet("PLL").cases.map((c) => c.algs[0]), oll: getSet("OLL").cases.map((c) => c.algs[0]) };
const setOf = (key: CaseKey) => key.split(":")[0] as AlgSetId;

interface Prepared {
  item: Item;
  alg: string;
  scramble: CaseScramble;
}

interface Result {
  item: Item;
  ms: number;
  ok: boolean;
  peeked: boolean;
  grade: Grade;
}

async function prepare(item: Item): Promise<Prepared> {
  const p = await db.progress.get(item.key);
  const alg = chosenAlg(item.key, p);
  const scramble = await scrambleForCase({ set: setOf(item.key), alg, mirror: item.mirror, noise: NOISE });
  return { item, alg: item.mirror ? mirrorAlg(alg) : alg, scramble };
}

async function loadHistory(keys: CaseKey[]): Promise<Map<CaseKey, CaseHistory>> {
  const out = new Map<CaseKey, CaseHistory>();
  const attempts = await db.attempts.where("caseKey").anyOf(keys).toArray();
  for (const a of attempts.filter((a) => a.kind === "exec" && !a.deleted).sort((a, b) => a.at - b.at)) {
    const h = out.get(a.caseKey) ?? { times: [], misses: 0, attempts: 0 };
    h.attempts++;
    if (a.ok) h.times = [...h.times, a.ms].slice(-30);
    else h.misses++;
    out.set(a.caseKey, h);
  }
  return out;
}

export function TrainerRun({ config, onExit }: { config: RunConfig; onExit: () => void }) {
  const settings = useSettings();
  const [queue, setQueue] = useState<Item[]>(config.items);
  const [current, setCurrent] = useState<Prepared | null>(null);
  const [studying, setStudying] = useState(false);
  const [peeked, setPeeked] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [done, setDone] = useState<Result[]>([]);
  const [finished, setFinished] = useState(false);
  const history = useRef<Map<CaseKey, CaseHistory>>(new Map());
  const reviewed = useRef(new Set<CaseKey>());
  const upcoming = useRef<Promise<Prepared> | null>(null);
  const lastItem = useRef<Item | undefined>(undefined);

  const chooseNext = useCallback(
    (q: Item[]): { item: Item | undefined; rest: Item[] } => {
      if (config.mode === "review") return { item: q[0], rest: q.slice(1) };
      const item = pickWeighted(q, (i) => drillWeight(history.current.get(i.key), TARGET_MS[setOf(i.key)]), lastItem.current);
      return { item, rest: q };
    },
    [config.mode],
  );

  const advance = useCallback(
    async (q: Item[]) => {
      const { item, rest } = chooseNext(q);
      if (!item) {
        setFinished(true);
        return;
      }
      lastItem.current = item;
      setQueue(rest);
      setResult(null);
      setPeeked(false);
      setCurrent(null);
      const pending = upcoming.current;
      upcoming.current = null;
      const pre = pending && (await pending);
      const prepared = pre?.item === item ? pre : await prepare(item);
      setCurrent(prepared);
      setStudying(config.fresh.has(item.key) && !reviewed.current.has(item.key));
    },
    [chooseNext, config.fresh],
  );

  useEffect(() => {
    let cancelled = false;
    loadHistory([...new Set(config.items.map((i) => i.key))]).then((h) => {
      if (cancelled) return;
      history.current = h;
      void advance(config.items);
    });
    return () => {
      cancelled = true;
    };
  }, []); // once per session

  const timer = useStackmat({
    holdMs: settings.holdMs,
    enabled: !!current && !studying && !result && !finished,
    onStart: () => {
      // Generate the following scramble while the user solves.
      if (config.mode === "review" && queue[0]) upcoming.current = prepare(queue[0]);
    },
    onStop: (ms) => {
      if (!current) return;
      const key = current.item.key;
      const h = history.current.get(key);
      const grade = peeked ? Rating.Hard : gradeAttempt({ ok: true, ms, set: setOf(key), personalMedian: median(h?.times ?? []) });
      setResult({ item: current.item, ms, ok: true, peeked, grade });
    },
  });

  const commit = useCallback(async () => {
    if (!result) return;
    const key = result.item.key;
    const grade = result.ok ? result.grade : Rating.Again;
    await db.attempts.add({ id: newId(), caseKey: key, kind: "exec", ms: Math.round(result.ms), ok: result.ok, at: now(), updatedAt: now() });
    const h = history.current.get(key) ?? { times: [], misses: 0, attempts: 0 };
    history.current.set(key, {
      attempts: h.attempts + 1,
      misses: h.misses + (result.ok ? 0 : 1),
      times: result.ok ? [...h.times, result.ms].slice(-30) : h.times,
    });
    // Only the first attempt of a case in a session counts as its spaced-repetition review.
    if (!reviewed.current.has(key)) {
      reviewed.current.add(key);
      await review(key, grade);
    }
    setDone((d) => [...d, { ...result, grade }]);
    timer.reset();
    const q = config.mode === "review" && !result.ok ? requeue(queue, result.item) : queue;
    void advance(q);
  }, [result, queue, config.mode, advance, timer]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === "INPUT" || e.repeat) return;
      if (e.key === "Escape") return setFinished(true);
      if (studying && (e.code === "Space" || e.key === "Enter")) {
        e.preventDefault();
        return setStudying(false);
      }
      if (result) {
        if (e.code === "Space" || e.key === "Enter") {
          e.preventDefault();
          void commit();
        } else if (e.key.toLowerCase() === "x") setResult({ ...result, ok: !result.ok });
      } else if (current && !timer.isRunning && e.key.toLowerCase() === "h") setPeeked(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [result, studying, current, commit, timer.isRunning]);

  if (finished) return <Summary results={done} onExit={onExit} />;

  const set = current ? setOf(current.item.key) : undefined;
  const def = current ? getCase(current.item.key)!.def : undefined;
  const view = set ? VIEW[set] : undefined;
  const sessionLeft = config.mode === "review" ? queue.length + (result ? 0 : 1) : null;

  return (
    <div className="mx-auto flex max-w-4xl flex-col">
      <div className="mb-6 flex items-center justify-between gap-4 text-sm text-ink-2">
        <span>
          {config.mode === "review" ? `${sessionLeft} left in today's review` : "Drilling"}, {done.length} done
        </span>
        <Button variant="quiet" onClick={() => setFinished(true)}>
          End session <Kbd>Esc</Kbd>
        </Button>
      </div>

      {!current && <p className="py-24 text-center text-ink-2">Generating scramble…</p>}

      {current && def && set && view && studying && (
        <section className="rounded-xl bg-panel p-6">
          <p className="mb-1 text-sm font-medium text-steel">New case</p>
          <h2 className="mb-4 font-display text-3xl font-semibold">{def.name === def.id ? def.id : `${def.id}: ${def.name}`}</h2>
          <div className="grid items-center gap-6 sm:grid-cols-[auto_1fr]">
            <CaseView view={view.view} mask={view.mask} state={caseState(current.alg)} size={160} />
            <div className="max-w-sm">
              <Player alg={current.alg} />
            </div>
          </div>
          <p className="alg mt-4 text-3xl">{current.alg}</p>
          {def.recognition && <p className="mt-3 max-w-[65ch] text-ink-2">{def.recognition}</p>}
          <p className="mt-5 text-ink-2">
            Do it slowly 5 to 10 times on your cube, then press <Kbd>Space</Kbd> to get a scramble for it.
          </p>
        </section>
      )}

      {current && def && set && view && !studying && (
        <>
          <section className="mb-8 text-center">
            <p className="alg text-[clamp(1.4rem,3.2vw,2.1rem)] leading-snug">{current.scramble.scramble}</p>
            <p className="mt-1 text-sm text-ink-3">Yellow on top, green in front</p>
          </section>

          <TimerDisplay phase={timer.phase} ms={timer.elapsed} padProps={timer.padProps} />

          {!result && (
            <p className="mt-6 text-center text-sm text-ink-3">
              Hold <Kbd>Space</Kbd> until green, release to start, any key to stop. <Kbd>H</Kbd> shows the case and alg (counts as a peek).
            </p>
          )}

          {peeked && !result && (
            <div className="mt-6 flex items-center justify-center gap-5">
              <CaseView view={view.view} mask={view.mask} state={caseState(current.alg)} size={96} />
              <span className="alg text-2xl">{current.alg}</span>
            </div>
          )}

          {result && (
            <ResultPanel
              result={result}
              alg={current.alg}
              set={set}
              history={history.current.get(current.item.key)}
              onNext={commit}
              onToggle={() => setResult({ ...result, ok: !result.ok })}
            />
          )}
        </>
      )}
    </div>
  );
}

function ResultPanel({
  result,
  alg,
  set,
  history,
  onNext,
  onToggle,
}: {
  result: Result;
  alg: string;
  set: AlgSetId;
  history?: CaseHistory;
  onNext: () => void;
  onToggle: () => void;
}) {
  const { def } = getCase(result.item.key)!;
  const view = VIEW[set];
  const notes = useNotes(result.item.key);
  const grade = result.ok ? result.grade : Rating.Again;
  return (
    <section className="mt-8 grid items-center gap-6 rounded-xl bg-panel p-5 sm:grid-cols-[auto_1fr_auto]">
      <CaseView view={view.view} mask={view.mask} state={caseState(alg)} size={110} />
      <div className="min-w-0">
        <p className="font-display text-2xl font-semibold">
          {def.name === def.id ? def.id : `${def.id}: ${def.name}`}
          {result.item.mirror && <span className="ml-2 text-base font-normal text-ink-2">front-left</span>}
        </p>
        <p className="alg text-xl">{alg}</p>
        <p className="mt-1 text-sm text-ink-2">
          Your median {fmt(median(history?.times ?? []))}, target {fmt(TARGET_MS[set])}
          {result.peeked ? ", peeked" : ""}
        </p>
        {!result.ok && notes && <p className="mt-2 text-sm text-warn">Your note: {notes}</p>}
      </div>
      <div className="flex flex-col items-stretch gap-2">
        <span className={`text-center font-display text-2xl font-semibold ${grade === Rating.Again ? "text-hold" : grade === Rating.Hard ? "text-warn" : "text-ready"}`}>
          {GRADE_LABEL[grade]}
        </span>
        <Button onClick={onToggle}>
          {result.ok ? "I messed up" : "It was fine"} <Kbd>X</Kbd>
        </Button>
        <Button variant="primary" onClick={onNext}>
          Next <Kbd>Space</Kbd>
        </Button>
      </div>
    </section>
  );
}

function useNotes(key: CaseKey) {
  const [notes, setNotes] = useState<string | undefined>();
  useEffect(() => {
    db.progress.get(key).then((p) => setNotes(p?.notes));
  }, [key]);
  return notes;
}

function Summary({ results, onExit }: { results: Result[]; onExit: () => void }) {
  const ok = results.filter((r) => r.ok);
  const slowest = useMemo(() => {
    const by = new Map<CaseKey, number[]>();
    for (const r of ok) by.set(r.item.key, [...(by.get(r.item.key) ?? []), r.ms]);
    return [...by].map(([k, ts]) => ({ k, med: median(ts)! })).sort((a, b) => b.med - a.med).slice(0, 5);
  }, [ok]);
  const missed = [...new Set(results.filter((r) => !r.ok).map((r) => r.item.key))];
  return (
    <div className="max-w-2xl">
      <h1 className="mb-4 font-display text-4xl font-semibold">Session done</h1>
      {results.length === 0 ? (
        <p className="mb-6 text-ink-2">No cases solved this time.</p>
      ) : (
        <>
          <p className="mb-6 text-lg text-ink-2">
            {results.length} solves, {missed.length ? `${missed.length} missed` : "none missed"}, median {fmt(median(ok.map((r) => r.ms)))}.
          </p>
          {slowest.length > 0 && (
            <>
              <h2 className="mb-2 font-display text-2xl font-semibold">Slowest cases</h2>
              <table className="mb-6 w-full">
                <tbody className="divide-y divide-rule">
                  {slowest.map(({ k, med }) => (
                    <tr key={k}>
                      <td className="py-1.5">
                        <Link className="hover:underline" to={`/library/${setOf(k)}/${encodeURIComponent(getCase(k)!.def.id)}`}>
                          {getCase(k)!.def.name === getCase(k)!.def.id ? getCase(k)!.def.id : `${getCase(k)!.def.id}: ${getCase(k)!.def.name}`}
                        </Link>
                      </td>
                      <td className="text-right font-display text-xl">{fmt(med)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </>
      )}
      <Button variant="primary" onClick={onExit}>
        Back to setup
      </Button>
    </div>
  );
}
