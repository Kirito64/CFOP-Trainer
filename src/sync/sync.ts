import { useSyncExternalStore } from "react";
import { db, SYNCED_TABLES, type SyncedTable, syncedTable } from "../db/db";
import { ApiError, getMe, type SyncRecord, syncRecords, type User } from "./api";

// Local-first sync: IndexedDB is the source of truth on each device; the server mirrors it per user.
// Each push sends rows changed since the last push; each response brings back everything newer
// than our cursor. Conflicts resolve last-write-wins on updatedAt, on both sides.

export type SyncState =
  | { status: "checking" }
  | { status: "signed-out" }
  | { status: "offline"; user?: User }
  | { status: "syncing" | "synced"; user: User; at?: number }
  | { status: "error"; user?: User; message: string };

let state: SyncState = { status: "checking" };
const listeners = new Set<() => void>();
const set = (s: SyncState) => {
  state = s;
  listeners.forEach((l) => l());
};

export const useSyncState = () =>
  useSyncExternalStore(
    (l) => (listeners.add(l), () => listeners.delete(l)),
    () => state,
  );

const BATCH = 2000;

async function getMeta<T>(key: string, fallback: T): Promise<T> {
  return ((await db.meta.get(key))?.value as T | undefined) ?? fallback;
}
const setMeta = (key: string, value: unknown) => db.meta.put({ key, value });

async function changedSince(watermark: number): Promise<SyncRecord[]> {
  const out: SyncRecord[] = [];
  for (const table of SYNCED_TABLES) {
    const rows = await syncedTable(table).where("updatedAt").above(watermark).toArray();
    for (const { id, updatedAt, deleted, ...data } of rows as { id: string; updatedAt: number; deleted?: boolean }[])
      out.push({ table, id, updatedAt, ...(deleted ? { deleted: true, data: null } : { data }) });
  }
  return out;
}

async function applyRemote(records: SyncRecord[]) {
  const byTable = new Map<SyncedTable, SyncRecord[]>();
  for (const r of records) if ((SYNCED_TABLES as readonly string[]).includes(r.table)) byTable.set(r.table as SyncedTable, [...(byTable.get(r.table as SyncedTable) ?? []), r]);
  await db.transaction("rw", SYNCED_TABLES.map((t) => db[t]), async () => {
    for (const [table, rows] of byTable) {
      const local = await syncedTable(table).bulkGet(rows.map((r) => r.id));
      const newer = rows.filter((r, i) => !local[i] || local[i]!.updatedAt < r.updatedAt);
      // Tombstones keep their id and timestamp so the deletion wins over older copies.
      await syncedTable(table).bulkPut(newer.map((r) => ({ ...(r.data as object), id: r.id, updatedAt: r.updatedAt, ...(r.deleted ? { deleted: true } : {}) })) as never[]);
    }
  });
}

let running: Promise<void> | null = null;

export function syncNow(): Promise<void> {
  running ??= doSync().finally(() => (running = null));
  return running;
}

async function doSync() {
  let user: User | null;
  try {
    user = await getMe();
  } catch (e) {
    set(e instanceof ApiError && e.code === "network" ? { status: "offline" } : { status: "error", message: (e as Error).message });
    return;
  }
  if (!user) return set({ status: "signed-out" });
  set({ status: "syncing", user });
  try {
    let cursor = await getMeta("syncCursor", 0);
    const watermark = await getMeta("pushedUpTo", 0);
    const pending = await changedSince(watermark);
    const pushedUpTo = pending.reduce((m, r) => Math.max(m, r.updatedAt), watermark);
    let first = true;
    for (let i = 0; first || i < pending.length; i += BATCH) {
      first = false;
      let res = await syncRecords(cursor, pending.slice(i, i + BATCH));
      await applyRemote(res.records);
      cursor = res.cursor;
      while (res.more) {
        res = await syncRecords(cursor, []);
        await applyRemote(res.records);
        cursor = res.cursor;
      }
    }
    await setMeta("syncCursor", cursor);
    await setMeta("pushedUpTo", pushedUpTo);
    set({ status: "synced", user, at: Date.now() });
  } catch (e) {
    if (e instanceof ApiError && e.code === "unauthorized") return set({ status: "signed-out" });
    set({ status: e instanceof ApiError && e.code === "network" ? "offline" : "error", user, message: (e as Error).message } as SyncState);
  }
}

/**
 * Restored rows keep their original updatedAt, which can be older than the push watermark,
 * so push everything. The server ignores rows it already has. Waits out any sync in flight,
 * which would otherwise write its old watermark back over the reset.
 */
export async function pushEverything() {
  await running;
  await setMeta("pushedUpTo", 0);
  return syncNow();
}

/** After signing out (or into a different account), push everything again on next sign-in. */
export async function resetSyncCursor() {
  await setMeta("syncCursor", 0);
  await setMeta("pushedUpTo", 0);
}

let started = false;
export function startBackgroundSync() {
  if (started) return;
  started = true;
  void syncNow();
  setInterval(() => document.visibilityState === "visible" && state.status !== "signed-out" && void syncNow(), 30_000);
  document.addEventListener("visibilitychange", () => document.visibilityState === "visible" && void syncNow());
  window.addEventListener("online", () => void syncNow());
}

export const markSignedOut = () => set({ status: "signed-out" });
