import { randomUUID } from "node:crypto";
import { rm } from "node:fs/promises";
import { join } from "node:path";
import { sql } from "kysely";
import { db } from "~/db/client";
import { decideDedup, receiptFingerprint, type DedupDecision } from "~/lib/receipt-dedup";
import { ocrReceipt } from "~/lib/receipt-ocr";
import { matchProductName } from "~/lib/product-matching";
import { computeAward, computeStreak } from "~/lib/receipt-points";

/**
 * Receipt OCR worker (Tasks 038q + 038r).
 *
 * Lives in the SolidStart app runtime — NOT the raw-node scheduler
 * (`node src/server/ingest-scheduler.ts`), which cannot resolve the `~` alias
 * or `server-only`. `startReceiptWorker()` is invoked from the app's server
 * entry, so the poll runs in the same process as the app and processes queued
 * receipts one at a time. This module deliberately has NO `"use server"`
 * directive: SolidStart wraps exports of `"use server"` modules in proxies that
 * throw "Cannot call server function outside of a request" when called from a
 * background timer.
 */

// Persistent upload dir (the box sets UPLOAD_DIR). Images live here only until
// the worker parses them, then they're deleted (GDPR promise).
const UPLOAD_DIR = process.env.UPLOAD_DIR ?? join(process.cwd(), "uploads", "receipts");

const RECEIPT_POLL_MS = 30_000;

export interface UploadResult {
  ok: boolean;
  reason?: "sign-in-required" | "invalid-image" | "ocr-failed";
  dedup?: DedupDecision;
  receiptId?: string;
  store?: string | null;
  date?: string | null;
  total?: number | null;
  itemCount?: number;
  cleanCount?: number;
  garbledCount?: number;
  footerCount?: number;
  pointsEarned?: number;
  streak?: number;
  message?: string;
}

function toIsoDateOnly(v: Date | string | null): string | null {
  if (v == null) return null;
  const d = typeof v === "string" ? new Date(v) : v;
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function danishToIso(d: string): string | null {
  const m = d.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (!m) return null;
  return `${m[3]}-${m[2]}-${m[1]}`;
}

function toDanish(value: Date | string | null): string | null {
  if (value == null) return null;
  const dt = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(dt.getTime())) return null;
  const day = String(dt.getDate()).padStart(2, "0");
  const month = String(dt.getMonth() + 1).padStart(2, "0");
  return `${day}.${month}.${dt.getFullYear()}`;
}

interface MatchingReceipt {
  receiptId: string;
  cleanCount: number;
  itemCount: number;
  pointsAwarded: number;
}

async function findMatchingReceipt(
  userId: string,
  fingerprint: string,
): Promise<MatchingReceipt | null> {
  const receipts = await db
    .selectFrom("receipt")
    .select(["id", "store_name", "receipt_date", "total", "points_awarded"])
    .where("user_id", "=", userId)
    .where("status", "=", "processed")
    .execute();

  for (const receipt of receipts) {
    const items = await db
      .selectFrom("receipt_item")
      .select(["price"])
      .where("receipt_id", "=", receipt.id)
      .execute();
    const existingFingerprint = receiptFingerprint({
      userId,
      storeName: receipt.store_name,
      receiptDate: toDanish(receipt.receipt_date as Date | string | null),
      total: receipt.total == null ? null : parseFloat(receipt.total),
      itemCount: items.length,
    });
    if (existingFingerprint === fingerprint) {
      return {
        receiptId: receipt.id,
        cleanCount: items.filter((i) => i.price != null).length,
        itemCount: items.length,
        pointsAwarded: receipt.points_awarded,
      };
    }
  }
  return null;
}

async function deleteReceiptRows(receiptId: string): Promise<void> {
  const receipt = await db
    .selectFrom("receipt")
    .select(["image_path"])
    .where("id", "=", receiptId)
    .executeTakeFirst();
  if (receipt?.image_path) {
    await rm(join(UPLOAD_DIR, receipt.image_path), { force: true }).catch(() => {});
  }
  await db.deleteFrom("price_point").where("receipt_id", "=", receiptId).execute();
  await db.deleteFrom("receipt_item").where("receipt_id", "=", receiptId).execute();
  await db.deleteFrom("receipt").where("id", "=", receiptId).execute();
}

/**
 * One background job: read a queued receipt's image, OCR it, parse, dedup,
 * award points, store items + price points, then delete the image (GDPR).
 * The queue/worker split (Task 038q) keeps the upload route instant.
 */
export async function processPendingReceipt(receiptId: string): Promise<UploadResult> {
  const receipt = await db
    .selectFrom("receipt")
    .select(["user_id", "image_path"])
    .where("id", "=", receiptId)
    .executeTakeFirst();
  if (!receipt || !receipt.image_path) {
    return { ok: false, reason: "ocr-failed" };
  }
  const user = await db
    .selectFrom("user")
    .select(["id", "email"])
    .where("id", "=", receipt.user_id)
    .executeTakeFirst();
  if (!user) return { ok: false, reason: "ocr-failed" };

  const imagePath = join(UPLOAD_DIR, receipt.image_path);
  let parsed;
  try {
    const stores = await db
      .selectFrom("store")
      .leftJoin("chain", "chain.id", "store.chain_id")
      .select((eb) => [
        eb.ref("chain.name").as("chain_name"),
        "store.address",
        "store.city",
        "store.zip",
      ])
      .where("store.address", "is not", null)
      .execute();
    parsed = await ocrReceipt(
      imagePath,
      stores
        .filter((s): s is typeof s & { chain_name: string } => s.chain_name != null)
        .map((s) => ({ chainName: s.chain_name, address: s.address, city: s.city, zip: s.zip })),
    );
  } catch (error) {
    console.error(`[receipt-worker] OCR failed for ${receiptId}:`, error);
    return { ok: false, reason: "ocr-failed" };
  }

  const recoverable = parsed.items.filter((i) => i.price != null);
  const fingerprint = receiptFingerprint({
    userId: user.id,
    storeName: parsed.store.value,
    receiptDate: parsed.date.value,
    total: parsed.total.value,
    itemCount: parsed.items.length,
  });

  const existing = await findMatchingReceipt(user.id, fingerprint);
  const decision: DedupDecision = existing
    ? decideDedup({
        existingCleanCount: existing.cleanCount,
        incomingCleanCount: recoverable.length,
        existingItemCount: existing.itemCount,
        incomingItemCount: parsed.items.length,
      })
    : "new";

  if (decision === "duplicate" || decision === "keep") {
    await deleteReceiptRows(receiptId);
    return {
      ok: true,
      dedup: decision,
      message:
        decision === "duplicate"
          ? "Du har allerede uploadet denne kvittering."
          : "Vi beholdt din originale scanning — den nye var ikke tydeligere.",
    };
  }
  if (decision === "replace" && existing) {
    await deleteReceiptRows(existing.receiptId);
  }

  const now = new Date().toISOString();
  const isoDate = parsed.date.value ? danishToIso(parsed.date.value) : null;
  const observedAt = isoDate ? `${isoDate}T00:00:00.000Z` : now;

  const userStats = await db
    .selectFrom("user")
    .select(["current_streak", "last_receipt_date"])
    .where("id", "=", user.id)
    .executeTakeFirst();

  const receiptDate = isoDate ?? now.slice(0, 10);
  const recovery = parsed.items.length ? recoverable.length / parsed.items.length : 0;
  const { streak, streakBonus } = computeStreak(
    userStats?.current_streak ?? 0,
    toIsoDateOnly(userStats?.last_receipt_date ?? null),
    receiptDate,
  );
  const award = computeAward(recovery, streakBonus);

  let pointsEarned = award;
  if (decision === "new") {
    await db
      .updateTable("user")
      .set({
        points: sql`points + ${award}`,
        receipt_count: sql`receipt_count + 1`,
        current_streak: streak,
        last_receipt_date: receiptDate,
        updated_at: now,
      })
      .where("id", "=", user.id)
      .execute();
  } else if (existing) {
    pointsEarned = Math.max(0, award - existing.pointsAwarded);
    if (pointsEarned > 0) {
      await db
        .updateTable("user")
        .set({ points: sql`points + ${pointsEarned}`, updated_at: now })
        .where("id", "=", user.id)
        .execute();
    }
    await db
      .updateTable("user")
      .set({ current_streak: streak, last_receipt_date: receiptDate, updated_at: now })
      .where("id", "=", user.id)
      .execute();
  }

  await db
    .updateTable("receipt")
    .set({
      store_id: null,
      chain_id: null,
      store_name: parsed.store.value,
      receipt_date: isoDate,
      total: parsed.total.value == null ? null : String(parsed.total.value),
      confidence: null,
      points_awarded: award,
      status: "processed",
      error: null,
      updated_at: now,
    })
    .where("id", "=", receiptId)
    .execute();

  // GDPR: the image is deleted after a successful parse.
  await rm(imagePath, { force: true }).catch(() => {});

  const products = await db.selectFrom("product").select(["id", "name"]).execute();

  for (const item of parsed.items) {
    const productId = item.name ? matchProductName(products, item.name) : null;
    await db
      .insertInto("receipt_item")
      .values({
        id: randomUUID(),
        receipt_id: receiptId,
        product_id: productId,
        name: item.name ?? item.raw,
        quantity: null,
        unit: null,
        price: item.price == null ? null : String(item.price),
        raw_line: item.raw,
        status: item.status,
        confidence: item.status === "clean" ? "high" : item.status === "wrapped" ? "medium" : "low",
        created_at: now,
      })
      .execute();
  }

  for (const item of recoverable) {
    if (!item.name || item.price == null) continue;
    const productId = matchProductName(products, item.name);
    if (!productId) continue;
    await db
      .insertInto("price_point")
      .values({
        id: randomUUID(),
        offer_id: null,
        product_id: productId,
        store_id: null,
        receipt_id: receiptId,
        price: String(item.price),
        currency: "DKK",
        observed_at: observedAt,
        source: "receipt",
      })
      .execute();
  }

  const garbledCount = parsed.items.filter((i) => i.status === "garbled").length;
  return {
    ok: true,
    dedup: decision,
    receiptId,
    store: parsed.store.value,
    date: parsed.date.value,
    total: parsed.total.value,
    itemCount: parsed.items.length,
    cleanCount: recoverable.length,
    garbledCount,
    footerCount: parsed.footer_count,
    pointsEarned,
    streak,
    message: `Vi læste ${recoverable.length} var${recoverable.length === 1 ? "" : "er"} fra din kvittering.`,
  };
}

/**
 * Serial receipt worker: claim at most one pending receipt atomically and
 * process it to completion, then pick the next. Scanning ONE at a time keeps
 * OCR from saturating the box. This is the beta-scale worker; scale-up (job
 * queue + N workers) is a clean, isolated change later.
 */
export async function claimAndProcessReceipts(): Promise<number> {
  let processed = 0;
  while (true) {
    const claimed = await db
      .updateTable("receipt")
      .set({ status: "processing", updated_at: new Date().toISOString() })
      .where("id", "=", (qb) =>
        qb
          .selectFrom("receipt")
          .select("id")
          .where("status", "=", "pending")
          .orderBy("created_at", "asc")
          .limit(1),
      )
      .where("status", "=", "pending")
      .returning("id")
      .executeTakeFirst();
    if (!claimed) break;
    try {
      await processPendingReceipt(claimed.id);
      processed++;
    } catch (error) {
      console.error(`[receipt-worker] processing ${claimed.id} failed:`, error);
      await db
        .updateTable("receipt")
        .set({ status: "failed", error: String(error), updated_at: new Date().toISOString() })
        .where("id", "=", claimed.id)
        .execute();
    }
  }
  if (processed > 0) console.log(`[receipt-worker] processed ${processed} receipt(s)`);
  return processed;
}

const STARTED_KEY = "__receiptWorkerStarted";

/**
 * Start the receipt OCR poll. Runs in the SolidStart app runtime (invoked from
 * the server entry), NOT the raw-node scheduler. Idempotent — a process-wide
 * flag prevents double-polling if the entry module is re-evaluated.
 */
export function startReceiptWorker(): void {
  if (process.env.DISABLE_RECEIPT_WORKER === "1") {
    console.log("[receipt-worker] disabled (DISABLE_RECEIPT_WORKER=1)");
    return;
  }
  const g = globalThis as Record<string, unknown>;
  if (g[STARTED_KEY]) return;
  g[STARTED_KEY] = true;
  setInterval(() => {
    void claimAndProcessReceipts().catch((e) => console.error("[receipt-worker] poll failed:", e));
  }, RECEIPT_POLL_MS);
  console.log(`[receipt-worker] started in SolidStart app runtime, poll ${RECEIPT_POLL_MS}ms`);
}
