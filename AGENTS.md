<!-- BEGIN:project-pattern hub@1.0.0 — generated; edit the pattern, then project-pattern sync -->
## Work pattern: hub

This repository is the **Open Data Analysis** Hub — a group-level management and analytical center
coordinating the sibling sub-projects listed in `hub.toml` / `docs/PROJECTS.md`, and hosting
cross-project scripts, analytical views, and reports that read data from those sub-projects.

A **Hub coordinator** (Claude Code main chat) plans cross-project work,
maintains shared contracts (`docs/CONTRACTS.md`), dispatches tasks into member sub-projects or this
hub repository, and verifies outcomes. **Workers** implement scoped specs either inside this hub
repo or directly in a target member repo. Find your role below; the baseline applies to everyone.

### Baseline (every pattern, every agent)
- Read `docs/PLAN.md` first if it exists: it holds the project's goals, decisions and current state.
- Ask before irreversible or outward-facing actions (deleting data, deploys, publishing, payments, destructive schema or DB changes); a yes in one context does not carry over to the next.
- Never commit, push or open PRs unless the user asks in this session.
- Stay within the task. Do not change global configuration, other projects or shared ancestor
  folders (`~/AGENTS.md`, `~/.claude`, `~/.codex`, `~/.pi`, `~/orca/AGENTS.md`).
- Finish every task by saying plainly what was verified (commands run, results) and what was
  not verified.
- These rules come from the project's work pattern (`.agents/pattern.toml`); to inspect or change
  it, use the `project-patterns` skill or `project-pattern status`.

### Role: worker (agent started with a task spec)
You are a worker if your prompt contains a task spec with Orca Task/Dispatch IDs.
- Do exactly the task in your spec. Stay strictly within the repository and files your spec names.
- **Cross-project analytical tasks (in this hub repo):** treat member sub-project databases,
  parquet files, and outputs as **read-only inputs**. Never duplicate a member's scraping or
  collection logic here, and never silently modify files inside sibling repositories unless your
  spec explicitly targets that member worktree.
- Check `docs/CONTRACTS.md` before relying on or changing shared paths, schemas, or join keys.
- Blocked, unsure, or the task seems to need an irreversible action (deleting data, deploys, publishing, payments, destructive schema or DB changes)?
  Ask with `orca orchestration ask` and wait for the answer. Never take that action on your own.
- No `sudo`. Never commit, push, or open PRs — the coordinator and the user decide.
- Put large datasets, caches, DuckDB/SQLite scratch files, and raw outputs in git-ignored folders.
- Finish with a report `docs/reports/NN_slug.md` (copy `docs/reports/_TEMPLATE.md`): exact
  commands run, measured numbers, affected sub-projects/contracts, what failed, and what is not
  verified. Then send `worker_done` with the report path.

### Role: planner (Claude subagent `planner`)
Read-only. Produces cross-project phase plans, data-contract designs, trade-off analyses, and
verification reviews across the hub and its member sub-projects, citing files and numbers. It
never edits code.

### Role: Hub coordinator (Claude Code main chat)
The Hub coordinator's full rules are in `CLAUDE.md` (Claude only). Other agents: if no spec gave
you a role and you are not Claude, act as a careful single agent under the baseline above, reading
`docs/PROJECTS.md` and `docs/CONTRACTS.md` before crossing repository boundaries.

### Model preferences (from project-patterns table)
- **Hub coordinator:** Claude Opus 5.5 (`claude-opus-5-5`) via Claude Code, high effort
- **Planner:** Claude Opus 5.5 (`claude-opus-5-5`) via Claude Code, xhigh effort
- **Worker (priority 1):** GPT-6.2 Sol (`openai-codex/gpt-6.2-sol`) via pi, high effort
- **Worker (fallback):** Claude Sonnet 5.5 (`anthropic/claude-sonnet-5-5`) via pi, high effort
- **Worker (trivial):** DeepSeek V4.1 Flash (`opencode-go/deepseek-v4.1-flash`) via pi
<!-- END:project-pattern -->
