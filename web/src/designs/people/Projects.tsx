import {
  ArrowLeft,
  ArrowLeftRight,
  ArrowRight,
  Briefcase,
  Building2,
  Check,
  Clock,
  FolderKanban,
  FolderPlus,
  Globe,
  Minus,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserMinus,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { Matcher } from "../../core/useMatcher";
import type { Candidate, Project, ProjectMember, ProjectStatus, RoleSpec } from "../../types";
import { Availability, Avatar, Pill } from "./PeopleApp";
import { Profile } from "./Profile";

const ink2 = { color: "var(--v-ink2)" };
const line = { borderColor: "var(--v-line)" };

export const STATUS_META: Record<ProjectStatus, { label: string; bg: string; fg: string }> = {
  draft: { label: "Draft", bg: "var(--v-surface2)", fg: "var(--v-ink2)" },
  active: { label: "Hiring", bg: "var(--v-accent-soft)", fg: "var(--v-accent)" },
  staffed: { label: "Staffed", bg: "var(--v-good-soft)", fg: "var(--v-good)" },
  archived: { label: "Archived", bg: "var(--v-surface2)", fg: "var(--v-ink2)" },
};

const ROLE_BADGE: Record<string, { label: string; bg: string; fg: string }> = {
  anchor: { label: "Anchor", bg: "var(--v-accent-soft)", fg: "var(--v-accent)" },
  builder: { label: "Builder", bg: "var(--v-surface2)", fg: "var(--v-ink2)" },
  learner: { label: "Learner", bg: "var(--v-good-soft)", fg: "var(--v-good)" },
};

export function StatusBadge({ status }: { status: ProjectStatus }) {
  const s = STATUS_META[status] ?? STATUS_META.active;
  return (
    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold" style={{ background: s.bg, color: s.fg }}>
      {s.label}
    </span>
  );
}

function relativeTime(iso: string): string {
  const ts = Date.parse(iso);
  if (Number.isNaN(ts)) return "";
  const sec = Math.max(0, Math.round((Date.now() - ts) / 1000));
  if (sec < 60) return "Just now";
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  const days = Math.floor(sec / 86400);
  if (days < 7) return `${days}d ago`;
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function Spinner() {
  return <span className="inline-block size-4 animate-spin rounded-full border-2 border-current border-r-transparent" />;
}

// ------------------------------------------------------ home strip
export function HomeProjectsStrip({ m }: { m: Matcher }) {
  if (m.projects.length === 0) return null;
  const shown = m.projects.slice(0, 4);
  return (
    <section className="mt-10 fade-in">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-[13px] font-bold" style={ink2}>
          <FolderKanban size={15} style={{ color: "var(--v-accent)" }} />
          Or open &amp; modify an existing project ({m.projects.length})
        </div>
        <button onClick={m.goProjects} className="inline-flex items-center gap-1 text-[13px] font-semibold" style={{ color: "var(--v-accent)" }}>
          View all <ArrowRight size={14} />
        </button>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {shown.map((p) => {
          const total = p.stats?.slots_total ?? p.spec.roles.reduce((a, r) => a + r.count, 0);
          const filled = p.members.length;
          return (
            <div
              key={p.id}
              className="group flex flex-col justify-between rounded-2xl border bg-white p-4 transition-colors hover:border-[var(--v-accent)]"
              style={line}
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <button onClick={() => m.openProject(p.id)} className="min-w-0 text-left">
                    <div className="truncate text-[15px] font-bold group-hover:text-[var(--v-accent)]">{p.title}</div>
                    {p.client && <div className="truncate text-[12px]" style={ink2}>{p.client}</div>}
                  </button>
                  <StatusBadge status={p.status} />
                </div>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {p.members.length > 0 ? (
                      <div className="flex -space-x-1.5">
                        {p.members.slice(0, 4).map((mem) => (
                          <span key={mem.slot_id} title={`${mem.name} (${mem.slot_label})`} className="rounded-full ring-2 ring-white">
                            <Avatar c={mem} size={26} />
                          </span>
                        ))}
                        {p.members.length > 4 && (
                          <span className="grid size-[26px] place-items-center rounded-full text-[11px] font-bold ring-2 ring-white" style={{ background: "var(--v-surface2)", color: "var(--v-ink2)" }}>
                            +{p.members.length - 4}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-[12px]" style={ink2}>No team assigned yet</span>
                    )}
                    <span className="truncate text-[12px] font-semibold" style={ink2}>
                      {filled}/{total} filled{p.stats?.avg_fit ? ` · ${p.stats.avg_fit}% fit` : ""}
                    </span>
                  </div>
                  <span className="shrink-0 text-[11px]" style={ink2}>{relativeTime(p.updated_at)}</span>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2 border-t pt-2.5" style={line}>
                <button
                  onClick={() => m.openProject(p.id)}
                  className="inline-flex flex-1 items-center justify-center gap-1 rounded-full border px-3 py-1.5 text-[12px] font-semibold sm:flex-none"
                  style={{ ...line, color: "var(--v-ink)" }}
                >
                  Details
                </button>
                <button
                  onClick={() => m.modifyProject(p)}
                  className="inline-flex flex-1 items-center justify-center gap-1 rounded-full px-3 py-1.5 text-[12px] font-semibold sm:flex-none"
                  style={{ background: "var(--v-accent-soft)", color: "var(--v-accent)" }}
                >
                  <Pencil size={12} /> Modify team
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// --------------------------------------------------- projects list
export function ProjectsList({ m }: { m: Matcher }) {
  const [filter, setFilter] = useState<ProjectStatus | "all">("all");
  const [query, setQuery] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return m.projects.filter((p) => {
      if (filter !== "all" && p.status !== filter) return false;
      if (!q) return true;
      return (
        p.title.toLowerCase().includes(q) ||
        p.client.toLowerCase().includes(q) ||
        p.spec.roles.some((r) => r.title.toLowerCase().includes(q)) ||
        p.members.some((mem) => mem.name.toLowerCase().includes(q))
      );
    });
  }, [m.projects, filter, query]);

  return (
    <main className="mx-auto max-w-6xl px-4 pb-24 pt-6 fade-in sm:px-6 sm:pt-10">
      <div className="flex flex-col items-stretch justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="v-display text-[28px] font-bold leading-9 tracking-tight sm:text-[34px] sm:leading-10">Projects &amp; Teams</h1>
          <p className="mt-2 max-w-2xl text-[15px] leading-6 sm:text-[16px] sm:leading-7" style={ink2}>
            Saved projects and their chosen teams. Open any project to inspect the roster, replace members, add roles, or refine requirements.
          </p>
        </div>
        <button
          onClick={m.startNewSearch}
          className="inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-full px-5 py-3 text-[14px] font-semibold text-white sm:w-auto sm:py-2.5"
          style={{ background: "var(--v-accent)" }}
        >
          <Plus size={16} /> New project &amp; team
        </button>
      </div>

      {m.projects.length > 0 && (
        <div className="mt-5 flex flex-col gap-3 sm:mt-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="no-scrollbar -mx-4 flex flex-nowrap gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
            {(["all", "active", "staffed", "draft", "archived"] as const).map((st) => {
              const count = st === "all" ? m.projects.length : m.projects.filter((p) => p.status === st).length;
              if (st !== "all" && count === 0) return null;
              const label = st === "all" ? "All" : STATUS_META[st].label;
              return (
                <span key={st} className="shrink-0">
                  <Pill active={filter === st} onClick={() => setFilter(st)}>
                    {label} <span className="opacity-75">({count})</span>
                  </Pill>
                </span>
              );
            })}
          </div>
          <label className="flex w-full items-center gap-2 rounded-full border bg-white px-4 py-2 text-[16px] sm:w-64 sm:text-[14px]" style={line}>
            <Search size={15} style={ink2} className="shrink-0" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter projects, clients, members…"
              className="min-w-0 flex-1 bg-transparent outline-none"
            />
            {query && (
              <button onClick={() => setQuery("")} style={ink2}><X size={14} /></button>
            )}
          </label>
        </div>
      )}

      {m.projectsLoading ? (
        <div className="mt-16 flex items-center justify-center gap-2 text-[15px]" style={ink2}>
          <Spinner /> Loading saved projects…
        </div>
      ) : m.projects.length === 0 ? (
        <div className="mt-10 rounded-[22px] border border-dashed bg-white p-8 text-center sm:mt-12 sm:p-12" style={line}>
          <FolderKanban size={36} className="mx-auto" style={{ color: "var(--v-accent)" }} />
          <h2 className="mt-4 text-[19px] font-bold sm:text-[20px]">No saved projects yet</h2>
          <p className="mx-auto mt-2 max-w-md text-[14px] leading-6 sm:text-[15px]" style={ink2}>
            Describe a role or team to find colleagues, then click <b>Save as project</b> to keep the brief and chosen team here.
          </p>
          <button
            onClick={m.startNewSearch}
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full px-6 py-3 text-[15px] font-semibold text-white sm:w-auto"
            style={{ background: "var(--v-accent)" }}
          >
            Find people &amp; build a team <ArrowRight size={16} />
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="mt-10 rounded-[22px] border border-dashed bg-white p-8 text-center text-[15px] sm:p-10" style={{ ...line, ...ink2 }}>
          No projects match your filter.
        </div>
      ) : (
        <div className="mt-5 grid gap-4 sm:mt-6 sm:gap-5 md:grid-cols-2">
          {filtered.map((p) => {
            const total = p.stats?.slots_total ?? p.spec.roles.reduce((a, r) => a + r.count, 0);
            const filled = p.members.length;
            return (
              <article
                key={p.id}
                className="flex flex-col justify-between rounded-[var(--v-radius)] border bg-white p-4 shadow-[0_1px_2px_rgba(31,35,40,.04),0_8px_24px_rgba(31,35,40,.05)] transition-shadow hover:shadow-[0_1px_2px_rgba(31,35,40,.04),0_14px_32px_rgba(31,35,40,.10)] sm:p-6"
                style={line}
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <button onClick={() => m.openProject(p.id)} className="min-w-0 text-left">
                      <h2 className="text-[19px] font-bold leading-6 hover:text-[var(--v-accent)]">{p.title}</h2>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-[13px]" style={ink2}>
                        {p.client && (
                          <span className="inline-flex items-center gap-1">
                            <Building2 size={13} /> {p.client}
                          </span>
                        )}
                        <span>Updated {relativeTime(p.updated_at)}</span>
                      </div>
                    </button>
                    <StatusBadge status={p.status} />
                  </div>

                  {p.spec.summary && (
                    <p className="mt-3 line-clamp-2 text-[14px] leading-6" style={ink2}>{p.spec.summary}</p>
                  )}

                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {p.spec.roles.map((r) => (
                      <span key={r.id} className="rounded-full px-2.5 py-1 text-[12px] font-semibold" style={{ background: "var(--v-surface2)", color: "var(--v-ink)" }}>
                        {r.title}{r.count > 1 ? ` ×${r.count}` : ""}
                      </span>
                    ))}
                  </div>

                  <div className="mt-4 rounded-2xl p-3.5" style={{ background: "var(--v-surface2)" }}>
                    <div className="flex items-center justify-between gap-2 text-[13px] font-semibold">
                      <span>{filled}/{total} seats filled</span>
                      <span style={{ color: "var(--v-accent)" }}>
                        {p.stats?.avg_fit ? `${p.stats.avg_fit}% avg fit` : "—"}
                        {p.stats?.ready_by ? ` · ${p.stats.ready_by}` : ""}
                      </span>
                    </div>
                    {p.members.length > 0 ? (
                      <div className="mt-2.5 flex flex-wrap items-center gap-2">
                        {p.members.slice(0, 5).map((mem) => (
                          <span key={mem.slot_id} className="inline-flex items-center gap-1.5 rounded-full bg-white py-1 pl-1 pr-2.5 text-[12px] font-medium border" style={line}>
                            <Avatar c={mem} size={22} />
                            <span className="max-w-[120px] truncate">{mem.name}</span>
                          </span>
                        ))}
                        {p.members.length > 5 && (
                          <span className="text-[12px] font-semibold" style={ink2}>+{p.members.length - 5} more</span>
                        )}
                      </div>
                    ) : (
                      <p className="mt-1.5 text-[13px]" style={ink2}>No colleagues assigned yet.</p>
                    )}
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap gap-2">
                    <Pill onClick={() => m.openProject(p.id)}>View project</Pill>
                    <button
                      onClick={() => m.modifyProject(p)}
                      className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[14px] font-semibold text-white"
                      style={{ background: "var(--v-accent)" }}
                    >
                      <Pencil size={14} /> Modify team
                    </button>
                  </div>
                  {confirmDelete === p.id ? (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => { m.deleteProject(p.id); setConfirmDelete(null); }}
                        className="rounded-full px-3 py-1.5 text-[12px] font-semibold text-white"
                        style={{ background: "var(--v-bad)" }}
                      >
                        Delete
                      </button>
                      <button onClick={() => setConfirmDelete(null)} className="rounded-full px-2.5 py-1.5 text-[12px] font-semibold" style={ink2}>
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDelete(p.id)}
                      title="Delete project"
                      className="rounded-full p-2 transition-colors hover:bg-[var(--v-bad-soft)]"
                      style={ink2}
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
}

// -------------------------------------------------- project detail
export function ProjectDetail({ m }: { m: Matcher }) {
  const project = m.activeProject;
  const [editingMeta, setEditingMeta] = useState(false);
  const [title, setTitle] = useState("");
  const [client, setClient] = useState("");
  const [status, setStatus] = useState<ProjectStatus>("active");
  const [summary, setSummary] = useState("");
  const [notes, setNotes] = useState("");
  const [showBrief, setShowBrief] = useState(false);
  const [addingRoleOpen, setAddingRoleOpen] = useState(false);
  const [newRoleText, setNewRoleText] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [openProfile, setOpenProfile] = useState<{ role: RoleSpec; c: Candidate } | null>(null);
  const [loadingProfileId, setLoadingProfileId] = useState<string | null>(null);

  useEffect(() => {
    if (!project) return;
    setTitle(project.title);
    setClient(project.client);
    setStatus(project.status);
    setSummary(project.spec.summary);
    setNotes(project.notes);
    setEditingMeta(false);
    setConfirmDelete(false);
  }, [project?.id, project?.updated_at]);

  if (m.projectsLoading) {
    return (
      <main className="mx-auto max-w-5xl px-6 py-24 text-center">
        <div className="inline-flex items-center gap-2 text-[15px]" style={ink2}><Spinner /> Loading project…</div>
      </main>
    );
  }

  if (!project) {
    return (
      <main className="mx-auto max-w-xl px-6 py-24 text-center">
        <h1 className="v-display text-[26px] font-bold">Project not found</h1>
        <p className="mt-2 text-[15px]" style={ink2}>It may have been deleted or the link is outdated.</p>
        <div className="mt-6 flex justify-center gap-2">
          <Pill onClick={m.goProjects}><ArrowLeft size={15} /> All projects</Pill>
          <Pill active onClick={m.startNewSearch}>Start a new search</Pill>
        </div>
      </main>
    );
  }

  const roleMap = Object.fromEntries(project.spec.roles.map((r) => [r.id, r]));
  const memberBySlot = Object.fromEntries(project.members.map((mem) => [mem.slot_id, mem]));
  const allSlots: { slot_id: string; role: RoleSpec; slot_label: string; member?: ProjectMember }[] = [];
  for (const r of project.spec.roles) {
    for (let k = 0; k < r.count; k++) {
      const sid = `${r.id}#${k}`;
      allSlots.push({
        slot_id: sid,
        role: r,
        slot_label: r.count === 1 ? r.title : `${r.title} ${k + 1}`,
        member: memberBySlot[sid],
      });
    }
  }
  const multi = project.spec.roles.length > 1 || project.spec.roles.some((r) => r.count > 1);
  const filledCount = allSlots.filter((s) => s.member).length;

  const saveMeta = async () => {
    const cleanTitle = title.trim() || project.title;
    await m.updateProjectMeta(project.id, {
      title: cleanTitle,
      client: client.trim(),
      status,
      notes,
      spec: { ...project.spec, title: cleanTitle, summary: summary.trim() },
    }, "Project details updated");
    setEditingMeta(false);
  };

  const removeMember = async (slotId: string) => {
    const nextMembers = project.members.filter((mem) => mem.slot_id !== slotId);
    const nextLocks = { ...project.locks };
    delete nextLocks[slotId];
    await m.updateProjectMeta(project.id, { members: nextMembers, locks: nextLocks }, "Removed member from slot");
  };

  const changeRoleSeats = async (roleId: string, delta: number) => {
    const target = roleMap[roleId];
    if (!target) return;
    const nextCount = Math.max(1, Math.min(10, target.count + delta));
    if (nextCount === target.count) return;
    const nextSpec = {
      ...project.spec,
      roles: project.spec.roles.map((r) => (r.id === roleId ? { ...r, count: nextCount } : r)),
    };
    const nextMembers = project.members.filter((mem) => {
      const [rid, idx] = mem.slot_id.split("#");
      return !(rid === roleId && Number(idx) >= nextCount);
    });
    const nextLocks: Record<string, string> = {};
    for (const [sid, eid] of Object.entries(project.locks)) {
      const [rid, idx] = sid.split("#");
      if (rid === roleId && Number(idx) >= nextCount) continue;
      nextLocks[sid] = eid;
    }
    await m.updateProjectMeta(project.id, { spec: nextSpec, members: nextMembers, locks: nextLocks }, "Updated role headcount");
  };

  const deleteRole = async (roleId: string) => {
    if (project.spec.roles.length <= 1) return;
    const nextSpec = { ...project.spec, roles: project.spec.roles.filter((r) => r.id !== roleId) };
    const nextMembers = project.members.filter((mem) => mem.role_id !== roleId);
    const nextLocks: Record<string, string> = {};
    for (const [sid, eid] of Object.entries(project.locks)) {
      if (!sid.startsWith(`${roleId}#`)) nextLocks[sid] = eid;
    }
    await m.updateProjectMeta(project.id, { spec: nextSpec, members: nextMembers, locks: nextLocks }, "Removed role");
  };

  const openMemberProfile = async (role: RoleSpec, member: ProjectMember) => {
    setLoadingProfileId(member.slot_id);
    const card = await m.candidateForRole(role, member.employee_id);
    setLoadingProfileId(null);
    if (card) {
      setOpenProfile({ role, c: card });
      m.explainForRole(role, member.employee_id);
    }
  };

  const submitAddRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newRoleText.trim().length < 4 || m.addingRole) return;
    const ok = await m.addRoleFromBrief(newRoleText, project);
    if (ok) {
      setNewRoleText("");
      setAddingRoleOpen(false);
    }
  };

  return (
    <main className="mx-auto max-w-6xl px-4 pb-24 pt-5 fade-in sm:px-6 sm:pt-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <button onClick={m.goProjects} className="inline-flex items-center gap-1.5 self-start text-[14px] font-semibold" style={{ color: "var(--v-accent)" }}>
          <ArrowLeft size={15} /> All projects
        </button>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => m.modifyProject(project)}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-full px-5 py-2.5 text-[14px] font-semibold text-white sm:order-2 sm:w-auto sm:py-2"
            style={{ background: "var(--v-accent)" }}
          >
            <Users size={15} /> Modify team &amp; find candidates
          </button>
          <button
            onClick={() => setEditingMeta((v) => !v)}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full border bg-white px-4 py-2 text-[13px] font-semibold sm:order-1 sm:flex-none"
            style={{ ...line, color: "var(--v-ink)" }}
          >
            <Pencil size={13} /> {editingMeta ? "Cancel edit" : "Edit details"}
          </button>
          {confirmDelete ? (
            <div className="flex items-center gap-1.5 rounded-full border bg-white px-3 py-1 sm:order-3" style={line}>
              <span className="text-[12px] font-semibold" style={{ color: "var(--v-bad)" }}>Delete project?</span>
              <button onClick={() => m.deleteProject(project.id)} className="rounded-full px-2.5 py-1 text-[12px] font-semibold text-white" style={{ background: "var(--v-bad)" }}>
                Yes
              </button>
              <button onClick={() => setConfirmDelete(false)} className="px-2 py-1 text-[12px] font-semibold" style={ink2}>No</button>
            </div>
          ) : (
            <button onClick={() => setConfirmDelete(true)} title="Delete project" className="rounded-full border bg-white p-2 sm:order-3" style={{ ...line, ...ink2 }}>
              <Trash2 size={15} />
            </button>
          )}
        </div>
      </div>

      {/* Project header / metadata card */}
      <section className="mt-4 rounded-[var(--v-radius)] border bg-white p-4 sm:mt-5 sm:p-6" style={line}>
        {editingMeta ? (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <label className="sm:col-span-2 block">
                <span className="text-[12px] font-bold" style={ink2}>Project title</span>
                <input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1 w-full rounded-xl border px-3.5 py-2 text-[16px] font-semibold outline-none focus:border-[var(--v-accent)] sm:text-[15px]" style={line} />
              </label>
              <label className="block">
                <span className="text-[12px] font-bold" style={ink2}>Status</span>
                <select value={status} onChange={(e) => setStatus(e.target.value as ProjectStatus)} className="mt-1 w-full rounded-xl border bg-white px-3.5 py-2 text-[16px] font-semibold outline-none sm:text-[15px]" style={line}>
                  <option value="draft">Draft</option>
                  <option value="active">Hiring</option>
                  <option value="staffed">Staffed</option>
                  <option value="archived">Archived</option>
                </select>
              </label>
            </div>
            <label className="block">
              <span className="text-[12px] font-bold" style={ink2}>Client / Department</span>
              <input value={client} onChange={(e) => setClient(e.target.value)} placeholder="e.g. Santander, Public Sector, Internal" className="mt-1 w-full rounded-xl border px-3.5 py-2 text-[16px] outline-none focus:border-[var(--v-accent)] sm:text-[14px]" style={line} />
            </label>
            <label className="block">
              <span className="text-[12px] font-bold" style={ink2}>Summary</span>
              <textarea value={summary} onChange={(e) => setSummary(e.target.value)} rows={2} className="mt-1 w-full rounded-xl border px-3.5 py-2 text-[16px] outline-none focus:border-[var(--v-accent)] sm:text-[14px]" style={line} />
            </label>
            <label className="block">
              <span className="text-[12px] font-bold" style={ink2}>Notes</span>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Kickoff dates, hiring manager, delivery notes…" className="mt-1 w-full rounded-xl border px-3.5 py-2 text-[16px] outline-none focus:border-[var(--v-accent)] sm:text-[14px]" style={line} />
            </label>
            <div className="flex justify-end gap-2">
              <Pill onClick={() => setEditingMeta(false)}>Cancel</Pill>
              <Pill active onClick={saveMeta}>{m.savingProject ? "Saving…" : "Save details"}</Pill>
            </div>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-start justify-between gap-3 sm:gap-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="v-display text-[24px] font-bold leading-8 tracking-tight sm:text-[30px] sm:leading-9">{project.title}</h1>
                  <StatusBadge status={project.status} />
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px]" style={ink2}>
                  {project.client && <span className="inline-flex items-center gap-1 font-semibold"><Building2 size={14} /> {project.client}</span>}
                  <span>Updated {relativeTime(project.updated_at)}</span>
                  <span>{project.spec.roles.length} role{project.spec.roles.length !== 1 ? "s" : ""} · {allSlots.length} seat{allSlots.length !== 1 ? "s" : ""}</span>
                </div>
              </div>
              <select
                aria-label="Project status"
                value={project.status}
                onChange={(e) => m.updateProjectMeta(project.id, { status: e.target.value as ProjectStatus }, "Status updated")}
                className="rounded-full border bg-white px-3.5 py-1.5 text-[15px] font-semibold outline-none sm:text-[13px]"
                style={{ ...line, color: "var(--v-accent)" }}
              >
                <option value="draft">Draft</option>
                <option value="active">Hiring</option>
                <option value="staffed">Staffed</option>
                <option value="archived">Archived</option>
              </select>
            </div>

            {project.spec.summary && <p className="mt-3 text-[15px] leading-6 sm:leading-7" style={ink2}>{project.spec.summary}</p>}
            {project.notes && (
              <div className="mt-3 rounded-2xl p-3.5 text-[14px] leading-6" style={{ background: "var(--v-surface2)" }}>
                <span className="text-[12px] font-bold uppercase tracking-wide" style={ink2}>Notes</span>
                <p className="mt-0.5 whitespace-pre-line">{project.notes}</p>
              </div>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 border-t pt-4 text-[13px] sm:gap-x-6 sm:text-[14px]" style={line}>
              <span className="inline-flex items-center gap-1.5 font-semibold" style={{ color: filledCount === allSlots.length ? "var(--v-good)" : "var(--v-ink)" }}>
                <ShieldCheck size={16} style={{ color: filledCount === allSlots.length ? "var(--v-good)" : "var(--v-accent)" }} />
                {filledCount}/{allSlots.length} filled{project.stats?.avg_fit ? ` · ${project.stats.avg_fit}% avg fit` : ""}
              </span>
              {project.stats?.shape_summary && <span style={ink2}>{project.stats.shape_summary}</span>}
              {project.stats?.ready_by && <span style={ink2}>{project.stats.ready_by}</span>}
              {!!project.stats?.shared_languages?.length && (
                <span className="inline-flex items-center gap-1.5" style={ink2}>
                  <Globe size={14} /> {project.stats.shared_languages.slice(0, 2).join(", ")}
                </span>
              )}
              {project.stats?.tz_summary && (
                <span className="inline-flex items-center gap-1.5" style={ink2}>
                  <Clock size={14} /> {project.stats.tz_summary}
                </span>
              )}
            </div>

            {(project.spec.team_needs?.length ?? 0) > 0 && (
              <div className="mt-3 flex flex-wrap items-center gap-2 border-t pt-3.5" style={line}>
                <span className="text-[12px] font-bold" style={ink2}>Whole-team needs</span>
                {project.spec.team_needs!.map((tn) => (
                  <span key={tn.id} className="rounded-full px-3 py-1 text-[12px] font-semibold" style={{ background: "var(--v-accent-soft)", color: "var(--v-accent)" }}>
                    {tn.label} ({tn.scope === "all" ? "everyone" : `≥ ${tn.min_people}`})
                  </span>
                ))}
              </div>
            )}

            {project.brief && (
              <div className="mt-3 border-t pt-3" style={line}>
                <button onClick={() => setShowBrief((v) => !v)} className="text-[12px] font-semibold" style={{ color: "var(--v-accent)" }}>
                  {showBrief ? "Hide original brief" : "Show original brief"}
                </button>
                {showBrief && <p className="mt-2 whitespace-pre-line rounded-xl p-3 text-[13px] italic leading-6" style={{ background: "var(--v-surface2)", ...ink2 }}>{project.brief}</p>}
              </div>
            )}
          </>
        )}
      </section>

      {/* Chosen Team roster */}
      <section className="mt-7 sm:mt-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-[19px] font-bold sm:text-[20px]">Chosen team</h2>
            <p className="text-[13px]" style={ink2}>Tap any colleague to inspect live CV evidence, or replace them while keeping the rest of the team locked.</p>
          </div>
          {filledCount > 0 && (
            <button
              onClick={() => m.modifyProject(project, { clearAllLocks: true })}
              className="inline-flex items-center gap-1.5 rounded-full border bg-white px-3.5 py-2 text-[13px] font-semibold"
              style={{ ...line, color: "var(--v-accent)" }}
            >
              <Sparkles size={14} /> Re-optimise whole team
            </button>
          )}
        </div>

        <div className="mt-4 grid gap-3.5 sm:gap-4 md:grid-cols-2">
          {allSlots.map(({ slot_id, role, slot_label, member }) => {
            const badge = member ? ROLE_BADGE[member.team_role] ?? ROLE_BADGE.builder : null;
            return (
              <div
                key={slot_id}
                className={`rounded-[var(--v-radius)] border bg-white p-4 sm:p-5 ${member ? "" : "border-dashed"}`}
                style={line}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="truncate text-[15px] font-bold sm:text-[16px]">{slot_label}</span>
                    {badge && (
                      <span className="rounded-full px-2.5 py-0.5 text-[11px] font-bold" style={{ background: badge.bg, color: badge.fg }}>
                        {badge.label}
                      </span>
                    )}
                  </div>
                  {member ? (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() =>
                          m.modifyProject(project, {
                            unlockSlotId: slot_id,
                            focusTab: multi ? "team" : role.id,
                          })
                        }
                        title="Unlock this slot and find the best replacement while keeping everyone else"
                        className="inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-[12px] font-semibold"
                        style={{ ...line, color: "var(--v-accent)" }}
                      >
                        <ArrowLeftRight size={12} /> Replace
                      </button>
                      <button
                        onClick={() => removeMember(slot_id)}
                        title="Remove person from this slot"
                        className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1.5 text-[12px] font-semibold"
                        style={{ ...line, ...ink2 }}
                      >
                        <UserMinus size={12} />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => m.modifyProject(project, { focusTab: role.id })}
                      className="inline-flex items-center gap-1 rounded-full px-3.5 py-1.5 text-[12px] font-semibold text-white"
                      style={{ background: "var(--v-accent)" }}
                    >
                      <UserPlus size={12} /> Find candidate
                    </button>
                  )}
                </div>

                {member ? (
                  <>
                    <button
                      onClick={() => openMemberProfile(role, member)}
                      className="mt-3 flex w-full items-center gap-3 rounded-2xl p-2 -mx-2 text-left transition-colors hover:bg-[var(--v-surface2)] sm:p-2.5 sm:-mx-2.5"
                    >
                      <Avatar c={member} size={44} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-[15px] font-bold">{member.name}</span>
                          {member.seniority && <span className="shrink-0 text-[12px] font-semibold" style={ink2}>{member.seniority}</span>}
                        </div>
                        <div className="truncate text-[13px]" style={ink2}>
                          {member.position || member.role}{member.location ? ` · ${member.location}` : ""}
                        </div>
                        <div className="mt-1.5">
                          <Availability code={member.availability_code} short />
                        </div>
                      </div>
                      <span className="shrink-0 text-[16px] font-bold sm:text-[17px]">
                        {loadingProfileId === slot_id ? <Spinner /> : `${member.fit}%`}
                      </span>
                    </button>
                    {member.mentor_name && (
                      <div className="mt-2 flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[12px]" style={{ background: "var(--v-surface2)", ...ink2 }}>
                        <Users size={13} style={{ color: "var(--v-accent)" }} className="shrink-0" />
                        <span>{member.team_role === "learner" ? "Mentored by" : "Paired with"} <b style={{ color: "var(--v-ink)" }}>{member.mentor_name}</b></span>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="mt-3 text-[14px]" style={ink2}>Open seat — tap “Find candidate” to staff this slot from the 190,000-profile pool.</p>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Roles & criteria section */}
      <section className="mt-9 sm:mt-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-[19px] font-bold sm:text-[20px]">Roles &amp; requirements</h2>
            <p className="text-[13px]" style={ink2}>Adjust headcount, add a new role in plain language, or jump straight into any role’s candidate list.</p>
          </div>
          <button
            onClick={() => setAddingRoleOpen((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-full border bg-white px-4 py-2 text-[13px] font-semibold"
            style={{ ...line, color: "var(--v-accent)" }}
          >
            <Plus size={14} /> Add role
          </button>
        </div>

        {addingRoleOpen && (
          <form onSubmit={submitAddRole} className="mt-4 rounded-[var(--v-radius)] border bg-white p-4 fade-in" style={{ borderColor: "var(--v-accent)" }}>
            <div className="text-[13px] font-bold">Describe the role to add to “{project.title}”</div>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <input
                autoFocus
                value={newRoleText}
                onChange={(e) => setNewRoleText(e.target.value)}
                placeholder="e.g. A mid QA automation engineer with Selenium and Spanish B2+, available within 3 months"
                className="flex-1 rounded-xl border px-3.5 py-2.5 text-[16px] outline-none focus:border-[var(--v-accent)] sm:py-2 sm:text-[14px]"
                style={line}
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={newRoleText.trim().length < 4 || m.addingRole}
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full px-4 py-2.5 text-[13px] font-semibold text-white disabled:opacity-40 sm:flex-none sm:py-2"
                  style={{ background: "var(--v-accent)" }}
                >
                  {m.addingRole ? <><Spinner /> Adding…</> : <>Add &amp; match <ArrowRight size={14} /></>}
                </button>
                <button type="button" onClick={() => setAddingRoleOpen(false)} className="rounded-full px-3 py-2 text-[13px] font-semibold" style={ink2}>
                  Cancel
                </button>
              </div>
            </div>
          </form>
        )}

        <div className="mt-4 space-y-3">
          {project.spec.roles.map((r) => (
            <div key={r.id} className="rounded-[var(--v-radius)] border bg-white p-4 sm:p-5" style={line}>
              <div className="flex flex-wrap items-center justify-between gap-2.5 sm:gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[15px] font-bold sm:text-[16px]">{r.title}</span>
                  <div className="inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[12px] font-semibold sm:py-0.5" style={line}>
                    <button onClick={() => changeRoleSeats(r.id, -1)} disabled={r.count <= 1 || m.savingProject} className="p-0.5 disabled:opacity-30" title="Decrease seats">
                      <Minus size={12} />
                    </button>
                    <span className="px-1">{r.count} seat{r.count > 1 ? "s" : ""}</span>
                    <button onClick={() => changeRoleSeats(r.id, 1)} disabled={r.count >= 10 || m.savingProject} className="p-0.5 disabled:opacity-30" title="Increase seats">
                      <Plus size={12} />
                    </button>
                  </div>
                  <span className="text-[12px]" style={ink2}>
                    {r.availability === "now" ? "Available now" : r.availability === "soon" ? "Free < 3 months" : "Any availability"}
                    {r.min_years ? ` · ${r.min_years}+ yrs` : ""}
                    {r.seniority_min ? ` · ${r.seniority_min}${r.seniority_mode === "min" ? "+" : " (target)"}` : ""}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => m.modifyProject(project, { focusTab: r.id })}
                    className="inline-flex items-center gap-1 text-[13px] font-semibold"
                    style={{ color: "var(--v-accent)" }}
                  >
                    Search candidates <ArrowRight size={13} />
                  </button>
                  {project.spec.roles.length > 1 && (
                    <button onClick={() => deleteRole(r.id)} title="Remove role" className="rounded-full p-1.5 hover:bg-[var(--v-bad-soft)]" style={ink2}>
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
              {r.requirements.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {r.requirements.map((q) => (
                    <span
                      key={q.id}
                      className="inline-flex items-center gap-1 rounded-full border px-3 py-1 text-[12px] font-semibold"
                      style={
                        q.importance === "must"
                          ? { background: "var(--v-accent-soft)", borderColor: "transparent", color: "var(--v-ink)" }
                          : { ...line, color: "var(--v-ink2)" }
                      }
                    >
                      {q.importance === "must" && <Check size={12} style={{ color: "var(--v-accent)" }} />}
                      {q.label}
                      {q.importance !== "must" && <span className="text-[10px] uppercase">· nice</span>}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {openProfile && (
        <Profile
          c={openProfile.c}
          roleTitle={openProfile.role.title}
          exp={m.explanationForRole(openProfile.role, openProfile.c.employee_id)}
          onClose={() => setOpenProfile(null)}
        />
      )}
    </main>
  );
}

// ------------------------------------------------ save project modal
export function SaveProjectModal({
  m,
  mode = "new",
  onClose,
  onSaved,
}: {
  m: Matcher;
  mode?: "new" | "copy";
  onClose: () => void;
  onSaved?: (p: Project) => void;
}) {
  const spec = m.spec!;
  const isSingle = !m.result?.multi;
  const singleRole = spec.roles[0];
  const singleSlotId = singleRole ? `${singleRole.id}#0` : "r1#0";
  const explicitlyPickedSingle = Boolean(m.locks[singleSlotId]);
  const topSingle = m.result?.roles[0]?.candidates[0] ?? null;

  const [includeTop, setIncludeTop] = useState(true);
  const snap = useMemo(() => m.currentSnapshot(includeTop), [m, includeTop]);
  const allFilled = snap.stats.slots_total > 0 && snap.members.length >= snap.stats.slots_total;

  const [title, setTitle] = useState(mode === "copy" ? `${spec.title} (Copy)` : spec.title);
  const [client, setClient] = useState(mode === "copy" && m.activeProject ? m.activeProject.client : "");
  const [status, setStatus] = useState<ProjectStatus>(allFilled ? "staffed" : "active");
  const [notes, setNotes] = useState(mode === "copy" && m.activeProject ? m.activeProject.notes : "");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || m.savingProject) return;
    const saved = await m.saveAsNewProject({
      title: title.trim(),
      client: client.trim(),
      status,
      notes,
      includeTopIfUnselected: includeTop,
    });
    if (saved) {
      onSaved?.(saved);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="fade-in max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-[24px] border bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-[0_24px_60px_rgba(31,35,40,.22)] sm:rounded-[22px] sm:p-6"
        style={line}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="v-display text-[20px] font-bold sm:text-[22px]">{mode === "copy" ? "Save as a new project" : "Save project & team"}</h2>
            <p className="mt-1 text-[13px]" style={ink2}>
              Save the brief, requirements, and chosen colleagues so you can inspect or modify them anytime.
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-1.5" style={ink2}><X size={18} /></button>
        </div>

        <div className="mt-4 space-y-3.5 sm:mt-5 sm:space-y-4">
          <label className="block">
            <span className="text-[12px] font-bold" style={ink2}>Project name</span>
            <input
              autoFocus
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Core Banking Cloud Migration"
              className="mt-1 w-full rounded-xl border px-3.5 py-2.5 text-[16px] font-semibold outline-none focus:border-[var(--v-accent)] sm:text-[15px]"
              style={line}
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-[12px] font-bold" style={ink2}>Client / Department (optional)</span>
              <input
                value={client}
                onChange={(e) => setClient(e.target.value)}
                placeholder="e.g. Santander"
                className="mt-1 w-full rounded-xl border px-3.5 py-2 text-[16px] outline-none focus:border-[var(--v-accent)] sm:text-[14px]"
                style={line}
              />
            </label>
            <label className="block">
              <span className="text-[12px] font-bold" style={ink2}>Status</span>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ProjectStatus)}
                className="mt-1 w-full rounded-xl border bg-white px-3.5 py-2 text-[16px] font-semibold outline-none sm:text-[14px]"
                style={line}
              >
                <option value="active">Hiring</option>
                <option value="staffed">Staffed</option>
                <option value="draft">Draft</option>
              </select>
            </label>
          </div>
          <label className="block">
            <span className="text-[12px] font-bold" style={ink2}>Notes (optional)</span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Kickoff date, stakeholder notes…"
              className="mt-1 w-full rounded-xl border px-3.5 py-2 text-[16px] outline-none focus:border-[var(--v-accent)] sm:text-[14px]"
              style={line}
            />
          </label>

          {isSingle && !explicitlyPickedSingle && topSingle && (
            <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border p-3 text-[13px] font-semibold" style={line}>
              <input type="checkbox" checked={includeTop} onChange={(e) => setIncludeTop(e.target.checked)} className="accent-[var(--v-accent)]" />
              <span>Assign top match <b>{topSingle.name}</b> ({topSingle.fit}% fit) to {singleRole?.title}</span>
            </label>
          )}

          <div className="rounded-2xl p-3.5" style={{ background: "var(--v-surface2)" }}>
            <div className="flex items-center justify-between text-[12px] font-bold" style={ink2}>
              <span>Team snapshot ({snap.members.length}/{snap.stats.slots_total} seats)</span>
              {snap.stats.avg_fit > 0 && <span style={{ color: "var(--v-accent)" }}>{snap.stats.avg_fit}% avg fit</span>}
            </div>
            {snap.members.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {snap.members.map((mem) => (
                  <span key={mem.slot_id} className="inline-flex items-center gap-1.5 rounded-full border bg-white py-1 pl-1 pr-2.5 text-[12px] font-medium" style={line}>
                    <Avatar c={mem} size={20} />
                    <span>{mem.name}</span>
                    <span style={ink2}>· {mem.slot_label}</span>
                  </span>
                ))}
              </div>
            ) : (
              <p className="mt-1 text-[13px]" style={ink2}>Will save with open seat(s) — you can assign people later.</p>
            )}
          </div>
        </div>

        <div className="mt-5 flex gap-2 sm:mt-6 sm:justify-end">
          <button type="button" onClick={onClose} className="flex-1 rounded-full border px-4 py-2.5 text-[14px] font-semibold sm:flex-none sm:py-2" style={{ ...line, ...ink2 }}>
            Cancel
          </button>
          <button
            type="submit"
            disabled={!title.trim() || m.savingProject}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-full px-5 py-2.5 text-[14px] font-semibold text-white disabled:opacity-40 sm:flex-none sm:py-2"
            style={{ background: "var(--v-accent)" }}
          >
            {m.savingProject ? <><Spinner /> Saving…</> : <><Check size={15} /> Save project</>}
          </button>
        </div>
      </form>
    </div>
  );
}

// ------------------------------------------- add to existing modal
export function AddToProjectModal({ m, onClose }: { m: Matcher; onClose: () => void }) {
  const [selectedId, setSelectedId] = useState<string>(m.projects[0]?.id ?? "");
  const spec = m.spec!;
  const snap = useMemo(() => m.currentSnapshot(true), [m]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const confirm = async () => {
    if (!selectedId || m.savingProject) return;
    const updated = await m.addCurrentSearchToProject(selectedId, true);
    if (updated) onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="fade-in max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-[24px] border bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-[0_24px_60px_rgba(31,35,40,.22)] sm:rounded-[22px] sm:p-6"
        style={line}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="v-display text-[20px] font-bold sm:text-[22px]">Add to an existing project</h2>
            <p className="mt-1 text-[13px]" style={ink2}>
              Append {spec.roles.map((r) => `${r.title}${r.count > 1 ? ` ×${r.count}` : ""}`).join(", ")}
              {snap.members.length > 0 ? ` (${snap.members.map((x) => x.name).join(", ")})` : ""} into one of your saved projects.
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-1.5" style={ink2}><X size={18} /></button>
        </div>

        <div className="mt-4 max-h-72 space-y-2 overflow-y-auto pr-1">
          {m.projects.map((p) => {
            const active = selectedId === p.id;
            const total = p.stats?.slots_total ?? p.spec.roles.reduce((a, r) => a + r.count, 0);
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelectedId(p.id)}
                className="flex w-full items-center justify-between gap-3 rounded-2xl border p-3.5 text-left transition-colors"
                style={active ? { borderColor: "var(--v-accent)", background: "var(--v-accent-soft)" } : line}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Briefcase size={14} style={{ color: active ? "var(--v-accent)" : "var(--v-ink2)" }} className="shrink-0" />
                    <span className="truncate text-[14px] font-bold">{p.title}</span>
                    <StatusBadge status={p.status} />
                  </div>
                  <div className="mt-1 text-[12px]" style={ink2}>
                    {p.client ? `${p.client} · ` : ""}{p.members.length}/{total} filled · {p.spec.roles.length} role{p.spec.roles.length > 1 ? "s" : ""}
                  </div>
                </div>
                {active && <Check size={16} style={{ color: "var(--v-accent)" }} className="shrink-0" />}
              </button>
            );
          })}
        </div>

        <div className="mt-5 flex gap-2 sm:mt-6 sm:justify-end">
          <button type="button" onClick={onClose} className="flex-1 rounded-full border px-4 py-2.5 text-[14px] font-semibold sm:flex-none sm:py-2" style={{ ...line, ...ink2 }}>
            Cancel
          </button>
          <button
            type="button"
            disabled={!selectedId || m.savingProject}
            onClick={confirm}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-full px-5 py-2.5 text-[14px] font-semibold text-white disabled:opacity-40 sm:flex-none sm:py-2"
            style={{ background: "var(--v-accent)" }}
          >
            {m.savingProject ? <><Spinner /> Adding…</> : <><FolderPlus size={15} /> Add &amp; open team</>}
          </button>
        </div>
      </div>
    </div>
  );
}
