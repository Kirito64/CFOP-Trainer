import { useLiveQuery } from "dexie-react-hooks";
import { getCase } from "../data/algsets";
import type { AlgSetId, CaseKey } from "../data/types";
import { type CaseProgress, db, type LearnStatus, now } from "./db";

export const blankProgress = (id: CaseKey): CaseProgress => ({ id, status: "new", algIndex: 0, updatedAt: 0 });

export function useProgress(key: CaseKey): CaseProgress {
  return useLiveQuery(() => db.progress.get(key), [key]) ?? blankProgress(key);
}

/** Progress for every case of a set, keyed by CaseKey (missing = untouched). */
export function useSetProgress(set: AlgSetId): Map<CaseKey, CaseProgress> | undefined {
  return useLiveQuery(
    async () => new Map((await db.progress.where("id").startsWith(`${set}:`).toArray()).map((p) => [p.id, p])),
    [set],
  );
}

export async function updateProgress(key: CaseKey, patch: Partial<CaseProgress>) {
  await db.transaction("rw", db.progress, async () => {
    const cur = (await db.progress.get(key)) ?? blankProgress(key);
    await db.progress.put({ ...cur, ...patch, id: key, updatedAt: now() });
  });
}

export const setStatus = (key: CaseKey, status: LearnStatus) =>
  updateProgress(key, { status, ...(status === "new" ? { card: undefined, dueAt: undefined } : {}) });

/** Flag the alg the user knows for a case as outdated, to be replaced later. */
export const markOutdated = (key: CaseKey, p: CaseProgress) => updateProgress(key, { upgrade: { from: chosenAlg(key, p), at: now() } });

/**
 * Start learning a better alg in place of the outdated one: it becomes the chosen alg and the
 * case goes back to learning, so the trainer introduces it like a new case.
 */
export const learnInstead = (key: CaseKey, p: CaseProgress, choice: { algIndex: number; customAlg?: string }) =>
  updateProgress(key, {
    ...choice,
    status: "learning",
    card: undefined,
    dueAt: undefined,
    introducedAt: undefined,
    upgrade: { from: p.upgrade?.from ?? chosenAlg(key, p), at: p.upgrade?.at ?? now(), started: now() },
  });

/** Drop the upgrade and go back to the old alg as a known case. */
export function keepOldAlg(key: CaseKey, p: CaseProgress) {
  if (!p.upgrade) return;
  const from = p.upgrade.from;
  const i = getCase(key)!.def.algs.indexOf(from);
  const alg = i === -1 ? { algIndex: -1, customAlg: from } : { algIndex: i };
  return updateProgress(key, {
    ...alg,
    upgrade: undefined,
    ...(p.upgrade.started ? { status: "known" as const, card: undefined, dueAt: undefined } : {}),
  });
}

/** The alg the user has chosen for a case. */
export function chosenAlg(key: CaseKey, p?: CaseProgress): string {
  const def = getCase(key)!.def;
  if (p?.algIndex === -1 && p.customAlg) return p.customAlg;
  return def.algs[p?.algIndex ?? 0] ?? def.algs[0];
}
