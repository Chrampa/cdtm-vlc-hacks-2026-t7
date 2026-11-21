# Open Data Analysis — Hub Plan

Roles: the Hub coordinator (Claude) coordinates the 5 sibling sub-projects (`opendata`,
`audiences`, `campaigns-discovery`, `ai-catalogs`, `vistomi`), maintains `docs/CONTRACTS.md`,
and delegates both cross-project analytical code (in this hub repo) and member changes (in sibling
repos) using hybrid delegation (direct workers for scoped tasks; member coordinators for large
autonomous phases). Each task ends with a report in `docs/reports/`.

## Goal

Run the **Open Data Analysis** group as one coherent intelligence and analytical system around a
single entry point:
1. Coordinate roadmap, data quality, and schema contracts across `opendata`, `audiences`,
   `campaigns discovery`, `ai-catalogs`, and `vistomi`.
2. Build unified cross-project views, joins, and reports inside this hub (reading member outputs
   read-only) to connect:
   - paying audiences & US trademark activity (`audiences`),
   - live EU/global market & app/domain signals (`opendata`),
   - EU Meta ad spend & affiliate demand (`campaigns discovery`),
   - AI catalog/directory citation sources (`ai-catalogs`),
   - AI recommendation visibility & product positioning (`vistomi`).

## Facts (verified 2026-11-19)

- Orca project group: **Open Data Analysis** (`id=2fd93fa6-c85e-49d7-9c2e-d0860f7df332`), 5 member repos registered in `hub.toml` / `docs/PROJECTS.md`.
- `opendata`: Python (`uv`), scheduled collectors (`openrouter`, `appstore`, `trustmrr`, `gtrends`, `ct`), DuckDB SQL interface (`uv run opendata sql`).
- `audiences`: Python (`uv`), protocol-hashed (`protocol.md` / `protocol.sha256`), interim parquets (`data/interim/*.parquet`, incl. 239M `tm_software.parquet`) and v3 rankings (`out/v3_ranking.csv`, `out/spain_overlay.csv`, `out/report_v3.md`).
- `campaigns discovery`: Python + Docker Compose PostgreSQL (`localhost:55432`, `data/postgres`), Meta Ad Library + affiliate network exports (`exports/*.csv`, `exports/*.md`). Path contains a space.
- `ai-catalogs`: already configured with `coordinator@1.2.0` (`docs/PLAN.md`, `docs/reports/`).
- `vistomi`: AI visibility/recommendation product repo (`docs/`, `design/`, `landing/`, GitHub `Kkordik/vistomi`).

## Cross-project roadmap

| Phase | Scope (repos) | Goal | Status | Report |
|---|---|---|---|---|
| 0 | hub + all 5 members | Lock read-only contract check (`scripts/check_contracts.py`) verifying exact schemas, row counts, and freshness across `opendata`, `audiences`, `campaigns-discovery`, `ai-catalogs`, and `vistomi` | planned | — |
| 1 | hub | Build unified read-only DuckDB analytical layer (`sql/` / `scripts/`) joining domains, NAICS/audiences, EU ad activity, and market signals | planned | — |
| 2 | hub + `ai-catalogs` + `vistomi` | Connect AI citation/catalog data and audience/ad demand signals into unified cross-project briefs for `vistomi` | planned | — |

## Decisions

- **2026-11-19 — Hub architecture:** Created `open-data-hub` as a management + analytical hub (`hub@1.0.0`, hybrid delegation) rather than merging the 5 repositories into a monorepo. Member repos keep owning their collectors, databases, and protocols; this hub owns cross-project contracts, coordination, read-only analytical views, and unified reports.

## Rules for workers (hub-specific)

- Read member sub-project databases, parquet files, and CSVs strictly **read-only**.
- Never duplicate a member's scraping/collection logic in this hub; dispatch collector changes to the target member repo.
- Always quote paths when touching `/home/user/orca/projects/campaigns discovery`.
- Respect `audiences/protocol.md` + `protocol.sha256` — never silently modify `audiences` outputs from hub scripts.
- Check `docs/CONTRACTS.md` before changing any shared output path, table, or join key.
