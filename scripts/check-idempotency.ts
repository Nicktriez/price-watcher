import { db } from "../src/db/client.ts";
import { ingestRema } from "../src/lib/tjek-ingest.ts";

async function countOffers(): Promise<number> {
  const row = await db
    .selectFrom("offer")
    .select(db.fn.countAll().as("n"))
    .executeTakeFirstOrThrow();
  return Number(row.n);
}

const before = await countOffers();
await ingestRema();
const after1 = await countOffers();
await ingestRema();
const after2 = await countOffers();

console.log(`before=${before} after1=${after1} after2=${after2}`);
console.log(after1 === after2 ? "IDEMPOTENT" : "FAIL: after2 > after1");

await db.destroy();
