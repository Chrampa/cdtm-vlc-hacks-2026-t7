import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "../api";
import type { BriefSpec, Candidate, Explanation, InterpretResponse, Meta, RoleSpec, SearchResponse, TeamReview } from "../types";

export type Phase = "idle" | "interpreting" | "searching" | "ready" | "error";

function hash(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}
const roleKey = (r: RoleSpec) => hash(JSON.stringify(r));

/** All app state and actions, shared by every design. */
export function useMatcher() {
  const [meta, setMeta] = useState<Meta | null>(null);
  const [view, setView] = useState<"home" | "results">("home");
  const [brief, setBrief] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [interp, setInterp] = useState<InterpretResponse | null>(null);
  const [spec, setSpec] = useState<BriefSpec | null>(null);
  const [result, setResult] = useState<SearchResponse | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<string>("team");
  const [explanations, setExplanations] = useState<Record<string, Explanation | "loading">>({});
  const [review, setReview] = useState<TeamReview | "loading" | undefined>(undefined);
  const searchAbort = useRef<AbortController | null>(null);
  const runId = useRef(0);

  useEffect(() => { api.meta().then(setMeta).catch(() => setMeta(null)); }, []);
  useEffect(() => {
    const onPop = () => { if (location.hash !== "#results") setView("home"); else if (result) setView("results"); };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [result]);

  const roleById = useMemo(() => Object.fromEntries((spec?.roles ?? []).map((r) => [r.id, r])), [spec]);

  const explain = useCallback((role: RoleSpec, employeeId: string) => {
    const key = `${roleKey(role)}|${employeeId}`;
    setExplanations((prev) => {
      if (prev[key]) return prev;
      api.explain(role, employeeId)
        .then((e) => setExplanations((p) => ({ ...p, [key]: e })))
        .catch(() => setExplanations((p) => ({ ...p, [key]: { ok: false, error: "The AI service did not answer. The evidence is still complete." } })));
      return { ...prev, [key]: "loading" };
    });
  }, []);
  const explainById = useCallback((roleId: string, employeeId: string) => {
    const r = roleById[roleId];
    if (r) explain(r, employeeId);
  }, [roleById, explain]);
  const explanation = useCallback((roleId: string, employeeId: string) => {
    const r = roleById[roleId];
    return r ? explanations[`${roleKey(r)}|${employeeId}`] : undefined;
  }, [roleById, explanations]);

  const runSearch = useCallback(async (s: BriefSpec, first: boolean) => {
    searchAbort.current?.abort();
    const ctrl = new AbortController();
    searchAbort.current = ctrl;
    if (!first) setRefreshing(true);
    try {
      const res = await api.search(s, ctrl.signal);
      setResult(res);
      setReview(undefined);
      if (first) setTab(res.multi ? "team" : res.roles[0]?.id ?? "team");
      setPhase("ready");
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      setError((e as Error).message);
      setPhase(first ? "error" : "ready");
    } finally {
      if (searchAbort.current === ctrl) setRefreshing(false);
    }
  }, []);

  const submit = useCallback(async (text?: string) => {
    const b = (text ?? brief).trim();
    if (b.length < 10) return;
    if (text !== undefined) setBrief(text);
    const id = ++runId.current;
    setView("results");
    if (location.hash !== "#results") history.pushState(null, "", location.pathname + "#results");
    setPhase("interpreting");
    setError(null);
    setResult(null);
    try {
      const it = await api.interpret(b);
      if (id !== runId.current) return;
      setInterp(it);
      setSpec(it.spec);
      setPhase("searching");
      await runSearch(it.spec, true);
    } catch (e) {
      if (id !== runId.current) return;
      setError((e as Error).message || "Something went wrong");
      setPhase("error");
    }
  }, [brief, runSearch]);

  const editRole = useCallback((role: RoleSpec) => {
    if (!spec) return;
    const next = { ...spec, roles: spec.roles.map((r) => (r.id === role.id ? role : r)) };
    setSpec(next);
    runSearch(next, false);
  }, [spec, runSearch]);

  const resetRole = useCallback((roleId: string) => {
    const orig = interp?.spec.roles.find((r) => r.id === roleId);
    if (orig) editRole(orig);
  }, [interp, editRole]);

  const candidate = useCallback(async (roleId: string, employeeId: string): Promise<Candidate | null> => {
    const r = roleById[roleId];
    if (!r) return null;
    try { return await api.candidate(r, employeeId); } catch { return null; }
  }, [roleById]);

  const loadReview = useCallback(() => {
    if (!result?.multi || review !== undefined) return;
    setReview("loading");
    const team = result.roles.flatMap((r) => {
      const prop = r.candidates.filter((c) => c.proposed);
      if (!prop.length) return [{ role: r.title }];
      return prop.map((c) => ({
        role: r.title,
        person: {
          name: c.name, role: c.role, seniority: c.seniority, availability: c.availability, fit: c.fit,
          covered: c.requirements.filter((q) => q.importance === "must" && q.status === "covered").map((q) => q.label),
          gaps: c.requirements.filter((q) => q.importance === "must" && q.status !== "covered" && q.status !== "unknown").map((q) => q.label),
        },
        complement: r.complement && r.complement.for === c.employee_id ? { name: r.complement.person.name, covers: r.complement.covers } : undefined,
      }));
    });
    api.teamReview(team).then(setReview).catch(() => setReview({ ok: false, error: "The AI service did not answer." }));
  }, [result, review]);

  const goHome = useCallback(() => {
    setView("home");
    if (location.hash) history.pushState(null, "", location.pathname);
  }, []);

  const originalRole = useCallback((roleId: string) => interp?.spec.roles.find((r) => r.id === roleId), [interp]);

  return {
    meta, view, brief, setBrief, phase, error, interp, spec, result, refreshing, tab, setTab, review,
    roleById, submit, editRole, resetRole, originalRole, explain: explainById, explanation, candidate, loadReview, goHome,
  };
}

export type Matcher = ReturnType<typeof useMatcher>;
