import { ArrowLeft, Pencil, Search, Users } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "./api";
import { CandidateDrawer } from "./components/CandidateDrawer";
import { CompareModal } from "./components/CompareModal";
import { Home } from "./components/Home";
import { RoleView } from "./components/RoleView";
import { TeamView } from "./components/TeamView";
import { Button, cx, Spinner } from "./components/ui";
import { Understood } from "./components/Understood";
import type { BriefSpec, Candidate, Explanation, InterpretResponse, Meta, RoleSpec, SearchResponse, TeamReview } from "./types";

type Phase = "idle" | "interpreting" | "searching" | "ready" | "error";

function hash(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}
const roleKey = (r: RoleSpec) => hash(JSON.stringify(r));

export default function App() {
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
  const [selected, setSelected] = useState<Record<string, string[]>>({});
  const [drawer, setDrawer] = useState<{ roleId: string; card: Candidate } | null>(null);
  const [compare, setCompare] = useState(false);
  const [explanations, setExplanations] = useState<Record<string, Explanation | "loading">>({});
  const [review, setReview] = useState<TeamReview | "loading" | undefined>(undefined);
  const searchAbort = useRef<AbortController | null>(null);
  const runId = useRef(0);

  useEffect(() => { api.meta().then(setMeta).catch(() => setMeta(null)); }, []);
  useEffect(() => {
    const onPop = () => { if (!location.hash) { setView("home"); setDrawer(null); setCompare(false); } };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const roleById = useMemo(() => Object.fromEntries((spec?.roles ?? []).map((r) => [r.id, r])), [spec]);

  const explainFor = useCallback((role: RoleSpec, employeeId: string) => {
    const key = `${roleKey(role)}|${employeeId}`;
    setExplanations((prev) => {
      if (prev[key]) return prev;
      api.explain(role, employeeId)
        .then((e) => setExplanations((p) => ({ ...p, [key]: e })))
        .catch(() => setExplanations((p) => ({ ...p, [key]: { ok: false, error: "The AI service did not answer. The evidence is still complete." } })));
      return { ...prev, [key]: "loading" };
    });
  }, []);
  const expOf = (roleId: string, employeeId: string) => {
    const r = roleById[roleId];
    return r ? explanations[`${roleKey(r)}|${employeeId}`] : undefined;
  };

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

  const submit = useCallback(async () => {
    const id = ++runId.current;
    setView("results");
    if (location.hash !== "#results") history.pushState(null, "", "#results");
    setPhase("interpreting");
    setError(null);
    setResult(null);
    setSelected({});
    setDrawer(null);
    setCompare(false);
    try {
      const it = await api.interpret(brief);
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

  // Re-rank instantly when the user edits the understood requirements.
  const editRole = (role: RoleSpec) => {
    if (!spec) return;
    const next = { ...spec, roles: spec.roles.map((r) => (r.id === role.id ? role : r)) };
    setSpec(next);
    runSearch(next, false);
  };

  // Prefetch AI summaries for the top 3 of the visible role so the panel opens instantly.
  useEffect(() => {
    if (!result || !spec || tab === "team") return;
    const r = result.roles.find((x) => x.id === tab);
    const rs = roleById[tab];
    if (r && rs) r.candidates.slice(0, 3).forEach((c) => explainFor(rs, c.employee_id));
  }, [result, tab, spec, roleById, explainFor]);

  // AI team review when the team tab is shown.
  useEffect(() => {
    if (!result?.multi || tab !== "team" || review !== undefined) return;
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
  }, [result, tab, review]);

  const openCard = (c: Candidate, roleId: string) => {
    setDrawer({ roleId, card: c });
    const rs = roleById[roleId];
    if (rs) explainFor(rs, c.employee_id);
  };
  const openLite = async (roleId: string, employeeId: string) => {
    const rs = roleById[roleId];
    if (!rs) return;
    try {
      const card = await api.candidate(rs, employeeId);
      openCard(card, roleId);
    } catch { /* ignore */ }
  };

  const activeRole = result?.roles.find((r) => r.id === tab);
  const sel = selected[tab] ?? [];
  const toggle = (id: string) => setSelected((p) => {
    const cur = p[tab] ?? [];
    return { ...p, [tab]: cur.includes(id) ? cur.filter((x) => x !== id) : cur.length >= 4 ? cur : [...cur, id] };
  });
  const comparePeople = activeRole ? sel.map((id) => activeRole.candidates.find((c) => c.employee_id === id)).filter(Boolean) as Candidate[] : [];
  const openCompare = () => {
    setCompare(true);
    const rs = roleById[tab];
    if (rs) comparePeople.forEach((c) => explainFor(rs, c.employee_id));
  };
  const goHome = () => { setView("home"); if (location.hash) history.pushState(null, "", location.pathname); };

  return (
    <div className="min-h-full">
      <header className="sticky top-0 z-30 border-b border-line bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <button onClick={goHome} className="flex items-center gap-2">
            <span className="grid size-7 place-items-center rounded-lg bg-accent text-white"><Users size={15} /></span>
            <span className="font-semibold tracking-tight">Insider</span>
            <span className="hidden text-sm text-faint sm:inline">Talent Matcher</span>
          </button>
          {view === "results" && <Button kind="subtle" onClick={goHome}><Search size={15} /> New search</Button>}
        </div>
      </header>

      {view === "home" && <Home meta={meta} brief={brief} setBrief={setBrief} onSubmit={submit} error={phase === "error" ? error : null} />}

      {view === "results" && (
        <main className="mx-auto max-w-5xl px-4 pb-28 pt-6">
          {(phase === "interpreting" || phase === "searching") && <Loading phase={phase} brief={brief} />}
          {phase === "error" && (
            <div className="mx-auto max-w-xl rounded-xl border border-line bg-white p-6 text-center">
              <p className="text-bad">{error}</p>
              <div className="mt-4 flex justify-center gap-2"><Button kind="subtle" onClick={goHome}><ArrowLeft size={15} /> Back</Button><Button onClick={submit}>Try again</Button></div>
            </div>
          )}
          {phase === "ready" && spec && result && (
            <div className="fade-in">
              <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h1 className="text-xl font-semibold tracking-tight">{spec.title}</h1>
                  {spec.summary && <p className="mt-0.5 text-sm text-muted">{spec.summary}</p>}
                </div>
                <div className="flex items-center gap-2">
                  {refreshing && <Spinner className="text-accent" />}
                  <Button kind="ghost" onClick={goHome}><Pencil size={14} /> Edit brief</Button>
                </div>
              </div>

              {(result.multi || result.roles.length > 1) && (
                <nav className="mb-4 flex gap-1 overflow-x-auto border-b border-line">
                  <Tab active={tab === "team"} onClick={() => setTab("team")}><Users size={14} /> Team</Tab>
                  {result.roles.map((r) => (
                    <Tab key={r.id} active={tab === r.id} onClick={() => setTab(r.id)}>
                      {r.title}{r.count > 1 ? ` ×${r.count}` : ""}
                    </Tab>
                  ))}
                </nav>
              )}

              {tab === "team" && result.multi && (
                <TeamView result={result} review={review} onOpen={(c, rid) => openCard(c, rid)} onRole={setTab} />
              )}

              {activeRole && roleById[activeRole.id] && (
                <div className="space-y-4">
                  <div>
                    <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-faint">What we understood{interp && !interp.ai_used ? " (basic mode)" : ""}</div>
                    <Understood
                      role={roleById[activeRole.id]}
                      original={interp?.spec.roles.find((r) => r.id === activeRole.id)}
                      onChange={editRole}
                      warnings={interp?.warnings ?? []}
                    />
                  </div>
                  <RoleView
                    role={activeRole}
                    multi={result.multi}
                    selected={sel}
                    toggle={toggle}
                    open={(c) => openCard(c, activeRole.id)}
                    onOpenLite={(eid) => openLite(activeRole.id, eid)}
                  />
                </div>
              )}
            </div>
          )}
        </main>
      )}

      {view === "results" && activeRole && sel.length > 0 && (
        <div className="fixed inset-x-0 bottom-4 z-30 flex justify-center px-4">
          <div className="fade-in flex items-center gap-3 rounded-full border border-line bg-white py-2 pl-4 pr-2 shadow-lg">
            <span className="text-sm text-muted">{sel.length} selected{sel.length < 2 ? " · pick one more to compare" : ""}</span>
            <Button kind="ghost" onClick={() => setSelected((p) => ({ ...p, [tab]: [] }))}>Clear</Button>
            <Button onClick={openCompare} disabled={sel.length < 2} className="rounded-full">Compare</Button>
          </div>
        </div>
      )}

      {compare && activeRole && comparePeople.length >= 2 && (
        <CompareModal
          people={comparePeople}
          roleTitle={activeRole.title}
          explanations={Object.fromEntries(comparePeople.map((c) => [c.employee_id, expOf(activeRole.id, c.employee_id)]).filter(([, v]) => v)) as Record<string, Explanation | "loading">}
          onClose={() => setCompare(false)}
          onOpen={(c) => { setCompare(false); openCard(c, activeRole.id); }}
        />
      )}

      {drawer && (
        <CandidateDrawer
          c={drawer.card}
          roleTitle={roleById[drawer.roleId]?.title ?? ""}
          exp={expOf(drawer.roleId, drawer.card.employee_id)}
          onClose={() => setDrawer(null)}
        />
      )}
    </div>
  );
}

function Tab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cx(
        "-mb-px inline-flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition-colors",
        active ? "border-accent text-ink" : "border-transparent text-muted hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}

function Loading({ phase, brief }: { phase: Phase; brief: string }) {
  const steps = [
    { key: "interpreting", label: "Reading the brief", sub: "AI turns it into must-haves, nice-to-haves and hard filters" },
    { key: "searching", label: "Searching everyone", sub: "Filters and scores the whole workforce by meaning, not keywords" },
  ];
  const idx = steps.findIndex((s) => s.key === phase);
  return (
    <div className="mx-auto max-w-xl py-10">
      <p className="mb-6 line-clamp-3 rounded-xl border border-line bg-white px-4 py-3 text-sm text-muted">{brief}</p>
      <ol className="space-y-4">
        {steps.map((s, i) => (
          <li key={s.key} className={cx("flex gap-3", i > idx && "opacity-40")}>
            <span className="mt-0.5 grid size-5 place-items-center">{i < idx ? <span className="size-2 rounded-full bg-good" /> : i === idx ? <Spinner className="text-accent" /> : <span className="size-2 rounded-full bg-faint" />}</span>
            <div><div className="font-medium">{s.label}</div><div className="text-sm text-muted">{s.sub}</div></div>
          </li>
        ))}
      </ol>
    </div>
  );
}
