import {
  Briefcase,
  FolderKanban,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { useEffect } from "react";
import { fmt } from "../../core/helpers";
import type { Matcher } from "../../core/useMatcher";
import type { ProjectStatus } from "../../types";

const ink2 = { color: "var(--v-ink2)" };
const line = { borderColor: "var(--v-line)" };

const STATUS_DOT: Record<ProjectStatus, string> = {
  staffed: "var(--v-good)",
  active: "var(--v-cyan)",
  draft: "var(--v-ink2)",
  archived: "var(--v-line)",
};

export function Sidebar({
  m,
  mobileOpen,
  onCloseMobile,
  collapsed,
  onToggleCollapse,
}: {
  m: Matcher;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}) {
  // Close mobile drawer on Escape & lock background scroll while open
  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseMobile();
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [mobileOpen, onCloseMobile]);

  const act = (fn: () => void) => () => {
    fn();
    onCloseMobile();
  };

  const hasResults = Boolean(m.spec) || m.phase === "interpreting" || m.phase === "searching";

  const renderContent = (isCompact: boolean, isMobile: boolean) => (
    <div className="flex h-full flex-col bg-white" style={line}>
      {/* Brand + toggle/close */}
      <div
        className={`flex items-center border-b px-3.5 py-3.5 ${isCompact ? "justify-center" : "justify-between gap-2"}`}
        style={line}
      >
        <button
          onClick={act(m.goHome)}
          className={`flex min-w-0 items-center gap-2.5 text-left ${isCompact ? "justify-center" : ""}`}
          title="Talentic · AI Talent Matcher"
        >
          <span
            className="relative grid size-9 shrink-0 place-items-center rounded-xl text-[16px] font-extrabold text-white shadow-[0_4px_12px_rgba(0,114,188,.25)]"
            style={{ background: "linear-gradient(135deg, #0072BC 0%, #003B6F 100%)" }}
          >
            T
            <span
              className="absolute bottom-1.5 right-1.5 size-1.5 rounded-full"
              style={{ background: "var(--v-cyan)" }}
            />
          </span>
          {!isCompact && (
            <div className="min-w-0">
              <div className="truncate text-[16px] font-extrabold leading-5 tracking-tight">Talentic</div>
              <div className="truncate text-[11px] font-medium" style={ink2}>
                AI Talent Matcher
              </div>
            </div>
          )}
        </button>

        {isMobile ? (
          <button
            onClick={onCloseMobile}
            aria-label="Close navigation"
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-full border"
            style={{ ...line, ...ink2 }}
          >
            <X size={16} />
          </button>
        ) : !isCompact ? (
          <button
            onClick={onToggleCollapse}
            aria-label="Collapse sidebar"
            title="Collapse sidebar"
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-[var(--v-surface2)]"
            style={ink2}
          >
            <PanelLeftClose size={17} />
          </button>
        ) : null}
      </div>

      {/* Primary action */}
      <div className={`px-3 pt-3.5 ${isCompact ? "flex flex-col items-center gap-2" : ""}`}>
        {isCompact && !isMobile && (
          <button
            onClick={onToggleCollapse}
            aria-label="Expand sidebar"
            title="Expand sidebar"
            className="inline-flex size-10 items-center justify-center rounded-xl transition-colors hover:bg-[var(--v-surface2)]"
            style={ink2}
          >
            <PanelLeftOpen size={18} />
          </button>
        )}
        <button
          onClick={act(m.startNewSearch)}
          title="New search"
          className={`inline-flex items-center justify-center gap-2 rounded-full font-semibold text-white transition-opacity hover:opacity-95 ${
            isCompact ? "size-10 p-0" : "w-full px-4 py-2.5 text-[14px]"
          }`}
          style={{ background: "var(--v-accent)" }}
        >
          <Plus size={16} />
          {!isCompact && <span>New search</span>}
        </button>
      </div>

      {/* Main navigation */}
      <nav aria-label="Primary" className="mt-4 space-y-1 px-2.5">
        {hasResults && (
          <NavItem
            icon={m.result?.multi ? <Users size={17} /> : <Sparkles size={17} />}
            label={m.activeProject ? m.activeProject.title : m.spec?.title || "Current match"}
            sub={isCompact ? undefined : m.dirty ? "Unsaved changes" : m.result?.multi ? "Team builder" : "Active search"}
            active={m.view === "results"}
            compact={isCompact}
            dot={m.dirty ? "var(--v-warn)" : undefined}
            onClick={act(m.goResults)}
          />
        )}

        <NavItem
          icon={<FolderKanban size={17} />}
          label="Projects"
          active={m.view === "projects"}
          compact={isCompact}
          badge={m.projects.length > 0 ? m.projects.length : undefined}
          onClick={act(m.goProjects)}
        />
      </nav>

      {/* Saved projects quick list */}
      <div className="mt-5 flex min-h-0 flex-1 flex-col border-t pt-4" style={line}>
        {!isCompact && (
          <div className="flex items-center justify-between px-4 pb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider" style={ink2}>
              Saved projects
            </span>
            {m.projects.length > 0 && (
              <button
                onClick={act(m.goProjects)}
                className="text-[11px] font-semibold hover:underline"
                style={{ color: "var(--v-accent)" }}
              >
                All
              </button>
            )}
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto px-2.5 pb-3">
          {m.projects.length === 0 ? (
            !isCompact && (
              <div className="mx-1.5 rounded-xl px-3 py-3 text-[12px] leading-5" style={{ background: "var(--v-surface2)", ...ink2 }}>
                Saved briefs and chosen teams will appear here for quick access.
              </div>
            )
          ) : (
            <div className="space-y-0.5">
              {m.projects.map((p) => {
                const isSelected = m.activeProjectId === p.id && (m.view === "project" || m.view === "results");
                const total = p.stats?.slots_total ?? p.spec.roles.reduce((a, r) => a + r.count, 0);
                const filled = p.members.length;
                return (
                  <button
                    key={p.id}
                    onClick={act(() => m.openProject(p.id))}
                    title={`${p.title}${p.client ? ` · ${p.client}` : ""} (${filled}/${total} filled)`}
                    className={`group flex w-full items-center rounded-xl transition-colors ${
                      isCompact ? "justify-center p-2.5" : "gap-2.5 px-2.5 py-2 text-left"
                    }`}
                    style={
                      isSelected
                        ? { background: "var(--v-accent-soft)", color: "var(--v-accent)" }
                        : { color: "var(--v-ink)" }
                    }
                  >
                    {isCompact ? (
                      <span className="relative inline-flex">
                        <Briefcase size={16} style={{ color: isSelected ? "var(--v-accent)" : "var(--v-ink2)" }} />
                        <span
                          className="absolute -right-0.5 -top-0.5 size-2 rounded-full ring-2 ring-white"
                          style={{ background: STATUS_DOT[p.status] }}
                        />
                      </span>
                    ) : (
                      <>
                        <span
                          className="size-2 shrink-0 rounded-full"
                          style={{ background: STATUS_DOT[p.status] }}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[13px] font-semibold leading-5">{p.title}</div>
                          {p.client && (
                            <div className="truncate text-[11px]" style={ink2}>
                              {p.client}
                            </div>
                          )}
                        </div>
                        <span
                          className="shrink-0 rounded-full px-1.5 py-0.5 text-[11px] font-bold"
                          style={
                            isSelected
                              ? { background: "rgba(255,255,255,.7)", color: "var(--v-accent)" }
                              : { background: "var(--v-surface2)", ...ink2 }
                          }
                        >
                          {filled}/{total}
                        </span>
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Footer pool status */}
      {m.meta && !isCompact && (
        <div
          className="border-t px-3.5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
          style={line}
        >
          <div className="rounded-xl px-3 py-2.5 text-[12px]" style={{ background: "var(--v-surface2)" }}>
            <div className="font-bold">{fmt.format(m.meta.profiles)} colleagues</div>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px]" style={ink2}>
              <span className="inline-flex items-center gap-1">
                <span className="size-1.5 rounded-full" style={{ background: "var(--v-good)" }} />
                {fmt.format(m.meta.available_now)} now
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="size-1.5 rounded-full" style={{ background: "var(--v-warn)" }} />
                {fmt.format(m.meta.available_soon)} &lt; 3 mo
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop persistent lateral bar */}
      <aside
        className={`hidden shrink-0 border-r lg:sticky lg:top-0 lg:block lg:h-dvh transition-[width] duration-200 ${
          collapsed ? "lg:w-[72px]" : "lg:w-[268px]"
        }`}
        style={line}
      >
        {renderContent(collapsed, false)}
      </aside>

      {/* Mobile & tablet slide-over lateral bar */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-50 flex bg-black/35 backdrop-blur-[1px] lg:hidden fade-in"
          onClick={onCloseMobile}
        >
          <aside
            onClick={(e) => e.stopPropagation()}
            className="h-dvh w-[284px] max-w-[85vw] border-r shadow-[16px_0_40px_rgba(31,35,40,.22)]"
            style={line}
          >
            {renderContent(false, true)}
          </aside>
        </div>
      )}
    </>
  );
}

function NavItem({
  icon,
  label,
  sub,
  active,
  compact,
  badge,
  dot,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  sub?: string;
  active: boolean;
  compact: boolean;
  badge?: number;
  dot?: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={`relative flex w-full items-center rounded-xl transition-colors ${
        compact ? "justify-center p-2.5" : "gap-2.5 px-3 py-2.5 text-left"
      } ${!active ? "hover:bg-[var(--v-surface2)]" : ""}`}
      style={
        active
          ? { background: "var(--v-accent-soft)", color: "var(--v-ink)" }
          : { color: "var(--v-ink)" }
      }
    >
      {active && !compact && (
        <span
          className="absolute bottom-2 left-0 top-2 w-[3px] rounded-r-full"
          style={{ background: "linear-gradient(180deg, #5BC0EB 0%, #0072BC 100%)" }}
        />
      )}
      <span className="shrink-0" style={{ color: active ? "var(--v-accent)" : "var(--v-ink2)" }}>
        {icon}
      </span>
      {!compact && (
        <div className="min-w-0 flex-1">
          <div className="truncate text-[14px] font-semibold leading-5">{label}</div>
          {sub && (
            <div className="truncate text-[11px] font-medium" style={dot ? { color: dot } : ink2}>
              {sub}
            </div>
          )}
        </div>
      )}
      {!compact && badge !== undefined && (
        <span
          className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold leading-none"
          style={
            active
              ? { background: "var(--v-accent)", color: "#fff" }
              : { background: "var(--v-surface2)", color: "var(--v-ink2)" }
          }
        >
          {badge}
        </span>
      )}
      {dot && (
        <span
          className={
            compact
              ? "absolute right-2 top-2 size-2 rounded-full ring-2 ring-white"
              : "size-2 shrink-0 rounded-full"
          }
          style={{ background: dot }}
        />
      )}
    </button>
  );
}
