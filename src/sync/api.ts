import {
  browserSupportsWebAuthn,
  startAuthentication,
  startRegistration,
  WebAuthnError,
  type PublicKeyCredentialCreationOptionsJSON,
  type PublicKeyCredentialRequestOptionsJSON,
} from "@simplewebauthn/browser";

/** A record as exchanged with `/api/sync`. `deleted` records are tombstones (data is null). */
export type SyncRecord = {
  table: string;
  id: string;
  data: unknown;
  updatedAt: number;
  deleted?: boolean;
};

export type User = { id: string; name: string };

export type SyncResponse = {
  /** Every server record with seq > since (including ones just pushed), plus the server's
   *  winning version of any pushed record that lost last-write-wins. */
  records: SyncRecord[];
  /** Pass as `since` next time. */
  cursor: number;
  /** More records are waiting: call again with `since = cursor` (and no records). */
  more: boolean;
};

export type ApiErrorCode =
  | "unauthorized" // not signed in / session expired
  | "cancelled" // user dismissed or timed out the passkey prompt
  | "unsupported" // browser/device can't do passkeys here
  | "already_registered" // this authenticator already holds a passkey for the account
  | "network" // offline or server unreachable
  | "bad_request"
  | "conflict"
  | "server";

export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;

  constructor(code: ApiErrorCode, message: string, status = 0) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
  }
}

function codeForStatus(status: number): ApiErrorCode {
  if (status === 401 || status === 403) return "unauthorized";
  if (status === 409) return "conflict";
  if (status >= 400 && status < 500) return "bad_request";
  return "server";
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      method,
      credentials: "same-origin",
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError("network", "Can't reach the server. Check your connection.");
  }
  const payload: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const message =
      typeof payload === "object" && payload !== null && "error" in payload && typeof payload.error === "string"
        ? payload.error
        : `Request failed (${res.status})`;
    throw new ApiError(codeForStatus(res.status), message, res.status);
  }
  return payload as T;
}

function ensureWebAuthn(): void {
  if (!browserSupportsWebAuthn()) {
    throw new ApiError("unsupported", "This browser doesn't support passkeys.");
  }
}

/** Translates errors from the browser's passkey prompt into ApiErrors with readable messages. */
function passkeyError(err: unknown): ApiError {
  if (err instanceof ApiError) return err;
  if (err instanceof WebAuthnError) {
    switch (err.code) {
      case "ERROR_CEREMONY_ABORTED":
        return new ApiError("cancelled", "Passkey prompt was cancelled");
      case "ERROR_AUTHENTICATOR_PREVIOUSLY_REGISTERED":
        return new ApiError("already_registered", "This device already has a passkey for your account");
      case "ERROR_INVALID_DOMAIN":
      case "ERROR_INVALID_RP_ID":
        return new ApiError("unsupported", "Passkeys only work on https:// or http://localhost addresses");
      case "ERROR_AUTHENTICATOR_MISSING_DISCOVERABLE_CREDENTIAL_SUPPORT":
      case "ERROR_AUTHENTICATOR_MISSING_USER_VERIFICATION_SUPPORT":
      case "ERROR_AUTHENTICATOR_NO_SUPPORTED_PUBKEYCREDPARAMS_ALG":
        return new ApiError("unsupported", "This authenticator can't create a passkey for this site");
    }
    if (err.cause instanceof Error && err.cause.name === "NotAllowedError") {
      return new ApiError("cancelled", "Passkey prompt was cancelled");
    }
    return new ApiError("server", err.message || "Passkey request failed");
  }
  if (err instanceof Error && (err.name === "NotAllowedError" || err.name === "AbortError")) {
    return new ApiError("cancelled", "Passkey prompt was cancelled");
  }
  return new ApiError("server", err instanceof Error ? err.message : "Passkey request failed");
}

async function createPasskey(optionsPath: string, verifyPath: string, body?: unknown): Promise<unknown> {
  ensureWebAuthn();
  const optionsJSON = await request<PublicKeyCredentialCreationOptionsJSON>("POST", optionsPath, body ?? {});
  let response;
  try {
    response = await startRegistration({ optionsJSON });
  } catch (err) {
    throw passkeyError(err);
  }
  return request("POST", verifyPath, response);
}

/** Current user, or null when signed out. Throws ApiError("network") when offline. */
export async function getMe(): Promise<User | null> {
  return (await request<{ user: User | null }>("GET", "/api/auth/me")).user;
}

/** Creates a new account with a passkey on this device and signs in. */
export async function registerPasskey(name: string): Promise<User> {
  const { user } = (await createPasskey("/api/auth/register/options", "/api/auth/register/verify", {
    name,
  })) as { user: User };
  return user;
}

/** Signs in with any passkey saved for this site (no username needed). */
export async function signInWithPasskey(): Promise<User> {
  ensureWebAuthn();
  const optionsJSON = await request<PublicKeyCredentialRequestOptionsJSON>("POST", "/api/auth/login/options", {});
  let response;
  try {
    response = await startAuthentication({ optionsJSON });
  } catch (err) {
    throw passkeyError(err);
  }
  const { user } = await request<{ user: User }>("POST", "/api/auth/login/verify", response);
  return user;
}

/** Adds another passkey (e.g. a phone) to the signed-in account. */
export async function addPasskey(): Promise<void> {
  await createPasskey("/api/auth/passkeys/add/options", "/api/auth/passkeys/add/verify");
}

export async function signOut(): Promise<void> {
  await request("POST", "/api/auth/logout", {});
}

/** Pushes local changes and pulls everything newer than `since`. */
export async function syncRecords(since: number, records: SyncRecord[]): Promise<SyncResponse> {
  return request<SyncResponse>("POST", "/api/sync", { since, records });
}

/** Permanently deletes the account, its passkeys and all synced data. */
export async function deleteAccount(): Promise<void> {
  await request("DELETE", "/api/account");
}
