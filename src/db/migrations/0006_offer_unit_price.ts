import type { Kysely } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema.alterTable("offer").addColumn("unit_price", "numeric").execute();
  await db.schema.alterTable("offer").addColumn("unit_price_unit", "text").execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.alterTable("offer").dropColumn("unit_price").execute();
  await db.schema.alterTable("offer").dropColumn("unit_price_unit").execute();
}
