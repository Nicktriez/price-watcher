import type { Kysely } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable("crowd_report_flag")
    .addColumn("id", "uuid", (col) => col.primaryKey())
    .addColumn("crowd_report_id", "uuid", (col) => col.notNull().references("crowd_report.id"))
    .addColumn("flagger_user_id", "uuid", (col) => col.notNull().references("user.id"))
    .addColumn("reason", "text", (col) => col.notNull())
    .addColumn("created_at", "timestamptz", (col) => col.notNull())
    .execute();

  await db.schema
    .alterTable("crowd_report")
    .addColumn("status", "text", (col) => col.notNull().defaultTo("active"))
    .execute();

  await db.schema
    .alterTable("user")
    .addColumn("muted", "boolean", (col) => col.notNull().defaultTo(false))
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.alterTable("user").dropColumn("muted").execute();
  await db.schema.alterTable("crowd_report").dropColumn("status").execute();
  await db.schema.dropTable("crowd_report_flag").execute();
}
