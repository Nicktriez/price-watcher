import { sql, type Kysely } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema.alterTable("user").addColumn("home_address", "text").execute();
  await db.schema.alterTable("user").addColumn("home_lat", "double precision").execute();
  await db.schema.alterTable("user").addColumn("home_lon", "double precision").execute();

  await db.schema
    .createTable("user_store_distance")
    .addColumn("user_id", "uuid", (col) => col.notNull().references("user.id"))
    .addColumn("store_id", "uuid", (col) => col.notNull().references("store.id"))
    .addColumn("distance_km", "double precision", (col) => col.notNull())
    .addColumn("round_trip_km", "double precision", (col) => col.notNull())
    .addColumn("updated_at", "timestamptz", (col) => col.notNull().defaultTo(sql`now()`))
    .addPrimaryKeyConstraint("user_store_distance_pk", ["user_id", "store_id"])
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable("user_store_distance").execute();
  await db.schema.alterTable("user").dropColumn("home_lon").execute();
  await db.schema.alterTable("user").dropColumn("home_lat").execute();
  await db.schema.alterTable("user").dropColumn("home_address").execute();
}
