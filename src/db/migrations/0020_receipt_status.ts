import type { Kysely } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable("receipt")
    .addColumn("status", "text", (col) => col.notNull().defaultTo("pending"))
    .execute();
  await db.schema.alterTable("receipt").addColumn("error", "text").execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.alterTable("receipt").dropColumn("error").execute();
  await db.schema.alterTable("receipt").dropColumn("status").execute();
}
