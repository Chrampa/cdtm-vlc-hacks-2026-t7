"""Turns scores + a raw profile into an explainable candidate card.

Every statement here is derived from profile fields and carries evidence IDs
(S = skill, C = certification, P = project, X = job, L = language, F = profile fact),
so the UI can show exactly where each claim comes from.
"""

from __future__ import annotations

from typing import Any

from . import vocab
from .data import Store
from .schemas import Requirement, RoleSpec
from .scoring import RoleScores


def _yrs(x: float) -> str:
    x = float(x)
    if x < 1:
        return f"{int(round(x * 12))} months" if x > 0 else "0 years"
    return f"{x:g} year" + ("" if x == 1 else "s")


def _used(n_proj: int, n_jobs: int) -> str:
    parts = []
    if n_proj:
        parts.append(f"{n_proj} project" + ("s" if n_proj > 1 else ""))
    if n_jobs:
        parts.append(f"{n_jobs} job" + ("s" if n_jobs > 1 else ""))
    return "used in " + " and ".join(parts) if parts else "not used in any recorded project or job"


def _status(score: float) -> str:
    if score >= vocab.COVERED:
        return "covered"
    if score >= vocab.PARTIAL:
        return "partial"
    return "missing"


class EvidenceBuilder:
    def __init__(self, store: Store):
        self.s = store

    # ---------------------------------------------------------- evidence
    def evidence(self, p: dict[str, Any]) -> tuple[list[dict], dict[str, Any]]:
        """Numbered evidence items for one profile, plus look-up helpers."""
        cy = self.s.current_year
        items: list[dict] = []
        by_skill: dict[str, dict] = {}
        projects = sorted(p["proyectos"] or [], key=lambda x: -(x.get("anio") or 0))
        jobs = p["experiencia"] or []

        items.append({"id": "F1", "type": "fact", "text": f"{p['puesto_actual']} · {p['nivel_seniority']} · {p['anios_experiencia']} years of experience ({p['anios_en_ntt']:g} at NTT DATA)"})
        items.append({"id": "F2", "type": "fact", "text": vocab.AVAILABILITY_LABEL[vocab.AVAILABILITY.index(p["disponibilidad"])] + f" · {p['modalidad_trabajo']}" + (" · open to international mobility" if p["movilidad_internacional"] else "")})
        items.append({"id": "F3", "type": "fact", "text": f"Based in {p['ciudad']}, {vocab.COUNTRY_EN.get(p['pais'], p['pais'])}"})
        items.append({"id": "F4", "type": "fact", "text": f"Main sector: {vocab.SECTOR_EN.get(p['sector_principal'], p['sector_principal'])}"})

        proj_ids: list[str] = []
        for i, pr in enumerate(projects, 1):
            pid = f"P{i}"
            proj_ids.append(pid)
            items.append({
                "id": pid, "type": "project",
                "text": f"{pr['nombre']} — {vocab.SECTOR_EN.get(pr['cliente_sector'], pr['cliente_sector'])} client, {pr['anio']} ({pr['rol']})",
                "tech": list(pr.get("tecnologias") or []), "sector": pr["cliente_sector"], "year": pr["anio"],
            })
        job_ids: list[str] = []
        for i, j in enumerate(jobs, 1):
            xid = f"X{i}"
            job_ids.append(xid)
            end = "today" if j["fin"] == "Actual" else str(j["fin"])[:4]
            items.append({
                "id": xid, "type": "job",
                "text": f"{j['puesto']} at {j['empresa']} ({str(j['inicio'])[:4]}–{end})",
                "tech": list(j.get("tecnologias") or []), "employer": j["empresa"],
                "sector": vocab.EMPLOYER_SECTOR.get(j["empresa"]),
            })
        for i, sk in enumerate(sorted(p["skills"] or [], key=lambda x: (-x["nivel"], -x["anios"])), 1):
            sid = f"S{i}"
            used_p = [pid for pid, pr in zip(proj_ids, projects) if sk["skill"] in (pr.get("tecnologias") or [])]
            used_x = [xid for xid, j in zip(job_ids, jobs) if sk["skill"] in (j.get("tecnologias") or [])]
            years_used = [pr["anio"] for pr in projects if sk["skill"] in (pr.get("tecnologias") or [])]
            for j in jobs:
                if sk["skill"] in (j.get("tecnologias") or []):
                    years_used.append(cy if j["fin"] == "Actual" else int(str(j["fin"])[:4]))
            item = {
                "id": sid, "type": "skill", "name": sk["skill"], "level": int(sk["nivel"]), "years": float(sk["anios"]),
                "used_in": used_p + used_x, "last_used": max(years_used) if years_used else None,
                "text": f"{sk['skill']} — level {sk['nivel']}/5, {_yrs(sk['anios'])}, " + _used(len(used_p), len(used_x)),
            }
            items.append(item)
            by_skill[sk["skill"]] = item
        by_cert: dict[str, dict] = {}
        for i, c in enumerate(sorted(p["certificaciones"] or [], key=lambda x: -(x.get("anio") or 0)), 1):
            item = {"id": f"C{i}", "type": "cert", "name": c["nombre"], "text": f"{c['nombre']} ({c['anio']})"}
            items.append(item)
            by_cert[c["nombre"]] = item
        by_lang: dict[str, dict] = {}
        for i, l in enumerate(p["idiomas"] or [], 1):
            item = {"id": f"L{i}", "type": "language", "name": l["idioma"], "level": l["nivel"],
                    "text": f"{vocab.LANGUAGE_EN.get(l['idioma'], l['idioma'])} {l['nivel']}"}
            items.append(item)
            by_lang[l["idioma"]] = item
        helpers = {"by_skill": by_skill, "by_cert": by_cert, "by_lang": by_lang, "items": {it["id"]: it for it in items}}
        return items, helpers

    # ------------------------------------------------------ requirements
    def requirement_detail(self, q: Requirement, score: float, p: dict, h: dict) -> dict:
        ev: list[str] = []
        lines: list[str] = []
        notes: dict[str, Any] = {}
        if q.unmapped:
            return {"id": q.id, "label": q.label, "importance": q.importance, "kind": q.kind, "implicit": q.implicit,
                    "status": "unknown", "score": None, "evidence": [], "lines": ["Nothing in the profiles can show this, so it is not scored."]}
        if q.kind in ("skill", "soft", "certification"):
            matches = []
            for ref in q.skills:
                it = h["by_skill"].get(ref.name)
                if it:
                    matches.append((vocab.MATCH_WEIGHT[ref.match] * (0.5 * it["level"] / 5 + 0.3 * min(it["years"] / 6, 1) + 0.2 * bool(it["used_in"])), ref, it))
            matches.sort(key=lambda m: -m[0])
            for _, ref, it in matches[:3]:
                via = "" if ref.match == "exact" else f" ({ref.match} match)"
                lines.append(it["text"] + via)
                ev.append(it["id"])
                ev.extend(it["used_in"][:2])
            if matches:
                notes["best"] = {"skill": matches[0][2], "match": matches[0][1].match}
            for c in q.certs:
                it = h["by_cert"].get(c)
                if it:
                    lines.append(f"Certified: {it['text']}")
                    ev.append(it["id"])
            if q.kind == "soft":
                own = [x for x in q.soft if x in (p["habilidades_blandas"] or []) or x in (p["metodologias"] or [])]
                if own:
                    lines.append("Self-declared: " + ", ".join(own))
                    ev.append("F1")
        elif q.kind == "sector" and q.sector:
            sec_en = vocab.SECTOR_EN.get(q.sector, q.sector)
            if p["sector_principal"] == q.sector:
                lines.append(f"Main sector is {sec_en}")
                ev.append("F4")
            projs = [it for it in h["items"].values() if it["type"] == "project" and it.get("sector") == q.sector]
            if projs:
                lines.append(f"{len(projs)} project{'s' if len(projs) > 1 else ''} for {sec_en} clients (latest {max(x['year'] for x in projs)})")
                ev.extend(x["id"] for x in projs[:3])
            jobs = [it for it in h["items"].values() if it["type"] == "job" and it.get("sector") == q.sector]
            for j in jobs[:2]:
                lines.append(f"Worked at {j['employer']}")
                ev.append(j["id"])
            if p["sector_principal"] != q.sector and (projs or jobs):
                notes["hidden_sector"] = True
        elif q.kind == "language" and q.language:
            names = vocab.LANGUAGE_EQUIVALENTS.get(q.language, {q.language})
            have = [h["by_lang"][n] for n in names if n in h["by_lang"]]
            need = q.min_level or "B2"
            if have:
                best = max(have, key=lambda it: vocab.LANG_LEVEL_RANK.get(it["level"], 0))
                lines.append(f"{best['text']} (needs {need})")
                ev.append(best["id"])
            else:
                lines.append(f"No {vocab.LANGUAGE_EN.get(q.language, q.language)} in profile (needs {need})")
        status = _status(score)
        if not lines:
            lines.append("No evidence in the profile")
        return {
            "id": q.id, "label": q.label, "importance": q.importance, "kind": q.kind, "implicit": q.implicit,
            "status": status, "score": round(float(score), 3), "evidence": list(dict.fromkeys(ev)), "lines": lines,
            "_notes": notes,
        }

    # -------------------------------------------------------------- card
    def card(self, rs: RoleScores, i: int, p: dict, keyword_hit: bool | None, full: bool) -> dict:
        s, role = self.s, rs.role
        items, h = self.evidence(p)
        reqs = [self.requirement_detail(q, float(rs.req[q.id][i]), p, h) for q in role.requirements]
        must = [r for r in reqs if r["importance"] == "must" and r["status"] != "unknown"]
        must_cov = sum(r["status"] == "covered" for r in must)

        strengths = [r for r in reqs if r["status"] == "covered"]
        strengths.sort(key=lambda r: (r["importance"] != "must", -(r["score"] or 0)))
        gaps = [r for r in reqs if r["status"] in ("missing", "partial")]
        gaps.sort(key=lambda r: (r["importance"] != "must", r["status"] != "missing"))

        risks = self.risks(rs, i, p, reqs)
        target = {t.name: t.fit for t in role.target_roles}
        other_team = bool(role.target_roles) and target.get(p["rol"], 0.0) < 0.8
        hidden_sector = any(r.get("_notes", {}).get("hidden_sector") for r in reqs if r["status"] != "missing")

        seniority = None
        if role.seniority_min:
            seniority = {"required": role.seniority_min, "actual": p["nivel_seniority"],
                         "status": _status(float(rs.seniority[i])) if rs.seniority is not None else "covered"}
        penalty = float(rs.penalty[i]) if rs.penalty is not None else 1.0
        card = {
            "employee_id": p["employee_id"],
            "name": p["nombre_completo"],
            "role": p["rol"],
            "position": p["puesto_actual"],
            "area": p["area"],
            "seniority": p["nivel_seniority"],
            "years": int(p["anios_experiencia"]),
            "location": f"{p['ciudad']}, {vocab.COUNTRY_EN.get(p['pais'], p['pais'])}",
            "availability": vocab.AVAILABILITY_LABEL[vocab.AVAILABILITY.index(p["disponibilidad"])],
            "availability_code": vocab.AVAILABILITY.index(p["disponibilidad"]),
            "sector": vocab.SECTOR_EN.get(p["sector_principal"], p["sector_principal"]),
            "fit": round(float(rs.fit[i]) * 100),
            "role_fit": round(float(rs.role_fit[i]), 2) if rs.role_fit is not None else None,
            "must_covered": must_cov,
            "must_total": len(must),
            "penalized": penalty < 1.0,
            "requirements": [{k: v for k, v in r.items() if not k.startswith("_")} for r in reqs],
            "strengths": [f"{r['label']}: {r['lines'][0]}" for r in strengths[:3]],
            "gaps": [("Missing" if r["status"] == "missing" else "Partly shown") + f" — {r['label']}" + (" (nice-to-have)" if r["importance"] == "nice" else "") for r in gaps[:4]],
            "risks": risks,
            "seniority_check": seniority,
            "other_team": other_team,
            "hidden_sector": hidden_sector,
            "keyword_hit": keyword_hit,
            "headline": self.headline(must_cov, len(must), strengths),
        }
        if full:
            card["evidence"] = [{k: v for k, v in it.items() if k in ("id", "type", "text", "name", "level", "years", "used_in", "last_used")} for it in items]
            card["soft_skills"] = list(p["habilidades_blandas"] or [])
            card["methodologies"] = list(p["metodologias"] or [])
            card["education"] = [f"{e['titulo']} — {e['institucion']} ({e['anio_fin']})" for e in (p["estudios"] or [])]
            card["summary"] = p["resumen"]
        return card

    @staticmethod
    def headline(must_cov: int, must_total: int, strengths: list[dict]) -> str:
        top = ", ".join(r["label"] for r in strengths[:2])
        base = f"Covers {must_cov} of {must_total} must-haves" if must_total else "No must-haves defined"
        return base + (f" · strongest: {top}" if top else "")

    def risks(self, rs: RoleScores, i: int, p: dict, reqs: list[dict]) -> list[dict]:
        out: list[dict] = []
        cy = self.s.current_year
        if p["disponibilidad"] == vocab.AVAILABILITY[1]:
            out.append({"text": "Still on another project — frees up within 3 months", "evidence": ["F2"], "severity": 2})
        if rs.seniority is not None and rs.seniority[i] < 1:
            out.append({"text": f"Less senior than requested ({p['nivel_seniority']} vs {rs.role.seniority_min})", "evidence": ["F1"], "severity": 2})
        for r in reqs:
            if r["importance"] != "must" or r["status"] == "missing":
                continue
            best = r.get("_notes", {}).get("best")
            if not best:
                continue
            sk, match = best["skill"], best["match"]
            if match in ("related", "transferable"):
                out.append({"text": f"{r['label']}: only {match} experience ({sk['name']})", "evidence": [sk["id"]], "severity": 2})
            if sk["level"] >= 4 and sk["years"] < 1:
                out.append({"text": f"Rates {sk['name']} {sk['level']}/5 with only {_yrs(sk['years'])} of use — verify depth", "evidence": [sk["id"]], "severity": 1})
            elif sk["level"] <= 2 and sk["years"] >= 3:
                out.append({"text": f"{_yrs(sk['years'])} with {sk['name']} but self-rated {sk['level']}/5 — may be shallow", "evidence": [sk["id"]], "severity": 1})
            if not sk["used_in"]:
                out.append({"text": f"{sk['name']} is listed but not used in any recorded project or job", "evidence": [sk["id"]], "severity": 1})
            elif sk["last_used"] and sk["last_used"] <= cy - 4:
                out.append({"text": f"{sk['name']} last used in {sk['last_used']}", "evidence": [sk["id"]], "severity": 1})
        for r in reqs:
            if r["kind"] == "language" and r["status"] in ("partial", "missing") and r["importance"] == "must":
                out.append({"text": f"Language below requirement: {r['lines'][0]}", "evidence": r["evidence"], "severity": 2})
        out.sort(key=lambda x: -x["severity"])
        seen: set[str] = set()
        uniq = []
        for r in out:
            if r["text"] not in seen:
                seen.add(r["text"])
                uniq.append(r)
        return uniq[:4]
