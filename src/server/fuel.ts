import { randomUUID } from "node:crypto";
import cron from "node-cron";
import { db } from "../db/client.ts";

/**
 * Fuel price sources (config-driven).
 *
 * - Petrol + diesel: OK.dk's public fuel-prices API returns per-station prices
 *   (kr/l). We take the national average across stations.
 *   Source: https://mobility-prices.ok.dk/api/v1/fuel-prices
 *   Product names: "Blyfri 95" (petrol), "Svovlfri Diesel".
 * - EV charging: the Nordic day-ahead spot price (DKK/MWh) from the Danish
 *   Energidataservice, averaged over the latest day and converted to kr/kWh,
 *   plus a fixed tariff adder for grid/taxes/transport. If the spot API is
 *   unavailable, the config `evFallbackKrKwh` is used instead (never fabricate
 *   a spot average — the fallback is a documented national household rate).
 */
export const FUEL_SOURCES = {
  okUrl: "https://mobility-prices.ok.dk/api/v1/fuel-prices",
  okPetrolProduct: "Blyfri 95",
  okDieselProduct: "Svovlfri Diesel",
  elspotUrl: "https://api.energidataservice.dk/dataset/ElspotPrices",
  elspotArea: "DK2",
  evTariffKrKwh: 1.5, // national avg grid/taxes/transport adder
  evFallbackKrKwh: 2.5, // documented national household all-in rate (kr/kWh)
} as const;

const USER_AGENT = "price-watcher-dev (local testing)";

export interface FuelPrices {
  petrol: number | null;
  diesel: number | null;
  evKwh: number | null;
}

export function parseOkFuelPrices(body: string): { petrol: number | null; diesel: number | null } {
  let data: { items?: { prices?: { product_name?: string; price?: number }[] }[] };
  try {
    data = JSON.parse(body);
  } catch {
    return { petrol: null, diesel: null };
  }
  const stations = data.items ?? [];
  const petrolPrices = [] as number[];
  const dieselPrices = [] as number[];
  for (const station of stations) {
    for (const p of station.prices ?? []) {
      if (typeof p.price !== "number") continue;
      if (p.product_name === FUEL_SOURCES.okPetrolProduct) petrolPrices.push(p.price);
      else if (p.product_name === FUEL_SOURCES.okDieselProduct) dieselPrices.push(p.price);
    }
  }
  const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
  return { petrol: avg(petrolPrices), diesel: avg(dieselPrices) };
}

export function parseElspotAverage(body: string): number | null {
  let data: { records?: { HourDK?: string; SpotPriceDKK?: number }[] };
  try {
    data = JSON.parse(body);
  } catch {
    return null;
  }
  const records = data.records ?? [];
  const byDay = new Map<string, number[]>();
  for (const r of records) {
    if (typeof r.SpotPriceDKK !== "number" || !r.HourDK) continue;
    const day = r.HourDK.slice(0, 10);
    const list = byDay.get(day) ?? [];
    list.push(r.SpotPriceDKK);
    byDay.set(day, list);
  }
  if (byDay.size === 0) return null;
  const latestDay = [...byDay.keys()].sort().pop()!;
  const prices = byDay.get(latestDay)!;
  const avgMwh = prices.reduce((a, b) => a + b, 0) / prices.length;
  return avgMwh / 1000; // DKK/MWh -> kr/kWh (spot only)
}

export async function fetchFuelPrices(): Promise<FuelPrices> {
  const okRes = await fetch(FUEL_SOURCES.okUrl, { headers: { "User-Agent": USER_AGENT } });
  const okBody = okRes.ok ? await okRes.text() : "";
  const { petrol, diesel } = parseOkFuelPrices(okBody);

  let evKwh: number | null = null;
  const params = new URLSearchParams({
    limit: "24",
    sort: "HourDK DESC",
    filter: JSON.stringify({ PriceArea: [FUEL_SOURCES.elspotArea] }),
  });
  const spotRes = await fetch(`${FUEL_SOURCES.elspotUrl}?${params}`, {
    headers: { "User-Agent": USER_AGENT },
  });
  if (spotRes.ok) {
    const spot = parseElspotAverage(await spotRes.text());
    evKwh =
      spot != null
        ? Math.round((spot + FUEL_SOURCES.evTariffKrKwh) * 100) / 100
        : FUEL_SOURCES.evFallbackKrKwh;
  } else {
    evKwh = FUEL_SOURCES.evFallbackKrKwh;
  }

  return { petrol, diesel, evKwh };
}

export async function getLatestFuelPrice(fuelType: "petrol" | "diesel" | "ev_kwh") {
  const row = await db
    .selectFrom("fuel_price")
    .select(["price", "observed_at", "source"])
    .where("fuel_type", "=", fuelType)
    .orderBy("observed_at", "desc")
    .executeTakeFirst();
  return row
    ? {
        price: parseFloat(row.price),
        observedAt: row.observed_at,
        source: row.source,
      }
    : null;
}

export async function refreshFuelPrices(): Promise<void> {
  const prices = await fetchFuelPrices();
  const now = new Date().toISOString();

  let inserted = 0;
  const write = async (
    fuelType: "petrol" | "diesel" | "ev_kwh",
    price: number | null,
    source: string,
  ) => {
    if (price == null || !Number.isFinite(price)) {
      console.error(
        `[fuel] ${fuelType} fetch failed — keeping the last known price (staleness is derived from age)`,
      );
      return;
    }
    await db
      .insertInto("fuel_price")
      .values({
        id: randomUUID(),
        fuel_type: fuelType,
        price: String(price),
        observed_at: now,
        source,
      })
      .execute();
    inserted += 1;
  };

  await write("petrol", prices.petrol, FUEL_SOURCES.okUrl);
  await write("diesel", prices.diesel, FUEL_SOURCES.okUrl);
  await write("ev_kwh", prices.evKwh, "elspot+tariff (config fallback)");

  console.log(
    `[fuel] refreshed ${inserted} fuel prices (petrol=${prices.petrol}, diesel=${prices.diesel}, ev=${prices.evKwh})`,
  );
}

export function startFuelPriceScheduler(): void {
  cron.schedule("30 6 * * *", () => {
    void refreshFuelPrices();
  });
  console.log("[fuel] daily price scheduler started (06:30)");
}
