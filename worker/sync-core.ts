// Pure sync logic shared by the UserStore Durable Object and its tests.

export type SyncRecord = {
  table: string;
  id: string;
  data: unknown;
  updatedAt: number;
  deleted?: boolean;
};

export type SyncRequest = { since: number; records: SyncRecord[] };

/** A record as stored server-side; `data` is already JSON-encoded. */
export type StoredRow = {
  tbl: string;
  id: string;
  data: string;
  updated_at: number;
  deleted: number;
  seq: number;
};

export interface RowStore {
  get(tbl: string, id: string): StoredRow | null;
  put(row: StoredRow): void;
}

export const MAX_PUSH_RECORDS = 2000;
export const MAX_RECORD_DATA_BYTES = 256 * 1024;
export const PAGE_MAX_RECORDS = 2000;
export const PAGE_MAX_BYTES = 4 * 1024 * 1024;

const TABLE_RE = /^[A-Za-z0-9_.:-]{1,64}$/;

export class ValidationError extends Error {}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** Validates a parsed `/api/sync` body. Throws ValidationError with a readable message. */
export function parseSyncRequest(body: unknown): SyncRequest {
  if (!isPlainObject(body)) throw new ValidationError("Body must be a JSON object");
  const { since, records } = body;
  if (typeof since !== "number" || !Number.isSafeInteger(since) || since < 0) {
    throw new ValidationError("`since` must be a non-negative integer");
  }
  if (!Array.isArray(records)) throw new ValidationError("`records` must be an array");
  if (records.length > MAX_PUSH_RECORDS) {
    throw new ValidationError(`At most ${MAX_PUSH_RECORDS} records per request`);
  }
  const out: SyncRecord[] = records.map((r, i) => {
    if (!isPlainObject(r)) throw new ValidationError(`records[${i}] must be an object`);
    const { table, id, data, updatedAt, deleted } = r;
    if (typeof table !== "string" || !TABLE_RE.test(table)) {
      throw new ValidationError(`records[${i}].table must match ${TABLE_RE}`);
    }
    if (typeof id !== "string" || id.length === 0 || id.length > 256) {
      throw new ValidationError(`records[${i}].id must be a string of 1-256 chars`);
    }
    if (typeof updatedAt !== "number" || !Number.isSafeInteger(updatedAt) || updatedAt < 0) {
      throw new ValidationError(`records[${i}].updatedAt must be a non-negative integer (ms)`);
    }
    if (deleted !== undefined && typeof deleted !== "boolean") {
      throw new ValidationError(`records[${i}].deleted must be a boolean`);
    }
    if (!deleted && data === undefined) throw new ValidationError(`records[${i}].data is required`);
    if (!deleted && JSON.stringify(data).length > MAX_RECORD_DATA_BYTES) {
      throw new ValidationError(`records[${i}].data exceeds ${MAX_RECORD_DATA_BYTES} bytes`);
    }
    return { table, id, data, updatedAt, deleted: deleted === true };
  });
  return { since, records: out };
}

/**
 * Last-write-wins: an incoming record replaces the stored one only if strictly newer.
 * Ties keep the stored version, so re-pushes are idempotent and don't bump `seq`.
 */
export function isNewer(incoming: { updatedAt: number }, stored: { updated_at: number } | null): boolean {
  return stored === null || incoming.updatedAt > stored.updated_at;
}

export type PushResult = {
  /** Highest seq after applying the push. */
  seq: number;
  /** Keys of pushed records that lost to a newer (or equal) stored version. */
  rejected: { tbl: string; id: string }[];
};

/** Applies pushed records in order, assigning increasing seq numbers to accepted writes. */
export function applyPush(store: RowStore, records: SyncRecord[], currentSeq: number): PushResult {
  let seq = currentSeq;
  const rejected: PushResult["rejected"] = [];
  for (const r of records) {
    const stored = store.get(r.table, r.id);
    if (!isNewer(r, stored)) {
      rejected.push({ tbl: r.table, id: r.id });
      continue;
    }
    const data = JSON.stringify(r.deleted ? null : r.data) ?? "null";
    seq += 1;
    store.put({ tbl: r.table, id: r.id, data, updated_at: r.updatedAt, deleted: r.deleted ? 1 : 0, seq });
  }
  return { seq, rejected };
}

/** Encodes a stored row as a wire SyncRecord JSON string without re-parsing `data`. */
export function encodeRow(row: StoredRow): string {
  const head = `{"table":${JSON.stringify(row.tbl)},"id":${JSON.stringify(row.id)},"updatedAt":${row.updated_at}`;
  return row.deleted ? `${head},"deleted":true,"data":null}` : `${head},"data":${row.data}}`;
}

/**
 * Builds the `/api/sync` response body from rows ordered by seq (fetch one more than
 * PAGE_MAX_RECORDS so we can tell whether more remain), plus any extra rows to include
 * (current server versions of rejected pushes).
 */
export function buildResponse(page: StoredRow[], extras: StoredRow[], maxSeq: number): string {
  const parts: string[] = [];
  let bytes = 0;
  let cursor = 0;
  let more = false;
  const seen = new Set<string>();
  for (const row of page) {
    if (parts.length >= PAGE_MAX_RECORDS || (parts.length > 0 && bytes >= PAGE_MAX_BYTES)) {
      more = true;
      break;
    }
    const enc = encodeRow(row);
    parts.push(enc);
    bytes += enc.length;
    cursor = row.seq;
    seen.add(`${row.tbl}\u0000${row.id}`);
  }
  if (!more) cursor = maxSeq;
  for (const row of extras) {
    if (!seen.has(`${row.tbl}\u0000${row.id}`)) parts.push(encodeRow(row));
  }
  return `{"records":[${parts.join(",")}],"cursor":${cursor},"more":${more}}`;
}
