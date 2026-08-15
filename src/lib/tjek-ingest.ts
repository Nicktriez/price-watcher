import { db } from "../db/client.ts";
import { getCatalogs, getOffers, type TjekOffer } from "./tjek.ts";
import { splitOfferHeading } from "./offer-split.ts";
import { linkProducts } from "./product-matching.ts";
import { computeUnitPrice } from "./unit-price.ts";
import { uuidFromKey } from "./uuid.ts";
import { syncStoresFromTjek } from "../server/store-sync.ts";

const OFFER_NAMESPACE = "offer";
const PRODUCT_NAMESPACE = "product";
const PRICE_POINT_NAMESPACE = "price_point";

export interface IngestResult {
  inserted: number;
  updated: number;
}

function offerUuid(dealerId: string, catalogId: string, tjekOfferId: string, alt = 0): string {
  // alt 0 keeps the legacy id (no index) so re-ingest updates existing rows;
  // split alternatives get a deterministic index suffix.
  return alt === 0
    ? uuidFromKey(`${OFFER_NAMESPACE}:${dealerId}:${catalogId}:${tjekOfferId}`)
    : uuidFromKey(`${OFFER_NAMESPACE}:${dealerId}:${catalogId}:${tjekOfferId}:${alt}`);
}

function productUuid(dealerId: string, name: string): string {
  return uuidFromKey(`${PRODUCT_NAMESPACE}:${dealerId}:${name}`);
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
      // Multi-product headings ("Coca-Cola, Fanta eller Tuborg Squash 24-pak")
      // become one product + offer per alternative, each at the deal price.
      const names = splitOfferHeading(offer.heading);

      for (let i = 0; i < names.length; i++) {
        const name = names[i];
        const productId = await upsertProduct(dealerId, name);
        const id = offerUuid(dealerId, catalog.id, offer.id, i);
        const now = new Date().toISOString();
        const unitPrice = computeUnitPrice(offer);

        const row = {
          product_id: productId,
          store_id: null,
          catalog_id: catalog.id,
          dealer_id: dealerId,
          heading: name,
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
  }

  return { inserted, updated };
}

export async function ingestRema(): Promise<IngestResult> {
  return ingestChain("11deC");
}

/**
 * Re-split already-ingested offers whose headings list multiple products
 * ("Coca-Cola, Fanta eller Tuborg Squash 24-pak") into one product + offer
 * per alternative — a DB-only backfill so the current catalog is fixed
 * without re-fetching from Tjek. Idempotent: re-running only touches offers
 * that still need splitting, and the alternative-0 offer keeps its existing
 * row (id and price_point), so a later network re-ingest won't duplicate.
 * Orphaned whole-heading products are removed only when nothing references
 * them (no offers, no price_points).
 */
export async function backfillSplitOffers(): Promise<{
  split: number;
  created: number;
  cleaned: number;
}> {
  const rows = await db
    .selectFrom("offer")
    .select(["id", "dealer_id", "catalog_id", "product_id", "heading", "raw_json"])
    .where("heading", "ilike", "% eller %")
    .execute();

  let split = 0;
  let created = 0;
  for (const offer of rows) {
    const names = splitOfferHeading(offer.heading);
    if (names.length < 2) continue;

    const tjekOfferId = (offer.raw_json as { id?: string } | null)?.id ?? "";
    const firstProductId = await upsertProduct(offer.dealer_id, names[0]);
    if (offer.product_id !== firstProductId) {
      await db
        .updateTable("offer")
        .set({
          product_id: firstProductId,
          heading: names[0],
          updated_at: new Date().toISOString(),
        })
        .where("id", "=", offer.id)
        .execute();
      await db
        .updateTable("price_point")
        .set({ product_id: firstProductId })
        .where("offer_id", "=", offer.id)
        .execute();
    }
    split++;

    for (let i = 1; i < names.length; i++) {
      const productId = await upsertProduct(offer.dealer_id, names[i]);
      const id = offerUuid(offer.dealer_id, offer.catalog_id, tjekOfferId, i);
      const exists = await db
        .selectFrom("offer")
        .select("id")
        .where("id", "=", id)
        .executeTakeFirst();
      if (exists) continue; // already split on a previous run
      const base = await db
        .selectFrom("offer")
        .select([
          "store_id",
          "description",
          "catalog_page",
          "price",
          "pre_price",
          "currency",
          "unit",
          "size_from",
          "size_to",
          "pieces_from",
          "pieces_max",
          "image_url",
          "unit_price",
          "unit_price_unit",
          "valid_from",
          "valid_to",
          "published_at",
          "source",
          "trust_tier",
          "internal",
          "raw_json",
        ])
        .where("id", "=", offer.id)
        .executeTakeFirstOrThrow();
      const now = new Date().toISOString();
      await db
        .insertInto("offer")
        .values({
          id,
          product_id: productId,
          heading: names[i],
          created_at: now,
          updated_at: now,
          store_id: base.store_id,
          catalog_id: offer.catalog_id,
          dealer_id: offer.dealer_id,
          description: base.description,
          catalog_page: base.catalog_page,
          price: base.price,
          pre_price: base.pre_price,
          currency: base.currency,
          unit: base.unit,
          size_from: base.size_from,
          size_to: base.size_to,
          pieces_from: base.pieces_from,
          pieces_max: base.pieces_max,
          image_url: base.image_url,
          unit_price: base.unit_price,
          unit_price_unit: base.unit_price_unit,
          valid_from: base.valid_from,
          valid_to: base.valid_to,
          published_at: base.published_at,
          source: base.source,
          trust_tier: base.trust_tier,
          internal: base.internal,
          raw_json: JSON.stringify(base.raw_json),
        })
        .execute();
      await db
        .insertInto("price_point")
        .values({
          id: pricePointUuid(id, base.price, now),
          offer_id: id,
          product_id: productId,
          store_id: null,
          price: base.price,
          currency: base.currency,
          observed_at: now,
          source: "offer",
        })
        .onConflict((oc) => oc.column("id").doNothing())
        .execute();
      created++;
    }
  }

  // Clean up orphaned whole-heading products — only when NOTHING references
  // them (no offer, price_point, list item, crowd report, receipt line or
  // template item), so we never break a FK or a user's saved list.
  let cleaned = 0;
  const orphans = await db
    .selectFrom("product")
    .leftJoin("offer", "offer.product_id", "product.id")
    .leftJoin("price_point", "price_point.product_id", "product.id")
    .leftJoin("list_item", "list_item.product_id", "product.id")
    .leftJoin("crowd_report", "crowd_report.product_id", "product.id")
    .leftJoin("receipt_item", "receipt_item.product_id", "product.id")
    .leftJoin("list_template_item", "list_template_item.product_id", "product.id")
    .select(["product.id"])
    .where("product.name", "ilike", "% eller %")
    .where("offer.id", "is", null)
    .where("price_point.id", "is", null)
    .where("list_item.id", "is", null)
    .where("crowd_report.id", "is", null)
    .where("receipt_item.id", "is", null)
    .where("list_template_item.id", "is", null)
    .execute();
  for (const orphan of orphans) {
    await db.deleteFrom("product").where("id", "=", orphan.id).execute();
    cleaned++;
  }

  if (split > 0)
    console.log(
      `[backfill-split] split ${split} offers, created ${created} alternatives, cleaned ${cleaned} orphan products`,
    );
  return { split, created, cleaned };
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
  await syncStoresFromTjek();
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
