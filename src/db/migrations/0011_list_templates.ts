import { sql, type Kysely } from "kysely";

interface TemplateItemSeed {
  name: string;
  match: string | null;
  quantity: number | null;
  unit: string | null;
}

interface TemplateSeed {
  name: string;
  kind: string;
  items: TemplateItemSeed[];
}

const TEMPLATES: TemplateSeed[] = [
  {
    name: "Lasagne",
    kind: "recipe",
    items: [
      { name: "Lasagneplader", match: "%lasagneplader%", quantity: 1, unit: "pk" },
      { name: "Hakket oksekød", match: "%hakket oksekød%", quantity: 400, unit: "g" },
      { name: "Hakkede tomater", match: "%hakkede tomater%", quantity: 2, unit: "dåser" },
      { name: "Løg", match: null, quantity: 2, unit: "stk" },
      { name: "Hvidløg", match: null, quantity: 2, unit: "stk" },
      { name: "Revet ost", match: "%revet ost%", quantity: 150, unit: "g" },
      { name: "Mælk", match: null, quantity: 5, unit: "dl" },
    ],
  },
  {
    name: "Frikadeller + kartofler",
    kind: "recipe",
    items: [
      { name: "Hakket svinekød", match: null, quantity: 500, unit: "g" },
      { name: "Kartofler", match: "%kartofler%", quantity: 1, unit: "kg" },
      { name: "Æg", match: null, quantity: 2, unit: "stk" },
      { name: "Løg", match: null, quantity: 1, unit: "stk" },
      { name: "Hvedemel", match: null, quantity: 100, unit: "g" },
      { name: "Mælk", match: null, quantity: 1, unit: "dl" },
    ],
  },
  {
    name: "Taco-fredag",
    kind: "recipe",
    items: [
      { name: "Taco shells", match: null, quantity: 1, unit: "pk" },
      { name: "Hakket oksekød", match: "%hakket oksekød%", quantity: 400, unit: "g" },
      { name: "Salsa", match: "%salsa%", quantity: 1, unit: "glas" },
      { name: "Revet ost", match: "%revet ost%", quantity: 150, unit: "g" },
      { name: "Majs", match: null, quantity: 1, unit: "dåse" },
      { name: "Salat", match: null, quantity: 1, unit: "stk" },
    ],
  },
  {
    name: "Kødsovs",
    kind: "recipe",
    items: [
      { name: "Spaghetti", match: "%spaghetti%", quantity: 500, unit: "g" },
      { name: "Hakket oksekød", match: "%hakket oksekød%", quantity: 500, unit: "g" },
      { name: "Hakkede tomater", match: "%hakkede tomater%", quantity: 2, unit: "dåser" },
      { name: "Løg", match: null, quantity: 2, unit: "stk" },
      { name: "Hvidløg", match: null, quantity: 2, unit: "stk" },
      { name: "Tomatpuré", match: "%tomatpuré%", quantity: 1, unit: "tube" },
    ],
  },
  {
    name: "Cleaning cupboard",
    kind: "cleaning",
    items: [
      { name: "Opvaskemiddel", match: "%opvaskemiddel%", quantity: 1, unit: "flaske" },
      { name: "Skyllemiddel", match: "%skyllemiddel%", quantity: 1, unit: "flaske" },
      { name: "Vaskemiddel", match: "%vaskemiddel%", quantity: 1, unit: "pose" },
      { name: "Opvaskesvampe", match: null, quantity: 1, unit: "pk" },
      { name: "Mikrofiberklude", match: null, quantity: 1, unit: "pk" },
      { name: "Køkkenrulle", match: null, quantity: 1, unit: "pk" },
    ],
  },
  {
    name: "Student-budget",
    kind: "custom",
    items: [
      { name: "Spaghetti", match: "%spaghetti%", quantity: 1, unit: "kg" },
      { name: "Ris", match: null, quantity: 1, unit: "kg" },
      { name: "Hakket oksekød", match: "%hakket oksekød%", quantity: 500, unit: "g" },
      { name: "Æg", match: null, quantity: 10, unit: "stk" },
      { name: "Havregryn", match: "%havregryn%", quantity: 1, unit: "kg" },
      { name: "Kaffe", match: "%kaffe%", quantity: 1, unit: "pk" },
    ],
  },
  {
    name: "Burger-fredag",
    kind: "recipe",
    items: [
      { name: "Burgerboller", match: "%burgerbolle%", quantity: 4, unit: "stk" },
      { name: "Hakket oksekød", match: "%hakket oksekød%", quantity: 500, unit: "g" },
      { name: "Ost til burger", match: null, quantity: 4, unit: "skiver" },
      { name: "Bacon", match: null, quantity: 1, unit: "pk" },
      { name: "Salat", match: null, quantity: 1, unit: "stk" },
      { name: "Tomat", match: null, quantity: 2, unit: "stk" },
    ],
  },
  {
    name: "Ugens grøntsager",
    kind: "custom",
    items: [
      { name: "Kartofler", match: "%kartofler%", quantity: 2, unit: "kg" },
      { name: "Gulerødder", match: null, quantity: 1, unit: "kg" },
      { name: "Løg", match: null, quantity: 1, unit: "kg" },
      { name: "Broccoli", match: "%broccoli%", quantity: 1, unit: "stk" },
      { name: "Spinat", match: null, quantity: 1, unit: "pose" },
    ],
  },
];

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
