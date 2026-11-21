"""Typed request/response models shared by the API and the pipeline."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

Importance = Literal["must", "nice"]
Kind = Literal["skill", "sector", "language", "certification", "soft"]
Match = Literal["exact", "equivalent", "related", "transferable"]
Availability = Literal["now", "soon", "any"]
Seniority = Literal["Trainee", "Junior", "Mid", "Senior", "Lead", "Principal"]
SeniorityMode = Literal["target", "min"]
LangLevel = Literal["A2", "B1", "B2", "C1", "C2", "Nativo"]
TeamScope = Literal["all", "at_least"]
TeamOptionId = Literal["best_fit", "ready_now", "leanest"]


class SkillRef(BaseModel):
    name: str
    match: Match = "exact"


class TargetRole(BaseModel):
    name: str
    fit: float = Field(ge=0, le=1)


class Requirement(BaseModel):
    id: str = ""
    label: str
    keyword: str = ""
    kind: Kind = "skill"
    importance: Importance = "must"
    implicit: bool = False
    reason: str | None = None
    skills: list[SkillRef] = []
    certs: list[str] = []
    sector: str | None = None
    language: str | None = None
    min_level: LangLevel | None = None
    soft: list[str] = []
    unmapped: bool = False  # nothing in the catalog can evidence it


class TeamNeed(BaseModel):
    """A requirement satisfied at the team level rather than by every member individually."""

    id: str = ""
    label: str
    kind: Kind = "sector"
    scope: TeamScope = "at_least"
    min_people: int = Field(default=1, ge=1, le=20)
    importance: Importance = "must"
    implicit: bool = False
    reason: str | None = None
    skills: list[SkillRef] = []
    certs: list[str] = []
    sector: str | None = None
    language: str | None = None
    min_level: LangLevel | None = None
    soft: list[str] = []
    unmapped: bool = False


class TeamShape(BaseModel):
    """Editable team balance rules used by the CP-SAT team optimiser."""

    enabled: bool = True
    anchors_min: int = Field(default=1, ge=0, le=5)
    max_senior_plus_ratio: float = Field(default=0.5, ge=0.0, le=1.0)
    min_mid: int = Field(default=1, ge=0, le=10)
    min_junior: int = Field(default=1, ge=0, le=10)
    mentor_juniors: bool = True
    prefer_shared_language: bool = True
    max_tz_spread: int = Field(default=4, ge=0, le=24)
    avoid_duplicates: bool = True


class RoleSpec(BaseModel):
    id: str = ""
    title: str
    count: int = Field(default=1, ge=1, le=10)
    seniority_min: Seniority | None = None
    seniority_mode: SeniorityMode = "target"
    min_years: int | None = Field(default=None, ge=0, le=45)
    availability: Availability = "soon"
    countries: list[str] = []
    mobility_required: bool = False
    target_roles: list[TargetRole] = []
    requirements: list[Requirement] = []


class BriefSpec(BaseModel):
    title: str = "Staffing brief"
    summary: str = ""
    roles: list[RoleSpec]
    team_needs: list[TeamNeed] = []


class InterpretRequest(BaseModel):
    brief: str = Field(min_length=3, max_length=6000)


class InterpretResponse(BaseModel):
    spec: BriefSpec
    ai_used: bool
    model: str | None = None
    warnings: list[str] = []
    seconds: float = 0.0


class SearchRequest(BaseModel):
    spec: BriefSpec
    limit: int = Field(default=10, ge=1, le=30)
    team_shape: TeamShape | None = None
    locks: dict[str, str] = Field(default_factory=dict)  # slot_id (e.g. "r1#0") -> employee_id
    option: TeamOptionId = "best_fit"


class ExplainRequest(BaseModel):
    role: RoleSpec
    employee_id: str


class TeamReviewRequest(BaseModel):
    spec: BriefSpec
    assignments: list[dict]


ProjectStatus = Literal["draft", "active", "staffed", "archived"]
TeamRoleBadge = Literal["anchor", "builder", "learner"]


class ProjectMember(BaseModel):
    """A chosen colleague assigned to a specific slot in a saved project."""

    slot_id: str
    role_id: str
    slot_label: str
    employee_id: str
    name: str
    role: str = ""
    position: str = ""
    area: str = ""
    seniority: str = ""
    location: str = ""
    availability: str = ""
    availability_code: int = 0
    fit: int = 0
    team_role: TeamRoleBadge = "builder"
    mentor_name: str | None = None


class ProjectStats(BaseModel):
    slots_total: int = 0
    slots_filled: int = 0
    avg_fit: int = 0
    ready_by: str = ""
    shape_summary: str = ""
    shared_languages: list[str] = Field(default_factory=list)
    tz_summary: str = ""


class ProjectCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    client: str = Field(default="", max_length=120)
    status: ProjectStatus = "active"
    notes: str = Field(default="", max_length=4000)
    brief: str = Field(default="", max_length=6000)
    spec: BriefSpec
    team_shape: TeamShape | None = None
    team_option: TeamOptionId = "best_fit"
    locks: dict[str, str] = Field(default_factory=dict)
    members: list[ProjectMember] = Field(default_factory=list)
    stats: ProjectStats | None = None


class ProjectUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    client: str | None = Field(default=None, max_length=120)
    status: ProjectStatus | None = None
    notes: str | None = Field(default=None, max_length=4000)
    brief: str | None = Field(default=None, max_length=6000)
    spec: BriefSpec | None = None
    team_shape: TeamShape | None = None
    team_option: TeamOptionId | None = None
    locks: dict[str, str] | None = None
    members: list[ProjectMember] | None = None
    stats: ProjectStats | None = None


class Project(ProjectCreate):
    id: str
    created_at: str
    updated_at: str

