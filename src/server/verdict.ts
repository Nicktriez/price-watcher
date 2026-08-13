"use server";

import {
  computeFuelCost,
  buildVerdictText,
  type FuelPrices,
  type VerdictStore,
} from "~/lib/fuel-cost";
import { getCarProfile } from "./car-profile.ts";
import { db } from "~/db/client";
import { getStoreDistances } from "./distance.ts";
import { getLatestFuelPrice } from "./fuel.ts";
import { getBasketCosts } from "./lists.ts";

const EV_PUBLIC_KR_KWH = 5.5; // documented Danish public fast-charging average (kr/kWh)

export interface StoreVerdict extends VerdictStore {
  roundTripKm: number | null;
  hasFuelFigure: boolean;
  offerItems: number;
  baselineItems: number;
  noPriceItems: number;
  offerTotal: number;
  baselineTotal: number;
}

export interface FuelHistoryPoint {
  fuelType: string;
  price: number;
  observedAt: string;
}

export interface VerdictReport {
  stores: StoreVerdict[];
  ranked: StoreVerdict[];
  netWinner: StoreVerdict | null;
  verdictText: string | null;
  carDefault: boolean;
  unpricedItems: number;
  fuelPrices: { petrol: number | null; diesel: number | null; evKwh: number | null };
  fuelHistory: FuelHistoryPoint[];
}

export async function getFuelHistory(): Promise<FuelHistoryPoint[]> {
  const rows = await db
    .selectFrom("fuel_price")
    .select(["fuel_type", "price", "observed_at"])
    .orderBy("observed_at", "asc")
    .limit(90)
    .execute();
  return rows.map((r) => ({
    fuelType: r.fuel_type,
    price: parseFloat(r.price),
    observedAt: r.observed_at,
  }));
}

export async function getStoreVerdicts(listId: string, userId: string): Promise<VerdictReport> {
  const baskets = await getBasketCosts(listId, userId);
  const distances = await getStoreDistances(userId);
  const carView = await getCarProfile();

  const [petrolRow, dieselRow, evRow] = await Promise.all([
    getLatestFuelPrice("petrol"),
    getLatestFuelPrice("diesel"),
    getLatestFuelPrice("ev_kwh"),
  ]);
  const prices: FuelPrices | null =
    petrolRow && dieselRow && evRow
      ? {
          petrol: petrolRow.price,
          diesel: dieselRow.price,
          evHome: evRow.price,
          evPublic: EV_PUBLIC_KR_KWH,
        }
      : null;

  const stores: StoreVerdict[] = baskets
    .filter((b) => b.basketTotal > 0)
    .map((b) => {
      const distance = distances.find((d) => d.chainId === b.storeId);
      const hasFuelFigure = distance?.roundTripKm != null && prices != null;
      const fuelCost = hasFuelFigure
        ? computeFuelCost(distance!.roundTripKm!, carView.profile, prices!)
        : null;
      return {
        storeId: b.storeId,
        storeName: b.storeName,
        basketTotal: b.basketTotal,
        fuelCost,
        totalWithFuel: fuelCost != null ? Math.round((b.basketTotal + fuelCost) * 100) / 100 : null,
        roundTripKm: distance?.roundTripKm ?? null,
        hasFuelFigure: fuelCost != null,
        offerItems: b.offerItems,
        baselineItems: b.baselineItems,
        noPriceItems: b.noPriceItems,
        offerTotal: b.offerTotal,
        baselineTotal: b.baselineTotal,
      };
    });

  const ranked = [...stores].sort((a, b) => {
    const at = a.totalWithFuel ?? Number.POSITIVE_INFINITY;
    const bt = b.totalWithFuel ?? Number.POSITIVE_INFINITY;
    return at - bt;
  });

  const netWinner = ranked.find((s) => s.totalWithFuel != null) ?? null;
  const verdictText = buildVerdictText(
    ranked.map((s) => ({
      storeId: s.storeId,
      storeName: s.storeName,
      basketTotal: s.basketTotal,
      fuelCost: s.fuelCost,
      totalWithFuel: s.totalWithFuel,
    })),
  );

  const byProduct = new Map<string, boolean[]>();
  for (const b of baskets) {
    for (const l of b.lines) {
      const arr = byProduct.get(l.productId) ?? [];
      arr.push(l.price != null);
      byProduct.set(l.productId, arr);
    }
  }
  const unpricedItems = [...byProduct.values()].filter((v) => v.every((x) => !x)).length;
  const fuelHistory = await getFuelHistory();

  return {
    stores,
    ranked,
    netWinner,
    verdictText,
    carDefault: !carView.set,
    unpricedItems,
    fuelPrices: {
      petrol: petrolRow?.price ?? null,
      diesel: dieselRow?.price ?? null,
      evKwh: evRow?.price ?? null,
    },
    fuelHistory,
  };
}
