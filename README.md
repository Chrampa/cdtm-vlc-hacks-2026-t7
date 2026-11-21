# Insider · AI Talent Matcher

Equipo T7 · CDTM Valencia Hacks 2026 · NTT DATA case

> The person you need is already in the company. Insider finds them, even when their CV
> describes the same experience in different words, in another department.

HR types a need in plain language, in any language and with one or several roles. Insider:

1. **Interprets** the brief into a team plan (slots with target vs minimum seniority, per-role must-haves/nice-to-haves, and whole-team needs such as "Banking domain ≥ 2 people" or "Spanish B2+ for everyone"). Everything stays editable.
2. **Filters in code** on availability, minimum years, location, and mobility. These hard filters are never skipped.
3. **Matches by meaning** across all 190,000 profiles in ~50 ms. One concept per checklist item (e.g. "Kubernetes on Azure" splits into Container orchestration + Azure), must-haves ranked first so strength elsewhere cannot hide a missing must-have, and seniority matched to the requested level (e.g. Mids rank first when Mid is asked; overqualified Principals rank lower and get flagged).
4. **Explains** every candidate: fit %, requirement coverage, strengths, gaps and risks, all linked to real evidence IDs from the profile. An AI summary cites that evidence, and a deterministic guard removes any sentence it cannot back up.
5. **Compares** candidates side by side.
6. **Forms balanced teams (OR-Tools CP-SAT).** Solves the combination jointly across all slots (~200–400 ms) to produce **3 alternatives** (*Best fit*, *Ready now*, *Leanest*) with an editable team shape (1+ Lead/Principal anchor, ≤50% Senior+, 1+ Mid at 3+, 1+ mentored Junior at 4+ where juniors exist, Senior+ mentor in the same area, shared B2+ language, ≤4h time-zone spread, anti-duplicate), a **scorecard**, plain-English explanations when a rule cannot be met, member roles (*Anchor*, *Builder*, *Learner* with named mentor), and **Swap & Lock** with live team-impact deltas.


## How it works

```
brief ──► AI: team plan (slots + seniority mode + whole-team needs)
       ├─► AI: per-role requirements in parallel (one concept per item)
       └─► code: validate against closed catalog + split mixed platform items
                 (614 skills, 87 roles, 100 certs, 10 sectors, 15 languages)
spec  ──► code: hard filters ──► code: evidence scores (numpy, 190k profiles)
      ──► code: must-haves-first ranking + target/min seniority matching
      ──► code: team optimiser (OR-Tools CP-SAT: 3 options, mentoring, swaps, locks)
card  ──► AI: summary citing evidence IDs ──► code: guard (citations, numbers, skills)
```

| Step | Where | Why |
|---|---|---|
| Brief → team plan & requirements | LLM (strict JSON schema) | Understands jargon, implicit needs, "not essential", whole-team vs per-slot needs |
| Catalog validation & platform split | Code (exact + fuzzy match) | The model cannot invent skills or merge "Azure + Kubernetes" into one OR-item |
| Availability, min years, location | Code (hard filters) | Never skipped, per NTT DATA's rules |
| Evidence, seniority & fit | Code (numpy) | Deterministic, explainable, ~50 ms for 190k profiles |
| Team forming & swap/lock | Code (OR-Tools CP-SAT) | Jointly balances seniority, mentoring, whole-team needs, language, time zones & no duplicates |
| Explanations / team review | LLM + code guard | Plain language with zero hallucinated facts |

**Evidence depth per skill:** 50% self-rated level, 30% years of use (capped at 6 years), 20% whether it was used in a recorded project or job, and how recently. A certificate alone counts as 0.75. Sector evidence comes from three places: main sector, client projects (with recency), and client employers (e.g. "Santander Tecnología" counts as banking). Self-declared soft skills are weighted at half because dataset analysis shows them to be uniformly random.

**Ranking:** People are tiered by must-haves covered first (strength elsewhere cannot compensate for a missing must-have), then weighted fit % (must = 3, nice = 1, role fit = 1.5, seniority = 3.5), then available-now (bench) first.

## AI models

Every AI call goes through any OpenAI-compatible endpoint (default Ironlane, key read server-side from file and never shipped to the browser):

| Task | Env var | Default | Notes |
|---|---|---|---|
| Interpretation | `MODEL_INTERPRET` | `deepseek/deepseek-v4.1-flash` | Strict JSON schema, temperature 0. ~2.5–4 s single role, ~7–9 s multi-role team |
| Candidate summaries | `MODEL_EXPLAIN` | same | ~2 s each, parallel, cached, prefetched for top 3 |
| Team review | `MODEL_TEAM` | same | ~3 s per team |

Mimo v2.6 Flash was tested and is 4–5× slower for the same output. If the AI is unreachable, a deterministic fallback parser takes over and warns the user.

### Voice (ElevenLabs, optional)

| Feature | Where | Model (env var) |
|---|---|---|
| **Speak the brief** instead of typing it, in any language (auto-detected) | Mic button on Home and in *Add a role* | `scribe_v3` (`ELEVENLABS_STT_MODEL`) |
| **Listen to the team** in ~7 s: verdict, the top strength and the top risk | *Listen* in the AI review | `eleven_flash_v2_5` (`ELEVENLABS_TTS_MODEL`) at 1.15× (`ELEVENLABS_SPEED`), voice `ELEVENLABS_VOICE_ID` |

The key comes from `ELEVENLABS_API_KEY` or `ELEVENLABS_API_KEY_FILE` and stays server-side; the browser talks only to `/api/transcribe` and `/api/speak`. Both endpoints cap input size (8 MB audio, 1,500 characters of text) and are rate-limited (20 calls/min each), and repeated read-outs come from a cache, so a public URL cannot burn credits. Without a key the voice buttons are hidden.

## Run it

```bash
# 1. data (not in git): put profiles.parquet in data/
# 2. config
cp .env.example .env          # set LLM_API_KEY or LLM_API_KEY_FILE
# 3. install & build
uv sync && (cd web && npm ci && npm run build)
# 4. start
scripts/run.sh                # http://127.0.0.1:8765
```

Docker: `docker build -t insider . && docker run -p 8765:8765 -v $PWD/data:/app/data:ro --env-file .env insider`.

Tests: `uv run pytest -v` runs **16 tests** on the real 190k dataset covering hard filters, nice-to-haves never filtering, equivalent skills, Catalan/Valencian, platform splitting, must-haves-first ranking, target vs min seniority, balanced team shape + mentored juniors, whole-team needs + unmet-rule explanations, 3 team alternatives + lock/swaps, evidence IDs, and the hallucination guard.

## API

- `POST /api/interpret {brief}` → `BriefSpec` (roles + `team_needs`)
- `POST /api/search {spec, limit, team_shape?, locks?, option?}` → ranked lists, funnel, keyword baseline, and 3 CP-SAT team alternatives with scorecards & swaps
- `POST /api/explain {role, employee_id}` · `POST /api/candidate {role, employee_id}` · `POST /api/team-review {team}`
- `POST /api/transcribe` (raw audio body) → `{text, language}` · `POST /api/speak {text}` → `audio/mpeg`
- `GET /api/meta` · `GET /api/health`

## Docs
- `docs/PLAN.md` — hackathon plan, architecture, runtime & next steps
- `docs/DATASET.md` — verified dataset facts (`profiles.parquet`)
- `docs/case/` — NTT DATA case PDFs
