import type { Kysely } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable("crowd_report")
    .addColumn("id", "uuid", (col) => col.primaryKey())
    .addColumn("user_id", "uuid", (col) => col.notNull().references("user.id"))
    .addColumn("store_id", "uuid", (col) => col.notNull().references("store.id"))
    .addColumn("product_id", "uuid", (col) => col.references("product.id"))
    .addColumn("product_name", "text")
    .addColumn("price", "numeric", (col) => col.notNull())
    .addColumn("currency", "text", (col) => col.notNull().defaultTo("DKK"))
    .addColumn("photo_path", "text")
    .addColumn("reported_at", "timestamptz", (col) => col.notNull())
    .addColumn("created_at", "timestamptz", (col) => col.notNull())
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable("crowd_report").execute();
}
