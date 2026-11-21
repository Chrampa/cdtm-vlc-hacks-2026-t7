"""Team forming with OR-Tools CP-SAT: balanced seniority, whole-team needs, mentoring,
3 distinct team alternatives (Best fit, Ready now, Leanest), scorecard, and swap/lock.

Unlike single-role search (which returns a ranked list), team forming optimises the
combination jointly: a candidate's value depends on who else is on the team.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import numpy as np
from ortools.sat.python import cp_model

from . import vocab
from .scoring import RoleScores, Scorer
from .schemas import TeamNeed, TeamOptionId, TeamShape

# Seniority indices in vocab.SENIORITY:
# 0=Trainee, 1=Junior, 2=Mid, 3=Senior, 4=Lead, 5=Principal
JUNIOR_MAX = 1
MID_LVL = 2
SENIOR_MIN = 3
ANCHOR_MIN = 4


def default_shape(n_slots: int) -> TeamShape:
    """Sensible default team-balance rules scaled to team size."""
    return TeamShape(
        enabled=n_slots >= 2,
        anchors_min=1 if n_slots >= 2 else 0,
        max_senior_plus_ratio=0.5,
        min_mid=1 if n_slots >= 3 else 0,
        min_junior=1 if n_slots >= 4 else 0,
        mentor_juniors=True,
        prefer_shared_language=True,
        max_tz_spread=4,
        avoid_duplicates=True,
    )


@dataclass
class _Slot:
    slot_id: str
    role_idx: int
    role_id: str
    slot_num: int
    slot_label: str
    rs: RoleScores


@dataclass
class _PoolData:
    slots: list[_Slot]
    pools: list[list[int]]  # candidate store indices per slot
    all_cands: list[int]
    tz: dict[int, int]
    langs_b2: dict[int, set[int]]
    skills: dict[int, set[int]]
    need_scores: dict[str, np.ndarray]  # need.id -> float32 (n,)
    common_langs: list[int]  # language ids spoken at B2+ by candidates across slots


def _top_masked(scorer: Scorer, rs: RoleScores, mask: np.ndarray, k: int) -> list[int]:
    key = rs.rank if rs.rank is not None else rs.fit
    masked = np.where(mask & (key >= 0), key, -1.0)
    valid = int((masked >= 0).sum())
    if valid == 0:
        return []
    k = min(k, valid)
    part = np.argpartition(-masked, k - 1)[:k]
    order = np.lexsort((scorer.s.avail[part], -masked[part]))
    return [int(i) for i in part[order]]


def _build_pools(
    scorer: Scorer,
    scored: list[RoleScores],
    team_needs: list[TeamNeed],
    locks: dict[str, str],
) -> _PoolData:
    s = scorer.s
    slots: list[_Slot] = []
    for ri, rs in enumerate(scored):
        for k in range(rs.role.count):
            label = rs.role.title if rs.role.count == 1 else f"{rs.role.title} {k + 1}"
            slots.append(_Slot(
                slot_id=f"{rs.role.id}#{k}",
                role_idx=ri,
                role_id=rs.role.id,
                slot_num=k,
                slot_label=label,
                rs=rs,
            ))

    need_scores: dict[str, np.ndarray] = {}
    for tn in team_needs:
        if not tn.unmapped:
            need_scores[tn.id] = scorer.requirement_vector(tn)

    role_pool_cache: dict[str, list[int]] = {}
    tier_masks = [
        s.senior >= ANCHOR_MIN,
        s.senior == SENIOR_MIN,
        s.senior == MID_LVL,
        s.senior <= JUNIOR_MAX,
    ]
    bench = s.avail == 0

    for rs in scored:
        chosen: list[int] = []
        seen: set[int] = set()

        def add_many(idxs: list[int]) -> None:
            for idx in idxs:
                if idx not in seen:
                    seen.add(idx)
                    chosen.append(idx)

        add_many(scorer.top(rs, 24))
        for tm in tier_masks:
            add_many(_top_masked(scorer, rs, tm, 12))
            add_many(_top_masked(scorer, rs, tm & bench, 8))
        for tn in team_needs:
            vec = need_scores.get(tn.id)
            if vec is not None:
                cov = vec >= vocab.COVERED
                add_many(_top_masked(scorer, rs, cov, 10))
                add_many(_top_masked(scorer, rs, cov & (s.senior == MID_LVL), 5))
                add_many(_top_masked(scorer, rs, cov & bench, 5))
        role_pool_cache[rs.role.id] = chosen[:110]

    pools: list[list[int]] = []
    for sl in slots:
        p = list(role_pool_cache[sl.role_id])
        locked_eid = locks.get(sl.slot_id)
        if locked_eid and locked_eid in s.idx_by_id:
            li = s.idx_by_id[locked_eid]
            if li not in p:
                p.insert(0, li)
        pools.append(p)

    all_cands = sorted({c for p in pools for c in p})
    tz: dict[int, int] = {}
    langs_b2: dict[int, set[int]] = {}
    eq_lang_ids: dict[int, list[int]] = {}
    for lid, lname in enumerate(s.cat.languages):
        eqs = vocab.LANGUAGE_EQUIVALENTS.get(lname, {lname})
        eq_lang_ids[lid] = [s.cat.lang_id[x] for x in eqs if x in s.cat.lang_id]

    for c in all_cands:
        cname = s.cat.countries[int(s.country[c])]
        tz[c] = vocab.COUNTRY_TZ.get(cname, 0)
        lvls = s.lang_level[c]
        b2 = set()
        for lid in range(len(s.cat.languages)):
            if any(lvls[eid] >= 4 for eid in eq_lang_ids[lid]):
                b2.add(lid)
        langs_b2[c] = b2

    # Skills for pool candidates (for near-duplicate profile checks)
    skills: dict[int, set[int]] = {c: set() for c in all_cands}
    if all_cands:
        cand_arr = np.array(all_cands, dtype=np.int32)
        hit = np.isin(s.sk_emp, cand_arr)
        for emp, sid in zip(s.sk_emp[hit].tolist(), s.sk_id[hit].tolist()):
            skills[emp].add(sid)

    # Languages that could possibly be shared across every filled slot
    common_langs: list[int] = []
    non_empty = [p for p in pools if p]
    if non_empty:
        for lid in range(len(s.cat.languages)):
            if all(any(lid in langs_b2[c] for c in p) for p in non_empty):
                common_langs.append(lid)

    return _PoolData(
        slots=slots,
        pools=pools,
        all_cands=all_cands,
        tz=tz,
        langs_b2=langs_b2,
        skills=skills,
        need_scores=need_scores,
        common_langs=common_langs,
    )


def _solve_option(
    scorer: Scorer,
    pd: _PoolData,
    team_needs: list[TeamNeed],
    shape: TeamShape,
    locks: dict[str, str],
    mode: TeamOptionId,
) -> dict[int, int]:
    """Solve one team option via OR-Tools CP-SAT. Returns {slot_index: candidate_store_idx}."""
    s = scorer.s
    slots = pd.slots
    n_slots = len(slots)
    filled_slots = [si for si in range(n_slots) if pd.pools[si]]
    n_filled = len(filled_slots)
    if n_filled == 0:
        return {}

    model = cp_model.CpModel()
    x: dict[tuple[int, int], cp_model.IntVar] = {}
    for si in filled_slots:
        for c in pd.pools[si]:
            x[(si, c)] = model.NewBoolVar(f"x_{si}_{c}")

    # 1. Exactly one person per fillable slot.
    for si in filled_slots:
        model.Add(sum(x[(si, c)] for c in pd.pools[si]) == 1)

    # 2. No person in two slots.
    by_cand: dict[int, list[cp_model.IntVar]] = {}
    for (si, c), var in x.items():
        by_cand.setdefault(c, []).append(var)
    for c, vars_c in by_cand.items():
        if len(vars_c) > 1:
            model.Add(sum(vars_c) <= 1)

    # 3. Honour explicit HR locks (unless two locks point to the same person, in which case first wins).
    locked_slots: set[int] = set()
    locked_cands: set[int] = set()
    for si in filled_slots:
        eid = locks.get(slots[si].slot_id)
        if eid and eid in s.idx_by_id:
            li = s.idx_by_id[eid]
            if (si, li) in x and li not in locked_cands:
                model.Add(x[(si, li)] == 1)
                locked_slots.add(si)
                locked_cands.add(li)

    obj: list[cp_model.LinearExpr] = []

    # 4. Individual slot fit, must-haves, availability, and mode-specific incentives.
    for si in filled_slots:
        rs = slots[si].rs
        for c in pd.pools[si]:
            fit_val = max(0.0, float(rs.fit[c]))
            if rs.n_must > 0 and rs.must_shown is not None:
                shown = float(rs.must_shown[c])
                missing = max(0.0, rs.n_must - shown)
                must_ratio = shown / rs.n_must
            else:
                missing = 0.0
                must_ratio = 1.0
            score = int(round(500 * must_ratio + 500 * fit_val - 450 * missing))
            # Respect explicit slot seniority requests (e.g. Senior+ for Architect or PM)
            if rs.role.seniority_min:
                req_lvl = vocab.SENIORITY.index(rs.role.seniority_min)
                act_lvl = int(s.senior[c])
                if act_lvl < req_lvl:
                    score -= 340 * (req_lvl - act_lvl)
                elif rs.role.seniority_mode == "target" and act_lvl >= req_lvl + 2:
                    score -= 120 * (act_lvl - req_lvl - 1)
            av = int(s.avail[c])
            if mode == "ready_now":
                if av == 0:
                    score += 120
                elif av == 1:
                    score -= 1200
                else:
                    score -= 2400
            elif mode == "leanest":
                if av == 0:
                    score += 45
                score -= 65 * int(s.senior[c])
            else:  # best_fit
                if av == 0:
                    score += 55
            obj.append(score * x[(si, c)])

    # 5. Whole-team needs (e.g. Banking domain >= 2, Spanish B2+ for all).
    for tn in team_needs:
        vec = pd.need_scores.get(tn.id)
        if vec is None:
            continue
        is_must = tn.importance == "must"
        if tn.scope == "all":
            pen_miss = -360 if is_must else -110
            pen_part = -160 if is_must else -50
            for si in filled_slots:
                for c in pd.pools[si]:
                    v = float(vec[c])
                    if v < vocab.PARTIAL:
                        obj.append(pen_miss * x[(si, c)])
                    elif v < vocab.COVERED:
                        obj.append(pen_part * x[(si, c)])
        else:
            target = min(tn.min_people, n_filled)
            cov_vars = [x[(si, c)] for si in filled_slots for c in pd.pools[si] if float(vec[c]) >= vocab.COVERED]
            short = model.NewIntVar(0, target, f"tn_short_{tn.id}")
            model.Add(sum(cov_vars) + short >= target)
            obj.append((-460 if is_must else -160) * short)

    # 6. Team shape rules (soft penalties so solver balances without ever going infeasible).
    scale = 0.85 if mode == "ready_now" else 1.0
    if shape.enabled and n_filled >= 2:
        # 6a. Anchor (Lead or Principal)
        anchor_vars = [x[(si, c)] for si in filled_slots for c in pd.pools[si] if int(s.senior[c]) >= ANCHOR_MIN]
        n_anchors = sum(anchor_vars)
        if shape.anchors_min > 0:
            short_anc = model.NewIntVar(0, shape.anchors_min, "short_anc")
            model.Add(n_anchors + short_anc >= shape.anchors_min)
            obj.append(int(-420 * scale) * short_anc)
        max_anc = max(shape.anchors_min, max(1, n_filled // 3))
        extra_anc = model.NewIntVar(0, n_filled, "extra_anc")
        model.Add(extra_anc >= n_anchors - max_anc)
        obj.append(int(-120 * scale) * extra_anc)

        # 6b. Senior+ cap (Senior, Lead, Principal)
        sp_vars = [x[(si, c)] for si in filled_slots for c in pd.pools[si] if int(s.senior[c]) >= SENIOR_MIN]
        max_sp = max(shape.anchors_min, int(n_filled * shape.max_senior_plus_ratio + 1e-9))
        excess_sp = model.NewIntVar(0, n_filled, "excess_sp")
        model.Add(excess_sp >= sum(sp_vars) - max_sp)
        w_sp = -420 if mode == "leanest" else int(-280 * scale)
        obj.append(w_sp * excess_sp)

        # 6c. Mid floor (for teams of 3+)
        if n_filled >= 3 and shape.min_mid > 0:
            mid_vars = [x[(si, c)] for si in filled_slots for c in pd.pools[si] if int(s.senior[c]) == MID_LVL]
            short_mid = model.NewIntVar(0, shape.min_mid, "short_mid")
            model.Add(sum(mid_vars) + short_mid >= shape.min_mid)
            w_mid = -360 if mode == "leanest" else int(-300 * scale)
            obj.append(w_mid * short_mid)

        # 6d. Junior floor + mentoring (for teams of 4+ or when explicitly requested)
        if shape.mentor_juniors:
            for si in filled_slots:
                for c in pd.pools[si]:
                    if int(s.senior[c]) <= JUNIOR_MAX:
                        area_c = int(s.area[c])
                        mentors = [
                            x[(sj, m)]
                            for sj in filled_slots if sj != si
                            for m in pd.pools[sj]
                            if int(s.senior[m]) >= SENIOR_MIN and int(s.area[m]) == area_c
                        ]
                        if si in locked_slots and locks.get(slots[si].slot_id) == s.employee_id[c]:
                            # HR explicitly locked a junior: soften to penalty rather than infeasible
                            unm = model.NewBoolVar(f"unm_{si}_{c}")
                            model.Add(sum(mentors) + unm >= x[(si, c)])
                            obj.append(-700 * unm)
                        elif not mentors:
                            # No Senior+ mentor exists in this area across any other slot
                            model.Add(x[(si, c)] == 0)
                        else:
                            model.Add(sum(mentors) >= x[(si, c)])

        if n_filled >= 4 and shape.min_junior > 0:
            jr_vars = [x[(si, c)] for si in filled_slots for c in pd.pools[si] if int(s.senior[c]) <= JUNIOR_MAX]
            if jr_vars:
                short_jr = model.NewIntVar(0, shape.min_junior, "short_jr")
                model.Add(sum(jr_vars) + short_jr >= shape.min_junior)
                w_jr = -320 if mode == "leanest" else int(-240 * scale)
                obj.append(w_jr * short_jr)

        # 6e. Shared working language (at least one language at B2+ spoken by everyone)
        if shape.prefer_shared_language and pd.common_langs:
            lang_ok_vars = []
            for lid in pd.common_langs:
                v_l = model.NewBoolVar(f"lang_{lid}")
                for si in filled_slots:
                    no_l = [x[(si, c)] for c in pd.pools[si] if lid not in pd.langs_b2[c]]
                    if no_l:
                        model.Add(sum(no_l) <= 1 - v_l)
                lang_ok_vars.append(v_l)
            any_shared = model.NewBoolVar("any_shared_lang")
            model.Add(any_shared <= sum(lang_ok_vars))
            obj.append(int(220 * scale) * any_shared)

        # 6f. Time-zone spread
        if shape.max_tz_spread < 24:
            tz_min = model.NewIntVar(-12, 14, "tz_min")
            tz_max = model.NewIntVar(-12, 14, "tz_max")
            for si in filled_slots:
                slot_tz = sum(pd.tz[c] * x[(si, c)] for c in pd.pools[si])
                model.Add(tz_min <= slot_tz)
                model.Add(tz_max >= slot_tz)
            tz_excess = model.NewIntVar(0, 26, "tz_excess")
            model.Add(tz_excess >= tz_max - tz_min - shape.max_tz_spread)
            obj.append(int(-35 * scale) * tz_excess)

        # 6g. Avoid near-duplicate profiles
        if shape.avoid_duplicates:
            # Linear anti-cloning across multi-seat roles (e.g. 2 COBOL devs shouldn't both be the same seniority)
            slots_by_role: dict[str, list[int]] = {}
            for si in filled_slots:
                slots_by_role.setdefault(slots[si].role_id, []).append(si)
            for rid, r_slots in slots_by_role.items():
                if len(r_slots) < 2:
                    continue
                for lvl in range(len(vocab.SENIORITY)):
                    lvl_vars = [x[(si, c)] for si in r_slots for c in pd.pools[si] if int(s.senior[c]) == lvl]
                    if len(lvl_vars) >= 2:
                        dup = model.NewIntVar(0, len(r_slots) - 1, f"dupsen_{rid}_{lvl}")
                        model.Add(dup >= sum(lvl_vars) - 1)
                        obj.append(int(-140 * scale) * dup)
            # Pairwise near-duplicate check on top-15 candidates between slots that share a role/area
            for a_idx in range(len(filled_slots)):
                s1 = filled_slots[a_idx]
                top1 = pd.pools[s1][:15]
                for b_idx in range(a_idx + 1, len(filled_slots)):
                    s2 = filled_slots[b_idx]
                    top2 = pd.pools[s2][:15]
                    pairs = 0
                    for c1 in top1:
                        sk1 = pd.skills[c1]
                        if not sk1:
                            continue
                        for c2 in top2:
                            if c1 == c2:
                                continue
                            if int(s.role[c1]) != int(s.role[c2]) or int(s.senior[c1]) != int(s.senior[c2]):
                                continue
                            sk2 = pd.skills[c2]
                            if not sk2:
                                continue
                            jacc = len(sk1 & sk2) / len(sk1 | sk2)
                            if jacc >= 0.80:
                                both = model.NewBoolVar(f"nd_{s1}_{c1}_{s2}_{c2}")
                                model.Add(both >= x[(s1, c1)] + x[(s2, c2)] - 1)
                                obj.append(int(-100 * scale) * both)
                                pairs += 1
                                if pairs >= 40:
                                    break
                        if pairs >= 40:
                            break

    model.Maximize(sum(obj))
    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = 1.5
    solver.parameters.num_search_workers = 4
    solver.parameters.random_seed = 42
    status = solver.Solve(model)
    if status not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        # Safety fallback: greedy distinct assignment so we never crash
        out: dict[int, int] = {}
        used: set[int] = set()
        for si in filled_slots:
            for c in pd.pools[si]:
                if c not in used:
                    out[si] = c
                    used.add(c)
                    break
        return out

    assigned: dict[int, int] = {}
    for si in filled_slots:
        for c in pd.pools[si]:
            if solver.Value(x[(si, c)]) == 1:
                assigned[si] = c
                break
    return assigned


def _evaluate_team(
    scorer: Scorer,
    pd: _PoolData,
    assigned: dict[int, int],
    team_needs: list[TeamNeed],
    shape: TeamShape,
    locks: dict[str, str],
) -> dict[str, Any]:
    """Compute scorecard, member roles/mentors, and plain-English rule explanations."""
    s = scorer.s
    slots = pd.slots
    n_slots = len(slots)
    picked = [(si, assigned[si]) for si in range(n_slots) if si in assigned]
    n_filled = len(picked)

    fits = [max(0.0, float(slots[si].rs.fit[c])) for si, c in picked]
    avg_fit = round(100 * sum(fits) / n_filled) if n_filled else 0
    ready_now = sum(1 for _, c in picked if int(s.avail[c]) == 0)
    roll_off = sum(1 for _, c in picked if int(s.avail[c]) == 1)
    assigned_cnt = sum(1 for _, c in picked if int(s.avail[c]) == 2)
    if n_filled == 0:
        ready_by = "No eligible people"
    elif assigned_cnt > 0:
        ready_by = f"Includes {assigned_cnt} currently assigned"
    elif roll_off == 0:
        ready_by = "Available now"
    else:
        ready_by = f"Within 3 months ({roll_off} rolling off)"

    # Seniority breakdown
    c_anc = sum(1 for _, c in picked if int(s.senior[c]) >= ANCHOR_MIN)
    c_sen = sum(1 for _, c in picked if int(s.senior[c]) == SENIOR_MIN)
    c_mid = sum(1 for _, c in picked if int(s.senior[c]) == MID_LVL)
    c_jr = sum(1 for _, c in picked if int(s.senior[c]) <= JUNIOR_MAX)
    c_sp = c_anc + c_sen

    by_level: dict[str, int] = {}
    for _, c in picked:
        lvl = vocab.SENIORITY[int(s.senior[c])]
        by_level[lvl] = by_level.get(lvl, 0) + 1
    summary_parts = [f"{by_level[lvl]} {lvl}" for lvl in reversed(vocab.SENIORITY) if by_level.get(lvl)]
    shape_summary = " · ".join(summary_parts) if summary_parts else "Empty"

    # Shared languages
    shared_lids: list[int] = []
    if picked:
        inter = set.intersection(*(pd.langs_b2[c] for _, c in picked))
        # Prefer English/Spanish first for readability
        pref = {s.cat.lang_id.get("Español", -1): 0, s.cat.lang_id.get("Inglés", -1): 1}
        shared_lids = sorted(inter, key=lambda lid: (pref.get(lid, 99), lid))
    shared_languages = [vocab.LANGUAGE_EN.get(s.cat.languages[lid], s.cat.languages[lid]) for lid in shared_lids]

    # Time zones
    if picked:
        tzs = [pd.tz[c] for _, c in picked]
        tz_lo, tz_hi = min(tzs), max(tzs)
        tz_spread = tz_hi - tz_lo
        def _fmt_tz(h: int) -> str:
            return f"UTC+{h}" if h >= 0 else f"UTC{h}"
        tz_summary = f"{_fmt_tz(tz_lo)}" if tz_spread == 0 else f"{_fmt_tz(tz_lo)} to {_fmt_tz(tz_hi)} ({tz_spread}h spread)"
    else:
        tz_spread = 0
        tz_summary = "—"

    # Member roles & mentorship
    senior_by_area: dict[int, list[tuple[int, int]]] = {}
    for si, c in picked:
        if int(s.senior[c]) >= SENIOR_MIN:
            senior_by_area.setdefault(int(s.area[c]), []).append((si, c))

    max_sen_picked = max((int(s.senior[c]) for _, c in picked), default=-1)
    anchor_used = False
    member_meta: dict[int, dict[str, Any]] = {}
    unmentored_juniors: list[str] = []
    for si, c in picked:
        sen = int(s.senior[c])
        area_c = int(s.area[c])
        mentor = None
        if sen <= JUNIOR_MAX:
            trole = "learner"
            candidates_m = [x for x in senior_by_area.get(area_c, []) if x[0] != si]
            # Prefer same role first, then highest seniority
            candidates_m.sort(key=lambda x: (int(s.role[x[1]]) != int(s.role[c]), -int(s.senior[x[1]])))
            if candidates_m:
                msi, mc = candidates_m[0]
                mentor = {
                    "slot_id": slots[msi].slot_id,
                    "slot_label": slots[msi].slot_label,
                    "employee_id": s.employee_id[mc],
                    "name": s.name[mc],
                    "role": s.cat.roles[int(s.role[mc])],
                    "seniority": vocab.SENIORITY[int(s.senior[mc])],
                }
            else:
                unmentored_juniors.append(slots[si].slot_label)
        elif sen >= ANCHOR_MIN:
            trole = "anchor"
            anchor_used = True
        elif not anchor_used and c_anc == 0 and sen == max_sen_picked and sen >= SENIOR_MIN:
            trole = "anchor"
            anchor_used = True
        else:
            trole = "builder"
            # Optional pairing note when a Mid shares a role/area with a Senior+
            if sen == MID_LVL:
                peers = [x for x in senior_by_area.get(area_c, []) if x[0] != si and slots[x[0]].role_id == slots[si].role_id]
                if not peers:
                    peers = [x for x in senior_by_area.get(area_c, []) if x[0] != si]
                if peers:
                    msi, mc = peers[0]
                    mentor = {
                        "slot_id": slots[msi].slot_id,
                        "slot_label": slots[msi].slot_label,
                        "employee_id": s.employee_id[mc],
                        "name": s.name[mc],
                        "role": s.cat.roles[int(s.role[mc])],
                        "seniority": vocab.SENIORITY[int(s.senior[mc])],
                    }
        member_meta[si] = {
            "team_role": trole,
            "mentor": mentor,
            "locked": slots[si].slot_id in locks and locks[slots[si].slot_id] == s.employee_id[c],
        }

    # Shape rule checks + plain explanations when a rule can't be met
    checks: list[dict[str, Any]] = []
    if shape.enabled and n_filled >= 2:
        # 1. Anchor
        if shape.anchors_min > 0:
            ok_anc = c_anc >= shape.anchors_min
            if ok_anc:
                anc_names = [slots[si].slot_label for si, c in picked if int(s.senior[c]) >= ANCHOR_MIN]
                detail = f"{c_anc} anchor ({', '.join(anc_names[:2])})"
            else:
                detail = f"0 Lead/Principal anchors (target ≥ {shape.anchors_min}): none passed filters or locks"
            checks.append({"rule": "anchor", "label": f"{shape.anchors_min}+ Lead/Principal anchor", "ok": ok_anc, "detail": detail})

        # 2. Senior+ cap
        max_sp = max(shape.anchors_min, int(n_filled * shape.max_senior_plus_ratio + 1e-9))
        ok_sp = c_sp <= max_sp
        if ok_sp:
            detail = f"{c_sp} of {n_filled} are Senior+ (cap ≤ {max_sp})"
        else:
            reasons = []
            for si, sl in enumerate(slots):
                pool_i = [c for c in pd.pools[si] if sl.rs.role_fit is None or float(sl.rs.role_fit[c]) >= 0.4]
                has_non_sp = any(int(s.senior[c]) < SENIOR_MIN for c in pool_i)
                if not has_non_sp:
                    reasons.append(f"{sl.rs.role.title} only has Senior+ profiles")
                elif sl.rs.role.seniority_min in ("Senior", "Lead", "Principal"):
                    reasons.append(f"{sl.rs.role.title} requests {sl.rs.role.seniority_min}+")
            reasons = list(dict.fromkeys(reasons))
            why = f": {'; '.join(reasons[:2])}" if reasons else ""
            detail = f"{c_sp} of {n_filled} are Senior+ (target ≤ {max_sp}){why}"
        checks.append({"rule": "senior_cap", "label": f"≤{round(shape.max_senior_plus_ratio * 100)}% Senior+", "ok": ok_sp, "detail": detail})

        # 3. Mid floor
        if n_filled >= 3 and shape.min_mid > 0:
            ok_mid = c_mid >= shape.min_mid
            detail = f"{c_mid} Mid{'s' if c_mid != 1 else ''}" if ok_mid else f"{c_mid} Mid (target ≥ {shape.min_mid}): limited Mid supply for these roles"
            checks.append({"rule": "mid", "label": f"{shape.min_mid}+ Mid", "ok": ok_mid, "detail": detail})

        # 4. Junior floor + mentoring explanation
        if n_filled >= 4 and shape.min_junior > 0:
            ok_jr = c_jr >= shape.min_junior and not unmentored_juniors
            if ok_jr:
                detail = f"{c_jr} Junior{'s' if c_jr != 1 else ''}, all mentored by a Senior+ in the same area"
            elif unmentored_juniors:
                detail = f"Junior in {', '.join(unmentored_juniors)} has no Senior+ mentor in the same area"
            else:
                # Explain why no junior was picked using slot-qualified pools
                no_jr_roles: list[str] = []
                no_mentor_roles: list[str] = []
                for si, sl in enumerate(slots):
                    if sl.rs.role.seniority_min in ("Mid", "Senior", "Lead", "Principal"):
                        continue
                    pool_i = pd.pools[si]
                    pool_jrs = [c for c in pool_i if int(s.senior[c]) <= JUNIOR_MAX and (sl.rs.role_fit is None or float(sl.rs.role_fit[c]) >= 0.4)]
                    if not pool_jrs:
                        no_jr_roles.append(sl.rs.role.title)
                    else:
                        jr_areas = {int(s.area[c]) for c in pool_jrs}
                        can_mentor = False
                        for sj in range(n_slots):
                            if sj == si:
                                continue
                            pool_m = [
                                c for c in pd.pools[sj]
                                if int(s.senior[c]) >= SENIOR_MIN
                                and (slots[sj].rs.role_fit is None or float(slots[sj].rs.role_fit[c]) >= 0.4)
                            ]
                            if {int(s.area[c]) for c in pool_m} & jr_areas:
                                can_mentor = True
                                break
                        if not can_mentor:
                            top_area = s.cat.areas[max(jr_areas, key=lambda a: sum(1 for c in pool_jrs if int(s.area[c]) == a))]
                            no_mentor_roles.append(f"a junior {sl.rs.role.title} would have no Senior+ mentor in {top_area}")
                no_jr_roles = list(dict.fromkeys(no_jr_roles))
                no_mentor_roles = list(dict.fromkeys(no_mentor_roles))
                parts = []
                if no_jr_roles:
                    parts.append(f"no {', '.join(no_jr_roles[:2])} juniors are eligible")
                if no_mentor_roles:
                    parts.append(no_mentor_roles[0])
                why = ": " + ", and ".join(parts) if parts else ": higher-seniority picks were needed to cover must-haves"
                detail = f"No Junior{why}"
            checks.append({"rule": "junior", "label": f"{shape.min_junior}+ Junior (mentored)", "ok": ok_jr, "detail": detail})

        # 5. Shared language
        if shape.prefer_shared_language:
            ok_lang = len(shared_languages) > 0
            detail = ", ".join(shared_languages[:3]) + " (B2+)" if ok_lang else "No single language at B2+ is shared by everyone"
            checks.append({"rule": "language", "label": "Shared language", "ok": ok_lang, "detail": detail})

        # 6. Time zones
        if shape.max_tz_spread < 24:
            ok_tz = tz_spread <= shape.max_tz_spread
            detail = tz_summary if ok_tz else f"{tz_summary} (target ≤ {shape.max_tz_spread}h)"
            checks.append({"rule": "timezone", "label": f"≤{shape.max_tz_spread}h time-zone spread", "ok": ok_tz, "detail": detail})

    # Whole-team needs coverage
    needs_out: list[dict[str, Any]] = []
    for tn in team_needs:
        vec = pd.need_scores.get(tn.id)
        target = n_filled if tn.scope == "all" else min(tn.min_people, n_filled)
        if vec is None:
            needs_out.append({
                "id": tn.id, "label": tn.label, "scope": tn.scope, "importance": tn.importance,
                "implicit": tn.implicit, "reason": tn.reason, "target": target, "covered": 0, "ok": False, "members": [],
            })
            continue
        cov_names = [s.name[c] for _, c in picked if float(vec[c]) >= vocab.COVERED]
        needs_out.append({
            "id": tn.id,
            "label": tn.label,
            "scope": tn.scope,
            "importance": tn.importance,
            "implicit": tn.implicit,
            "reason": tn.reason,
            "target": target,
            "covered": len(cov_names),
            "ok": len(cov_names) >= target,
            "members": cov_names,
        })

    return {
        "slots_total": n_slots,
        "slots_filled": n_filled,
        "avg_fit": avg_fit,
        "ready_now_count": ready_now,
        "ready_by": ready_by,
        "shape": {
            "counts": {"anchor": c_anc, "senior": c_sen, "mid": c_mid, "junior": c_jr},
            "summary": shape_summary,
            "balanced": all(ch["ok"] for ch in checks) if checks else True,
            "checks": checks,
        },
        "team_needs": needs_out,
        "shared_languages": shared_languages,
        "tz_spread_hours": tz_spread,
        "tz_summary": tz_summary,
        "member_meta": member_meta,
    }


def _compute_swaps(
    scorer: Scorer,
    pd: _PoolData,
    assigned: dict[int, int],
    base_eval: dict[str, Any],
    team_needs: list[TeamNeed],
    shape: TeamShape,
    locks: dict[str, str],
    per_slot: int = 5,
) -> dict[int, list[dict[str, Any]]]:
    """For each slot, pick diverse swap alternatives and compute their exact team impact."""
    s = scorer.s
    slots = pd.slots
    swaps: dict[int, list[dict[str, Any]]] = {}
    base_fit = base_eval["avg_fit"]
    base_bench = base_eval["ready_now_count"]
    base_tz = base_eval["tz_spread_hours"]
    base_checks = {ch["rule"]: ch["ok"] for ch in base_eval["shape"]["checks"]}
    base_needs = {n["id"]: n["covered"] for n in base_eval["team_needs"]}

    for si in range(len(slots)):
        if si not in assigned:
            swaps[si] = []
            continue
        cur = assigned[si]
        other_assigned = {c for sj, c in assigned.items() if sj != si}
        avail_cands = [c for c in pd.pools[si] if c != cur and c not in other_assigned]
        if not avail_cands:
            swaps[si] = []
            continue

        # Pick a useful, diverse mix: best overall, best bench, different seniority
        picks: list[int] = []
        seen: set[int] = set()
        rs = slots[si].rs
        key = rs.rank if rs.rank is not None else rs.fit

        def take(cand_list: list[int], n: int) -> None:
            taken_n = 0
            for c in cand_list:
                if c not in seen:
                    seen.add(c)
                    picks.append(c)
                    taken_n += 1
                    if taken_n >= n:
                        break

        by_rank = sorted(avail_cands, key=lambda c: (-float(key[c]), int(s.avail[c])))
        take(by_rank, 2)
        take([c for c in by_rank if int(s.avail[c]) == 0], 2)
        take([c for c in by_rank if int(s.senior[c]) != int(s.senior[cur])], 2)
        take(by_rank, per_slot)
        picks = picks[:per_slot]

        slot_swaps: list[dict[str, Any]] = []
        for alt in picks:
            trial = dict(assigned)
            trial[si] = alt
            ev = _evaluate_team(scorer, pd, trial, team_needs, shape, locks)
            fit_delta = ev["avg_fit"] - base_fit
            bench_delta = ev["ready_now_count"] - base_bench
            tz_delta = ev["tz_spread_hours"] - base_tz

            impact: list[str] = []
            if fit_delta != 0:
                impact.append(f"Team fit {'+' if fit_delta > 0 else ''}{fit_delta}%")
            else:
                impact.append("Same team fit")
            if bench_delta > 0:
                impact.append("Ready now (replaces roll-off)")
            elif bench_delta < 0:
                impact.append("Rolls off in <3 mo (was bench)")
            new_checks = {ch["rule"]: ch["ok"] for ch in ev["shape"]["checks"]}
            for rule, ok_now in new_checks.items():
                was_ok = base_checks.get(rule, True)
                if ok_now and not was_ok:
                    impact.append(f"Fixes {rule.replace('_', ' ')}")
                elif not ok_now and was_ok:
                    impact.append(f"Breaks {rule.replace('_', ' ')}")
            for n in ev["team_needs"]:
                diff_n = n["covered"] - base_needs.get(n["id"], 0)
                if diff_n > 0:
                    impact.append(f"+{diff_n} {n['label']}")
                elif diff_n < 0 and not n["ok"]:
                    impact.append(f"Drops {n['label']}")
            if abs(tz_delta) >= 2:
                impact.append(f"TZ spread {'+' if tz_delta > 0 else ''}{tz_delta}h")

            slot_swaps.append({
                "idx": alt,
                "fit_delta": fit_delta,
                "bench_delta": bench_delta,
                "tz_delta": tz_delta,
                "impact": impact[:3],
            })
        swaps[si] = slot_swaps
    return swaps


_OPTION_META: dict[TeamOptionId, tuple[str, str]] = {
    "best_fit": ("Best fit", "Highest match with balanced seniority & team needs"),
    "ready_now": ("Ready now", "Prioritises colleagues available on the bench today"),
    "leanest": ("Leanest", "Lower seniority mix while covering every must-have"),
}


def build_team(
    scorer: Scorer,
    scored: list[RoleScores],
    per_role: int = 10,
    pool: int = 60,
    team_needs: list[TeamNeed] | None = None,
    shape: TeamShape | None = None,
    locks: dict[str, str] | None = None,
    active_option: TeamOptionId = "best_fit",
) -> dict[str, Any]:
    """Solve 3 team alternatives with CP-SAT and build distinct per-role candidate lists."""
    team_needs = list(team_needs or [])
    locks = dict(locks or {})
    total_slots = sum(rs.role.count for rs in scored)
    resolved_shape = shape if shape is not None else default_shape(total_slots)

    pd = _build_pools(scorer, scored, team_needs, locks)
    if not pd.all_cands:
        return {
            "lists": {rs.role.id: [] for rs in scored},
            "proposed": {rs.role.id: [] for rs in scored},
            "options": [],
            "active_option": active_option,
            "shape": resolved_shape.model_dump(),
            "locks": locks,
            "stats": {"slots": total_slots, "filled": 0, "avg_fit": 0, "greedy_avg_fit": 0, "gain_vs_greedy": 0.0},
        }

    options: list[dict[str, Any]] = []
    assigned_by_opt: dict[TeamOptionId, dict[int, int]] = {}
    for opt_id in ("best_fit", "ready_now", "leanest"):
        asgn = _solve_option(scorer, pd, team_needs, resolved_shape, locks, opt_id)
        assigned_by_opt[opt_id] = asgn
        ev = _evaluate_team(scorer, pd, asgn, team_needs, resolved_shape, locks)
        swaps = _compute_swaps(scorer, pd, asgn, ev, team_needs, resolved_shape, locks)
        label, tagline = _OPTION_META[opt_id]
        members = []
        for si, sl in enumerate(pd.slots):
            c = asgn.get(si)
            meta = ev["member_meta"].get(si, {"team_role": "builder", "mentor": None, "locked": False})
            members.append({
                "slot_id": sl.slot_id,
                "role_id": sl.role_id,
                "slot_label": sl.slot_label,
                "idx": c,
                "team_role": meta["team_role"],
                "mentor": meta["mentor"],
                "locked": meta["locked"],
                "swaps": swaps.get(si, []),
            })
        options.append({
            "id": opt_id,
            "label": label,
            "tagline": tagline,
            "slots_total": ev["slots_total"],
            "slots_filled": ev["slots_filled"],
            "avg_fit": ev["avg_fit"],
            "ready_now_count": ev["ready_now_count"],
            "ready_by": ev["ready_by"],
            "shape": ev["shape"],
            "team_needs": ev["team_needs"],
            "shared_languages": ev["shared_languages"],
            "tz_spread_hours": ev["tz_spread_hours"],
            "tz_summary": ev["tz_summary"],
            "members": members,
        })

    # Active option drives `proposed` and starts each role's list
    active_asgn = assigned_by_opt.get(active_option, assigned_by_opt["best_fit"])
    proposed: dict[str, list[int]] = {rs.role.id: [] for rs in scored}
    taken_in_lists: set[int] = set()
    for si, sl in enumerate(pd.slots):
        c = active_asgn.get(si)
        if c is not None:
            proposed[sl.role_id].append(c)
            taken_in_lists.add(c)

    # Build distinct per-role candidate lists (nobody appears in two roles)
    lists: dict[str, list[int]] = {rs.role.id: list(proposed[rs.role.id]) for rs in scored}
    target_len = {rs.role.id: max(per_role, rs.role.count) for rs in scored}
    # Round-robin fill so no role starves another
    role_cands = {rs.role.id: scorer.top(rs, max(pool, per_role * len(scored) + 20)) for rs in scored}
    cursors = {rs.role.id: 0 for rs in scored}
    while True:
        progressed = False
        for rs in scored:
            rid = rs.role.id
            if len(lists[rid]) >= target_len[rid]:
                continue
            rc = role_cands[rid]
            while cursors[rid] < len(rc):
                cand_i = rc[cursors[rid]]
                cursors[rid] += 1
                if cand_i not in taken_in_lists:
                    lists[rid].append(cand_i)
                    taken_in_lists.add(cand_i)
                    progressed = True
                    break
        if not progressed:
            break

    for rs in scored:
        key = rs.rank if rs.rank is not None else rs.fit
        prop_set = set(proposed[rs.role.id])
        lists[rs.role.id].sort(key=lambda c: (c not in prop_set, -float(key[c])))

    # Greedy baseline for stats comparison
    greedy_taken: set[int] = set()
    greedy_total = 0.0
    for rs in scored:
        picked = 0
        for c in role_cands[rs.role.id]:
            if picked >= rs.role.count:
                break
            if c in greedy_taken:
                continue
            greedy_taken.add(c)
            greedy_total += max(0.0, float(rs.fit[c]))
            picked += 1

    active_opt_obj = next((o for o in options if o["id"] == active_option), options[0])
    opt_total = sum(max(0.0, float(pd.slots[si].rs.fit[c])) for si, c in active_asgn.items())
    filled = len(active_asgn)
    stats = {
        "slots": total_slots,
        "filled": filled,
        "avg_fit": active_opt_obj["avg_fit"],
        "greedy_avg_fit": round(100 * greedy_total / max(1, len(greedy_taken))) if greedy_taken else 0,
        "gain_vs_greedy": round(100 * (opt_total - greedy_total) / max(1, filled), 1) if filled else 0.0,
        "active_option": active_option,
        "shape": resolved_shape.model_dump(),
        "locks": locks,
        "options": options,
    }
    return {
        "lists": lists,
        "proposed": proposed,
        "options": options,
        "active_option": active_option,
        "shape": resolved_shape.model_dump(),
        "locks": locks,
        "stats": stats,
    }


def complement(scorer: Scorer, rs: RoleScores, person: int, exclude: set[int]) -> dict | None:
    """If `person` misses must-haves, find the eligible colleague who best covers them."""
    gaps = [q for q in rs.scored_reqs if q.importance == "must" and q.kind != "soft" and rs.req[q.id][person] < vocab.COVERED]
    if not gaps:
        return None
    gain = np.zeros(scorer.s.n, dtype=np.float32)
    for q in gaps:
        gain += np.maximum(0, rs.req[q.id] - rs.req[q.id][person])
    gain = np.where(rs.eligible, gain, -1)
    gain[person] = -1
    if exclude:
        gain[list(exclude)] = -1
    best = int(np.argmax(gain))
    if gain[best] <= 0.2:
        return None
    covers = [q.label for q in gaps if rs.req[q.id][best] >= vocab.COVERED]
    if not covers:
        return None
    return {"idx": best, "covers": covers, "gaps": [q.label for q in gaps]}
