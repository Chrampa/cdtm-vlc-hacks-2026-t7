"""AI explanations that can only say what the evidence supports.

The model gets numbered evidence lines and must cite them like [S3]. A validator then
drops any sentence that cites nothing, cites an ID that does not exist, or names a
skill/certification the person does not have (unless it is stating a gap).
"""

from __future__ import annotations

import hashlib
import json
import logging
import re
from collections import OrderedDict

from .data import Store
from .llm import LLMClient, LLMError

log = logging.getLogger(__name__)

EXPLAIN_SCHEMA = {
    "type": "object",
    "properties": {
        "summary": {"type": "string"},
        "verdict": {"type": "string", "enum": ["strong", "good", "partial", "weak"]},
        "verify": {"type": "array", "items": {"type": "string"}},
    },
    "required": ["summary", "verdict", "verify"],
    "additionalProperties": False,
}

EXPLAIN_SYSTEM = """You help HR staff understand why an internal employee fits (or does not fit) a staffing need.
You receive the position's requirements, the computed coverage of each requirement, and numbered EVIDENCE lines from the employee's profile.

Write:
- summary: 2-3 short sentences in plain English for a non-technical HR reader: why this person fits, the most important gap, and any transferable experience (e.g. comes from another team or sector). EVERY sentence must cite evidence IDs in square brackets, e.g. [S2][P1]. When you name a requirement, write its label in double quotes, e.g. covers "RAG solutions".
- verdict: strong | good | partial | weak.
- verify: 1-2 concrete things to check in an interview, each citing evidence IDs.

Facts about the current role, availability, location and main sector are F1-F4: cite them too.
Hard rules: use ONLY the evidence lines. Any number you write must appear in the evidence you cite. Never mention a skill, certification, employer, project or language that is not in the evidence, except to say it is missing. Do not invent numbers. No marketing language."""

TEAM_SCHEMA = {
    "type": "object",
    "properties": {
        "summary": {"type": "string"},
        "risks": {"type": "array", "items": {"type": "string"}},
        "suggestions": {"type": "array", "items": {"type": "string"}},
    },
    "required": ["summary", "risks", "suggestions"],
    "additionalProperties": False,
}

TEAM_SYSTEM = """You review a proposed project team for an HR staffing manager.
You get each position, the person proposed for it, their fit score, the must-haves they cover and the gaps. The assignment was computed by an optimiser that never repeats a person and respects availability.

Write:
- summary: 2-3 plain-English sentences on how well the team covers the brief as a whole (balance, shared strengths, coverage).
- risks: up to 3 team-level risks (uncovered must-haves, availability, seniority balance), each naming the position.
- suggestions: up to 2 concrete actions (e.g. pair someone with a named alternate, verify something in interview).
Use only the information given; refer to people by the names given; do not invent facts."""

# Catalog skills that are also everyday words; mentioning them is not a skill claim.
_GENERIC = {
    "Cloud", "Pricing", "Networking", "Reporting", "Compliance", "Scripting", "Tuning", "Workshops", "Personas",
    "Demos", "Onboarding", "Monitorización", "Estrategia", "Gobierno", "Normativa", "Innovación", "Eventos",
    "Facilitación", "Logística", "Planificación", "Presupuestos", "Contabilidad", "Consolidación", "Negociación",
    "Mediación", "Encuestas", "Entrevistas", "Prototipado", "Preventa", "Copywriting", "Benchmarking",
    "Wireframing", "Provisioning", "Facturación", "Seguros", "Banca", "Pagos", "Omnicanalidad", "Compensación",
    "Relaciones laborales", "Atención al cliente", "Mejora continua", "Gestión de proyectos", "Microservicios",
}
_CITE = re.compile(r"\[([A-Z]\d{1,3})\]")
_JUNK = re.compile(r"\[(?![A-Z]\d{1,3}\])[^\]]*\]")  # bracketed text that is not an evidence ID
_NUM = re.compile(r"(?<![\w.])\d+(?:[.,]\d+)?(?:/5)?(?![\w])")
_QUOTED = re.compile(r"[\"“”][^\"“”]{1,80}[\"“”]")
_NEG = re.compile(r"\b(no|not|lack|lacks|lacking|missing|without|gap|absent|never|none|n't)\b", re.I)


class Explainer:
    def __init__(self, store: Store, llm: LLMClient, model: str, team_model: str):
        self.store = store
        self.llm = llm
        self.model = model
        self.team_model = team_model
        self._cache: OrderedDict[str, dict] = OrderedDict()
        cat = store.cat
        # Vocabulary terms worth checking for ungrounded mentions (skip very short/generic ones).
        terms = [t for t in cat.skills + cat.certs if len(t) >= 4 and t not in _GENERIC]
        self._term_re = [(t, re.compile(rf"(?<![\w]){re.escape(t)}(?![\w])", re.I)) for t in terms]

    async def explain(self, role: dict, card: dict) -> dict:
        key = hashlib.sha256(json.dumps([self.model, role, card["employee_id"]], sort_keys=True, default=str).encode()).hexdigest()
        if key in self._cache:
            return self._cache[key]
        evidence = card["evidence"]
        ids = {e["id"] for e in evidence}
        own_terms = {e["name"].lower() for e in evidence if e.get("name")}
        reqs = "\n".join(
            f"- [{r['importance'].upper()}] {r['label']}: {r['status']}" + (f" (evidence {', '.join(r['evidence'])})" if r["evidence"] else "")
            for r in card["requirements"]
        )
        ev = "\n".join(f"[{e['id']}] {e['text']}" for e in evidence)
        user = (
            f"POSITION: {role['title']}\nFIT SCORE: {card['fit']}%\nREQUIREMENTS AND COVERAGE:\n{reqs}\n\n"
            f"EMPLOYEE: {card['name']} — current role {card['role']} in {card['area']}"
            + (" (different team from the usual one for this position)" if card.get("other_team") else "")
            + f"\nEVIDENCE:\n{ev}"
        )
        if not self.llm.available:
            return {"ok": False, "error": "AI is not configured"}
        try:
            out, meta = await self.llm.json(self.model, EXPLAIN_SYSTEM, user, EXPLAIN_SCHEMA, "explanation", max_tokens=800, timeout=40, temperature=0.2)
        except LLMError as e:
            log.warning("explain failed: %s", e)
            return {"ok": False, "error": "The AI service did not answer. The evidence above is still complete."}
        removed = 0
        texts = {e["id"]: e["text"] for e in evidence}
        allowed = [card["role"], card["position"], card["area"], role["title"], *[r["label"] for r in card["requirements"]]]
        summary, r1 = self._guard(out.get("summary", ""), texts, own_terms, allowed)
        removed += r1
        verify = []
        for v in (out.get("verify") or [])[:2]:
            txt, r2 = self._guard(v, texts, own_terms, allowed)
            removed += r2
            if txt:
                verify.append(txt)
        verdict = out.get("verdict") if out.get("verdict") in ("strong", "good", "partial", "weak") else None
        res = {
            "ok": bool(summary),
            "summary": summary or None,
            "verdict": verdict,
            "verify": verify,
            "removed_claims": removed,
            "model": meta["model"],
            "seconds": meta["seconds"],
        }
        if not summary:
            res["error"] = "The AI answer could not be backed by evidence, so it was hidden."
        self._cache[key] = res
        while len(self._cache) > 2000:
            self._cache.popitem(last=False)
        return res

    def _guard(self, text: str, texts: dict[str, str], own_terms: set[str], allowed: list[str]) -> tuple[str, int]:
        """Keep only sentences that (1) cite real evidence, (2) use only numbers found in the
        cited evidence and (3) name only skills/certifications the person has (gaps excepted)."""
        text = (text or "").strip()
        if not text:
            return "", 0
        sentences = re.split(r"(?<=[.!?])\s+(?=[A-Z0-9])", text)
        kept, removed = [], 0
        for s in sentences:
            s = _JUNK.sub("", s).strip()
            cites = _CITE.findall(s)
            if not cites or any(c not in texts for c in cites):
                removed += 1
                continue
            body = _CITE.sub(" ", s)
            cited_text = " ".join(texts[c] for c in cites)
            if any(n not in cited_text for n in _NUM.findall(body)):
                removed += 1
                continue
            if not _NEG.search(body):
                scan = _QUOTED.sub(" ", body)
                for phrase in sorted(own_terms, key=len, reverse=True):
                    scan = re.sub(re.escape(phrase), " ", scan, flags=re.I)
                for phrase in allowed:
                    if phrase:
                        scan = re.sub(re.escape(phrase), " ", scan, flags=re.I)
                bad = [t for t, rx in self._term_re if t.lower() not in own_terms and rx.search(scan)]
                if bad:
                    removed += 1
                    continue
            kept.append(s)
        return " ".join(kept), removed

    async def team_review(self, team: list[dict]) -> dict:
        if not self.llm.available:
            return {"ok": False, "error": "AI is not configured"}
        lines = []
        names = set()
        for t in team:
            if t.get("person"):
                names.add(t["person"]["name"])
                tr = f" [{t['team_role']}]" if t.get("team_role") else ""
                mn = f" Mentored by {t['mentor']}." if t.get("mentor") else ""
                lines.append(
                    f"- {t['role']}{tr}: {t['person']['name']} ({t['person']['role']}, {t['person']['seniority']}, {t['person']['availability']}), fit {t['person']['fit']}%. "
                    f"Covers: {', '.join(t['person'].get('covered', [])) or 'none'}. Gaps: {', '.join(t['person'].get('gaps', [])) or 'none'}.{mn}"
                    + (f" Possible pairing: {t['complement']['name']} covers {', '.join(t['complement']['covers'])}." if t.get("complement") else "")
                )
            else:
                lines.append(f"- {t['role']}: nobody eligible.")
        try:
            out, meta = await self.llm.json(self.team_model, TEAM_SYSTEM, "TEAM:\n" + "\n".join(lines), TEAM_SCHEMA, "team_review", max_tokens=700, timeout=40)
        except LLMError as e:
            log.warning("team review failed: %s", e)
            return {"ok": False, "error": "The AI service did not answer."}
        return {
            "ok": True,
            "summary": out.get("summary", "").strip(),
            "risks": [r for r in (out.get("risks") or [])][:3],
            "suggestions": [s for s in (out.get("suggestions") or [])][:2],
            "model": meta["model"],
            "seconds": meta["seconds"],
        }
