import type { Kysely } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable("price_point")
    .alterColumn("offer_id", (col) => col.dropNotNull())
    .execute();
  await db.schema
    .alterTable("price_point")
    .addColumn("receipt_id", "uuid", (col) => col.references("receipt.id"))
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.alterTable("price_point").dropColumn("receipt_id").execute();
  await db.schema
    .alterTable("price_point")
    .alterColumn("offer_id", (col) => col.setNotNull())
    .execute();
}
