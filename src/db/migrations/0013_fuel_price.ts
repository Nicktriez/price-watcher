import { sql, type Kysely } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable("fuel_price")
    .addColumn("id", "uuid", (col) => col.primaryKey())
    .addColumn("fuel_type", "text", (col) => col.notNull())
    .addColumn("price", "numeric", (col) => col.notNull())
    .addColumn("observed_at", "timestamptz", (col) => col.notNull().defaultTo(sql`now()`))
    .addColumn("source", "text", (col) => col.notNull())
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable("fuel_price").execute();
}
