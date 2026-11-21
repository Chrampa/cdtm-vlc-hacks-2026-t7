# Open Data Analysis — Cross-Project Data Contracts

Single source of truth for shared outputs, databases, schemas, and join keys across the 5 member
sub-projects. Analytical views and scripts in this hub read member outputs **read-only**.

> Before changing any producer output path, column, or table listed here, check every listed
> consumer and coordinate the update from this hub.

## Producer outputs (verified 2026-11-19)

| Member | Artifact / DB | Format & location | Key entities / join keys | Freshness / refresh trigger | Consumers |
|---|---|---|---|---|---|
| `opendata` | Parsed open-data datasets & DuckDB views | `/home/user/orca/projects/opendata` (`OPENDATA_DATA_DIR` / `config.yaml`, `uv run opendata sql`, `uv run opendata catalog`) | OpenRouter models/apps/rankings, EU App Store (`ES, PT, FR, DE, IT, GB`) charts & reviews, TrustMRR startups, Google Trends RSS, CT `new_domains` | Daily / hourly collectors (`systemd/` & `uv run opendata collect`) | hub, `vistomi` |
| `audiences` | Segment & USPTO trademark interim parquets | `/home/user/orca/projects/audiences/data/interim/*.parquet` (`naics_index`, `naics_titles`, `ntee_codes`, `qcew`, `segment_metrics`, `tm_software`, `tm_matches`, `tm_segment_counts`, `phrase_counts`) | NAICS / NTEE codes, paying audience segments, USPTO software trademarks, normalized phrases | Protocol-governed batch rebuilds (`protocol.md` + `protocol.sha256`) | hub, `campaigns-discovery`, `vistomi` |
| `audiences` | Ranked audience tables & Spain overlay | `/home/user/orca/projects/audiences/out/` (`v3_ranking.csv`, `v3_audiences.csv`, `v3_consumer_audiences.csv`, `segments.csv`, `spain_overlay.csv`, `report_v3.md`) | Audience slug / segment ID, NAICS, Spain overlay metrics | Protocol-governed batch rebuilds (last build 2026-11-18) | hub, `campaigns-discovery`, `vistomi` |
| `campaigns-discovery` | Affiliate & Meta Ad Library DB + exports | PostgreSQL on `localhost:55432` (`/home/user/orca/projects/campaigns discovery/data/postgres`, `compose.yaml`) + CSV/MD exports in `exports/` (`offers-with-ads.csv`, `category-ad-activity.csv`, `fixed-payouts.csv`, `network-payout-comparison.csv`, `cr-epc.csv`, `saas-top50-2026-11-05.md`) | Advertisers, domains, Meta ad campaigns, affiliate offers/networks, SaaS categories | On-demand collector runs + snapshots (`exports/database-final.dump`) | hub, `vistomi` |
| `ai-catalogs` | AI catalog & directory research | `/home/user/orca/projects/ai-catalogs` (`docs/PLAN.md`, `docs/reports/`) — uses `coordinator@1.2.0` | AI directories, citation/source domains, category taxonomies | Coordinator-driven phases | hub, `vistomi` |
| `vistomi` | Product specs, market & competitor docs | `/home/user/orca/projects/vistomi/docs/` (`product-spec.md`, `market-europe.md`, `competitors.md`, `dashboard.md`, `pricing.md`, `business-plan.md`) | European SMB/B2B categories, AI recommendation sources (ChatGPT/Gemini/Perplexity), tracked domains | Product & GTM iterations | hub (aligns analytical priorities with product needs) |

## Known cross-project links to normalize

- `campaigns discovery` currently has a manual symlink `audiences -> ../audiences` (verified 2026-11-19). Prefer keeping cross-project joins and shared views inside `open-data-hub` rather than adding more ad-hoc symlinks between member repos.
- `campaigns discovery` has a space in its directory path (`/home/user/orca/projects/campaigns discovery`) — always quote paths in shell commands and DuckDB/Python configs.

## Shared entity & join conventions (to lock in Phase 0)

- **Domain:** lowercase registrable domain (strip scheme, `www.`, trailing slash, path) — links `opendata` (CT `new_domains`, TrustMRR, OpenRouter apps), `campaigns-discovery` (advertiser/offer domains), `ai-catalogs` (catalog domains), and `vistomi` (recommended/cited domains).
- **Industry / audience:** NAICS / NTEE / `audiences` v3 segment IDs — links `audiences` (`v3_ranking.csv`, `segment_metrics.parquet`, `tm_matches.parquet`) with `campaigns-discovery` categories and `vistomi` EU target verticals.
- **Geography:** ISO 3166-1 alpha-2 (`ES, PT, FR, DE, IT, GB, US, …`) — links `opendata` EU App Store charts, `audiences` `spain_overlay.csv` / US QCEW/USPTO, `campaigns-discovery` EU Meta ads, and `vistomi` EU markets.
- **Time:** UTC ISO-8601 dates/timestamps for all cross-project snapshots.

## Validation checks

- TODO (Phase 0): add a read-only contract check script in this hub (e.g. `scripts/check_contracts.py`) verifying that expected parquet/CSV/DuckDB/Postgres sources exist and match declared columns.
