"""Brief interpretation: free text -> validated BriefSpec.

The LLM reads the brief with the whole (closed) catalog in its system prompt and maps
every need onto catalog names. Code then validates every name against the catalog,
repairs near-misses and fills defaults. If the LLM is unavailable a deterministic
parser produces a basic interpretation so the product keeps working.
"""

from __future__ import annotations

import asyncio
import hashlib
import logging
import re
import time
from collections import OrderedDict

from rapidfuzz import fuzz, process

from . import vocab
from .data import Store
from .llm import LLMClient, LLMError
from .schemas import BriefSpec, InterpretResponse, Requirement, RoleSpec, SkillRef, TargetRole

log = logging.getLogger(__name__)

_NULLABLE_STR = {"type": ["string", "null"]}
_STR_LIST = {"type": "array", "items": {"type": "string"}}

REQ_SCHEMA = {
    "type": "object",
    "properties": {
        "label": {"type": "string"},
        "keyword": {"type": "string"},
        "kind": {"type": "string", "enum": ["skill", "sector", "language", "certification", "soft"]},
        "importance": {"type": "string", "enum": ["must", "nice"]},
        "implicit": {"type": "boolean"},
        "reason": _NULLABLE_STR,
        "skills": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "name": {"type": "string"},
                    "match": {"type": "string", "enum": ["exact", "equivalent", "related", "transferable"]},
                },
                "required": ["name", "match"],
                "additionalProperties": False,
            },
        },
        "certs": _STR_LIST,
        "sector": _NULLABLE_STR,
        "language": _NULLABLE_STR,
        "min_level": {"type": ["string", "null"], "enum": ["A2", "B1", "B2", "C1", "C2", "Nativo", None]},
        "soft": _STR_LIST,
    },
    "required": [
        "label", "keyword", "kind", "importance", "implicit", "reason", "skills",
        "certs", "sector", "language", "min_level", "soft",
    ],
    "additionalProperties": False,
}

PLAN_ROLE_SCHEMA = {
    "type": "object",
    "properties": {
        "title": {"type": "string"},
        "count": {"type": "integer"},
        "scope": {"type": "string"},
        "seniority_min": {
            "type": ["string", "null"],
            "enum": ["Trainee", "Junior", "Mid", "Senior", "Lead", "Principal", None],
        },
        "min_years": {"type": ["integer", "null"]},
        "availability": {"type": "string", "enum": ["now", "soon", "any"]},
        "countries": _STR_LIST,
        "mobility_required": {"type": "boolean"},
        "target_roles": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {"name": {"type": "string"}, "fit": {"type": "number"}},
                "required": ["name", "fit"],
                "additionalProperties": False,
            },
        },
    },
    "required": [
        "title", "count", "scope", "seniority_min", "min_years", "availability", "countries",
        "mobility_required", "target_roles",
    ],
    "additionalProperties": False,
}

PLAN_SCHEMA = {
    "type": "object",
    "properties": {
        "title": {"type": "string"},
        "summary": {"type": "string"},
        "roles": {"type": "array", "items": PLAN_ROLE_SCHEMA},
    },
    "required": ["title", "summary", "roles"],
    "additionalProperties": False,
}

REQS_SCHEMA = {
    "type": "object",
    "properties": {"requirements": {"type": "array", "items": REQ_SCHEMA}},
    "required": ["requirements"],
    "additionalProperties": False,
}

RULES = """You turn a staffing brief (any language) into structured search requirements for NTT DATA's internal talent database. You never invent people or facts; you only describe what to search for, using CATALOG names exactly as spelled. Human-readable text you write (title, summary, scope, label, reason) MUST be in the same language as the BRIEF, even though catalog names are Spanish.

POSITIONS (task PLAN)
- One entry per distinct position. count = how many people are needed for it (default 1). scope = one sentence on what that person will do, restating the brief's needs that apply to it.
- Hard filters are enforced in code and never skipped, so set them ONLY when the brief states them:
  availability: "now" if the person must start immediately / be available now; "soon" if within weeks or up to 3 months, or when not stated; "any" only if availability explicitly does not matter.
  min_years: only when a minimum number of years of total experience is explicitly stated ("at least 3 years", "+5 years"); otherwise null. Brief-wide constraints apply to every position.
  countries: catalog countries only if the brief explicitly says the person must be located/based there; otherwise []. The client's nationality is NOT a location requirement.
  mobility_required: true only if travelling or relocating abroad is required.
- seniority_min: the lowest seniority asked for (Junior, Mid, Senior, Lead, Principal) or null. "Senior" -> Senior; "Lead"/"Head of" -> Lead; an Architect position usually implies Senior.
- target_roles: up to 6 catalog roles whose people typically do this job, with fit 0-1. ALSO include adjacent roles from other departments whose people could do it (fit 0.4-0.7): finding people hidden in other teams is the goal.

REQUIREMENTS (task REQUIREMENTS, for one position)
- One requirement per distinct need of that position, at most 6. kind:
  "skill": technical or functional knowledge. In "skills" list 2-5 catalog skills that would evidence it, each with a match type:
     exact = the skill itself (generic supporting skills such as SQL or Python are "related" unless the requirement is about them);
     equivalent = the same concept under another name or vendor variant (e.g. AKS / EKS / GKE for Kubernetes; Google Cloud, BigQuery, Cloud Run, GKE for GCP; RGPD for GDPR);
     related = adjacent knowledge that partially covers it;
     transferable = experience from another field that carries over.
    "certs": 0-2 catalog certifications that directly prove it.
  "sector": industry/domain experience -> "sector" = one catalog sector.
  "language": "language" = catalog language; "min_level" = minimum level (good/professional = B2, fluent = C1, native = Nativo, basic = A2; default B2).
  "certification": an explicitly requested certificate -> "certs".
  "soft": interpersonal or way-of-working needs the brief mentions (client-facing, leadership, agile...) -> "soft" with catalog soft skills and/or methodologies, plus catalog skills in "skills" when they evidence it (e.g. Presentaciones a cliente, Relación con cliente, Gestión de stakeholders).
- importance: "must" if the brief requires it or it is core to the position; "nice" if the brief says nice to have, a plus, desirable, valued, preferred, ideally, or NOT ESSENTIAL / not required. "Not essential" is ALWAYS "nice".
- Implicit requirements: add needs the brief implies but does not state, typically the client's sector (a core-banking migration implies banking sector experience) or a working language (a Spanish public-sector client implies Spanish). Set implicit=true with a reason of at most 15 words. Use "must" only if the work clearly cannot succeed without it; otherwise "nice". Explicit requirements have implicit=false and reason=null.
- NEVER turn availability, start date, years of experience or seniority into requirements: they are handled as hard filters. Do not add generic soft skills the brief does not mention.
- Do not add a requirement that merely restates the position (e.g. "Data engineer background"): the position itself is matched through target_roles. If a requirement names a catalog skill (e.g. "BigQuery pipelines"), that skill must be in its "skills" as exact.
- label: short noun phrase (max 5 words). keyword: the 1-2 words a recruiter would type into a keyword search, COPIED FROM THE BRIEF TEXT (e.g. GCP, RAG, Kubernetes), never a catalog name or a translation.
Return only JSON that matches the schema."""


_EN = re.compile(r"\b(the|and|with|we|need|needs|experience|for|to|of|should|must|team|years|good|level)\b", re.I)
_ES = re.compile(r"\b(el|la|los|las|de|del|que|con|necesitamos|experiencia|para|y|equipo|años|nivel|debe)\b", re.I)


def _looks_english(text: str) -> bool:
    return len(_EN.findall(text)) >= len(_ES.findall(text))


def build_system_prompt(store: Store) -> str:
    cat = store.cat
    role_lines = []
    for rol, area in zip(cat.roles, cat.role_area):
        pool = ", ".join(s for s, _ in cat.role_pool.get(rol, []))
        role_lines.append(f"- {rol} [{area}]: {pool}")
    return "\n".join(
        [
            RULES,
            "",
            "CATALOG",
            "ROLES (current job titles in the database) with the skills their people list:",
            *role_lines,
            "",
            "CERTIFICATIONS: " + " | ".join(cat.certs),
            "SECTORS: " + " | ".join(cat.sectors),
            "LANGUAGES: " + " | ".join(cat.languages),
            "SOFT SKILLS: " + " | ".join(cat.soft),
            "METHODOLOGIES: " + " | ".join(cat.methods),
            "COUNTRIES: " + " | ".join(cat.countries),
            "SENIORITY (low to high): " + " < ".join(vocab.SENIORITY),
        ]
    )


class Interpreter:
    def __init__(self, store: Store, llm: LLMClient, model: str):
        self.store = store
        self.llm = llm
        self.model = model
        self.system = build_system_prompt(store)
        self._cache: OrderedDict[str, InterpretResponse] = OrderedDict()
        cat = store.cat
        self._lower = {
            "skill": {s.lower(): s for s in cat.skills},
            "cert": {s.lower(): s for s in cat.certs},
            "sector": {s.lower(): s for s in cat.sectors},
            "lang": {s.lower(): s for s in cat.languages},
            "soft": {s.lower(): s for s in cat.soft + cat.methods},
            "role": {s.lower(): s for s in cat.roles},
            "country": {s.lower(): s for s in cat.countries},
        }
        self._skill_rx = [
            (sk, re.compile(rf"(?<![\w]){re.escape(sk)}(?![\w])", re.I))
            for sk in cat.skills if len(sk) >= 3 and sk.lower() not in {"cloud", "banca", "seguros", "iot", "crm", "rpa", "c++", "go"}
        ]
        # English names are accepted too (the model sometimes translates).
        for es, en in vocab.SECTOR_EN.items():
            self._lower["sector"][en.lower()] = es
        for es, en in vocab.LANGUAGE_EN.items():
            self._lower["lang"][en.lower()] = es
        for es, en in vocab.COUNTRY_EN.items():
            if es in cat.country_id:
                self._lower["country"][en.lower()] = es

    # ---------------------------------------------------------------- public
    async def interpret(self, brief: str) -> InterpretResponse:
        key = hashlib.sha256(f"{self.model}\n{brief.strip()}".encode()).hexdigest()
        if key in self._cache:
            self._cache.move_to_end(key)
            return self._cache[key]
        t0 = time.perf_counter()
        warnings: list[str] = []
        if self.llm.available:
            try:
                raw, model_name = await self._ai_interpret(brief.strip())
                spec = self.normalize(raw, warnings)
                resp = InterpretResponse(
                    spec=spec, ai_used=True, model=model_name, warnings=warnings,
                    seconds=round(time.perf_counter() - t0, 2),
                )
                self._remember(key, resp)
                return resp
            except (LLMError, ValueError) as e:
                log.warning("AI interpretation failed, using basic parser: %s", e)
                warnings.append("The AI service did not answer, so this is a basic keyword interpretation. Review it before searching.")
        else:
            warnings.append("No AI key configured: basic keyword interpretation. Review it before searching.")
        spec = self.fallback(brief)
        return InterpretResponse(spec=spec, ai_used=False, warnings=warnings, seconds=round(time.perf_counter() - t0, 2))

    async def _ai_interpret(self, brief: str) -> tuple[dict, str]:
        """Plan the positions and write requirements with short, parallel calls.

        The requirements call for "the brief as a single position" starts speculatively
        alongside the plan call; it is used when the plan finds one position (the common
        case) and cancelled otherwise, so single-role briefs cost one round-trip.
        """
        lang = "English" if _looks_english(brief) else "Spanish"
        lang_note = f"Write every human-readable text field in {lang}."

        def req_task(title: str, scope: str, others: list[str]) -> str:
            pos = f'the position "{title}" (scope: {scope}). Positions in this brief: {", ".join(others)}. Only include needs of this position.' if title else "the single position described in the brief."
            return f"BRIEF:\n{brief}\n\nTASK REQUIREMENTS: write the requirements for {pos} {lang_note}"

        async def reqs(task: str) -> list[dict]:
            out, _ = await self.llm.json(self.model, self.system, task, REQS_SCHEMA, "requirements", max_tokens=2500, timeout=45)
            return out.get("requirements") or []

        speculative = asyncio.create_task(reqs(req_task("", "", [])))
        try:
            plan, meta = await self.llm.json(
                self.model, self.system,
                f"BRIEF:\n{brief}\n\nTASK PLAN: identify the positions to staff. {lang_note}",
                PLAN_SCHEMA, "staffing_plan", max_tokens=2000, timeout=45,
            )
            roles = (plan.get("roles") or [])[:8]
            if not roles:
                raise ValueError("The model found no positions in the brief")
            if len(roles) == 1:
                roles[0]["requirements"] = await speculative
            else:
                speculative.cancel()
                titles = [r.get("title", "") for r in roles]
                results = await asyncio.gather(*(reqs(req_task(r.get("title", ""), r.get("scope", ""), titles)) for r in roles))
                for role, rq in zip(roles, results):
                    role["requirements"] = rq
        finally:
            if not speculative.done():
                speculative.cancel()
        plan["roles"] = roles
        return plan, meta["model"]

    def _remember(self, key: str, resp: InterpretResponse) -> None:
        self._cache[key] = resp
        while len(self._cache) > 256:
            self._cache.popitem(last=False)

    # ------------------------------------------------------------ validation
    def _canon(self, kind: str, name: str | None, cutoff: int = 88) -> str | None:
        if not name:
            return None
        table = self._lower[kind]
        hit = table.get(name.strip().lower())
        if hit:
            return hit
        best = process.extractOne(name.strip().lower(), list(table.keys()), scorer=fuzz.ratio, score_cutoff=cutoff)
        return table[best[0]] if best else None

    def _add_named_skills(self, req: Requirement) -> None:
        """A requirement that literally names a catalog skill must count that skill as exact."""
        text = f" {req.label} {req.keyword} "
        for name, rx in self._skill_rx:
            if rx.search(text):
                hit = next((x for x in req.skills if x.name == name), None)
                if hit is None:
                    req.skills.insert(0, SkillRef(name=name, match="exact"))
                elif hit.match != "exact":
                    hit.match = "exact"

    def normalize(self, raw: dict, warnings: list[str]) -> BriefSpec:
        roles_raw = raw.get("roles") or []
        roles: list[RoleSpec] = []
        dropped: set[str] = set()
        for ri, r in enumerate(roles_raw[:8]):
            reqs: list[Requirement] = []
            for qi, q in enumerate((r.get("requirements") or [])[:14]):
                kind = q.get("kind") if q.get("kind") in ("skill", "sector", "language", "certification", "soft") else "skill"
                skills: list[SkillRef] = []
                seen: set[str] = set()
                for s in q.get("skills") or []:
                    name = self._canon("skill", (s or {}).get("name"))
                    if not name:
                        if (s or {}).get("name"):
                            dropped.add(s["name"])
                        continue
                    if name in seen:
                        continue
                    seen.add(name)
                    match = s.get("match") if s.get("match") in vocab.MATCH_WEIGHT else "related"
                    skills.append(SkillRef(name=name, match=match))
                certs = [c for c in (self._canon("cert", x) for x in q.get("certs") or []) if c]
                soft = list(dict.fromkeys(c for c in (self._canon("soft", x) for x in q.get("soft") or []) if c))
                sector = self._canon("sector", q.get("sector"), cutoff=80)
                language = self._canon("lang", q.get("language"), cutoff=80)
                min_level = q.get("min_level") if q.get("min_level") in vocab.LANG_LEVEL_RANK else None
                if kind == "language" and language and not min_level:
                    min_level = "B2"
                if kind == "sector" and not sector:
                    kind = "skill"
                if kind == "language" and not language:
                    kind = "skill"
                req = Requirement(
                    id=f"r{ri + 1}q{qi + 1}",
                    label=(q.get("label") or "Requirement").strip()[:60],
                    keyword=(q.get("keyword") or "").strip()[:40],
                    kind=kind,
                    importance="nice" if q.get("importance") == "nice" else "must",
                    implicit=bool(q.get("implicit")),
                    reason=(q.get("reason") or None) if q.get("implicit") else None,
                    skills=skills,
                    certs=list(dict.fromkeys(certs)),
                    sector=sector if kind == "sector" else None,
                    language=language if kind == "language" else None,
                    min_level=min_level if kind == "language" else None,
                    soft=soft,
                )
                if kind in ("skill", "soft", "certification"):
                    self._add_named_skills(req)
                req.unmapped = not (req.skills or req.certs or req.sector or req.language or req.soft)
                reqs.append(req)

            targets: list[TargetRole] = []
            for t in r.get("target_roles") or []:
                name = self._canon("role", (t or {}).get("name"))
                if name and name not in {x.name for x in targets}:
                    try:
                        fit = float(t.get("fit", 0.5))
                    except (TypeError, ValueError):
                        fit = 0.5
                    targets.append(TargetRole(name=name, fit=min(1.0, max(0.0, fit))))
            countries = [c for c in (self._canon("country", x, cutoff=85) for x in r.get("countries") or []) if c]
            seniority = r.get("seniority_min") if r.get("seniority_min") in vocab.SENIORITY else None
            min_years = r.get("min_years")
            if not isinstance(min_years, int) or min_years <= 0:
                min_years = None
            count = r.get("count") if isinstance(r.get("count"), int) and r.get("count") > 0 else 1
            roles.append(
                RoleSpec(
                    id=f"r{ri + 1}",
                    title=(r.get("title") or f"Role {ri + 1}").strip()[:80],
                    count=min(count, 10),
                    seniority_min=seniority,
                    min_years=min(min_years, 45) if min_years else None,
                    availability=r.get("availability") if r.get("availability") in vocab.AVAILABILITY_FILTER else "soon",
                    countries=countries,
                    mobility_required=bool(r.get("mobility_required")),
                    target_roles=targets[:6],
                    requirements=reqs,
                )
            )
        if not roles:
            raise ValueError("The model returned no roles")
        if dropped:
            log.info("Dropped non-catalog skills: %s", sorted(dropped))
        return BriefSpec(
            title=(raw.get("title") or "Staffing brief").strip()[:80],
            summary=(raw.get("summary") or "").strip()[:300],
            roles=roles,
        )

    # -------------------------------------------------------------- fallback
    _SECTOR_WORDS = {
        "Banca y Finanzas": ["bank", "banking", "banca", "bancario", "financ", "core banking"],
        "Sector Público": ["public sector", "sector público", "sector publico", "administración", "government", "gobierno"],
        "Retail y Consumo": ["retail", "consumo", "e-commerce", "ecommerce"],
        "Seguros": ["insurance", "seguros", "aseguradora"],
        "Telecomunicaciones y Media": ["telecom", "telco", "media"],
        "Energía y Utilities": ["energy", "energía", "utilities", "utility"],
        "Sanidad y Farma": ["health", "sanidad", "pharma", "hospital"],
        "Transporte y Logística": ["transport", "logistic", "logística"],
        "Turismo y Ocio": ["tourism", "turismo", "travel", "hotel"],
        "Industria y Automoción": ["industry", "industria", "automotive", "automoción", "manufactur"],
    }
    _ALIASES = {
        "gcp": ["Google Cloud", "BigQuery", "GKE", "Cloud Run"],
        "k8s": ["Kubernetes"],
        "kubernetes": ["Kubernetes", "AKS", "EKS", "GKE"],
        "container orchestration": ["Kubernetes", "AKS", "EKS", "GKE", "Helm"],
        "genai": ["LLMs", "RAG", "Prompt Engineering"],
        "llm": ["LLMs"],
        "ciberseguridad": ["SIEM", "Respuesta a incidentes", "Pentesting", "ISO 27001"],
        "cybersecurity": ["SIEM", "Respuesta a incidentes", "Pentesting", "ISO 27001"],
        "cloud": ["Arquitectura cloud", "Azure", "AWS", "Google Cloud"],
    }

    def fallback(self, brief: str) -> BriefSpec:
        text = brief.lower()
        cat = self.store.cat
        availability = "now" if re.search(r"immediate|available now|asap|inmediat|ya mismo", text) else "soon"
        m = re.search(r"(\d{1,2})\s*\+?\s*(?:years|year|yrs|años|anos)", text)
        min_years = int(m.group(1)) if m else None
        seniority = next((s for s in reversed(vocab.SENIORITY) if re.search(rf"\b{s.lower()}\b", text)), None)

        def is_nice(term: str) -> bool:
            for sent in re.split(r"[.;\n]", text):
                if term in sent and re.search(r"nice|plus|desirable|not essential|no imprescindible|valorable|deseable|ideally", sent):
                    return True
            return False

        reqs: list[Requirement] = []
        seen: set[str] = set()
        for alias, names in self._ALIASES.items():
            if re.search(rf"\b{re.escape(alias)}\b", text):
                skills = [SkillRef(name=n, match="exact" if i == 0 else "equivalent") for i, n in enumerate(names) if n in cat.skill_id]
                if skills and alias not in seen:
                    seen.update(n.lower() for n in names)
                    reqs.append(Requirement(label=alias.upper() if len(alias) <= 4 else alias.capitalize(), keyword=alias,
                                            kind="skill", importance="nice" if is_nice(alias) else "must", skills=skills))
        for skill in sorted(cat.skills, key=len, reverse=True):
            s = skill.lower()
            if len(s) < 2 or s in seen:
                continue
            if re.search(rf"(?<![\w]){re.escape(s)}(?![\w])", text):
                seen.add(s)
                reqs.append(Requirement(label=skill, keyword=skill, kind="skill",
                                        importance="nice" if is_nice(s) else "must", skills=[SkillRef(name=skill)]))
        for sector, words in self._SECTOR_WORDS.items():
            hit = next((w for w in words if w in text), None)
            if hit:
                reqs.append(Requirement(label=vocab.SECTOR_EN[sector], keyword=hit, kind="sector",
                                        importance="nice" if is_nice(hit) else "must", sector=sector))
        for lang, en in vocab.LANGUAGE_EN.items():
            if lang in cat.lang_id and (en.lower() in text or lang.lower() in text):
                reqs.append(Requirement(label=en, keyword=en, kind="language", importance="must", language=lang, min_level="B2"))
        roles = process.extract(text, cat.roles, scorer=fuzz.partial_ratio, limit=4, score_cutoff=80)
        targets = [TargetRole(name=r[0], fit=round(r[1] / 100, 2)) for r in roles]
        for i, q in enumerate(reqs):
            q.id = f"r1q{i + 1}"
        return BriefSpec(
            title="Staffing brief",
            summary=brief.strip()[:200],
            roles=[RoleSpec(id="r1", title=targets[0].name if targets else "Requested profile", seniority_min=seniority,
                            min_years=min_years, availability=availability, target_roles=targets, requirements=reqs[:12])],
        )
