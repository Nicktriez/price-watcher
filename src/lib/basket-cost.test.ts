import { describe, expect, it } from "vite-plus/test";
import {
  computeBasketCosts,
  pickBestOffer,
  type BasketItem,
  type OfferSource,
} from "./basket-cost.ts";

const item = (productId: string, quantity: number | null, unit: string | null): BasketItem => ({
  productId,
  quantity,
  unit,
});

const offer = (
  productId: string,
  price: number,
  sizeFrom: number | null,
  unitPrice: number,
  unitPriceUnit: string,
): OfferSource => ({
  productId,
  price,
  unit: unitPriceUnit === "kr/kg" ? "g" : unitPriceUnit === "kr/l" ? "ml" : "pcs",
  sizeFrom,
  unitPrice,
  unitPriceUnit,
});

describe("pickBestOffer", () => {
  it("picks the cheapest comparable offer by unit price", () => {
    const offers = [
      offer("p1", 20, 500, 40, "kr/kg"), // 500 g for 20 kr = 40 kr/kg
      offer("p1", 35, 1000, 35, "kr/kg"), // 1 kg for 35 kr = 35 kr/kg
    ];
    const best = pickBestOffer(item("p1", 500, "g"), offers);
    expect(best?.price).toBe(35);
  });

  it("ignores offers whose unit category does not match the item unit", () => {
    const offers = [offer("p1", 10, 1, 10, "kr/stk")];
    expect(pickBestOffer(item("p1", 500, "g"), offers)).toBeNull();
  });
});

describe("computeBasketCosts", () => {
  const items: BasketItem[] = [
    item("spaghetti", 500, "g"),
    item("beef", 400, "g"),
    item("tomat", 2, "dåser"),
    item("milk", 1, "l"),
    item("løg", 2, "stk"),
    item("ost", 150, "g"),
    item("hvidløg", 2, "stk"),
    item("smør", 1, "kg"),
    item("ris", 1, "kg"),
    item("kaffe", 1, "pk"),
  ];

  const rema = {
    spaghetti: [offer("spaghetti", 12, 500, 24, "kr/kg")],
    beef: [offer("beef", 39.95, 400, 99.875, "kr/kg")],
    tomat: [offer("tomat", 18, 800, 22.5, "kr/kg")], // "dåser" not comparable
    milk: [offer("milk", 10, 1000, 10, "kr/l")],
    løg: [offer("løg", 8, 1, 8, "kr/stk")],
    ost: [offer("ost", 25, 150, 166.67, "kr/kg")],
    hvidløg: [offer("hvidløg", 6, 1, 6, "kr/stk")],
    smør: [offer("smør", 45, 1, 45, "kr/kg")],
  };

  const netto = {
    beef: [offer("beef", 30, 500, 60, "kr/kg")],
    milk: [offer("milk", 12, 1000, 12, "kr/l")],
    spaghetti: [offer("spaghetti", 20, 1000, 20, "kr/kg")],
  };

  const baselines = {
    ris: 25,
    kaffe: 40,
    smør: 40,
  };

  it("computes a per-store basket breakdown for a 10-item list", () => {
    const result = computeBasketCosts({
      items,
      offers: {
        rema: rema.spaghetti.concat(
          rema.beef,
          rema.tomat,
          rema.milk,
          rema.løg,
          rema.ost,
          rema.hvidløg,
          rema.smør,
        ),
        netto: netto.beef.concat(netto.milk, netto.spaghetti),
      },
      storeNames: { rema: "REMA 1000", netto: "Netto" },
      baselines,
    });

    const remaBasket = result.find((r) => r.storeId === "rema")!;
    // spaghetti 0.5kg*24=12, beef 0.4*99.875=39.95, milk 1*10=10, løg 2*8=16, ost 0.15*166.67≈25, hvidløg 2*6=12, smør 1*45=45
    expect(remaBasket.offerTotal).toBeCloseTo(159.95, 2);
    // tomat (dåser, not comparable) + ris + kaffe: tomat no-price, ris baseline 25, kaffe baseline 40
    expect(remaBasket.baselineTotal).toBeCloseTo(65, 2);
    expect(remaBasket.noPriceItems).toBe(1); // tomat
    expect(remaBasket.offerItems).toBe(7);
    expect(remaBasket.baselineItems).toBe(2);
    expect(remaBasket.basketTotal).toBeCloseTo(224.95, 2);

    const nettoBasket = result.find((r) => r.storeId === "netto")!;
    // beef 0.4*60=24, milk 1*12=12, spaghetti 0.5*20=10
    expect(nettoBasket.offerTotal).toBeCloseTo(46, 2);
    // smør (no offer) + ris + kaffe baselines: 40 + 25 + 40
    expect(nettoBasket.baselineTotal).toBeCloseTo(105, 2);
    expect(nettoBasket.noPriceItems).toBe(4); // tomat, løg, ost, hvidløg
    expect(nettoBasket.baselineItems).toBe(3); // smør, ris, kaffe
    expect(nettoBasket.basketTotal).toBeCloseTo(151, 2);
  });

  it("tracks offer vs baseline separately and is honest about no-price items", () => {
    const result = computeBasketCosts({
      items: [item("a", 1, "stk"), item("b", 500, "g")],
      offers: { s1: [offer("a", 5, 1, 5, "kr/stk")] },
      storeNames: { s1: "S1" },
      baselines: { b: 20 },
    });
    const basket = result[0];
    expect(basket.offerItems).toBe(1);
    expect(basket.baselineItems).toBe(1);
    expect(basket.noPriceItems).toBe(0);
    expect(basket.lines.find((l) => l.productId === "a")?.source).toBe("offer");
    expect(basket.lines.find((l) => l.productId === "b")?.source).toBe("baseline");
  });

  it("uses a community crowd price before a receipt baseline, tracked separately", () => {
    const result = computeBasketCosts({
      items: [item("a", 1, "stk"), item("b", 500, "g")],
      offers: { s1: [offer("a", 5, 1, 5, "kr/stk")] },
      storeNames: { s1: "S1" },
      baselines: { a: 99, b: 20 },
      crowdPrices: { s1: { b: 12.5 } },
    });
    const basket = result[0];
    expect(basket.offerItems).toBe(1); // a via offer
    expect(basket.crowdItems).toBe(1); // b via community crowd, not baseline
    expect(basket.baselineItems).toBe(0);
    expect(basket.lines.find((l) => l.productId === "b")?.source).toBe("crowd");
    expect(basket.lines.find((l) => l.productId === "b")?.price).toBeCloseTo(12.5, 2);
    expect(basket.crowdTotal).toBeCloseTo(12.5, 2);
    expect(basket.baselineTotal).toBeCloseTo(0, 2);
    expect(basket.basketTotal).toBeCloseTo(17.5, 2);
  });

  it("flags items with no offer and no baseline as no-price without guessing", () => {
    const result = computeBasketCosts({
      items: [item("unknown", 1, "stk")],
      offers: {},
      storeNames: {},
      baselines: {},
    });
    expect(result).toEqual([]);
    const result2 = computeBasketCosts({
      items: [item("unknown", 1, "stk")],
      offers: { s1: [] },
      storeNames: { s1: "S1" },
      baselines: {},
    });
    expect(result2[0].noPriceItems).toBe(1);
    expect(result2[0].lines[0].price).toBeNull();
    expect(result2[0].lines[0].source).toBe("no-price");
  });
});
