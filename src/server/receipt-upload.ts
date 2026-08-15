"use server";

import { randomUUID } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { sql } from "kysely";
import { db } from "~/db/client";
import { decideDedup, receiptFingerprint, type DedupDecision } from "~/lib/receipt-dedup";
import { ocrReceipt } from "~/lib/receipt-ocr";
import { matchProductName } from "~/lib/product-matching";
import { computeAward, computeStreak } from "~/lib/receipt-points";
import { getCurrentUser } from "./auth.ts";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

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
  await db.deleteFrom("price_point").where("receipt_id", "=", receiptId).execute();
  await db.deleteFrom("receipt_item").where("receipt_id", "=", receiptId).execute();
  await db.deleteFrom("receipt").where("id", "=", receiptId).execute();
}

export async function uploadReceipt(file: File): Promise<UploadResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, reason: "sign-in-required" };

  if (!["image/jpeg", "image/png"].includes(file.type) || file.size > MAX_IMAGE_BYTES) {
    return { ok: false, reason: "invalid-image" };
  }

  const tmp = await mkdtemp(join(tmpdir(), "receipt-upload-"));
  const imagePath = join(tmp, "receipt.jpg");
  let parsed;
  try {
    await writeFile(imagePath, Buffer.from(await file.arrayBuffer()));
    // Known stores (chain + address/city/zip) let OCR fall back to an
    // address match when the chain name is logo-only (Task 038p).
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
        .map((s) => ({
          chainName: s.chain_name,
          address: s.address,
          city: s.city,
          zip: s.zip,
        })),
    );
  } catch (error) {
    console.error("[upload] OCR failed:", error);
    return { ok: false, reason: "ocr-failed" };
  } finally {
    await rm(tmp, { recursive: true, force: true });
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

  if (decision === "duplicate") {
    return { ok: true, dedup: "duplicate", message: "You already uploaded this receipt." };
  }
  if (decision === "keep") {
    return {
      ok: true,
      dedup: "keep",
      message: "We kept your original scan — the new one wasn't cleaner.",
    };
  }
  if (decision === "replace" && existing) {
    await deleteReceiptRows(existing.receiptId);
  }

  const receiptId = randomUUID();
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
    .insertInto("receipt")
    .values({
      id: receiptId,
      user_id: user.id,
      store_id: null,
      chain_id: null,
      store_name: parsed.store.value,
      receipt_date: isoDate,
      total: parsed.total.value == null ? null : String(parsed.total.value),
      currency: "DKK",
      confidence: null,
      image_path: null,
      source: "receipt",
      trust_tier: "community",
      points_awarded: award,
      created_at: now,
      updated_at: now,
    })
    .execute();

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
    message: `We parsed ${recoverable.length} item${recoverable.length === 1 ? "" : "s"} from your receipt.`,
  };
}
