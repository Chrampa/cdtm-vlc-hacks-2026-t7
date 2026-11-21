import { ArrowRight, Briefcase, FolderKanban, History, Plus, Search as SearchIcon, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";
import type { Matcher } from "../../core/useMatcher";
import type { Project } from "../../types";
import { Avatar, Btn, Card, Spinner, ink2, ink3, line } from "./ui";

export function relativeTime(iso: string): string {
  const ts = Date.parse(iso);
  if (Number.isNaN(ts)) return "";
  const sec = Math.max(0, Math.round((Date.now() - ts) / 1000));
  if (sec < 60) return "just now";
  if (sec < 3600) return `${Math.floor(sec / 60)} min ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)} h ago`;
  const days = Math.floor(sec / 86400);
  if (days < 7) return `${days} d ago`;
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function seats(p: Project) {
  const total = p.stats?.slots_total || p.spec.roles.reduce((a, r) => a + r.count, 0);
  return { filled: p.members.length, total };
}

export function Faces({ p, max = 4, size = 26 }: { p: Project; max?: number; size?: number }) {
  if (!p.members.length) return <span className="text-[12px]" style={ink3}>Nobody chosen yet</span>;
  return (
    <span className="flex -space-x-1.5">
      {p.members.slice(0, max).map((mem) => (
        <span key={mem.slot_id} title={`${mem.name} · ${mem.slot_label}`} className="rounded-full ring-2 ring-white"><Avatar c={mem} size={size} /></span>
      ))}
      {p.members.length > max && (
        <span className="grid place-items-center rounded-full text-[11px] font-bold ring-2 ring-white" style={{ width: size, height: size, background: "var(--v-chip)", color: "var(--v-ink2)" }}>+{p.members.length - max}</span>
      )}
    </span>
  );
}

export function SeatsBar({ p }: { p: Project }) {
  const { filled, total } = seats(p);
  const pct = total ? Math.round((filled / total) * 100) : 0;
  return (
    <span className="inline-flex items-center gap-2 text-[12px] font-semibold" style={ink2}>
      <span className="h-1.5 w-14 overflow-hidden rounded-[2px]" style={{ background: "var(--v-line)" }}>
        <span className="block h-full rounded-[2px]" style={{ width: `${pct}%`, background: filled === total ? "var(--v-good)" : "var(--v-warn)" }} />
      </span>
      {filled}/{total}
    </span>
  );
}

export const isProject = (p: Project) => p.status === "staffed";

const COLS = "sm:grid-cols-[1fr_150px_90px_90px_minmax(36px,auto)]";

function ProjectTable({ m, list, kind }: { m: Matcher; list: Project[]; kind: "project" | "search" }) {
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const project = kind === "project";
  return (
    <Card className="overflow-hidden" style={project ? { borderColor: "var(--v-good)" } : undefined}>
      <div className={`hidden ${COLS} items-center gap-4 border-b px-5 py-2.5 text-[12px] font-semibold sm:grid`} style={{ ...line, ...ink3 }}>
        <span>{project ? "Project" : "Search"}</span><span>People</span><span>Seats</span><span>Updated</span><span />
      </div>
      <ul>
        {list.map((p) => (
          <li key={p.id} className="group border-b last:border-b-0" style={line}>
            <div className={`flex flex-col gap-2 px-4 py-3.5 sm:grid ${COLS} sm:items-center sm:gap-4 sm:px-5`}>
              <button onClick={() => m.openProject(p.id)} className="flex min-w-0 items-start gap-2.5 text-left">
                {project ? <Briefcase size={16} className="mt-0.5 shrink-0" style={{ color: "var(--v-good)" }} /> : <SearchIcon size={15} className="mt-0.5 shrink-0" style={ink3} />}
                <span className="min-w-0">
                  <span className={`block truncate text-[15px] group-hover:text-[var(--v-accent)] ${project ? "font-bold" : "font-semibold"}`}>{p.title}</span>
                  <span className="block truncate text-[12px]" style={ink3}>
                    {p.client ? `${p.client} · ` : ""}{p.spec.roles.map((r) => (r.count > 1 ? `${r.title} ×${r.count}` : r.title)).join(" · ")}
                  </span>
                </span>
              </button>
              <div className="flex items-center gap-3 pl-7 sm:contents">
                <span><Faces p={p} /></span>
                <SeatsBar p={p} />
                <span className="text-[12px]" style={ink3}>{relativeTime(p.updated_at)}</span>
                <span className="ml-auto sm:ml-0">
                  {confirmDelete === p.id ? (
                    <span className="flex items-center gap-1">
                      <button onClick={() => { m.deleteProject(p.id); setConfirmDelete(null); }} className="rounded-md px-2.5 py-1 text-[12px] font-semibold text-white" style={{ background: "var(--v-bad)" }}>Delete</button>
                      <button onClick={() => setConfirmDelete(null)} className="px-1 text-[12px] font-semibold" style={ink2}>No</button>
                    </span>
                  ) : (
                    <button onClick={() => setConfirmDelete(p.id)} title={project ? "Delete project" : "Delete search"} className="grid size-8 place-items-center rounded-md opacity-60 transition hover:bg-[var(--v-bad-soft)] hover:opacity-100 sm:opacity-0 sm:group-hover:opacity-100" style={ink2}>
                      <Trash2 size={15} />
                    </button>
                  )}
                </span>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

export function ProjectsList({ m }: { m: Matcher }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return m.projects;
    return m.projects.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.client.toLowerCase().includes(q) ||
        p.spec.roles.some((r) => r.title.toLowerCase().includes(q)) ||
        p.members.some((mem) => mem.name.toLowerCase().includes(q)),
    );
  }, [m.projects, query]);
  const projects = filtered.filter(isProject);
  const searches = filtered.filter((p) => !isProject(p));

  return (
    <main className="mx-auto max-w-5xl px-4 pb-24 pt-6 fade-in sm:px-6 sm:pt-10">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="v-display text-[26px] font-bold leading-8 tracking-tight sm:text-[30px]">Projects</h1>
          <p className="mt-1 text-[14px]" style={ink2}>Confirmed teams become projects. Other searches are kept below.</p>
        </div>
        <Btn variant="primary" onClick={m.startNewSearch}><Plus size={16} /> New search</Btn>
      </div>

      {m.projects.length > 5 && (
        <label className="mt-5 flex w-full items-center gap-2 rounded-md border bg-white px-4 py-2 text-[16px] sm:w-72 sm:text-[14px]" style={line}>
          <SearchIcon size={15} style={ink2} className="shrink-0" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Find a project or person…" className="min-w-0 flex-1 bg-transparent outline-none" />
          {query && <button onClick={() => setQuery("")} style={ink2}><X size={14} /></button>}
        </label>
      )}

      {m.projectsLoading ? (
        <div className="mt-16 flex items-center justify-center gap-2 text-[15px]" style={ink2}><Spinner /> Loading…</div>
      ) : m.projects.length === 0 ? (
        <Card className="mt-8 border-dashed p-10 text-center">
          <FolderKanban size={34} className="mx-auto" style={ink3} />
          <h2 className="mt-3 text-[18px] font-bold">Nothing here yet</h2>
          <p className="mx-auto mt-1 max-w-sm text-[14px]" style={ink2}>Describe who you need. Confirm the team you like and it becomes a project here.</p>
          <Btn variant="primary" className="mt-5" onClick={m.startNewSearch}>Find people <ArrowRight size={16} /></Btn>
        </Card>
      ) : filtered.length === 0 ? (
        <p className="mt-10 text-center text-[15px]" style={ink2}>Nothing matches “{query}”.</p>
      ) : (
        <>
          <section className="mt-7">
            <h2 className="mb-2.5 flex items-center gap-2 text-[15px] font-bold"><Briefcase size={16} style={{ color: "var(--v-good)" }} /> Projects <span className="text-[13px] font-semibold" style={ink3}>{projects.length}</span></h2>
            {projects.length ? (
              <ProjectTable m={m} list={projects} kind="project" />
            ) : (
              <Card className="border-dashed px-5 py-6 text-center text-[14px]" style={ink2}>No projects yet. Open a search and press <b>Confirm team</b> to keep it here.</Card>
            )}
          </section>
          {searches.length > 0 && (
            <section className="mt-9">
              <h2 className="mb-2.5 flex items-center gap-2 text-[15px] font-bold" style={ink2}><History size={16} /> Recent searches <span className="text-[13px] font-semibold" style={ink3}>{searches.length}</span></h2>
              <ProjectTable m={m} list={searches} kind="search" />
            </section>
          )}
        </>
      )}
    </main>
  );
}
