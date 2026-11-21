"""Loads the profiles parquet once and builds compact numpy indexes for fast scoring.

The raw table stays in an in-memory DuckDB database (used for detail look-ups and
keyword-baseline counts); scoring runs on flat numpy arrays so a full pass over
190k profiles takes milliseconds.
"""

from __future__ import annotations

import logging
import re
import threading
import time
from dataclasses import dataclass, field
from pathlib import Path

import duckdb
import numpy as np

from . import vocab

log = logging.getLogger(__name__)


@dataclass
class Catalog:
    skills: list[str]
    roles: list[str]
    role_area: list[str]
    role_pool: dict[str, list[tuple[str, int]]]  # role -> [(skill, % of role)]
    certs: list[str]
    sectors: list[str]
    languages: list[str]
    soft: list[str]
    methods: list[str]
    countries: list[str]
    areas: list[str]
    skill_id: dict[str, int] = field(default_factory=dict)
    role_id: dict[str, int] = field(default_factory=dict)
    cert_id: dict[str, int] = field(default_factory=dict)
    sector_id: dict[str, int] = field(default_factory=dict)
    lang_id: dict[str, int] = field(default_factory=dict)
    soft_id: dict[str, int] = field(default_factory=dict)
    method_id: dict[str, int] = field(default_factory=dict)
    country_id: dict[str, int] = field(default_factory=dict)

    def __post_init__(self) -> None:
        self.skill_id = {s: i for i, s in enumerate(self.skills)}
        self.role_id = {s: i for i, s in enumerate(self.roles)}
        self.cert_id = {s: i for i, s in enumerate(self.certs)}
        self.sector_id = {s: i for i, s in enumerate(self.sectors)}
        self.lang_id = {s: i for i, s in enumerate(self.languages)}
        self.soft_id = {s: i for i, s in enumerate(self.soft)}
        self.method_id = {s: i for i, s in enumerate(self.methods)}
        self.country_id = {s: i for i, s in enumerate(self.countries)}


class Store:
    """All profile data, loaded once per process."""

    def __init__(self, parquet_path: str | Path):
        t0 = time.perf_counter()
        path = str(Path(parquet_path).resolve())
        self.con = duckdb.connect(database=":memory:")
        self._lock = threading.Lock()
        con = self.con
        con.execute("SET threads TO 4")
        con.execute(
            """
            CREATE TABLE p AS
            SELECT (row_number() OVER (ORDER BY employee_id) - 1)::INTEGER AS idx, *,
                   lower(concat_ws(' | ', rol, puesto_actual, skills_texto, resumen,
                         array_to_string(list_transform(certificaciones, lambda c: c.nombre), ' | ')))
                     AS kw_text
            FROM read_parquet(?)
            ORDER BY idx
            """,
            [path],
        )
        self.n = con.execute("SELECT count(*) FROM p").fetchall()[0][0]

        def distinct(sql: str) -> list[str]:
            return [r[0] for r in con.execute(sql).fetchall()]

        skills = distinct("SELECT DISTINCT u.skill FROM p, unnest(skills) x(u) ORDER BY 1")
        roles_area = con.execute("SELECT rol, any_value(area) FROM p GROUP BY 1 ORDER BY 1").fetchall()
        certs = distinct("SELECT DISTINCT u.nombre FROM p, unnest(certificaciones) x(u) ORDER BY 1")
        sectors = distinct("SELECT DISTINCT sector_principal FROM p ORDER BY 1")
        project_sectors = distinct("SELECT DISTINCT u.cliente_sector FROM p, unnest(proyectos) x(u)")
        sectors = sorted(set(sectors) | set(project_sectors))
        languages = distinct("SELECT DISTINCT u.idioma FROM p, unnest(idiomas) x(u) ORDER BY 1")
        soft = distinct("SELECT DISTINCT u FROM p, unnest(habilidades_blandas) x(u) ORDER BY 1")
        methods = distinct("SELECT DISTINCT u FROM p, unnest(metodologias) x(u) ORDER BY 1")
        countries = distinct("SELECT pais FROM p GROUP BY 1 ORDER BY count(*) DESC")
        areas = distinct("SELECT DISTINCT area FROM p ORDER BY 1")

        pool_rows = con.execute(
            """
            WITH c AS (SELECT rol, count(*) n FROM p GROUP BY 1),
                 s AS (SELECT p.rol, u.skill FROM p, unnest(skills) x(u))
            SELECT s.rol, s.skill, round(100.0 * count(*) / any_value(c.n))::INTEGER pct
            FROM s JOIN c ON c.rol = s.rol
            GROUP BY 1, 2 ORDER BY 1, 3 DESC
            """
        ).fetchall()
        role_pool: dict[str, list[tuple[str, int]]] = {}
        for rol, skill, pct in pool_rows:
            role_pool.setdefault(rol, []).append((skill, pct))

        self.cat = Catalog(
            skills=skills,
            roles=[r for r, _ in roles_area],
            role_area=[a for _, a in roles_area],
            role_pool=role_pool,
            certs=certs,
            sectors=sectors,
            languages=languages,
            soft=soft,
            methods=methods,
            countries=countries,
            areas=areas,
        )
        self._register_vocab_tables()
        self._build_profile_arrays()
        self._build_skill_rows()
        self._build_other_rows()
        log.info("Loaded %d profiles in %.1fs", self.n, time.perf_counter() - t0)

    # ------------------------------------------------------------------ build
    def _register_vocab_tables(self) -> None:
        con, cat = self.con, self.cat

        def table(name: str, values: list[str]) -> None:
            con.execute(f"CREATE TABLE {name} (name VARCHAR, id INTEGER)")
            con.executemany(f"INSERT INTO {name} VALUES (?, ?)", [(v, i) for i, v in enumerate(values)])

        table("v_skill", cat.skills)
        table("v_role", cat.roles)
        table("v_cert", cat.certs)
        table("v_sector", cat.sectors)
        table("v_lang", cat.languages)
        table("v_soft", cat.soft)
        table("v_method", cat.methods)
        table("v_country", cat.countries)
        table("v_area", cat.areas)
        table("v_avail", vocab.AVAILABILITY)
        table("v_senior", vocab.SENIORITY)
        table("v_langlvl", vocab.LANG_LEVELS)

    def _build_profile_arrays(self) -> None:
        res = self.con.execute(
            """
            SELECT p.employee_id, p.nombre_completo, p.ciudad,
                   a.id AS avail, p.anios_experiencia AS years, s.id AS senior,
                   r.id AS role, ar.id AS area, se.id AS sector, c.id AS country,
                   p.movilidad_internacional AS mobility, p.anios_en_ntt AS ntt_years
            FROM p
            JOIN v_avail a ON a.name = p.disponibilidad
            JOIN v_senior s ON s.name = p.nivel_seniority
            JOIN v_role r ON r.name = p.rol
            JOIN v_area ar ON ar.name = p.area
            JOIN v_sector se ON se.name = p.sector_principal
            JOIN v_country c ON c.name = p.pais
            ORDER BY p.idx
            """
        ).fetchnumpy()
        if len(res["avail"]) != self.n:
            raise RuntimeError("Profile table has values outside the known vocabularies")
        self.employee_id: list[str] = list(res["employee_id"])
        self.name: list[str] = list(res["nombre_completo"])
        self.city: list[str] = list(res["ciudad"])
        self.avail = np.asarray(res["avail"], dtype=np.int8)
        self.years = np.asarray(res["years"], dtype=np.int16)
        self.senior = np.asarray(res["senior"], dtype=np.int8)
        self.role = np.asarray(res["role"], dtype=np.int16)
        self.area = np.asarray(res["area"], dtype=np.int8)
        self.sector = np.asarray(res["sector"], dtype=np.int8)
        self.country = np.asarray(res["country"], dtype=np.int16)
        self.mobility = np.asarray(res["mobility"], dtype=bool)
        self.ntt_years = np.asarray(res["ntt_years"], dtype=np.float32)
        self.idx_by_id = {eid: i for i, eid in enumerate(self.employee_id)}

    def _build_skill_rows(self) -> None:
        res = self.con.execute(
            """
            WITH s AS (
                SELECT p.idx, u.skill, u.nivel, u.anios FROM p, unnest(skills) x(u)
            ), pt AS (
                SELECT p.idx, t AS skill, max(pr.anio) AS last_year, count(*) AS n
                FROM p, unnest(proyectos) y(pr), unnest(pr.tecnologias) z(t)
                GROUP BY ALL
            ), et AS (
                SELECT p.idx, t AS skill,
                       max(CASE WHEN e.fin = 'Actual' THEN year(current_date)
                                ELSE year(TRY_CAST(e.fin AS DATE)) END) AS last_year,
                       count(*) AS n
                FROM p, unnest(experiencia) y(e), unnest(e.tecnologias) z(t)
                GROUP BY ALL
            )
            SELECT s.idx, v.id AS skill, s.nivel AS level, s.anios AS yrs,
                   coalesce(pt.n, 0) + coalesce(et.n, 0) AS uses,
                   greatest(coalesce(pt.last_year, 0), coalesce(et.last_year, 0)) AS last_year
            FROM s
            JOIN v_skill v ON v.name = s.skill
            LEFT JOIN pt ON pt.idx = s.idx AND pt.skill = s.skill
            LEFT JOIN et ON et.idx = s.idx AND et.skill = s.skill
            ORDER BY s.idx
            """
        ).fetchnumpy()
        self.sk_emp = np.asarray(res["idx"], dtype=np.int32)
        self.sk_id = np.asarray(res["skill"], dtype=np.int16)
        self.sk_level = np.asarray(res["level"], dtype=np.float32)
        self.sk_years = np.asarray(res["yrs"], dtype=np.float32)
        self.sk_uses = np.asarray(res["uses"], dtype=np.int16)
        self.sk_last = np.asarray(res["last_year"], dtype=np.int16)
        self.current_year = int(self.con.execute("SELECT year(current_date)").fetchall()[0][0])

        # Depth of one skill entry in [0, 1]: self-rated level, years of use and whether
        # (and how recently) it was actually used in a recorded project or job.
        recency = np.where(
            self.sk_uses > 0,
            np.where(self.sk_last >= self.current_year - 3, 1.0, 0.6),
            0.0,
        ).astype(np.float32)
        self.sk_depth = np.clip(
            0.5 * self.sk_level / 5.0 + 0.3 * np.minimum(self.sk_years / 6.0, 1.0) + 0.2 * recency,
            0.0,
            1.0,
        ).astype(np.float32)

    def _build_other_rows(self) -> None:
        con, n, cat = self.con, self.n, self.cat
        res = con.execute(
            """SELECT p.idx, v.id AS cert FROM p, unnest(certificaciones) x(u)
               JOIN v_cert v ON v.name = u.nombre"""
        ).fetchnumpy()
        self.ce_emp = np.asarray(res["idx"], dtype=np.int32)
        self.ce_id = np.asarray(res["cert"], dtype=np.int16)

        res = con.execute(
            """SELECT p.idx, v.id AS lang, l.id + 1 AS lvl FROM p, unnest(idiomas) x(u)
               JOIN v_lang v ON v.name = u.idioma JOIN v_langlvl l ON l.name = u.nivel"""
        ).fetchnumpy()
        self.lang_level = np.zeros((n, len(cat.languages)), dtype=np.int8)
        self.lang_level[np.asarray(res["idx"]), np.asarray(res["lang"])] = np.asarray(res["lvl"])

        ns = len(cat.sectors)
        res = con.execute(
            """SELECT p.idx, v.id AS sector, count(*) AS cnt, max(u.anio) AS last_year
               FROM p, unnest(proyectos) x(u) JOIN v_sector v ON v.name = u.cliente_sector
               GROUP BY ALL"""
        ).fetchnumpy()
        self.sec_proj = np.zeros((n, ns), dtype=np.int8)
        self.sec_proj_last = np.zeros((n, ns), dtype=np.int16)
        i, s = np.asarray(res["idx"]), np.asarray(res["sector"])
        self.sec_proj[i, s] = np.asarray(res["cnt"])
        self.sec_proj_last[i, s] = np.asarray(res["last_year"])

        self.sec_employer = np.zeros((n, ns), dtype=bool)
        emp_rows = con.execute("SELECT p.idx, u.empresa FROM p, unnest(experiencia) x(u)").fetchnumpy()
        mapped = [vocab.EMPLOYER_SECTOR.get(e) for e in emp_rows["empresa"]]
        ok = np.array([m is not None for m in mapped])
        if ok.any():
            rows = np.asarray(emp_rows["idx"])[ok]
            cols = np.array([cat.sector_id[m] for m in mapped if m is not None])
            self.sec_employer[rows, cols] = True

        self.soft_mask = np.zeros((n, len(cat.soft)), dtype=bool)
        res = con.execute(
            "SELECT p.idx, v.id AS s FROM p, unnest(habilidades_blandas) x(u) JOIN v_soft v ON v.name = u"
        ).fetchnumpy()
        self.soft_mask[np.asarray(res["idx"]), np.asarray(res["s"])] = True
        self.method_mask = np.zeros((n, len(cat.methods)), dtype=bool)
        res = con.execute(
            "SELECT p.idx, v.id AS s FROM p, unnest(metodologias) x(u) JOIN v_method v ON v.name = u"
        ).fetchnumpy()
        self.method_mask[np.asarray(res["idx"]), np.asarray(res["s"])] = True

    # ---------------------------------------------------------------- queries
    def profiles(self, idxs: list[int]) -> dict[int, dict]:
        """Full raw profile records for a handful of people."""
        if not idxs:
            return {}
        with self._lock:
            cur = self.con.cursor()
            cur.execute(
                "SELECT * EXCLUDE (kw_text) FROM p WHERE idx IN (SELECT unnest(?::INTEGER[]))",
                [list(map(int, idxs))],
            )
            cols = [d[0] for d in cur.description]
            rows = cur.fetchall()
        return {r[0]: dict(zip(cols, r)) for r in rows}

    def keyword_matches(self, keywords: list[str], allowed: np.ndarray) -> tuple[int, set[int]]:
        """Literal keyword baseline: profiles whose text contains *all* keywords.

        Returns the number of matching profiles that pass the hard filters, and the set
        of matching indexes (used to flag people a keyword search would miss).
        """
        stop = {"and", "the", "for", "with", "de", "la", "el", "y", "en", "con", "del", "experience", "experiencia"}
        groups: list[list[str]] = []
        for k in keywords:
            words = [w for w in re.findall(r"[\w+#./-]+", (k or "").lower()) if len(w) >= 2 and w not in stop]
            if words:
                groups.append(words)
        if not groups:
            return 0, set()
        # Each keyword must appear; a multi-word keyword matches if any of its words does.
        cond = " AND ".join("(" + " OR ".join("contains(kw_text, ?)" for _ in g) + ")" for g in groups)
        params = [w for g in groups for w in g]
        with self._lock:
            cur = self.con.cursor()
            cur.execute(f"SELECT idx FROM p WHERE {cond}", params)
            hit = np.fromiter((r[0] for r in cur.fetchall()), dtype=np.int64)
        hit = hit[allowed[hit]] if hit.size else hit
        return int(hit.size), set(hit.tolist())
