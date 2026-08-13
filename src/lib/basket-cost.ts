export interface BasketItem {
  productId: string;
  quantity: number | null;
  unit: string | null;
}

export interface OfferSource {
  productId: string;
  price: number;
  unit: string | null;
  sizeFrom: number | null;
  unitPrice: number | null;
  unitPriceUnit: string | null;
}

export interface BasketLineResult {
  productId: string;
  quantity: number | null;
  unit: string | null;
  source: "offer" | "baseline" | "no-price";
  price: number | null;
}

export interface StoreBasket {
  storeId: string;
  storeName: string;
  offerItems: number;
  baselineItems: number;
  noPriceItems: number;
  offerTotal: number;
  baselineTotal: number;
  basketTotal: number;
  lines: BasketLineResult[];
}

const round2 = (n: number) => Math.round(n * 100) / 100;

function unitCategory(unitPriceUnit: string): "kg" | "l" | "stk" {
  if (unitPriceUnit === "kr/kg") return "kg";
  if (unitPriceUnit === "kr/l") return "l";
  return "stk";
}

function convertToUnit(
  qty: number,
  fromUnit: string | null,
  toUnit: "kg" | "l" | "stk",
): number | null {
  const u = (fromUnit ?? "").toLowerCase();
  if (toUnit === "kg") {
    if (u === "g") return qty / 1000;
    if (u === "kg") return qty;
    return null;
  }
  if (toUnit === "l") {
    if (u === "ml") return qty / 1000;
    if (u === "cl") return qty / 100;
    if (u === "l") return qty;
    return null;
  }
  if (toUnit === "stk") {
    if (u === "" || u === "stk" || u === "pcs") return qty;
    return null;
  }
  return null;
}

function itemQuantity(item: BasketItem): number {
  return item.quantity ?? 1;
}

export function pickBestOffer(item: BasketItem, offers: OfferSource[]): OfferSource | null {
  const comparable = offers.filter(
    (o) =>
      o.productId === item.productId &&
      o.unitPrice != null &&
      o.unitPriceUnit != null &&
      convertToUnit(1, item.unit, unitCategory(o.unitPriceUnit)) !== null,
  );
  if (comparable.length === 0) return null;
  return comparable.reduce((a, b) => (b.unitPrice! < a.unitPrice! ? b : a));
}

export function priceItem(
  item: BasketItem,
  storeOffers: OfferSource[],
  baselines: Record<string, number>,
): BasketLineResult {
  const best = pickBestOffer(item, storeOffers);
  if (best) {
    const converted = convertToUnit(
      itemQuantity(item),
      item.unit,
      unitCategory(best.unitPriceUnit!),
    );
    if (converted != null) {
      return { ...item, source: "offer", price: round2(converted * best.unitPrice!) };
    }
  }
  const baseline = baselines[item.productId];
  if (baseline != null) {
    return { ...item, source: "baseline", price: round2(baseline) };
  }
  return { ...item, source: "no-price", price: null };
}

export function computeBasketCosts(params: {
  items: BasketItem[];
  offers: Record<string, OfferSource[]>;
  storeNames: Record<string, string>;
  baselines: Record<string, number>;
}): StoreBasket[] {
  const { items, offers, storeNames, baselines } = params;
  const stores = Object.keys(offers);

  return stores.map((storeId) => {
    const storeOffers = offers[storeId] ?? [];
    const basket: StoreBasket = {
      storeId,
      storeName: storeNames[storeId] ?? storeId,
      offerItems: 0,
      baselineItems: 0,
      noPriceItems: 0,
      offerTotal: 0,
      baselineTotal: 0,
      basketTotal: 0,
      lines: [],
    };

    for (const item of items) {
      const line = priceItem(item, storeOffers, baselines);
      if (line.source === "offer") {
        basket.offerItems += 1;
        basket.offerTotal += line.price!;
      } else if (line.source === "baseline") {
        basket.baselineItems += 1;
        basket.baselineTotal += line.price!;
      } else {
        basket.noPriceItems += 1;
      }
      basket.lines.push(line);
    }

    basket.offerTotal = round2(basket.offerTotal);
    basket.baselineTotal = round2(basket.baselineTotal);
    basket.basketTotal = round2(basket.offerTotal + basket.baselineTotal);
    return basket;
  });
}
