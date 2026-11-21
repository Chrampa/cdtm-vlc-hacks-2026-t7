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
  RoleSpec,
  SearchResponse,
  TeamNeed,
  TeamOption,
  TeamOptionId,
  TeamReview,
  TeamShape,
} from "../types";

export type Phase = "idle" | "interpreting" | "searching" | "ready" | "error";
export type View = "home" | "results" | "projects";

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

function parseHash(): { view: View | "project"; projectId: string | null } {
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
  const [view, setView] = useState<View>(initial.view === "projects" ? "projects" : "home");
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
  // Changes every time a new search or project is opened (UI resets its local state on it).
  const [session, setSession] = useState(0);

  // Saved projects state (every search is saved automatically as a draft)
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [savingProject, setSavingProject] = useState(false);
  const [addingRole, setAddingRole] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const searchAbort = useRef<AbortController | null>(null);
  const runId = useRef(0);
  const sessionRef = useRef(0);
  const createdForSession = useRef(-1);
  const pendingOpen = useRef<string | null>(initial.view === "project" ? initial.projectId : null);
  const toastTimer = useRef<number | null>(null);

  // Revision counters: dirty = there are changes the server has not stored yet.
  const revRef = useRef(0);
  const savedRevRef = useRef(0);
  const [revTick, setRevTick] = useState(0);
  const markDirty = useCallback(() => {
    revRef.current += 1;
    setRevTick((t) => t + 1);
  }, []);
  const markClean = useCallback((at?: number) => {
    savedRevRef.current = at ?? revRef.current;
    setRevTick((t) => t + 1);
  }, []);
  const dirty = revRef.current !== savedRevRef.current;

  const newSession = useCallback(() => {
    sessionRef.current += 1;
    setSession(sessionRef.current);
    revRef.current = 0;
    savedRevRef.current = 0;
    setRevTick((t) => t + 1);
  }, []);

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

  const candidate = useCallback(
    async (roleId: string, employeeId: string): Promise<Candidate | null> => {
      const r = roleById[roleId];
      if (!r) return null;
      try {
        return await api.candidate(r, employeeId);
      } catch {
        return null;
      }
    },
    [roleById],
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
      newSession();
      setActiveProjectId(null);
      setView("results");
      if (location.hash !== "#results") history.pushState(null, "", location.pathname + "#results");
      setPhase("interpreting");
      setError(null);
      setResult(null);
      setSpec(null);
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
    [brief, runSearch, newSession],
  );

  const editRole = useCallback(
    (role: RoleSpec) => {
      if (!spec) return;
      const next = { ...spec, roles: spec.roles.map((r) => (r.id === role.id ? role : r)) };
      setSpec(next);
      markDirty();
      runSearch(next, false);
    },
    [spec, runSearch, markDirty],
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
      markDirty();
      runSearch(nextSpec, false, { locks: nextLocks });
    },
    [spec, locks, runSearch, markDirty],
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
      markDirty();
      const nextMulti = nextRoles.length > 1 || nextRoles.some((r) => r.count > 1);
      const focusTab = tab === roleId ? (nextMulti ? "team" : nextRoles[0].id) : undefined;
      runSearch(nextSpec, false, { locks: nextLocks, focusTab });
    },
    [spec, locks, tab, runSearch, markDirty],
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
      markDirty();
      runSearch(next, false);
    },
    [spec, runSearch, markDirty],
  );

  const setTeamOption = useCallback(
    (opt: TeamOptionId) => {
      setTeamOptionState(opt);
      setReview(undefined);
      markDirty();
    },
    [markDirty],
  );

  const updateTeamShape = useCallback(
    (shape: TeamShape) => {
      setTeamShape(shape);
      markDirty();
      if (spec) runSearch(spec, false, { shape });
    },
    [spec, runSearch, markDirty],
  );

  const resetTeamShape = useCallback(() => {
    setTeamShape(null);
    markDirty();
    if (spec) runSearch(spec, false, { shape: null });
  }, [spec, runSearch, markDirty]);

  /** Put a person in a seat. The choice is kept (pinned) when the rest of the team is re-balanced. */
  const assignCandidate = useCallback(
    (slotId: string, employeeId: string) => {
      if (!spec) return;
      const next: Record<string, string> = {};
      for (const [k, v] of Object.entries(locks)) {
        if (v !== employeeId) next[k] = v;
      }
      next[slotId] = employeeId;
      setLocks(next);
      markDirty();
      if (result?.multi) runSearch(spec, false, { locks: next });
    },
    [spec, locks, result, runSearch, markDirty],
  );

  const unassignSlot = useCallback(
    (slotId: string) => {
      if (!spec || !(slotId in locks)) return;
      const next = { ...locks };
      delete next[slotId];
      setLocks(next);
      markDirty();
      if (result?.multi) runSearch(spec, false, { locks: next });
    },
    [spec, locks, result, runSearch, markDirty],
  );

  /** Legacy pin toggle (kept for the unrouted /map design). */
  const toggleLock = useCallback(
    (slotId: string, employeeId: string) => (locks[slotId] === employeeId ? unassignSlot(slotId) : assignCandidate(slotId, employeeId)),
    [locks, unassignSlot, assignCandidate],
  );

  const clearLocks = useCallback(() => {
    if (!spec || Object.keys(locks).length === 0) return;
    setLocks({});
    markDirty();
    runSearch(spec, false, { locks: {} });
  }, [spec, locks, runSearch, markDirty]);

  // --------------------------------------------------- project actions
  const currentSnapshot = useCallback(
    (fallbackSingle = false) =>
      buildSnapshot(spec, result, activeTeamOption, locks, fallbackSingle, activeProject?.members ?? []),
    [spec, result, activeTeamOption, locks, activeProject],
  );

  const goHome = useCallback(() => {
    setView("home");
    if (location.hash) history.pushState(null, "", location.pathname);
  }, []);

  const goResults = useCallback(() => {
    if (!spec && phase !== "interpreting" && phase !== "searching") return;
    setView("results");
    const target = activeProjectId ? `#project/${encodeURIComponent(activeProjectId)}` : "#results";
    if (location.hash !== target) history.pushState(null, "", location.pathname + target);
  }, [spec, phase, activeProjectId]);

  const startNewSearch = useCallback(() => {
    ++runId.current;
    searchAbort.current?.abort();
    newSession();
    setActiveProjectId(null);
    setBrief("");
    setSpec(null);
    setResult(null);
    setPhase("idle");
    setView("home");
    if (location.hash) history.pushState(null, "", location.pathname);
  }, [newSession]);

  const goProjects = useCallback(() => {
    setView("projects");
    if (location.hash !== "#projects") history.pushState(null, "", location.pathname + "#projects");
    refreshProjects();
  }, [refreshProjects]);

  /** Open a saved project straight into its live team screen. */
  const modifyProject = useCallback(
    async (project: Project, opts?: { focusTab?: string; push?: boolean }) => {
      ++runId.current;
      newSession();
      setActiveProjectId(project.id);
      setBrief(project.brief);
      setSpec(project.spec);
      setInterp(null);
      setTeamShape(project.team_shape);
      setTeamOptionState(project.team_option || "best_fit");
      setError(null);
      setResult(null);

      const nextLocks: Record<string, string> = { ...project.locks };
      for (const mem of project.members) nextLocks[mem.slot_id] = mem.employee_id;
      setLocks(nextLocks);
      setView("results");
      const target = `#project/${encodeURIComponent(project.id)}`;
      if (location.hash !== target) {
        if (opts?.push === false) history.replaceState(null, "", location.pathname + target);
        else history.pushState(null, "", location.pathname + target);
      }
      setPhase("searching");

      await runSearch(project.spec, true, {
        shape: project.team_shape,
        locks: nextLocks,
        option: project.team_option || "best_fit",
        focusTab: opts?.focusTab,
      });
    },
    [runSearch, newSession],
  );

  const openProject = useCallback(
    (projectId: string) => {
      const p = projects.find((x) => x.id === projectId);
      if (p) {
        if (p.id === activeProjectId && spec) goResults();
        else modifyProject(p);
      } else {
        pendingOpen.current = projectId;
        refreshProjects();
      }
    },
    [projects, activeProjectId, spec, goResults, modifyProject, refreshProjects],
  );

  // Deep link (#project/<id>) once the project list has loaded.
  useEffect(() => {
    if (projectsLoading || !pendingOpen.current) return;
    const id = pendingOpen.current;
    pendingOpen.current = null;
    const p = projects.find((x) => x.id === id);
    if (p) modifyProject(p, { push: false });
    else {
      flash("That project no longer exists");
      setView("home");
      history.replaceState(null, "", location.pathname);
    }
  }, [projectsLoading, projects, modifyProject, flash]);

  useEffect(() => {
    const onPop = () => {
      const parsed = parseHash();
      if (parsed.view === "project" && parsed.projectId) {
        if (parsed.projectId === activeProjectId && spec) setView("results");
        else {
          const p = projects.find((x) => x.id === parsed.projectId);
          if (p) modifyProject(p, { push: false });
          else setView("home");
        }
      } else if (parsed.view === "results") {
        setView(spec ? "results" : "home");
      } else {
        setView(parsed.view === "projects" ? "projects" : "home");
      }
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [activeProjectId, spec, projects, modifyProject]);

  // Every finished search becomes a draft project automatically — nobody has to remember to save.
  useEffect(() => {
    if (phase !== "ready" || !spec || !result || activeProjectId || refreshing) return;
    if (createdForSession.current === sessionRef.current) return;
    createdForSession.current = sessionRef.current;
    const mySession = sessionRef.current;
    const at = revRef.current;
    const snap = buildSnapshot(spec, result, activeTeamOption, locks, false, []);
    setSavingProject(true);
    api.projects
      .create({
        title: spec.title,
        client: "",
        status: "draft",
        notes: "",
        brief,
        spec,
        team_shape: teamShape,
        team_option: teamOption,
        locks: snap.locks,
        members: snap.members,
        stats: snap.stats,
      })
      .then((created) => {
        setProjects((prev) => [created, ...prev.filter((p) => p.id !== created.id)]);
        if (mySession !== sessionRef.current) return;
        setActiveProjectId(created.id);
        markClean(at);
        if (location.hash === "#results") {
          history.replaceState(null, "", `${location.pathname}#project/${encodeURIComponent(created.id)}`);
        }
      })
      .catch((e) => flash((e as Error).message || "Could not save this search"))
      .finally(() => setSavingProject(false));
  }, [phase, spec, result, activeProjectId, refreshing, activeTeamOption, locks, brief, teamShape, teamOption, markClean, flash]);

  const saveCurrentProject = useCallback(
    async (opts?: { status?: ProjectStatus; message?: string }): Promise<Project | null> => {
      if (!activeProjectId || !spec) return null;
      const at = revRef.current;
      setSavingProject(true);
      try {
        const snap = currentSnapshot(false);
        // A confirmed team that is changed again goes back to draft until it is confirmed again.
        const status = opts?.status ?? (activeProject?.status === "staffed" ? "draft" : undefined);
        const updated = await api.projects.update(activeProjectId, {
          ...(status ? { status } : {}),
          brief,
          spec,
          team_shape: teamShape,
          team_option: teamOption,
          locks: snap.locks,
          members: snap.members,
          stats: snap.stats,
        });
        setProjects((prev) => [updated, ...prev.filter((p) => p.id !== updated.id)]);
        markClean(at);
        if (opts?.message) flash(opts.message);
        return updated;
      } catch (e) {
        flash((e as Error).message || "Could not save changes");
        return null;
      } finally {
        setSavingProject(false);
      }
    },
    [activeProjectId, activeProject, spec, brief, teamShape, teamOption, currentSnapshot, markClean, flash],
  );

  // Autosave edits to the open project shortly after they settle.
  const saveRef = useRef(saveCurrentProject);
  saveRef.current = saveCurrentProject;
  useEffect(() => {
    if (!activeProjectId || !dirty || phase !== "ready" || refreshing) return;
    const t = window.setTimeout(() => saveRef.current(), 600);
    return () => window.clearTimeout(t);
  }, [activeProjectId, dirty, revTick, phase, refreshing]);

  const confirmTeam = useCallback(
    () => saveCurrentProject({ status: "staffed", message: result?.multi ? "Team confirmed" : "Choice confirmed" }),
    [saveCurrentProject, result],
  );

  const renameProject = useCallback(
    async (title: string) => {
      const t = title.trim();
      if (!t || !activeProjectId || !spec) return;
      const nextSpec = { ...spec, title: t };
      setSpec(nextSpec);
      try {
        const updated = await api.projects.update(activeProjectId, { title: t, spec: nextSpec });
        setProjects((prev) => [updated, ...prev.filter((p) => p.id !== updated.id)]);
      } catch (e) {
        flash((e as Error).message || "Could not rename");
      }
    },
    [activeProjectId, spec, flash],
  );

  const deleteProject = useCallback(
    async (projectId: string) => {
      try {
        await api.projects.delete(projectId);
        setProjects((prev) => prev.filter((p) => p.id !== projectId));
        if (activeProjectId === projectId) {
          if (view === "results") startNewSearch();
          else setActiveProjectId(null);
        }
        flash("Project deleted");
      } catch (e) {
        flash((e as Error).message || "Could not delete project");
      }
    },
    [activeProjectId, view, startNewSearch, flash],
  );

  const addRoleFromBrief = useCallback(
    async (roleBrief: string): Promise<boolean> => {
      const text = roleBrief.trim();
      if (text.length < 4 || !spec) return false;
      setAddingRole(true);
      try {
        const it = await api.interpret(text);
        let rNum = nextRoleIndex(spec.roles);
        const newRoles: RoleSpec[] = it.spec.roles.map((r) => {
          const newId = `r${rNum++}`;
          return { ...r, id: newId, requirements: r.requirements.map((q, qi) => ({ ...q, id: `${newId}q${qi + 1}` })) };
        });
        let tnNum = nextNeedIndex(spec.team_needs ?? []);
        const newNeeds: TeamNeed[] = (it.spec.team_needs ?? []).map((tn) => ({ ...tn, id: `tn${tnNum++}` }));
        const mergedSpec: BriefSpec = {
          ...spec,
          roles: [...spec.roles, ...newRoles],
          team_needs: [...(spec.team_needs ?? []), ...newNeeds],
        };
        // Keep the people already chosen so the existing team stays steady.
        const nextLocks: Record<string, string> = { ...locks };
        if (result?.multi && activeTeamOption) {
          for (const mm of activeTeamOption.members) if (mm.candidate) nextLocks[mm.slot_id] = mm.candidate.employee_id;
        } else if (result && !result.multi && spec.roles[0]) {
          const sid = `${spec.roles[0].id}#0`;
          if (!nextLocks[sid] && result.roles[0]?.candidates[0]) nextLocks[sid] = result.roles[0].candidates[0].employee_id;
        }
        setSpec(mergedSpec);
        setLocks(nextLocks);
        setBrief((b) => (b ? `${b}\n\n+ ${text}` : text));
        markDirty();
        await runSearch(mergedSpec, false, { locks: nextLocks, focusTab: "team" });
        flash(`Added ${newRoles.map((r) => r.title).join(", ")}`);
        return true;
      } catch (e) {
        flash((e as Error).message || "Could not understand the new role");
        return false;
      } finally {
        setAddingRole(false);
      }
    },
    [spec, locks, result, activeTeamOption, runSearch, markDirty, flash],
  );

  const loadReview = useCallback(() => {
    if (!result?.multi || review !== undefined) return;
    setReview("loading");
    const opt = activeTeamOption;
    const team = (opt?.members ?? []).map((mm) =>
      mm.candidate
        ? {
            role: mm.slot_label,
            team_role: mm.team_role,
            mentor: mm.mentor?.name,
            person: {
              name: mm.candidate.name,
              role: mm.candidate.role,
              seniority: mm.candidate.seniority,
              availability: mm.candidate.availability,
              fit: mm.candidate.fit,
              covered: mm.candidate.requirements.filter((q) => q.importance === "must" && q.status === "covered").map((q) => q.label),
              gaps: mm.candidate.requirements
                .filter((q) => q.importance === "must" && q.status !== "covered" && q.status !== "unknown")
                .map((q) => q.label),
            },
          }
        : { role: mm.slot_label },
    );
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
    session,
    teamOption,
    setTeamOption,
    activeTeamOption,
    teamShape,
    updateTeamShape,
    resetTeamShape,
    locks,
    assignCandidate,
    swapMember: assignCandidate,
    toggleLock,
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
    explanation,
    candidate,
    loadReview,
    goHome,
    goResults,
    startNewSearch,
    // Projects (saved automatically)
    projects,
    projectsLoading,
    activeProject,
    activeProjectId,
    dirty,
    savingProject,
    addingRole,
    toast,
    goProjects,
    openProject,
    confirmTeam,
    renameProject,
    deleteProject,
    addRoleFromBrief,
  };
}

export type Matcher = ReturnType<typeof useMatcher>;
