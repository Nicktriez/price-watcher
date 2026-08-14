"use server";

import { randomUUID, createHash, randomInt } from "node:crypto";
import { useSession } from "@solidjs/start/http";
import { db } from "~/db/client";

const SESSION_COOKIE = "pw-session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 30;
const CODE_TTL_MS = 10 * 60 * 1000;

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

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
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
  email: string;
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

export async function requestLoginCode(emailInput: string): Promise<{ ok: true }> {
  const email = normalizeEmail(emailInput);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    throw new Error("Invalid email address");
  }

  const now = new Date().toISOString();
  let user = await db.selectFrom("user").select("id").where("email", "=", email).executeTakeFirst();
  if (!user) {
    user = await db
      .insertInto("user")
      .values({
        id: randomUUID(),
        email,
        created_at: now,
        updated_at: now,
        points: 0,
        receipt_count: 0,
        current_streak: 0,
        last_receipt_date: null,
        muted: false,
      })
      .returning("id")
      .executeTakeFirstOrThrow();
  }

  const code = String(randomInt(100000, 1000000));
  await db
    .insertInto("login_token")
    .values({
      id: randomUUID(),
      user_id: user.id,
      token: hashToken(code),
      expires_at: new Date(Date.now() + CODE_TTL_MS).toISOString(),
      created_at: now,
    })
    .execute();

  console.log(`[auth] login code for ${email}: ${code}`);
  return { ok: true };
}

export async function verifyLoginCode(
  emailInput: string,
  codeInput: string,
): Promise<{ ok: true; user: AuthUser } | { ok: false }> {
  const email = normalizeEmail(emailInput);
  const user = await db
    .selectFrom("user")
    .select(["id", "email"])
    .where("email", "=", email)
    .executeTakeFirst();
  if (!user) return { ok: false };

  const tokenHash = hashToken(codeInput.trim());
  const now = new Date().toISOString();
  const row = await db
    .selectFrom("login_token")
    .select(["id"])
    .where("user_id", "=", user.id)
    .where("token", "=", tokenHash)
    .where("used_at", "is", null)
    .where("expires_at", ">=", now)
    .orderBy("created_at", "desc")
    .executeTakeFirst();
  if (!row) return { ok: false };

  await db.updateTable("login_token").set({ used_at: now }).where("id", "=", row.id).execute();

  const current = await session();
  await current.update({ userId: user.id });
  return { ok: true, user: { id: user.id, email: user.email } };
}

export async function signOut(): Promise<void> {
  const current = await session();
  await current.clear();
}
