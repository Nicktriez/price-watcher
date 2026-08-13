import { createHash } from "node:crypto";
import { db } from "../db/client.ts";
import { getCatalogs, getOffers, type TjekOffer } from "./tjek.ts";
import { linkProducts } from "./product-matching.ts";
import { computeUnitPrice } from "./unit-price.ts";

const OFFER_NAMESPACE = "offer";
const PRODUCT_NAMESPACE = "product";
const PRICE_POINT_NAMESPACE = "price_point";

export interface IngestResult {
  inserted: number;
  updated: number;
}

function uuidFromKey(key: string): string {
  const digest = createHash("sha256").update(key).digest();
  digest[6] = (digest[6] & 0x0f) | 0x50;
  digest[8] = (digest[8] & 0x3f) | 0x80;
  const hex = digest.subarray(0, 16).toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function offerUuid(dealerId: string, catalogId: string, tjekOfferId: string): string {
  return uuidFromKey(`${OFFER_NAMESPACE}:${dealerId}:${catalogId}:${tjekOfferId}`);
}

function productUuid(dealerId: string, heading: string): string {
  return uuidFromKey(`${PRODUCT_NAMESPACE}:${dealerId}:${heading}`);
}

function pricePointUuid(offerId: string, price: string, observedAt: string): string {
  return uuidFromKey(`${PRICE_POINT_NAMESPACE}:${offerId}:${price}:${observedAt}`);
}

async function upsertProduct(dealerId: string, name: string): Promise<string> {
  const id = productUuid(dealerId, name);
  await db
    .insertInto("product")
    .values({ id, name, brand: null, ean: null, unit: null, size_grams: null })
    .onConflict((oc) => oc.column("id").doNothing())
    .execute();
  return id;
}

async function upsertPricePoint(
  offerId: string,
  productId: string,
  offer: TjekOffer,
  observedAt: string,
): Promise<void> {
  const price = String(offer.pricing.price);
  await db
    .insertInto("price_point")
    .values({
      id: pricePointUuid(offerId, price, observedAt),
      offer_id: offerId,
      product_id: productId,
      store_id: null,
      price,
      currency: offer.pricing.currency,
      observed_at: observedAt,
      source: "offer",
    })
    .onConflict((oc) => oc.column("id").doNothing())
    .execute();
}

async function existingOfferIds(dealerId: string, catalogId: string): Promise<Set<string>> {
  const rows = await db
    .selectFrom("offer")
    .select("id")
    .where("dealer_id", "=", dealerId)
    .where("catalog_id", "=", catalogId)
    .execute();
  return new Set(rows.map((r) => r.id));
}

export async function ingestChain(dealerId: string): Promise<IngestResult> {
  const catalogs = await getCatalogs(dealerId);
  const offerCatalogs = catalogs.filter((c) => c.offer_count > 0);

  let inserted = 0;
  let updated = 0;

  for (const catalog of offerCatalogs) {
    const offers = await getOffers(catalog.id);
    const existing = await existingOfferIds(dealerId, catalog.id);

    for (const offer of offers) {
      const productId = await upsertProduct(dealerId, offer.heading);
      const id = offerUuid(dealerId, catalog.id, offer.id);
      const now = new Date().toISOString();
      const unitPrice = computeUnitPrice(offer);

      const row = {
        product_id: productId,
        store_id: null,
        catalog_id: catalog.id,
        dealer_id: dealerId,
        heading: offer.heading,
        description: offer.description,
        catalog_page: offer.catalog_page,
        price: String(offer.pricing.price),
        pre_price: offer.pricing.pre_price === null ? null : String(offer.pricing.pre_price),
        currency: offer.pricing.currency,
        unit: offer.quantity.unit.symbol,
        size_from: offer.quantity.size.from,
        size_to: offer.quantity.size.to,
        pieces_from: offer.quantity.pieces.from,
        pieces_max: offer.quantity.pieces.max,
        image_url: offer.images.view,
        unit_price: unitPrice?.unit_price ?? null,
        unit_price_unit: unitPrice?.unit_price_unit ?? null,
        valid_from: offer.run_from,
        valid_to: offer.run_till,
        published_at: offer.publish,
        source: "tjek" as const,
        trust_tier: "official" as const,
        internal: true,
        raw_json: JSON.stringify(offer),
        updated_at: now,
      };

      if (existing.has(id)) {
        await db.updateTable("offer").set(row).where("id", "=", id).execute();
        updated++;
      } else {
        await db
          .insertInto("offer")
          .values({ id, created_at: now, ...row })
          .execute();
        inserted++;
      }

      await upsertPricePoint(id, productId, offer, now);
    }
  }

  return { inserted, updated };
}

export async function ingestRema(): Promise<IngestResult> {
  return ingestChain("11deC");
}

export interface ChainIngestResult {
  chainId: string;
  dealerId: string;
  ok: boolean;
  inserted?: number;
  updated?: number;
  error?: unknown;
}

export async function ingestAllChainsFrom(
  chains: { id: string; tjek_dealer_id: string }[],
  ingest: (dealerId: string) => Promise<IngestResult>,
): Promise<ChainIngestResult[]> {
  const results: ChainIngestResult[] = [];
  for (const chain of chains) {
    try {
      const { inserted, updated } = await ingest(chain.tjek_dealer_id);
      results.push({
        chainId: chain.id,
        dealerId: chain.tjek_dealer_id,
        ok: true,
        inserted,
        updated,
      });
      console.log(`[ingest:${chain.id}] inserted=${inserted} updated=${updated}`);
    } catch (error) {
      console.error(`[ingest:${chain.id}] failed:`, error);
      results.push({ chainId: chain.id, dealerId: chain.tjek_dealer_id, ok: false, error });
    }
  }
  return results;
}

export async function ingestAllChains(): Promise<ChainIngestResult[]> {
  const chains = await db
    .selectFrom("chain")
    .select(["id", "tjek_dealer_id"])
    .orderBy("priority", "asc")
    .orderBy("id", "asc")
    .execute();
  const results = await ingestAllChainsFrom(chains, ingestChain);
  await matchProducts();
  return results;
}

export async function matchProducts(): Promise<number> {
  const offers = await db
    .selectFrom("offer")
    .select(["id", "product_id", "dealer_id", "heading"])
    .execute();

  const decisions = linkProducts(offers);
  const now = new Date().toISOString();

  for (const decision of decisions) {
    await db.transaction().execute(async (trx) => {
      await trx
        .updateTable("offer")
        .set({ product_id: decision.toProductId, updated_at: now })
        .where("id", "=", decision.offerId)
        .execute();
      await trx
        .updateTable("price_point")
        .set({ product_id: decision.toProductId })
        .where("offer_id", "=", decision.offerId)
        .execute();
    });
  }

  if (decisions.length > 0) {
    console.log(`[match] linked ${decisions.length} offers across chains`);
  }
  return decisions.length;
}
