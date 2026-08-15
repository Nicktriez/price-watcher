import type { Kysely } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema.alterTable("product").renameColumn("size_grams", "size").execute();
  await db.schema.alterTable("product").addColumn("size_to", "double precision").execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.alterTable("product").dropColumn("size_to").execute();
  await db.schema.alterTable("product").renameColumn("size", "size_grams").execute();
}
