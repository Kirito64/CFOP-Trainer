import { useLiveQuery } from "dexie-react-hooks";
import { type DrillResult, db, newId, now } from "./db";

export type DrillId = "cross" | "pll-attack" | "metronome" | "tps";

export const addDrillResult = (drill: DrillId, score: number, detail?: Record<string, unknown>) =>
  db.drills.add({ id: newId(), drill, score, detail, at: now(), updatedAt: now() });

export function useDrillResults(drill: DrillId): DrillResult[] | undefined {
  return useLiveQuery(async () => (await db.drills.where("drill").equals(drill).sortBy("at")).filter((d) => !d.deleted), [drill]);
}
