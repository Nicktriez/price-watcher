"use server";

import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { db } from "~/db/client";
import { getCurrentUser } from "./auth.ts";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

// Persistent upload dir (the box sets UPLOAD_DIR). Images live here only until
// the worker parses them, then they're deleted (GDPR promise). The worker that
// consumes them lives in `./receipt-worker.ts` (SolidStart runtime, not this
// `"use server"` module — see Task 038r).
const UPLOAD_DIR = process.env.UPLOAD_DIR ?? join(process.cwd(), "uploads", "receipts");

export type QueueReceiptResult =
  | { ok: true; receiptId: string; message: string }
  | { ok: false; reason: "sign-in-required" | "invalid-image" };

/**
 * Fast path: validate the image, persist it, queue the receipt as `pending`
 * and return immediately. OCR happens later in the background worker
 * (Task 038q) — the user never waits on it.
 */
export async function queueReceipt(file: File): Promise<QueueReceiptResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, reason: "sign-in-required" };

  if (!["image/jpeg", "image/png"].includes(file.type) || file.size > MAX_IMAGE_BYTES) {
    return { ok: false, reason: "invalid-image" };
  }

  const receiptId = randomUUID();
  const fileName = `${receiptId}.jpg`;
  await mkdir(UPLOAD_DIR, { recursive: true });
  await writeFile(join(UPLOAD_DIR, fileName), Buffer.from(await file.arrayBuffer()));

  const now = new Date().toISOString();
  await db
    .insertInto("receipt")
    .values({
      id: receiptId,
      user_id: user.id,
      store_id: null,
      chain_id: null,
      store_name: null,
      receipt_date: null,
      total: null,
      currency: "DKK",
      confidence: null,
      image_path: fileName,
      source: "receipt",
      trust_tier: "community",
      points_awarded: 0,
      status: "pending",
      error: null,
      retry_count: 0,
      created_at: now,
      updated_at: now,
    })
    .execute();

  return {
    ok: true,
    receiptId,
    message: "Vi læser din kvittering — du får besked, når den er klar.",
  };
}

export async function getReceiptStatus(
  receiptId: string,
  userId: string,
): Promise<{ status: string; error: string | null } | null> {
  const row = await db
    .selectFrom("receipt")
    .select(["status", "error"])
    .where("id", "=", receiptId)
    .where("user_id", "=", userId)
    .executeTakeFirst();
  return row ? { status: row.status, error: row.error } : null;
}

export async function retryReceipt(receiptId: string): Promise<{ ok: boolean }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false };
  const r = await db
    .updateTable("receipt")
    .set({
      status: "pending",
      error: null,
      retry_count: 0,
      updated_at: new Date().toISOString(),
    })
    .where("id", "=", receiptId)
    .where("user_id", "=", user.id)
    .where("status", "=", "failed")
    .execute();
  return { ok: r.length > 0 };
}
