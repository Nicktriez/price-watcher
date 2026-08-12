import { Kysely, PostgresDialect } from "kysely";
import pg from "pg";
import type { Database } from "./schema.ts";

if (!process.env.DATABASE_URL) {
  try {
    process.loadEnvFile();
  } catch {
    // no .env file; DATABASE_URL must come from the environment
  }
}

const { Pool } = pg;

export const db = new Kysely<Database>({
  dialect: new PostgresDialect({
    pool: new Pool({
      connectionString: process.env.DATABASE_URL,
    }),
  }),
});
