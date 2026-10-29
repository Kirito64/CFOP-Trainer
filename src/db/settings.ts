import { useLiveQuery } from "dexie-react-hooks";
import type { Slot } from "../cube/cases";
import { db, now } from "./db";

export interface Settings {
  /** New algs introduced per day by the daily review. */
  newPerDay: number;
  /** Which slots F2L cases are trained in. */
  f2lSlots: Slot[];
  /** Use 15 s WCA inspection in the timer. */
  inspection: boolean;
  /** How long space must be held before the timer arms (ms). */
  holdMs: number;
  /** Hide the running time during solves. */
  hideRunningTime: boolean;
  /** Ask which OLL/PLL came up after each timed solve. */
  askLastLayerCases: boolean;
  /** Your current goal average, in ms. */
  goalMs: number;
  /** Timer phases: 1, or 4 to tap splits for cross, F2L, OLL and PLL. */
  phases: 1 | 4;
}

export const DEFAULT_SETTINGS: Settings = {
  newPerDay: 3,
  f2lSlots: ["FR", "FL"],
  inspection: true,
  holdMs: 300,
  hideRunningTime: false,
  askLastLayerCases: false,
  goalMs: 10000,
  phases: 1,
};

export function useSettings(): Settings {
  const rows = useLiveQuery(() => db.settings.toArray(), []);
  const s = { ...DEFAULT_SETTINGS } as Record<string, unknown>;
  for (const r of rows ?? []) if (!r.deleted && r.id in DEFAULT_SETTINGS) s[r.id] = r.value;
  return s as unknown as Settings;
}

export async function getSettings(): Promise<Settings> {
  const s = { ...DEFAULT_SETTINGS } as Record<string, unknown>;
  for (const r of await db.settings.toArray()) if (!r.deleted && r.id in DEFAULT_SETTINGS) s[r.id] = r.value;
  return s as unknown as Settings;
}

export const saveSetting = <K extends keyof Settings>(key: K, value: Settings[K]) => db.settings.put({ id: key, value, updatedAt: now() });
