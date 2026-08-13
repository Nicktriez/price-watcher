"use server";

import { db } from "~/db/client";
import { geocodeFreeform } from "~/lib/geocode";
import { getRouteDistance, roundTrip, type GeoPoint } from "~/lib/osrm";
import { getCurrentUser } from "./auth.ts";

const round2 = (n: number) => Math.round(n * 100) / 100;

function haversineKm(a: GeoPoint, b: GeoPoint): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export interface HomeInfo {
  address: string | null;
  hasCoords: boolean;
}

export async function getHomeInfo(): Promise<HomeInfo> {
  const user = await getCurrentUser();
  if (!user) throw new Error("sign-in-required");
  const row = await db
    .selectFrom("user")
    .select(["home_address", "home_lat", "home_lon"])
    .where("id", "=", user.id)
    .executeTakeFirst();
  return {
    address: row?.home_address ?? null,
    hasCoords: row?.home_lat != null && row?.home_lon != null,
  };
}

export async function saveHomeAddress(addressInput: string): Promise<{ ok: boolean }> {
  const user = await getCurrentUser();
  if (!user) throw new Error("sign-in-required");
  const address = addressInput.trim();
  if (!address) return { ok: false };

  // Privacy: the address is only geocoded to coordinates for distance — never exposed.
  const coord = await geocodeFreeform(address);
  if (!coord) return { ok: false };

  await db
    .updateTable("user")
    .set({
      home_address: address,
      home_lat: coord.lat,
      home_lon: coord.lon,
      updated_at: new Date().toISOString(),
    })
    .where("id", "=", user.id)
    .execute();
  return { ok: true };
}

export async function clearHomeAddress(): Promise<void> {
  const user = await getCurrentUser();
  if (!user) throw new Error("sign-in-required");
  await db
    .updateTable("user")
    .set({
      home_address: null,
      home_lat: null,
      home_lon: null,
      updated_at: new Date().toISOString(),
    })
    .where("id", "=", user.id)
    .execute();
}

export interface StoreDistance {
  chainId: string;
  storeId: string;
  storeName: string;
  roundTripKm: number | null;
}

export async function getStoreDistances(userId: string): Promise<StoreDistance[]> {
  const home = await db
    .selectFrom("user")
    .select(["home_lat", "home_lon"])
    .where("id", "=", userId)
    .executeTakeFirst();
  if (home?.home_lat == null || home?.home_lon == null) return [];
  const origin = { lat: home.home_lat, lon: home.home_lon };

  const stores = await db
    .selectFrom("store")
    .select(["id", "name", "chain_id", "lat", "lon"])
    .where("lat", "is not", null)
    .where("lon", "is not", null)
    .execute();

  const byChain = new Map<string, typeof stores>();
  for (const store of stores) {
    const list = byChain.get(store.chain_id) ?? [];
    list.push(store);
    byChain.set(store.chain_id, list);
  }

  const results: StoreDistance[] = [];
  for (const [chainId, chainStores] of byChain) {
    const nearest = chainStores.reduce((a, b) =>
      haversineKm(origin, { lat: a.lat!, lon: a.lon! }) <=
      haversineKm(origin, { lat: b.lat!, lon: b.lon! })
        ? a
        : b,
    );

    const cached = await db
      .selectFrom("user_store_distance")
      .select(["round_trip_km"])
      .where("user_id", "=", userId)
      .where("store_id", "=", nearest.id)
      .executeTakeFirst();

    let roundTripKm: number | null;
    if (cached) {
      roundTripKm = cached.round_trip_km;
    } else {
      const oneWay = await getRouteDistance(origin, { lat: nearest.lat!, lon: nearest.lon! });
      if (oneWay != null) {
        const rt = round2(roundTrip(oneWay));
        roundTripKm = rt;
        await db
          .insertInto("user_store_distance")
          .values({
            user_id: userId,
            store_id: nearest.id,
            distance_km: round2(oneWay),
            round_trip_km: rt,
            updated_at: new Date().toISOString(),
          })
          .onConflict((oc) =>
            oc.columns(["user_id", "store_id"]).doUpdateSet({
              distance_km: round2(oneWay),
              round_trip_km: rt,
              updated_at: new Date().toISOString(),
            }),
          )
          .execute();
      } else {
        roundTripKm = null;
      }
    }

    results.push({ chainId, storeId: nearest.id, storeName: nearest.name, roundTripKm });
  }
  return results;
}
