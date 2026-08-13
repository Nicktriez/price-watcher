import type { Kysely } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema.alterTable("user").addColumn("fuel_type", "text").execute();
  await db.schema.alterTable("user").addColumn("efficiency", "double precision").execute();
  await db.schema.alterTable("user").addColumn("ev_charging", "text").execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.alterTable("user").dropColumn("ev_charging").execute();
  await db.schema.alterTable("user").dropColumn("efficiency").execute();
  await db.schema.alterTable("user").dropColumn("fuel_type").execute();
}
