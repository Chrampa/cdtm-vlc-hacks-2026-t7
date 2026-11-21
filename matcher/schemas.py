"""Typed request/response models shared by the API and the pipeline."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

Importance = Literal["must", "nice"]
Kind = Literal["skill", "sector", "language", "certification", "soft"]
Match = Literal["exact", "equivalent", "related", "transferable"]
Availability = Literal["now", "soon", "any"]
Seniority = Literal["Trainee", "Junior", "Mid", "Senior", "Lead", "Principal"]
LangLevel = Literal["A2", "B1", "B2", "C1", "C2", "Nativo"]


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


class RoleSpec(BaseModel):
    id: str = ""
    title: str
    count: int = Field(default=1, ge=1, le=10)
    seniority_min: Seniority | None = None
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


class ExplainRequest(BaseModel):
    role: RoleSpec
    employee_id: str


class TeamReviewRequest(BaseModel):
    spec: BriefSpec
    assignments: list[dict]
