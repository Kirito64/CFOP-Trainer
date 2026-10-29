import { DurableObject } from "cloudflare:workers";
import { applyPush, buildResponse, PAGE_MAX_RECORDS, type RowStore, type StoredRow, type SyncRequest } from "./sync-core";

/** One instance per user: a server-side mirror of the user's IndexedDB records. */
export class UserStore extends DurableObject<Env> {
  private sql: SqlStorage;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.sql = ctx.storage.sql;
    this.migrate();
  }

  private migrate(): void {
    this.sql.exec(`
      CREATE TABLE IF NOT EXISTS records (
        tbl TEXT NOT NULL,
        id TEXT NOT NULL,
        data TEXT NOT NULL,
        updated_at INTEGER NOT NULL,
        deleted INTEGER NOT NULL DEFAULT 0,
        seq INTEGER NOT NULL,
        PRIMARY KEY (tbl, id)
      );
      CREATE UNIQUE INDEX IF NOT EXISTS records_seq ON records (seq);
    `);
  }

  /** Applies a push and returns the JSON response body. Runs without awaits, so it is atomic. */
  sync(req: SyncRequest): string {
    const store: RowStore = {
      get: (tbl, id) => this.sql.exec<StoredRow>("SELECT * FROM records WHERE tbl = ? AND id = ?", tbl, id).toArray()[0] ?? null,
      put: (r) => {
        this.sql.exec(
          `INSERT INTO records (tbl, id, data, updated_at, deleted, seq) VALUES (?, ?, ?, ?, ?, ?)
           ON CONFLICT (tbl, id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at,
             deleted = excluded.deleted, seq = excluded.seq`,
          r.tbl, r.id, r.data, r.updated_at, r.deleted, r.seq,
        );
      },
    };

    const { seq: maxSeq, rejected } = this.ctx.storage.transactionSync(() =>
      applyPush(store, req.records, this.maxSeq()),
    );

    const page = this.sql
      .exec<StoredRow>("SELECT * FROM records WHERE seq > ? ORDER BY seq LIMIT ?", req.since, PAGE_MAX_RECORDS + 1)
      .toArray();
    const extras = rejected.map((k) => store.get(k.tbl, k.id)).filter((r): r is StoredRow => r !== null);
    return buildResponse(page, extras, maxSeq);
  }

  async deleteAll(): Promise<void> {
    await this.ctx.storage.deleteAll();
    this.migrate();
  }

  private maxSeq(): number {
    return this.sql.exec<{ m: number }>("SELECT COALESCE(MAX(seq), 0) AS m FROM records").one().m;
  }
}
