import { useLiveQuery } from "dexie-react-hooks";
import { averageOf, bestAverage, mean } from "../lib/stats";
import { db, newId, now, type Penalty, type SessionKind, type Solve, type TimerSession } from "./db";

/** Solve time with its penalty applied, Infinity for a DNF. */
export const resultOf = (s: Pick<Solve, "ms" | "penalty">) => (s.penalty === "DNF" ? Infinity : s.ms + (s.penalty === 2 ? 2000 : 0));

export function useSessions(): TimerSession[] | undefined {
  return useLiveQuery(async () => (await db.sessions.orderBy("createdAt").toArray()).filter((s) => !s.deleted), []);
}

const LAST_SESSION_KEY = "timerSession";

/** The session the timer last used on this device, or a "Main" one when there are none. */
export async function ensureSession(): Promise<string> {
  const existing = (await db.sessions.orderBy("createdAt").toArray()).filter((s) => !s.deleted);
  const last = (await db.meta.get(LAST_SESSION_KEY))?.value;
  if (existing.some((s) => s.id === last)) return last as string;
  if (existing.length) return existing.at(-1)!.id;
  // A fixed id so two calls racing on first load (or two devices) make one session, not two.
  await db.sessions.put({ id: "main", name: "Main", kind: "timed", createdAt: now(), updatedAt: now() });
  return "main";
}

export const rememberSession = (id: string) => db.meta.put({ key: LAST_SESSION_KEY, value: id });

export async function createSession(name: string, kind: SessionKind = "timed"): Promise<string> {
  const id = newId();
  await db.sessions.add({ id, name, kind, createdAt: now(), updatedAt: now() });
  return id;
}

export const updateSession = (id: string, patch: Pick<Partial<TimerSession>, "name" | "kind">) => db.sessions.update(id, { ...patch, updatedAt: now() });

/** Soft-deletes the session and its solves, so neither comes back from another device. */
export const deleteSession = (id: string) =>
  db.transaction("rw", db.sessions, db.solves, async () => {
    await db.solves.where("sessionId").equals(id).modify({ deleted: true, updatedAt: now() });
    await db.sessions.update(id, { deleted: true, updatedAt: now() });
  });

/** Every solve from timed sessions, oldest first: what your averages and speed stats are built from. */
export async function speedSolves(): Promise<Solve[]> {
  const slow = new Set((await db.sessions.toArray()).filter((s) => s.kind === "slow").map((s) => s.id));
  return (await db.solves.orderBy("at").toArray()).filter((s) => !s.deleted && !slow.has(s.sessionId));
}

/** Solves from slow sessions, oldest first. */
export async function slowSolves(): Promise<Solve[]> {
  const slow = new Set((await db.sessions.toArray()).filter((s) => s.kind === "slow" && !s.deleted).map((s) => s.id));
  return (await db.solves.orderBy("at").toArray()).filter((s) => !s.deleted && slow.has(s.sessionId));
}

export function useSolves(sessionId: string | undefined): Solve[] | undefined {
  return useLiveQuery(
    async () => (sessionId ? (await db.solves.where("sessionId").equals(sessionId).sortBy("at")).filter((s) => !s.deleted) : []),
    [sessionId],
  );
}

export const addSolve = (s: Omit<Solve, "id" | "updatedAt" | "at">) => db.solves.add({ ...s, id: newId(), at: now(), updatedAt: now() });
export const setPenalty = (id: string, penalty: Penalty) => db.solves.update(id, { penalty, updatedAt: now() });
export const updateSolve = (id: string, patch: Partial<Solve>) => db.solves.update(id, { ...patch, updatedAt: now() });
/** Soft delete so the deletion syncs to other devices. */
export const deleteSolve = (id: string) => db.solves.update(id, { deleted: true, updatedAt: now() });

export const AVERAGES = [5, 12, 50, 100] as const;

export function sessionStats(solves: Solve[]) {
  const results = solves.map(resultOf);
  const finite = results.filter(Number.isFinite);
  return {
    count: solves.length,
    best: finite.length ? Math.min(...finite) : null,
    mean: mean(finite),
    current: results.at(-1) ?? null,
    mo3: averageOf(results, 3),
    averages: AVERAGES.map((n) => ({ n, current: averageOf(results, n), best: bestAverage(results, n) })),
  };
}

export const PHASE_NAMES = ["Cross", "F2L", "OLL", "PLL"];

/** Per-phase durations (not cumulative) for solves timed with splits. */
export function phaseDurations(s: Solve): number[] | null {
  if (!s.splits || s.splits.length !== 3 || s.penalty === "DNF") return null;
  const marks = [0, ...s.splits, s.ms];
  return marks.slice(1).map((m, i) => m - marks[i]);
}
