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
  /**
   * Set when the user wants to replace an alg they know with a better one: `from` is the old alg,
   * `started` is when they picked the new one and began learning it.
   */
  upgrade?: { from: string; at: number; started?: number };
  /** The user's own fingertricks, per alg: move index → how they do it. */
  fingertricks?: Record<string, Record<number, string>>;
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
  /** For a wrong recognition answer, the case id you named (the right id when only the AUF was wrong). */
  picked?: string;
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
  /** In a slow session, how many times you stopped to look for the next piece. */
  pauses?: number;
  /** From a smart cube: its state when the timer started, and every turn with its time (ms from the start). */
  cube?: { start: string; moves: string; times: number[] };
  at: number;
}

/** "slow" sessions are lookahead practice, kept out of your speed averages and stats. */
export type SessionKind = "timed" | "slow";
export interface TimerSession extends Synced {
  name: string;
  createdAt: number;
  kind?: SessionKind;
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
