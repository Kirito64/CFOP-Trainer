import Dexie, { type EntityTable } from "dexie";
import type { CaseKey } from "../data/types";

/** Fields every synced record carries. `updatedAt` drives last-write-wins sync. */
interface Synced {
  id: string;
  updatedAt: number;
  deleted?: boolean;
}

export type LearnStatus = "new" | "learning" | "known";

/** One per case the user has touched. id is the CaseKey. */
export interface CaseProgress extends Synced {
  id: CaseKey;
  status: LearnStatus;
  /** Index into the case's algs, or -1 when `customAlg` is used. */
  algIndex: number;
  customAlg?: string;
  notes?: string;
  /** ts-fsrs card serialised as JSON (dates as ISO strings). */
  card?: Record<string, unknown>;
  dueAt?: number;
  introducedAt?: number;
}

export type AttemptKind = "exec" | "recog";
export interface Attempt extends Synced {
  caseKey: CaseKey;
  kind: AttemptKind;
  ms: number;
  ok: boolean;
  at: number;
}

export type Penalty = 0 | 2 | "DNF";
export interface Solve extends Synced {
  sessionId: string;
  scramble: string;
  ms: number;
  penalty: Penalty;
  /** Cumulative split times in ms (cross, F2L, OLL, PLL) when the user taps phases. */
  splits?: number[];
  oll?: string;
  pll?: string;
  note?: string;
  at: number;
}

export interface TimerSession extends Synced {
  name: string;
  createdAt: number;
}

export interface DrillResult extends Synced {
  drill: string;
  score: number;
  detail?: Record<string, unknown>;
  at: number;
}

export interface Setting extends Synced {
  value: unknown;
}

/** Local-only bookkeeping (never synced). */
export interface Meta {
  key: string;
  value: unknown;
}

export const SYNCED_TABLES = ["progress", "attempts", "solves", "sessions", "drills", "settings"] as const;
export type SyncedTable = (typeof SYNCED_TABLES)[number];

export const db = new Dexie("cfop-trainer") as Dexie & {
  progress: EntityTable<CaseProgress, "id">;
  attempts: EntityTable<Attempt, "id">;
  solves: EntityTable<Solve, "id">;
  sessions: EntityTable<TimerSession, "id">;
  drills: EntityTable<DrillResult, "id">;
  settings: EntityTable<Setting, "id">;
  meta: EntityTable<Meta, "key">;
};

db.version(1).stores({
  progress: "id, status, dueAt, updatedAt",
  attempts: "id, caseKey, [caseKey+kind], at, updatedAt",
  solves: "id, sessionId, at, updatedAt",
  sessions: "id, createdAt, updatedAt",
  drills: "id, drill, at, updatedAt",
  settings: "id, updatedAt",
  meta: "key",
});

export const newId = () => crypto.randomUUID();
export const now = () => Date.now();

export type SyncedRow = Synced & Record<string, unknown>;
/** Untyped access for code that treats every synced table the same way (sync, backups). */
export const syncedTable = (t: SyncedTable) => db.table<SyncedRow, string>(t);
