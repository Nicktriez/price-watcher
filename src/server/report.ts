"use server";

import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { db } from "~/db/client";
import { validateCrowdReport } from "~/lib/crowd-report";
import { getCurrentUser } from "./auth.ts";

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
  | { ok: true; reportId: string; message: string }
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
    })
    .execute();

  return {
    ok: true,
    reportId: id,
    message:
      "Tak! Din pris er registreret som brugerrapporteret — den vises ikke som et tilbud eller en rabat.",
  };
}
