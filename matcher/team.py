"""Team building: one ranked list per role, nobody in two roles, availability honoured.

Uses the Hungarian algorithm in rounds: round 1 fills every open slot (the proposed
team) maximising total fit; later rounds pick alternates the same way. Because each
round is solved jointly across roles, the best person for one role is not "spent" on
another role where they matter less.
"""

from __future__ import annotations

import numpy as np
from scipy.optimize import linear_sum_assignment

from . import vocab
from .scoring import RoleScores, Scorer

BIG = 1e6


def build_team(scorer: Scorer, scored: list[RoleScores], per_role: int, pool: int = 60) -> dict:
    """Returns {"lists": {role_id: [idx, ...]}, "proposed": {role_id: [idx, ...]}, "stats": {...}}."""
    cand: set[int] = set()
    for rs in scored:
        cand.update(scorer.top(rs, pool))
    cands = sorted(cand)
    if not cands:
        return {"lists": {rs.role.id: [] for rs in scored}, "proposed": {rs.role.id: [] for rs in scored}, "stats": {}}
    col = {c: j for j, c in enumerate(cands)}
    fit = np.array([[(rs.rank if rs.rank is not None else rs.fit)[c] for c in cands] for rs in scored], dtype=np.float64)  # roles x cands, -1 = ineligible

    taken: set[int] = set()
    lists: dict[str, list[int]] = {rs.role.id: [] for rs in scored}
    proposed: dict[str, list[int]] = {}
    for rnd in range(per_role + max(rs.role.count for rs in scored)):
        slots: list[int] = []
        for r, rs in enumerate(scored):
            need = rs.role.count if rnd == 0 else (1 if len(lists[rs.role.id]) < max(per_role, rs.role.count) else 0)
            slots.extend([r] * need)
        if not slots:
            break
        free = [j for j, c in enumerate(cands) if c not in taken]
        if not free:
            break
        cost = np.full((len(slots), len(free)), BIG)
        for a, r in enumerate(slots):
            f = fit[r, free]
            cost[a] = np.where(f >= 0, -f, BIG)
        rows, cols = linear_sum_assignment(cost)
        for a, b in zip(rows, cols):
            if cost[a, b] >= BIG:
                continue
            c = cands[free[b]]
            taken.add(c)
            lists[scored[slots[a]].role.id].append(c)
        if rnd == 0:
            proposed = {k: list(v) for k, v in lists.items()}
    for rs in scored:
        key = rs.rank if rs.rank is not None else rs.fit
        lists[rs.role.id].sort(key=lambda c: -key[c])

    # Greedy baseline (role by role, best available first) for the same proposed slots.
    greedy_taken: set[int] = set()
    greedy_total = 0.0
    for r, rs in enumerate(scored):
        order = np.argsort(-fit[r])
        picked = 0
        for j in order:
            if picked >= rs.role.count or fit[r, j] < 0:
                break
            if cands[j] in greedy_taken:
                continue
            greedy_taken.add(cands[j])
            greedy_total += float(rs.fit[cands[j]])
            picked += 1
    opt_total = sum(float(rs.fit[c]) for rs in scored for c in proposed.get(rs.role.id, []))
    slots_total = sum(rs.role.count for rs in scored)
    filled = sum(len(proposed.get(rs.role.id, [])) for rs in scored)
    return {
        "lists": lists,
        "proposed": proposed,
        "stats": {
            "slots": slots_total,
            "filled": filled,
            "avg_fit": round(100 * opt_total / filled) if filled else 0,
            "greedy_avg_fit": round(100 * greedy_total / max(1, min(filled, len(greedy_taken)))) if greedy_taken else 0,
            "gain_vs_greedy": round(100 * (opt_total - greedy_total) / max(1, filled), 1),
        },
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
