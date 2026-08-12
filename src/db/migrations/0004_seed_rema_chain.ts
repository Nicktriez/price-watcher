import { sql, type Kysely } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    insert into "chain" ("id", "name", "tjek_dealer_id", "website", "logo_url")
    values (
      'rema1000',
      'REMA 1000',
      '11deC',
      'https://rema1000.dk/',
      'https://image-transformer-api.tjek.com/?u=s3%3A%2F%2Fsgn-prd-assets%2Fuploads%2F11deC%2FNSL4hmIeysfy2UPYcO5BT&w=160&s=d739cea3657d0f25af9c840b04b4ed21'
    )
    on conflict ("id") do nothing
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`delete from "chain" where "id" = 'rema1000'`.execute(db);
}
