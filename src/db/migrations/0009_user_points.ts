import type { Kysely } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable("user")
    .addColumn("points", "integer", (col) => col.notNull().defaultTo(0))
    .execute();
  await db.schema
    .alterTable("user")
    .addColumn("receipt_count", "integer", (col) => col.notNull().defaultTo(0))
    .execute();
  await db.schema
    .alterTable("user")
    .addColumn("current_streak", "integer", (col) => col.notNull().defaultTo(0))
    .execute();
  await db.schema.alterTable("user").addColumn("last_receipt_date", "date").execute();
  await db.schema
    .alterTable("receipt")
    .addColumn("points_awarded", "integer", (col) => col.notNull().defaultTo(0))
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.alterTable("receipt").dropColumn("points_awarded").execute();
  await db.schema.alterTable("user").dropColumn("last_receipt_date").execute();
  await db.schema.alterTable("user").dropColumn("current_streak").execute();
  await db.schema.alterTable("user").dropColumn("receipt_count").execute();
  await db.schema.alterTable("user").dropColumn("points").execute();
}
