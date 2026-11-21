"""Deterministic matching: hard filters, per-requirement evidence scores and fit.

All of this is plain numpy over the whole workforce (no LLM), so it is fast,
reproducible and explainable: every number shown in the UI comes from here.
"""

from __future__ import annotations

from dataclasses import dataclass, field

import numpy as np

from . import vocab
from .data import Store
from .schemas import Requirement, RoleSpec, TeamNeed


@dataclass
class RoleScores:
    role: RoleSpec
    eligible: np.ndarray  # bool (n,)
    funnel: list[dict]
    fit: np.ndarray  # float32 (n,), -1 where not eligible
    req: dict[str, np.ndarray] = field(default_factory=dict)
    weights: dict[str, float] = field(default_factory=dict)
    role_fit: np.ndarray | None = None
    seniority: np.ndarray | None = None
    penalty: np.ndarray | None = None  # 1 where every must-have is shown, else 0
    must_shown: np.ndarray | None = None  # must-haves shown (1) / partly shown (0.5), summed
    n_must: int = 0
    rank: np.ndarray | None = None  # ordering key: must-haves shown first, then fit
    scored_reqs: list[Requirement] = field(default_factory=list)


def requirement_weight(q: Requirement) -> float:
    if q.unmapped:
        return 0.0
    w = vocab.IMPORTANCE_WEIGHT[q.importance]
    return w * vocab.SOFT_FACTOR if q.kind == "soft" else w


class Scorer:
    def __init__(self, store: Store):
        self.s = store

    # ------------------------------------------------------------ filters
    def hard_filters(self, role: RoleSpec) -> tuple[np.ndarray, list[dict]]:
        s = self.s
        mask = np.ones(s.n, dtype=bool)
        funnel = [{"label": "Whole workforce", "count": int(s.n)}]
        allowed = vocab.AVAILABILITY_FILTER[role.availability]
        if role.availability != "any":
            mask &= np.isin(s.avail, list(allowed))
            funnel.append({
                "label": "Available now" if role.availability == "now" else "Available within 3 months",
                "count": int(mask.sum()),
            })
        if role.min_years:
            mask &= s.years >= role.min_years
            funnel.append({"label": f"{role.min_years}+ years of experience", "count": int(mask.sum())})
        if role.countries:
            ids = [s.cat.country_id[c] for c in role.countries if c in s.cat.country_id]
            mask &= np.isin(s.country, ids)
            names = ", ".join(vocab.COUNTRY_EN.get(c, c) for c in role.countries)
            funnel.append({"label": f"Based in {names}", "count": int(mask.sum())})
        if role.mobility_required:
            mask &= s.mobility
            funnel.append({"label": "Open to international mobility", "count": int(mask.sum())})
        return mask, funnel

    # ------------------------------------------------------- requirements
    def skill_vector(self, q: Requirement | TeamNeed) -> np.ndarray:
        s, cat = self.s, self.s.cat
        out = np.zeros(s.n, dtype=np.float32)
        if q.skills:
            w = np.zeros(len(cat.skills), dtype=np.float32)
            for ref in q.skills:
                sid = cat.skill_id.get(ref.name)
                if sid is not None:
                    w[sid] = max(w[sid], vocab.MATCH_WEIGHT[ref.match])
            roww = w[s.sk_id]
            sel = np.nonzero(roww > 0)[0]
            if sel.size:
                vals = roww[sel] * s.sk_depth[sel]
                emp = s.sk_emp[sel]
                best = np.zeros(s.n, dtype=np.float32)
                total = np.zeros(s.n, dtype=np.float32)
                np.maximum.at(best, emp, vals)
                np.add.at(total, emp, vals)
                # Strongest single piece of evidence, plus a small bonus for breadth.
                out = np.minimum(1.0, best + 0.1 * np.minimum(1.0, total - best))
        if q.certs:
            has = self.cert_mask(q.certs)
            out = np.where(has, np.minimum(1.0, np.maximum(out, 0.75) + 0.1 * (out > 0)), out)
        return out.astype(np.float32)

    def cert_mask(self, certs: list[str]) -> np.ndarray:
        s = self.s
        ids = [s.cat.cert_id[c] for c in certs if c in s.cat.cert_id]
        has = np.zeros(s.n, dtype=bool)
        if ids:
            has[s.ce_emp[np.isin(s.ce_id, ids)]] = True
        return has

    def sector_vector(self, sector: str) -> np.ndarray:
        s = self.s
        sid = s.cat.sector_id[sector]
        primary = (s.sector == sid).astype(np.float32)
        proj = s.sec_proj[:, sid].astype(np.float32)
        recent = (s.sec_proj_last[:, sid] >= s.current_year - 3).astype(np.float32)
        proj_score = np.where(proj > 0, np.minimum(0.95, 0.6 + 0.1 * (proj - 1) + 0.1 * recent), 0.0)
        employer = s.sec_employer[:, sid].astype(np.float32) * 0.6
        return np.maximum(np.maximum(primary, proj_score), employer).astype(np.float32)

    def language_vector(self, language: str, min_level: str | None) -> np.ndarray:
        s = self.s
        names = vocab.LANGUAGE_EQUIVALENTS.get(language, {language})
        ids = [s.cat.lang_id[n] for n in names if n in s.cat.lang_id]
        lvl = s.lang_level[:, ids].max(axis=1) if ids else np.zeros(s.n, dtype=np.int8)
        need = vocab.LANG_LEVEL_RANK.get(min_level or "B2", 4)
        return np.where(lvl >= need, 1.0, np.where(lvl == need - 1, 0.5, np.where(lvl > 0, 0.2, 0.0))).astype(np.float32)

    def soft_vector(self, q: Requirement | TeamNeed) -> np.ndarray:
        s = self.s
        soft_ids = [s.cat.soft_id[x] for x in q.soft if x in s.cat.soft_id]
        meth_ids = [s.cat.method_id[x] for x in q.soft if x in s.cat.method_id]
        cnt = np.zeros(s.n, dtype=np.float32)
        if soft_ids:
            cnt += s.soft_mask[:, soft_ids].sum(axis=1)
        if meth_ids:
            cnt += s.method_mask[:, meth_ids].sum(axis=1)
        # Self-declared soft skills: capped below "strong evidence".
        out = np.where(cnt > 0, np.minimum(0.8, 0.6 + 0.1 * (cnt - 1)), 0.0).astype(np.float32)
        if q.skills or q.certs:
            out = np.maximum(out, self.skill_vector(q))
        return out

    def requirement_vector(self, q: Requirement | TeamNeed) -> np.ndarray:
        if q.unmapped:
            return np.zeros(self.s.n, dtype=np.float32)
        if q.kind == "sector" and q.sector:
            return self.sector_vector(q.sector)
        if q.kind == "language" and q.language:
            return self.language_vector(q.language, q.min_level)
        if q.kind == "certification":
            has = self.cert_mask(q.certs).astype(np.float32)
            if q.skills:
                return np.maximum(has, 0.5 * self.skill_vector(q.model_copy(update={"certs": []})))
            return has
        if q.kind == "soft":
            return self.soft_vector(q)
        return self.skill_vector(q)

    # ---------------------------------------------------------------- fit
    def score_role(self, role: RoleSpec) -> RoleScores:
        s = self.s
        eligible, funnel = self.hard_filters(role)
        num = np.zeros(s.n, dtype=np.float32)
        den = 0.0
        rs = RoleScores(role=role, eligible=eligible, funnel=funnel, fit=num)
        must_shown = np.zeros(s.n, dtype=np.float32)
        n_must = 0
        for q in role.requirements:
            w = requirement_weight(q)
            v = self.requirement_vector(q)
            rs.req[q.id] = v
            rs.weights[q.id] = w
            if w <= 0:
                continue
            rs.scored_reqs.append(q)
            num += w * v
            den += w
            if q.importance == "must" and q.kind != "soft":
                # Non-compensatory: count must-haves shown (1) or partly shown (0.5).
                # Ranking uses this count first, so strength elsewhere can't hide a missing must-have.
                must_shown += np.where(v >= vocab.COVERED, 1.0, np.where(v >= vocab.PARTIAL, 0.5, 0.0)).astype(np.float32)
                n_must += 1
        if role.target_roles:
            rw = np.zeros(len(s.cat.roles), dtype=np.float32)
            for t in role.target_roles:
                rid = s.cat.role_id.get(t.name)
                if rid is not None:
                    rw[rid] = max(rw[rid], t.fit)
            rs.role_fit = rw[s.role]
            num += vocab.ROLE_FIT_WEIGHT * rs.role_fit
            den += vocab.ROLE_FIT_WEIGHT
        if role.seniority_min:
            m = vocab.SENIORITY.index(role.seniority_min)
            diff = s.senior.astype(np.int16) - m
            if role.seniority_mode == "min":
                rs.seniority = np.where(diff >= 0, 1.0, np.where(diff == -1, 0.5, 0.0)).astype(np.float32)
            else:
                # Target level: exact match is highest; slightly above is good; far above (overqualified) ranks lower.
                rs.seniority = np.select(
                    [diff == 0, diff == 1, diff == 2, diff >= 3, diff == -1],
                    [1.0, 0.60, 0.35, 0.15, 0.40],
                    default=0.0,
                ).astype(np.float32)
            num += vocab.SENIORITY_WEIGHT * rs.seniority
            den += vocab.SENIORITY_WEIGHT
        fit = (num / den) if den > 0 else np.zeros(s.n, dtype=np.float32)
        rs.must_shown = must_shown
        rs.n_must = n_must
        rs.penalty = np.where(must_shown < n_must, 0.0, 1.0).astype(np.float32)  # 1 = every must-have shown
        rs.fit = np.where(eligible, fit, -1.0).astype(np.float32)
        # Ranking key: must-haves shown first (steps of 0.5 outweigh any fit difference), then fit.
        rs.rank = np.where(eligible, 2.0 * must_shown + 0.99 * fit, -1.0).astype(np.float32)
        return rs

    def top(self, rs: RoleScores, k: int, exclude: set[int] | None = None) -> list[int]:
        key = rs.rank if rs.rank is not None else rs.fit
        if exclude:
            key = key.copy()
            key[list(exclude)] = -1.0
        valid = int((key >= 0).sum())
        if valid == 0:
            return []
        k = min(k, valid)
        part = np.argpartition(-key, k - 1)[:k]
        # Explainable order: must-haves shown, then fit, then people available now (bench) first.
        order = np.lexsort((self.s.avail[part], -key[part]))
        return [int(i) for i in part[order]]
