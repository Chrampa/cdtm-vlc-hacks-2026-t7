# Insider · AI Talent Matcher

Equipo T7 · CDTM Valencia Hacks 2026 · NTT DATA case

> The person you need is already in the company. Insider finds them, even when their CV
> describes the same experience in different words, in another department.

HR types a need in plain language, in any language and with one or several roles. Insider:

1. **Interprets** it into must-haves, nice-to-haves, implicit requirements and hard filters. Each one stays editable.
2. **Filters in code** on availability and minimum years. These filters are never skipped.
3. **Matches by meaning** across all 190,000 profiles in about 100 ms. "GCP" finds BigQuery, GKE and Cloud Run. "Kubernetes" finds AKS. "Catalan" finds Valencian speakers.
4. **Explains** every candidate: fit %, requirement coverage, strengths, gaps and risks, all linked to evidence from the profile. An AI summary cites that evidence, and a guard removes any sentence it cannot back up.
5. **Compares** candidates side by side.
6. **Builds a team.** It gives one ranked list per role, never puts the same person in two roles, respects availability, and optimises the team as a whole (Hungarian algorithm). It also suggests a complementary colleague when nobody covers everything.

## Designs under test

| URL | Design |
|---|---|
| `/` or `/people` | **People**: warm and person-first. Cards say "Why Jorge?", profiles show what fits and what to check, plus a career timeline |
| `/map` | **Coverage Map**: matrix-first. Requirements × people with evidence in every cell; tick columns to compare; team as a roles grid |
| `/design` | The five design directions (design code + mockups) |
| `/classic` | The first UI |

The switch in the header flips between People and Coverage Map without losing the current search.

## How it works

```
brief ──► AI: plan positions ─┬─► AI: requirements per position (parallel)
                              └─► code: validate every name against the closed catalog
                                         (614 skills, 87 roles, 100 certs, 10 sectors, 15 languages)
spec ──► code: hard filters ──► code: evidence scores (numpy, whole workforce)
     ──► code: fit + ranking ──► code: team assignment (scipy Hungarian, rounds)
card ──► AI: summary citing evidence IDs ──► code: guard (citations, numbers, skills must exist)
```

| Step | Where | Why |
|---|---|---|
| Brief → requirements | LLM (structured JSON schema) | Understands jargon, implicit needs, "not essential" |
| Name validation | Code (exact + fuzzy match to catalog) | The model can't invent skills |
| Availability, min years, location | Code (hard filters) | Never skipped, per NTT's rules |
| Evidence and fit | Code (numpy) | Deterministic, explainable, about 100 ms for 190k people |
| Team | Code (Hungarian algorithm) | Global optimum, no duplicates |
| Explanations / team review | LLM + code guard | Plain language with no made-up facts |

**Evidence depth per skill:** 50% self-rated level, 30% years of use (capped at 6 years), 20% whether it was used in a recorded project or job, and how recently. A certificate alone counts as 0.75. Sector evidence comes from three places: main sector, client projects (with recency) and employer (for example, "Santander Tecnología" counts as banking). Self-declared soft skills are capped and weighted at half, because the data shows them to be uniformly random.

**Fit %** = weighted coverage of requirements (must = 3, nice = 1, plus role fit and seniority). Each must-have with no real evidence multiplies the fit by 0.85. Nice-to-haves never exclude anyone.

**Risks flagged:** rolling off another project, less senior than asked, must-have covered only by related experience, a self-rated level that doesn't match years of use, a skill listed but never used, a skill last used 4+ years ago, and a language below the required level.

## AI models

Every AI call goes through any OpenAI-compatible endpoint. By default that is Ironlane, with the key read server-side from a file and never shipped to the browser. Each task's model can be set separately:

| Task | Env var | Default | Notes |
|---|---|---|---|
| Interpretation | `MODEL_INTERPRET` | `deepseek/deepseek-v4.1-flash` | Strict JSON schema, temperature 0. About 3–7 s, or about 10 s for 4 roles. Throughput-bound, so a faster-serving model cuts this most |
| Candidate summaries | `MODEL_EXPLAIN` | same | About 1.5–3 s each. Parallel, cached, prefetched for the top 3 |
| Team review | `MODEL_TEAM` | same | One call per team |

Mimo v2.6 Flash, also on Ironlane, was tested and is 4–5× slower for the same output. If the AI is unreachable, a deterministic keyword parser takes over and the UI says so.

## Run it

```bash
# 1. data (not in git): put profiles.parquet in data/
# 2. config
cp .env.example .env          # set LLM_API_KEY or LLM_API_KEY_FILE
# 3. start (builds the UI on first run)
uv sync && (cd web && npm ci && npm run build)
scripts/run.sh                # http://127.0.0.1:8765
```

Docker: `docker build -t insider . && docker run -p 8765:8765 -v $PWD/data:/app/data:ro --env-file .env insider`
(with Docker, use `LLM_API_KEY` rather than a key file).

Development: `scripts/run.sh` plus `cd web && npm run dev`, which serves the UI on :5180 and proxies `/api`.

Tests: `uv run pytest -q` runs 9 tests on the real dataset. They cover hard filters, nice-to-haves never filtering, equivalent skills, Catalan/Valencian, no duplicates in teams, evidence IDs and the hallucination guard.

## API

`POST /api/interpret {brief}` → spec · `POST /api/search {spec, limit}` → ranked lists, funnel, keyword baseline, team ·
`POST /api/explain {role, employee_id}` · `POST /api/candidate {role, employee_id}` · `POST /api/team-review {team}` · `GET /api/meta` · `GET /api/health`

## Honesty notes

- The data is NTT DATA's synthetic dataset (190,000 fictional profiles).
- **Example briefs are our own reconstructions.** The three official test briefs were not part of the data download, so we wrote examples that test the same things (multi-role and implicit banking; must vs nice; hard filters).
- The "keyword search" comparison is a literal baseline. A profile counts as found only if it contains every explicit must-have keyword from the brief.
- No authentication, user management or history: per the case, these are not needed for the MVP.

## Scaling beyond the sample

- Scoring is vectorised over flat arrays: 1.4M skill rows take about 100 ms, so 1–2M employees still fit on one machine.
- AI cost is per brief, not per profile. Interpretation is 2 calls plus one per role. Summaries are generated lazily and cached.
- Real CVs (free text) would go through a one-off ingestion step that extracts them into the same canonical catalog. The matcher itself does not change.
