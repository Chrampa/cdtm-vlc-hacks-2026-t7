# Claude Guide — Insider · AI Talent Matcher

Follow `AGENTS.md` in this repo and read `docs/PLAN.md` and `docs/DATASET.md` before making changes.

Quick links:
- Backend: `matcher/` (FastAPI + DuckDB/numpy + OR-Tools CP-SAT)
- Frontend: `web/src/` (`Root.tsx`, `core/useMatcher.ts`, `designs/people/PeopleApp.tsx`, `designs/people/Profile.tsx`, `designs/people/Compare.tsx`)
- Tests: `tests/test_core.py` (`uv run pytest -v`)
- Service: `systemctl --user restart insider-talent-matcher` (served on `:8765`, tailnet `:8447`)
