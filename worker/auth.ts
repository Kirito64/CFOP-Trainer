import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
  type AuthenticationResponseJSON,
  type RegistrationResponseJSON,
} from "@simplewebauthn/server";
import { isoBase64URL } from "@simplewebauthn/server/helpers";
import type { AuthStore, ChallengeKind, NewCredential, User } from "./auth-store";
import { parseCookies, serializeCookie } from "./cookies";
import { HttpError, isObject, json, randomToken, readJson, sha256Hex } from "./http";

const RP_NAME = "CFOP Trainer";
const SESSION_COOKIE = "cfop_session";
const CHALLENGE_COOKIE = "cfop_challenge";
const DAY_MS = 24 * 60 * 60 * 1000;
export const SESSION_TTL_MS = 90 * DAY_MS;
const SESSION_REFRESH_AFTER_MS = DAY_MS;
const CHALLENGE_TTL_MS = 5 * 60 * 1000;
const MAX_AUTH_BODY = 64 * 1024;

export type Ctx = {
  req: Request;
  url: URL;
  env: Env;
  auth: DurableObjectStub<AuthStore>;
};

export type Session = { user: User; tokenHash: string; refreshed: boolean };

const isSecure = (url: URL) => url.protocol === "https:";

// --- sessions ---

export async function getSession(ctx: Ctx): Promise<Session | null> {
  const token = parseCookies(ctx.req.headers.get("Cookie"))[SESSION_COOKIE];
  if (!token) return null;
  const tokenHash = await sha256Hex(token);
  const found = await ctx.auth.getSession(tokenHash, SESSION_TTL_MS, SESSION_REFRESH_AFTER_MS);
  return found ? { ...found, tokenHash } : null;
}

export async function requireSession(ctx: Ctx): Promise<Session> {
  const session = await getSession(ctx);
  if (!session) throw new HttpError(401, "Not signed in");
  return session;
}

/** Re-sends the session cookie with a fresh Max-Age when the server-side expiry slid forward. */
export function refreshSessionCookie(ctx: Ctx, res: Response, session: Session | null): Response {
  if (!session?.refreshed) return res;
  const token = parseCookies(ctx.req.headers.get("Cookie"))[SESSION_COOKIE];
  if (token) res.headers.append("Set-Cookie", sessionCookie(ctx.url, token, SESSION_TTL_MS / 1000));
  return res;
}

function sessionCookie(url: URL, value: string, maxAge: number): string {
  return serializeCookie(SESSION_COOKIE, value, { maxAge, secure: isSecure(url), sameSite: "Lax", path: "/" });
}

export function clearSessionCookie(url: URL): string {
  return sessionCookie(url, "", 0);
}

async function startSession(ctx: Ctx, userId: string): Promise<string> {
  const token = randomToken();
  await ctx.auth.createSession(await sha256Hex(token), userId, SESSION_TTL_MS);
  return sessionCookie(ctx.url, token, SESSION_TTL_MS / 1000);
}

// --- challenges ---

async function issueChallenge(
  ctx: Ctx,
  kind: ChallengeKind,
  challenge: string,
  user: { userId: string; userName: string } | null,
): Promise<string> {
  const id = randomToken(16);
  await ctx.auth.putChallenge(
    id,
    { challenge, kind, userId: user?.userId ?? null, userName: user?.userName ?? null },
    CHALLENGE_TTL_MS,
  );
  return serializeCookie(CHALLENGE_COOKIE, id, {
    maxAge: CHALLENGE_TTL_MS / 1000,
    secure: isSecure(ctx.url),
    sameSite: "Strict",
    path: "/api/auth",
  });
}

async function takeChallenge(ctx: Ctx, kind: ChallengeKind) {
  const id = parseCookies(ctx.req.headers.get("Cookie"))[CHALLENGE_COOKIE];
  const challenge = id ? await ctx.auth.takeChallenge(id, kind) : null;
  if (!challenge) throw new HttpError(400, "Passkey request expired. Please try again.");
  return challenge;
}

function clearChallengeCookie(url: URL): string {
  return serializeCookie(CHALLENGE_COOKIE, "", { maxAge: 0, secure: isSecure(url), sameSite: "Strict", path: "/api/auth" });
}

// --- body validation ---

function parseName(body: unknown): string {
  const name = isObject(body) && typeof body.name === "string" ? body.name.trim() : "";
  if (name.length < 1 || name.length > 64) throw new HttpError(400, "Name must be 1-64 characters");
  return name;
}

function assertCredentialJSON(body: unknown): asserts body is { id: string; response: Record<string, unknown> } {
  if (!isObject(body) || typeof body.id !== "string" || !isObject(body.response) || body.type !== "public-key") {
    throw new HttpError(400, "Malformed passkey response");
  }
}

async function verifyRegistration(ctx: Ctx, body: unknown, expectedChallenge: string): Promise<NewCredential> {
  assertCredentialJSON(body);
  let result;
  try {
    result = await verifyRegistrationResponse({
      response: body as unknown as RegistrationResponseJSON,
      expectedChallenge,
      expectedOrigin: ctx.url.origin,
      expectedRPID: ctx.url.hostname,
      requireUserVerification: true,
    });
  } catch (err) {
    throw new HttpError(400, `Passkey verification failed: ${(err as Error).message}`);
  }
  if (!result.verified) throw new HttpError(400, "Passkey verification failed");
  const { credential, credentialDeviceType, credentialBackedUp } = result.registrationInfo;
  return {
    id: credential.id,
    publicKey: isoBase64URL.fromBuffer(credential.publicKey),
    counter: credential.counter,
    transports: credential.transports ?? [],
    deviceType: credentialDeviceType,
    backedUp: credentialBackedUp,
  };
}

function registrationOptions(ctx: Ctx, user: { userId: string; userName: string }, exclude: { id: string; transports: string[] }[]) {
  return generateRegistrationOptions({
    rpName: RP_NAME,
    rpID: ctx.url.hostname,
    userName: user.userName,
    userDisplayName: user.userName,
    userID: isoBase64URL.toBuffer(user.userId),
    attestationType: "none",
    excludeCredentials: exclude,
    authenticatorSelection: { residentKey: "required", requireResidentKey: true, userVerification: "required" },
    timeout: CHALLENGE_TTL_MS,
  });
}

// --- route handlers ---

export async function registerOptions(ctx: Ctx): Promise<Response> {
  const userName = parseName(await readJson(ctx.req, MAX_AUTH_BODY));
  const user = { userId: randomToken(16), userName };
  const options = await registrationOptions(ctx, user, []);
  const cookie = await issueChallenge(ctx, "register", options.challenge, user);
  return json(options, 200, { "Set-Cookie": cookie });
}

export async function registerVerify(ctx: Ctx): Promise<Response> {
  const challenge = await takeChallenge(ctx, "register");
  const cred = await verifyRegistration(ctx, await readJson(ctx.req, MAX_AUTH_BODY), challenge.challenge);
  if (!challenge.userId || !challenge.userName) throw new HttpError(400, "Invalid registration state");
  if (await ctx.auth.hasCredential(cred.id)) throw new HttpError(409, "This passkey is already registered");

  const user = { id: challenge.userId, name: challenge.userName };
  await ctx.auth.createUser(user, cred);
  const res = json({ user });
  res.headers.append("Set-Cookie", clearChallengeCookie(ctx.url));
  res.headers.append("Set-Cookie", await startSession(ctx, user.id));
  return res;
}

export async function loginOptions(ctx: Ctx): Promise<Response> {
  const options = await generateAuthenticationOptions({
    rpID: ctx.url.hostname,
    allowCredentials: [],
    userVerification: "required",
    timeout: CHALLENGE_TTL_MS,
  });
  const cookie = await issueChallenge(ctx, "login", options.challenge, null);
  return json(options, 200, { "Set-Cookie": cookie });
}

export async function loginVerify(ctx: Ctx): Promise<Response> {
  const challenge = await takeChallenge(ctx, "login");
  const body = await readJson(ctx.req, MAX_AUTH_BODY);
  assertCredentialJSON(body);

  const cred = await ctx.auth.getCredential(body.id);
  if (!cred) throw new HttpError(401, "This passkey isn't registered with CFOP Trainer");
  const userHandle = body.response.userHandle;
  if (typeof userHandle === "string" && userHandle !== cred.userId) throw new HttpError(401, "Passkey does not match its account");

  let result;
  try {
    result = await verifyAuthenticationResponse({
      response: body as unknown as AuthenticationResponseJSON,
      expectedChallenge: challenge.challenge,
      expectedOrigin: ctx.url.origin,
      expectedRPID: ctx.url.hostname,
      credential: {
        id: cred.id,
        publicKey: isoBase64URL.toBuffer(cred.publicKey),
        counter: cred.counter,
        transports: cred.transports,
      },
      requireUserVerification: true,
    });
  } catch (err) {
    throw new HttpError(401, `Passkey verification failed: ${(err as Error).message}`);
  }
  if (!result.verified) throw new HttpError(401, "Passkey verification failed");

  const { newCounter, credentialBackedUp } = result.authenticationInfo;
  await ctx.auth.markCredentialUsed(cred.id, newCounter, credentialBackedUp);
  const user = await ctx.auth.getUser(cred.userId);
  if (!user) throw new HttpError(401, "Account no longer exists");

  const res = json({ user });
  res.headers.append("Set-Cookie", clearChallengeCookie(ctx.url));
  res.headers.append("Set-Cookie", await startSession(ctx, user.id));
  return res;
}

export async function addPasskeyOptions(ctx: Ctx, session: Session): Promise<Response> {
  const user = { userId: session.user.id, userName: session.user.name };
  const existing = await ctx.auth.listCredentials(user.userId);
  const options = await registrationOptions(ctx, user, existing);
  const cookie = await issueChallenge(ctx, "add", options.challenge, user);
  return json(options, 200, { "Set-Cookie": cookie });
}

export async function addPasskeyVerify(ctx: Ctx, session: Session): Promise<Response> {
  const challenge = await takeChallenge(ctx, "add");
  if (challenge.userId !== session.user.id) throw new HttpError(403, "Passkey request belongs to another account");
  const cred = await verifyRegistration(ctx, await readJson(ctx.req, MAX_AUTH_BODY), challenge.challenge);
  if (!(await ctx.auth.addCredential(session.user.id, cred))) throw new HttpError(409, "This passkey is already registered");
  const res = json({ ok: true });
  res.headers.append("Set-Cookie", clearChallengeCookie(ctx.url));
  return res;
}

export async function logout(ctx: Ctx): Promise<Response> {
  const session = await getSession(ctx);
  if (session) await ctx.auth.deleteSession(session.tokenHash);
  return json({ ok: true }, 200, { "Set-Cookie": clearSessionCookie(ctx.url) });
}
