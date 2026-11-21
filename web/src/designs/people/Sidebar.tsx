import { Briefcase, FolderKanban, History, PanelLeftClose, PanelLeftOpen, Plus, X } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import type { Matcher } from "../../core/useMatcher";
import type { Project } from "../../types";
import { isProject, seats } from "./Projects";
import { Logo, Spinner, ink2, ink3, line } from "./ui";

export function Sidebar({ m, mobileOpen, onCloseMobile, collapsed, onToggleCollapse, hideDesktop }: {
  m: Matcher;
  hideDesktop?: boolean;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}) {
  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onCloseMobile(); };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener("keydown", onKey); };
  }, [mobileOpen, onCloseMobile]);

  const act = (fn: () => void) => () => { fn(); onCloseMobile(); };
  const busy = m.phase === "interpreting" || m.phase === "searching";
  // A search that is still running (or not yet saved) shows as a temporary item on top.
  const pending = !m.activeProjectId && (busy || Boolean(m.spec));
  const projects = m.projects.filter(isProject);
  const searches = m.projects.filter((p) => !isProject(p)).slice(0, 10);

  const Item = ({ p, project }: { p: Project; project?: boolean }) => {
    const active = m.activeProjectId === p.id && m.view === "results";
    const { filled, total } = seats(p);
    return (
      <button onClick={act(() => m.openProject(p.id))} title={p.title} className={`flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left transition-colors ${active ? "" : "hover:bg-[var(--v-chip)]"}`} style={active ? { background: "var(--v-accent-soft)" } : undefined}>
        {project ? <Briefcase size={14} className="shrink-0" style={{ color: "var(--v-good)" }} /> : <span className="size-1.5 shrink-0 rounded-full" style={{ background: "var(--v-ink3)" }} />}
        <span className={`min-w-0 flex-1 truncate text-[13px] ${project ? "font-bold" : "font-medium"}`} style={project ? undefined : ink2}>{p.title}</span>
        <span className="shrink-0 text-[11px] font-semibold" style={ink3}>{filled}/{total}</span>
      </button>
    );
  };

  const content = (compact: boolean, mobile: boolean) => (
    <div className="flex h-full flex-col bg-white">
      <div className={`flex items-center px-3.5 py-3.5 ${compact ? "justify-center" : "justify-between gap-2"}`}>
        <button onClick={act(m.startNewSearch)} className="flex min-w-0 items-center py-1 text-left" title="Talentic — new search">
          {compact ? <Logo mark height={32} /> : <Logo height={22} />}
        </button>
        {mobile ? (
          <button onClick={onCloseMobile} aria-label="Close menu" className="grid size-8 place-items-center rounded-md border" style={{ ...line, ...ink2 }}><X size={16} /></button>
        ) : !compact ? (
          <button onClick={onToggleCollapse} aria-label="Collapse sidebar" className="grid size-8 place-items-center rounded-md hover:bg-[var(--v-chip)]" style={ink3}><PanelLeftClose size={17} /></button>
        ) : null}
      </div>

      <div className={`px-3 ${compact ? "flex flex-col items-center gap-2" : ""}`}>
        {compact && !mobile && (
          <button onClick={onToggleCollapse} aria-label="Expand sidebar" className="grid size-10 place-items-center rounded-md hover:bg-[var(--v-chip)]" style={ink3}><PanelLeftOpen size={18} /></button>
        )}
        <button onClick={act(m.startNewSearch)} title="New search" className={`inline-flex items-center justify-center gap-2 rounded-md font-semibold text-white hover:brightness-110 ${compact ? "size-10" : "w-full px-4 py-2.5 text-[14px]"}`} style={{ background: "var(--v-accent)" }}>
          <Plus size={16} />{!compact && "New search"}
        </button>
      </div>

      {!compact && (
        <div className="mt-4 min-h-0 flex-1 overflow-y-auto px-2.5 pb-3">
          <SectionLabel icon={<Briefcase size={12} />} label="Projects" count={projects.length} />
          {projects.length === 0 && (
            <p className="px-2.5 pb-1 text-[12px] leading-5" style={ink3}>Confirm a team to keep it here.</p>
          )}
          {projects.map((p) => <Item key={p.id} p={p} project />)}

          <div className="mt-4" />
          <SectionLabel icon={<History size={12} />} label="Recent searches" />
          {pending && (
            <button onClick={act(m.goResults)} className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left" style={{ background: m.view === "results" ? "var(--v-accent-soft)" : undefined }}>
              <span style={{ color: "var(--v-accent)" }}><Spinner size={12} /></span>
              <span className="min-w-0 flex-1 truncate text-[13px] font-semibold">{m.spec?.title || "New search…"}</span>
            </button>
          )}
          {searches.length === 0 && !pending && (
            <p className="px-2.5 py-1 text-[12px] leading-5" style={ink3}>Your searches appear here.</p>
          )}
          {searches.map((p) => <Item key={p.id} p={p} />)}
        </div>
      )}
      {compact && <div className="flex-1" />}

      <div className={`border-t px-2.5 py-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] ${compact ? "flex justify-center" : ""}`} style={line}>
        <button onClick={act(m.goProjects)} title="All projects" className={`flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] font-semibold hover:bg-[var(--v-chip)] ${compact ? "" : "w-full"}`} style={m.view === "projects" ? { background: "var(--v-accent-soft)" } : undefined}>
          <FolderKanban size={16} style={ink2} />
          {!compact && <><span className="flex-1 text-left">All projects &amp; searches</span><span style={ink3}>{m.projects.length}</span></>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {!hideDesktop && <aside className={`hidden shrink-0 border-r transition-[width] duration-200 lg:sticky lg:top-0 lg:block lg:h-dvh ${collapsed ? "lg:w-[72px]" : "lg:w-[248px]"}`} style={line}>
        {content(collapsed, false)}
      </aside>}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex bg-black/35 lg:hidden fade-in" onClick={onCloseMobile}>
          <aside onClick={(e) => e.stopPropagation()} className="h-dvh w-[280px] max-w-[85vw] border-r shadow-[16px_0_40px_rgba(31,35,40,.22)]" style={line}>
            {content(false, true)}
          </aside>
        </div>
      )}
    </>
  );
}

function SectionLabel({ icon, label, count }: { icon: ReactNode; label: string; count?: number }) {
  return (
    <div className="flex items-center gap-1.5 px-2.5 pb-1.5 text-[11px] font-bold uppercase tracking-wider" style={ink3}>
      {icon} {label}
      {count !== undefined && count > 0 && <span className="ml-auto font-semibold normal-case tracking-normal">{count}</span>}
    </div>
  );
}
