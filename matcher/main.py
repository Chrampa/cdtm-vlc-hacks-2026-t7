"""FastAPI app: JSON API under /api and the built web UI at /."""

from __future__ import annotations

import hashlib
import logging
import time
from collections import OrderedDict
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import FileResponse, JSONResponse, Response
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
from .projects import ProjectStore
from .schemas import (
    BriefSpec,
    ExplainRequest,
    InterpretRequest,
    ProjectCreate,
    ProjectUpdate,
    RoleSpec,
    SearchRequest,
    TeamOptionId,
    TeamShape,
)
from .scoring import RoleScores, Scorer
from .team import build_team, complement
from .voice import MAX_AUDIO_BYTES, VoiceClient, VoiceError

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
log = logging.getLogger("matcher")
settings = load_settings()


class App:
    store: Store
    projects: ProjectStore
    scorer: Scorer
    evidence: EvidenceBuilder
    llm: LLMClient
    interpreter: Interpreter
    explainer: Explainer
    voice: VoiceClient
    role_cache: OrderedDict[str, RoleScores]


state = App()


@asynccontextmanager
async def lifespan(_: FastAPI):
    state.store = Store(settings.data_path)
    state.projects = ProjectStore(settings.projects_db)
    state.scorer = Scorer(state.store)
    state.evidence = EvidenceBuilder(state.store)
    state.llm = LLMClient(settings.llm_base_url, settings.llm_api_key, settings.llm_concurrency)
    state.interpreter = Interpreter(state.store, state.llm, settings.model_interpret)
    state.explainer = Explainer(state.store, state.llm, settings.model_explain, settings.model_team)
    state.voice = VoiceClient(
        settings.elevenlabs_api_key, settings.elevenlabs_base_url,
        stt_model=settings.voice_stt_model, tts_model=settings.voice_tts_model, voice_id=settings.voice_id,
        speed=settings.voice_speed,
    )
    state.role_cache = OrderedDict()
    log.info("AI %s (interpret=%s, explain=%s, team=%s), %d saved projects",
             "enabled" if state.llm.available else "DISABLED", settings.model_interpret,
             settings.model_explain, settings.model_team, state.projects.count())
    log.info("Voice (ElevenLabs) %s (stt=%s, tts=%s)", "enabled" if state.voice.available else "DISABLED",
             settings.voice_stt_model, settings.voice_tts_model)
    yield
    await state.llm.close()
    await state.voice.close()
    state.projects.close()


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
    seen_tn: set[str] = set()
    for ti, tn in enumerate(spec.team_needs):
        if not tn.id or tn.id in seen_tn:
            tn.id = f"tn{ti + 1}"
        seen_tn.add(tn.id)
        tn.unmapped = not (tn.skills or tn.certs or tn.sector or tn.language or tn.soft)
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


def swap_lite(card: dict) -> dict:
    return {
        k: card[k]
        for k in (
            "employee_id", "name", "role", "position", "area", "seniority",
            "availability", "availability_code", "fit", "location", "must_covered", "must_total",
        )
    }


def run_search(
    spec: BriefSpec,
    limit: int,
    team_shape: TeamShape | None = None,
    locks: dict[str, str] | None = None,
    option: TeamOptionId = "best_fit",
) -> dict:
    t0 = time.perf_counter()
    store, scorer, evb = state.store, state.scorer, state.evidence
    scored = [scored_role(r) for r in spec.roles]
    rs_by_id = {rs.role.id: rs for rs in scored}
    multi = len(spec.roles) > 1 or any(r.count > 1 for r in spec.roles)
    if multi:
        team = build_team(
            scorer, scored, per_role=limit, team_needs=spec.team_needs,
            shape=team_shape, locks=locks, active_option=option,
        )
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

    need = set(listed) | {c["idx"] for c in complements.values()}
    if team:
        for opt in team.get("options", []):
            for m in opt["members"]:
                if m["idx"] is not None:
                    need.add(m["idx"])
                for sw in m["swaps"]:
                    need.add(sw["idx"])
    profiles = store.profiles(sorted(need))

    kw_by_role: dict[str, tuple[list[str], int | None, set[int]]] = {}
    roles_out = []
    for rs in scored:
        terms = keyword_terms(rs.role)
        kw_count, kw_hits = store.keyword_matches(terms, rs.eligible) if terms else (None, set())
        kw_by_role[rs.role.id] = (terms, kw_count, kw_hits)
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

    team_out = None
    if team:
        card_cache: dict[tuple[str, int, bool], dict] = {}

        def get_card(role_id: str, idx: int, full: bool) -> dict:
            ck = (role_id, idx, full)
            if ck not in card_cache:
                rs = rs_by_id[role_id]
                terms, _, kw_hits = kw_by_role[role_id]
                c = evb.card(rs, idx, profiles[idx], keyword_hit=(idx in kw_hits) if terms else None, full=full)
                c["proposed"] = idx in proposed.get(role_id, [])
                card_cache[ck] = c
            return card_cache[ck]

        hydrated_opts = []
        for opt in team["options"]:
            h_members = []
            for m in opt["members"]:
                idx = m["idx"]
                cand_card = get_card(m["role_id"], idx, True) if idx is not None else None
                h_swaps = []
                for sw in m["swaps"]:
                    sc = get_card(m["role_id"], sw["idx"], False)
                    h_swaps.append({
                        "candidate": swap_lite(sc),
                        "fit_delta": sw["fit_delta"],
                        "bench_delta": sw["bench_delta"],
                        "tz_delta": sw["tz_delta"],
                        "impact": sw["impact"],
                    })
                h_members.append({
                    "slot_id": m["slot_id"],
                    "role_id": m["role_id"],
                    "slot_label": m["slot_label"],
                    "team_role": m["team_role"],
                    "mentor": m["mentor"],
                    "locked": m["locked"],
                    "candidate": cand_card,
                    "swaps": h_swaps,
                })
            hydrated_opts.append({**opt, "members": h_members})

        team_out = {**team["stats"], "options": hydrated_opts}

    out = {
        "roles": roles_out,
        "team": team_out,
        "multi": multi,
        "seconds": round(time.perf_counter() - t0, 3),
    }
    return out


# -------------------------------------------------------------------- API
@app.get("/api/health")
async def health():
    return {"ok": True, "profiles": state.store.n, "ai": state.llm.available, "voice": state.voice.available}


@app.get("/api/meta")
async def meta():
    s = state.store
    return {
        "profiles": s.n,
        "available_now": int((s.avail == 0).sum()),
        "available_soon": int((s.avail == 1).sum()),
        "ai": state.llm.available,
        "voice": state.voice.available,
        "projects_count": state.projects.count(),
        "models": {"interpret": settings.model_interpret, "explain": settings.model_explain, "team": settings.model_team},
        "examples": EXAMPLES,
        "catalog": {
            "skills": s.cat.skills,
            "sectors": [{"value": x, "label": vocab.SECTOR_EN.get(x, x)} for x in s.cat.sectors],
            "languages": [{"value": x, "label": vocab.LANGUAGE_EN.get(x, x)} for x in s.cat.languages],
        },
    }


@app.get("/api/projects")
async def list_projects():
    return [p.model_dump() for p in state.projects.list()]


@app.post("/api/projects", status_code=201)
async def create_project(req: ProjectCreate):
    if not req.spec.roles:
        raise HTTPException(400, "A project needs at least one role")
    return state.projects.create(req).model_dump()


@app.get("/api/projects/{project_id}")
async def get_project(project_id: str):
    proj = state.projects.get(project_id)
    if proj is None:
        raise HTTPException(404, "Project not found")
    return proj.model_dump()


@app.put("/api/projects/{project_id}")
async def update_project(project_id: str, req: ProjectUpdate):
    if req.spec is not None and not req.spec.roles:
        raise HTTPException(400, "A project needs at least one role")
    proj = state.projects.update(project_id, req)
    if proj is None:
        raise HTTPException(404, "Project not found")
    return proj.model_dump()


@app.delete("/api/projects/{project_id}")
async def delete_project(project_id: str):
    if not state.projects.delete(project_id):
        raise HTTPException(404, "Project not found")
    return {"ok": True, "id": project_id}


@app.post("/api/interpret")
async def interpret(req: InterpretRequest):
    res = await state.interpreter.interpret(req.brief)
    return res.model_dump()


@app.post("/api/search")
async def search(req: SearchRequest):
    spec = ensure_ids(req.spec)
    if not spec.roles:
        raise HTTPException(400, "The brief has no roles")
    return await run_in_threadpool(run_search, spec, req.limit, req.team_shape, req.locks, req.option)


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


@app.post("/api/transcribe")
async def transcribe(request: Request):
    """Raw recorded audio in the body (Content-Type = the recorder's MIME type) -> brief text."""
    chunks, size = [], 0
    async for chunk in request.stream():  # stop reading early instead of buffering a huge upload
        size += len(chunk)
        if size > MAX_AUDIO_BYTES:
            raise HTTPException(413, "The recording is too long. Keep it under a few minutes.")
        chunks.append(chunk)
    audio = b"".join(chunks)
    try:
        return await state.voice.transcribe(audio, request.headers.get("content-type", ""))
    except VoiceError as e:
        raise HTTPException(e.status, str(e)) from e


@app.post("/api/speak")
async def speak(payload: dict):
    """{text} -> MP3 read out in the configured ElevenLabs voice."""
    text = payload.get("text")
    if not isinstance(text, str):
        raise HTTPException(400, "Expected {text}")
    try:
        audio = await state.voice.speak(text)
    except VoiceError as e:
        raise HTTPException(e.status, str(e)) from e
    return Response(audio, media_type="audio/mpeg", headers={"Cache-Control": "private, max-age=3600"})


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
