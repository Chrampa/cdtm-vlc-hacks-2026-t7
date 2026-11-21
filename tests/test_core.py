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
from matcher.schemas import Requirement, RoleSpec, SkillRef, TargetRole
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
