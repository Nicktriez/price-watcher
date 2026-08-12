import type { Kysely } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable("chain")
    .addColumn("id", "text", (col) => col.primaryKey())
    .addColumn("name", "text", (col) => col.notNull())
    .addColumn("tjek_dealer_id", "text", (col) => col.notNull())
    .addColumn("website", "text")
    .addColumn("logo_url", "text")
    .execute();

  await db.schema
    .createTable("store")
    .addColumn("id", "uuid", (col) => col.primaryKey())
    .addColumn("chain_id", "text", (col) => col.notNull().references("chain.id"))
    .addColumn("name", "text", (col) => col.notNull())
    .addColumn("address", "text")
    .addColumn("city", "text")
    .addColumn("zip", "text")
    .addColumn("lat", "double precision")
    .addColumn("lon", "double precision")
    .execute();

  await db.schema
    .createTable("product")
    .addColumn("id", "uuid", (col) => col.primaryKey())
    .addColumn("name", "text", (col) => col.notNull())
    .addColumn("brand", "text")
    .addColumn("ean", "text")
    .addColumn("unit", "text")
    .addColumn("size_grams", "double precision")
    .execute();

  await db.schema
    .createTable("offer")
    .addColumn("id", "uuid", (col) => col.primaryKey())
    .addColumn("product_id", "uuid", (col) => col.notNull().references("product.id"))
    .addColumn("store_id", "uuid", (col) => col.references("store.id"))
    .addColumn("catalog_id", "text", (col) => col.notNull())
    .addColumn("dealer_id", "text", (col) => col.notNull())
    .addColumn("heading", "text", (col) => col.notNull())
    .addColumn("description", "text")
    .addColumn("catalog_page", "integer")
    .addColumn("price", "numeric", (col) => col.notNull())
    .addColumn("pre_price", "numeric")
    .addColumn("currency", "text", (col) => col.notNull())
    .addColumn("unit", "text")
    .addColumn("size_from", "integer")
    .addColumn("size_to", "integer")
    .addColumn("pieces_from", "integer")
    .addColumn("pieces_max", "integer")
    .addColumn("image_url", "text")
    .addColumn("valid_from", "timestamptz", (col) => col.notNull())
    .addColumn("valid_to", "timestamptz", (col) => col.notNull())
    .addColumn("published_at", "timestamptz")
    .addColumn("source", "text", (col) => col.notNull())
    .addColumn("trust_tier", "text", (col) => col.notNull())
    .addColumn("internal", "boolean", (col) => col.notNull())
    .addColumn("raw_json", "jsonb", (col) => col.notNull())
    .addColumn("created_at", "timestamptz", (col) => col.notNull())
    .addColumn("updated_at", "timestamptz", (col) => col.notNull())
    .execute();

  await db.schema
    .createTable("price_point")
    .addColumn("id", "uuid", (col) => col.primaryKey())
    .addColumn("offer_id", "uuid", (col) => col.notNull().references("offer.id"))
    .addColumn("product_id", "uuid", (col) => col.notNull().references("product.id"))
    .addColumn("store_id", "uuid", (col) => col.notNull().references("store.id"))
    .addColumn("price", "numeric", (col) => col.notNull())
    .addColumn("currency", "text", (col) => col.notNull())
    .addColumn("observed_at", "timestamptz", (col) => col.notNull())
    .execute();

  await db.schema
    .createTable("list")
    .addColumn("id", "uuid", (col) => col.primaryKey())
    .addColumn("user_id", "text")
    .addColumn("name", "text", (col) => col.notNull())
    .addColumn("kind", "text", (col) => col.notNull())
    .addColumn("template_id", "text")
    .execute();

  await db.schema
    .createTable("list_item")
    .addColumn("id", "uuid", (col) => col.primaryKey())
    .addColumn("list_id", "uuid", (col) => col.notNull().references("list.id"))
    .addColumn("product_id", "uuid", (col) => col.references("product.id"))
    .addColumn("free_text", "text")
    .addColumn("quantity", "integer")
    .addColumn("unit", "text")
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable("list_item").execute();
  await db.schema.dropTable("list").execute();
  await db.schema.dropTable("price_point").execute();
  await db.schema.dropTable("offer").execute();
  await db.schema.dropTable("product").execute();
  await db.schema.dropTable("store").execute();
  await db.schema.dropTable("chain").execute();
}
