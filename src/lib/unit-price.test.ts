import { describe, expect, it } from "vite-plus/test";
import type { TjekOffer } from "./tjek.ts";
import { computeUnitPrice } from "./unit-price.ts";
import nettoOffers from "./__fixtures__/netto.offers.json";
import remaOffers from "./__fixtures__/rema1000.offers.json";

const rema = remaOffers as unknown as TjekOffer[];
const netto = nettoOffers as unknown as TjekOffer[];

function find(headingPart: string, list: TjekOffer[] = rema): TjekOffer {
  const offer = list.find((o) => o.heading.includes(headingPart));
  if (!offer) throw new Error(`no fixture offer matching "${headingPart}"`);
  return offer;
}

function synthetic(
  heading: string,
  symbol: string | null,
  sizeFrom: number | null,
  price: number,
): TjekOffer {
  return {
    id: heading,
    heading,
    description: null,
    catalog_page: null,
    pricing: { price, pre_price: null, currency: "DKK" },
    quantity: {
      unit: { symbol },
      size: { from: sizeFrom, to: sizeFrom },
      pieces: { from: 1, to: 1, max: null },
    },
    images: { thumb: null, view: null, zoom: null },
    run_from: "2026-08-08T22:00:00+0000",
    run_till: "2026-08-15T21:59:59+0000",
    publish: "2026-08-05T10:00:00+0000",
    catalog_id: "catalog",
    dealer_id: "dealer",
  };
}

describe("computeUnitPrice", () => {
  it("converts g to kr/kg using size_from", () => {
    const up = computeUnitPrice(find("Schulstad brød"))!;
    expect(up.unit_price_unit).toBe("kr/kg");
    expect(parseFloat(up.unit_price)).toBeCloseTo(25.53, 2);
  });

  it("converts kg to kr/kg directly", () => {
    const up = computeUnitPrice(find("ovnklar ribbenssteg"))!;
    expect(up.unit_price_unit).toBe("kr/kg");
    expect(parseFloat(up.unit_price)).toBeCloseTo(50, 2);
  });

  it("converts ml to kr/l", () => {
    const up = computeUnitPrice(find("Bologna Italiensk is"))!;
    expect(up.unit_price_unit).toBe("kr/l");
    expect(parseFloat(up.unit_price)).toBeCloseTo(38.67, 2);
  });

  it("converts cl to kr/l", () => {
    const up = computeUnitPrice(find("Royal eller Heineken øl"))!;
    expect(up.unit_price_unit).toBe("kr/l");
    expect(parseFloat(up.unit_price)).toBeCloseTo(13.64, 2);
  });

  it("converts pcs to kr/stk", () => {
    const up = computeUnitPrice(find("Jensens eller K-Salat sauce"))!;
    expect(up.unit_price_unit).toBe("kr/stk");
    expect(parseFloat(up.unit_price)).toBeCloseTo(12, 2);
  });

  it("makes a 250g and a 500g version of the same product comparable", () => {
    const small = computeUnitPrice(synthetic("Kaffe", "g", 250, 12))!;
    const large = computeUnitPrice(synthetic("Kaffe", "g", 500, 24))!;
    expect(parseFloat(small.unit_price)).toBeCloseTo(parseFloat(large.unit_price), 5);
    expect(small.unit_price_unit).toBe(large.unit_price_unit);
  });

  it("returns null for missing unit or size", () => {
    expect(computeUnitPrice(synthetic("Uden enhed", null, 250, 12))).toBeNull();
    expect(computeUnitPrice(synthetic("Uden str.", "g", null, 12))).toBeNull();
    expect(computeUnitPrice(synthetic("Ugyldig enhed", "m", 250, 12))).toBeNull();
  });

  it("computes a positive unit price for every fixture offer without throwing", () => {
    for (const offer of [...rema, ...netto]) {
      const up = computeUnitPrice(offer);
      if (up) {
        expect(["kr/kg", "kr/l", "kr/stk"]).toContain(up.unit_price_unit);
        expect(parseFloat(up.unit_price)).toBeGreaterThan(0);
      }
    }
  });
});
