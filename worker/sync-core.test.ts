import { describe, expect, test } from "bun:test";
import {
  applyPush,
  buildResponse,
  encodeRow,
  isNewer,
  parseSyncRequest,
  PAGE_MAX_RECORDS,
  type RowStore,
  type StoredRow,
  type SyncRecord,
  ValidationError,
} from "./sync-core";

function memoryStore(): RowStore & { rows: Map<string, StoredRow> } {
  const rows = new Map<string, StoredRow>();
  return {
    rows,
    get: (tbl, id) => rows.get(`${tbl}/${id}`) ?? null,
    put: (row) => void rows.set(`${row.tbl}/${row.id}`, row),
  };
}

const rec = (id: string, updatedAt: number, data: unknown = { v: id }, deleted?: boolean): SyncRecord => ({
  table: "cases",
  id,
  data,
  updatedAt,
  ...(deleted ? { deleted } : {}),
});

describe("isNewer", () => {
  test("accepts when nothing is stored", () => expect(isNewer({ updatedAt: 1 }, null)).toBe(true));
  test("accepts strictly newer", () => expect(isNewer({ updatedAt: 2 }, { updated_at: 1 })).toBe(true));
  test("rejects older and equal", () => {
    expect(isNewer({ updatedAt: 1 }, { updated_at: 2 })).toBe(false);
    expect(isNewer({ updatedAt: 2 }, { updated_at: 2 })).toBe(false);
  });
});

describe("applyPush", () => {
  test("assigns increasing seq to accepted writes", () => {
    const store = memoryStore();
    const result = applyPush(store, [rec("a", 10), rec("b", 10)], 5);
    expect(result).toEqual({ seq: 7, rejected: [] });
    expect(store.get("cases", "a")?.seq).toBe(6);
    expect(store.get("cases", "b")?.seq).toBe(7);
  });

  test("last write wins; stale and duplicate pushes are rejected without bumping seq", () => {
    const store = memoryStore();
    applyPush(store, [rec("a", 10, { v: 1 })], 0);
    const result = applyPush(store, [rec("a", 5, { v: "old" }), rec("a", 10, { v: "same-ts" })], 1);
    expect(result.seq).toBe(1);
    expect(result.rejected).toEqual([
      { tbl: "cases", id: "a" },
      { tbl: "cases", id: "a" },
    ]);
    expect(store.get("cases", "a")?.data).toBe('{"v":1}');

    const newer = applyPush(store, [rec("a", 11, { v: 2 })], 1);
    expect(newer).toEqual({ seq: 2, rejected: [] });
    expect(store.get("cases", "a")).toMatchObject({ data: '{"v":2}', updated_at: 11, seq: 2 });
  });

  test("tombstones store null data", () => {
    const store = memoryStore();
    applyPush(store, [rec("a", 1), rec("a", 2, { ignored: true }, true)], 0);
    expect(store.get("cases", "a")).toMatchObject({ data: "null", deleted: 1, seq: 2 });
  });

  test("same id in different tables are independent", () => {
    const store = memoryStore();
    applyPush(store, [rec("a", 1), { ...rec("a", 1), table: "sessions" }], 0);
    expect(store.rows.size).toBe(2);
  });
});

describe("encodeRow / buildResponse", () => {
  const row = (seq: number, extra: Partial<StoredRow> = {}): StoredRow => ({
    tbl: "cases",
    id: `id${seq}`,
    data: `{"n":${seq}}`,
    updated_at: 100 + seq,
    deleted: 0,
    seq,
    ...extra,
  });

  test("encodes rows as wire records", () => {
    expect(JSON.parse(encodeRow(row(1)))).toEqual({ table: "cases", id: "id1", updatedAt: 101, data: { n: 1 } });
    expect(JSON.parse(encodeRow(row(2, { deleted: 1, data: "null" })))).toEqual({
      table: "cases",
      id: "id2",
      updatedAt: 102,
      deleted: true,
      data: null,
    });
  });

  test("cursor is max seq when the page is complete", () => {
    const body = JSON.parse(buildResponse([row(3), row(4)], [], 4));
    expect(body.cursor).toBe(4);
    expect(body.more).toBe(false);
    expect(body.records).toHaveLength(2);
  });

  test("empty page returns the server's max seq (lets a client recover from a reset)", () => {
    expect(JSON.parse(buildResponse([], [], 0))).toEqual({ records: [], cursor: 0, more: false });
  });

  test("paginates and sets more", () => {
    const page = Array.from({ length: PAGE_MAX_RECORDS + 1 }, (_, i) => row(i + 1));
    const body = JSON.parse(buildResponse(page, [], PAGE_MAX_RECORDS + 50));
    expect(body.records).toHaveLength(PAGE_MAX_RECORDS);
    expect(body.cursor).toBe(PAGE_MAX_RECORDS);
    expect(body.more).toBe(true);
  });

  test("includes winning versions of rejected pushes once", () => {
    const body = JSON.parse(buildResponse([row(5)], [row(5), row(1)], 5));
    expect(body.records.map((r: SyncRecord) => r.id)).toEqual(["id5", "id1"]);
  });
});

describe("parseSyncRequest", () => {
  test("accepts a valid body", () => {
    expect(parseSyncRequest({ since: 0, records: [rec("a", 1)] })).toEqual({
      since: 0,
      records: [{ table: "cases", id: "a", data: { v: "a" }, updatedAt: 1, deleted: false }],
    });
  });

  test.each([
    [null],
    [{ since: -1, records: [] }],
    [{ since: 1.5, records: [] }],
    [{ since: 0 }],
    [{ since: 0, records: [{ table: "bad table", id: "a", data: 1, updatedAt: 1 }] }],
    [{ since: 0, records: [{ table: "t", id: "", data: 1, updatedAt: 1 }] }],
    [{ since: 0, records: [{ table: "t", id: "a", data: 1, updatedAt: "1" }] }],
    [{ since: 0, records: [{ table: "t", id: "a", updatedAt: 1 }] }],
    [{ since: 0, records: [{ table: "t", id: "a", data: 1, updatedAt: 1, deleted: "yes" }] }],
    [{ since: 0, records: [{ table: "t", id: "a", data: "x".repeat(300_000), updatedAt: 1 }] }],
  ])("rejects %j", (body) => {
    expect(() => parseSyncRequest(body)).toThrow(ValidationError);
  });

  test("tombstones may omit data", () => {
    expect(parseSyncRequest({ since: 0, records: [{ table: "t", id: "a", updatedAt: 1, deleted: true }] }).records[0]?.deleted).toBe(true);
  });
});
