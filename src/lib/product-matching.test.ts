import { describe, expect, it } from "vite-plus/test";
import { linkProducts, normalizeName, type OfferLike } from "./product-matching.ts";
import nettoOffers from "./__fixtures__/netto.offers.json";
import remaOffers from "./__fixtures__/rema1000.offers.json";

interface FixtureOffer {
  id: string;
  heading: string;
}

const toOffer = (o: FixtureOffer, dealerId: string): OfferLike => ({
  id: o.id,
  product_id: `${dealerId}:${o.heading}`,
  dealer_id: dealerId,
  heading: o.heading,
});

const remaOffersLike = (remaOffers as FixtureOffer[]).map((o) => toOffer(o, "11deC"));
const nettoOffersLike = (nettoOffers as FixtureOffer[]).map((o) => toOffer(o, "9ba51"));

describe("normalizeName", () => {
  it("lowercases and trims", () => {
    expect(normalizeName("  Schulstad Brød  ")).toBe("schulstad brød");
  });

  it("strips trailing size suffixes", () => {
    expect(normalizeName("Schulstad brød 470g")).toBe("schulstad brød");
    expect(normalizeName("Schulstad brød 470-1080 g")).toBe("schulstad brød");
    expect(normalizeName("Coca-Cola 1 liter")).toBe("coca-cola");
    expect(normalizeName("Vand 50 cl")).toBe("vand");
  });

  it("strips trailing percentage suffixes", () => {
    expect(normalizeName("Hakket oksekød 8-12%")).toBe("hakket oksekød");
  });

  it("strips trailing footnote markers", () => {
    expect(normalizeName("All In One kiks*")).toBe("all in one kiks");
  });

  it("strips brand prefixes", () => {
    expect(normalizeName("REMA 1000 Dansk kylling")).toBe("dansk kylling");
  });

  it("keeps multi-product 'eller' headings intact", () => {
    expect(normalizeName("Jensens eller K-Salat sauce")).toBe("jensens eller k-salat sauce");
  });

  it("normalizes dashes", () => {
    expect(normalizeName("3–Stjernet pålæg")).toBe("3-stjernet pålæg");
  });
});

describe("linkProducts", () => {
  it("links the same product across REMA and Netto fixtures to one product", () => {
    const decisions = linkProducts([...remaOffersLike, ...nettoOffersLike]);

    const group = decisions.filter((d) => d.toProductId === "11deC:3-stjernet pålæg");
    expect(group).toHaveLength(1);
    expect(group[0].fromProductId).toBe("9ba51:3-Stjernet pålæg");

    const relinked = new Map<string, string>([
      ...remaOffersLike.map((o) => [o.id, o.product_id] as [string, string]),
      ...nettoOffersLike.map((o) => [o.id, o.product_id] as [string, string]),
    ]);
    for (const d of decisions) relinked.set(d.offerId, d.toProductId);

    const ids = [...remaOffersLike, ...nettoOffersLike]
      .filter((o) => normalizeName(o.heading) === normalizeName("3-stjernet pålæg"))
      .map((o) => relinked.get(o.id));
    expect(new Set(ids).size).toBe(1);
  });

  it("is idempotent: re-running after applying decisions links nothing new", () => {
    let offers = [...remaOffersLike, ...nettoOffersLike];
    const first = linkProducts(offers);

    const applied = new Map(offers.map((o) => [o.id, o.product_id]));
    for (const d of first) applied.set(d.offerId, d.toProductId);
    offers = offers.map((o) => ({ ...o, product_id: applied.get(o.id)! }));

    const second = linkProducts(offers);
    expect(second).toHaveLength(0);
  });

  it("keeps the first stable link when a new offer joins a matched group", () => {
    let offers = [...remaOffersLike, ...nettoOffersLike];
    const first = linkProducts(offers);
    const applied = new Map(offers.map((o) => [o.id, o.product_id]));
    for (const d of first) applied.set(d.offerId, d.toProductId);
    offers = offers.map((o) => ({ ...o, product_id: applied.get(o.id)! }));

    const newcomer: OfferLike = {
      id: "lidl-new",
      product_id: "a0000000-lidl:3-stjernet pålæg",
      dealer_id: "71c90",
      heading: "3-stjernet pålæg",
    };

    const again = linkProducts([...offers, newcomer]);
    expect(again).toHaveLength(1);
    expect(again[0].offerId).toBe("lidl-new");
    expect(again[0].toProductId).toBe("11deC:3-stjernet pålæg");
  });
});
