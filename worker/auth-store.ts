import { DurableObject } from "cloudflare:workers";

export type ChallengeKind = "register" | "login" | "add";

export type Challenge = {
  challenge: string;
  kind: ChallengeKind;
  userId: string | null;
  userName: string | null;
};

export type Credential = {
  id: string; // base64url credential ID
  userId: string;
  publicKey: string; // base64url COSE public key
  counter: number;
  transports: string[];
};

export type User = { id: string; name: string };

export type NewCredential = Omit<Credential, "userId"> & { deviceType: string; backedUp: boolean };

/** Single global instance holding users, passkeys, sessions and pending WebAuthn challenges. */
export class AuthStore extends DurableObject<Env> {
  private sql: SqlStorage;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.sql = ctx.storage.sql;
    this.sql.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS credentials (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
        public_key TEXT NOT NULL,
        counter INTEGER NOT NULL,
        transports TEXT NOT NULL,
        device_type TEXT NOT NULL,
        backed_up INTEGER NOT NULL,
        created_at INTEGER NOT NULL,
        last_used_at INTEGER
      );
      CREATE INDEX IF NOT EXISTS credentials_user ON credentials (user_id);
      CREATE TABLE IF NOT EXISTS sessions (
        token_hash TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
        expires_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS sessions_user ON sessions (user_id);
      CREATE INDEX IF NOT EXISTS sessions_expiry ON sessions (expires_at);
      CREATE TABLE IF NOT EXISTS challenges (
        id TEXT PRIMARY KEY,
        challenge TEXT NOT NULL,
        kind TEXT NOT NULL,
        user_id TEXT,
        user_name TEXT,
        expires_at INTEGER NOT NULL
      );
    `);
  }

  // --- challenges ---

  putChallenge(id: string, c: Challenge, ttlMs: number): void {
    const now = Date.now();
    this.sql.exec("DELETE FROM challenges WHERE expires_at < ?", now);
    this.sql.exec(
      "INSERT INTO challenges (id, challenge, kind, user_id, user_name, expires_at) VALUES (?, ?, ?, ?, ?, ?)",
      id, c.challenge, c.kind, c.userId, c.userName, now + ttlMs,
    );
  }

  /** Returns and deletes the challenge; null if missing, expired or of a different kind. */
  takeChallenge(id: string, kind: ChallengeKind): Challenge | null {
    const row = this.sql
      .exec<{ challenge: string; kind: string; user_id: string | null; user_name: string | null; expires_at: number }>(
        "DELETE FROM challenges WHERE id = ? RETURNING challenge, kind, user_id, user_name, expires_at",
        id,
      )
      .toArray()[0];
    if (!row || row.kind !== kind || row.expires_at < Date.now()) return null;
    return { challenge: row.challenge, kind, userId: row.user_id, userName: row.user_name };
  }

  // --- users & credentials ---

  createUser(user: User, cred: NewCredential): void {
    this.ctx.storage.transactionSync(() => {
      this.sql.exec("INSERT INTO users (id, name, created_at) VALUES (?, ?, ?)", user.id, user.name, Date.now());
      this.insertCredential(user.id, cred);
    });
  }

  /** Returns false if the credential ID is already registered. */
  addCredential(userId: string, cred: NewCredential): boolean {
    if (this.getCredential(cred.id)) return false;
    this.insertCredential(userId, cred);
    return true;
  }

  hasCredential(id: string): boolean {
    return this.getCredential(id) !== null;
  }

  getCredential(id: string): Credential | null {
    const row = this.sql
      .exec<{ id: string; user_id: string; public_key: string; counter: number; transports: string }>(
        "SELECT id, user_id, public_key, counter, transports FROM credentials WHERE id = ?",
        id,
      )
      .toArray()[0];
    if (!row) return null;
    return {
      id: row.id,
      userId: row.user_id,
      publicKey: row.public_key,
      counter: row.counter,
      transports: JSON.parse(row.transports) as string[],
    };
  }

  listCredentials(userId: string): { id: string; transports: string[] }[] {
    return this.sql
      .exec<{ id: string; transports: string }>("SELECT id, transports FROM credentials WHERE user_id = ?", userId)
      .toArray()
      .map((r) => ({ id: r.id, transports: JSON.parse(r.transports) as string[] }));
  }

  markCredentialUsed(id: string, counter: number, backedUp: boolean): void {
    this.sql.exec(
      "UPDATE credentials SET counter = ?, backed_up = ?, last_used_at = ? WHERE id = ?",
      counter, backedUp ? 1 : 0, Date.now(), id,
    );
  }

  getUser(id: string): User | null {
    return this.sql.exec<User>("SELECT id, name FROM users WHERE id = ?", id).toArray()[0] ?? null;
  }

  deleteUser(userId: string): void {
    this.ctx.storage.transactionSync(() => {
      this.sql.exec("DELETE FROM sessions WHERE user_id = ?", userId);
      this.sql.exec("DELETE FROM credentials WHERE user_id = ?", userId);
      this.sql.exec("DELETE FROM challenges WHERE user_id = ?", userId);
      this.sql.exec("DELETE FROM users WHERE id = ?", userId);
    });
  }

  // --- sessions ---

  createSession(tokenHash: string, userId: string, ttlMs: number): void {
    const now = Date.now();
    this.sql.exec("DELETE FROM sessions WHERE expires_at < ?", now);
    this.sql.exec("INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)", tokenHash, userId, now + ttlMs);
  }

  /**
   * Looks up a live session. Sliding expiry: once less than `ttlMs - refreshAfterMs` remains,
   * the expiry is pushed out to a full `ttlMs` and `refreshed` is true so the cookie can be re-set.
   */
  getSession(tokenHash: string, ttlMs: number, refreshAfterMs: number): { user: User; refreshed: boolean } | null {
    const now = Date.now();
    const row = this.sql
      .exec<{ id: string; name: string; expires_at: number }>(
        `SELECT u.id, u.name, s.expires_at FROM sessions s JOIN users u ON u.id = s.user_id
         WHERE s.token_hash = ?`,
        tokenHash,
      )
      .toArray()[0];
    if (!row) return null;
    if (row.expires_at < now) {
      this.sql.exec("DELETE FROM sessions WHERE token_hash = ?", tokenHash);
      return null;
    }
    const refreshed = row.expires_at - now < ttlMs - refreshAfterMs;
    if (refreshed) this.sql.exec("UPDATE sessions SET expires_at = ? WHERE token_hash = ?", now + ttlMs, tokenHash);
    return { user: { id: row.id, name: row.name }, refreshed };
  }

  deleteSession(tokenHash: string): void {
    this.sql.exec("DELETE FROM sessions WHERE token_hash = ?", tokenHash);
  }

  private insertCredential(userId: string, c: NewCredential): void {
    this.sql.exec(
      `INSERT INTO credentials (id, user_id, public_key, counter, transports, device_type, backed_up, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      c.id, userId, c.publicKey, c.counter, JSON.stringify(c.transports), c.deviceType, c.backedUp ? 1 : 0, Date.now(),
    );
  }
}
