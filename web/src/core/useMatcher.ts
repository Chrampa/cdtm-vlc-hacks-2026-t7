import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "../api";
import type {
  BriefSpec,
  Candidate,
  Explanation,
  InterpretResponse,
  Meta,
  Project,
  ProjectMember,
  ProjectStats,
  ProjectStatus,
  ProjectUpdate,
  RoleSpec,
  SearchResponse,
  TeamNeed,
  TeamOption,
  TeamOptionId,
  TeamReview,
  TeamShape,
} from "../types";

export type Phase = "idle" | "interpreting" | "searching" | "ready" | "error";
export type View = "home" | "results" | "projects" | "project";

function hash(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}
const roleKey = (r: RoleSpec) => hash(JSON.stringify(r));

function nextRoleIndex(roles: RoleSpec[]): number {
  let max = roles.length;
  for (const r of roles) {
    const m = /^r(\d+)$/.exec(r.id);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return max + 1;
}

function nextNeedIndex(needs: TeamNeed[]): number {
  let max = needs.length;
  for (const n of needs) {
    const m = /^tn(\d+)$/.exec(n.id);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return max + 1;
}

function candidateToMember(
  c: Candidate,
  slotId: string,
  roleId: string,
  slotLabel: string,
  teamRole: "anchor" | "builder" | "learner" = "builder",
  mentorName: string | null = null,
): ProjectMember {
  return {
    slot_id: slotId,
    role_id: roleId,
    slot_label: slotLabel,
    employee_id: c.employee_id,
    name: c.name,
    role: c.role,
    position: c.position,
    area: c.area,
    seniority: c.seniority,
    location: c.location,
    availability: c.availability,
    availability_code: c.availability_code,
    fit: c.fit,
    team_role: teamRole,
    mentor_name: mentorName,
  };
}

function buildSnapshot(
  spec: BriefSpec | null,
  result: SearchResponse | null,
  activeOption: TeamOption | null,
  locks: Record<string, string>,
  fallbackSingle = true,
  existingMembers: ProjectMember[] = [],
): { members: ProjectMember[]; stats: ProjectStats; locks: Record<string, string> } {
  if (!spec) {
    return {
      members: [],
      stats: { slots_total: 0, slots_filled: 0, avg_fit: 0, ready_by: "", shape_summary: "", shared_languages: [], tz_summary: "" },
      locks: {},
    };
  }
  const slotsTotal = spec.roles.reduce((a, r) => a + r.count, 0);

  if (result?.multi && activeOption) {
    const members: ProjectMember[] = [];
    for (const m of activeOption.members) {
      if (!m.candidate) continue;
      members.push(
        candidateToMember(m.candidate, m.slot_id, m.role_id, m.slot_label, m.team_role, m.mentor?.name ?? null),
      );
    }
    return {
      members,
      stats: {
        slots_total: activeOption.slots_total,
        slots_filled: activeOption.slots_filled,
        avg_fit: activeOption.avg_fit,
        ready_by: activeOption.ready_by,
        shape_summary: activeOption.shape.summary,
        shared_languages: activeOption.shared_languages,
        tz_summary: activeOption.tz_summary,
      },
      locks: { ...locks },
    };
  }

  // Single-role snapshot
  const roleRes = result?.roles[0];
  const roleSpec = spec.roles[0];
  const members: ProjectMember[] = [];
  if (roleRes && roleSpec) {
    const slotId = `${roleSpec.id}#0`;
    const chosenId = locks[slotId];
    let picked = chosenId ? roleRes.candidates.find((c) => c.employee_id === chosenId) : undefined;
    if (!picked && chosenId) {
      const prev = existingMembers.find((m) => m.employee_id === chosenId && m.role_id === roleSpec.id);
      if (prev) members.push({ ...prev, slot_id: slotId, slot_label: roleSpec.title });
    }
    if (!picked && !members.length && fallbackSingle && roleRes.candidates[0]) {
      picked = roleRes.candidates[0];
    }
    if (picked) {
      members.push(candidateToMember(picked, slotId, roleSpec.id, roleSpec.title, "anchor", null));
    }
  }
  const slotsFilled = members.length;
  const avgFit = slotsFilled ? Math.round(members.reduce((a, m) => a + m.fit, 0) / slotsFilled) : 0;
  const readyBy = !slotsFilled
    ? "Unstaffed"
    : members[0].availability_code === 0
      ? "Available now"
      : members[0].availability_code === 1
        ? "Within 3 months"
        : "Currently assigned";
  return {
    members,
    stats: {
      slots_total: slotsTotal,
      slots_filled: slotsFilled,
      avg_fit: avgFit,
      ready_by: readyBy,
      shape_summary: members[0]?.seniority ? `1 ${members[0].seniority}` : "Unstaffed",
      shared_languages: [],
      tz_summary: "",
    },
    locks: { ...locks },
  };
}

function parseHash(): { view: View; projectId: string | null } {
  const h = location.hash;
  if (h === "#projects") return { view: "projects", projectId: null };
  if (h.startsWith("#project/")) {
    const id = decodeURIComponent(h.slice("#project/".length));
    if (id) return { view: "project", projectId: id };
  }
  if (h === "#results") return { view: "results", projectId: null };
  return { view: "home", projectId: null };
}

/** All app state and actions, shared across views. */
export function useMatcher() {
  const initial = useMemo(parseHash, []);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [view, setView] = useState<View>(initial.view === "results" ? "home" : initial.view);
  const [brief, setBrief] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [interp, setInterp] = useState<InterpretResponse | null>(null);
  const [spec, setSpec] = useState<BriefSpec | null>(null);
  const [result, setResult] = useState<SearchResponse | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<string>("team");
  const [teamOption, setTeamOptionState] = useState<TeamOptionId>("best_fit");
  const [teamShape, setTeamShape] = useState<TeamShape | null>(null);
  const [locks, setLocks] = useState<Record<string, string>>({});
  const [explanations, setExplanations] = useState<Record<string, Explanation | "loading">>({});
  const [review, setReview] = useState<TeamReview | "loading" | undefined>(undefined);

  // Saved projects state
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(initial.projectId);
  const [dirty, setDirty] = useState(false);
  const [savingProject, setSavingProject] = useState(false);
  const [addingRole, setAddingRole] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const searchAbort = useRef<AbortController | null>(null);
  const runId = useRef(0);
  const toastTimer = useRef<number | null>(null);

  const flash = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 3200);
  }, []);

  const refreshProjects = useCallback(async () => {
    try {
      const list = await api.projects.list();
      setProjects(list);
    } catch {
      /* ignore transient fetch errors */
    } finally {
      setProjectsLoading(false);
    }
  }, []);

  useEffect(() => {
    api.meta().then(setMeta).catch(() => setMeta(null));
    refreshProjects();
  }, [refreshProjects]);

  useEffect(() => {
    const onPop = () => {
      const parsed = parseHash();
      if (parsed.view === "results") {
        setView(result ? "results" : "home");
      } else if (parsed.view === "project" && parsed.projectId) {
        setActiveProjectId(parsed.projectId);
        setView("project");
      } else {
        setView(parsed.view);
      }
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [result]);

  const activeProject = useMemo(
    () => (activeProjectId ? projects.find((p) => p.id === activeProjectId) ?? null : null),
    [projects, activeProjectId],
  );

  const roleById = useMemo(() => Object.fromEntries((spec?.roles ?? []).map((r) => [r.id, r])), [spec]);

  const activeTeamOption = useMemo(() => {
    const opts = result?.team?.options;
    if (!opts?.length) return null;
    return opts.find((o) => o.id === teamOption) ?? opts[0];
  }, [result, teamOption]);

  const explainForRole = useCallback((role: RoleSpec, employeeId: string) => {
    const key = `${roleKey(role)}|${employeeId}`;
    setExplanations((prev) => {
      if (prev[key]) return prev;
      api.explain(role, employeeId)
        .then((e) => setExplanations((p) => ({ ...p, [key]: e })))
        .catch(() =>
          setExplanations((p) => ({
            ...p,
            [key]: { ok: false, error: "The AI service did not answer. The evidence is still complete." },
          })),
        );
      return { ...prev, [key]: "loading" };
    });
  }, []);

  const explanationForRole = useCallback(
    (role: RoleSpec | undefined, employeeId: string) => (role ? explanations[`${roleKey(role)}|${employeeId}`] : undefined),
    [explanations],
  );

  const explainById = useCallback(
    (roleId: string, employeeId: string) => {
      const r = roleById[roleId];
      if (r) explainForRole(r, employeeId);
    },
    [roleById, explainForRole],
  );

  const explanation = useCallback(
    (roleId: string, employeeId: string) => explanationForRole(roleById[roleId], employeeId),
    [roleById, explanationForRole],
  );

  const candidateForRole = useCallback(async (role: RoleSpec, employeeId: string): Promise<Candidate | null> => {
    try {
      return await api.candidate(role, employeeId);
    } catch {
      return null;
    }
  }, []);

  const candidate = useCallback(
    async (roleId: string, employeeId: string): Promise<Candidate | null> => {
      const r = roleById[roleId];
      if (!r) return null;
      return candidateForRole(r, employeeId);
    },
    [roleById, candidateForRole],
  );

  const runSearch = useCallback(
    async (
      s: BriefSpec,
      first: boolean,
      opts?: { shape?: TeamShape | null; locks?: Record<string, string>; option?: TeamOptionId; focusTab?: string },
    ) => {
      searchAbort.current?.abort();
      const ctrl = new AbortController();
      searchAbort.current = ctrl;
      if (!first) setRefreshing(true);
      try {
        const res = await api.search(
          s,
          {
            team_shape: opts?.shape !== undefined ? opts.shape : teamShape,
            locks: opts?.locks !== undefined ? opts.locks : locks,
            option: opts?.option ?? teamOption,
          },
          ctrl.signal,
        );
        setResult(res);
        setReview(undefined);
        if (opts?.focusTab) {
          setTab(opts.focusTab);
        } else if (first) {
          setTab(res.multi ? "team" : res.roles[0]?.id ?? "team");
        } else if (!res.multi && res.roles[0]) {
          setTab(res.roles[0].id);
        }
        setPhase("ready");
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
        setError((e as Error).message);
        setPhase(first ? "error" : "ready");
      } finally {
        if (searchAbort.current === ctrl) setRefreshing(false);
      }
    },
    [teamShape, locks, teamOption],
  );

  const submit = useCallback(
    async (text?: string) => {
      const b = (text ?? brief).trim();
      if (b.length < 10) return;
      if (text !== undefined) setBrief(text);
      const id = ++runId.current;
      setActiveProjectId(null);
      setDirty(false);
      setView("results");
      if (location.hash !== "#results") history.pushState(null, "", location.pathname + "#results");
      setPhase("interpreting");
      setError(null);
      setResult(null);
      setTeamShape(null);
      setLocks({});
      setTeamOptionState("best_fit");
      try {
        const it = await api.interpret(b);
        if (id !== runId.current) return;
        setInterp(it);
        setSpec(it.spec);
        setPhase("searching");
        await runSearch(it.spec, true, { shape: null, locks: {}, option: "best_fit" });
      } catch (e) {
        if (id !== runId.current) return;
        setError((e as Error).message || "Something went wrong");
        setPhase("error");
      }
    },
    [brief, runSearch],
  );

  const editRole = useCallback(
    (role: RoleSpec) => {
      if (!spec) return;
      const next = { ...spec, roles: spec.roles.map((r) => (r.id === role.id ? role : r)) };
      setSpec(next);
      setDirty(true);
      runSearch(next, false);
    },
    [spec, runSearch],
  );

  const setRoleCount = useCallback(
    (roleId: string, count: number) => {
      if (!spec) return;
      const clamped = Math.max(1, Math.min(10, count));
      const nextRoles = spec.roles.map((r) => (r.id === roleId ? { ...r, count: clamped } : r));
      const nextSpec = { ...spec, roles: nextRoles };
      const nextLocks: Record<string, string> = {};
      for (const [sid, eid] of Object.entries(locks)) {
        const [rid, idxStr] = sid.split("#");
        if (rid === roleId && Number(idxStr) >= clamped) continue;
        nextLocks[sid] = eid;
      }
      setSpec(nextSpec);
      setLocks(nextLocks);
      setDirty(true);
      runSearch(nextSpec, false, { locks: nextLocks });
    },
    [spec, locks, runSearch],
  );

  const removeRole = useCallback(
    (roleId: string) => {
      if (!spec || spec.roles.length <= 1) return;
      const nextRoles = spec.roles.filter((r) => r.id !== roleId);
      const nextSpec = { ...spec, roles: nextRoles };
      const nextLocks: Record<string, string> = {};
      for (const [sid, eid] of Object.entries(locks)) {
        if (!sid.startsWith(`${roleId}#`)) nextLocks[sid] = eid;
      }
      setSpec(nextSpec);
      setLocks(nextLocks);
      setDirty(true);
      const nextMulti = nextRoles.length > 1 || nextRoles.some((r) => r.count > 1);
      const focusTab = tab === roleId ? (nextMulti ? "team" : nextRoles[0].id) : undefined;
      runSearch(nextSpec, false, { locks: nextLocks, focusTab });
    },
    [spec, locks, tab, runSearch],
  );

  const resetRole = useCallback(
    (roleId: string) => {
      const orig = interp?.spec.roles.find((r) => r.id === roleId);
      if (orig) editRole(orig);
    },
    [interp, editRole],
  );

  const editTeamNeed = useCallback(
    (needId: string, patch: Partial<TeamNeed> | null) => {
      if (!spec) return;
      const cur = spec.team_needs ?? [];
      const nextNeeds =
        patch === null ? cur.filter((n) => n.id !== needId) : cur.map((n) => (n.id === needId ? { ...n, ...patch } : n));
      const next = { ...spec, team_needs: nextNeeds };
      setSpec(next);
      setDirty(true);
      runSearch(next, false);
    },
    [spec, runSearch],
  );

  const setTeamOption = useCallback((opt: TeamOptionId) => {
    setTeamOptionState(opt);
    setReview(undefined);
    setDirty(true);
  }, []);

  const updateTeamShape = useCallback(
    (shape: TeamShape) => {
      setTeamShape(shape);
      setDirty(true);
      if (spec) runSearch(spec, false, { shape });
    },
    [spec, runSearch],
  );

  const resetTeamShape = useCallback(() => {
    setTeamShape(null);
    setDirty(true);
    if (spec) runSearch(spec, false, { shape: null });
  }, [spec, runSearch]);

  const toggleLock = useCallback(
    (slotId: string, employeeId: string) => {
      if (!spec) return;
      const next = { ...locks };
      if (next[slotId] === employeeId) delete next[slotId];
      else next[slotId] = employeeId;
      setLocks(next);
      setDirty(true);
      runSearch(spec, false, { locks: next });
    },
    [spec, locks, runSearch],
  );

  const swapMember = useCallback(
    (slotId: string, employeeId: string) => {
      if (!spec) return;
      const next: Record<string, string> = {};
      for (const [k, v] of Object.entries(locks)) {
        if (v !== employeeId) next[k] = v;
      }
      next[slotId] = employeeId;
      setLocks(next);
      setDirty(true);
      runSearch(spec, false, { locks: next });
    },
    [spec, locks, runSearch],
  );

  const assignCandidate = useCallback(
    (slotId: string, employeeId: string) => {
      if (!spec) return;
      const next: Record<string, string> = {};
      for (const [k, v] of Object.entries(locks)) {
        if (v !== employeeId) next[k] = v;
      }
      next[slotId] = employeeId;
      setLocks(next);
      setDirty(true);
      if (result?.multi) {
        runSearch(spec, false, { locks: next });
      }
    },
    [spec, locks, result, runSearch],
  );

  const unassignSlot = useCallback(
    (slotId: string) => {
      if (!spec || !(slotId in locks)) return;
      const next = { ...locks };
      delete next[slotId];
      setLocks(next);
      setDirty(true);
      if (result?.multi) {
        runSearch(spec, false, { locks: next });
      }
    },
    [spec, locks, result, runSearch],
  );

  const clearLocks = useCallback(() => {
    if (!spec || Object.keys(locks).length === 0) return;
    setLocks({});
    setDirty(true);
    runSearch(spec, false, { locks: {} });
  }, [spec, locks, runSearch]);

  // --------------------------------------------------- project actions
  const currentSnapshot = useCallback(
    (fallbackSingle = true) =>
      buildSnapshot(spec, result, activeTeamOption, locks, fallbackSingle, activeProject?.members ?? []),
    [spec, result, activeTeamOption, locks, activeProject],
  );

  const goHome = useCallback(() => {
    setView("home");
    if (location.hash) history.pushState(null, "", location.pathname);
  }, []);

  const goResults = useCallback(() => {
    if (!spec) return;
    setView("results");
    if (location.hash !== "#results") history.pushState(null, "", location.pathname + "#results");
  }, [spec]);

  const startNewSearch = useCallback(() => {
    setActiveProjectId(null);
    setBrief("");
    setDirty(false);
    setView("home");
    if (location.hash) history.pushState(null, "", location.pathname);
  }, []);

  const goProjects = useCallback(() => {
    setView("projects");
    if (location.hash !== "#projects") history.pushState(null, "", location.pathname + "#projects");
    refreshProjects();
  }, [refreshProjects]);

  const openProject = useCallback((projectId: string) => {
    setActiveProjectId(projectId);
    setView("project");
    const targetHash = `#project/${encodeURIComponent(projectId)}`;
    if (location.hash !== targetHash) history.pushState(null, "", location.pathname + targetHash);
  }, []);

  const modifyProject = useCallback(
    async (
      project: Project,
      opts?: { unlockSlotId?: string; focusTab?: string; clearAllLocks?: boolean },
    ) => {
      ++runId.current;
      setActiveProjectId(project.id);
      setBrief(project.brief);
      setSpec(project.spec);
      setInterp(null);
      setTeamShape(project.team_shape);
      setTeamOptionState(project.team_option || "best_fit");
      setError(null);
      setResult(null);

      const nextLocks: Record<string, string> = {};
      if (!opts?.clearAllLocks) {
        Object.assign(nextLocks, project.locks);
        for (const mem of project.members) {
          nextLocks[mem.slot_id] = mem.employee_id;
        }
        if (opts?.unlockSlotId) {
          delete nextLocks[opts.unlockSlotId];
        }
      }
      setLocks(nextLocks);
      setDirty(Boolean(opts?.unlockSlotId || opts?.clearAllLocks));
      setView("results");
      if (location.hash !== "#results") history.pushState(null, "", location.pathname + "#results");
      setPhase("searching");

      await runSearch(project.spec, true, {
        shape: project.team_shape,
        locks: nextLocks,
        option: project.team_option || "best_fit",
        focusTab: opts?.focusTab,
      });
    },
    [runSearch],
  );

  const saveAsNewProject = useCallback(
    async (input: {
      title: string;
      client: string;
      status: ProjectStatus;
      notes: string;
      includeTopIfUnselected?: boolean;
    }): Promise<Project | null> => {
      if (!spec) return null;
      setSavingProject(true);
      try {
        const snap = currentSnapshot(input.includeTopIfUnselected ?? true);
        const created = await api.projects.create({
          title: input.title.trim() || spec.title,
          client: input.client.trim(),
          status: input.status,
          notes: input.notes,
          brief,
          spec: { ...spec, title: input.title.trim() || spec.title },
          team_shape: teamShape,
          team_option: teamOption,
          locks: snap.locks,
          members: snap.members,
          stats: snap.stats,
        });
        setProjects((prev) => [created, ...prev.filter((p) => p.id !== created.id)]);
        setActiveProjectId(created.id);
        setSpec(created.spec);
        setDirty(false);
        flash(`Saved "${created.title}"`);
        return created;
      } catch (e) {
        flash((e as Error).message || "Could not save project");
        return null;
      } finally {
        setSavingProject(false);
      }
    },
    [spec, brief, teamShape, teamOption, currentSnapshot, flash],
  );

  const saveCurrentProject = useCallback(
    async (metaPatch?: Partial<Pick<Project, "title" | "client" | "status" | "notes">>): Promise<Project | null> => {
      if (!activeProjectId || !spec) return null;
      setSavingProject(true);
      try {
        const snap = currentSnapshot(false);
        const nextSpec = metaPatch?.title ? { ...spec, title: metaPatch.title.trim() } : spec;
        const updated = await api.projects.update(activeProjectId, {
          ...metaPatch,
          brief,
          spec: nextSpec,
          team_shape: teamShape,
          team_option: teamOption,
          locks: snap.locks,
          members: snap.members,
          stats: snap.stats,
        });
        setProjects((prev) => [updated, ...prev.filter((p) => p.id !== updated.id)]);
        setSpec(updated.spec);
        setDirty(false);
        flash(`Saved changes to "${updated.title}"`);
        return updated;
      } catch (e) {
        flash((e as Error).message || "Could not save changes");
        return null;
      } finally {
        setSavingProject(false);
      }
    },
    [activeProjectId, spec, brief, teamShape, teamOption, currentSnapshot, flash],
  );

  const updateProjectMeta = useCallback(
    async (projectId: string, patch: ProjectUpdate, message = "Project updated"): Promise<Project | null> => {
      setSavingProject(true);
      try {
        const updated = await api.projects.update(projectId, patch);
        setProjects((prev) => [updated, ...prev.filter((p) => p.id !== updated.id)]);
        if (activeProjectId === projectId && patch.spec) {
          setSpec(updated.spec);
        }
        flash(message);
        return updated;
      } catch (e) {
        flash((e as Error).message || "Could not update project");
        return null;
      } finally {
        setSavingProject(false);
      }
    },
    [activeProjectId, flash],
  );

  const deleteProject = useCallback(
    async (projectId: string) => {
      try {
        await api.projects.delete(projectId);
        setProjects((prev) => prev.filter((p) => p.id !== projectId));
        if (activeProjectId === projectId) {
          setActiveProjectId(null);
          if (view === "project") goProjects();
        }
        flash("Project deleted");
      } catch (e) {
        flash((e as Error).message || "Could not delete project");
      }
    },
    [activeProjectId, view, goProjects, flash],
  );

  const addCurrentSearchToProject = useCallback(
    async (targetProjectId: string, includeTopIfUnselected = true): Promise<Project | null> => {
      if (!spec) return null;
      const target = projects.find((p) => p.id === targetProjectId);
      if (!target) return null;
      setSavingProject(true);
      try {
        const snap = currentSnapshot(includeTopIfUnselected);
        let rNum = nextRoleIndex(target.spec.roles);
        const roleIdMap = new Map<string, string>();
        const appendedRoles: RoleSpec[] = spec.roles.map((r) => {
          const newId = `r${rNum++}`;
          roleIdMap.set(r.id, newId);
          return {
            ...r,
            id: newId,
            requirements: r.requirements.map((q, qi) => ({ ...q, id: `${newId}q${qi + 1}` })),
          };
        });

        let tnNum = nextNeedIndex(target.spec.team_needs ?? []);
        const appendedNeeds: TeamNeed[] = (spec.team_needs ?? []).map((tn) => ({
          ...tn,
          id: `tn${tnNum++}`,
        }));

        const mergedLocks: Record<string, string> = { ...target.locks };
        for (const mem of target.members) mergedLocks[mem.slot_id] = mem.employee_id;

        const existingEmpIds = new Set(target.members.map((m) => m.employee_id));
        const appendedMembers: ProjectMember[] = [];
        for (const mem of snap.members) {
          const newRoleId = roleIdMap.get(mem.role_id) ?? mem.role_id;
          const idxPart = mem.slot_id.split("#")[1] ?? "0";
          const newSlotId = `${newRoleId}#${idxPart}`;
          if (!existingEmpIds.has(mem.employee_id)) {
            appendedMembers.push({ ...mem, role_id: newRoleId, slot_id: newSlotId });
            mergedLocks[newSlotId] = mem.employee_id;
            existingEmpIds.add(mem.employee_id);
          }
        }

        const mergedSpec: BriefSpec = {
          ...target.spec,
          roles: [...target.spec.roles, ...appendedRoles],
          team_needs: [...(target.spec.team_needs ?? []), ...appendedNeeds],
        };
        const mergedBrief = brief.trim()
          ? target.brief
            ? `${target.brief}\n\n+ Added: ${brief.trim()}`
            : brief.trim()
          : target.brief;

        const updated = await api.projects.update(target.id, {
          brief: mergedBrief,
          spec: mergedSpec,
          locks: mergedLocks,
          members: [...target.members, ...appendedMembers],
          status: target.status === "archived" ? "active" : target.status,
        });
        setProjects((prev) => [updated, ...prev.filter((p) => p.id !== updated.id)]);
        flash(`Added to "${updated.title}"`);
        await modifyProject(updated, { focusTab: "team" });
        return updated;
      } catch (e) {
        flash((e as Error).message || "Could not add to project");
        return null;
      } finally {
        setSavingProject(false);
      }
    },
    [spec, brief, projects, currentSnapshot, modifyProject, flash],
  );

  const addRoleFromBrief = useCallback(
    async (roleBrief: string, targetProject?: Project): Promise<boolean> => {
      const text = roleBrief.trim();
      if (text.length < 4) return false;
      setAddingRole(true);
      try {
        const it = await api.interpret(text);
        const baseSpec = targetProject ? targetProject.spec : spec;
        if (!baseSpec) return false;

        let rNum = nextRoleIndex(baseSpec.roles);
        const newRoles: RoleSpec[] = it.spec.roles.map((r) => {
          const newId = `r${rNum++}`;
          return {
            ...r,
            id: newId,
            requirements: r.requirements.map((q, qi) => ({ ...q, id: `${newId}q${qi + 1}` })),
          };
        });
        let tnNum = nextNeedIndex(baseSpec.team_needs ?? []);
        const newNeeds: TeamNeed[] = (it.spec.team_needs ?? []).map((tn) => ({ ...tn, id: `tn${tnNum++}` }));

        const mergedSpec: BriefSpec = {
          ...baseSpec,
          roles: [...baseSpec.roles, ...newRoles],
          team_needs: [...(baseSpec.team_needs ?? []), ...newNeeds],
        };

        if (targetProject) {
          const mergedBrief = targetProject.brief ? `${targetProject.brief}\n\n+ ${text}` : text;
          const updated = await api.projects.update(targetProject.id, {
            brief: mergedBrief,
            spec: mergedSpec,
          });
          setProjects((prev) => [updated, ...prev.filter((p) => p.id !== updated.id)]);
          flash(`Added ${newRoles.map((r) => r.title).join(", ")}`);
          await modifyProject(updated, { focusTab: "team" });
          return true;
        }

        // Preserve currently displayed members as locks so existing team stays steady
        const nextLocks: Record<string, string> = { ...locks };
        if (result?.multi && activeTeamOption) {
          for (const m of activeTeamOption.members) {
            if (m.candidate) nextLocks[m.slot_id] = m.candidate.employee_id;
          }
        }
        setSpec(mergedSpec);
        setLocks(nextLocks);
        setDirty(true);
        await runSearch(mergedSpec, false, { locks: nextLocks, focusTab: "team" });
        flash(`Added ${newRoles.map((r) => r.title).join(", ")}`);
        return true;
      } catch (e) {
        flash((e as Error).message || "Could not interpret new role");
        return false;
      } finally {
        setAddingRole(false);
      }
    },
    [spec, locks, result, activeTeamOption, modifyProject, runSearch, flash],
  );

  const loadReview = useCallback(() => {
    if (!result?.multi || review !== undefined) return;
    setReview("loading");
    const opt = activeTeamOption;
    const team = opt
      ? opt.members.map((m) =>
          m.candidate
            ? {
                role: m.slot_label,
                team_role: m.team_role,
                mentor: m.mentor?.name,
                person: {
                  name: m.candidate.name,
                  role: m.candidate.role,
                  seniority: m.candidate.seniority,
                  availability: m.candidate.availability,
                  fit: m.candidate.fit,
                  covered: m.candidate.requirements.filter((q) => q.importance === "must" && q.status === "covered").map((q) => q.label),
                  gaps: m.candidate.requirements.filter((q) => q.importance === "must" && q.status !== "covered" && q.status !== "unknown").map((q) => q.label),
                },
              }
            : { role: m.slot_label },
        )
      : result.roles.flatMap((r) => {
          const prop = r.candidates.filter((c) => c.proposed);
          if (!prop.length) return [{ role: r.title }];
          return prop.map((c) => ({
            role: r.title,
            person: {
              name: c.name,
              role: c.role,
              seniority: c.seniority,
              availability: c.availability,
              fit: c.fit,
              covered: c.requirements.filter((q) => q.importance === "must" && q.status === "covered").map((q) => q.label),
              gaps: c.requirements.filter((q) => q.importance === "must" && q.status !== "covered" && q.status !== "unknown").map((q) => q.label),
            },
          }));
        });
    api.teamReview(team).then(setReview).catch(() => setReview({ ok: false, error: "The AI service did not answer." }));
  }, [result, review, activeTeamOption]);

  const originalRole = useCallback((roleId: string) => interp?.spec.roles.find((r) => r.id === roleId), [interp]);

  return {
    meta,
    view,
    brief,
    setBrief,
    phase,
    error,
    interp,
    spec,
    result,
    refreshing,
    tab,
    setTab,
    review,
    teamOption,
    setTeamOption,
    activeTeamOption,
    teamShape,
    updateTeamShape,
    resetTeamShape,
    locks,
    toggleLock,
    swapMember,
    assignCandidate,
    unassignSlot,
    clearLocks,
    editTeamNeed,
    roleById,
    submit,
    editRole,
    setRoleCount,
    removeRole,
    resetRole,
    originalRole,
    explain: explainById,
    explainForRole,
    explanation,
    explanationForRole,
    candidate,
    candidateForRole,
    loadReview,
    goHome,
    goResults,
    startNewSearch,
    // Projects & Teams
    projects,
    projectsLoading,
    activeProject,
    activeProjectId,
    dirty,
    savingProject,
    addingRole,
    toast,
    currentSnapshot,
    goProjects,
    openProject,
    modifyProject,
    saveAsNewProject,
    saveCurrentProject,
    updateProjectMeta,
    deleteProject,
    addCurrentSearchToProject,
    addRoleFromBrief,
  };
}

export type Matcher = ReturnType<typeof useMatcher>;
