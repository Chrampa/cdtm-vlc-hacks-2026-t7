"""Guarantees the case asks for, tested against the real dataset (no AI calls)."""

from __future__ import annotations

import numpy as np
import pytest

from matcher import vocab
from matcher.config import load_settings
from matcher.data import Store
from matcher.evidence import EvidenceBuilder
from matcher.explain import Explainer
from matcher.interpret import Interpreter
from matcher.llm import LLMClient
from matcher.schemas import Requirement, RoleSpec, SkillRef, TargetRole, TeamNeed, TeamShape
from matcher.scoring import Scorer
from matcher.team import build_team


@pytest.fixture(scope="session")
def store() -> Store:
    return Store(load_settings().data_path)


@pytest.fixture(scope="session")
def scorer(store) -> Scorer:
    return Scorer(store)


def _role(**kw) -> RoleSpec:
    base = dict(
        id="r1", title="SOC Analyst", availability="now", min_years=3,
        target_roles=[TargetRole(name="SOC Analyst", fit=1.0)],
        requirements=[
            Requirement(id="q1", label="SIEM", keyword="SIEM", kind="skill", importance="must",
                        skills=[SkillRef(name="SIEM"), SkillRef(name="Microsoft Sentinel", match="equivalent")]),
            Requirement(id="q2", label="Public sector", kind="sector", importance="nice", sector="Sector Público"),
        ],
    )
    base.update(kw)
    return RoleSpec(**base)


def test_hard_filters_are_never_skipped(store, scorer):
    rs = scorer.score_role(_role())
    top = scorer.top(rs, 200)
    assert top, "expected candidates"
    assert all(store.avail[i] == 0 for i in top), "only people available now"
    assert all(store.years[i] >= 3 for i in top), "minimum years enforced"
    assert rs.fit[(store.avail != 0)].max() < 0, "ineligible people can never be ranked"


def test_nice_to_have_never_filters(store, scorer):
    rs = scorer.score_role(_role())
    top = scorer.top(rs, 50)
    sector = rs.req["q2"]
    assert any(sector[i] < vocab.PARTIAL for i in top), "people without the nice-to-have still appear"


def test_soon_includes_roll_off_but_not_assigned(store, scorer):
    rs = scorer.score_role(_role(availability="soon", min_years=None))
    top = scorer.top(rs, 300)
    codes = {int(store.avail[i]) for i in top}
    assert 2 not in codes and codes <= {0, 1}


def test_equivalent_skill_counts(store, scorer):
    """'Kubernetes' must find Azure engineers who only list AKS."""
    role = RoleSpec(id="r1", title="K8s", availability="any", requirements=[
        Requirement(id="q1", label="Kubernetes", kind="skill", importance="must",
                    skills=[SkillRef(name="Kubernetes"), SkillRef(name="AKS", match="equivalent")])])
    rs = scorer.score_role(role)
    aks = store.cat.skill_id["AKS"]
    k8s = store.cat.skill_id["Kubernetes"]
    has_aks = set(store.sk_emp[store.sk_id == aks].tolist())
    has_k8s = set(store.sk_emp[store.sk_id == k8s].tolist())
    only_aks = list(has_aks - has_k8s)[:200]
    assert only_aks and (rs.req["q1"][only_aks] > 0).all()


def test_team_never_repeats_people(store, scorer):
    roles = [
        RoleSpec(id="a", title="Cloud Engineer", count=2, availability="soon",
                 target_roles=[TargetRole(name="Cloud Engineer (Azure)", fit=1.0)],
                 requirements=[Requirement(id="q1", label="Azure", importance="must", skills=[SkillRef(name="Azure"), SkillRef(name="Terraform", match="related")])]),
        RoleSpec(id="b", title="DevOps", count=1, availability="soon",
                 target_roles=[TargetRole(name="DevOps Engineer", fit=1.0)],
                 requirements=[Requirement(id="q1", label="Terraform", importance="must", skills=[SkillRef(name="Terraform")])]),
    ]
    scored = [scorer.score_role(r) for r in roles]
    team = build_team(scorer, scored, per_role=10)
    everyone = [i for v in team["lists"].values() for i in v]
    assert len(everyone) == len(set(everyone)), "nobody appears in two roles"
    assert len(team["proposed"]["a"]) == 2 and len(team["proposed"]["b"]) == 1
    for rs in scored:
        assert all(rs.eligible[i] for i in team["lists"][rs.role.id]), "availability respected"


def test_language_equivalents(store, scorer):
    """Valencian speakers satisfy a Catalan requirement."""
    role = RoleSpec(id="r1", title="x", availability="any", requirements=[
        Requirement(id="q1", label="Catalan", kind="language", importance="must", language="Catalán", min_level="B2")])
    rs = scorer.score_role(role)
    val = store.cat.lang_id["Valenciano"]
    cat = store.cat.lang_id["Catalán"]
    only_val = np.nonzero((store.lang_level[:, val] >= 4) & (store.lang_level[:, cat] == 0))[0][:100]
    assert only_val.size and (rs.req["q1"][only_val] == 1.0).all()


def test_evidence_cards_cite_real_fields(store, scorer):
    rs = scorer.score_role(_role())
    i = scorer.top(rs, 1)[0]
    card = EvidenceBuilder(store).card(rs, i, store.profiles([i])[i], keyword_hit=None, full=True)
    ids = {e["id"] for e in card["evidence"]}
    for r in card["requirements"]:
        assert set(r["evidence"]) <= ids
    assert 0 <= card["fit"] <= 100


def test_guard_drops_unsupported_claims(store):
    ex = Explainer(store, LLMClient("http://x", None), "m", "m")
    texts = {"S1": "SIEM — level 5/5, 4 years, used in 2 projects", "F1": "SOC Analyst · Senior · 7 years of experience"}
    own = {"siem"}
    allowed = ["SOC Analyst"]
    keep, rem = ex._guard("Has strong SIEM skills [S1].", texts, own, allowed)
    assert keep and rem == 0
    assert ex._guard("Has strong SIEM skills.", texts, own, allowed)[1] == 1, "uncited sentence"
    assert ex._guard("Has SIEM skills [S9].", texts, own, allowed)[1] == 1, "unknown evidence id"
    assert ex._guard("Expert in Kubernetes [S1].", texts, own, allowed)[1] == 1, "skill the person does not have"
    assert ex._guard("Used SIEM for 12 years [S1].", texts, own, allowed)[1] == 1, "number not in evidence"
    assert ex._guard("No Kubernetes experience is shown [S1].", texts, own, allowed)[1] == 0, "gaps may name missing skills"
    assert ex._guard('Works as SOC Analyst and covers "Kubernetes basics" [F1].', texts, own, allowed)[1] == 0


def test_interpretation_validation_and_fallback(store):
    it = Interpreter(store, LLMClient("http://x", None), "m")
    raw = {"title": "t", "summary": "s", "roles": [{
        "title": "Data Engineer", "count": 1, "seniority_min": "Senior", "min_years": 0, "availability": "weird",
        "countries": ["Narnia"], "mobility_required": False,
        "target_roles": [{"name": "Data Engineerr", "fit": 1.4}],
        "requirements": [{"label": "BigQuery pipelines", "keyword": "BigQuery", "kind": "skill", "importance": "must",
                          "implicit": False, "reason": None, "skills": [{"name": "Made Up Skill", "match": "exact"}],
                          "certs": [], "sector": None, "language": None, "min_level": None, "soft": []}],
    }]}
    spec = it.normalize(raw, [])
    role = spec.roles[0]
    assert role.availability == "soon" and role.min_years is None and role.countries == []
    assert role.target_roles[0].name == "Data Engineer" and role.target_roles[0].fit == 1.0
    names = [s.name for s in role.requirements[0].skills]
    assert names == ["BigQuery"], "invented skills dropped; skill named in the label added as exact"

    fb = it.fallback("Need a SOC analyst with SIEM, available immediately, at least 3 years. Public sector is a plus.")
    r = fb.roles[0]
    assert r.availability == "now" and r.min_years == 3
    assert any(q.kind == "skill" and any(s.name == "SIEM" for s in q.skills) for q in r.requirements)


def test_merged_platform_item_is_split(store):
    """'Azure container orchestration' = {AKS, Kubernetes, Azure, Docker} must become two must-haves."""
    it = Interpreter(store, LLMClient("http://x", None), "m")
    raw = {"title": "t", "summary": "s", "roles": [{
        "title": "Engineer", "count": 1, "seniority_min": None, "min_years": None, "availability": "now",
        "countries": [], "mobility_required": False, "target_roles": [],
        "requirements": [{"label": "Azure container orchestration", "keyword": "Azure Kubernetes", "kind": "skill",
                          "importance": "must", "implicit": False, "reason": None,
                          "skills": [{"name": "AKS", "match": "exact"}, {"name": "Kubernetes", "match": "equivalent"},
                                     {"name": "Azure", "match": "exact"}, {"name": "Docker", "match": "related"}],
                          "certs": ["Microsoft AZ-104 Azure Administrator", "Certified Kubernetes Administrator (CKA)"],
                          "sector": None, "language": None, "min_level": None, "soft": []}],
    }]}
    reqs = it.normalize(raw, []).roles[0].requirements
    assert [q.label for q in reqs] == ["Container orchestration", "Azure"]
    assert {s.name for s in reqs[0].skills} == {"AKS", "Kubernetes", "Docker"}
    assert {s.name for s in reqs[1].skills} == {"Azure", "AKS"}
    assert reqs[0].certs == ["Certified Kubernetes Administrator (CKA)"]
    assert reqs[1].certs == ["Microsoft AZ-104 Azure Administrator"]
    assert all(q.importance == "must" for q in reqs) and reqs[0].id != reqs[1].id


def test_missing_must_cannot_be_compensated(store, scorer):
    """With two must-haves, everyone in the top 10 must show both; strength in one can't hide the other."""
    role = RoleSpec(id="r1", title="x", availability="now", requirements=[
        Requirement(id="k8s", label="Container orchestration", importance="must",
                    skills=[SkillRef(name="Kubernetes"), SkillRef(name="AKS", match="equivalent"), SkillRef(name="EKS", match="equivalent"), SkillRef(name="GKE", match="equivalent")]),
        Requirement(id="az", label="Azure", importance="must", skills=[SkillRef(name="Azure"), SkillRef(name="AKS", match="equivalent")]),
    ])
    rs = scorer.score_role(role)
    top = scorer.top(rs, 10)
    assert all(rs.req["k8s"][i] >= vocab.PARTIAL and rs.req["az"][i] >= vocab.PARTIAL for i in top)
    # someone with a perfect Azure score but no containers scores far below the top
    only_azure = np.nonzero((rs.req["az"] >= 0.99) & (rs.req["k8s"] == 0) & rs.eligible)[0]
    assert only_azure.size and rs.rank[only_azure].max() < rs.rank[top[-1]]
    # people showing both must-haves always outrank people showing one, whatever their fit
    both = (rs.req["k8s"] >= vocab.COVERED) & (rs.req["az"] >= vocab.COVERED) & rs.eligible
    one = ((rs.req["k8s"] >= vocab.COVERED) ^ (rs.req["az"] >= vocab.COVERED)) & (rs.req["k8s"] < vocab.PARTIAL) & rs.eligible
    assert rs.rank[both].min() > rs.rank[one].max()


def test_seniority_target_puts_requested_level_first(store, scorer):
    """Requesting Mid (target) ranks Mids above overqualified Principals; min mode treats Senior+ equally."""
    r_mid = RoleSpec(
        id="r1", title="Mid Data Engineer", seniority_min="Mid", seniority_mode="target",
        availability="soon", target_roles=[TargetRole(name="Data Engineer", fit=1.0)],
        requirements=[
            Requirement(id="q1", label="Python", importance="must", skills=[SkillRef(name="Python")]),
            Requirement(id="q2", label="SQL", importance="must", skills=[SkillRef(name="SQL")]),
        ],
    )
    rs_mid = scorer.score_role(r_mid)
    top = scorer.top(rs_mid, 10)
    assert all(vocab.SENIORITY[int(store.senior[i])] == "Mid" for i in top), "Mids come first when Mid is asked"
    mids = (store.senior == vocab.SENIORITY.index("Mid")) & (rs_mid.must_shown == 2.0) & rs_mid.eligible
    princs = (store.senior == vocab.SENIORITY.index("Principal")) & (rs_mid.must_shown == 2.0) & rs_mid.eligible
    assert rs_mid.fit[mids].max() > rs_mid.fit[princs].max(), "overqualified Principals rank below Mids"

    r_min = r_mid.model_copy(update={"seniority_min": "Senior", "seniority_mode": "min"})
    rs_min = scorer.score_role(r_min)
    assert (rs_min.seniority[store.senior >= vocab.SENIORITY.index("Senior")] == 1.0).all()


def test_team_balanced_shape_and_mentored_junior(store, scorer):
    """A 4-person Data & AI team balances Senior/Mid/Junior and mentors every Junior in the same area."""
    roles = [
        RoleSpec(id="r1", title="AI Tech Lead", count=1, seniority_min="Lead", seniority_mode="min", availability="soon",
                 target_roles=[TargetRole(name="AI Engineer (GenAI/LLM)", fit=1.0)],
                 requirements=[Requirement(id="q1", label="LLMs", importance="must", skills=[SkillRef(name="LLMs")])]),
        RoleSpec(id="r2", title="AI Engineer", count=1, availability="soon",
                 target_roles=[TargetRole(name="AI Engineer (GenAI/LLM)", fit=1.0)],
                 requirements=[Requirement(id="q1", label="RAG", importance="must", skills=[SkillRef(name="RAG")])]),
        RoleSpec(id="r3", title="Data Engineer", count=2, availability="soon",
                 target_roles=[TargetRole(name="Data Engineer", fit=1.0)],
                 requirements=[Requirement(id="q1", label="Python", importance="must", skills=[SkillRef(name="Python")])]),
    ]
    scored = [scorer.score_role(r) for r in roles]
    res = build_team(scorer, scored, per_role=10)
    best = res["options"][0]
    counts = best["shape"]["counts"]
    assert counts["anchor"] >= 1
    assert counts["anchor"] + counts["senior"] <= 2, "at most half Senior+"
    assert counts["mid"] >= 1
    assert counts["junior"] >= 1
    learners = [m for m in best["members"] if m["team_role"] == "learner"]
    assert learners, "Junior should be tagged learner"
    for lr in learners:
        assert lr["mentor"] is not None, "every Junior has a named mentor"
        jr_area = store.area[lr["idx"]]
        m_idx = store.idx_by_id[lr["mentor"]["employee_id"]]
        assert store.area[m_idx] == jr_area and store.senior[m_idx] >= vocab.SENIORITY.index("Senior")
    assert best["shared_languages"], "shared language found"
    assert best["tz_spread_hours"] <= 4


def test_team_whole_team_needs_and_unmet_rule_explanation(store, scorer):
    """Whole-team needs are satisfied across the team, and impossible rules are explained plainly."""
    roles = [
        RoleSpec(id="r1", title="Cloud Architect", count=1, seniority_min="Senior", seniority_mode="min", availability="soon",
                 target_roles=[TargetRole(name="Cloud Architect", fit=1.0)],
                 requirements=[Requirement(id="q1", label="Azure", importance="must", skills=[SkillRef(name="Azure")])]),
        RoleSpec(id="r2", title="COBOL Developer", count=2, availability="soon",
                 target_roles=[TargetRole(name="Mainframe Developer (COBOL)", fit=1.0)],
                 requirements=[Requirement(id="q1", label="COBOL", importance="must", skills=[SkillRef(name="COBOL")])]),
        RoleSpec(id="r3", title="Data Engineer", count=1, availability="soon",
                 target_roles=[TargetRole(name="Data Engineer", fit=1.0)],
                 requirements=[Requirement(id="q1", label="Python", importance="must", skills=[SkillRef(name="Python")])]),
        RoleSpec(id="r4", title="Project Manager", count=1, seniority_min="Senior", seniority_mode="min", availability="soon",
                 target_roles=[TargetRole(name="Project Manager", fit=1.0)],
                 requirements=[Requirement(id="q1", label="PM", importance="must", skills=[SkillRef(name="Gestión de proyectos")])]),
    ]
    needs = [
        TeamNeed(id="tn1", label="Banking", kind="sector", sector="Banca y Finanzas", scope="at_least", min_people=2, importance="must"),
        TeamNeed(id="tn2", label="Spanish", kind="language", language="Español", min_level="B2", scope="all", min_people=5, importance="must"),
    ]
    scored = [scorer.score_role(r) for r in roles]
    res = build_team(scorer, scored, per_role=10, team_needs=needs)
    best = res["options"][0]
    by_need = {n["id"]: n for n in best["team_needs"]}
    assert by_need["tn1"]["covered"] >= 2 and by_need["tn1"]["ok"]
    assert by_need["tn2"]["covered"] == 5 and by_need["tn2"]["ok"]
    jr_check = next(ch for ch in best["shape"]["checks"] if ch["rule"] == "junior")
    assert not jr_check["ok"]
    assert "COBOL" in jr_check["detail"] and "mentor" in jr_check["detail"]


def test_team_alternatives_lock_and_swaps(store, scorer):
    """3 alternatives returned; Ready now picks bench; locks pin a slot and swaps never duplicate."""
    roles = [
        RoleSpec(id="r1", title="Cloud Architect", count=1, availability="soon",
                 target_roles=[TargetRole(name="Cloud Architect", fit=1.0)],
                 requirements=[Requirement(id="q1", label="Azure", importance="must", skills=[SkillRef(name="Azure")])]),
        RoleSpec(id="r2", title="DevOps", count=2, availability="soon",
                 target_roles=[TargetRole(name="DevOps Engineer", fit=1.0)],
                 requirements=[Requirement(id="q1", label="Terraform", importance="must", skills=[SkillRef(name="Terraform")])]),
    ]
    scored = [scorer.score_role(r) for r in roles]
    res = build_team(scorer, scored, per_role=10)
    assert [o["id"] for o in res["options"]] == ["best_fit", "ready_now", "leanest"]
    ready = res["options"][1]
    assert all(store.avail[m["idx"]] == 0 for m in ready["members"]), "ready_now picks bench people"
    best = res["options"][0]
    team_idxs = {m["idx"] for m in best["members"]}
    assert len(team_idxs) == 3
    m0 = best["members"][0]
    assert m0["swaps"], "swap alternatives computed"
    for sw in m0["swaps"]:
        assert sw["idx"] not in team_idxs and sw["impact"]

    # Lock the first swap into slot r1#0 and re-solve
    lock_eid = store.employee_id[m0["swaps"][0]["idx"]]
    res2 = build_team(scorer, scored, per_role=10, locks={"r1#0": lock_eid})
    best2 = res2["options"][0]
    pinned = best2["members"][0]
    assert pinned["locked"] and store.employee_id[pinned["idx"]] == lock_eid
    assert len({m["idx"] for m in best2["members"]}) == 3


def test_team_plan_normalizes_team_needs_and_seniority_mode(store):
    it = Interpreter(store, LLMClient("http://x", None), "m")
    raw = {
        "title": "Core banking migration",
        "summary": "s",
        "roles": [
            {"title": "Cloud Architect", "count": 1, "seniority_min": "Senior", "seniority_mode": "min",
             "min_years": None, "availability": "soon", "countries": [], "mobility_required": False,
             "target_roles": [{"name": "Cloud Architect", "fit": 1.0}],
             "requirements": [{"label": "Banking", "keyword": "banking", "kind": "sector", "importance": "must",
                               "implicit": True, "reason": "bank client", "skills": [], "certs": [],
                               "sector": "Banca y Finanzas", "language": None, "min_level": None, "soft": []}]},
            {"title": "Data Engineer", "count": 1, "seniority_min": "Mid", "seniority_mode": "target",
             "min_years": None, "availability": "soon", "countries": [], "mobility_required": False,
             "target_roles": [{"name": "Data Engineer", "fit": 1.0}], "requirements": []},
        ],
        "team_needs": [
            {"label": "Banking domain", "kind": "sector", "scope": "at_least", "min_people": 2,
             "importance": "must", "implicit": True, "reason": "bank", "skills": [], "certs": [],
             "sector": "Banking & Finance", "language": None, "min_level": None},
        ],
    }
    spec = it.normalize(raw, [])
    assert spec.roles[0].seniority_mode == "min" and spec.roles[1].seniority_mode == "target"
    assert len(spec.team_needs) == 1 and spec.team_needs[0].sector == "Banca y Finanzas"
    # Duplicate individual sector must-have relaxed to nice since it's covered at team level
    assert spec.roles[0].requirements[0].importance == "nice"
