# Dev Setup

How to get this project running on a dev machine (e.g. the laptop where OpenCode runs). This is for **local development** — production hosting is a separate Hetzner box configured at deploy time.

## Prerequisites

- **Node >= 24** (the `package.json` `engines` field enforces it — check with `node --version`)
- **pnpm** (the project is pnpm-managed; `devEngines` pins it. `corepack enable && corepack prepare pnpm@latest --activate` if needed)
- **Postgres** (any recent version; 16 is fine)
- **Vite+ CLI (`vp`)** — install once, `vp install` in the project pulls everything else

## Install & start Postgres

Pop!_OS / Ubuntu (Debian-family):

```bash
sudo apt update
sudo apt install -y postgresql postgresql-contrib
sudo systemctl enable --now postgresql
```

## Create the project user + database

```bash
sudo -u postgres psql
```

```sql
CREATE USER nicklas WITH PASSWORD 'your-password-here';
CREATE DATABASE price_watcher OWNER nicklas;
\q
```

> The username/password here are for **local dev only** — localhost-bound, no exposure. Production secrets get a proper story on Hetzner later.

## Create the `.env` file

`.env` is gitignored (confirmed in `.gitignore` — `.env` and `.env*.local`) so it's never committed. Create it by hand on each machine:

```bash
cd ~/price-watcher
touch .env
```

Contents:

```
DATABASE_URL=postgres://nicklas:YOUR_REAL_PASSWORD@localhost:5432/price_watcher
TJEK_BASE_URL=https://squid-api.tjek.com
```

Replace `YOUR_REAL_PASSWORD` with the one you set when creating the user.

## Verify the connection

```bash
psql "$DATABASE_URL" -c "SELECT version();"
```

You should see the Postgres version string and `(1 row)`.

## Install project deps & run the toolchain

```bash
cd ~/price-watcher
vp install          # installs dependencies (the project is pnpm-managed via Vite+)
vp check            # format + lint + type-check
vp test             # run tests
```

## Run the DB migration (after Task 001)

Once the Kysely schema task is done:

```bash
pnpm db:migrate     # runs src/db/migrate.ts -> migrateToLatest()
```

Re-running it should be a no-op (Kysely tracks applied migrations).

## Where dev happens vs. production

| Machine | Role | DB |
|---|---|---|
| **Laptop** (`~/price-watcher`) | Where OpenCode runs + local dev | Local Postgres via `DATABASE_URL` |
| **Hetzner VPS** (later) | Production hosting | Its own Postgres, configured at deploy — separate `.env` |

## Troubleshooting

- `DATABASE_URL` not picked up → confirm `.env` exists in the repo root and isn't typos'd (e.g. `postgres://` not `postgresql://`).
- `vp` command not found → it's a global install; see the Prerequisites. `vp env doctor` helps when toolchain behavior looks wrong.
- Migrations fail → check Postgres is running (`sudo systemctl status postgresql`) and the user has rights on the DB.
