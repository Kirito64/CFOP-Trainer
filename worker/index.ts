import * as auth from "./auth";
import { errorResponse, HttpError, json, readJson } from "./http";
import { parseSyncRequest, ValidationError } from "./sync-core";

export { AuthStore } from "./auth-store";
export { UserStore } from "./user-store";

const MAX_SYNC_BODY = 8 * 1024 * 1024;

type Handler = (ctx: auth.Ctx) => Promise<Response>;
type AuthedHandler = (ctx: auth.Ctx, session: auth.Session) => Promise<Response>;

/** Wraps a handler that needs a signed-in user; refreshes the session cookie when it slid. */
const authed =
  (handler: AuthedHandler): Handler =>
  async (ctx) => {
    const session = await auth.requireSession(ctx);
    return auth.refreshSessionCookie(ctx, await handler(ctx, session), session);
  };

const routes: Record<string, Partial<Record<string, Handler>>> = {
  "/api/auth/register/options": { POST: auth.registerOptions },
  "/api/auth/register/verify": { POST: auth.registerVerify },
  "/api/auth/login/options": { POST: auth.loginOptions },
  "/api/auth/login/verify": { POST: auth.loginVerify },
  "/api/auth/passkeys/add/options": { POST: authed(auth.addPasskeyOptions) },
  "/api/auth/passkeys/add/verify": { POST: authed(auth.addPasskeyVerify) },
  "/api/auth/logout": { POST: auth.logout },
  // Signed out is a normal state for a local-first app, so it's not an error.
  "/api/auth/me": {
    GET: async (ctx) => {
      const session = await auth.getSession(ctx);
      return auth.refreshSessionCookie(ctx, json({ user: session?.user ?? null }), session);
    },
  },
  "/api/sync": { POST: authed(sync) },
  "/api/account": { DELETE: authed(deleteAccount) },
};

async function sync(ctx: auth.Ctx, session: auth.Session): Promise<Response> {
  const body = await readJson(ctx.req, MAX_SYNC_BODY);
  let request;
  try {
    request = parseSyncRequest(body);
  } catch (err) {
    if (err instanceof ValidationError) throw new HttpError(400, err.message);
    throw err;
  }
  const store = ctx.env.USER_STORE.getByName(session.user.id);
  const responseBody = await store.sync(request);
  return new Response(responseBody, {
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

async function deleteAccount(ctx: auth.Ctx, session: auth.Session): Promise<Response> {
  await ctx.env.USER_STORE.getByName(session.user.id).deleteAll();
  await ctx.auth.deleteUser(session.user.id);
  return json({ ok: true }, 200, { "Set-Cookie": auth.clearSessionCookie(ctx.url) });
}

export default {
  async fetch(req, env): Promise<Response> {
    const url = new URL(req.url);
    if (!url.pathname.startsWith("/api/")) return errorResponse(404, "Not found");

    const route = routes[url.pathname];
    const handler = route?.[req.method];
    if (!route) return errorResponse(404, "Not found");
    if (!handler) return errorResponse(405, "Method not allowed");

    // Cookies are SameSite=Lax, but reject cross-origin writes outright as well.
    const origin = req.headers.get("Origin");
    if (req.method !== "GET" && origin !== null && origin !== url.origin) {
      return errorResponse(403, "Cross-origin request rejected");
    }

    const ctx: auth.Ctx = { req, url, env, auth: env.AUTH_STORE.getByName("global") };
    try {
      return await handler(ctx);
    } catch (err) {
      if (err instanceof HttpError) return errorResponse(err.status, err.message);
      console.error("Unhandled API error", err);
      return errorResponse(500, "Something went wrong on the server");
    }
  },
} satisfies ExportedHandler<Env>;
