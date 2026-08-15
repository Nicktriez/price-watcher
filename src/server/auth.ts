"use server";

import { randomUUID, createHash, randomBytes } from "node:crypto";
import { useSession } from "@solidjs/start/http";
import { getRequestEvent } from "solid-js/web";
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
  type AuthenticationResponseJSON,
  type PublicKeyCredentialCreationOptionsJSON,
  type PublicKeyCredentialRequestOptionsJSON,
  type RegistrationResponseJSON,
} from "@simplewebauthn/server";
import { db } from "~/db/client";

const SESSION_COOKIE = "pw-session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 30;
const CHALLENGE_TTL_MS = 5 * 60 * 1000;

// TODO(beta): add email or TOTP recovery before public launch — passkeys have
// no self-serve recovery; for the closed beta Nick resets by deleting a user's
// passkey_credential rows.

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

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

async function session() {
  return useSession<{ userId: string }>({
    password: sessionSecret(),
    name: SESSION_COOKIE,
    maxAge: SESSION_MAX_AGE,
  });
}

export interface AuthUser {
  id: string;
  email: string | null;
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const current = await session();
  const userId = current.data.userId;
  if (!userId) return null;
  const user = await db
    .selectFrom("user")
    .select(["id", "email"])
    .where("id", "=", userId)
    .executeTakeFirst();
  return user ?? null;
}

export async function signOut(): Promise<void> {
  const current = await session();
  await current.clear();
}

/**
 * RP identity for WebAuthn. rpID must be the hostname the user is on (dev
 * "localhost", prod "beta.skujeg.dk"); the origin (incl. port in dev) must
 * match what the browser actually used, or the ceremony fails silently.
 */
function rpInfo(): { origin: string; rpID: string } {
  const event = getRequestEvent();
  const url = event?.request?.url;
  // ORIGIN takes precedence: behind a reverse proxy the request URL the app
  // sees is internal (http://127.0.0.1:3000), which would make rpID 127.0.0.1
  // and the browser would reject every ceremony. Set ORIGIN=https://beta.skujeg.dk
  // on the box; unset in dev -> localhost.
  const origin = process.env.ORIGIN ?? (url ? new URL(url).origin : "http://localhost:3100");
  return { origin, rpID: new URL(origin).hostname };
}

const b64url = (buf: Uint8Array) => Buffer.from(buf).toString("base64url");

async function storeChallenge(
  userId: string | null,
  challenge: string,
  userHandle: string | null = null,
) {
  const now = new Date().toISOString();
  await db
    .insertInto("webauthn_challenge")
    .values({
      id: randomUUID(),
      user_id: userId,
      challenge_hash: hashToken(challenge),
      user_handle: userHandle,
      expires_at: new Date(Date.now() + CHALLENGE_TTL_MS).toISOString(),
      created_at: now,
    })
    .execute();
}

/** Consume (and delete) a challenge by its hash; returns null if unknown/expired. */
async function consumeChallenge(challenge: string) {
  const now = new Date().toISOString();
  const hash = hashToken(challenge);
  const row = await db
    .selectFrom("webauthn_challenge")
    .select(["user_handle"])
    .where("challenge_hash", "=", hash)
    .where("expires_at", ">=", now)
    .executeTakeFirst();
  if (!row) return null;
  await db.deleteFrom("webauthn_challenge").where("challenge_hash", "=", hash).execute();
  return row;
}

function clientDataChallenge(response: { clientDataJSON: string }): string | null {
  try {
    const data = JSON.parse(Buffer.from(response.clientDataJSON, "base64url").toString());
    return typeof data.challenge === "string" ? data.challenge : null;
  } catch {
    return null;
  }
}

export type PasskeyResult = { ok: true; user: AuthUser } | { ok: false; error: string };

export async function startRegistration(): Promise<{
  ok: true;
  options: PublicKeyCredentialCreationOptionsJSON;
}> {
  const { rpID } = rpInfo();
  const userHandle = b64url(randomBytes(16));
  const options = await generateRegistrationOptions({
    rpName: "Sku' jeg?",
    rpID,
    userName: "Sku' jeg? bruger",
    userID: Buffer.from(userHandle, "base64url"),
    userDisplayName: "Sku' jeg? bruger",
    attestationType: "none",
    authenticatorSelection: { residentKey: "required", userVerification: "preferred" },
  });
  await storeChallenge(null, options.challenge, userHandle);
  return { ok: true, options };
}

export async function finishRegistration(
  response: RegistrationResponseJSON,
): Promise<PasskeyResult> {
  const { origin, rpID } = rpInfo();
  const challenge = clientDataChallenge(response.response);
  if (!challenge) return { ok: false, error: "invalid-challenge" };
  const row = await consumeChallenge(challenge);
  if (!row?.user_handle) return { ok: false, error: "invalid-challenge" };

  try {
    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge: (c) => c === challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
    });
    if (!verification.verified) return { ok: false, error: "verification-failed" };
    const info = verification.registrationInfo;
    if (!info) return { ok: false, error: "verification-failed" };

    const userId = randomUUID();
    const now = new Date().toISOString();
    await db
      .insertInto("user")
      .values({
        id: userId,
        email: null,
        user_handle: row.user_handle,
        created_at: now,
        updated_at: now,
        points: 0,
        receipt_count: 0,
        current_streak: 0,
        last_receipt_date: null,
        muted: false,
      })
      .execute();
    await db
      .insertInto("passkey_credential")
      .values({
        id: randomUUID(),
        user_id: userId,
        credential_id: info.credential.id,
        public_key: b64url(info.credential.publicKey),
        counter: String(info.credential.counter),
        transports: JSON.stringify(info.credential.transports ?? []),
        created_at: now,
        last_used_at: now,
      })
      .execute();

    const current = await session();
    await current.update({ userId });
    return { ok: true, user: { id: userId, email: null } };
  } catch (error) {
    console.error("[auth] finishRegistration failed:", error);
    return { ok: false, error: "registration-failed" };
  }
}

export async function startAuthentication(): Promise<{
  ok: true;
  options: PublicKeyCredentialRequestOptionsJSON;
}> {
  const { rpID } = rpInfo();
  const options = await generateAuthenticationOptions({ rpID, userVerification: "preferred" });
  await storeChallenge(null, options.challenge);
  return { ok: true, options };
}

export async function finishAuthentication(
  response: AuthenticationResponseJSON,
): Promise<PasskeyResult> {
  const { origin, rpID } = rpInfo();
  const challenge = clientDataChallenge(response.response);
  if (!challenge) return { ok: false, error: "invalid-challenge" };
  const row = await consumeChallenge(challenge);
  if (!row) return { ok: false, error: "invalid-challenge" };

  const userHandle = response.response.userHandle;
  // Identify the credential by its id (the assertion's `id`) — userHandle is
  // OPTIONAL (Firefox doesn't return it in the assertion). When present,
  // cross-check it binds to the same user.
  const credential = await db
    .selectFrom("passkey_credential")
    .select(["id", "user_id", "credential_id", "public_key", "counter", "transports"])
    .where("credential_id", "=", response.id)
    .executeTakeFirst();
  if (!credential) return { ok: false, error: "credential-not-found" };

  if (userHandle) {
    const byHandle = await db
      .selectFrom("user")
      .select("id")
      .where("user_handle", "=", userHandle)
      .executeTakeFirst();
    if (!byHandle || byHandle.id !== credential.user_id) {
      return { ok: false, error: "user-mismatch" };
    }
  }

  const user = await db
    .selectFrom("user")
    .select(["id", "email"])
    .where("id", "=", credential.user_id)
    .executeTakeFirst();
  if (!user) return { ok: false, error: "user-not-found" };

  try {
    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: (c) => c === challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      credential: {
        id: credential.credential_id,
        publicKey: Buffer.from(credential.public_key, "base64url"),
        counter: parseInt(credential.counter, 10),
        transports: credential.transports as
          | ("usb" | "nfc" | "ble" | "internal" | "hybrid" | "smart-card")[]
          | undefined,
      },
    });

    // Clone / replay detection: the assertion counter must strictly increase.
    // Platform authenticators (Windows Hello, Touch ID) keep the counter at 0
    // and never increment — only enforce strict increase when counters are
    // meaningful, matching simplewebauthn's own counter handling.
    const storedCounter = parseInt(credential.counter, 10);
    const newCounter = verification.authenticationInfo.newCounter;
    if (newCounter > 0 || storedCounter > 0) {
      if (newCounter <= storedCounter) {
        return { ok: false, error: "counter-stale" };
      }
    }
    const now = new Date().toISOString();
    await db
      .updateTable("passkey_credential")
      .set({ counter: String(newCounter), last_used_at: now })
      .where("id", "=", credential.id)
      .execute();

    const current = await session();
    await current.update({ userId: user.id });
    return { ok: true, user: { id: user.id, email: user.email } };
  } catch {
    return { ok: false, error: "authentication-failed" };
  }
}
