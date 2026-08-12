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

export async function getCurrentOffers(chainId?: string | null) {
  let query = db
    .selectFrom("offer")
    .innerJoin("product", "product.id", "offer.product_id")
    .leftJoin("chain", "chain.tjek_dealer_id", "offer.dealer_id")
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
    .where("offer.valid_to", ">=", new Date().toISOString())
    .orderBy("offer.valid_to", "asc");

  if (chainId) {
    query = query.where("chain.id", "=", chainId);
  }

  const rows = await query.execute();
  return rows.map((r) => ({
    ...r,
    valid_from: iso(r.valid_from as string | Date),
    valid_to: iso(r.valid_to as string | Date),
  }));
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

  return {
    ...product,
    offers: offers.map((o) => ({
      ...o,
      valid_from: iso(o.valid_from as string | Date),
      valid_to: iso(o.valid_to as string | Date),
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
