"""FastAPI app: JSON API under /api and the built web UI at /."""

from __future__ import annotations

import hashlib
import logging
import time
from collections import OrderedDict
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from starlette.concurrency import run_in_threadpool

from . import vocab
from .config import load_settings
from .data import Store
from .evidence import EvidenceBuilder
from .examples import EXAMPLES
from .explain import Explainer
from .interpret import Interpreter
from .llm import LLMClient
from .schemas import BriefSpec, ExplainRequest, InterpretRequest, RoleSpec, SearchRequest
from .scoring import RoleScores, Scorer
from .team import build_team, complement

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
log = logging.getLogger("matcher")
settings = load_settings()


class App:
    store: Store
    scorer: Scorer
    evidence: EvidenceBuilder
    llm: LLMClient
    interpreter: Interpreter
    explainer: Explainer
    role_cache: OrderedDict[str, RoleScores]


state = App()


@asynccontextmanager
async def lifespan(_: FastAPI):
    state.store = Store(settings.data_path)
    state.scorer = Scorer(state.store)
    state.evidence = EvidenceBuilder(state.store)
    state.llm = LLMClient(settings.llm_base_url, settings.llm_api_key, settings.llm_concurrency)
    state.interpreter = Interpreter(state.store, state.llm, settings.model_interpret)
    state.explainer = Explainer(state.store, state.llm, settings.model_explain, settings.model_team)
    state.role_cache = OrderedDict()
    log.info("AI %s (interpret=%s, explain=%s, team=%s)",
             "enabled" if state.llm.available else "DISABLED", settings.model_interpret,
             settings.model_explain, settings.model_team)
    yield
    await state.llm.close()


app = FastAPI(title="Talent Matcher", lifespan=lifespan)
app.add_middleware(GZipMiddleware, minimum_size=1000)


# ----------------------------------------------------------------- helpers
def _role_key(role: RoleSpec) -> str:
    return hashlib.sha256(role.model_dump_json().encode()).hexdigest()


def scored_role(role: RoleSpec) -> RoleScores:
    key = _role_key(role)
    hit = state.role_cache.get(key)
    if hit is not None:
        state.role_cache.move_to_end(key)
        return hit
    rs = state.scorer.score_role(role)
    state.role_cache[key] = rs
    while len(state.role_cache) > 64:
        state.role_cache.popitem(last=False)
    return rs


def ensure_ids(spec: BriefSpec) -> BriefSpec:
    for ri, role in enumerate(spec.roles):
        role.id = role.id or f"r{ri + 1}"
        seen: set[str] = set()
        for qi, q in enumerate(role.requirements):
            if not q.id or q.id in seen:
                q.id = f"{role.id}q{qi + 1}"
            seen.add(q.id)
            q.unmapped = not (q.skills or q.certs or q.sector or q.language or q.soft)
    return spec


def keyword_terms(role: RoleSpec) -> list[str]:
    """What a recruiter would literally type: keywords of explicit technical must-haves."""
    terms = []
    for q in role.requirements:
        if q.importance == "must" and not q.implicit and q.kind in ("skill", "certification") and q.keyword:
            terms.append(q.keyword)
    return list(dict.fromkeys(terms))


def lite(card: dict) -> dict:
    return {k: card[k] for k in ("employee_id", "name", "role", "seniority", "availability", "fit", "location")}


def run_search(spec: BriefSpec, limit: int) -> dict:
    t0 = time.perf_counter()
    store, scorer, evb = state.store, state.scorer, state.evidence
    scored = [scored_role(r) for r in spec.roles]
    multi = len(spec.roles) > 1 or any(r.count > 1 for r in spec.roles)
    if multi:
        team = build_team(scorer, scored, per_role=limit)
        lists, proposed = team["lists"], team["proposed"]
    else:
        team = None
        lists = {scored[0].role.id: scorer.top(scored[0], limit)}
        proposed = {scored[0].role.id: lists[scored[0].role.id][:1]}

    assigned = {i for v in proposed.values() for i in v}
    listed = {i for v in lists.values() for i in v}
    complements: dict[str, dict] = {}
    for rs in scored:
        for person in proposed.get(rs.role.id, [])[:1]:
            c = complement(scorer, rs, person, exclude=assigned | (listed - set(lists[rs.role.id])))
            if c:
                complements[rs.role.id] = {"for": person, **c}

    need = listed | {c["idx"] for c in complements.values()}
    profiles = store.profiles(sorted(need))

    roles_out = []
    for rs in scored:
        terms = keyword_terms(rs.role)
        kw_count, kw_hits = store.keyword_matches(terms, rs.eligible) if terms else (None, set())
        cards = []
        for i in lists.get(rs.role.id, []):
            card = evb.card(rs, i, profiles[i], keyword_hit=(i in kw_hits) if terms else None, full=True)
            card["proposed"] = i in proposed.get(rs.role.id, [])
            cards.append(card)
        comp = None
        if rs.role.id in complements:
            c = complements[rs.role.id]
            ccard = evb.card(rs, c["idx"], profiles[c["idx"]], keyword_hit=None, full=False)
            comp = {"for": store.employee_id[c["for"]], "person": lite(ccard), "covers": c["covers"], "gaps": c["gaps"]}
        eligible = int(rs.eligible.sum())
        roles_out.append({
            "id": rs.role.id,
            "title": rs.role.title,
            "count": rs.role.count,
            "funnel": rs.funnel,
            "eligible": eligible,
            "keyword": {"terms": terms, "count": kw_count,
                        "missed_in_top": sum(1 for c in cards if c["keyword_hit"] is False)} if terms else None,
            "candidates": cards,
            "complement": comp,
        })
    out = {
        "roles": roles_out,
        "team": team["stats"] if team else None,
        "multi": multi,
        "seconds": round(time.perf_counter() - t0, 3),
    }
    return out


# -------------------------------------------------------------------- API
@app.get("/api/health")
async def health():
    return {"ok": True, "profiles": state.store.n, "ai": state.llm.available}


@app.get("/api/meta")
async def meta():
    s = state.store
    return {
        "profiles": s.n,
        "available_now": int((s.avail == 0).sum()),
        "available_soon": int((s.avail == 1).sum()),
        "ai": state.llm.available,
        "models": {"interpret": settings.model_interpret, "explain": settings.model_explain, "team": settings.model_team},
        "examples": EXAMPLES,
        "catalog": {
            "skills": s.cat.skills,
            "sectors": [{"value": x, "label": vocab.SECTOR_EN.get(x, x)} for x in s.cat.sectors],
            "languages": [{"value": x, "label": vocab.LANGUAGE_EN.get(x, x)} for x in s.cat.languages],
        },
    }


@app.post("/api/interpret")
async def interpret(req: InterpretRequest):
    res = await state.interpreter.interpret(req.brief)
    return res.model_dump()


@app.post("/api/search")
async def search(req: SearchRequest):
    spec = ensure_ids(req.spec)
    if not spec.roles:
        raise HTTPException(400, "The brief has no roles")
    return await run_in_threadpool(run_search, spec, req.limit)


async def _card_for(req: ExplainRequest) -> tuple[RoleSpec, dict]:
    store = state.store
    i = store.idx_by_id.get(req.employee_id)
    if i is None:
        raise HTTPException(404, "Unknown employee")
    role = ensure_ids(BriefSpec(roles=[req.role])).roles[0]

    def build() -> dict:
        rs = scored_role(role)
        p = store.profiles([i])[i]
        card = state.evidence.card(rs, i, p, keyword_hit=None, full=True)
        card["proposed"] = False
        return card

    return role, await run_in_threadpool(build)


@app.post("/api/candidate")
async def candidate(req: ExplainRequest):
    _, card = await _card_for(req)
    return card


@app.post("/api/explain")
async def explain(req: ExplainRequest):
    role, card = await _card_for(req)
    return await state.explainer.explain(role.model_dump(), card)


@app.post("/api/team-review")
async def team_review(payload: dict):
    team = payload.get("team")
    if not isinstance(team, list) or not team or len(team) > 20:
        raise HTTPException(400, "Expected a non-empty team list")
    return await state.explainer.team_review(team)


@app.exception_handler(Exception)
async def unhandled(_, exc: Exception):
    log.exception("Unhandled error: %s", exc)
    return JSONResponse(status_code=500, content={"detail": "Something went wrong on our side. Please try again."})


# ---------------------------------------------------------------- web app
if settings.web_dist.is_dir():
    app.mount("/assets", StaticFiles(directory=settings.web_dist / "assets"), name="assets")

    @app.get("/{path:path}", include_in_schema=False)
    async def spa(path: str):
        f = settings.web_dist / path
        if path and f.is_file() and settings.web_dist in f.resolve().parents:
            return FileResponse(f)
        return FileResponse(settings.web_dist / "index.html", headers={"Cache-Control": "no-cache"})
