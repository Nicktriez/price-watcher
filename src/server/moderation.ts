"use server";

import { randomUUID } from "node:crypto";
import { db } from "~/db/client";
import {
  ageLabel,
  computeCrowdTier,
  normalizeProductName,
  type TierReport,
} from "~/lib/trust-tier";
import {
  distinctFlaggers,
  isFlagHidden,
  isExpiredSingle,
  shouldAutoMute,
  type FlagReason,
} from "~/lib/moderation";
import { getCurrentUser } from "./auth.ts";

/**
 * Admin gate — DECIDED (Task 032): no roles system. A concrete email
 * allowlist, checked server-side on every moderation action. Nick is solo.
 */
const ADMIN_EMAILS = ["jensen0710@gmail.com"];

export async function isAdminUser(): Promise<boolean> {
  const user = await getCurrentUser();
  return user != null && ADMIN_EMAILS.includes(user.email);
}

export type FlagCrowdResult = { ok: true; hidden: boolean } | { ok: false; message: string };

export async function flagCrowdReport(
  crowdReportId: string,
  reason: FlagReason,
): Promise<FlagCrowdResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: "Sign in to report a price." };

  const report = await db
    .selectFrom("crowd_report")
    .select(["user_id", "status"])
    .where("id", "=", crowdReportId)
    .executeTakeFirst();
  if (!report) return { ok: false, message: "Report not found." };
  if (report.user_id === user.id) {
    return { ok: false, message: "You can't flag your own report." };
  }

  const existing = await db
    .selectFrom("crowd_report_flag")
    .select("id")
    .where("crowd_report_id", "=", crowdReportId)
    .where("flagger_user_id", "=", user.id)
    .executeTakeFirst();
  if (!existing) {
    await db
      .insertInto("crowd_report_flag")
      .values({
        id: randomUUID(),
        crowd_report_id: crowdReportId,
        flagger_user_id: user.id,
        reason,
        created_at: new Date().toISOString(),
      })
      .execute();
  }

  const flags = await db
    .selectFrom("crowd_report_flag")
    .select("flagger_user_id")
    .where("crowd_report_id", "=", crowdReportId)
    .execute();
  if (isFlagHidden(flags.map((f) => ({ flaggerUserId: f.flagger_user_id })))) {
    await db
      .updateTable("crowd_report")
      .set({ status: "hidden" })
      .where("id", "=", crowdReportId)
      .execute();

    const { n } = await db
      .selectFrom("crowd_report")
      .select(db.fn.countAll<string>().as("n"))
      .where("user_id", "=", report.user_id)
      .where("status", "=", "hidden")
      .executeTakeFirstOrThrow();
    if (shouldAutoMute(Number(n))) {
      await db.updateTable("user").set({ muted: true }).where("id", "=", report.user_id).execute();
    }
    return { ok: true, hidden: true };
  }
  return { ok: true, hidden: false };
}

/** Hide Single, unverified reports older than the expiry window (history kept). */
export async function applyAutoExpiry(): Promise<void> {
  const now = new Date();
  const rows = await db
    .selectFrom("crowd_report")
    .innerJoin("user", "user.id", "crowd_report.user_id")
    .select([
      "crowd_report.id",
      "crowd_report.store_id",
      "crowd_report.product_id",
      "crowd_report.product_name",
      "crowd_report.user_id",
      "crowd_report.price",
      "crowd_report.reported_at",
    ])
    .where("crowd_report.status", "=", "active")
    .where("user.muted", "=", false)
    .execute();

  const groups = new Map<string, TierReport[]>();
  for (const r of rows) {
    const key = r.product_id
      ? `${r.store_id}|p:${r.product_id}`
      : `${r.store_id}|n:${r.product_name ? normalizeProductName(r.product_name) : ""}`;
    const group = groups.get(key) ?? [];
    group.push({ userId: r.user_id, price: parseFloat(r.price), reportedAt: r.reported_at });
    groups.set(key, group);
  }
  const tierByKey = new Map<string, "single" | "community" | null>();
  for (const [key, reports] of groups) tierByKey.set(key, computeCrowdTier(reports).tier);

  for (const r of rows) {
    const key = r.product_id
      ? `${r.store_id}|p:${r.product_id}`
      : `${r.store_id}|n:${r.product_name ? normalizeProductName(r.product_name) : ""}`;
    const tier = tierByKey.get(key) ?? null;
    if (isExpiredSingle(r.reported_at, tier, now)) {
      await db
        .updateTable("crowd_report")
        .set({ status: "hidden" })
        .where("id", "=", r.id)
        .execute();
    }
  }
}

export interface ModerationFlagSummary {
  reason: string;
  count: number;
}

export interface ModerationItem {
  id: string;
  reporterId: string;
  reporterEmail: string;
  reporterMuted: boolean;
  storeName: string;
  productName: string | null;
  price: number;
  reportedAt: string;
  age: string;
  status: "active" | "hidden";
  flagCount: number;
  flaggers: ModerationFlagSummary[];
  expired: boolean;
  tier: "single" | "community" | null;
}

export async function getModerationQueue(): Promise<ModerationItem[] | null> {
  if (!(await isAdminUser())) return null;
  await applyAutoExpiry();

  const rows = await db
    .selectFrom("crowd_report")
    .innerJoin("user", "user.id", "crowd_report.user_id")
    .innerJoin("store", "store.id", "crowd_report.store_id")
    .leftJoin("product", "product.id", "crowd_report.product_id")
    .select((eb) => [
      "crowd_report.id",
      "crowd_report.status",
      "crowd_report.price",
      "crowd_report.reported_at",
      eb.ref("user.id").as("reporter_id"),
      eb.ref("user.email").as("reporter_email"),
      eb.ref("user.muted").as("reporter_muted"),
      eb.ref("store.name").as("store_name"),
      eb.ref("product.name").as("product_name"),
      eb.ref("crowd_report.product_name").as("free_text_name"),
    ])
    .orderBy("crowd_report.reported_at", "desc")
    .execute();

  const flagRows = await db
    .selectFrom("crowd_report_flag")
    .select(["crowd_report_id", "flagger_user_id", "reason"])
    .execute();

  const flagsByReport = new Map<string, { flaggerUserId: string; reason: string }[]>();
  for (const f of flagRows) {
    const list = flagsByReport.get(f.crowd_report_id) ?? [];
    list.push({ flaggerUserId: f.flagger_user_id, reason: f.reason });
    flagsByReport.set(f.crowd_report_id, list);
  }

  const items: ModerationItem[] = [];
  for (const r of rows) {
    const flags = flagsByReport.get(r.id) ?? [];
    const flagCount = distinctFlaggers(flags);
    const reasonCounts = new Map<string, number>();
    for (const f of flags) reasonCounts.set(f.reason, (reasonCounts.get(f.reason) ?? 0) + 1);
    const age = ageLabel(r.reported_at);
    const expired = !isFlagHidden(flags) && isExpiredSingle(r.reported_at, "single", new Date());
    if (r.status !== "active" || flagCount > 0 || expired) {
      items.push({
        id: r.id,
        reporterId: r.reporter_id,
        reporterEmail: r.reporter_email,
        reporterMuted: r.reporter_muted,
        storeName: r.store_name,
        productName: r.product_name ?? r.free_text_name,
        price: parseFloat(r.price),
        reportedAt: r.reported_at,
        age,
        status: r.status,
        flagCount,
        flaggers: [...reasonCounts.entries()].map(([reason, count]) => ({ reason, count })),
        expired,
        tier: null,
      });
    }
  }
  return items;
}

export async function moderateCrowdReport(
  reportId: string,
  action: "hide" | "restore",
): Promise<{ ok: boolean }> {
  if (!(await isAdminUser())) return { ok: false };
  await db
    .updateTable("crowd_report")
    .set({ status: action === "hide" ? "hidden" : "active" })
    .where("id", "=", reportId)
    .execute();
  return { ok: true };
}

export async function setUserMuted(userId: string, muted: boolean): Promise<{ ok: boolean }> {
  if (!(await isAdminUser())) return { ok: false };
  await db.updateTable("user").set({ muted }).where("id", "=", userId).execute();
  return { ok: true };
}
