import { db } from "../db/client.ts";
import { getStores } from "../lib/tjek.ts";
import { uuidFromKey } from "../lib/uuid.ts";

function storeUuid(tjekStoreId: string): string {
  return uuidFromKey(`store:${tjekStoreId}`);
}

export async function syncStoresFromTjek(): Promise<number> {
  const chains = await db.selectFrom("chain").select(["id", "tjek_dealer_id"]).execute();
  let count = 0;
  for (const chain of chains) {
    const stores = await getStores(chain.tjek_dealer_id);
    for (const store of stores) {
      const id = storeUuid(store.id);
      const name = store.name ?? chain.id;
      await db
        .insertInto("store")
        .values({
          id,
          chain_id: chain.id,
          name,
          address: store.street,
          city: store.city,
          zip: store.zip_code,
          lat: store.latitude,
          lon: store.longitude,
        })
        .onConflict((oc) =>
          oc.column("id").doUpdateSet({
            chain_id: chain.id,
            name,
            address: store.street,
            city: store.city,
            zip: store.zip_code,
            lat: store.latitude,
            lon: store.longitude,
          }),
        )
        .execute();
      count += 1;
    }
  }
  return count;
}
