# Bootstrap — New Dev Machine

How to get this project running on a **brand-new dev machine**, end to end. This is the "I changed machines / fresh OS install / borrowed laptop" doc. If the environment is already set up and you just need the daily commands, see `docs/setup-dev.md` instead.

**TL;DR for the impatient:** install Node 24 → install pnpm → install `vp` → add GitHub SSH key → clone → Postgres + `.env` → `vp install` → `pnpm db:migrate` → `vp check`. Then install OpenCode and you're coding.

---

## 1. Prerequisites

| Tool                                | Version                                                             | Why                                                             |
| ----------------------------------- | ------------------------------------------------------------------- | --------------------------------------------------------------- |
| **Node**                            | **>= 24** (hard requirement — `package.json` `engines` enforces it) | Runtime. Older versions refuse to build                         |
| **pnpm**                            | pins to 11.21.0 (via `devEngines`)                                  | Package manager; Vite+ drives it                                |
| **Vite+ CLI (`vp`)**                | latest                                                              | The unified toolchain (dev/build/test/check)                    |
| **OpenCode**                        | latest                                                              | The fallback coding agent                                       |
| **Postgres**                        | any recent (16 is fine)                                             | The database                                                    |
| **Tesseract + `tesseract-ocr-dan`** | any recent                                                          | Receipt OCR (Phase 3) — `-l dan` needs the Danish language data |
| **git**                             | any                                                                 | Cloning/pushing                                                 |

## 2. Install Node >= 24

> **The single most common fresh-machine failure is Node being too old.** The project hard-requires >= 24.

Recommended: install a Node version manager so you can switch:

```bash
# Option A — nvm (most common)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
nvm install 24
nvm use 24
nvm alias default 24

# Option B — Ubuntu/Pop!_OS apt (simpler but older version)
sudo apt update && sudo apt install -y nodejs
```

**Verify:**

```bash
node --version   # must be v24.x.x or higher
```

## 3. Install pnpm

```bash
corepack enable
corepack prepare pnpm@latest --activate
pnpm --version
```

> The project's `devEngines` pins pnpm 11.21.0 with `onFail: download` — pnpm/corepack auto-fetches the right version when you run `vp install`, so your global one just needs to exist.

## 4. Install the Vite+ CLI (`vp`)

```bash
curl -fsSL https://vite.plus | bash
# (Windows PowerShell: irm https://vite.plus/ps1 | iex)
```

Then open a new terminal and verify:

```bash
vp --version
vp help
```

## 5. GitHub SSH key (needed to clone/push)

The repo is **private**, so SSH is required. Generate a key and add it to GitHub:

```bash
ssh-keygen -t ed25519 -C "your-email@example.com"   # accept defaults
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_ed25519
cat ~/.ssh/id_ed25519.pub   # copy this
```

Add the public key at https://github.com/settings/ssh/new (title it for this machine, e.g. `laptop-popos`).

**Verify:**

```bash
ssh -T git@github.com
# "Hi Nicktriez! You've successfully authenticated..." = good
```

## 6. Clone the project

```bash
git clone git@github.com:Nicktriez/price-watcher.git ~/price-watcher
cd ~/price-watcher
```

**Set git identity for this machine** (the repo's own identity for your commits):

```bash
git config user.name "Nicklas Jensen"
git config user.email "jensen0710@gmail.com"
```

> The clone brings everything: `src/`, `tasks/`, `docs/reference/build-plan.md`, `docs/reference/chains.md`, and `src/lib/__fixtures__/` (real Tjek payloads).

**You also need the research repo for Phase 3 tasks.** Tasks 011 (receipt OCR), 012 (upload flow), and 016 (OCR classifier) read the OCR reference implementation (`research/ocr_receipts.py`), the human-verified findings (`research/notes/ocr-receipts.md`), and the 6 real receipt images (`research/receipts/`) — none of which are in the project repo. Clone it alongside the project:

```bash
git clone git@github.com:Nicktriez/grocery-price-watcher-research.git ~/grocery-price-watcher-research
```

OpenCode runs in `~/price-watcher` (project), but the Phase 3 OCR tasks hardcode `~/grocery-price-watcher-research/...` as their reference, so the research repo must be cloned on the same machine. The Phase 1–2 tasks don't need it; Phase 3 does.

## 7. Install & start Postgres

Debian/Pop!_OS:

```bash
sudo apt update
sudo apt install -y postgresql postgresql-contrib
sudo systemctl enable --now postgresql
```

Create the project user + database:

```bash
sudo -u postgres psql
```

```sql
CREATE USER nicklas WITH PASSWORD 'your-password-here';
CREATE DATABASE price_watcher OWNER nicklas;
\q
```

## 8. Create `.env`

`.env` is gitignored — make it by hand on each machine:

```bash
touch ~/price-watcher/.env
```

Contents:

```
DATABASE_URL=postgres://nicklas:YOUR_REAL_PASSWORD@localhost:5432/price_watcher
TJEK_BASE_URL=https://squid-api.tjek.com
```

**Verify:**

```bash
psql "$DATABASE_URL" -c "SELECT version();"   # expect version + (1 row)
```

## 9. Install deps + verify the toolchain

```bash
cd ~/price-watcher
vp install        # installs deps (pnpm-managed via Vite+)
vp check          # format + lint + type-check — must pass
vp test           # run tests — must pass
```

## 10. Run the DB migration

```bash
pnpm db:migrate   # runs src/db/migrate.ts -> migrateToLatest()
```

Re-running should be a no-op (Kysely tracks applied migrations).

**Confirm the tables exist:**

```bash
psql "$DATABASE_URL" -c "\dt"
# expect: chain, store, product, offer, price_point, list, list_item
```

## 11. Verify the app runs

```bash
vp dev            # dev server
# then in another terminal:
vp build && pnpm start   # production check
# browse to http://localhost:3000
```

## 12. Install Tesseract (receipt OCR — Phase 3)

Required for the Phase 3 OCR tasks (011/012/016). The `dan` package is what makes Danish store/product names readable:

```bash
sudo apt install -y tesseract-ocr tesseract-ocr-dan
```

**Verify:**

```bash
tesseract --list-langs   # must include 'dan'
```

> Phase 1–2 don't need this; it becomes a hard dependency when the receipt tasks start.

## 13. Install OpenCode (the coding agent)

```bash
npm i -g opencode-ai@latest
opencode auth login     # connect a provider
opencode auth list      # confirm a provider is configured
# smoke test:
opencode run 'Respond with exactly: OPENCODE_SMOKE_OK'
```

## 14. You're ready to code

Run a task by pointing OpenCode at it (you must `cd` into the repo first — OpenCode uses the current directory, there's no `--workdir` flag):

```bash
cd ~/price-watcher
opencode run 'Implement the task in tasks/002-tjek-client.md'
```

OpenCode reads `AGENTS.md` (project context + ground rules) and the referenced task file, then writes the code.

> **Phase 3 tasks** additionally reference the research repo. For those, `cd ~/price-watcher` still works (OpenCode can read files outside the cwd via absolute path), but the research repo must be cloned at `~/grocery-price-watcher-research` (see step 6) and Tesseract installed (see step 12).

---

## Machine checklist (everything in one list)

- [ ] Node >= 24 (`node --version`)
- [ ] pnpm installed (`pnpm --version`)
- [ ] `vp` CLI installed (`vp --version`)
- [ ] GitHub SSH key added (private repo access)
- [ ] Repo cloned (`git clone ... ~/price-watcher`)
- [ ] Research repo cloned (`~/grocery-price-watcher-research`) — required for Phase 3 OCR tasks
- [ ] git identity set (`user.name` / `user.email`)
- [ ] Postgres running
- [ ] `nicklas` user + `price_watcher` DB created
- [ ] `.env` created with `DATABASE_URL` + `TJEK_BASE_URL`
- [ ] `vp install` succeeded
- [ ] `pnpm db:migrate` ran (7 tables exist)
- [ ] `vp check` + `vp test` pass
- [ ] `vp dev` serves the app
- [ ] Tesseract installed (`tesseract --list-langs` includes `dan`) — Phase 3
- [ ] OpenCode installed + authenticated

## Troubleshooting

| Symptom                                              | Fix                                                                                       |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `node --version` < 24                                | Install/switch to Node 24 (nvm) — the project refuses to build otherwise                  |
| `ssh: Permission denied (publickey)` on clone        | Key not added to GitHub; re-check `ssh -T git@github.com`                                 |
| `vp: command not found`                              | Global install not on PATH after install — open a new terminal, or check `vp env doctor`  |
| `DATABASE_URL` not picked up                         | `.env` exists in repo root? correct `postgres://` prefix?                                 |
| `pnpm db:migrate` fails                              | Postgres not running, or `nicklas` lacks rights on `price_watcher`                        |
| `vp check` fails                                     | Usually Node too old, or deps not installed — run `vp install` first                      |
| OpenCode wrong binary                                | `which -a opencode` to confirm which one resolves                                         |
| Phase 3 task can't find `ocr_receipts.py` / receipts | Research repo not cloned at `~/grocery-price-watcher-research` — clone it (step 6)        |
| `tesseract --list-langs` missing `dan`               | `tesseract-ocr-dan` not installed — `sudo apt install -y tesseract-ocr tesseract-ocr-dan` |

## Where production runs (NOT this machine)

| Machine                 | Role                 | DB                                                        |
| ----------------------- | -------------------- | --------------------------------------------------------- |
| **Dev machine**         | OpenCode + local dev | Local Postgres via `.env`                                 |
| **Hetzner VPS** (later) | Production hosting   | Its own Postgres, separate `.env` — set up at deploy time |
