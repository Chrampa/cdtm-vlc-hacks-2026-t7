<p align="left">
  <img src="web/public/talentic-logo.png" alt="Talentic" width="220" />
</p>

# Talentic · AI Talent Matcher

**Team T7 · CDTM Valencia Hacks 2026 · NTT DATA Case**

> **For HR and staffing teams** who struggle to find the right people across a large workforce, **Talentic** is an AI talent-matching platform that finds and forms ready-to-staff internal teams from a plain-language brief — across **190,000+ employee profiles** in milliseconds. Unlike keyword search, it matches related experience by meaning, enforces hard HR constraints deterministically, and backs every recommendation with verifiable profile evidence.

---

## ElevenLabs Challenge

> ### We used ElevenLabs for audio-to-text transcription (speech-to-text) and generating the audio version of the AI Overview (text-to-speech).

## Improven Challenge: Agile in Action

We followed the **Improven Challenge: Agile in Action** cross-cutting methodology — building our MVP in **3 short iterative loops** (*problem first, show early, decide based on what we learn*). Our completed methodology template and loop results are documented in our team **Google Docs** report.

---

## Core Workflow

1. **Enter a staffing brief** — Type or speak what you need in plain language (any language, single role or multi-role team).
2. **Review suggested roles & requirements** — Talentic structures the brief into editable roles, target vs. minimum seniority, per-role must-haves / nice-to-haves, and whole-team needs (e.g., *"Banking domain ≥ 2 people"* or *"Spanish B2+ for everyone"*).
3. **Inspect ranked candidates with supporting evidence** — Search all 190,000 profiles in ~50 ms with hard filters never skipped, must-haves ranked first, side-by-side comparison, and evidence-cited candidate cards guarded against AI hallucinations.
4. **Compare & confirm team options** — Review up to **3 optimized team alternatives** (*Best fit*, *Ready now*, *Leanest*) with a scorecard, short pros & cons AI review, and one-click confirmation into saved **Projects**.

## Standout Features

- **Voice input** — Speak a staffing brief or add a role in 90+ languages (auto-detected via ElevenLabs) instead of typing.
- **Custom team-shape controls** — Tune seniority balance, mentoring rules (*Anchor*, *Builder*, *Learner* with named Senior+ mentors), shared language, time-zone spread, and whole-team needs — with plain-English explanations whenever a rule cannot be met.
- **Candidate swaps & locks** — Lock must-keep people into a slot and explore inline swap candidates with live team-impact deltas (fit, availability, time-zone spread).
- **Audio team summaries** — Listen to a ~7-second executive briefing (verdict, top strength, top risk) read aloud directly from the AI team review.
- **Saved Projects & Searches** — Every search autosaves as a draft; confirming a team promotes it to **Projects**, tracked separately from recent searches in SQLite.

## Hypothesis & Validation

> **Hypothesis:** HR teams and project leads will trust evidence-backed AI matches enough to use them when staffing real projects, provided every recommendation is explainable and editable.
>
> **Validation test (today):** Ask **5 HR or team leads** to run a staffing brief in Talentic and check whether **at least 3 of 5** confirm the suggested candidates and teams are both **relevant** and **explainable**.

---

## How It Works

Talentic separates **language understanding** (LLM) from **filtering, scoring, and team optimization** (deterministic code + OR-Tools CP-SAT) so results are fast, reproducible, and hallucination-free:

```text
brief ──► AI: team plan (slots + seniority mode + whole-team needs)
       ├──► AI: per-role requirements in parallel (one concept per item)
       └──► code: validate against closed catalog + split mixed platform items
                  (614 skills, 87 roles, 100 certs, 10 sectors, 15 languages)
spec  ──► code: hard filters ──► code: evidence scores (NumPy, 190k profiles, ~50 ms)
      ──► code: must-haves-first ranking + target/min seniority matching
      ──► code: team optimizer (OR-Tools CP-SAT, ~200–400 ms: 3 options, mentoring, swaps, locks)
card  ──► AI: candidate summary & team pros/cons citing evidence IDs
      ──► code: deterministic guard (strips any unsupported citation, number, or skill)
```

| Step | Engine | Why |
|---|---|---|
| Brief → team plan & requirements | LLM (strict JSON schema) | Understands jargon, implicit needs, *"not essential"*, and whole-team vs. per-slot needs |
| Catalog validation & platform split | Code (exact + fuzzy match) | Prevents invented skills and splits combined concepts (e.g., *"Kubernetes on Azure"* → *Container orchestration* + *Azure*) |
| Availability, min years, location, mobility | Code (hard filters) | Never skipped, strictly enforcing NTT DATA's staffing rules |
| Evidence depth, seniority & fit | Code (NumPy) | Deterministic, explainable, ~50 ms across 190,000 profiles |
| Team forming, swaps & locks | Code (OR-Tools CP-SAT) | Jointly balances seniority, mentoring, whole-team needs, shared language, time zones, and zero duplicate assignments |
| Candidate summaries & team review | LLM + deterministic guard | Concise plain-language pros/cons and summaries with zero hallucinated facts |

### Scoring & Team-Forming Rules

- **Evidence depth per skill:** 50% self-rated level, 30% years of experience (capped at 6 years), 20% recorded project/job usage weighted by recency. A relevant certification alone counts as 0.75. Sector evidence combines primary sector, client projects (with recency), and client employers (e.g., *"Santander Tecnología"* counts as banking). Self-declared soft skills are half-weighted because dataset analysis showed them to be uniformly distributed.
- **Non-compensatory ranking:** Candidates are tiered by **must-haves covered first** (strength in one skill can never hide a missing must-have), then weighted fit % (`must = 3`, `nice = 1`, `role fit = 1.5`, `seniority = 3.5`), then bench availability first. When *target* seniority is requested (e.g., Mid), Mids rank first while overqualified Principals rank lower and are flagged.
- **Balanced team shape (editable):** By default targets 1+ Lead/Principal *Anchor*, ≤50% Senior+, 1+ Mid (teams of 3+), 1+ mentored Junior (teams of 4+ when available) paired with a Senior+ mentor in the same area, shared B2+ language, ≤4h time-zone spread, and no duplicate people across slots.

---

## AI & Voice Stack

### LLMs (OpenAI-compatible)

Every LLM call uses an OpenAI-compatible endpoint (default Ironlane; keys stay server-side and are never exposed to the browser):

| Task | Env var | Default | Notes |
|---|---|---|---|
| Brief interpretation | `MODEL_INTERPRET` | `deepseek/deepseek-v4.1-flash` | Strict JSON schema, temperature 0 (~2.5–4 s single role, ~7–9 s multi-role team) |
| Candidate summaries | `MODEL_EXPLAIN` | `deepseek/deepseek-v4.1-flash` | ~2 s each, parallel, cached, prefetched for top candidates |
| Team review (pros & cons) | `MODEL_TEAM` | `deepseek/deepseek-v4.1-flash` | ~3 s per team; verdict + concise pros/cons tied to members |

If the LLM endpoint is unreachable, a deterministic fallback parser takes over and warns the user.

### Voice (ElevenLabs, optional)

| Feature | Where in UI | Model (env var) |
|---|---|---|
| **Speak the brief** (90+ languages, auto-detected) | Mic button on Home and in *Add a role* | `scribe_v3` (`ELEVENLABS_STT_MODEL`) |
| **Audio team summary** (~7 s verdict, top pro, top con) | *Listen* button in AI team review | `eleven_flash_v2_5` (`ELEVENLABS_TTS_MODEL`) at 1.15× (`ELEVENLABS_SPEED`), voice `ELEVENLABS_VOICE_ID` |

Keys are loaded server-side from `ELEVENLABS_API_KEY` or `ELEVENLABS_API_KEY_FILE`. `/api/transcribe` and `/api/speak` enforce input caps (8 MB audio, 1,500 chars text), rate limits (20 calls/min each), and response caching. When no key is configured, voice controls stay hidden automatically.

---

## Quick Start

```bash
# 1. Data (not in git): place profiles.parquet in data/
# 2. Configuration
cp .env.example .env          # set LLM_API_KEY or LLM_API_KEY_FILE (and optional ELEVENLABS_*)
# 3. Install dependencies & build the web UI
uv sync && (cd web && npm ci && npm run build)
# 4. Run Talentic (API + web UI)
scripts/run.sh                # http://127.0.0.1:8765
```

### Docker

```bash
docker build -t talentic .
docker run -p 8765:8765 -v "$PWD/data:/app/data" --env-file .env talentic
```

*(Mount `data` read-write if you want saved projects in `data/projects.db` to persist across container restarts, or set `PROJECTS_DB` to a writable volume.)*

### Tests

```bash
uv run pytest -v
```

Runs **22 tests** against the real 190k-profile dataset (no external AI/voice calls required):
- **16 core matching & team-forming tests:** hard filters, nice-to-haves never filtering, equivalent skills, Catalan/Valencian language equivalents, platform splitting, must-haves-first ranking, target vs. minimum seniority, balanced team shape + mentored juniors, whole-team needs + unmet-rule explanations, 3 team alternatives + locks/swaps, real evidence IDs, and the hallucination guard.
- **2 project persistence & API tests:** SQLite CRUD, persistence across restarts, and `/api/projects` HTTP endpoints.
- **4 voice tests:** ElevenLabs STT/TTS wiring, read-out caching, input/key guards, and rate limiting.

---

## API Overview

| Endpoint | Purpose |
|---|---|
| `POST /api/interpret` | `{brief}` → structured `BriefSpec` (roles, requirements, `team_needs`) |
| `POST /api/search` | `{spec, limit, team_shape?, locks?, option?}` → ranked candidates, funnel, keyword baseline, and 3 CP-SAT team alternatives with scorecards & swaps |
| `POST /api/candidate` | `{role, employee_id}` → full evidence-backed candidate card |
| `POST /api/explain` | `{role, employee_id}` → guarded AI summary with evidence citations |
| `POST /api/team-review` | `{team}` → structured AI team verdict with concise pros & cons |
| `GET / POST /api/projects` | List or create saved searches & confirmed team projects |
| `GET / PUT / DELETE /api/projects/{id}` | Retrieve, update, or delete a saved project |
| `POST /api/transcribe` | Raw audio body → `{text, language}` |
| `POST /api/speak` | `{text}` → `audio/mpeg` team summary |
| `GET /api/meta` · `GET /api/health` | Catalog metadata, dataset stats, feature flags, and health check |

---

## Documentation

- [`docs/PLAN.md`](docs/PLAN.md) — hackathon architecture, build state, and demo checklist
- [`docs/DATASET.md`](docs/DATASET.md) — verified structural facts about `profiles.parquet`
- [`docs/case/`](docs/case/) — official NTT DATA case briefs
