"use server";

import { db } from "~/db/client";
import {
  ageLabel,
  computeCrowdTier,
  computeFreeTextGroups,
  isStaleSingle,
  type TierReport,
} from "~/lib/trust-tier";
import { applyAutoExpiry } from "./moderation.ts";

function iso(v: string | Date): string {
  return v instanceof Date ? v.toISOString() : v;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUuid(v: string): boolean {
  return UUID_RE.test(v);
}

export async function getChains() {
  return db.selectFrom("chain").select(["id", "name"]).orderBy("name").execute();
}

function baseOfferQuery(chainId: string | null, queryText = "") {
  let query = db
    .selectFrom("offer")
    .innerJoin("product", "product.id", "offer.product_id")
    .leftJoin("chain", "chain.tjek_dealer_id", "offer.dealer_id")
    .where("offer.valid_to", ">=", new Date().toISOString());
  if (chainId) {
    query = query.where("chain.id", "=", chainId);
  }
  const q = queryText.trim();
  if (q) {
    query = query.where("product.name", "ilike", `%${q}%`);
  }
  return query;
}

export async function getCurrentOffersPage(
  chainId: string | null,
  page: number,
  pageSize = 100,
  queryText = "",
) {
  const offset = (page - 1) * pageSize;

  const rows = await baseOfferQuery(chainId, queryText)
    .select((eb) => [
      "offer.id",
      "offer.product_id",
      "offer.heading",
      "offer.price",
      "offer.pre_price",
      "offer.currency",
      "offer.image_url",
      "offer.valid_from",
      "offer.valid_to",
      eb.ref("product.name").as("product_name"),
      eb.ref("chain.id").as("chain_id"),
      eb.ref("chain.name").as("chain_name"),
    ])
    .orderBy("offer.valid_to", "asc")
    .orderBy("offer.id", "asc")
    .limit(pageSize)
    .offset(offset)
    .execute();

  const { n } = await baseOfferQuery(chainId, queryText)
    .select(db.fn.countAll<string>().as("n"))
    .executeTakeFirstOrThrow();

  return {
    offers: rows.map((r) => ({
      ...r,
      valid_from: iso(r.valid_from as string | Date),
      valid_to: iso(r.valid_to as string | Date),
    })),
    total: Number(n),
  };
}

export async function getProductById(productId: string) {
  if (!isUuid(productId)) return null;

  const product = await db
    .selectFrom("product")
    .select(["id", "name", "brand", "ean", "unit", "size_grams"])
    .where("id", "=", productId)
    .executeTakeFirst();

  if (!product) return null;

  const offers = await db
    .selectFrom("offer")
    .leftJoin("chain", "chain.tjek_dealer_id", "offer.dealer_id")
    .select((eb) => [
      "offer.id",
      "offer.heading",
      "offer.price",
      "offer.pre_price",
      "offer.currency",
      "offer.image_url",
      "offer.valid_from",
      "offer.valid_to",
      eb.ref("chain.name").as("chain_name"),
    ])
    .where("offer.product_id", "=", productId)
    .where("offer.valid_to", ">=", new Date().toISOString())
    .orderBy("offer.valid_to", "asc")
    .execute();

  const baselines = await db
    .selectFrom("price_point")
    .innerJoin("receipt", "receipt.id", "price_point.receipt_id")
    .select([
      "receipt.store_name",
      "receipt.trust_tier",
      "price_point.price",
      "price_point.observed_at",
    ])
    .where("price_point.product_id", "=", productId)
    .where("price_point.source", "=", "receipt")
    .orderBy("price_point.observed_at", "desc")
    .execute();

  return {
    ...product,
    offers: offers.map((o) => ({
      ...o,
      valid_from: iso(o.valid_from as string | Date),
      valid_to: iso(o.valid_to as string | Date),
    })),
    baselines: baselines.map((b) => ({
      storeName: b.store_name,
      trustTier: b.trust_tier,
      price: b.price,
      observedAt: iso(b.observed_at as string | Date),
    })),
  };
}

export interface CrowdPriceGroup {
  storeId: string;
  storeName: string;
  reportId: string;
  tier: "community" | "single";
  price: number;
  userCount: number;
  reportedAt: string;
  age: string;
  stale: boolean;
}

/**
 * Crowd shelf-price reports for a product, grouped by store and tiered with
 * the GasBuddy model (>=3 distinct reporters within tolerance = Community).
 * Free-text reports (no product_id) group by normalized name and surface on
 * product pages once moderation (Task 032) links them.
 */
export async function getProductCrowdPrices(productId: string): Promise<CrowdPriceGroup[]> {
  if (!isUuid(productId)) return [];
  await applyAutoExpiry();

  const rows = await db
    .selectFrom("crowd_report")
    .innerJoin("store", "store.id", "crowd_report.store_id")
    .innerJoin("user", "user.id", "crowd_report.user_id")
    .select((eb) => [
      eb.ref("crowd_report.id").as("report_id"),
      eb.ref("crowd_report.store_id").as("store_id"),
      eb.ref("store.name").as("store_name"),
      eb.ref("crowd_report.user_id").as("user_id"),
      eb.ref("crowd_report.price").as("price"),
      eb.ref("crowd_report.reported_at").as("reported_at"),
    ])
    .where("crowd_report.product_id", "=", productId)
    .where("crowd_report.status", "=", "active")
    .where("user.muted", "=", false)
    .execute();

  const byStore = new Map<
    string,
    { storeName: string; reports: TierReport[]; latest: Date; latestId: string }
  >();
  for (const row of rows) {
    const entry = byStore.get(row.store_id) ?? {
      storeName: row.store_name,
      reports: [],
      latest: new Date(0),
      latestId: row.report_id,
    };
    entry.reports.push({
      userId: row.user_id,
      price: parseFloat(row.price),
      reportedAt: row.reported_at,
    });
    const at = new Date(row.reported_at);
    if (at.getTime() > entry.latest.getTime()) {
      entry.latest = at;
      entry.latestId = row.report_id;
    }
    byStore.set(row.store_id, entry);
  }

  const now = new Date();
  const groups: CrowdPriceGroup[] = [];
  for (const [storeId, entry] of byStore) {
    const tier = computeCrowdTier(entry.reports);
    if (tier.tier == null || tier.representativePrice == null) continue;
    groups.push({
      storeId,
      storeName: entry.storeName,
      reportId: entry.latestId,
      tier: tier.tier,
      price: tier.representativePrice,
      userCount: tier.distinctUsers,
      reportedAt: entry.latest.toISOString(),
      age: ageLabel(entry.latest, now),
      stale: tier.tier === "single" && isStaleSingle(entry.latest, now),
    });
  }

  groups.sort((a, b) => a.storeName.localeCompare(b.storeName, "da"));
  return groups;
}

/**
 * Free-text crowd reports (product_id IS NULL) grouped by store + normalized
 * name, tiered with the same rules as the product-linked path. The normalized
 * name is the seam Task 032 uses to link groups to a product later.
 */
export async function getReportedItems() {
  await applyAutoExpiry();
  const rows = await db
    .selectFrom("crowd_report")
    .innerJoin("store", "store.id", "crowd_report.store_id")
    .innerJoin("user", "user.id", "crowd_report.user_id")
    .select((eb) => [
      eb.ref("crowd_report.id").as("report_id"),
      eb.ref("store.id").as("store_id"),
      eb.ref("store.name").as("store_name"),
      eb.ref("crowd_report.product_name").as("product_name"),
      eb.ref("crowd_report.user_id").as("user_id"),
      eb.ref("crowd_report.price").as("price"),
      eb.ref("crowd_report.reported_at").as("reported_at"),
    ])
    .where("crowd_report.product_id", "is", null)
    .where("crowd_report.product_name", "is not", null)
    .where("crowd_report.status", "=", "active")
    .where("user.muted", "=", false)
    .execute();

  return computeFreeTextGroups(
    rows
      .filter((r): r is typeof r & { product_name: string } => r.product_name != null)
      .map((r) => ({
        storeId: r.store_id,
        storeName: r.store_name,
        productName: r.product_name,
        userId: r.user_id,
        price: parseFloat(r.price),
        reportedAt: r.reported_at,
        reportId: r.report_id,
      })),
  );
}

export interface LeaderboardEntry {
  name: string;
  points: number;
}

/** Top users by combined points (receipt + crowd-report), both feed user.points. */
export async function getLeaderboard(limit = 20): Promise<LeaderboardEntry[]> {
  const rows = await db
    .selectFrom("user")
    .select(["email", "points"])
    .where("points", ">", 0)
    .orderBy("points", "desc")
    .limit(limit)
    .execute();
  return rows.map((r) => ({
    name: r.email ? r.email.split("@")[0] : "Bruger",
    points: parseFloat(String(r.points)),
  }));
}

export async function getPriceHistory(productId: string, days = 30) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const rows = await db
    .selectFrom("price_point")
    .select(["observed_at", "price"])
    .where("product_id", "=", productId)
    .where("observed_at", ">=", since.toISOString())
    .orderBy("observed_at", "asc")
    .execute();
  return rows.map((r) => ({
    observed_at: iso(r.observed_at as string | Date),
    price: r.price,
  }));
}

export async function getStoreById(storeId: string) {
  if (!isUuid(storeId)) return null;

  const store = await db
    .selectFrom("store")
    .innerJoin("chain", "chain.id", "store.chain_id")
    .select((eb) => [
      "store.id",
      "store.name",
      "store.address",
      "store.city",
      "store.zip",
      eb.ref("chain.name").as("chain_name"),
    ])
    .where("store.id", "=", storeId)
    .executeTakeFirst();

  if (!store) return null;

  const offers = await db
    .selectFrom("offer")
    .innerJoin("product", "product.id", "offer.product_id")
    .select((eb) => [
      "offer.id",
      "offer.price",
      "offer.currency",
      "offer.image_url",
      "offer.valid_from",
      "offer.valid_to",
      eb.ref("product.name").as("product_name"),
    ])
    .where("offer.store_id", "=", storeId)
    .where("offer.valid_to", ">=", new Date().toISOString())
    .orderBy("offer.valid_to", "asc")
    .execute();

  return {
    ...store,
    offers: offers.map((o) => ({
      ...o,
      valid_from: iso(o.valid_from as string | Date),
      valid_to: iso(o.valid_to as string | Date),
    })),
  };
}

export interface SpendingReport {
  totalThisMonth: number;
  byStore: { storeName: string; count: number; total: number }[];
  recentReceipts: {
    id: string;
    storeName: string | null;
    receiptDate: string | null;
    total: string | null;
    itemCount: number;
  }[];
}

function dateOnly(v: Date | string | null): string | null {
  if (v == null) return null;
  const d = typeof v === "string" ? new Date(v) : v;
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export async function getSpendingReport(userId: string): Promise<SpendingReport> {
  const now = new Date();
  const monthStartStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const nextMonthStr = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-01`;

  const monthReceipts = await db
    .selectFrom("receipt")
    .select(["store_name", "total"])
    .where("user_id", "=", userId)
    .where("receipt_date", ">=", monthStartStr)
    .where("receipt_date", "<", nextMonthStr)
    .execute();

  let totalThisMonth = 0;
  const storeMap = new Map<string, { storeName: string; count: number; total: number }>();
  for (const r of monthReceipts) {
    const name = r.store_name ?? "Unknown store";
    const value = r.total ? parseFloat(r.total) : 0;
    totalThisMonth += value;
    const entry = storeMap.get(name) ?? { storeName: name, count: 0, total: 0 };
    entry.count += 1;
    entry.total += value;
    storeMap.set(name, entry);
  }
  const byStore = [...storeMap.values()].sort((a, b) => b.total - a.total);

  const recent = await db
    .selectFrom("receipt")
    .leftJoin("receipt_item", "receipt_item.receipt_id", "receipt.id")
    .select([
      "receipt.id",
      "receipt.store_name",
      "receipt.receipt_date",
      "receipt.total",
      db.fn.count("receipt_item.id").as("item_count"),
    ])
    .where("receipt.user_id", "=", userId)
    .groupBy("receipt.id")
    .orderBy("receipt.created_at", "desc")
    .limit(20)
    .execute();

  return {
    totalThisMonth: Math.round(totalThisMonth * 100) / 100,
    byStore,
    recentReceipts: recent.map((r) => ({
      id: r.id,
      storeName: r.store_name,
      receiptDate: dateOnly(r.receipt_date as Date | string | null),
      total: r.total,
      itemCount: Number(r.item_count),
    })),
  };
}

export interface ReceiptLineComparison {
  id: string;
  name: string;
  status: string;
  paid: number | null;
  average: number | null;
  delta: number | null;
}

export interface ReceiptComparison {
  receipt: { storeName: string | null; receiptDate: string | null; total: string | null };
  lines: ReceiptLineComparison[];
  comparableCount: number;
  overallDelta: number | null;
}

export async function getReceiptComparison(
  receiptId: string,
  userId: string,
): Promise<ReceiptComparison | null> {
  if (!isUuid(receiptId)) return null;

  const receipt = await db
    .selectFrom("receipt")
    .select(["store_name", "receipt_date", "total"])
    .where("id", "=", receiptId)
    .where("user_id", "=", userId)
    .executeTakeFirst();
  if (!receipt) return null;

  const items = await db
    .selectFrom("receipt_item")
    .select(["id", "name", "price", "product_id", "status"])
    .where("receipt_id", "=", receiptId)
    .orderBy("created_at", "asc")
    .execute();

  const productIds = [
    ...new Set(
      items
        .filter((i) => i.product_id != null && i.price != null)
        .map((i) => i.product_id! as string),
    ),
  ];

  const averageByProduct = new Map<string, { avg: number; count: number }>();
  if (productIds.length > 0) {
    const rows = await db
      .selectFrom("price_point")
      .innerJoin("receipt", "receipt.id", "price_point.receipt_id")
      .select(["price_point.product_id", "price_point.price"])
      .where("price_point.source", "=", "receipt")
      .where("price_point.product_id", "in", productIds)
      .where("receipt.user_id", "!=", userId)
      .execute();
    const sums = new Map<string, { total: number; count: number }>();
    for (const r of rows) {
      const v = r.price == null ? 0 : parseFloat(r.price);
      const entry = sums.get(r.product_id) ?? { total: 0, count: 0 };
      entry.total += v;
      entry.count += 1;
      sums.set(r.product_id, entry);
    }
    for (const [pid, e] of sums) {
      averageByProduct.set(pid, { avg: e.total / e.count, count: e.count });
    }
  }

  const lines: ReceiptLineComparison[] = items.map((item) => {
    const paid = item.price == null ? null : parseFloat(item.price);
    const avgEntry = item.product_id ? averageByProduct.get(item.product_id as string) : undefined;
    const average = avgEntry?.avg ?? null;
    return {
      id: item.id,
      name: item.name,
      status: item.status,
      paid,
      average,
      delta: paid != null && average != null ? Math.round((paid - average) * 100) / 100 : null,
    };
  });

  const comparable = lines.filter((l) => l.delta != null);
  const overallDelta = comparable.length
    ? Math.round(comparable.reduce((s, l) => s + (l.delta ?? 0), 0) * 100) / 100
    : null;

  return {
    receipt: {
      storeName: receipt.store_name,
      receiptDate: dateOnly(receipt.receipt_date as Date | string | null),
      total: receipt.total,
    },
    lines,
    comparableCount: comparable.length,
    overallDelta,
  };
}
