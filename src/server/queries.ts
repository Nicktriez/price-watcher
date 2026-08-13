"use server";

import { db } from "~/db/client";

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

function baseOfferQuery(chainId: string | null) {
  let query = db
    .selectFrom("offer")
    .innerJoin("product", "product.id", "offer.product_id")
    .leftJoin("chain", "chain.tjek_dealer_id", "offer.dealer_id")
    .where("offer.valid_to", ">=", new Date().toISOString());
  if (chainId) {
    query = query.where("chain.id", "=", chainId);
  }
  return query;
}

export async function getCurrentOffersPage(chainId: string | null, page: number, pageSize = 100) {
  const offset = (page - 1) * pageSize;

  const rows = await baseOfferQuery(chainId)
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

  const { n } = await baseOfferQuery(chainId)
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
