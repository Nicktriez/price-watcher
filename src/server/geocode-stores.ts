import { pathToFileURL } from "node:url";
import { db } from "../db/client.ts";
import { geocodeAddress } from "../lib/geocode.ts";
import { syncStoresFromTjek } from "./store-sync.ts";

const NOMINATIM_DELAY_MS = 1100;

export async function geocodeMissingStores(): Promise<{ geocoded: number; failed: number }> {
  const stores = await db
    .selectFrom("store")
    .select(["id", "address", "city", "zip"])
    .where("lat", "is", null)
    .execute();

  let geocoded = 0;
  let failed = 0;
  for (const store of stores) {
    const coord = await geocodeAddress({ street: store.address, city: store.city, zip: store.zip });
    if (coord) {
      await db
        .updateTable("store")
        .set({ lat: coord.lat, lon: coord.lon })
        .where("id", "=", store.id)
        .execute();
      geocoded += 1;
    } else {
      console.error(
        `[geocode] failed for store ${store.id} (${store.address}, ${store.zip} ${store.city}) — left ungeocoded`,
      );
      failed += 1;
    }
    await new Promise((r) => setTimeout(r, NOMINATIM_DELAY_MS));
  }
  return { geocoded, failed };
}

export async function backfillStores(): Promise<void> {
  const synced = await syncStoresFromTjek();
  const { geocoded, failed } = await geocodeMissingStores();
  console.log(
    `[geocode] synced ${synced} stores from Tjek; Nominatim-geocoded ${geocoded}, failed ${failed}`,
  );
}

const isMain = process.argv[1] ? import.meta.url === pathToFileURL(process.argv[1]).href : false;

if (isMain) {
  void backfillStores();
}
