import type { Kysely } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable("crowd_report")
    .addColumn("points_awarded", "numeric", (col) => col.notNull().defaultTo(0))
    .execute();
  await db.schema.alterTable("crowd_report").addColumn("last_awarded_tier", "text").execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.alterTable("crowd_report").dropColumn("last_awarded_tier").execute();
  await db.schema.alterTable("crowd_report").dropColumn("points_awarded").execute();
}
