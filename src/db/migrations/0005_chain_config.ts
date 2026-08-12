import { sql, type Kysely } from "kysely";

interface ChainSeed {
  id: string;
  name: string;
  tjek_dealer_id: string;
  website: string | null;
  logo_url: string | null;
  priority: number;
}

const CHAINS: ChainSeed[] = [
  {
    id: "rema1000",
    name: "REMA 1000",
    tjek_dealer_id: "11deC",
    website: "https://rema1000.dk/",
    logo_url:
      "https://image-transformer-api.tjek.com/?u=s3%3A%2F%2Fsgn-prd-assets%2Fuploads%2F11deC%2FNSL4hmIeysfy2UPYcO5BT&w=160&s=d739cea3657d0f25af9c840b04b4ed21",
    priority: 1,
  },
  {
    id: "netto",
    name: "Netto",
    tjek_dealer_id: "9ba51",
    website: "https://netto.dk/",
    logo_url: null,
    priority: 1,
  },
  {
    id: "bilka",
    name: "Bilka",
    tjek_dealer_id: "93f13",
    website: "https://bilka.dk/",
    logo_url: null,
    priority: 1,
  },
  {
    id: "foetex",
    name: "Føtex",
    tjek_dealer_id: "bdf5A",
    website: "https://foetex.dk/",
    logo_url: null,
    priority: 1,
  },
  {
    id: "kvickly",
    name: "Kvickly",
    tjek_dealer_id: "c1edq",
    website: "https://kvickly.dk/",
    logo_url: null,
    priority: 1,
  },
  {
    id: "superbrugsen",
    name: "SuperBrugsen",
    tjek_dealer_id: "0b1e8",
    website: "https://superbrugsen.dk/",
    logo_url: null,
    priority: 1,
  },
  {
    id: "365discount",
    name: "365discount",
    tjek_dealer_id: "DWZE1w",
    website: "https://365discount.coop.dk/",
    logo_url: null,
    priority: 1,
  },
  {
    id: "lidl",
    name: "Lidl",
    tjek_dealer_id: "71c90",
    website: "https://lidl.dk/",
    logo_url: null,
    priority: 2,
  },
  {
    id: "brugsen",
    name: "Brugsen",
    tjek_dealer_id: "d311fg",
    website: "https://brugsen.coop.dk/",
    logo_url: null,
    priority: 3,
  },
  {
    id: "spar",
    name: "SPAR",
    tjek_dealer_id: "88ddE",
    website: "https://spar.dk/",
    logo_url: null,
    priority: 3,
  },
  {
    id: "meny",
    name: "MENY",
    tjek_dealer_id: "267e1m",
    website: "https://meny.dk/",
    logo_url: null,
    priority: 3,
  },
];

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable("chain")
    .addColumn("priority", "integer", (col) => col.notNull().defaultTo(0))
    .execute();

  for (const c of CHAINS) {
    await sql`
      insert into "chain" ("id", "name", "tjek_dealer_id", "website", "logo_url", "priority")
      values (${c.id}, ${c.name}, ${c.tjek_dealer_id}, ${c.website}, ${c.logo_url}, ${c.priority})
      on conflict ("id") do update set
        "name" = excluded."name",
        "tjek_dealer_id" = excluded."tjek_dealer_id",
        "website" = excluded."website",
        "logo_url" = excluded."logo_url",
        "priority" = excluded."priority"
    `.execute(db);
  }
}

export async function down(db: Kysely<unknown>): Promise<void> {
  for (const c of CHAINS) {
    if (c.id !== "rema1000") {
      await sql`delete from "chain" where "id" = ${c.id}`.execute(db);
    }
  }
  await db.schema.alterTable("chain").dropColumn("priority").execute();
}
