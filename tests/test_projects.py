"""Persistence tests for saved projects and teams (no AI calls)."""

from __future__ import annotations

from matcher.projects import ProjectStore
from matcher.schemas import (
    BriefSpec,
    ProjectCreate,
    ProjectMember,
    ProjectUpdate,
    Requirement,
    RoleSpec,
    SkillRef,
    TeamShape,
)


def _sample_spec() -> BriefSpec:
    return BriefSpec(
        title="Core Banking Migration",
        summary="Cloud architect and 2 backend developers for banking migration.",
        roles=[
            RoleSpec(
                id="r1",
                title="Cloud Architect",
                count=1,
                availability="soon",
                requirements=[
                    Requirement(id="r1q1", label="Azure", kind="skill", importance="must", skills=[SkillRef(name="Azure")])
                ],
            ),
            RoleSpec(
                id="r2",
                title="Backend Developer",
                count=2,
                availability="soon",
                requirements=[
                    Requirement(id="r2q1", label="Java", kind="skill", importance="must", skills=[SkillRef(name="Java")])
                ],
            ),
        ],
    )


def _member(slot_id: str, role_id: str, label: str, eid: str, name: str, fit: int, avail_code: int = 0) -> ProjectMember:
    return ProjectMember(
        slot_id=slot_id,
        role_id=role_id,
        slot_label=label,
        employee_id=eid,
        name=name,
        role=label,
        position=label,
        area="Architecture & Cloud",
        seniority="Lead" if slot_id == "r1#0" else "Mid",
        location="Madrid, Spain",
        availability="Available now" if avail_code == 0 else "Free < 3 months",
        availability_code=avail_code,
        fit=fit,
        team_role="anchor" if slot_id == "r1#0" else "builder",
    )


def test_project_store_crud_and_persistence(tmp_path):
    db_file = tmp_path / "projects.db"
    store = ProjectStore(db_file)
    assert store.list() == []
    assert store.count() == 0

    created = store.create(
        ProjectCreate(
            title="Core Banking Migration",
            client="Santander",
            status="staffed",
            notes="Kickoff Q1",
            brief="Need a Cloud Architect and 2 Java devs",
            spec=_sample_spec(),
            team_shape=TeamShape(anchors_min=1, max_tz_spread=4),
            team_option="ready_now",
            locks={"r1#0": "E001"},
            members=[
                _member("r1#0", "r1", "Cloud Architect", "E001", "Ana Torres", 92, 0),
                _member("r2#0", "r2", "Backend Developer 1", "E002", "Carlos Ruiz", 86, 1),
                _member("r2#1", "r2", "Backend Developer 2", "E003", "Lucía Vega", 80, 0),
            ],
        )
    )
    assert created.id.startswith("p_")
    assert created.stats is not None
    assert created.stats.slots_total == 3
    assert created.stats.slots_filled == 3
    assert created.stats.avg_fit == 86
    assert "rolling off" in created.stats.ready_by
    store.close()

    # Reopen from disk to prove persistence
    reopened = ProjectStore(db_file)
    assert reopened.count() == 1
    fetched = reopened.get(created.id)
    assert fetched is not None
    assert fetched.title == "Core Banking Migration"
    assert fetched.client == "Santander"
    assert len(fetched.members) == 3
    assert fetched.locks == {"r1#0": "E001"}

    # Modify existing project: update metadata, swap a member, clear team_shape to None
    updated = reopened.update(
        created.id,
        ProjectUpdate(
            title="Core Banking Migration Phase 2",
            status="active",
            team_shape=None,
            members=[
                _member("r1#0", "r1", "Cloud Architect", "E001", "Ana Torres", 92, 0),
                _member("r2#0", "r2", "Backend Developer 1", "E004", "Marta Gil", 90, 0),
            ],
        ),
    )
    assert updated is not None
    assert updated.title == "Core Banking Migration Phase 2"
    assert updated.status == "active"
    assert updated.team_shape is None
    assert updated.client == "Santander"  # untouched field preserved
    assert updated.stats is not None
    assert updated.stats.slots_total == 3
    assert updated.stats.slots_filled == 2
    assert updated.stats.avg_fit == 91
    assert updated.stats.ready_by == "Available now"

    # Delete project
    assert reopened.delete(created.id) is True
    assert reopened.delete(created.id) is False
    assert reopened.get(created.id) is None
    assert reopened.count() == 0
    reopened.close()


def test_projects_http_endpoints(tmp_path):
    from fastapi.testclient import TestClient

    from matcher import main as mmain

    old_projects = getattr(mmain.state, "projects", None)
    tmp_store = ProjectStore(tmp_path / "api_projects.db")
    mmain.state.projects = tmp_store
    try:
        client = TestClient(mmain.app, raise_server_exceptions=True)

        # Avoid triggering full lifespan reload of 190k parquet by calling route handlers directly via app without entering lifespan
        r = client.get("/api/projects")
        assert r.status_code == 200
        assert r.json() == []

        payload = {
            "title": "Digital Wallet Squad",
            "client": "BBVA",
            "status": "active",
            "notes": "Start next month",
            "brief": "Need Cloud Architect and 2 Java devs",
            "spec": _sample_spec().model_dump(),
            "team_option": "best_fit",
            "locks": {"r1#0": "E001"},
            "members": [_member("r1#0", "r1", "Cloud Architect", "E001", "Ana Torres", 92, 0).model_dump()],
        }
        r = client.post("/api/projects", json=payload)
        assert r.status_code == 201
        created = r.json()
        pid = created["id"]
        assert created["title"] == "Digital Wallet Squad"
        assert created["stats"]["slots_total"] == 3
        assert created["stats"]["slots_filled"] == 1

        r = client.get(f"/api/projects/{pid}")
        assert r.status_code == 200
        assert r.json()["client"] == "BBVA"

        r = client.put(f"/api/projects/{pid}", json={"status": "staffed", "notes": "All confirmed"})
        assert r.status_code == 200
        assert r.json()["status"] == "staffed"
        assert r.json()["notes"] == "All confirmed"

        r = client.delete(f"/api/projects/{pid}")
        assert r.status_code == 200
        assert r.json() == {"ok": True, "id": pid}

        r = client.get(f"/api/projects/{pid}")
        assert r.status_code == 404
    finally:
        tmp_store.close()
        if old_projects is not None:
            mmain.state.projects = old_projects

