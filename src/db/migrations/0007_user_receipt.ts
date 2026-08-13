import type { Kysely } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable("user")
    .addColumn("id", "uuid", (col) => col.primaryKey())
    .addColumn("email", "text", (col) => col.notNull().unique())
    .addColumn("created_at", "timestamptz", (col) => col.notNull())
    .addColumn("updated_at", "timestamptz", (col) => col.notNull())
    .execute();

  await db.schema
    .createTable("login_token")
    .addColumn("id", "uuid", (col) => col.primaryKey())
    .addColumn("user_id", "uuid", (col) => col.notNull().references("user.id"))
    .addColumn("token", "text", (col) => col.notNull())
    .addColumn("expires_at", "timestamptz", (col) => col.notNull())
    .addColumn("used_at", "timestamptz")
    .addColumn("created_at", "timestamptz", (col) => col.notNull())
    .execute();

  await db.schema
    .createTable("receipt")
    .addColumn("id", "uuid", (col) => col.primaryKey())
    .addColumn("user_id", "uuid", (col) => col.notNull().references("user.id"))
    .addColumn("store_id", "uuid", (col) => col.references("store.id"))
    .addColumn("chain_id", "text", (col) => col.references("chain.id"))
    .addColumn("store_name", "text")
    .addColumn("receipt_date", "date")
    .addColumn("total", "numeric")
    .addColumn("currency", "text", (col) => col.notNull().defaultTo("DKK"))
    .addColumn("confidence", "jsonb")
    .addColumn("image_path", "text")
    .addColumn("source", "text", (col) => col.notNull().defaultTo("receipt"))
    .addColumn("trust_tier", "text", (col) => col.notNull().defaultTo("community"))
    .addColumn("created_at", "timestamptz", (col) => col.notNull())
    .addColumn("updated_at", "timestamptz", (col) => col.notNull())
    .execute();

  await db.schema
    .createTable("receipt_item")
    .addColumn("id", "uuid", (col) => col.primaryKey())
    .addColumn("receipt_id", "uuid", (col) => col.notNull().references("receipt.id"))
    .addColumn("product_id", "uuid", (col) => col.references("product.id"))
    .addColumn("name", "text", (col) => col.notNull())
    .addColumn("quantity", "text")
    .addColumn("unit", "text")
    .addColumn("price", "numeric")
    .addColumn("raw_line", "text", (col) => col.notNull())
    .addColumn("status", "text", (col) => col.notNull())
    .addColumn("confidence", "text", (col) => col.notNull())
    .addColumn("created_at", "timestamptz", (col) => col.notNull())
    .execute();

  await db.schema
    .alterTable("price_point")
    .addColumn("source", "text", (col) => col.notNull().defaultTo("offer"))
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.alterTable("price_point").dropColumn("source").execute();
  await db.schema.dropTable("receipt_item").execute();
  await db.schema.dropTable("receipt").execute();
  await db.schema.dropTable("login_token").execute();
  await db.schema.dropTable("user").execute();
}
