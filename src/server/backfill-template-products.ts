import { pathToFileURL } from "node:url";
import { db } from "../db/client.ts";
import { TEMPLATES } from "../db/template-seed.ts";
import { resolveTemplateProduct, type TemplateProductCandidate } from "../lib/template-products.ts";

/**
 * Backfill `list_template_item.product_id` for the fixed template set
 * (Tasks 038w + 038y). Templates were seeded with raw names (free_text only),
 * so every template list was unpriceable. This resolves each item's free_text
 * anchor to a real product via the bounded resolver (`template-products.ts`)
 * and stores the link.
 *
 * The free_text is the source of truth for "what the user meant"; product_id
 * is only the current resolution. 038y: the backfill PRESERVES free_text — it
 * never nulls it, and it restores the original term for any item whose anchor
 * was previously destroyed (from the seed `template-seed.ts` or, as a last
 * resort, derived from the current product name). This keeps links
 * re-anchorable: a future resolver/offer change can re-resolve every template.
 *
 * Idempotent: resolution is deterministic, so re-running re-resolves every
 * item to the same product (and applies the curated overrides).
 */

// Keyed by lowercased item anchor (the original free_text term). `null` forces
// the item to stay free_text (no honest link); a string is an exact product
// name to pin. Curated from the report — bounded to this fixed item set.
const OVERRIDES: Record<string, string | null> = {
  // Wrong automatic links (resolver picked a dish/odd product for a basic item)
  tomat: "Datterini tomater",
  æg: "Dava skrabeæg",
  hvidløg: "AARSTIDERNE ØKOLOGISKE HVIDLØG",
  "ost til burger": "MAMMEN Ost i skiver",
  "hakket svinekød": "Dansk hakket grisekød",
  // Prefer an offered equivalent for priceability (affinity alone picks a
  // no-offer variant).
  "hakkede tomater": "Mutti Polpa hakkede tomater",
  opvaskemiddel: "Fairy opvaskemiddel",
  mælk: "Grøn Balance Øllingegaard Økologisk Mælk",
  spaghetti: "COMBINO Spaghetti",
  majs: "Nyhøstet dansk majs",
  // No honest link exists — keep free_text ("no price" on compare) rather than
  // force a wrong product.
  spinat: null,
  opvaskesvampe: null,
  mikrofiberklude: null,
  "taco shells": null,
};

// (template name → item names by position) from the seed, for restoring
// anchors that were previously nulled (038y).
const SEED_ANCHORS = new Map<string, string[]>(
  TEMPLATES.map((t) => [t.name, t.items.map((i) => i.name)]),
);

function parseUnitPrice(v: string | null): number | null {
  if (v == null) return null;
  const n = Number(v.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

export async function backfillTemplateProducts(): Promise<{
  linked: number;
  unresolved: number;
}> {
  const now = new Date().toISOString();

  const products = await db.selectFrom("product").select(["id", "name"]).execute();
  const offers = await db
    .selectFrom("offer")
    .select(["product_id", "unit_price"])
    .where("valid_to", ">=", now)
    .execute();

  const offerInfo = new Map<string, { count: number; minUnitPrice: number | null }>();
  for (const o of offers) {
    const cur = offerInfo.get(o.product_id) ?? { count: 0, minUnitPrice: null };
    cur.count++;
    const p = parseUnitPrice(o.unit_price);
    if (p != null && (cur.minUnitPrice == null || p < cur.minUnitPrice)) cur.minUnitPrice = p;
    offerInfo.set(o.product_id, cur);
  }

  const candidates: TemplateProductCandidate[] = products.map((p) => {
    const info = offerInfo.get(p.id);
    return {
      id: p.id,
      name: p.name,
      hasOffer: (info?.count ?? 0) > 0,
      unitPrice: info?.minUnitPrice ?? null,
    };
  });

  const items = await db
    .selectFrom("list_template_item")
    .innerJoin("list_template", "list_template.id", "list_template_item.template_id")
    .leftJoin("product", "product.id", "list_template_item.product_id")
    .select([
      "list_template_item.id",
      "list_template_item.position",
      "list_template_item.free_text",
      "product.name as current_product_name",
      "list_template.name as template_name",
    ])
    .orderBy("list_template.name", "asc")
    .orderBy("list_template_item.position", "asc")
    .execute();

  let linked = 0;
  let unresolved = 0;
  let restored = 0;
  const report: string[] = [];
  let currentTemplate = "";
  for (const item of items) {
    if (item.template_name !== currentTemplate) {
      currentTemplate = item.template_name;
      report.push(`\n== ${currentTemplate} ==`);
    }
    // Anchor (038y): the item's original free_text term. If it was destroyed
    // (NULL), restore it from the seed (template + position) or, last resort,
    // derive a reasonable term from the current product name. The anchor is
    // then written back so it outlives the link.
    let anchor = item.free_text;
    if (!anchor) {
      const seed = SEED_ANCHORS.get(item.template_name);
      anchor = seed?.[item.position] ?? item.current_product_name ?? "";
      if (anchor && anchor !== item.free_text) {
        await db
          .updateTable("list_template_item")
          .set({ free_text: anchor })
          .where("id", "=", item.id)
          .execute();
        restored++;
      }
    }
    const key = anchor.toLowerCase();
    const override = OVERRIDES[key];
    let chosen: { id: string; name: string; hasOffer: boolean; method: string } | null = null;

    if (override !== undefined) {
      if (override === null) {
        // forced free_text
      } else {
        const pinned = candidates.find((c) => c.name.toLowerCase() === override.toLowerCase());
        if (pinned)
          chosen = {
            id: pinned.id,
            name: pinned.name,
            hasOffer: pinned.hasOffer,
            method: "override",
          };
        else report.push(`  ⚠ ${anchor}: OVERRIDE product not found (${override})`);
      }
    } else {
      const r = resolveTemplateProduct(anchor, candidates);
      if (r.productId) {
        const p = candidates.find((c) => c.id === r.productId)!;
        chosen = { id: p.id, name: p.name, hasOffer: p.hasOffer, method: r.method ?? "?" };
      }
    }

    if (chosen) {
      await db
        .updateTable("list_template_item")
        .set({ product_id: chosen.id, free_text: anchor })
        .where("id", "=", item.id)
        .execute();
      linked++;
      report.push(
        `  ${anchor}  →  ${chosen.name}  [${chosen.method}${chosen.hasOffer ? ", offered" : ", NO OFFER"}]`,
      );
    } else {
      // No honest link (or override forced free_text) — clear any wrong link so
      // the item is genuinely free_text ("no price" on compare).
      await db
        .updateTable("list_template_item")
        .set({ product_id: null, free_text: anchor })
        .where("id", "=", item.id)
        .execute();
      unresolved++;
      report.push(`  ${anchor}  →  (unresolved — stays free_text)`);
    }
  }

  report.push(
    `\n[backfill-template] linked ${linked}, unresolved ${unresolved} (of ${items.length} template items); anchors restored: ${restored}`,
  );
  console.log(report.join("\n"));
  return { linked, unresolved };
}

const isMain = process.argv[1] ? import.meta.url === pathToFileURL(process.argv[1]).href : false;

if (isMain) {
  void backfillTemplateProducts();
}
