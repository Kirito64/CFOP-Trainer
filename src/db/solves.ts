import { useLiveQuery } from "dexie-react-hooks";
import { averageOf, bestAverage, mean } from "../lib/stats";
import { db, newId, now, type Penalty, type Solve, type TimerSession } from "./db";

/** Solve time with its penalty applied, Infinity for a DNF. */
export const resultOf = (s: Pick<Solve, "ms" | "penalty">) => (s.penalty === "DNF" ? Infinity : s.ms + (s.penalty === 2 ? 2000 : 0));

export function useSessions(): TimerSession[] | undefined {
  return useLiveQuery(async () => (await db.sessions.orderBy("createdAt").toArray()).filter((s) => !s.deleted), []);
}

export async function ensureSession(): Promise<string> {
  const existing = (await db.sessions.orderBy("createdAt").toArray()).filter((s) => !s.deleted);
  if (existing.length) return existing.at(-1)!.id;
  return createSession("Main");
}

export async function createSession(name: string): Promise<string> {
  const id = newId();
  await db.sessions.add({ id, name, createdAt: now(), updatedAt: now() });
  return id;
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
