import { sql, type Kysely } from "kysely";
import { TEMPLATES } from "../template-seed.ts";

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable("list_template")
    .addColumn("id", "uuid", (col) => col.primaryKey())
    .addColumn("name", "text", (col) => col.notNull())
    .addColumn("kind", "text", (col) => col.notNull())
    .addColumn("position", "integer", (col) => col.notNull().defaultTo(0))
    .addColumn("created_at", "timestamptz", (col) => col.notNull().defaultTo(sql`now()`))
    .execute();

  await db.schema
    .createTable("list_template_item")
    .addColumn("id", "uuid", (col) => col.primaryKey())
    .addColumn("template_id", "uuid", (col) => col.notNull().references("list_template.id"))
    .addColumn("product_id", "uuid", (col) => col.references("product.id"))
    .addColumn("free_text", "text")
    .addColumn("quantity", "integer")
    .addColumn("unit", "text")
    .addColumn("position", "integer", (col) => col.notNull().defaultTo(0))
    .addColumn("created_at", "timestamptz", (col) => col.notNull().defaultTo(sql`now()`))
    .execute();

  for (let t = 0; t < TEMPLATES.length; t++) {
    const template = TEMPLATES[t];
    const tid = (
      await sql<{ id: string }>`
        INSERT INTO list_template (id, name, kind, position)
        VALUES (gen_random_uuid(), ${template.name}, ${template.kind}, ${t})
        RETURNING id
      `.execute(db)
    ).rows[0].id;

    for (let i = 0; i < template.items.length; i++) {
      const item = template.items[i];
      let productId: string | null = null;
      if (item.match) {
        const match = (
          await sql<{ id: string }>`
            SELECT id FROM product WHERE name ILIKE ${item.match} ORDER BY LENGTH(name) LIMIT 1
          `.execute(db)
        ).rows[0];
        productId = match?.id ?? null;
      }
      const freeText = productId ? null : item.name;
      await sql`
        INSERT INTO list_template_item (id, template_id, product_id, free_text, quantity, unit, position)
        VALUES (gen_random_uuid(), ${tid}, ${productId}, ${freeText}, ${item.quantity}, ${item.unit}, ${i})
      `.execute(db);
    }
  }
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable("list_template_item").execute();
  await db.schema.dropTable("list_template").execute();
}
