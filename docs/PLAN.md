# Insider · AI Talent Matcher — Hackathon Plan & Current State

**Event:** CDTM × UPV-UV Hackathon (VLC Hacks 2026 · 2026-11-21) · Team T7 · **NTT DATA "AI Talent Matcher"** case.  
**Pitch:** 3 minutes. **Rubric:** Tech 30% · Solving + Innovation 25% · Business 25% · Pitch 20%.  
**Case PDFs:** `docs/case/NTT DATA- Case for students.pdf`, `docs/case/NTT DATA- Case Data and Resources.pdf`.  
**Dataset notes:** `docs/DATASET.md`.

## Current state (verified 2026-11-21)

Everything below is built, tested (**16/16 pytest passing**, Vite production build passing), and running live.

### Runtime & deployment
- **Repo:** `/home/user/orca/projects/cdtm-vlc-hacks-2026-t7` (remote `github.com:Chrampa/cdtm-vlc-hacks-2026-t7`, branch `open-data-hub`).
- **Live service:** transient systemd user unit `insider-talent-matcher` on `http://127.0.0.1:8765` (`systemctl --user restart insider-talent-matcher`).
- **Tailnet URL:** `https://pc.tailf0e19d.ts.net:8447` (undo with `tailscale serve --https=8447 off`).
- **AI endpoint:** Ironlane OpenAI-compatible API (key file `~/.pi/agent/ironlane.key`), default model `deepseek/deepseek-v4.1-flash` (`Mimo v2.6 Flash` was tested and is 4–5× slower).
- **UI:** People UI (`web/src/designs/people/PeopleApp.tsx`, `Profile.tsx`, `Compare.tsx`, backed by `web/src/core/useMatcher.ts`) served directly at `/` via `web/src/Root.tsx` (user chose People as the single UI; switcher removed). `/design` remains available for reference.

### Implemented architecture & guarantees

| Layer | File(s) | What it does |
|---|---|---|
| Data store | `matcher/data.py` | Loads 190k profiles into flat numpy arrays + DuckDB cursor for raw profile hydration & literal keyword baseline |
| Brief interpreter | `matcher/interpret.py` | Parallel LLM calls (`PLAN` + per-role `REQUIREMENTS`) against closed catalog, strict validation/fuzzy repair, platform-splitting safety net (`"Kubernetes on Azure"` → `"Container orchestration"` + `"Azure"`), `seniority_mode` (`target` vs `min`), and whole-team `team_needs` |
| Deterministic scoring | `matcher/scoring.py`, `matcher/vocab.py` | Hard filters (availability, min years, countries, mobility) never skipped; one concept per requirement; non-compensatory must-haves-first ranking; target vs min seniority curve (Mids first when Mid is asked; overqualified Principals ranked lower & flagged) |
| Evidence & AI guard | `matcher/evidence.py`, `matcher/explain.py` | Every claim linked to real profile evidence IDs (`S*`, `P*`, `X*`, `C*`, `L*`, `F*`); hallucination guard strips uncited sentences, invented numbers, or unowned skills |
| Team optimiser | `matcher/team.py` | **OR-Tools CP-SAT** joint solver (~200–400 ms) producing **3 alternatives** (`Best fit`, `Ready now`, `Leanest`), editable **TeamShape** defaults (1+ Lead/Principal anchor, ≤50% Senior+, 1+ Mid at 3+, 1+ mentored Junior at 4+, Senior+ mentor in same area, shared B2+ language, ≤4h time-zone spread, anti-duplicate), whole-team needs, plain-English explanations when a rule can't be met, member roles (`anchor`/`builder`/`learner` + named mentor), and **swap & lock** with exact team-impact deltas |
| Web UI | `web/src/designs/people/PeopleApp.tsx`, `Profile.tsx`, `Compare.tsx`, `web/src/core/useMatcher.ts` | Chosen People UI at `/`: target/min seniority selector, 3 team alternatives, scorecard, whole-team needs, unmet-rule explanations, collapsible shape editor, Anchor/Builder/Learner + mentor badges, lock/unlock, inline swap alternatives with team-impact deltas, and side-by-side compare |

## Next steps / remaining hackathon checklist
- [ ] Visual walkthrough in browser of `/` (3-minute live demo flow).
- [ ] Commit and push the CP-SAT team forming + seniority matching + updated docs to GitHub (`open-data-hub` / `main` as the team prefers).
- [ ] Optional cleanup: decide whether to remove leftover Open Data Hub template files (`hub.toml`, `docs/PROJECTS.md`, `docs/CONTRACTS.md`, `docs/reports/`) inherited from initial commit `d6ef2e5`.
- [ ] Prepare 3-minute pitch script & demo sequence (e.g., GCP hidden talent → Mid seniority match → Core banking 5-person team with Ready now / Edit shape / Swap & lock).
