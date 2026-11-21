import { ArrowRight, FolderKanban, Plus, Search, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";
import type { Matcher } from "../../core/useMatcher";
import type { Project } from "../../types";
import { Avatar, Btn, Card, Spinner, StatusChip, ink2, ink3, line } from "./ui";

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

export function ProjectsList({ m }: { m: Matcher }) {
  const [query, setQuery] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

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

  return (
    <main className="mx-auto max-w-5xl px-4 pb-24 pt-6 fade-in sm:px-6 sm:pt-10">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="v-display text-[26px] font-bold leading-8 tracking-tight sm:text-[30px]">Projects</h1>
          <p className="mt-1 text-[14px]" style={ink2}>Every search is saved here automatically.</p>
        </div>
        <Btn variant="primary" onClick={m.startNewSearch}><Plus size={16} /> New search</Btn>
      </div>

      {m.projects.length > 5 && (
        <label className="mt-5 flex w-full items-center gap-2 rounded-md border bg-white px-4 py-2 text-[16px] sm:w-72 sm:text-[14px]" style={line}>
          <Search size={15} style={ink2} className="shrink-0" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Find a project or person…" className="min-w-0 flex-1 bg-transparent outline-none" />
          {query && <button onClick={() => setQuery("")} style={ink2}><X size={14} /></button>}
        </label>
      )}

      {m.projectsLoading ? (
        <div className="mt-16 flex items-center justify-center gap-2 text-[15px]" style={ink2}><Spinner /> Loading…</div>
      ) : m.projects.length === 0 ? (
        <Card className="mt-8 border-dashed p-10 text-center">
          <FolderKanban size={34} className="mx-auto" style={ink3} />
          <h2 className="mt-3 text-[18px] font-bold">No projects yet</h2>
          <p className="mx-auto mt-1 max-w-sm text-[14px]" style={ink2}>Describe who you need — the search and the team you choose are saved here.</p>
          <Btn variant="primary" className="mt-5" onClick={m.startNewSearch}>Find people <ArrowRight size={16} /></Btn>
        </Card>
      ) : filtered.length === 0 ? (
        <p className="mt-10 text-center text-[15px]" style={ink2}>No project matches “{query}”.</p>
      ) : (
        <Card className="mt-6 overflow-hidden">
          <div className="hidden grid-cols-[1fr_150px_90px_110px_90px_minmax(36px,auto)] items-center gap-4 border-b px-5 py-2.5 text-[12px] font-semibold sm:grid" style={{ ...line, ...ink3 }}>
            <span>Project</span><span>People</span><span>Seats</span><span>Status</span><span>Updated</span><span />
          </div>
          <ul>
            {filtered.map((p) => (
              <li key={p.id} className="group border-b last:border-b-0" style={line}>
                <div className="flex flex-col gap-2 px-4 py-3.5 sm:grid sm:grid-cols-[1fr_150px_90px_110px_90px_minmax(36px,auto)] sm:items-center sm:gap-4 sm:px-5">
                  <button onClick={() => m.openProject(p.id)} className="min-w-0 text-left">
                    <div className="truncate text-[15px] font-bold group-hover:text-[var(--v-accent)]">{p.title}</div>
                    <div className="truncate text-[12px]" style={ink3}>
                      {p.client ? `${p.client} · ` : ""}{p.spec.roles.map((r) => (r.count > 1 ? `${r.title} ×${r.count}` : r.title)).join(" · ")}
                    </div>
                  </button>
                  <div className="flex items-center gap-3 sm:contents">
                    <span><Faces p={p} /></span>
                    <SeatsBar p={p} />
                    <span><StatusChip status={p.status} /></span>
                    <span className="text-[12px]" style={ink3}>{relativeTime(p.updated_at)}</span>
                    <span className="ml-auto sm:ml-0">
                      {confirmDelete === p.id ? (
                        <span className="flex items-center gap-1">
                          <button onClick={() => { m.deleteProject(p.id); setConfirmDelete(null); }} className="rounded-md px-2.5 py-1 text-[12px] font-semibold text-white" style={{ background: "var(--v-bad)" }}>Delete</button>
                          <button onClick={() => setConfirmDelete(null)} className="px-1 text-[12px] font-semibold" style={ink2}>No</button>
                        </span>
                      ) : (
                        <button onClick={() => setConfirmDelete(p.id)} title="Delete project" className="grid size-8 place-items-center rounded-md opacity-60 transition hover:bg-[var(--v-bad-soft)] hover:opacity-100 sm:opacity-0 sm:group-hover:opacity-100" style={ink2}>
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
      )}
    </main>
  );
}
