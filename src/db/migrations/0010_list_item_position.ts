import { sql, type Kysely } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable("list_item")
    .addColumn("position", "integer", (col) => col.notNull().defaultTo(0))
    .execute();
  await db.schema
    .alterTable("list")
    .addColumn("created_at", "timestamptz", (col) => col.notNull().defaultTo(sql`now()`))
    .execute();
  await db.schema
    .alterTable("list")
    .addColumn("updated_at", "timestamptz", (col) => col.notNull().defaultTo(sql`now()`))
    .execute();
  await db.schema
    .alterTable("list_item")
    .addColumn("created_at", "timestamptz", (col) => col.notNull().defaultTo(sql`now()`))
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.alterTable("list_item").dropColumn("created_at").execute();
  await db.schema.alterTable("list").dropColumn("updated_at").execute();
  await db.schema.alterTable("list").dropColumn("created_at").execute();
  await db.schema.alterTable("list_item").dropColumn("position").execute();
}
