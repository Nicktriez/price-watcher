import type { Kysely } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable("offer")
    .alterColumn("size_from", (col) => col.setDataType("double precision"))
    .execute();
  await db.schema
    .alterTable("offer")
    .alterColumn("size_to", (col) => col.setDataType("double precision"))
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable("offer")
    .alterColumn("size_from", (col) => col.setDataType("integer"))
    .execute();
  await db.schema
    .alterTable("offer")
    .alterColumn("size_to", (col) => col.setDataType("integer"))
    .execute();
}
