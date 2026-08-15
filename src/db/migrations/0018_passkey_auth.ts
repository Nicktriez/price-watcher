import type { Kysely } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable("passkey_credential")
    .addColumn("id", "uuid", (col) => col.primaryKey())
    .addColumn("user_id", "uuid", (col) => col.notNull().references("user.id"))
    .addColumn("credential_id", "text", (col) => col.notNull().unique())
    .addColumn("public_key", "text", (col) => col.notNull())
    .addColumn("counter", "bigint", (col) => col.notNull())
    .addColumn("transports", "jsonb")
    .addColumn("created_at", "timestamptz", (col) => col.notNull())
    .addColumn("last_used_at", "timestamptz")
    .execute();

  await db.schema
    .createTable("webauthn_challenge")
    .addColumn("id", "uuid", (col) => col.primaryKey())
    .addColumn("user_id", "uuid")
    .addColumn("challenge_hash", "text", (col) => col.notNull())
    .addColumn("user_handle", "text")
    .addColumn("expires_at", "timestamptz", (col) => col.notNull())
    .addColumn("created_at", "timestamptz", (col) => col.notNull())
    .execute();

  await db.schema
    .alterTable("user")
    .alterColumn("email", (col) => col.dropNotNull())
    .execute();
  await db.schema
    .alterTable("user")
    .addColumn("user_handle", "text", (col) => col.unique())
    .execute();

  await db.schema.dropTable("login_token").execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable("login_token")
    .addColumn("id", "uuid", (col) => col.primaryKey())
    .addColumn("user_id", "uuid", (col) => col.notNull().references("user.id"))
    .addColumn("token", "text", (col) => col.notNull())
    .addColumn("expires_at", "timestamptz", (col) => col.notNull())
    .addColumn("used_at", "timestamptz")
    .addColumn("created_at", "timestamptz", (col) => col.notNull())
    .execute();

  await db.schema.alterTable("user").dropColumn("user_handle").execute();
  await db.schema
    .alterTable("user")
    .alterColumn("email", (col) => col.setNotNull())
    .execute();
  await db.schema.dropTable("webauthn_challenge").execute();
  await db.schema.dropTable("passkey_credential").execute();
}
