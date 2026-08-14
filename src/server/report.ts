"use server";

import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { db } from "~/db/client";
import { validateCrowdReport } from "~/lib/crowd-report";
import { normalizeProductName } from "~/lib/trust-tier";
import { getCurrentUser } from "./auth.ts";
import { awardCrowdGroup } from "./crowd-awards.ts";

const MAX_PHOTO_BYTES = 10 * 1024 * 1024;
const PHOTO_DIR = join(process.cwd(), "public", "uploads", "crowd");

const PHOTO_EXT: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

export interface StoreSearchResult {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  zip: string | null;
}

export async function searchStores(queryInput: string): Promise<StoreSearchResult[]> {
  const query = queryInput.trim();
  if (!query) return [];
  const rows = await db
    .selectFrom("store")
    .select(["id", "name", "address", "city", "zip"])
    .where((eb) => eb.or([eb("name", "ilike", `%${query}%`), eb("city", "ilike", `%${query}%`)]))
    .orderBy("name", "asc")
    .limit(8)
    .execute();
  return rows;
}

export type CrowdReportResult =
  | { ok: true; reportId: string; earned: number; message: string }
  | {
      ok: false;
      reason: "sign-in-required" | "invalid-store" | "invalid" | "invalid-photo";
      message: string;
    };

export async function submitCrowdReport(formData: FormData): Promise<CrowdReportResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, reason: "sign-in-required", message: "Sign in required." };

  const str = (v: FormDataEntryValue | null) => (typeof v === "string" ? v : "");
  const storeId = str(formData.get("storeId"));
  const productId = str(formData.get("productId")) || null;
  const productName = str(formData.get("productName")) || null;
  const price = Number(formData.get("price"));
  const photo = formData.get("photo");

  const validation = validateCrowdReport({ storeId, productId, productName, price });
  if (!validation.ok) {
    return { ok: false, reason: "invalid", message: validation.errors.join(" ") };
  }
  const { report } = validation;

  const store = await db
    .selectFrom("store")
    .select("id")
    .where("id", "=", report.storeId)
    .executeTakeFirst();
  if (!store) return { ok: false, reason: "invalid-store", message: "Unknown store." };

  let photoPath: string | null = null;
  if (photo instanceof File) {
    const ext = PHOTO_EXT[photo.type];
    if (!ext || photo.size > MAX_PHOTO_BYTES) {
      return {
        ok: false,
        reason: "invalid-photo",
        message: "Photo must be JPEG, PNG or WebP under 10 MB.",
      };
    }
    const fileName = `${randomUUID()}${ext}`;
    await mkdir(PHOTO_DIR, { recursive: true });
    await writeFile(join(PHOTO_DIR, fileName), Buffer.from(await photo.arrayBuffer()));
    photoPath = `/uploads/crowd/${fileName}`;
  }

  const id = randomUUID();
  const now = new Date().toISOString();

  // Anti-gaming (Task 031 parity): one report per (user, store, product|name).
  // A repeat report updates the existing row (e.g. price correction) instead
  // of farming a second row — the tier logic counts distinct users anyway.
  let existingQuery = db
    .selectFrom("crowd_report")
    .select(["id", "product_name"])
    .where("user_id", "=", user.id)
    .where("store_id", "=", report.storeId);
  existingQuery = report.productId
    ? existingQuery.where("product_id", "=", report.productId)
    : existingQuery.where("product_id", "is", null);
  const candidates = await existingQuery.execute();
  const existing =
    report.productId != null
      ? candidates[0]
      : (candidates.find(
          (c) =>
            c.product_name != null &&
            report.productName != null &&
            normalizeProductName(c.product_name) === normalizeProductName(report.productName),
        ) ?? null);

  let reportId: string;
  if (existing) {
    reportId = existing.id;
    await db
      .updateTable("crowd_report")
      .set({ price: String(report.price), reported_at: now, photo_path: photoPath })
      .where("id", "=", existing.id)
      .execute();
  } else {
    reportId = id;
    await db
      .insertInto("crowd_report")
      .values({
        id,
        user_id: user.id,
        store_id: report.storeId,
        product_id: report.productId,
        product_name: report.productName,
        price: String(report.price),
        currency: "DKK",
        photo_path: photoPath,
        reported_at: now,
        created_at: now,
        points_awarded: "0",
        last_awarded_tier: null,
        status: "active",
      })
      .execute();
  }

  // Re-tier the affected group now (a 2nd/3rd agreeing report may have just
  // flipped it to Community) and award the upgrade-only delta.
  const deltas = await awardCrowdGroup(report.storeId, report.productId, report.productName);
  const earned = deltas[reportId] ?? 0;

  return {
    ok: true,
    reportId,
    earned,
    message:
      earned > 0
        ? `Tak! Din pris hjalp gruppen til Community — du fik ${earned} point.`
        : "Tak! Din pris er registreret som brugerrapporteret — den vises ikke som et tilbud eller en rabat.",
  };
}
