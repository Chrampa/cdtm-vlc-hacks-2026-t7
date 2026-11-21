import {
  AlertCircle,
  ArrowLeft,
  ArrowLeftRight,
  ArrowRight,
  BookmarkPlus,
  Briefcase,
  CalendarClock,
  Check,
  CheckCircle2,
  CircleAlert,
  Clock,
  Copy,
  FolderKanban,
  FolderPlus,
  Globe,
  Lock,
  MapPin,
  Menu,
  Minus,
  Plus,
  RotateCcw,
  Save,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  Unlock,
  UserCheck,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { avatarColors, first, fmt, hiddenReasons, initials, teamLabel, whyLine } from "../../core/helpers";
import type { Matcher } from "../../core/useMatcher";
import type { Availability, Candidate, Requirement, RoleResult, RoleSpec, SeniorityMode, TeamMember, TeamOption, TeamShape } from "../../types";
import { Compare } from "./Compare";
import { Profile } from "./Profile";
import {
  AddToProjectModal,
  HomeProjectsStrip,
  ProjectDetail,
  ProjectsList,
  SaveProjectModal,
  StatusBadge,
} from "./Projects";
import { Sidebar } from "./Sidebar";

const ink2 = { color: "var(--v-ink2)" };
const line = { borderColor: "var(--v-line)" };

export function Avatar({ c, size = 52 }: { c: { name: string; employee_id: string }; size?: number }) {
  const { bg, fg } = avatarColors(c.employee_id);
  return (
    <span className="grid shrink-0 place-items-center rounded-full font-bold" style={{ width: size, height: size, background: bg, color: fg, fontSize: size * 0.36 }}>
      {initials(c.name)}
    </span>
  );
}

export function Availability({ code, short }: { code: number; short?: boolean }) {
  const color = code === 0 ? "var(--v-good)" : code === 1 ? "var(--v-warn)" : "var(--v-ink2)";
  const text = code === 0 ? "Available now" : code === 1 ? (short ? "Free < 3 months" : "Free in less than 3 months") : "On a project";
  return <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold" style={{ color }}><CalendarClock size={15} /> {text}</span>;
}

export function Segments({ c, compact }: { c: Candidate; compact?: boolean }) {
  const must = c.requirements.filter((r) => r.importance === "must" && r.status !== "unknown");
  return (
    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 sm:gap-x-3">
      <div className="flex flex-wrap gap-1">
        {must.map((r) => (
          <span key={r.id} title={`${r.label}: ${r.status === "covered" ? "shown" : r.status === "partial" ? "partly shown" : "not shown"}`} className={`h-2 rounded-full ${compact ? "w-4 sm:w-5" : "w-5 sm:w-8"}`} style={{
            background: r.status === "covered" ? "var(--v-accent)" : r.status === "partial" ? "linear-gradient(90deg,var(--v-warn) 50%,var(--v-line) 50%)" : "var(--v-line)",
          }} />
        ))}
      </div>
      {!compact && <span className="text-[12px] font-medium sm:text-[13px]" style={ink2}>{c.must_covered} of {c.must_total} must-haves</span>}
    </div>
  );
}

export function Pill({ children, onClick, active, title }: { children: ReactNode; onClick?: () => void; active?: boolean; title?: string }) {
  return (
    <button onClick={onClick} title={title} className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 py-2 text-[13px] font-semibold transition-colors sm:px-4 sm:text-[14px]"
      style={active ? { background: "var(--v-accent)", color: "#fff", borderColor: "var(--v-accent)" } : { ...line, background: "#fff", color: "var(--v-accent)" }}>
      {children}
    </button>
  );
}

function Spinner() {
  return <span className="inline-block size-4 animate-spin rounded-full border-2 border-current border-r-transparent" />;
}

// ------------------------------------------------------------------ shell
export default function PeopleApp({ m }: { m: Matcher }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="v-people v-frame flex min-h-dvh flex-col lg:flex-row">
      <Sidebar
        m={m}
        mobileOpen={mobileNavOpen}
        onCloseMobile={() => setMobileNavOpen(false)}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((v) => !v)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Lightweight mobile-only drawer trigger (no top header bar on desktop) */}
        <div className="sticky top-0 z-30 flex items-center justify-between px-4 pb-1 pt-[max(0.75rem,env(safe-area-inset-top))] pointer-events-none lg:hidden">
          <button
            onClick={() => setMobileNavOpen(true)}
            aria-label="Open menu"
            className="pointer-events-auto inline-flex min-h-[38px] items-center gap-2 rounded-full border bg-white/95 px-3.5 py-1.5 text-[13px] font-semibold shadow-[0_4px_16px_rgba(31,35,40,.08)] backdrop-blur"
            style={{ ...line, color: "var(--v-ink)" }}
          >
            <Menu size={16} />
            <span
              className="grid size-5 place-items-center rounded-md text-[11px] font-extrabold text-white"
              style={{ background: "linear-gradient(135deg, #0072BC 0%, #003B6F 100%)" }}
            >
              T
            </span>
            <span>Talentic</span>
            {m.projects.length > 0 && (
              <span
                className="rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none"
                style={{ background: "var(--v-accent-soft)", color: "var(--v-accent)" }}
              >
                {m.projects.length}
              </span>
            )}
          </button>

          {m.view !== "home" && (
            <button
              onClick={m.startNewSearch}
              aria-label="New search"
              className="pointer-events-auto inline-flex min-h-[38px] items-center gap-1 rounded-full px-3.5 py-1.5 text-[13px] font-semibold text-white shadow-[0_4px_16px_rgba(0,114,188,.26)]"
              style={{ background: "var(--v-accent)" }}
            >
              <Plus size={15} />
              <span>New</span>
            </button>
          )}
        </div>

        <div className="min-w-0 flex-1">
          {m.view === "home" && <Home m={m} />}
          {m.view === "results" && <Results m={m} />}
          {m.view === "projects" && <ProjectsList m={m} />}
          {m.view === "project" && <ProjectDetail m={m} />}
        </div>
      </div>

      {m.toast && (
        <div className="pointer-events-none fixed inset-x-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-50 flex justify-center sm:inset-x-auto sm:bottom-5 sm:right-5 fade-in">
          <div className="flex max-w-full items-center gap-2 rounded-full px-4 py-2.5 text-[13px] font-semibold text-white shadow-[0_12px_32px_rgba(0,59,111,.26)]" style={{ background: "var(--v-ink)" }}>
            <Check size={14} className="shrink-0" style={{ color: "var(--v-cyan)" }} /> <span className="truncate">{m.toast}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------------- home
function Home({ m }: { m: Matcher }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [mode, setMode] = useState<"new" | "existing">("new");
  const [targetId, setTargetId] = useState<string>("");
  useEffect(() => {
    if (mode === "new" && typeof window !== "undefined" && window.matchMedia("(min-width: 640px)").matches) {
      ref.current?.focus();
    }
  }, [mode]);
  useEffect(() => {
    if (m.projects.length > 0 && !m.projects.some((p) => p.id === targetId)) {
      setTargetId(m.projects[0].id);
    }
    if (m.projects.length === 0 && mode === "existing") {
      setMode("new");
    }
  }, [m.projects, targetId, mode]);

  const targetProject = m.projects.find((p) => p.id === targetId) ?? m.projects[0] ?? null;
  const ready = m.brief.trim().length >= 10;
  const addReady = m.brief.trim().length >= 4 && Boolean(targetProject) && !m.addingRole;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "existing" && targetProject) {
      if (!addReady) return;
      const text = m.brief;
      m.setBrief("");
      await m.addRoleFromBrief(text, targetProject);
      return;
    }
    if (ready) m.submit();
  };

  return (
    <main className="mx-auto max-w-3xl px-4 pb-20 pt-5 sm:px-6 sm:pb-24 sm:pt-14 fade-in">
      <h1 className="v-display text-[30px] font-bold leading-[36px] tracking-tight sm:text-[40px] sm:leading-[48px]">Who do you need?</h1>
      <p className="mt-2.5 max-w-2xl text-[15px] leading-6 sm:mt-3 sm:text-[17px] sm:leading-7" style={ink2}>
        Describe a new role or project team in your own words — or modify an existing saved project and its team.
      </p>

      {m.projects.length > 0 && (
        <div className="mt-5 grid w-full grid-cols-2 rounded-full border bg-white p-1 sm:mt-6 sm:inline-flex sm:w-auto" style={line}>
          <button
            type="button"
            onClick={() => setMode("new")}
            className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-3 py-2 text-[13px] font-semibold transition-colors sm:px-4"
            style={mode === "new" ? { background: "var(--v-accent)", color: "#fff" } : ink2}
          >
            <Plus size={14} className="shrink-0" />
            <span className="sm:hidden">New project</span>
            <span className="hidden sm:inline">New project &amp; team</span>
          </button>
          <button
            type="button"
            onClick={() => setMode("existing")}
            className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-3 py-2 text-[13px] font-semibold transition-colors sm:px-4"
            style={mode === "existing" ? { background: "var(--v-accent)", color: "#fff" } : ink2}
          >
            <FolderKanban size={14} className="shrink-0" />
            <span className="sm:hidden">Existing ({m.projects.length})</span>
            <span className="hidden sm:inline">Modify existing ({m.projects.length})</span>
          </button>
        </div>
      )}

      <form className="mt-5" onSubmit={onSubmit}>
        <div className="rounded-[22px] border bg-white shadow-[0_1px_2px_rgba(31,35,40,.04),0_12px_32px_rgba(31,35,40,.06)] focus-within:border-[var(--v-accent)]" style={line}>
          {mode === "existing" && targetProject && (
            <div className="flex flex-col gap-2.5 border-b px-4 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-3 sm:px-5 sm:py-3.5" style={{ ...line, background: "var(--v-surface2)", borderRadius: "21px 21px 0 0" }}>
              <div className="flex min-w-0 flex-1 items-center gap-2.5">
                <Briefcase size={15} style={{ color: "var(--v-accent)" }} className="shrink-0" />
                <select
                  aria-label="Choose existing project"
                  value={targetProject.id}
                  onChange={(e) => setTargetId(e.target.value)}
                  className="min-w-0 flex-1 rounded-xl border bg-white px-3 py-2 text-[16px] font-bold outline-none sm:py-1.5 sm:text-[14px]"
                  style={line}
                >
                  {m.projects.map((p) => {
                    const total = p.stats?.slots_total ?? p.spec.roles.reduce((a, r) => a + r.count, 0);
                    return (
                      <option key={p.id} value={p.id}>
                        {p.title}{p.client ? ` (${p.client})` : ""} — {p.members.length}/{total} filled
                      </option>
                    );
                  })}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:flex sm:shrink-0 sm:items-center">
                <button
                  type="button"
                  onClick={() => m.openProject(targetProject.id)}
                  className="inline-flex items-center justify-center rounded-full border bg-white px-3.5 py-2 text-[13px] font-semibold sm:py-1.5 sm:text-[12px]"
                  style={{ ...line, color: "var(--v-ink)" }}
                >
                  View details
                </button>
                <button
                  type="button"
                  onClick={() => m.modifyProject(targetProject)}
                  className="inline-flex items-center justify-center gap-1 rounded-full px-3.5 py-2 text-[13px] font-semibold text-white sm:py-1.5 sm:text-[12px]"
                  style={{ background: "var(--v-accent)" }}
                >
                  Open team <ArrowRight size={13} />
                </button>
              </div>
            </div>
          )}

          <textarea
            ref={ref}
            value={m.brief}
            onChange={(e) => m.setBrief(e.target.value)}
            rows={mode === "existing" ? 3 : 4}
            maxLength={6000}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                if (mode === "existing" ? addReady : ready) {
                  e.preventDefault();
                  onSubmit(e);
                }
              }
            }}
            placeholder={
              mode === "existing" && targetProject
                ? `Or describe a new role to add to “${targetProject.title}” (e.g. a senior QA automation engineer with Selenium, available now)…`
                : "For example: a senior data engineer with GCP experience for an insurance client, free within two months. Spanish and English."
            }
            className="block w-full resize-none rounded-[22px] bg-transparent px-4 py-4 text-[16px] leading-7 outline-none placeholder:text-[var(--v-ink2)]/60 sm:px-6 sm:py-5"
          />
          <div className="flex flex-col-reverse items-stretch gap-3 px-4 pb-4 sm:flex-row sm:items-center sm:justify-between">
            <span className="px-1 text-center text-[12px] sm:pl-2 sm:text-left sm:text-[13px]" style={ink2}>
              {mode === "existing" && targetProject
                ? "Adds new role(s) while keeping existing team members locked"
                : "Any language · one role or a whole team"}
            </span>
            {mode === "existing" && targetProject ? (
              <button
                type="submit"
                disabled={!addReady}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full px-6 py-3 text-[15px] font-semibold text-white transition-opacity disabled:opacity-40 sm:w-auto"
                style={{ background: "var(--v-accent)" }}
              >
                {m.addingRole ? <><Spinner /> Adding…</> : <>Add role &amp; match <ArrowRight size={17} /></>}
              </button>
            ) : (
              <button
                type="submit"
                disabled={!ready}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full px-6 py-3 text-[15px] font-semibold text-white transition-opacity disabled:opacity-40 sm:w-auto"
                style={{ background: "var(--v-accent)" }}
              >
                Find people <ArrowRight size={17} />
              </button>
            )}
          </div>
        </div>
      </form>
      {m.phase === "error" && m.error && <p className="mt-4 rounded-2xl px-4 py-3 text-[14px]" style={{ background: "var(--v-bad-soft)", color: "var(--v-bad)" }}>{m.error}</p>}

      <HomeProjectsStrip m={m} />

      {m.meta && (
        <>
          <div className="mt-9 text-[13px] font-semibold sm:mt-10" style={ink2}>Or start from an example</div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {m.meta.examples.map((ex) => (
              <button key={ex.id} onClick={() => m.submit(ex.brief)} className="group rounded-2xl border bg-white p-4 text-left transition-colors hover:border-[var(--v-accent)]" style={line}>
                <div className="flex items-center justify-between gap-2 text-[15px] font-bold">
                  <span>{ex.title}</span>
                  <ArrowRight size={16} className="shrink-0 opacity-60 transition-opacity sm:opacity-0 sm:group-hover:opacity-100" style={{ color: "var(--v-accent)" }} />
                </div>
                <div className="mt-1 text-[13px]" style={ink2}>{ex.tests}</div>
              </button>
            ))}
          </div>
          <p className="mt-8 text-[13px] leading-5 sm:mt-10" style={ink2}>
            {fmt.format(m.meta.profiles)} colleagues · {fmt.format(m.meta.available_now)} available now · {fmt.format(m.meta.available_soon)} free within 3 months
          </p>
        </>
      )}
    </main>
  );
}

// ---------------------------------------------------------------- results
function Results({ m }: { m: Matcher }) {
  const [open, setOpen] = useState<{ roleId: string; c: Candidate } | null>(null);
  const [selected, setSelected] = useState<Record<string, string[]>>({});
  const [comparing, setComparing] = useState(false);
  const [saveModal, setSaveModal] = useState<null | "new" | "copy">(null);
  const [addToModal, setAddToModal] = useState(false);
  const [addingRoleOpen, setAddingRoleOpen] = useState(false);
  const [newRoleText, setNewRoleText] = useState("");
  const { result, spec } = m;

  useEffect(() => { setSelected({}); setOpen(null); }, [spec?.title, m.activeProjectId]);
  useEffect(() => { if (m.tab === "team") m.loadReview(); }, [m.tab, m]);

  if (m.phase === "interpreting" || m.phase === "searching") return <Loading m={m} />;
  if (m.phase === "error") {
    return (
      <main className="mx-auto max-w-xl px-4 py-16 text-center sm:px-6 sm:py-24">
        <p className="text-[16px]" style={{ color: "var(--v-bad)" }}>{m.error}</p>
        <div className="mt-6 flex justify-center gap-2"><Pill onClick={m.goHome}><ArrowLeft size={15} /> Back</Pill><Pill active onClick={() => m.submit()}>Try again</Pill></div>
      </main>
    );
  }
  if (!result || !spec) return null;

  const role = result.roles.find((r) => r.id === m.tab);
  const roleSpec = role ? m.roleById[role.id] : undefined;
  const sel = role ? selected[role.id] ?? [] : [];
  const toggle = (id: string) => role && setSelected((p) => {
    const cur = p[role.id] ?? [];
    return { ...p, [role.id]: cur.includes(id) ? cur.filter((x) => x !== id) : cur.length >= 4 ? cur : [...cur, id] };
  });
  const openCard = (roleId: string, c: Candidate) => { setOpen({ roleId, c }); m.explain(roleId, c.employee_id); };
  const openId = async (roleId: string, employeeId: string) => {
    const c = await m.candidate(roleId, employeeId);
    if (c) openCard(roleId, c);
  };
  const people = role ? sel.map((id) => role.candidates.find((c) => c.employee_id === id)).filter(Boolean) as Candidate[] : [];

  const submitAddRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newRoleText.trim().length < 4 || m.addingRole) return;
    const ok = await m.addRoleFromBrief(newRoleText);
    if (ok) {
      setNewRoleText("");
      setAddingRoleOpen(false);
    }
  };

  // Map employee_id -> slot info in the currently active team option (for role tabs)
  const teamSlotByEmp = new Map<string, TeamMember>();
  if (result.multi && m.activeTeamOption) {
    for (const mem of m.activeTeamOption.members) {
      if (mem.candidate) teamSlotByEmp.set(mem.candidate.employee_id, mem);
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-4 pb-28 pt-5 sm:px-6 sm:pb-32 sm:pt-6 fade-in">
      {/* Project persistence bar */}
      {m.activeProject ? (
        <div
          className="mb-5 flex flex-col gap-3 rounded-[var(--v-radius)] border bg-white px-4 py-3.5 shadow-[0_1px_2px_rgba(31,35,40,.04)] sm:mb-6 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:px-5"
          style={{ borderColor: m.dirty ? "var(--v-accent)" : "var(--v-line)" }}
        >
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <Briefcase size={16} style={{ color: "var(--v-accent)" }} className="shrink-0" />
            <span className="truncate text-[14px] font-bold">{m.activeProject.title}</span>
            <StatusBadge status={m.activeProject.status} />
            {m.dirty ? (
              <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold" style={{ background: "var(--v-warn-soft)", color: "var(--v-warn)" }}>
                Unsaved changes
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[12px] font-semibold" style={{ color: "var(--v-good)" }}>
                <Check size={13} /> Up to date
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
            <button
              onClick={() => m.openProject(m.activeProject!.id)}
              className="inline-flex items-center justify-center gap-1.5 rounded-full border px-3.5 py-2 text-[13px] font-semibold sm:py-1.5"
              style={{ ...line, color: "var(--v-ink)" }}
            >
              View project
            </button>
            <button
              onClick={() => setSaveModal("copy")}
              className="inline-flex items-center justify-center gap-1.5 rounded-full border px-3.5 py-2 text-[13px] font-semibold sm:py-1.5"
              style={{ ...line, ...ink2 }}
              title="Save a separate copy of this project"
            >
              <Copy size={13} /> Save as copy
            </button>
            <button
              onClick={() => m.saveCurrentProject()}
              disabled={m.savingProject || !m.dirty}
              className="col-span-2 inline-flex items-center justify-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-semibold transition-opacity disabled:opacity-50 sm:col-span-1 sm:py-1.5"
              style={
                m.dirty
                  ? { background: "var(--v-accent)", color: "#fff" }
                  : { background: "var(--v-good-soft)", color: "var(--v-good)" }
              }
            >
              {m.savingProject ? <Spinner /> : m.dirty ? <Save size={14} /> : <Check size={14} />}
              {m.dirty ? "Save changes" : "Saved"}
            </button>
          </div>
        </div>
      ) : (
        <div
          className="mb-5 flex flex-col gap-3 rounded-[var(--v-radius)] border bg-white px-4 py-3.5 shadow-[0_1px_2px_rgba(31,35,40,.04)] sm:mb-6 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:px-5"
          style={line}
        >
          <div className="flex items-start gap-2.5 text-[13px] leading-5 sm:items-center sm:text-[14px]" style={ink2}>
            <BookmarkPlus size={16} style={{ color: "var(--v-accent)" }} className="mt-0.5 shrink-0 sm:mt-0" />
            <span>Keep this brief and chosen {result.multi ? "team" : "candidate"} so you can view or modify it later.</span>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            {m.projects.length > 0 && (
              <button
                onClick={() => setAddToModal(true)}
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-full border bg-white px-4 py-2 text-[13px] font-semibold transition-colors hover:border-[var(--v-accent)] sm:w-auto sm:py-1.5"
                style={{ ...line, color: "var(--v-accent)" }}
              >
                <FolderPlus size={14} /> Add to existing project
              </button>
            )}
            <button
              onClick={() => setSaveModal("new")}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-semibold text-white sm:w-auto sm:py-1.5"
              style={{ background: "var(--v-accent)" }}
            >
              <Save size={14} /> Save as project
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-start justify-between gap-3 sm:gap-4">
        <div className="min-w-0">
          <h1 className="v-display text-[24px] font-bold leading-8 tracking-tight sm:text-[32px] sm:leading-10">
            {result.multi && m.tab === "team" ? (/team$/i.test(spec.title) ? spec.title : `A team for ${spec.title}`) : role ? `${role.candidates.length} people could do this` : spec.title}
          </h1>
          <p className="mt-1.5 max-w-3xl text-[14px] leading-6 sm:mt-2 sm:text-[16px] sm:leading-7" style={ink2}>
            {result.multi && m.tab === "team" ? spec.summary : role ? <RoleIntro role={role} /> : null}
          </p>
        </div>
        {m.refreshing && <span className="mt-2 sm:mt-3" style={{ color: "var(--v-accent)" }}><Spinner /></span>}
      </div>

      {/* Tabs + Add Role */}
      <div className="no-scrollbar -mx-4 mt-5 flex flex-nowrap items-center gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:mt-6 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0">
        {result.multi && (
          <Pill active={m.tab === "team"} onClick={() => m.setTab("team")}><Users size={15} /> Team</Pill>
        )}
        {(result.multi || result.roles.length > 1) && result.roles.map((r) => (
          <Pill key={r.id} active={m.tab === r.id} onClick={() => m.setTab(r.id)}>
            {r.title}{r.count > 1 ? ` ×${r.count}` : ""}
          </Pill>
        ))}
        <button
          onClick={() => setAddingRoleOpen((v) => !v)}
          className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-dashed bg-white/70 px-3.5 py-2 text-[13px] font-semibold transition-colors hover:border-[var(--v-accent)] hover:bg-white"
          style={{ ...line, color: "var(--v-accent)" }}
        >
          <Plus size={14} /> Add role
        </button>
      </div>

      {addingRoleOpen && (
        <form onSubmit={submitAddRole} className="mt-4 rounded-[var(--v-radius)] border bg-white p-4 fade-in" style={{ borderColor: "var(--v-accent)" }}>
          <div className="text-[13px] font-bold">Add another role to this {result.multi ? "team" : "project"}</div>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <input
              autoFocus
              value={newRoleText}
              onChange={(e) => setNewRoleText(e.target.value)}
              placeholder="e.g. A senior QA automation engineer with Selenium, available now"
              className="flex-1 rounded-xl border px-3.5 py-2.5 text-[16px] outline-none focus:border-[var(--v-accent)] sm:py-2 sm:text-[14px]"
              style={line}
            />
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={newRoleText.trim().length < 4 || m.addingRole}
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full px-4 py-2.5 text-[13px] font-semibold text-white disabled:opacity-40 sm:flex-initial sm:py-2"
                style={{ background: "var(--v-accent)" }}
              >
                {m.addingRole ? <><Spinner /> Interpreting…</> : <>Add role <ArrowRight size={14} /></>}
              </button>
              <button type="button" onClick={() => setAddingRoleOpen(false)} className="rounded-full px-3 py-2 text-[13px] font-semibold" style={ink2}>
                Cancel
              </button>
            </div>
          </div>
        </form>
      )}

      {m.tab === "team" && result.multi && <Team m={m} onOpen={openCard} />}

      {role && roleSpec && (
        <>
          <WhatMatters m={m} role={roleSpec} canRemove={spec.roles.length > 1} />
          {role.candidates.length === 0 ? (
            <div className="mt-6 rounded-[22px] border border-dashed bg-white p-7 text-center text-[14px] sm:mt-8 sm:p-10 sm:text-[15px]" style={{ ...line, ...ink2 }}>
              Nobody passes the rules you set. Try “Free within 3 months” or fewer years of experience.
            </div>
          ) : (
            <>
              {role.complement && (
                <div className="mt-5 flex items-start gap-2.5 rounded-[var(--v-radius)] px-4 py-3.5 text-[14px] leading-6 sm:mt-6 sm:items-center sm:gap-3 sm:px-5 sm:py-4 sm:text-[15px]" style={{ background: "var(--v-accent-soft)" }}>
                  <Users size={18} className="mt-0.5 shrink-0 sm:mt-0" style={{ color: "var(--v-accent)" }} />
                  <span><b>Nobody covers everything alone.</b> Pair {role.candidates.find((x) => x.employee_id === role.complement!.for)?.name.split(" ")[0]} with{" "}
                    <button className="font-bold underline underline-offset-2" onClick={() => openId(role.id, role.complement!.person.employee_id)}>{role.complement.person.name}</button>
                    {" "}({role.complement.person.role}), who covers <b>{role.complement.covers.join(", ")}</b>.</span>
                </div>
              )}
              <div className="mt-5 grid gap-4 sm:mt-6 sm:gap-5 md:grid-cols-2">
                {role.candidates.map((c) => {
                  const singleSlotId = `${role.id}#0`;
                  const isPickedSingle = !result.multi && m.locks[singleSlotId] === c.employee_id;
                  const assignedSlot = result.multi ? teamSlotByEmp.get(c.employee_id) ?? null : null;
                  const roleSlots = result.multi
                    ? (m.activeTeamOption?.members.filter((x) => x.role_id === role.id) ?? [])
                    : [];
                  return (
                    <PersonCard
                      key={c.employee_id}
                      c={c}
                      multi={result.multi}
                      selected={sel.includes(c.employee_id)}
                      onToggle={() => toggle(c.employee_id)}
                      onOpen={() => openCard(role.id, c)}
                      isPickedSingle={isPickedSingle}
                      onToggleSingle={() =>
                        isPickedSingle ? m.unassignSlot(singleSlotId) : m.assignCandidate(singleSlotId, c.employee_id)
                      }
                      assignedSlot={assignedSlot}
                      roleSlots={roleSlots}
                      onAssignSlot={(slotId) => m.assignCandidate(slotId, c.employee_id)}
                    />
                  );
                })}
              </div>
            </>
          )}
        </>
      )}

      {role && sel.length > 0 && (
        <div className="sticky bottom-[max(1rem,env(safe-area-inset-bottom))] z-30 mt-6 flex justify-center sm:bottom-5">
          <div className="fade-in flex w-full max-w-md items-center justify-between gap-2 rounded-full border bg-white py-2 pl-2.5 pr-2 shadow-[0_12px_32px_rgba(31,35,40,.16)] sm:w-auto sm:max-w-none sm:gap-3 sm:pl-3" style={line}>
            <div className="flex min-w-0 items-center gap-2 sm:gap-3">
              <div className="flex shrink-0 -space-x-2">{people.map((c) => <span key={c.employee_id} className="rounded-full ring-2 ring-white"><Avatar c={c} size={30} /></span>)}</div>
              <span className="truncate text-[13px] font-medium sm:text-[14px]">
                <span className="sm:hidden">{sel.length < 2 ? "Pick 1 more" : `${sel.length} picked`}</span>
                <span className="hidden sm:inline">{sel.length < 2 ? "Pick one more to compare" : `${sel.length} people selected`}</span>
              </span>
            </div>
            <div className="flex shrink-0 items-center gap-1 sm:gap-2">
              <button onClick={() => setSelected((p) => ({ ...p, [role.id]: [] }))} className="rounded-full px-2.5 py-2 text-[13px] font-semibold sm:px-3 sm:text-[14px]" style={ink2}>Clear</button>
              <button disabled={sel.length < 2} onClick={() => { setComparing(true); people.forEach((c) => m.explain(role.id, c.employee_id)); }}
                className="rounded-full px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-40 sm:px-5 sm:py-2.5 sm:text-[14px]" style={{ background: "var(--v-accent)" }}>Compare</button>
            </div>
          </div>
        </div>
      )}

      {comparing && role && people.length >= 2 && (
        <Compare people={people} roleTitle={role.title} explanation={(id) => m.explanation(role.id, id)} onClose={() => setComparing(false)} onOpen={(c) => { setComparing(false); openCard(role.id, c); }} />
      )}
      {open && (
        <Profile c={open.c} roleTitle={m.roleById[open.roleId]?.title ?? ""} exp={m.explanation(open.roleId, open.c.employee_id)} onClose={() => setOpen(null)} />
      )}
      {saveModal && (
        <SaveProjectModal m={m} mode={saveModal} onClose={() => setSaveModal(null)} />
      )}
      {addToModal && (
        <AddToProjectModal m={m} onClose={() => setAddToModal(false)} />
      )}
    </main>
  );
}

function RoleIntro({ role }: { role: RoleResult }) {
  const f = role.funnel;
  const last = f[f.length - 1];
  const kw = role.keyword;
  const outside = role.candidates.filter((c) => c.other_team).length;
  return (
    <>
      We looked at {fmt.format(f[0].count)} colleagues{f.length > 1 && <> and {fmt.format(last.count)} pass your rules ({f.slice(1).map((s) => s.label.toLowerCase()).join(", ")})</>}.
      {outside > 0 && <> {outside === role.candidates.length ? "All" : outside} of these {role.candidates.length} come from other teams.</>}
      {kw && kw.count !== null && <> A keyword search for “{kw.terms.join(" + ")}” would find {fmt.format(kw.count)}{kw.missed_in_top > 0 ? ` and miss ${kw.missed_in_top} of them` : ""}.</>}
    </>
  );
}

function PersonCard({
  c,
  selected,
  onToggle,
  onOpen,
  multi,
  isPickedSingle,
  onToggleSingle,
  assignedSlot,
  roleSlots,
  onAssignSlot,
}: {
  c: Candidate;
  selected: boolean;
  onToggle: () => void;
  onOpen: () => void;
  multi: boolean;
  isPickedSingle: boolean;
  onToggleSingle: () => void;
  assignedSlot: TeamMember | null;
  roleSlots: TeamMember[];
  onAssignSlot: (slotId: string) => void;
}) {
  const [pickSlotOpen, setPickSlotOpen] = useState(false);
  const hidden = hiddenReasons(c);
  const ribbon = c.other_team ? `From the ${teamLabel(c.role)} team` : c.hidden_sector ? "Hidden sector experience" : null;
  const inTeamOrPicked = isPickedSingle || Boolean(assignedSlot);

  return (
    <article
      className="relative flex flex-col rounded-[var(--v-radius)] border bg-white p-4 shadow-[0_1px_2px_rgba(31,35,40,.04),0_8px_24px_rgba(31,35,40,.05)] transition-shadow hover:shadow-[0_1px_2px_rgba(31,35,40,.04),0_14px_32px_rgba(31,35,40,.10)] sm:p-6"
      style={{
        borderColor: selected || inTeamOrPicked ? "var(--v-accent)" : "var(--v-line)",
        boxShadow: selected ? "0 0 0 3px var(--v-accent-soft)" : undefined,
      }}
    >
      {ribbon && (
        <span
          title={hidden.join("\n")}
          className="mb-2.5 inline-flex max-w-full self-start items-center gap-1 truncate rounded-full border px-2.5 py-1 text-[12px] font-semibold sm:mb-0 sm:absolute sm:right-5 sm:top-5 sm:max-w-[46%]"
          style={{ background: "var(--v-accent-soft)", borderColor: "rgba(91,192,235,.5)", color: "var(--v-ink)" }}
        >
          <Sparkles size={12} className="shrink-0" style={{ color: "var(--v-accent)" }} /> <span className="truncate">{ribbon}</span>
        </span>
      )}
      <button onClick={onOpen} className={`flex w-full items-center gap-3 text-left sm:gap-4 ${ribbon ? "sm:pr-[46%] md:pr-[40%]" : ""}`}>
        <Avatar c={c} size={48} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[16px] font-bold leading-6 sm:text-[17px]">{c.name}</div>
          <div className="truncate text-[13px] sm:text-[14px]" style={ink2}>{c.position}</div>
          <div className="flex items-center gap-1 truncate text-[12px] sm:text-[13px]" style={ink2}><MapPin size={12} className="shrink-0" /> <span className="truncate">{c.location} · {c.years} yrs</span></div>
        </div>
      </button>
      <div className="mt-3.5 flex flex-wrap items-center gap-2 sm:mt-4">
        <Availability code={c.availability_code} />
        {assignedSlot && multi && (
          <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[12px] font-semibold" style={{ background: "var(--v-accent-soft)", color: "var(--v-accent)" }}>
            <UserCheck size={12} /> In team ({assignedSlot.slot_label})
          </span>
        )}
        {isPickedSingle && !multi && (
          <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[12px] font-semibold" style={{ background: "var(--v-good-soft)", color: "var(--v-good)" }}>
            <UserCheck size={12} /> Selected for project
          </span>
        )}
      </div>
      <div className="mt-3.5 rounded-2xl p-3.5 sm:mt-4 sm:p-4" style={{ background: "var(--v-surface2)" }}>
        <div className="text-[13px] font-bold" style={{ color: "var(--v-accent)" }}>Why {first(c.name)}?</div>
        <p className="mt-1 text-[14px] leading-6 sm:text-[15px]">{whyLine(c)}</p>
        {c.risks[0] && <p className="mt-2 flex items-start gap-1.5 text-[13px]" style={{ color: "var(--v-warn)" }}><CircleAlert size={14} className="mt-0.5 shrink-0" /> {c.risks[0].text}</p>}
      </div>
      <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2 sm:mt-4 sm:gap-3">
        <Segments c={c} />
        <span className="text-[14px] font-bold">{c.fit}% <span className="font-medium" style={ink2}>match</span></span>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2 sm:mt-5">
        <Pill onClick={onOpen}>View profile</Pill>

        {!multi ? (
          <button
            onClick={onToggleSingle}
            className="inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-[13px] font-semibold transition-colors sm:px-4 sm:text-[14px]"
            style={
              isPickedSingle
                ? { background: "var(--v-accent)", color: "#fff", borderColor: "var(--v-accent)" }
                : { ...line, background: "#fff", color: "var(--v-ink)" }
            }
          >
            {isPickedSingle ? <><Check size={15} /> Selected</> : <><UserPlus size={15} /> Select</>}
          </button>
        ) : !assignedSlot && roleSlots.length > 0 ? (
          <div className="relative">
            <button
              onClick={() => {
                if (roleSlots.length === 1) onAssignSlot(roleSlots[0].slot_id);
                else setPickSlotOpen((v) => !v);
              }}
              className="inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-[13px] font-semibold transition-colors sm:px-4 sm:text-[14px]"
              style={{ ...line, background: "#fff", color: "var(--v-ink)" }}
            >
              <UserPlus size={15} /> Put in team
            </button>
            {pickSlotOpen && roleSlots.length > 1 && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setPickSlotOpen(false)} />
                <div className="absolute left-0 top-full z-40 mt-1.5 w-56 max-w-[calc(100vw-3rem)] rounded-2xl border bg-white p-2 shadow-[0_16px_40px_rgba(31,35,40,.16)] fade-in" style={line}>
                  <div className="px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide" style={ink2}>Assign to seat</div>
                  {roleSlots.map((sl) => (
                    <button
                      key={sl.slot_id}
                      onClick={() => { onAssignSlot(sl.slot_id); setPickSlotOpen(false); }}
                      className="flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-left text-[13px] font-semibold hover:bg-[var(--v-surface2)]"
                    >
                      <span className="truncate">{sl.slot_label}</span>
                      {sl.candidate && <span className="ml-2 truncate text-[11px] font-normal" style={ink2}>{first(sl.candidate.name)}</span>}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        ) : null}

        <button onClick={onToggle} className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-[13px] font-semibold sm:px-3.5 sm:text-[14px]" style={selected ? { background: "var(--v-accent-soft)", color: "var(--v-accent)" } : ink2}>
          {selected ? <Check size={15} /> : <Plus size={15} />} {selected ? "Comparing" : "Compare"}
        </button>
      </div>
    </article>
  );
}

// --------------------------------------------------------- what matters
const MATCH_LABEL: Record<string, string> = { exact: "same skill", equivalent: "same idea, other name", related: "related", transferable: "transferable" };

function counts(q: Requirement): string[] {
  const out: string[] = [];
  if (q.implicit && q.reason) out.push(`We inferred this: ${q.reason}`);
  if (q.skills.length) out.push("Counts as evidence: " + q.skills.map((s) => `${s.name} (${MATCH_LABEL[s.match]})`).join(", "));
  if (q.certs.length) out.push("Certificates: " + q.certs.join(", "));
  if (q.sector) out.push(`Main sector, client projects or employers in ${q.sector}`);
  if (q.language) out.push(`${q.language} at ${q.min_level ?? "B2"} or higher`);
  if (q.soft.length) out.push("Self-declared: " + q.soft.join(", "));
  if (q.unmapped) out.push("No profile field can show this, so it isn’t scored.");
  return out;
}

function WhatMatters({ m, role, canRemove }: { m: Matcher; role: RoleSpec; canRemove: boolean }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const close = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpenId(null); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpenId(null); };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", onKey);
    };
  }, []);
  const update = (patch: Partial<RoleSpec>) => m.editRole({ ...role, ...patch });
  const setReq = (id: string, patch: Partial<Requirement> | null) => {
    setOpenId(null);
    update({ requirements: patch === null ? role.requirements.filter((q) => q.id !== id) : role.requirements.map((q) => (q.id === id ? { ...q, ...patch } : q)) });
  };
  const orig = m.originalRole(role.id);
  const changed = orig && JSON.stringify(orig) !== JSON.stringify(role);
  const sorted = [...role.requirements].sort((a, b) => (a.importance === b.importance ? 0 : a.importance === "must" ? -1 : 1));
  const openReq = openId ? sorted.find((q) => q.id === openId) ?? null : null;
  const select = "appearance-none rounded-full border bg-white px-3.5 py-2 text-[16px] font-semibold outline-none sm:px-4 sm:text-[14px]";

  return (
    <div ref={box} className="mt-5 rounded-[var(--v-radius)] border bg-white p-4 sm:mt-7 sm:p-5" style={line}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 text-[13px] font-bold" style={ink2}>What matters</span>
        {sorted.map((q) => {
          const must = q.importance === "must";
          return (
            <div key={q.id} className="relative">
              <button onClick={() => setOpenId(openId === q.id ? null : q.id)}
                className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] font-semibold sm:px-3.5 sm:text-[14px]"
                style={must ? { background: "var(--v-accent-soft)", borderColor: "transparent", color: "var(--v-ink)" } : { ...line, background: "#fff", color: "var(--v-ink2)" }}>
                {q.implicit ? <Sparkles size={13} style={{ color: "var(--v-accent)" }} /> : must ? <Check size={14} style={{ color: "var(--v-accent)" }} /> : null}
                {q.label}{!must && <span className="text-[11px] font-bold uppercase">· nice</span>}
              </button>
              {openId === q.id && (
                <div className="hidden sm:block absolute left-0 top-full z-40 mt-2 w-80 rounded-2xl border bg-white p-4 text-[14px] shadow-[0_16px_40px_rgba(31,35,40,.16)] fade-in" style={line}>
                  <div className="font-bold">{q.label}</div>
                  <ul className="mt-2 space-y-1.5 text-[13px] leading-5" style={ink2}>{counts(q).map((l) => <li key={l}>{l}</li>)}</ul>
                  <div className="mt-4 flex gap-2">
                    <button onClick={() => setReq(q.id, { importance: must ? "nice" : "must" })} className="flex-1 rounded-full border px-3 py-2 text-[13px] font-semibold" style={{ ...line, color: "var(--v-accent)" }}>
                      {must ? "Make it nice-to-have" : "Make it a must"}
                    </button>
                    <button onClick={() => setReq(q.id, null)} className="rounded-full border px-3 py-2 text-[13px] font-semibold" style={{ ...line, color: "var(--v-bad)" }}>Remove</button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Mobile bottom sheet for requirement details */}
      {openReq && (
        <div
          className="fixed inset-0 z-50 flex items-end bg-black/30 backdrop-blur-[1px] sm:hidden fade-in"
          onClick={() => setOpenId(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full rounded-t-[24px] bg-white p-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-[0_-16px_40px_rgba(31,35,40,.22)]"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="text-[16px] font-bold leading-6">{openReq.label}</div>
              <button
                type="button"
                onClick={() => setOpenId(null)}
                aria-label="Close"
                className="shrink-0 rounded-full border p-1.5"
                style={{ ...line, ...ink2 }}
              >
                <X size={16} />
              </button>
            </div>
            <ul className="mt-2.5 space-y-1.5 text-[14px] leading-5" style={ink2}>
              {counts(openReq).map((l) => <li key={l}>{l}</li>)}
            </ul>
            <div className="mt-5 flex gap-2">
              <button
                onClick={() => setReq(openReq.id, { importance: openReq.importance === "must" ? "nice" : "must" })}
                className="flex-1 rounded-full border px-4 py-2.5 text-[14px] font-semibold"
                style={{ ...line, color: "var(--v-accent)" }}
              >
                {openReq.importance === "must" ? "Make nice-to-have" : "Make it a must"}
              </button>
              <button
                onClick={() => setReq(openReq.id, null)}
                className="rounded-full border px-4 py-2.5 text-[14px] font-semibold"
                style={{ ...line, color: "var(--v-bad)" }}
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t pt-4" style={line}>
        <span className="mr-1 inline-flex items-center gap-1 text-[13px] font-bold" style={ink2}><Lock size={13} /> Always applied</span>
        <select value={role.availability} onChange={(e) => update({ availability: e.target.value as Availability })} className={select} style={{ ...line, color: "var(--v-accent)" }}>
          <option value="now">Available now</option>
          <option value="soon">Free within 3 months</option>
          <option value="any">Any availability</option>
        </select>
        <label className="inline-flex items-center gap-1 rounded-full border bg-white px-3.5 py-2 text-[14px] font-semibold sm:px-4" style={{ ...line, color: "var(--v-accent)" }}>
          <input type="number" inputMode="numeric" min={0} max={40} value={role.min_years ?? ""} placeholder="0"
            onChange={(e) => update({ min_years: e.target.value === "" || Number(e.target.value) <= 0 ? null : Math.min(40, Number(e.target.value)) })}
            className="w-8 bg-transparent text-right text-[16px] outline-none sm:w-7 sm:text-[14px]" />+ years
        </label>
        {role.countries.map((c) => (
          <span key={c} className="inline-flex items-center gap-1 rounded-full border bg-white px-3.5 py-2 text-[13px] font-semibold sm:px-4 sm:text-[14px]" style={line}>
            Based in {c}<button onClick={() => update({ countries: role.countries.filter((x) => x !== c) })} style={ink2}><X size={14} /></button>
          </span>
        ))}
        <span className="mx-1 text-[13px] font-bold" style={ink2}>Preference</span>
        <select
          value={role.seniority_min ? `${role.seniority_min}:${role.seniority_mode ?? "target"}` : ""}
          onChange={(e) => {
            if (!e.target.value) return update({ seniority_min: null, seniority_mode: "target" });
            const [lvl, mode] = e.target.value.split(":");
            update({ seniority_min: lvl, seniority_mode: (mode as SeniorityMode) || "target" });
          }}
          className={select} style={{ ...line, color: "var(--v-accent)" }}
        >
          <option value="">Any seniority</option>
          <option value="Junior:target">Junior (target)</option>
          <option value="Mid:target">Mid (target)</option>
          <option value="Senior:target">Senior (target)</option>
          <option value="Lead:target">Lead (target)</option>
          <option value="Principal:target">Principal (target)</option>
          <option value="Senior:min">Senior or above</option>
          <option value="Lead:min">Lead or above</option>
        </select>
        <div className="inline-flex items-center gap-1 rounded-full border bg-white px-2.5 py-1.5 text-[13px] font-semibold" style={line} title="Number of seats for this role">
          <button onClick={() => m.setRoleCount(role.id, role.count - 1)} disabled={role.count <= 1} className="p-1 disabled:opacity-30"><Minus size={13} /></button>
          <span className="px-1">{role.count} seat{role.count > 1 ? "s" : ""}</span>
          <button onClick={() => m.setRoleCount(role.id, role.count + 1)} disabled={role.count >= 10} className="p-1 disabled:opacity-30"><Plus size={13} /></button>
        </div>
        <div className="flex w-full flex-wrap items-center justify-end gap-3 pt-1 sm:ml-auto sm:w-auto sm:pt-0">
          {changed && <button onClick={() => m.resetRole(role.id)} className="inline-flex items-center gap-1 text-[13px] font-semibold" style={ink2}><RotateCcw size={13} /> Undo my changes</button>}
          {canRemove && (
            <button onClick={() => m.removeRole(role.id)} className="inline-flex items-center gap-1 text-[13px] font-semibold" style={{ color: "var(--v-bad)" }}>
              <Trash2 size={13} /> Remove role
            </button>
          )}
        </div>
      </div>
      {m.interp && !m.interp.ai_used && m.interp.warnings.map((w) => <p key={w} className="mt-3 rounded-xl px-3 py-2 text-[13px]" style={{ background: "var(--v-warn-soft)", color: "var(--v-warn)" }}>{w}</p>)}
    </div>
  );
}

// ------------------------------------------------------------------ team
const ROLE_BADGE: Record<string, { label: string; bg: string; fg: string }> = {
  anchor: { label: "Anchor", bg: "var(--v-accent-soft)", fg: "var(--v-accent)" },
  builder: { label: "Builder", bg: "var(--v-surface2)", fg: "var(--v-ink2)" },
  learner: { label: "Learner", bg: "var(--v-good-soft)", fg: "var(--v-good)" },
};

function ShapeEditor({ shape, onChange, onReset, hasCustom }: { shape: TeamShape; onChange: (s: TeamShape) => void; onReset: () => void; hasCustom: boolean }) {
  const set = (patch: Partial<TeamShape>) => onChange({ ...shape, ...patch });
  const ctl = "rounded-xl border bg-white px-3 py-2 text-[16px] font-semibold outline-none sm:px-2.5 sm:py-1.5 sm:text-[13px]";
  return (
    <div className="rounded-[var(--v-radius)] border bg-white p-4 fade-in sm:p-5" style={line}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-[14px] font-bold">
          <SlidersHorizontal size={15} style={{ color: "var(--v-accent)" }} /> Team shape rules
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="inline-flex cursor-pointer items-center gap-2 text-[13px] font-semibold">
            <input type="checkbox" checked={shape.enabled} onChange={(e) => set({ enabled: e.target.checked })} className="accent-[var(--v-accent)]" />
            Balance team automatically
          </label>
          {hasCustom && (
            <button onClick={onReset} className="inline-flex items-center gap-1 text-[13px] font-semibold" style={ink2}>
              <RotateCcw size={13} /> Defaults
            </button>
          )}
        </div>
      </div>
      {shape.enabled && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-[13px]">
          <label className="flex flex-col gap-1">
            <span style={ink2}>Anchors (Lead/Principal)</span>
            <select value={shape.anchors_min} onChange={(e) => set({ anchors_min: Number(e.target.value) })} className={ctl} style={line}>
              <option value={0}>No minimum</option><option value={1}>At least 1</option><option value={2}>At least 2</option>
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span style={ink2}>Max Senior or above</span>
            <select value={shape.max_senior_plus_ratio} onChange={(e) => set({ max_senior_plus_ratio: Number(e.target.value) })} className={ctl} style={line}>
              <option value={0.4}>At most 40%</option><option value={0.5}>At most 50%</option><option value={0.6}>At most 60%</option><option value={0.8}>At most 80%</option><option value={1}>No cap</option>
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span style={ink2}>Mid-level floor</span>
            <select value={shape.min_mid} onChange={(e) => set({ min_mid: Number(e.target.value) })} className={ctl} style={line}>
              <option value={0}>No minimum</option><option value={1}>At least 1 Mid</option><option value={2}>At least 2 Mids</option>
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span style={ink2}>Junior floor (4+ people)</span>
            <select value={shape.min_junior} onChange={(e) => set({ min_junior: Number(e.target.value) })} className={ctl} style={line}>
              <option value={0}>No minimum</option><option value={1}>At least 1 Junior</option><option value={2}>At least 2 Juniors</option>
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span style={ink2}>Max time-zone spread</span>
            <select value={shape.max_tz_spread} onChange={(e) => set({ max_tz_spread: Number(e.target.value) })} className={ctl} style={line}>
              <option value={2}>≤ 2 hours</option><option value={4}>≤ 4 hours</option><option value={6}>≤ 6 hours</option><option value={8}>≤ 8 hours</option><option value={24}>Any time zone</option>
            </select>
          </label>
          <label className="flex cursor-pointer items-center gap-2 pt-1 font-semibold sm:pt-5">
            <input type="checkbox" checked={shape.mentor_juniors} onChange={(e) => set({ mentor_juniors: e.target.checked })} className="accent-[var(--v-accent)]" />
            Every Junior needs a Senior+ mentor
          </label>
          <label className="flex cursor-pointer items-center gap-2 pt-1 font-semibold sm:pt-5">
            <input type="checkbox" checked={shape.prefer_shared_language} onChange={(e) => set({ prefer_shared_language: e.target.checked })} className="accent-[var(--v-accent)]" />
            Shared working language (B2+)
          </label>
          <label className="flex cursor-pointer items-center gap-2 pt-1 font-semibold sm:pt-5">
            <input type="checkbox" checked={shape.avoid_duplicates} onChange={(e) => set({ avoid_duplicates: e.target.checked })} className="accent-[var(--v-accent)]" />
            Avoid near-duplicate profiles
          </label>
        </div>
      )}
    </div>
  );
}

function SlotCard({ member, m, onOpen }: { member: TeamMember; m: Matcher; onOpen: (roleId: string, c: Candidate) => void }) {
  const [swapping, setSwapping] = useState(false);
  const c = member.candidate;
  const badge = ROLE_BADGE[member.team_role] ?? ROLE_BADGE.builder;

  return (
    <div className="rounded-[var(--v-radius)] border bg-white p-4 transition-colors sm:p-5" style={{ borderColor: member.locked ? "var(--v-accent)" : "var(--v-line)" }}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate text-[15px] font-bold sm:text-[16px]">{member.slot_label}</span>
          <span className="shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-bold" style={{ background: badge.bg, color: badge.fg }}>{badge.label}</span>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {c && (
            <button
              onClick={() => m.toggleLock(member.slot_id, c.employee_id)}
              title={member.locked ? "Unlock this slot" : "Lock this person and re-solve around them"}
              className="inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-[12px] font-semibold transition-colors sm:py-1"
              style={member.locked ? { background: "var(--v-accent)", color: "#fff", borderColor: "var(--v-accent)" } : { ...line, color: "var(--v-ink2)" }}
            >
              {member.locked ? <Lock size={12} /> : <Unlock size={12} />} {member.locked ? "Locked" : "Lock"}
            </button>
          )}
          {member.swaps.length > 0 && (
            <button
              onClick={() => setSwapping((v) => !v)}
              className="inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-[12px] font-semibold transition-colors sm:py-1"
              style={swapping ? { background: "var(--v-surface2)", borderColor: "var(--v-ink)", color: "var(--v-ink)" } : { ...line, color: "var(--v-accent)" }}
            >
              <ArrowLeftRight size={12} /> Swap
            </button>
          )}
        </div>
      </div>

      {!c ? (
        <p className="mt-3 text-[14px]" style={ink2}>Nobody passes the rules for this slot. Loosen filters in the role tab.</p>
      ) : (
        <>
          <button onClick={() => onOpen(member.role_id, c)} className="-mx-2 mt-3 flex w-[calc(100%+1rem)] items-center gap-3 rounded-2xl p-2 text-left transition-colors hover:bg-[var(--v-surface2)] sm:-mx-2.5 sm:w-[calc(100%+1.25rem)] sm:p-2.5">
            <Avatar c={c} size={44} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate text-[15px] font-bold">{c.name}</span>
                <span className="shrink-0 text-[12px] font-semibold" style={ink2}>{c.seniority}</span>
              </div>
              <div className="truncate text-[13px]" style={ink2}>{c.position} · {c.location}</div>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1"><Segments c={c} compact /><Availability code={c.availability_code} short /></div>
            </div>
            <span className="shrink-0 text-[16px] font-bold sm:text-[17px]">{c.fit}%</span>
          </button>

          {member.mentor && (
            <div className="mt-2 flex items-start gap-1.5 rounded-xl px-3 py-1.5 text-[12px] sm:items-center" style={{ background: "var(--v-surface2)", color: "var(--v-ink2)" }}>
              <Users size={13} className="mt-0.5 shrink-0 sm:mt-0" style={{ color: "var(--v-accent)" }} />
              <span>{member.team_role === "learner" ? "Mentored by" : "Paired with"} <b style={{ color: "var(--v-ink)" }}>{member.mentor.name}</b> ({member.mentor.seniority} · {member.mentor.slot_label})</span>
            </div>
          )}

          {swapping && (
            <div className="mt-3 border-t pt-3 space-y-2 fade-in" style={line}>
              <div className="flex flex-wrap items-center justify-between gap-2 text-[12px] font-semibold" style={ink2}>
                <span>Alternatives for {member.slot_label}</span>
                <button onClick={() => m.setTab(member.role_id)} className="inline-flex items-center gap-1" style={{ color: "var(--v-accent)" }}>All candidates <ArrowRight size={12} /></button>
              </div>
              {member.swaps.map((sw) => (
                <div key={sw.candidate.employee_id} className="flex items-center justify-between gap-2.5 rounded-xl border p-2.5 text-[13px] sm:gap-3" style={line}>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      <span className="truncate font-bold">{sw.candidate.name}</span>
                      <span className="text-[12px]" style={ink2}>{sw.candidate.seniority} · {sw.candidate.fit}%</span>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {sw.impact.map((imp) => (
                        <span key={imp} className="rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{
                          background: imp.startsWith("Breaks") || imp.startsWith("Drops") ? "var(--v-warn-soft)" : imp.startsWith("Ready") || imp.startsWith("Fixes") || imp.startsWith("+") ? "var(--v-good-soft)" : "var(--v-surface2)",
                          color: imp.startsWith("Breaks") || imp.startsWith("Drops") ? "var(--v-warn)" : imp.startsWith("Ready") || imp.startsWith("Fixes") || imp.startsWith("+") ? "var(--v-good)" : "var(--v-ink2)",
                        }}>{imp}</span>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={() => { m.swapMember(member.slot_id, sw.candidate.employee_id); setSwapping(false); }}
                    className="shrink-0 rounded-full px-3.5 py-2 text-[12px] font-semibold text-white sm:px-3 sm:py-1.5"
                    style={{ background: "var(--v-accent)" }}
                  >
                    Use
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Team({ m, onOpen }: { m: Matcher; onOpen: (roleId: string, c: Candidate) => void }) {
  const [editShape, setEditShape] = useState(false);
  const [showAllChecks, setShowAllChecks] = useState(false);
  const t = m.result!.team!;
  const opt: TeamOption | null = m.activeTeamOption;
  const review = m.review;
  const lockCount = Object.keys(m.locks).length;

  if (!opt) {
    return <p className="mt-7 text-[15px]" style={ink2}>No team options could be built with these rules.</p>;
  }

  const failedChecks = opt.shape.checks.filter((ch) => !ch.ok);
  const visibleChecks = showAllChecks ? opt.shape.checks : failedChecks;
  const bestIds = t.options[0]?.members.map((x) => x.candidate?.employee_id).join(",");
  const optIds = opt.members.map((x) => x.candidate?.employee_id).join(",");
  const sameAsBest = opt.id !== "best_fit" && bestIds === optIds;

  return (
    <div className="mt-5 space-y-4 fade-in sm:mt-7 sm:space-y-5">
      <div className="grid gap-3 md:grid-cols-3">
        {t.options.map((o) => {
          const active = o.id === opt.id;
          return (
            <button
              key={o.id}
              onClick={() => m.setTeamOption(o.id)}
              className="rounded-[var(--v-radius)] border p-3.5 text-left transition-all sm:p-4"
              style={active ? { background: "#fff", borderColor: "var(--v-accent)", boxShadow: "0 0 0 1px var(--v-accent)" } : { background: "rgba(255,255,255,.65)", ...line }}
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-[15px] font-bold sm:text-[16px]" style={{ color: active ? "var(--v-accent)" : "var(--v-ink)" }}>{o.label}</span>
                <span className="text-[19px] font-bold sm:text-[20px]">{o.avg_fit}%</span>
              </div>
              <div className="mt-1 text-[13px]" style={ink2}>{o.shape.summary}</div>
              <div className="mt-1.5 flex items-center justify-between text-[12px] font-semibold" style={{ color: o.ready_now_count === o.slots_filled ? "var(--v-good)" : "var(--v-ink2)" }}>
                <span>{o.ready_by}</span>
                <span>{o.slots_filled}/{o.slots_total} filled</span>
              </div>
            </button>
          );
        })}
      </div>

      <div className="rounded-[var(--v-radius)] border bg-white p-4 space-y-4 sm:p-5" style={line}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px] sm:gap-x-6 sm:text-[14px]">
            <span className="inline-flex items-center gap-1.5 font-semibold" style={{ color: opt.shape.balanced ? "var(--v-good)" : "var(--v-ink)" }}>
              <ShieldCheck size={16} className="shrink-0" style={{ color: opt.shape.balanced ? "var(--v-good)" : "var(--v-accent)" }} />
              {opt.shape.summary}
            </span>
            <span className="inline-flex items-center gap-1.5" style={ink2}>
              <Globe size={15} className="shrink-0" /> {opt.shared_languages.length ? opt.shared_languages.slice(0, 2).join(", ") : "No shared B2+ language"}
            </span>
            <span className="inline-flex items-center gap-1.5" style={ink2}>
              <Clock size={15} className="shrink-0" /> {opt.tz_summary}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {lockCount > 0 && (
              <button onClick={m.clearLocks} className="inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-[12px] font-semibold" style={{ ...line, color: "var(--v-ink2)" }}>
                <Unlock size={12} /> Clear {lockCount} lock{lockCount > 1 ? "s" : ""}
              </button>
            )}
            <button onClick={() => setEditShape((v) => !v)} className="inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[13px] font-semibold" style={editShape ? { background: "var(--v-accent-soft)", borderColor: "var(--v-accent)", color: "var(--v-accent)" } : { ...line, color: "var(--v-accent)" }}>
              <SlidersHorizontal size={13} /> Edit shape
            </button>
          </div>
        </div>

        {opt.team_needs.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 border-t pt-3.5" style={line}>
            <span className="text-[12px] font-bold" style={ink2}>Whole-team needs</span>
            {opt.team_needs.map((tn) => (
              <span
                key={tn.id}
                title={tn.members.length ? `Covered by: ${tn.members.join(", ")}` : "Not yet covered"}
                className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[13px] font-semibold"
                style={{
                  borderColor: tn.ok ? "var(--v-good)" : "var(--v-warn)",
                  background: tn.ok ? "var(--v-good-soft)" : "var(--v-warn-soft)",
                  color: tn.ok ? "var(--v-good)" : "var(--v-warn)",
                }}
              >
                {tn.ok ? <Check size={13} strokeWidth={3} /> : <AlertCircle size={13} />}
                <span>{tn.label}</span>
                <span className="opacity-80">{tn.covered}/{tn.target}</span>
                <button onClick={() => m.editTeamNeed(tn.id, null)} title="Remove team need" className="ml-0.5 opacity-60 hover:opacity-100"><X size={12} /></button>
              </span>
            ))}
          </div>
        )}

        {opt.shape.checks.length > 0 && (
          <div className="border-t pt-3.5 space-y-1.5" style={line}>
            {visibleChecks.map((ch) => (
              <div key={ch.rule} className="flex items-start gap-2 text-[13px]" style={{ color: ch.ok ? "var(--v-ink2)" : "var(--v-warn)" }}>
                {ch.ok ? <CheckCircle2 size={14} className="mt-0.5 shrink-0" style={{ color: "var(--v-good)" }} /> : <AlertCircle size={14} className="mt-0.5 shrink-0" />}
                <span><b style={{ color: ch.ok ? "var(--v-ink)" : "var(--v-warn)" }}>{ch.label}:</b> {ch.detail}</span>
              </div>
            ))}
            <button onClick={() => setShowAllChecks((v) => !v)} className="text-[12px] font-semibold" style={{ color: "var(--v-accent)" }}>
              {showAllChecks ? "Hide passing rules" : failedChecks.length ? `Show all ${opt.shape.checks.length} balance rules` : `All ${opt.shape.checks.length} balance rules met — inspect`}
            </button>
          </div>
        )}

        {sameAsBest && (
          <p className="text-[13px]" style={ink2}>
            {opt.id === "ready_now" ? "Same people as Best fit — everyone is already available now." : "Same people as Best fit — this mix is already as lean as the rules allow."}
          </p>
        )}
      </div>

      {editShape && (
        <ShapeEditor shape={m.teamShape ?? t.shape} onChange={m.updateTeamShape} onReset={m.resetTeamShape} hasCustom={m.teamShape !== null} />
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {opt.members.map((member) => (
          <SlotCard key={member.slot_id} member={member} m={m} onOpen={onOpen} />
        ))}
      </div>

      <div className="rounded-[var(--v-radius)] border bg-white p-4 sm:p-6" style={line}>
        <div className="flex items-center gap-2 text-[14px] font-bold" style={{ color: "var(--v-accent)" }}><Sparkles size={15} /> Team check</div>
        {review === "loading" && <div className="mt-3 flex items-center gap-2 text-[14px]" style={ink2}><Spinner /> Reviewing the team…</div>}
        {review && review !== "loading" && !review.ok && <p className="mt-2 text-[14px]" style={ink2}>{review.error}</p>}
        {review && review !== "loading" && review.ok && (
          <div className="mt-2 space-y-4 text-[14px] leading-6 sm:text-[15px] sm:leading-7">
            <p>{review.summary}</p>
            <div className="grid gap-3.5 sm:gap-4 md:grid-cols-2">
              {!!review.risks?.length && <div className="rounded-2xl p-4" style={{ background: "var(--v-warn-soft)" }}><div className="text-[13px] font-bold" style={{ color: "var(--v-warn)" }}>Watch out</div><ul className="mt-1 list-disc space-y-1 pl-5 text-[14px] leading-6">{review.risks.map((x) => <li key={x}>{x}</li>)}</ul></div>}
              {!!review.suggestions?.length && <div className="rounded-2xl p-4" style={{ background: "var(--v-good-soft)" }}><div className="text-[13px] font-bold" style={{ color: "var(--v-good)" }}>Next steps</div><ul className="mt-1 list-disc space-y-1 pl-5 text-[14px] leading-6">{review.suggestions.map((x) => <li key={x}>{x}</li>)}</ul></div>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// --------------------------------------------------------------- loading
function Loading({ m }: { m: Matcher }) {
  const steps = [
    { key: "interpreting", label: "Reading your brief", sub: "Turning it into must-haves, nice-to-haves and rules" },
    { key: "searching", label: `Looking through ${m.meta ? fmt.format(m.meta.profiles) : "all"} colleagues`, sub: "Matching by what people have done, not by keywords" },
  ];
  const idx = steps.findIndex((s) => s.key === m.phase);
  return (
    <main className="mx-auto max-w-xl px-4 py-12 fade-in sm:px-6 sm:py-20">
      <div className="rounded-[22px] border bg-white p-5 sm:p-6" style={line}>
        {m.brief && <p className="line-clamp-3 text-[15px] italic leading-6" style={ink2}>“{m.brief}”</p>}
        <ol className="mt-5 space-y-5 sm:mt-6">
          {steps.map((s, i) => (
            <li key={s.key} className="flex gap-3" style={{ opacity: i > idx ? 0.4 : 1 }}>
              <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full" style={{ background: i < idx ? "var(--v-accent)" : "var(--v-accent-soft)", color: i < idx ? "#fff" : "var(--v-accent)" }}>
                {i < idx ? <Check size={14} strokeWidth={3} /> : i === idx ? <Spinner /> : null}
              </span>
              <div className="min-w-0"><div className="text-[15px] font-bold sm:text-[16px]">{s.label}</div><div className="text-[13px] sm:text-[14px]" style={ink2}>{s.sub}</div></div>
            </li>
          ))}
        </ol>
      </div>
    </main>
  );
}
