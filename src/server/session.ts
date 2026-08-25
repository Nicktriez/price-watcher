// Signed cookie sessions: `@remix-run/cookie` (signed HMAC-SHA256 on pure
// WebCrypto — node/deno/bun/workerd — with secret rotation built in)
// composed over @solidjs/web's request event. Replaces SolidStart's
// `useSession` helper, which does not exist in Solid 2 start mode.
//
// Reads come off `event.request`; writes append to the `event.response`
// stub and ride whatever response leaves.
//
// Signed, NOT encrypted: the payload is tamper-proof but client-readable.
// Never put secrets in it. Keep this module server-only — importing it from
// client code would pull node-only modules into the browser bundle.
import { getRequestEvent } from "@solidjs/web";
import type { RequestEvent, ResponseStub } from "@solidjs/web";
import { createCookie } from "@remix-run/cookie";

/** Augment with whatever the app stores; keep it small (cookies cap at ~4KB). */
export interface SessionData {
  userId?: string;
}

const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // seconds — drives cookie Max-Age AND the enforced expiry

function sessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    console.warn("[auth] SESSION_SECRET not set; using insecure dev secret");
    return "dev-only-insecure-session-secret-0123456789";
  }
  if (secret.length < 32) {
    throw new Error("SESSION_SECRET must be at least 32 characters");
  }
  return secret;
}

const cookie = createCookie("pw-session", {
  secrets: [sessionSecret()],
  httpOnly: true,
  secure: true,
  sameSite: "Lax",
  maxAge: SESSION_MAX_AGE,
});

function event(): RequestEvent & { response: ResponseStub } {
  const e = getRequestEvent();
  if (!e) {
    throw new Error(
      "session: no request event — call within a server function, SSR handler, or middleware",
    );
  }
  return e as RequestEvent & { response: ResponseStub };
}

/**
 * The current session, or `null` — absent and tampered read the same.
 * Reads the REQUEST's cookie only: a `setSession` in the same request does
 * not read back (the request is what arrived; the response is what you're
 * building).
 */
export async function getSession(): Promise<SessionData | null> {
  const raw = await cookie.parse(event().request.headers.get("cookie"));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SessionData;
  } catch {
    return null;
  }
}

/** Replaces the session (whole-payload write) on the outgoing response. */
export async function setSession(data: SessionData): Promise<void> {
  event().response.headers.append("set-cookie", await cookie.serialize(JSON.stringify(data)));
}

/** Expires the session cookie on the outgoing response. */
export async function clearSession(): Promise<void> {
  event().response.headers.append("set-cookie", await cookie.serialize("", { maxAge: 0 }));
}
