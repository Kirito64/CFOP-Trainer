import { getSet } from "../data/algsets";
import { type AlgSetId, type CaseKey, caseKey } from "../data/types";
import type { Attempt, CaseProgress, DrillResult, LearnStatus, Solve } from "../db/db";
import { localDay } from "./localDay";
import { averageOf, mean, type Result, median } from "./stats";

// ---------- Solves over time ----------

/** The rolling average of n after each solve, null until there are n solves. */
export const rollingAverage = (results: Result[], n: number): (number | null)[] => results.map((_, i) => averageOf(results.slice(Math.max(0, i + 1 - n), i + 1), n));

/** Share of results (DNFs included, as misses) under each threshold. */
export function shareUnder(results: Result[], thresholds: number[]): (number | null)[] {
  return thresholds.map((t) => (results.length ? results.filter((r) => r < t).length / results.length : null));
}

export interface PersonalBest {
  value: number;
  at: number;
}

/** Every time a new best single (n = 1) or average of n was set, oldest first. */
export function recordHistory(solves: { at: number; result: Result }[], n: number): PersonalBest[] {
  const out: PersonalBest[] = [];
  const results = solves.map((s) => s.result);
  for (let i = n - 1; i < solves.length; i++) {
    const v = n === 1 ? results[i] : averageOf(results.slice(i + 1 - n, i + 1), n);
    if (v != null && Number.isFinite(v) && (!out.length || v < out.at(-1)!.value)) out.push({ value: v, at: solves[i].at });
  }
  return out;
}

/** Mean of each column over consecutive blocks of `size` rows (the last block may be partial but needs half). */
export function blockMeans(rows: number[][], size: number): number[][] {
  const out: number[][] = [];
  for (let i = 0; i < rows.length; i += size) {
    const block = rows.slice(i, i + size);
    if (block.length < Math.ceil(size / 2)) break;
    out.push(block[0].map((_, c) => block.reduce((a, r) => a + r[c], 0) / block.length));
  }
  return out;
}

// ---------- Cases ----------

/** Rough recognition time for a sub-10 solver in the trainer, answer included (ms). */
export const RECOG_TARGET_MS = 800;

export interface CaseCost {
  key: CaseKey;
  probability: number;
  status: LearnStatus;
  /** Median of your recent correct executions and recognitions (ms). */
  exec: number | null;
  recog: number | null;
  /** Expected time lost per solve against the targets (ms). */
  cost: number;
}

/** How much each OLL or PLL case costs you per solve: how often it comes up × how far you are from the targets. */
export function caseCosts(set: "OLL" | "PLL", attempts: Attempt[], progress: Map<string, CaseProgress>, execTarget: number): CaseCost[] {
  const by = groupBy(attempts, (a) => a.caseKey);
  return getSet(set).cases.map((c) => {
    const key = caseKey(set, c.id);
    const as = by.get(key) ?? [];
    const exec = median(recentOk(as, "exec"));
    const recog = median(recentOk(as, "recog"));
    const p = c.probability ?? 0;
    return {
      key,
      probability: p,
      status: progress.get(key)?.status ?? "new",
      exec,
      recog,
      cost: p * (Math.max(0, (exec ?? execTarget) - execTarget) + Math.max(0, (recog ?? RECOG_TARGET_MS) - RECOG_TARGET_MS)),
    };
  });
}

/** Execution times of your correct attempts at a case, newest last. */
export const okTimes = (as: Attempt[], kind: Attempt["kind"]) => as.filter((a) => a.kind === kind && a.ok).map((a) => a.ms);
const recentOk = (as: Attempt[], kind: Attempt["kind"]) => okTimes(as, kind).slice(-20);

/** Median OLL or PLL phase time in timed solves, per case you tagged. Needs split taps. */
export function taggedPhaseTimes(solves: Solve[], set: "OLL" | "PLL"): Map<CaseKey, { ms: number; n: number }> {
  const phase = set === "OLL" ? 2 : 3;
  const by = new Map<CaseKey, number[]>();
  for (const s of solves) {
    const tag = set === "OLL" ? s.oll : s.pll;
    if (!tag || tag === "skip" || tag === "OLL 0" || !s.splits || s.splits.length !== 3 || s.penalty === "DNF") continue;
    const marks = [0, ...s.splits, s.ms];
    const key = caseKey(set, tag);
    by.set(key, [...(by.get(key) ?? []), marks[phase + 1] - marks[phase]]);
  }
  return new Map([...by].map(([k, ts]) => [k, { ms: median(ts)!, n: ts.length }]));
}

export type Trend = "faster" | "steady" | "slower";

/** Whether your recent executions of a case beat the ones before: the last 8 against the 8 before them. */
export function trend(times: number[], window = 8): Trend | null {
  if (times.length < window * 2) return null;
  const now = median(times.slice(-window))!;
  const before = median(times.slice(-window * 2, -window))!;
  if (now < before * 0.95) return "faster";
  if (now > before * 1.05) return "slower";
  return "steady";
}

export interface MixUp {
  actual: CaseKey;
  picked: CaseKey;
  n: number;
}

/** Cases you named wrongly, most frequent first. Pairs are counted both ways (Ga for Gc and Gc for Ga). */
export function mixUps(attempts: Attempt[]): MixUp[] {
  const pairs = new Map<string, MixUp>();
  for (const a of attempts) {
    if (a.kind !== "recog" || a.ok || !a.picked) continue;
    const picked = caseKey(a.caseKey.split(":")[0] as AlgSetId, a.picked);
    if (picked === a.caseKey) continue;
    const id = [a.caseKey, picked].sort().join("|");
    const cur = pairs.get(id) ?? { actual: a.caseKey, picked, n: 0 };
    pairs.set(id, { ...cur, n: cur.n + 1 });
  }
  return [...pairs.values()].sort((a, b) => b.n - a.n);
}

/** Cases where you named the case right but picked the wrong U turn before the alg. */
export function aufMisses(attempts: Attempt[]): Map<CaseKey, number> {
  const out = new Map<CaseKey, number>();
  for (const a of attempts) if (a.kind === "recog" && !a.ok && a.picked && a.caseKey.endsWith(`:${a.picked}`)) out.set(a.caseKey, (out.get(a.caseKey) ?? 0) + 1);
  return out;
}

// ---------- Practice ----------

export type ActivityKind = "solves" | "slow" | "trainer" | "recognition" | "drills";
export const ACTIVITY_LABEL: { [K in ActivityKind]: string } = {
  solves: "Timed solves",
  slow: "Slow solves",
  trainer: "Alg trainer",
  recognition: "Recognition",
  drills: "Drills",
};

export interface Activity {
  at: number;
  kind: ActivityKind;
  /** How long the thing itself took, when known (ms). */
  ms?: number;
}

export function activities({ solves, slow = [], attempts, drills }: { solves: Solve[]; slow?: Solve[]; attempts: Attempt[]; drills: DrillResult[] }): Activity[] {
  return [
    ...solves.map((s) => ({ at: s.at, kind: "solves" as const, ms: s.ms })),
    ...slow.map((s) => ({ at: s.at, kind: "slow" as const, ms: s.ms })),
    ...attempts.map((a) => ({ at: a.at, kind: a.kind === "exec" ? ("trainer" as const) : ("recognition" as const), ms: a.ms })),
    ...drills.map((d) => ({ at: d.at, kind: "drills" as const, ms: typeof d.detail?.ms === "number" ? d.detail.ms : undefined })),
  ].sort((a, b) => a.at - b.at);
}

/** A pause longer than this ends a practice session. */
export const SESSION_GAP_MS = 5 * 60_000;

/**
 * Practice time per local day and activity. Time between two things you did counts towards the later one
 * when the pause is short; after a longer break only the thing itself counts.
 */
export function dailyTime(acts: Activity[]): Map<number, { [K in ActivityKind]: number }> {
  const out = new Map<number, { [K in ActivityKind]: number }>();
  acts.forEach((a, i) => {
    const gap = i ? a.at - acts[i - 1].at : Infinity;
    const ms = gap <= SESSION_GAP_MS ? gap : Math.min(a.ms ?? 30_000, SESSION_GAP_MS);
    const day = localDay(a.at).start;
    const cur = out.get(day) ?? { solves: 0, slow: 0, trainer: 0, recognition: 0, drills: 0 };
    cur[a.kind] += ms;
    out.set(day, cur);
  });
  return out;
}

export const total = (t: { [K in ActivityKind]: number }) => t.solves + t.slow + t.trainer + t.recognition + t.drills;

/** Start of the local day `n` days after `day` (negative goes back), safe across daylight-saving changes. */
export function addDays(day: number, n: number): number {
  const d = new Date(day);
  d.setDate(d.getDate() + n);
  return d.getTime();
}

/** Days in a row you practised, ending today (or yesterday, if today hasn't started yet), and the longest run. */
export function streaks(days: Set<number>, today = localDay().start): { current: number; longest: number } {
  let current = 0;
  for (let d = days.has(today) ? today : addDays(today, -1); days.has(d); d = addDays(d, -1)) current++;
  let longest = 0;
  for (const d of days) {
    if (days.has(addDays(d, -1))) continue;
    let run = 0;
    for (let x = d; days.has(x); x = addDays(x, 1)) run++;
    longest = Math.max(longest, run);
  }
  return { current, longest };
}

/** Start of the week (Monday) a local day falls in. */
export function weekOf(day: number): number {
  const d = new Date(day);
  return addDays(localDay(day).start, -((d.getDay() + 6) % 7));
}

function groupBy<T, K>(xs: T[], key: (x: T) => K): Map<K, T[]> {
  const out = new Map<K, T[]>();
  for (const x of xs) {
    const k = key(x);
    const list = out.get(k);
    if (list) list.push(x);
    else out.set(k, [x]);
  }
  return out;
}

// ---------- Slow solves ----------

export interface SlowDay {
  day: number;
  solves: number;
  /** Solves you logged pauses for. */
  logged: number;
  /** Share of logged solves with no pauses, null when none were logged. */
  smooth: number | null;
  meanPauses: number | null;
}

/** Slow solves per local day, oldest first. */
export function slowDays(solves: Solve[]): SlowDay[] {
  return [...groupBy(solves, (s) => localDay(s.at).start)]
    .sort((a, b) => a[0] - b[0])
    .map(([day, ss]) => {
      const pauses = ss.map((s) => s.pauses).filter((p): p is number => p != null);
      return {
        day,
        solves: ss.length,
        logged: pauses.length,
        smooth: pauses.length ? pauses.filter((p) => p === 0).length / pauses.length : null,
        meanPauses: mean(pauses),
      };
    });
}

/** Smooth solves in a row before trying a slightly faster pace. */
export const SMOOTH_RUN = 3;

/**
 * What to try on the next slow solve, from the pauses logged so far (oldest first):
 * slow down after a pause, speed up a little after a run of smooth solves.
 */
export function paceAdvice(pauses: (number | undefined)[]): "slower" | "faster" | "hold" | null {
  const logged = pauses.filter((p): p is number => p != null);
  if (!logged.length) return null;
  if (logged.at(-1)! > 0) return "slower";
  return logged.length >= SMOOTH_RUN && logged.slice(-SMOOTH_RUN).every((p) => p === 0) ? "faster" : "hold";
}
