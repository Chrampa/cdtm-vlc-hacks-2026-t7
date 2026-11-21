# Agents Guide — Insider · AI Talent Matcher

This repository (`/home/user/orca/projects/cdtm-vlc-hacks-2026-t7`) is the **Insider · AI Talent Matcher** hackathon project (Team T7 · CDTM Valencia Hacks 2026 · NTT DATA case).

## Read first
- `docs/PLAN.md` — current build state, architecture, runtime URLs, and remaining checklist.
- `docs/DATASET.md` — verified structural facts about the 190,000 synthetic profiles in `data/profiles.parquet`.
- `README.md` — API, matching rules, CP-SAT team optimiser, and local/Docker run commands.
- `docs/case/` — official NTT DATA case PDFs.

## Key commands
- **Run unit tests (16 tests on real dataset, no AI calls):**
  ```bash
  uv run pytest -v
  ```
- **Build frontend (TypeScript check + Vite bundle served by FastAPI):**
  ```bash
  cd web && npm run build
  ```
- **Restart live service & verify health:**
  ```bash
  systemctl --user restart insider-talent-matcher
  curl -sf http://127.0.0.1:8765/api/health
  ```
- **Live URLs:** local `http://127.0.0.1:8765` · tailnet `https://pc.tailf0e19d.ts.net:8447` (`/` serves the People UI in `web/src/designs/people/PeopleApp.tsx`).

## Project rules
- **Hard filters are never skipped:** availability, minimum years, location, and mobility must always be enforced deterministically in `matcher/scoring.py`.
- **One concept per requirement, must-haves first:** strength in one skill must never hide a missing must-have.
- **Keep HR UX minimal and fast:** focus on the single chosen People UI in `web/src/designs/people/` + `web/src/core/useMatcher.ts` (mounted at `/` via `web/src/Root.tsx`; `/map` and classic view are not routed).
- **Never commit secrets or large data:** `data/profiles.parquet`, `.env`, `web/node_modules/`, and `web/dist/` are git-ignored.
- **Never commit or push** unless the user asks in the current session.
- **Always finish with verification:** state exact commands run, test results, and anything not verified.
