"""Persistent SQLite storage for saved projects and their chosen teams."""

from __future__ import annotations

import sqlite3
import threading
import uuid
from datetime import datetime, timezone
from pathlib import Path

from .schemas import BriefSpec, Project, ProjectCreate, ProjectMember, ProjectStats, ProjectUpdate


def _now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _normalize_spec(spec: BriefSpec) -> BriefSpec:
    for ri, role in enumerate(spec.roles):
        role.id = role.id or f"r{ri + 1}"
        seen: set[str] = set()
        for qi, q in enumerate(role.requirements):
            if not q.id or q.id in seen:
                q.id = f"{role.id}q{qi + 1}"
            seen.add(q.id)
            q.unmapped = not (q.skills or q.certs or q.sector or q.language or q.soft)
    seen_tn: set[str] = set()
    for ti, tn in enumerate(spec.team_needs):
        if not tn.id or tn.id in seen_tn:
            tn.id = f"tn{ti + 1}"
        seen_tn.add(tn.id)
        tn.unmapped = not (tn.skills or tn.certs or tn.sector or tn.language or tn.soft)
    return spec


def _compute_stats(spec: BriefSpec, members: list[ProjectMember], existing: ProjectStats | None = None) -> ProjectStats:
    slots_total = sum(r.count for r in spec.roles)
    slots_filled = len(members)
    avg_fit = round(sum(m.fit for m in members) / slots_filled) if slots_filled else 0

    roll_off = sum(1 for m in members if m.availability_code == 1)
    assigned = sum(1 for m in members if m.availability_code == 2)
    if slots_filled == 0:
        ready_by = "Unstaffed"
    elif assigned > 0:
        ready_by = f"Includes {assigned} currently assigned"
    elif roll_off == 0:
        ready_by = "Available now"
    else:
        ready_by = f"Within 3 months ({roll_off} rolling off)"

    by_level: dict[str, int] = {}
    for m in members:
        if m.seniority:
            by_level[m.seniority] = by_level.get(m.seniority, 0) + 1
    order = ("Principal", "Lead", "Senior", "Mid", "Junior", "Trainee")
    parts = [f"{by_level[lvl]} {lvl}" for lvl in order if by_level.get(lvl)]
    shape_summary = " · ".join(parts) if parts else ("Empty" if not members else f"{slots_filled} member(s)")

    return ProjectStats(
        slots_total=slots_total,
        slots_filled=slots_filled,
        avg_fit=avg_fit,
        ready_by=existing.ready_by if (existing and existing.ready_by) else ready_by,
        shape_summary=existing.shape_summary if (existing and existing.shape_summary) else shape_summary,
        shared_languages=existing.shared_languages if existing else [],
        tz_summary=existing.tz_summary if existing else "",
    )


class ProjectStore:
    """Thread-safe SQLite store for saved projects and teams."""

    def __init__(self, db_path: Path | str):
        self.db_path = Path(db_path)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._lock = threading.Lock()
        self._conn = sqlite3.connect(str(self.db_path), check_same_thread=False)
        self._conn.execute("PRAGMA journal_mode=WAL")
        self._conn.execute(
            """
            CREATE TABLE IF NOT EXISTS projects (
                id TEXT PRIMARY KEY,
                updated_at TEXT NOT NULL,
                payload TEXT NOT NULL
            )
            """
        )
        self._conn.commit()

    def close(self) -> None:
        with self._lock:
            self._conn.close()

    def count(self) -> int:
        with self._lock:
            row = self._conn.execute("SELECT COUNT(*) FROM projects").fetchone()
            return int(row[0]) if row else 0

    def list(self) -> list[Project]:
        with self._lock:
            rows = self._conn.execute(
                "SELECT payload FROM projects ORDER BY updated_at DESC, id DESC"
            ).fetchall()
        return [Project.model_validate_json(r[0]) for r in rows]

    def get(self, project_id: str) -> Project | None:
        with self._lock:
            row = self._conn.execute(
                "SELECT payload FROM projects WHERE id = ?", (project_id,)
            ).fetchone()
        return Project.model_validate_json(row[0]) if row else None

    def create(self, data: ProjectCreate) -> Project:
        now = _now_iso()
        pid = f"p_{uuid.uuid4().hex[:10]}"
        spec = _normalize_spec(data.spec.model_copy(deep=True))
        stats = _compute_stats(spec, data.members, data.stats)
        proj = Project(
            id=pid,
            title=data.title.strip(),
            client=data.client.strip(),
            status=data.status,
            notes=data.notes,
            brief=data.brief,
            spec=spec,
            team_shape=data.team_shape,
            team_option=data.team_option,
            locks=dict(data.locks),
            members=list(data.members),
            stats=stats,
            created_at=now,
            updated_at=now,
        )
        payload = proj.model_dump_json()
        with self._lock:
            self._conn.execute(
                "INSERT INTO projects (id, updated_at, payload) VALUES (?, ?, ?)",
                (proj.id, proj.updated_at, payload),
            )
            self._conn.commit()
        return proj

    def update(self, project_id: str, patch: ProjectUpdate) -> Project | None:
        with self._lock:
            row = self._conn.execute(
                "SELECT payload FROM projects WHERE id = ?", (project_id,)
            ).fetchone()
            if not row:
                return None
            cur = Project.model_validate_json(row[0])
            updates = patch.model_dump(exclude_unset=True)
            if "title" in updates and updates["title"] is not None:
                updates["title"] = updates["title"].strip()
            if "client" in updates and updates["client"] is not None:
                updates["client"] = updates["client"].strip()
            if "spec" in updates and updates["spec"] is not None:
                updates["spec"] = _normalize_spec(BriefSpec.model_validate(updates["spec"]))

            merged = cur.model_dump()
            merged.update(updates)
            merged["updated_at"] = _now_iso()
            next_proj = Project.model_validate(merged)

            # Recompute derived stats whenever spec/members changed and caller did not supply fresh stats
            if "stats" not in updates or updates["stats"] is None:
                keep_extra = cur.stats if ("members" not in updates and "spec" not in updates) else None
                next_proj.stats = _compute_stats(next_proj.spec, next_proj.members, keep_extra)
            else:
                next_proj.stats = _compute_stats(next_proj.spec, next_proj.members, next_proj.stats)

            self._conn.execute(
                "UPDATE projects SET updated_at = ?, payload = ? WHERE id = ?",
                (next_proj.updated_at, next_proj.model_dump_json(), project_id),
            )
            self._conn.commit()
            return next_proj

    def delete(self, project_id: str) -> bool:
        with self._lock:
            cur = self._conn.execute("DELETE FROM projects WHERE id = ?", (project_id,))
            self._conn.commit()
            return cur.rowcount > 0
