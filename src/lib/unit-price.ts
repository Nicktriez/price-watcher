import type { TjekOffer } from "./tjek.ts";

export interface UnitPrice {
  unit_price: string;
  unit_price_unit: string;
}

const MASS_TO_KG: Record<string, number> = { g: 1 / 1000, kg: 1 };
const VOLUME_TO_L: Record<string, number> = { ml: 1 / 1000, cl: 1 / 100, l: 1 };
const PIECE_UNITS = new Set(["pcs", "stk"]);

export function computeUnitPrice(offer: TjekOffer): UnitPrice | null {
  const symbol = offer.quantity.unit.symbol;
  const size = offer.quantity.size.from;
  if (symbol == null || size == null || size <= 0) return null;

  let divisor: number;
  let unit: string;

  if (symbol in MASS_TO_KG) {
    divisor = size * MASS_TO_KG[symbol];
    unit = "kr/kg";
  } else if (symbol in VOLUME_TO_L) {
    divisor = size * VOLUME_TO_L[symbol];
    unit = "kr/l";
  } else if (PIECE_UNITS.has(symbol)) {
    divisor = size;
    unit = "kr/stk";
  } else {
    return null;
  }

  const value = offer.pricing.price / divisor;
  if (!Number.isFinite(value)) return null;
  return { unit_price: String(value), unit_price_unit: unit };
}
