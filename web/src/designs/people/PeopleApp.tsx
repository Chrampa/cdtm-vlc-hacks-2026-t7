import {
  AlertCircle,
  ArrowLeft,
  ArrowLeftRight,
  ArrowRight,
  Briefcase,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  Clock,
  Copy,
  Globe,
  History,
  Menu as MenuIcon,
  Minus,
  MoreHorizontal,
  Pencil,
  Pin,
  Plus,
  RotateCcw,
  SlidersHorizontal,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { availText, copyText, first, fitWord, fmt, mustGaps, OPTION_NAME, plainImpacts, rankCandidates, whyLine } from "../../core/helpers";
import type { Matcher } from "../../core/useMatcher";
import type { Availability, Candidate, Project, Requirement, RoleResult, RoleSpec, SeniorityMode, TeamMember, TeamOption, TeamShape } from "../../types";
import { Compare } from "./Compare";
import { Profile, type ProfileAction } from "./Profile";
import { Faces, ProjectsList, SeatsBar, isProject, relativeTime } from "./Projects";
import { Sidebar } from "./Sidebar";
import { canRecord, ListenButton, MicButton } from "./Voice";
import { AvailDot, Avatar, Btn, Card, Chip, Drawer, FitMeter, GemTag, Logo, Menu, MustDots, Spinner, StatusIcon, availColor, ink2, ink3, line } from "./ui";

// ------------------------------------------------------------------ shell
export default function PeopleApp({ m }: { m: Matcher }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const busy = m.phase === "interpreting" || m.phase === "searching";
  const showSidebar = !(m.view === "home" && m.projects.length === 0 && !m.spec && !busy);

  return (
    <div className="v-people v-frame flex min-h-dvh flex-col lg:flex-row">
      <Sidebar m={m} hideDesktop={!showSidebar} mobileOpen={mobileNavOpen} onCloseMobile={() => setMobileNavOpen(false)} collapsed={collapsed} onToggleCollapse={() => setCollapsed((v) => !v)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="pointer-events-none sticky top-0 z-30 flex items-center justify-between px-4 pb-1 pt-[max(0.75rem,env(safe-area-inset-top))] lg:hidden">
          <button onClick={() => setMobileNavOpen(true)} aria-label="Open menu" className="pointer-events-auto inline-flex min-h-[38px] items-center gap-2 rounded-md border bg-white/95 px-3.5 py-1.5 text-[13px] font-semibold shadow-[0_4px_16px_rgba(31,35,40,.08)] backdrop-blur" style={line}>
            <MenuIcon size={16} />
            <Logo height={15} />
          </button>
          {m.view !== "home" && (
            <button onClick={m.startNewSearch} aria-label="New search" className="pointer-events-auto inline-flex min-h-[38px] items-center gap-1 rounded-md px-3.5 py-1.5 text-[13px] font-semibold text-white shadow-[0_4px_16px_rgba(0,114,188,.26)]" style={{ background: "var(--v-accent)" }}>
              <Plus size={15} /> New
            </button>
          )}
        </div>
        <div className="min-w-0 flex-1">
          {m.view === "home" && <Home m={m} showLogo={!showSidebar} />}
          {m.view === "results" && <Results m={m} />}
          {m.view === "projects" && <ProjectsList m={m} />}
        </div>
      </div>
      {m.toast && (
        <div className="pointer-events-none fixed inset-x-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-[60] flex justify-center fade-in sm:inset-x-auto sm:bottom-5 sm:right-5">
          <div className="flex max-w-full items-center gap-2 rounded-md px-4 py-2.5 text-[13px] font-semibold text-white shadow-[0_12px_32px_rgba(0,59,111,.26)]" style={{ background: "var(--v-ink)" }}>
            <Check size={14} className="shrink-0" style={{ color: "var(--v-cyan)" }} /> <span className="truncate">{m.toast}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------------- home
function Home({ m, showLogo }: { m: Matcher; showLogo?: boolean }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (window.matchMedia("(min-width: 640px)").matches) ref.current?.focus();
  }, []);
  const ready = m.brief.trim().length >= 10;
  const myProjects = m.projects.filter(isProject).slice(0, 4);
  const recent = m.projects.filter((p) => !isProject(p)).slice(0, 3);
  const voice = !!m.meta?.voice && canRecord();

  return (
    <main className="mx-auto max-w-2xl px-4 pb-20 pt-6 fade-in sm:px-6 sm:pt-16">
      {showLogo && <div className="mb-10 hidden lg:block"><Logo height={30} /></div>}
      <h1 className="v-display text-[32px] font-bold leading-10 tracking-tight sm:text-[42px] sm:leading-[50px]">Who do you need?</h1>
      <p className="mt-2 text-[16px] leading-7" style={ink2}>Describe a role or a whole team in your own words{voice ? ", typed or spoken" : ""}.</p>

      <form className="mt-6" onSubmit={(e) => { e.preventDefault(); if (ready) m.submit(); }}>
        <div className="rounded-[var(--v-radius)] border bg-white shadow-[0_12px_32px_rgba(31,35,40,.06)] focus-within:border-[var(--v-accent)]" style={line}>
          <textarea
            ref={ref}
            value={m.brief}
            onChange={(e) => m.setBrief(e.target.value)}
            rows={4}
            maxLength={6000}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && ready) { e.preventDefault(); m.submit(); }
            }}
            placeholder="e.g. A data engineer with Google Cloud for an insurance client, free within two months. Spanish and English."
            className="block w-full resize-none rounded-[var(--v-radius)] bg-transparent px-5 py-4 text-[16px] leading-7 outline-none placeholder:text-[var(--v-ink3)]"
          />
          <div className="flex flex-wrap items-center justify-end gap-2 px-3 pb-3">
            {voice && <MicButton className="mr-auto" onText={(t) => { m.setBrief(m.brief.trim() ? `${m.brief.trimEnd()} ${t}` : t); ref.current?.focus(); }} />}
            <Btn variant="primary" type="submit" disabled={!ready} className="flex-1 sm:flex-none !px-6 !py-3 !text-[15px]">Find people <ArrowRight size={17} /></Btn>
          </div>
        </div>
      </form>
      {m.phase === "error" && m.error && <p className="mt-4 rounded-md px-4 py-3 text-[14px]" style={{ background: "var(--v-bad-soft)", color: "var(--v-bad)" }}>{m.error}</p>}

      {m.meta && (
        <div className="mt-6 flex flex-wrap items-center gap-2">
          <span className="mr-1 text-[13px] font-semibold" style={ink3}>Try</span>
          {m.meta.examples.map((ex) => (
            <button key={ex.id} onClick={() => m.submit(ex.brief)} title={ex.brief} className="rounded-md border bg-white px-3.5 py-1.5 text-[13px] font-semibold transition-colors hover:border-[var(--v-accent)] hover:text-[var(--v-accent)]" style={line}>
              {ex.title}
            </button>
          ))}
        </div>
      )}

      {(myProjects.length > 0 || recent.length > 0) && (
        <div className="mt-12 space-y-6">
          <div className="flex items-center justify-end">
            <Btn variant="link" small onClick={m.goProjects}>All projects &amp; searches</Btn>
          </div>
          {myProjects.length > 0 && <HomeList m={m} title="Your projects" project list={myProjects} />}
          {recent.length > 0 && <HomeList m={m} title="Recent searches" list={recent} />}
        </div>
      )}

      {m.meta && (
        <p className="mt-10 text-[13px]" style={ink3}>
          Searching {fmt.format(m.meta.profiles)} colleagues · {fmt.format(m.meta.available_now)} free now
        </p>
      )}
    </main>
  );
}

function HomeList({ m, title, list, project }: { m: Matcher; title: string; list: Project[]; project?: boolean }) {
  return (
    <section>
      <h2 className="flex items-center gap-1.5 text-[13px] font-bold" style={project ? { color: "var(--v-good)" } : ink3}>
        {project ? <Briefcase size={14} /> : <History size={14} />} {title}
      </h2>
      <Card className="mt-2 overflow-hidden" style={project ? { borderColor: "var(--v-good)" } : undefined}>
        {list.map((p) => (
          <button key={p.id} onClick={() => m.openProject(p.id)} className="flex w-full items-center gap-3 border-b px-4 py-3 text-left last:border-b-0 hover:bg-[var(--v-chip)]" style={line}>
            <div className="min-w-0 flex-1">
              <div className={`truncate text-[14px] ${project ? "font-bold" : "font-semibold"}`}>{p.title}</div>
              <div className="text-[12px]" style={ink3}>{relativeTime(p.updated_at)}</div>
            </div>
            <span className="hidden sm:block"><Faces p={p} max={4} size={24} /></span>
            <SeatsBar p={p} />
          </button>
        ))}
      </Card>
    </section>
  );
}

// --------------------------------------------------------------- loading
function Loading({ m }: { m: Matcher }) {
  const steps = [
    { key: "interpreting", label: "Reading your request" },
    { key: "searching", label: `Searching ${m.meta ? fmt.format(m.meta.profiles) : "all"} colleagues` },
  ];
  const idx = steps.findIndex((s) => s.key === m.phase);
  return (
    <main className="mx-auto max-w-xl px-4 py-12 fade-in sm:px-6 sm:py-20">
      <Card className="p-5 sm:p-6">
        {m.brief && <p className="line-clamp-3 text-[15px] italic leading-6" style={ink2}>“{m.brief}”</p>}
        <ol className="mt-5 space-y-4">
          {steps.map((s, i) => (
            <li key={s.key} className="flex items-center gap-3" style={{ opacity: i > idx ? 0.4 : 1 }}>
              <span className="grid size-6 shrink-0 place-items-center rounded-full" style={{ background: i < idx ? "var(--v-good)" : "var(--v-accent-soft)", color: i < idx ? "#fff" : "var(--v-accent)" }}>
                {i < idx ? <Check size={14} strokeWidth={3} /> : i === idx ? <Spinner size={14} /> : null}
              </span>
              <span className="text-[15px] font-bold">{s.label}</span>
            </li>
          ))}
        </ol>
        {m.spec && (
          <div className="mt-6 border-t pt-4 fade-in" style={line}>
            <div className="text-[13px] font-bold" style={ink3}>What we understood</div>
            <div className="mt-2 space-y-3">
              {m.spec.roles.map((r) => (
                <div key={r.id}>
                  <div className="text-[14px] font-bold">{r.title}{r.count > 1 ? ` ×${r.count}` : ""}</div>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {r.requirements.filter((q) => q.importance === "must").map((q) => (
                      <span key={q.id} className="fade-in"><Chip><Check size={11} strokeWidth={3} /> {q.label}</Chip></span>
                    ))}
                    <Chip tone="neutral"><Clock size={11} /> {r.availability === "now" ? "Free now" : r.availability === "soon" ? "Free within 3 months" : "Any availability"}</Chip>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>
    </main>
  );
}

// ---------------------------------------------------------------- results
function teamSummaryText(m: Matcher): string {
  const spec = m.spec!;
  const out = [spec.title, ""];
  const opt = m.result?.multi ? m.activeTeamOption : null;
  if (opt) {
    for (const mem of opt.members) {
      const c = mem.candidate;
      if (!c) { out.push(`• ${mem.slot_label}: open seat`); continue; }
      const gap = mustGaps(c)[0];
      out.push(`• ${mem.slot_label}: ${c.name} (${c.seniority}, ${c.location}) — ${fitWord(c.fit).word} match (${c.fit}%), ${availText(c.availability_code).toLowerCase()}${gap ? `. To check: ${gap.label.toLowerCase()}` : ""}`);
    }
  } else {
    const role = m.result?.roles[0];
    const picked = role && m.locks[`${role.id}#0`];
    const list = role ? rankCandidates(role.candidates) : [];
    const chosen = list.find((c) => c.employee_id === picked);
    if (chosen) out.push(`Chosen: ${chosen.name} (${chosen.position}, ${chosen.location}) — ${fitWord(chosen.fit).word} match (${chosen.fit}%), ${availText(chosen.availability_code).toLowerCase()}`);
    else list.slice(0, 3).forEach((c, i) => out.push(`${i + 1}. ${c.name} (${c.position}, ${c.location}) — ${fitWord(c.fit).word} match (${c.fit}%), ${availText(c.availability_code).toLowerCase()}`));
  }
  out.push("", "Found with Talentic — internal talent matching on NTT DATA profiles.");
  return out.join("\n");
}

function Results({ m }: { m: Matcher }) {
  const [open, setOpen] = useState<{ roleId: string; c: Candidate } | null>(null);
  const [selected, setSelected] = useState<Record<string, string[]>>({});
  const [comparing, setComparing] = useState(false);
  const [replaceSlot, setReplaceSlot] = useState<string | null>(null);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [addRoleOpen, setAddRoleOpen] = useState(false);
  const { result, spec } = m;

  useEffect(() => { setSelected({}); setOpen(null); setReplaceSlot(null); setComparing(false); }, [m.session]);

  if (m.phase === "interpreting" || m.phase === "searching") return <Loading m={m} />;
  if (m.phase === "error") {
    return (
      <main className="mx-auto max-w-xl px-4 py-16 text-center sm:px-6 sm:py-24">
        <p className="text-[16px]" style={{ color: "var(--v-bad)" }}>{m.error}</p>
        <div className="mt-6 flex justify-center gap-2"><Btn onClick={m.startNewSearch}><ArrowLeft size={15} /> Back</Btn><Btn variant="primary" onClick={() => m.submit()}>Try again</Btn></div>
      </main>
    );
  }
  if (!result || !spec) return null;

  const multi = result.multi;
  const opt = m.activeTeamOption;
  const role = result.roles.find((r) => r.id === m.tab);
  const roleSpec = role ? m.roleById[role.id] : undefined;
  const teamView = multi && (m.tab === "team" || !role);

  const teamSlotByEmp = new Map<string, TeamMember>();
  if (multi && opt) for (const mem of opt.members) if (mem.candidate) teamSlotByEmp.set(mem.candidate.employee_id, mem);

  const openCard = (roleId: string, c: Candidate) => { setOpen({ roleId, c }); m.explain(roleId, c.employee_id); };
  const openId = async (roleId: string, employeeId: string) => {
    const c = await m.candidate(roleId, employeeId);
    if (c) openCard(roleId, c);
  };

  /** What "choosing" this person means here: pick for a single role, or take a seat in the team. */
  const placeAction = (roleId: string, c: Candidate): ProfileAction | null => {
    if (!multi) {
      const sid = `${roleId}#0`;
      return m.locks[sid] === c.employee_id ? { label: "Picked", done: true } : { label: "Pick", onClick: () => m.assignCandidate(sid, c.employee_id) };
    }
    if (teamSlotByEmp.has(c.employee_id)) return { label: "In the team", done: true };
    const slots = (opt?.members ?? []).filter((x) => x.role_id === roleId);
    const empty = slots.find((s) => !s.candidate);
    const target = empty ?? [...slots].sort((a, b) => Number(a.locked) - Number(b.locked) || (a.candidate?.fit ?? 0) - (b.candidate?.fit ?? 0))[0];
    if (!target) return null;
    return { label: target.candidate ? `Use instead of ${first(target.candidate.name)}` : "Put in team", onClick: () => m.assignCandidate(target.slot_id, c.employee_id) };
  };

  /** Why a strong person is not in the team, in plain words (from the solver's swap analysis). */
  const whyNot = (roleId: string, c: Candidate): string | null => {
    if (!multi || !opt || teamSlotByEmp.has(c.employee_id)) return null;
    for (const mem of opt.members) {
      if (mem.role_id !== roleId) continue;
      const sw = mem.swaps.find((x) => x.candidate.employee_id === c.employee_id);
      if (sw) {
        const bad = plainImpacts(sw).filter((x) => !x.good);
        if (bad.length) return bad.map((x) => x.text.toLowerCase()).join(", ");
      }
    }
    return null;
  };

  const sel = role ? selected[role.id] ?? [] : [];
  const toggleSel = (id: string) => role && setSelected((p) => {
    const cur = p[role.id] ?? [];
    return { ...p, [role.id]: cur.includes(id) ? cur.filter((x) => x !== id) : cur.length >= 4 ? cur : [...cur, id] };
  });
  const people = role ? (sel.map((id) => role.candidates.find((c) => c.employee_id === id)).filter(Boolean) as Candidate[]) : [];
  const replaceMember = replaceSlot && opt ? opt.members.find((x) => x.slot_id === replaceSlot) ?? null : null;

  return (
    <main className="mx-auto max-w-6xl px-4 pb-28 pt-4 fade-in sm:px-6 sm:pt-8">
      <Header m={m} teamView={teamView} role={role} roleSpec={roleSpec} onAddRole={() => setAddRoleOpen(true)} />

      <div className="transition-opacity" style={{ opacity: m.refreshing ? 0.55 : 1 }}>
        {teamView && opt && (
          <TeamScreen m={m} opt={opt} onOpen={openCard} onReplace={setReplaceSlot} onRules={() => setRulesOpen(true)} onAddRole={() => setAddRoleOpen(true)} />
        )}
        {teamView && !opt && <p className="mt-8 text-[15px]" style={ink2}>No team could be built with these rules. Open a role to loosen its rules.</p>}
        {!teamView && role && roleSpec && (
          <RoleScreen
            m={m}
            role={role}
            roleSpec={roleSpec}
            canRemove={spec.roles.length > 1}
            selected={sel}
            onToggle={toggleSel}
            onOpen={(c) => openCard(role.id, c)}
            onOpenId={(id) => openId(role.id, id)}
            placeAction={(c) => placeAction(role.id, c)}
            inTeam={(c) => teamSlotByEmp.get(c.employee_id) ?? null}
            whyNot={(c) => whyNot(role.id, c)}
          />
        )}
      </div>

      {role && sel.length > 0 && !teamView && (
        <div className="sticky bottom-[max(1rem,env(safe-area-inset-bottom))] z-30 mt-6 flex justify-center sm:bottom-5">
          <div className="fade-in flex w-full max-w-md items-center justify-between gap-2 rounded-md border bg-white py-2 pl-2.5 pr-2 shadow-[0_12px_32px_rgba(31,35,40,.16)] sm:w-auto sm:gap-3 sm:pl-3" style={line}>
            <div className="flex min-w-0 items-center gap-2">
              <div className="flex shrink-0 -space-x-2">{people.map((c) => <span key={c.employee_id} className="rounded-full ring-2 ring-white"><Avatar c={c} size={30} /></span>)}</div>
              <span className="truncate text-[14px] font-medium">{sel.length < 2 ? "Pick one more" : `${sel.length} selected`}</span>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <Btn variant="ghost" small onClick={() => setSelected((p) => ({ ...p, [role.id]: [] }))}>Clear</Btn>
              <Btn variant="primary" small disabled={sel.length < 2} onClick={() => setComparing(true)}>Compare</Btn>
            </div>
          </div>
        </div>
      )}

      {comparing && role && people.length >= 2 && (
        <Compare people={people} roleTitle={role.title} onClose={() => setComparing(false)} onOpen={(c) => { setComparing(false); openCard(role.id, c); }} action={(c) => placeAction(role.id, c)} />
      )}
      {open && (
        <Profile
          c={open.c}
          roleTitle={m.roleById[open.roleId]?.title ?? ""}
          exp={m.explanation(open.roleId, open.c.employee_id)}
          onClose={() => setOpen(null)}
          action={placeAction(open.roleId, open.c) ?? undefined}
        />
      )}
      {replaceMember && (
        <ReplaceDrawer
          m={m}
          member={replaceMember}
          onClose={() => setReplaceSlot(null)}
          onView={(id) => openId(replaceMember.role_id, id)}
          onSeeAll={() => { setReplaceSlot(null); m.setTab(replaceMember.role_id); window.scrollTo({ top: 0 }); }}
        />
      )}
      {rulesOpen && result.team && opt && <RulesDrawer m={m} opt={opt} onClose={() => setRulesOpen(false)} />}
      {addRoleOpen && <AddRoleDrawer m={m} onClose={() => setAddRoleOpen(false)} />}
    </main>
  );
}

// ---------------------------------------------------------------- header
function SaveState({ m }: { m: Matcher }) {
  if (m.refreshing) return <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold" style={ink3}><Spinner size={11} /> Updating…</span>;
  if (m.savingProject || (m.activeProjectId && m.dirty) || !m.activeProjectId)
    return <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold" style={ink3}><Spinner size={11} /> Saving…</span>;
  return <span className="inline-flex items-center gap-1 text-[12px] font-semibold" style={ink3}><Check size={13} strokeWidth={3} /> Saved</span>;
}

function TitleEdit({ m, title }: { m: Matcher; title: string }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(title);
  useEffect(() => setValue(title), [title]);
  const done = () => { setEditing(false); if (value.trim() && value.trim() !== title) m.renameProject(value); else setValue(title); };
  if (editing) {
    return (
      <input autoFocus value={value} onChange={(e) => setValue(e.target.value)} onBlur={done} onKeyDown={(e) => { if (e.key === "Enter") done(); if (e.key === "Escape") { setValue(title); setEditing(false); } }}
        className="v-display w-full rounded-md border bg-white px-2 py-0.5 text-[24px] font-bold leading-9 tracking-tight outline-none sm:text-[30px]" style={{ borderColor: "var(--v-accent)" }} />
    );
  }
  return (
    <h1 className="v-display group flex items-start gap-2 text-[24px] font-bold leading-8 tracking-tight sm:text-[30px] sm:leading-9">
      <span>{title}</span>
      {m.activeProjectId && (
        <button onClick={() => setEditing(true)} title="Rename" className="mt-1.5 shrink-0 rounded-md p-1 opacity-50 transition-opacity hover:bg-[var(--v-chip)] hover:opacity-100 sm:opacity-0 sm:group-hover:opacity-100" style={ink2}><Pencil size={16} /></button>
      )}
    </h1>
  );
}

function Header({ m, teamView, role, roleSpec, onAddRole }: { m: Matcher; teamView: boolean; role?: RoleResult; roleSpec?: RoleSpec; onAddRole: () => void }) {
  const result = m.result!;
  const spec = m.spec!;
  const multi = result.multi;
  const opt = m.activeTeamOption;
  const filled = multi ? opt?.members.filter((x) => x.candidate).length ?? 0 : role && m.locks[`${role.id}#0`] ? 1 : 0;
  const confirmed = m.activeProject?.status === "staffed";
  const copy = async () => { await copyText(teamSummaryText(m)); };
  const [copied, setCopied] = useState(false);

  const actions = (
    <div className="flex shrink-0 items-center gap-2">
      <SaveState m={m} />
      <Btn variant="ghost" small onClick={() => { copy().then(() => { setCopied(true); window.setTimeout(() => setCopied(false), 1800); }); }} title="Copy a short summary to paste in an email or chat">
        {copied ? <Check size={14} /> : <Copy size={14} />} <span className="hidden sm:inline">{copied ? "Copied" : "Copy summary"}</span>
      </Btn>
      {confirmed ? (
        <Chip tone="good" title="Kept in Projects. Changes are saved automatically."><CheckCircle2 size={13} /> Project</Chip>
      ) : (
        <Btn variant="primary" small disabled={!m.activeProjectId || m.savingProject || m.refreshing || filled === 0} onClick={() => m.confirmTeam()} title={filled === 0 ? "Pick someone first" : "Confirm and keep it in Projects"}>
          <Check size={15} strokeWidth={3} /> {multi ? "Confirm team" : "Confirm pick"}
        </Btn>
      )}
      <Menu
        trigger={<button aria-label="More" className="grid size-8 place-items-center rounded-md hover:bg-[var(--v-chip)]" style={ink2}><MoreHorizontal size={18} /></button>}
        items={[
          { label: <><Plus size={14} /> Add a role</>, onClick: onAddRole },
          ...(m.activeProjectId ? [{ label: <><Trash2 size={14} /> {confirmed ? "Delete project" : "Delete search"}</>, danger: true, onClick: () => { if (window.confirm(confirmed ? "Delete this project?" : "Delete this search?")) m.deleteProject(m.activeProjectId!); } }] : []),
        ]}
      />
    </div>
  );

  if (multi && !teamView && role) {
    return (
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button onClick={() => m.setTab("team")} className="inline-flex items-center gap-1.5 text-[14px] font-semibold" style={{ color: "var(--v-accent)" }}><ArrowLeft size={15} /> {spec.title}</button>
          {actions}
        </div>
        <h1 className="v-display mt-3 text-[24px] font-bold leading-8 tracking-tight sm:text-[30px] sm:leading-9">
          {role.title}{role.count > 1 && <span className="ml-2 text-[16px] font-semibold" style={ink3}>{role.count} seats</span>}
        </h1>
        {roleSpec && <RoleSwitcher m={m} current={role.id} />}
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0 flex-1"><TitleEdit m={m} title={spec.title} /></div>
        {actions}
      </div>
      {multi && <RoleSwitcher m={m} current="team" />}
    </div>
  );
}

/** Quiet text links to each role's candidate list (replaces the old tab pills). */
function RoleSwitcher({ m, current }: { m: Matcher; current: string }) {
  const roles = m.result?.roles ?? [];
  return (
    <div className="no-scrollbar -mx-4 mt-2 flex items-center gap-x-1 overflow-x-auto px-4 text-[13px] sm:mx-0 sm:flex-wrap sm:px-0">
      <span className="mr-1 shrink-0 font-semibold" style={ink3}>Roles:</span>
      {roles.map((r, i) => (
        <span key={r.id} className="inline-flex shrink-0 items-center">
          {i > 0 && <span className="mx-1" style={ink3}>·</span>}
          <button onClick={() => { m.setTab(r.id); window.scrollTo({ top: 0 }); }} className={`rounded px-0.5 font-semibold hover:underline ${current === r.id ? "underline underline-offset-4" : ""}`} style={{ color: current === r.id ? "var(--v-ink)" : "var(--v-accent)" }}>
            {r.title}{r.count > 1 ? ` ×${r.count}` : ""}
          </button>
        </span>
      ))}
    </div>
  );
}

// ------------------------------------------------------------------ team
function TeamScreen({ m, opt, onOpen, onReplace, onRules, onAddRole }: {
  m: Matcher; opt: TeamOption; onOpen: (roleId: string, c: Candidate) => void; onReplace: (slotId: string) => void; onRules: () => void; onAddRole: () => void;
}) {
  const [reviewOpen, setReviewOpen] = useState(false);
  useEffect(() => { if (reviewOpen) m.loadReview(); }, [reviewOpen, m]);
  const failedRules = opt.shape.checks.filter((c) => !c.ok).length;

  return (
    <div className="mt-5 space-y-5 fade-in">
      <OptionSwitch m={m} />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-[repeat(auto-fill,minmax(200px,1fr))]">
        {opt.members.map((mem) => <RosterCard key={mem.slot_id} m={m} member={mem} onOpen={onOpen} onReplace={onReplace} />)}
      </div>

      <TeamHealth opt={opt} onOpen={onOpen} onReplace={onReplace} />

      <div className="flex flex-wrap items-center gap-2">
        <Btn small onClick={() => setReviewOpen((v) => !v)} className={reviewOpen ? "!border-[var(--v-accent)]" : ""}>
          <Sparkles size={14} style={{ color: "var(--v-accent)" }} /> AI review <ChevronDown size={14} className="transition-transform" style={{ transform: reviewOpen ? "rotate(180deg)" : undefined }} />
        </Btn>
        <Btn small onClick={onRules}>
          <SlidersHorizontal size={14} /> Team rules
          {failedRules > 0 && <span className="rounded-md px-1.5 text-[11px] font-bold" style={{ background: "var(--v-warn-soft)", color: "var(--v-warn)" }}>{failedRules} not met</span>}
        </Btn>
        <Btn small onClick={onAddRole}><Plus size={14} /> Add a role</Btn>
      </div>
      {reviewOpen && <AIReview m={m} opt={opt} onOpen={onOpen} />}
    </div>
  );
}

const VERDICT_META: Record<string, { label: string; tone: "good" | "warn" | "bad" }> = {
  strong: { label: "Strong team", tone: "good" },
  solid: { label: "Solid team", tone: "good" },
  mixed: { label: "Some weak spots", tone: "warn" },
  weak: { label: "Weak team", tone: "bad" },
};

/**
 * The review as a ~7-second read-out: the verdict, the single biggest strength and the single
 * biggest risk (the AI lists both most-important-first). Everything else stays on screen.
 */
function spokenReview(verdict: string, pros: { name: string; text: string }[], cons: { name: string; text: string }[]) {
  const say = (it: { name: string; text: string }) => {
    const t = it.text.replace(/…$/, "");
    return it.name ? `${first(it.name)}, ${t}` : t; // keep case: "SQL" must stay an acronym
  };
  return [
    `${verdict}.`,
    pros[0] ? `Best: ${say(pros[0])}.` : "",
    cons[0] ? `Risk: ${say(cons[0])}.` : "No real risks.",
  ].filter(Boolean).join(" ");
}

/** AI review as two short lists: pros on the left, cons on the right. */
function AIReview({ m, opt, onOpen }: { m: Matcher; opt: TeamOption; onOpen: (roleId: string, c: Candidate) => void }) {
  const review = m.review;
  const byName = new Map(opt.members.filter((x) => x.candidate).map((x) => [x.candidate!.name, x]));
  if (review === undefined || review === "loading") {
    return (
      <Card className="p-4 fade-in">
        <div className="flex items-center gap-2 text-[13px] font-semibold" style={ink3}><Spinner size={13} /> AI is reviewing the team…</div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {[0, 1].map((i) => <div key={i} className="space-y-2 rounded-md p-3" style={{ background: "var(--v-chip)" }}>{[0, 1, 2].map((j) => <div key={j} className="shimmer h-5 rounded-[2px]" />)}</div>)}
        </div>
      </Card>
    );
  }
  if (!review.ok) return <Card className="p-4 text-[14px]" style={ink2}>{review.error}</Card>;

  const meta = VERDICT_META[review.verdict ?? "mixed"] ?? VERDICT_META.mixed;
  const column = (kind: "pro" | "con", items: { name: string; text: string }[]) => {
    const pro = kind === "pro";
    const color = pro ? "var(--v-good)" : "var(--v-warn)";
    return (
      <div className="rounded-md p-3 sm:p-4" style={{ background: pro ? "var(--v-good-soft)" : "var(--v-warn-soft)" }}>
        <div className="flex items-center gap-2 text-[13px] font-bold" style={{ color }}>
          {pro ? <ThumbsUp size={15} /> : <ThumbsDown size={15} />} {pro ? "Pros" : "Cons"}
          <span className="ml-auto grid size-6 place-items-center rounded-md bg-white text-[12px]">{items.length}</span>
        </div>
        {items.length === 0 ? (
          <p className="mt-3 text-[13px]" style={ink3}>{pro ? "No clear strengths" : "Nothing stands out"}</p>
        ) : (
          <ul className="mt-2.5 space-y-1.5">
            {items.map((it) => {
              const mem = it.name ? byName.get(it.name) : undefined;
              const c = mem?.candidate;
              return (
                <li key={`${it.name}|${it.text}`}>
                  <button
                    disabled={!c}
                    onClick={() => c && mem && onOpen(mem.role_id, c)}
                    className="flex w-full items-center gap-2.5 rounded-md bg-white px-2.5 py-2 text-left transition-shadow enabled:hover:shadow-[0_4px_14px_rgba(31,35,40,.08)] disabled:cursor-default"
                  >
                    <span className="grid size-5 shrink-0 place-items-center rounded-[4px] text-white" style={{ background: color }}>
                      {pro ? <Check size={13} strokeWidth={3} /> : <X size={13} strokeWidth={3} />}
                    </span>
                    <span className="min-w-0 flex-1 text-[14px] font-semibold leading-5">{it.text}</span>
                    {c ? (
                      <span className="inline-flex shrink-0 items-center gap-1.5 text-[12px] font-semibold" style={ink3} title={`${c.name} · ${mem!.slot_label}`}>
                        {first(c.name)} <Avatar c={c} size={22} />
                      </span>
                    ) : (
                      <span className="inline-flex shrink-0 items-center gap-1 text-[12px] font-semibold" style={ink3}>Team <Users size={14} /></span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    );
  };

  return (
    <Card className="p-4 sm:p-5 fade-in">
      <div className="flex flex-wrap items-center gap-2.5">
        <span className="inline-flex items-center gap-1.5 text-[13px] font-bold"><Sparkles size={14} style={{ color: "var(--v-accent)" }} /> AI review</span>
        <Chip tone={meta.tone}>{meta.tone === "good" ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />} {meta.label}</Chip>
        {m.meta?.voice && <span className="ml-auto"><ListenButton text={spokenReview(meta.label, review.pros ?? [], review.cons ?? [])} /></span>}
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {column("pro", review.pros ?? [])}
        {column("con", review.cons ?? [])}
      </div>
      <p className="mt-3 text-[11px]" style={ink3}>Written by AI from the team data · click a person to see the evidence</p>
    </Card>
  );
}

function optionKey(o: TeamOption) {
  return o.members.map((x) => x.candidate?.employee_id ?? "-").join(",");
}

/** Alternatives only when they are really different, each with its trade-off in words. */
function OptionSwitch({ m }: { m: Matcher }) {
  const t = m.result?.team;
  if (!t) return null;
  const rec = t.options.find((o) => o.id === "best_fit") ?? t.options[0];
  const seen = new Set<string>();
  const distinct = [rec, ...t.options.filter((o) => o.id !== rec.id)].filter((o) => {
    const k = optionKey(o);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  if (distinct.length < 2) return null;
  const seniorPlus = (o: TeamOption) => o.shape.counts.anchor + o.shape.counts.senior;
  const hint = (o: TeamOption) => {
    if (o.id === rec.id) return "Balanced mix";
    const parts: string[] = [];
    const d = o.avg_fit - rec.avg_fit;
    if (d !== 0) parts.push(`${d > 0 ? "+" : ""}${d}% match`);
    if (o.ready_now_count === o.slots_filled && rec.ready_now_count < rec.slots_filled) parts.push("all free now");
    else if (o.ready_now_count > rec.ready_now_count) parts.push(`${o.ready_now_count} free now`);
    if (seniorPlus(o) > seniorPlus(rec)) parts.push(`${seniorPlus(o)} of ${o.slots_filled} senior`);
    else if (seniorPlus(o) < seniorPlus(rec)) parts.push("fewer seniors");
    return parts.join(" · ") || "Different people";
  };
  const active = m.activeTeamOption?.id;
  return (
    <div className="flex items-center gap-2">
      <span className="hidden text-[13px] font-semibold sm:inline" style={ink3}>Options</span>
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
        {distinct.map((o) => {
          const on = o.id === active;
          return (
            <button key={o.id} onClick={() => m.setTeamOption(o.id)} className="shrink-0 rounded-md border px-3.5 py-2 text-left transition-colors" style={on ? { borderColor: "var(--v-ink)", background: "#fff", boxShadow: "0 0 0 1px var(--v-ink)" } : { ...line, background: "rgba(255,255,255,.6)" }}>
              <div className="text-[13px] font-bold">{OPTION_NAME[o.id] ?? o.label}</div>
              <div className="text-[12px]" style={ink2}>{hint(o)}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function RosterCard({ m, member, onOpen, onReplace }: { m: Matcher; member: TeamMember; onOpen: (roleId: string, c: Candidate) => void; onReplace: (slotId: string) => void }) {
  const c = member.candidate;
  if (!c) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-[var(--v-radius)] border-2 border-dashed p-5 text-center" style={line}>
        <div className="text-[12px] font-bold uppercase tracking-wide" style={ink3}>{member.slot_label}</div>
        <p className="text-[14px]" style={ink2}>Nobody fits the rules yet</p>
        <Btn variant="link" small onClick={() => m.setTab(member.role_id)}>Loosen the rules</Btn>
      </div>
    );
  }
  const gap = mustGaps(c)[0];
  const city = c.location.split(",")[0];
  const note = gap ? (
    <span className="inline-flex items-start gap-1 font-semibold" style={{ color: "var(--v-warn)" }}><CircleAlert size={13} className="mt-[1px] shrink-0" /> {gap.label} {gap.status === "partial" ? "partly shown" : "not shown"}</span>
  ) : member.mentor && member.team_role === "learner" ? (
    <span style={ink3}>Mentored by {first(member.mentor.name)}</span>
  ) : c.other_team || c.hidden_sector ? (
    <GemTag c={c} />
  ) : null;
  return (
    <div className="group flex flex-col rounded-[var(--v-radius)] border bg-white p-4 transition-shadow hover:shadow-[0_10px_28px_rgba(31,35,40,.09)]" style={line}>
      <div className="flex items-start justify-between gap-2 sm:block">
        <div className="line-clamp-2 text-[12px] font-semibold leading-4 sm:min-h-[32px] sm:text-center" style={ink3} title={member.slot_label}>
          {member.locked && <span title="You chose this person. They stay when the rest of the team is re-balanced."><Pin size={11} className="mr-1 inline align-[-1px]" /></span>}
          {member.slot_label}
        </div>
        <button onClick={() => onReplace(member.slot_id)} className="-mt-1 inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-[13px] font-semibold sm:hidden" style={ink2}><ArrowLeftRight size={13} /> Replace</button>
      </div>
      <button onClick={() => onOpen(member.role_id, c)} className="mt-2 flex items-center gap-3 text-left sm:flex-col sm:text-center">
        <Avatar c={c} size={52} />
        <div className="min-w-0 flex-1 sm:w-full">
          <div className="truncate text-[15px] font-bold leading-5">{c.name}</div>
          <div className="truncate text-[13px]" style={ink2}>{c.seniority} · {city}</div>
        </div>
      </button>
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 sm:flex-col sm:gap-1.5">
        <FitMeter fit={c.fit} gap={Boolean(gap)} />
        <AvailDot code={c.availability_code} short />
      </div>
      {note && <div className="mt-2 text-[12px] sm:text-center">{note}</div>}
      <div className="mt-auto hidden justify-center pt-2 sm:flex">
        <Btn variant="ghost" small onClick={() => onReplace(member.slot_id)}><ArrowLeftRight size={13} /> Replace</Btn>
      </div>
    </div>
  );
}

function Bar({ parts }: { parts: { n: number; color: string }[] }) {
  const total = parts.reduce((a, p) => a + p.n, 0) || 1;
  return (
    <span className="flex h-2 w-full overflow-hidden rounded-[2px]" style={{ background: "var(--v-line)" }}>
      {parts.filter((p) => p.n > 0).map((p, i) => <span key={i} style={{ width: `${(p.n / total) * 100}%`, background: p.color }} className="h-full border-r border-white last:border-r-0" />)}
    </span>
  );
}

type TileId = "skills" | "availability" | "seniority" | "together";
const LEVELS = ["Principal", "Lead", "Senior", "Mid", "Junior", "Trainee"];
const LEVEL_COLOR: Record<string, string> = { Principal: "#003B6F", Lead: "#003B6F", Senior: "#0072BC", Mid: "#5BC0EB", Junior: "#9ED9C9", Trainee: "#9ED9C9" };
const RULE_PLAIN: Record<string, string> = {
  anchor: "A Lead or Principal anchors the team",
  senior_cap: "Not too many seniors",
  mid: "Mid-level people do the build",
  junior: "A junior learns from a senior mentor",
  language: "Everyone shares a working language",
  timezone: "Time zones close enough to work together",
};

function PersonLine({ mem, sub, onOpen }: { mem: TeamMember; sub?: ReactNode; onOpen: (roleId: string, c: Candidate) => void }) {
  const c = mem.candidate!;
  return (
    <button onClick={() => onOpen(mem.role_id, c)} className="flex min-w-0 items-center gap-2.5 rounded-md text-left hover:opacity-80">
      <Avatar c={c} size={30} />
      <span className="min-w-0">
        <span className="block truncate text-[13px] font-bold">{c.name}</span>
        <span className="block truncate text-[12px]" style={ink3}>{sub ?? mem.slot_label}</span>
      </span>
    </button>
  );
}

function RuleLines({ opt, rules }: { opt: TeamOption; rules: string[] }) {
  const checks = opt.shape.checks.filter((ch) => rules.includes(ch.rule));
  if (!checks.length) return null;
  return (
    <ul className="mt-4 space-y-1.5 border-t pt-3" style={line}>
      {checks.map((ch) => (
        <li key={ch.rule} className="flex items-start gap-2 text-[13px]">
          {ch.ok ? <CheckCircle2 size={15} className="mt-0.5 shrink-0" style={{ color: "var(--v-good)" }} /> : <AlertCircle size={15} className="mt-0.5 shrink-0" style={{ color: "var(--v-warn)" }} />}
          <span><b>{RULE_PLAIN[ch.rule] ?? ch.label}</b> <span style={ink3}>— {ch.detail}</span></span>
        </li>
      ))}
    </ul>
  );
}

/** The team at a glance; each tile opens a visual breakdown. */
function TeamHealth({ opt, onOpen, onReplace }: { opt: TeamOption; onOpen: (roleId: string, c: Candidate) => void; onReplace: (slotId: string) => void }) {
  const [open, setOpen] = useState<TileId | null>(null);
  const people = opt.members.filter((x) => x.candidate);
  const cs = people.map((x) => x.candidate!);
  const mustTotal = cs.reduce((a, c) => a + c.must_total, 0);
  const mustCov = cs.reduce((a, c) => a + c.must_covered, 0);
  const now = cs.filter((c) => c.availability_code === 0).length;
  const soon = cs.filter((c) => c.availability_code === 1).length;
  const later = cs.length - now - soon;
  const k = opt.shape.counts;
  const shared = opt.shared_languages;

  const tile = (id: TileId, title: string, ok: boolean, bar: ReactNode, foot: ReactNode) => {
    const on = open === id;
    return (
      <button onClick={() => setOpen(on ? null : id)} aria-expanded={on} className="rounded-[var(--v-radius)] border bg-white p-3.5 text-left transition-colors hover:border-[var(--v-accent)]" style={on ? { borderColor: "var(--v-accent)", boxShadow: "0 0 0 1px var(--v-accent)" } : line}>
        <div className="flex items-center justify-between gap-2 text-[12px] font-bold" style={ink3}>
          <span className="inline-flex items-center gap-1.5">
            {ok ? <Check size={13} strokeWidth={3} style={{ color: "var(--v-good)" }} /> : <AlertCircle size={13} style={{ color: "var(--v-warn)" }} />}
            {title}
          </span>
          <ChevronDown size={15} className="transition-transform" style={{ transform: on ? "rotate(180deg)" : undefined }} />
        </div>
        <div className="mt-2">{bar}</div>
        <div className="mt-1.5 text-[13px] font-semibold">{foot}</div>
      </button>
    );
  };

  let detail: ReactNode = null;
  if (open === "skills") {
    detail = (
      <div className="space-y-3">
        {people.map((mem) => {
          const c = mem.candidate!;
          const must = c.requirements.filter((r) => r.importance === "must" && r.status !== "unknown");
          const gap = must.some((r) => r.status !== "covered");
          return (
            <div key={mem.slot_id} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
              <div className="sm:w-56 sm:shrink-0"><PersonLine mem={mem} onOpen={onOpen} /></div>
              <div className="flex flex-1 flex-wrap gap-1.5">
                {must.map((r) => (
                  <span key={r.id} className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[12px] font-semibold" style={{ background: r.status === "covered" ? "var(--v-chip)" : "var(--v-warn-soft)", color: r.status === "covered" ? "var(--v-ink)" : "var(--v-warn)" }}>
                    <StatusIcon s={r.status} size={14} /> {r.label}
                  </span>
                ))}
              </div>
              {gap && <Btn variant="link" small onClick={() => onReplace(mem.slot_id)}>See options</Btn>}
            </div>
          );
        })}
      </div>
    );
  } else if (open === "availability") {
    const groups = [
      { code: 0, label: "Free now" },
      { code: 1, label: "Free within 3 months", sub: "finishing another project" },
      { code: 2, label: "On a project" },
    ];
    const used = groups.filter((g) => people.some((x) => x.candidate!.availability_code === g.code));
    detail = (
      <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(auto-fit, minmax(${used.length > 1 ? 200 : 260}px, 1fr))` }}>
        {used.map((g) => {
          const list = people.filter((x) => x.candidate!.availability_code === g.code);
          return (
            <div key={g.code} className="rounded-md p-3" style={{ background: "var(--v-chip)" }}>
              <div className="flex items-center gap-2 text-[13px] font-bold">
                <span className="size-2.5 rounded-full" style={{ background: availColor(g.code) }} /> {g.label}
                <span className="ml-auto text-[18px]" style={{ color: availColor(g.code) }}>{list.length}</span>
              </div>
              {g.sub && <div className="text-[11px]" style={ink3}>{g.sub}</div>}
              <div className="mt-2.5 grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" }}>{list.map((mem) => <PersonLine key={mem.slot_id} mem={mem} onOpen={onOpen} />)}</div>
            </div>
          );
        })}
      </div>
    );
  } else if (open === "seniority") {
    const levels = LEVELS.filter((l) => people.some((x) => x.candidate!.seniority === l));
    const mentored = people.filter((x) => x.mentor && x.team_role === "learner");
    detail = (
      <>
        <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(auto-fit, minmax(160px, 1fr))` }}>
          {levels.map((l) => {
            const list = people.filter((x) => x.candidate!.seniority === l);
            return (
              <div key={l} className="rounded-md p-3" style={{ background: "var(--v-chip)", borderTop: `3px solid ${LEVEL_COLOR[l]}` }}>
                <div className="flex items-center text-[13px] font-bold">{l}<span className="ml-auto text-[18px]" style={{ color: LEVEL_COLOR[l] }}>{list.length}</span></div>
                <div className="mt-2.5 space-y-2">{list.map((mem) => <PersonLine key={mem.slot_id} mem={mem} onOpen={onOpen} />)}</div>
              </div>
            );
          })}
        </div>
        {mentored.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {mentored.map((x) => <Chip key={x.slot_id}><Users size={12} /> {first(x.candidate!.name)} learns from {first(x.mentor!.name)}</Chip>)}
          </div>
        )}
        <RuleLines opt={opt} rules={["anchor", "senior_cap", "mid", "junior"]} />
      </>
    );
  } else if (open === "together") {
    detail = (
      <>
        <div className="flex flex-wrap items-center gap-2">
          {shared.length ? shared.map((l) => <Chip key={l} tone="good"><Globe size={12} /> Everyone speaks {l}</Chip>) : <Chip tone="warn"><Globe size={12} /> No language everyone shares</Chip>}
          <Chip><Clock size={12} /> {opt.tz_summary}</Chip>
        </div>
        <div className="mt-3 divide-y" style={line}>
          {people.map((mem) => {
            const langs = mem.candidate!.evidence.filter((e) => e.type === "language").map((e) => e.text.replace(/ Nativo$/, " · native"));
            return (
              <div key={mem.slot_id} className="flex flex-col gap-1.5 py-2.5 sm:flex-row sm:items-center sm:gap-4" style={line}>
                <div className="sm:w-56 sm:shrink-0"><PersonLine mem={mem} sub={mem.candidate!.location} onOpen={onOpen} /></div>
                <div className="flex flex-wrap gap-1.5">
                  {langs.map((l) => {
                    const isShared = shared.some((s) => l.startsWith(s));
                    return <span key={l} className="rounded-md px-2 py-0.5 text-[12px] font-semibold" style={isShared ? { background: "var(--v-good-soft)", color: "var(--v-good)" } : { background: "var(--v-chip)", color: "var(--v-ink2)" }}>{l}</span>;
                  })}
                </div>
              </div>
            );
          })}
        </div>
        <RuleLines opt={opt} rules={["language", "timezone"]} />
      </>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tile("skills", "Skills", mustCov === mustTotal, <Bar parts={[{ n: mustCov, color: "var(--v-good)" }, { n: mustTotal - mustCov, color: "var(--v-warn)" }]} />, `${mustCov} of ${mustTotal} must-haves`)}
        {tile("availability", "Availability", later === 0, <Bar parts={[{ n: now, color: availColor(0) }, { n: soon, color: availColor(1) }, { n: later, color: availColor(2) }]} />, [now && `${now} now`, soon && `${soon} < 3 mo`, later && `${later} busy`].filter(Boolean).join(" · "))}
        {tile("seniority", "Seniority mix", !opt.shape.checks.some((c) => !c.ok && c.rule !== "junior"), <Bar parts={[{ n: k.anchor, color: "#003B6F" }, { n: k.senior, color: "#0072BC" }, { n: k.mid, color: "#5BC0EB" }, { n: k.junior, color: "#9ED9C9" }]} />, opt.shape.summary)}
        {tile("together", "Works together", shared.length > 0, <span className="block h-2" />, <span className="inline-flex flex-wrap items-center gap-x-2"><span className="inline-flex items-center gap-1"><Globe size={12} /> {shared.slice(0, 2).join(", ") || "No shared language"}</span><span className="inline-flex items-center gap-1"><Clock size={12} /> {opt.tz_summary}</span></span>)}
      </div>
      {detail && <Card className="p-4 fade-in sm:p-5">{detail}</Card>}
      {opt.team_needs.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[12px] font-bold" style={ink3}>Whole team</span>
          {opt.team_needs.map((tn) => (
            <Chip key={tn.id} tone={tn.ok ? "good" : "warn"} title={tn.members.length ? `Covered by ${tn.members.join(", ")}` : "Nobody covers this yet"}>
              {tn.ok ? <Check size={12} strokeWidth={3} /> : <AlertCircle size={12} />} {tn.label} · {tn.ok ? `${tn.covered} people` : `${tn.covered} of ${tn.target} needed`}
            </Chip>
          ))}
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------- replace drawer
function ReplaceDrawer({ m, member, onClose, onView, onSeeAll }: { m: Matcher; member: TeamMember; onClose: () => void; onView: (employeeId: string) => void; onSeeAll: () => void }) {
  const c = member.candidate;
  const roleCount = m.result?.roles.find((r) => r.id === member.role_id)?.candidates.length ?? 0;
  return (
    <Drawer
      title={c ? `Replace ${first(c.name)}` : `Fill ${member.slot_label}`}
      sub={member.slot_label}
      onClose={onClose}
      footer={<Btn variant="link" onClick={onSeeAll}>See all {roleCount} candidates for {member.slot_label.replace(/ \d+$/, "")} <ArrowRight size={14} /></Btn>}
    >
      <div className="space-y-4 p-5">
        {c && (
          <div className="rounded-md p-4" style={{ background: "var(--v-chip)" }}>
            <div className="flex items-center gap-3">
              <Avatar c={c} size={40} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[14px] font-bold">{c.name} <span className="font-medium" style={ink3}>· now</span></div>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1"><FitMeter fit={c.fit} /><AvailDot code={c.availability_code} short /></div>
              </div>
            </div>
            <p className="mt-2 text-[13px]" style={ink2}>{whyLine(c)}</p>
          </div>
        )}
        <div className="text-[13px] font-bold" style={ink3}>Other good options</div>
        {member.swaps.length === 0 && <p className="text-[14px]" style={ink2}>No other option fits the current rules.</p>}
        <ul className="space-y-2.5">
          {member.swaps.map((sw) => {
            const p = sw.candidate;
            const impacts = plainImpacts(sw);
            return (
              <li key={p.employee_id} className="rounded-md border bg-white p-3.5" style={line}>
                <div className="flex items-center gap-3">
                  <Avatar c={p} size={38} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[14px] font-bold">{p.name} <span className="font-medium" style={ink3}>· {p.seniority}</span></div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1"><FitMeter fit={p.fit} /><AvailDot code={p.availability_code} short /></div>
                  </div>
                </div>
                {impacts.length > 0 && (
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {impacts.map((im) => <Chip key={im.text} tone={im.good ? "good" : "warn"}>{im.good ? <Check size={11} strokeWidth={3} /> : <X size={11} strokeWidth={3} />} {im.text}</Chip>)}
                  </div>
                )}
                <div className="mt-2.5 flex justify-end gap-1">
                  <Btn variant="ghost" small onClick={() => onView(p.employee_id)}>View profile</Btn>
                  <Btn variant="primary" small onClick={() => { m.assignCandidate(member.slot_id, p.employee_id); onClose(); }}>Use {first(p.name)}</Btn>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </Drawer>
  );
}

// --------------------------------------------------------- rules drawer
function RulesDrawer({ m, opt, onClose }: { m: Matcher; opt: TeamOption; onClose: () => void }) {
  const shape: TeamShape = m.teamShape ?? m.result!.team!.shape;
  const set = (patch: Partial<TeamShape>) => m.updateTeamShape({ ...shape, ...patch });
  const pins = Object.keys(m.locks).length;
  const sel = "w-full rounded-md border bg-white px-3 py-2 text-[15px] font-semibold outline-none sm:text-[14px]";
  const row = (label: string, control: ReactNode) => (
    <label className="flex items-center justify-between gap-4 py-2.5">
      <span className="text-[14px]">{label}</span>
      <span className="w-44 shrink-0">{control}</span>
    </label>
  );
  const toggle = (label: string, checked: boolean, onChange: (v: boolean) => void) => (
    <label className="flex cursor-pointer items-center justify-between gap-4 py-2.5">
      <span className="text-[14px]">{label}</span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="size-4 accent-[var(--v-accent)]" />
    </label>
  );
  return (
    <Drawer title="Team rules" sub="How we balance the team. The defaults work for most projects." onClose={onClose}>
      <div className="space-y-5 p-5">
        <Card className="p-4">
          <div className="text-[13px] font-bold" style={ink3}>This team</div>
          <ul className="mt-2 space-y-1.5">
            {opt.shape.checks.map((ch) => (
              <li key={ch.rule} className="flex items-start gap-2 text-[13px]">
                {ch.ok ? <CheckCircle2 size={15} className="mt-0.5 shrink-0" style={{ color: "var(--v-good)" }} /> : <AlertCircle size={15} className="mt-0.5 shrink-0" style={{ color: "var(--v-warn)" }} />}
                <span><b>{ch.label}</b> <span style={ink2}>— {ch.detail}</span></span>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="divide-y px-4" style={line}>
          {toggle("Balance the team automatically", shape.enabled, (v) => set({ enabled: v }))}
          {shape.enabled && (
            <>
              {row("Lead / Principal", <select value={shape.anchors_min} onChange={(e) => set({ anchors_min: Number(e.target.value) })} className={sel} style={line}><option value={0}>No minimum</option><option value={1}>At least 1</option><option value={2}>At least 2</option></select>)}
              {row("Seniors at most", <select value={shape.max_senior_plus_ratio} onChange={(e) => set({ max_senior_plus_ratio: Number(e.target.value) })} className={sel} style={line}><option value={0.4}>40% of team</option><option value={0.5}>50% of team</option><option value={0.6}>60% of team</option><option value={0.8}>80% of team</option><option value={1}>No limit</option></select>)}
              {row("Mid-level", <select value={shape.min_mid} onChange={(e) => set({ min_mid: Number(e.target.value) })} className={sel} style={line}><option value={0}>No minimum</option><option value={1}>At least 1</option><option value={2}>At least 2</option></select>)}
              {row("Juniors (teams of 4+)", <select value={shape.min_junior} onChange={(e) => set({ min_junior: Number(e.target.value) })} className={sel} style={line}><option value={0}>No minimum</option><option value={1}>At least 1</option><option value={2}>At least 2</option></select>)}
              {row("Time zones", <select value={shape.max_tz_spread} onChange={(e) => set({ max_tz_spread: Number(e.target.value) })} className={sel} style={line}><option value={2}>Within 2 hours</option><option value={4}>Within 4 hours</option><option value={6}>Within 6 hours</option><option value={8}>Within 8 hours</option><option value={24}>Any</option></select>)}
              {toggle("Juniors get a senior mentor", shape.mentor_juniors, (v) => set({ mentor_juniors: v }))}
              {toggle("Everyone shares a language (B2+)", shape.prefer_shared_language, (v) => set({ prefer_shared_language: v }))}
              {toggle("Avoid near-identical profiles", shape.avoid_duplicates, (v) => set({ avoid_duplicates: v }))}
            </>
          )}
        </Card>

        <div className="flex flex-wrap gap-2">
          {m.teamShape && <Btn small onClick={m.resetTeamShape}><RotateCcw size={13} /> Back to defaults</Btn>}
          {pins > 0 && <Btn small onClick={m.clearLocks}><Pin size={13} /> Forget my {pins} choice{pins > 1 ? "s" : ""}</Btn>}
        </div>
      </div>
    </Drawer>
  );
}

function AddRoleDrawer({ m, onClose }: { m: Matcher; onClose: () => void }) {
  const [text, setText] = useState("");
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim().length < 4 || m.addingRole) return;
    if (await m.addRoleFromBrief(text)) onClose();
  };
  return (
    <Drawer title="Add a role" sub="Describe it in your own words. The people already chosen stay." onClose={onClose}>
      <form onSubmit={submit} className="space-y-3 p-5">
        <textarea autoFocus value={text} onChange={(e) => setText(e.target.value)} rows={4} placeholder="e.g. A QA automation engineer with Selenium, available now" className="w-full resize-none rounded-md border bg-white px-4 py-3 text-[16px] outline-none focus:border-[var(--v-accent)] sm:text-[15px]" style={line} />
        {m.meta?.voice && canRecord() && <MicButton onText={(t) => setText((v) => (v.trim() ? `${v.trimEnd()} ${t}` : t))} />}
        <Btn variant="primary" type="submit" disabled={text.trim().length < 4 || m.addingRole} className="w-full">
          {m.addingRole ? <><Spinner /> Adding…</> : <>Add to team <ArrowRight size={15} /></>}
        </Btn>
      </form>
    </Drawer>
  );
}

// ------------------------------------------------------------- role view
const AVAIL_LABEL: Record<Availability, string> = { now: "Free now", soon: "Free within 3 months", any: "Any availability" };

function RoleScreen({ m, role, roleSpec, canRemove, selected, onToggle, onOpen, onOpenId, placeAction, inTeam, whyNot }: {
  m: Matcher;
  role: RoleResult;
  roleSpec: RoleSpec;
  canRemove: boolean;
  selected: string[];
  onToggle: (id: string) => void;
  onOpen: (c: Candidate) => void;
  onOpenId: (id: string) => void;
  placeAction: (c: Candidate) => ProfileAction | null;
  inTeam: (c: Candidate) => TeamMember | null;
  whyNot: (c: Candidate) => string | null;
}) {
  const multi = m.result!.multi;
  const list = rankCandidates(role.candidates);
  const f = role.funnel;
  const kw = role.keyword;
  const others = role.candidates.filter((c) => c.other_team).length;
  const allGems = list.length > 0 && list.every((c) => c.other_team || c.hidden_sector);
  return (
    <div className="mt-5 space-y-4 fade-in">
      <Criteria m={m} role={roleSpec} canRemove={canRemove} />

      {/* Funnel, as one quiet line */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-[13px]" style={ink2}>
        <span><b style={{ color: "var(--v-ink)" }}>{fmt.format(f[0].count)}</b> colleagues</span>
        <ArrowRight size={13} style={ink3} />
        <span><b style={{ color: "var(--v-ink)" }}>{fmt.format(f[f.length - 1].count)}</b> meet the rules</span>
        <ArrowRight size={13} style={ink3} />
        <span><b style={{ color: "var(--v-ink)" }}>{list.length}</b> best</span>
        {kw && kw.missed_in_top > 0 && <Chip tone="gold"><Sparkles size={11} /> {kw.missed_in_top} would be missed by keyword search</Chip>}
        {others > 0 && <Chip tone="gold">{others === list.length ? "All" : others} from other teams</Chip>}
      </div>

      {role.complement && (
        <div className="flex items-start gap-2.5 rounded-[var(--v-radius)] px-4 py-3 text-[14px] leading-6" style={{ background: "var(--v-accent-soft)" }}>
          <Users size={17} className="mt-0.5 shrink-0" style={{ color: "var(--v-accent)" }} />
          <span>
            <b>Nobody covers everything alone.</b> Pair {first(role.candidates.find((x) => x.employee_id === role.complement!.for)?.name ?? "")} with{" "}
            <button className="font-bold underline underline-offset-2" onClick={() => onOpenId(role.complement!.person.employee_id)}>{role.complement.person.name}</button>, who covers {role.complement.covers.join(", ").toLowerCase()}.
          </span>
        </div>
      )}

      {list.length === 0 ? (
        <Card className="border-dashed p-8 text-center text-[15px]" style={ink2}>Nobody passes these rules. Try “Free within 3 months” or fewer years of experience.</Card>
      ) : (
        <ol className="space-y-2.5">
          {list.map((c, i) => (
            <CandidateRow key={c.employee_id} c={c} rank={i + 1} multi={multi} showGem={!allGems} selected={selected.includes(c.employee_id)} onToggle={() => onToggle(c.employee_id)} onOpen={() => onOpen(c)} action={placeAction(c)} member={inTeam(c)} whyNot={whyNot(c)} onUnpick={!multi ? () => m.unassignSlot(`${role.id}#0`) : undefined} />
          ))}
        </ol>
      )}
    </div>
  );
}

function CandidateRow({ c, rank, multi, showGem, selected, onToggle, onOpen, action, member, whyNot, onUnpick }: {
  c: Candidate; rank: number; multi: boolean; showGem: boolean; selected: boolean; onToggle: () => void; onOpen: () => void; action: ProfileAction | null; member: TeamMember | null; whyNot: string | null; onUnpick?: () => void;
}) {
  const chosen = action?.done;
  const risk = c.risks[0];
  return (
    <li className="group flex flex-col gap-3 rounded-[var(--v-radius)] border bg-white p-4 transition-shadow hover:shadow-[0_10px_28px_rgba(31,35,40,.08)] sm:flex-row sm:items-center sm:gap-4" style={{ borderColor: chosen ? "var(--v-good)" : selected ? "var(--v-accent)" : "var(--v-line)" }}>
      <button onClick={onOpen} className="flex min-w-0 flex-1 items-start gap-3 text-left">
        <span className="w-5 shrink-0 pt-3 text-center text-[13px] font-bold" style={ink3}>{rank}</span>
        <Avatar c={c} size={44} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-[15px] font-bold leading-5">{c.name}</span>
            {showGem && <GemTag c={c} />}
            {multi && member && <Chip tone="good"><Check size={11} strokeWidth={3} /> In team</Chip>}
          </div>
          <div className="truncate text-[13px]" style={ink2}>{c.position} · {c.location.split(",")[0]} · {c.years} yrs</div>
          <p className="mt-1 text-[13px] leading-5">{whyLine(c)}</p>
          {risk && <p className="mt-0.5 flex items-start gap-1 text-[12px] font-medium" style={{ color: "var(--v-warn)" }}><CircleAlert size={12} className="mt-0.5 shrink-0" /> {risk.text}</p>}
          {whyNot && <p className="mt-0.5 text-[12px]" style={ink3}>Not in the team: {whyNot}</p>}
        </div>
      </button>
      <div className="flex items-center justify-between gap-3 pl-8 sm:w-[190px] sm:flex-col sm:items-start sm:gap-1.5 sm:pl-0">
        <FitMeter fit={c.fit} gap={c.must_covered < c.must_total} />
        <div className="flex items-center gap-3 sm:flex-col sm:items-start sm:gap-1.5">
          <AvailDot code={c.availability_code} short />
          <MustDots c={c} />
        </div>
      </div>
      <div className="flex items-center justify-end gap-2 sm:w-[150px] sm:flex-col sm:items-stretch">
        {action && (chosen ? (
          onUnpick ? (
            <Btn small onClick={onUnpick} className="!border-[var(--v-good)] !text-[var(--v-good)]" title="Click to undo"><Check size={14} strokeWidth={3} /> Picked</Btn>
          ) : (
            <span className="hidden" />
          )
        ) : (
          <Btn small onClick={action.onClick} title={action.label}>
            <span className="max-w-[130px] truncate">{multi ? (action.label.startsWith("Use instead") ? "Put in team" : action.label) : action.label}</span>
          </Btn>
        ))}
        <label className="inline-flex cursor-pointer items-center gap-1.5 text-[13px] font-semibold sm:justify-center" style={selected ? { color: "var(--v-accent)" } : ink2}>
          <input type="checkbox" checked={selected} onChange={onToggle} className="size-4 accent-[var(--v-accent)]" /> Compare
        </label>
      </div>
    </li>
  );
}

// -------------------------------------------------------------- criteria
const MATCH_LABEL: Record<string, string> = { exact: "same skill", equivalent: "same idea, other name", related: "related", transferable: "transferable" };
function counts(q: Requirement): string {
  const out: string[] = [];
  if (q.skills.length) out.push(q.skills.slice(0, 5).map((s) => (s.match === "exact" ? s.name : `${s.name} (${MATCH_LABEL[s.match]})`)).join(", "));
  if (q.certs.length) out.push(q.certs.join(", "));
  if (q.sector) out.push(`${q.sector} projects or employers`);
  if (q.language) out.push(`${q.language} ${q.min_level ?? "B2"}+`);
  if (q.unmapped) out.push("Can’t be checked from profiles");
  return out.join(" · ");
}

function Criteria({ m, role, canRemove }: { m: Matcher; role: RoleSpec; canRemove: boolean }) {
  const [editing, setEditing] = useState(false);
  const update = (patch: Partial<RoleSpec>) => m.editRole({ ...role, ...patch });
  const setReq = (id: string, patch: Partial<Requirement> | null) =>
    update({ requirements: patch === null ? role.requirements.filter((q) => q.id !== id) : role.requirements.map((q) => (q.id === id ? { ...q, ...patch } : q)) });
  const orig = m.originalRole(role.id);
  const changed = orig && JSON.stringify(orig) !== JSON.stringify(role);
  const must = role.requirements.filter((q) => q.importance === "must");
  const nice = role.requirements.filter((q) => q.importance !== "must");
  const level = role.seniority_min ? `${role.seniority_min}${role.seniority_mode === "min" ? " or above" : ""}` : null;
  const sel = "rounded-md border bg-white px-3 py-2 text-[15px] font-semibold outline-none sm:text-[14px]";

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 text-[13px] font-semibold" style={ink3}>Looking for</span>
        {must.map((q) => <Chip key={q.id} title={counts(q)}>{q.implicit ? <Sparkles size={11} style={{ color: "var(--v-gold)" }} /> : <Check size={11} strokeWidth={3} />} {q.label}</Chip>)}
        {nice.length > 0 && <span className="text-[12px] font-semibold" style={ink3}>+{nice.length} nice to have</span>}
        <span className="mx-1 hidden h-4 w-px sm:block" style={{ background: "var(--v-line)" }} />
        <Chip tone="neutral"><Clock size={11} /> {AVAIL_LABEL[role.availability]}</Chip>
        {role.min_years ? <Chip>{role.min_years}+ years</Chip> : null}
        {level && <Chip>{level}</Chip>}
        {role.countries.map((c) => <Chip key={c}>In {c}</Chip>)}
        <Btn small variant={editing ? "secondary" : "link"} onClick={() => setEditing((v) => !v)} className="ml-auto">{editing ? "Done" : <><Pencil size={13} /> Edit</>}</Btn>
      </div>

      {editing && (
        <div className="mt-4 space-y-4 border-t pt-4 fade-in" style={line}>
          <ul className="divide-y" style={line}>
            {[...must, ...nice].map((q) => {
              const isMust = q.importance === "must";
              return (
                <li key={q.id} className="flex flex-wrap items-center gap-3 py-2.5" style={line}>
                  <div className="min-w-0 flex-1">
                    <div className="text-[14px] font-semibold">{q.label}{q.implicit && <span className="ml-1.5 text-[11px] font-bold" style={{ color: "var(--v-gold)" }} title={q.reason ?? ""}>added by AI</span>}</div>
                    <div className="truncate text-[12px]" style={ink3}>Counts: {counts(q) || "—"}</div>
                  </div>
                  <div className="inline-flex overflow-hidden rounded-md border text-[12px] font-semibold" style={line}>
                    <button onClick={() => !isMust && setReq(q.id, { importance: "must" })} className="px-3 py-1.5" style={isMust ? { background: "var(--v-ink)", color: "#fff" } : ink2}>Must</button>
                    <button onClick={() => isMust && setReq(q.id, { importance: "nice" })} className="px-3 py-1.5" style={!isMust ? { background: "var(--v-ink)", color: "#fff" } : ink2}>Nice</button>
                  </div>
                  <button onClick={() => setReq(q.id, null)} title="Remove" className="grid size-7 place-items-center rounded-md hover:bg-[var(--v-bad-soft)]" style={ink3}><X size={14} /></button>
                </li>
              );
            })}
          </ul>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="flex flex-col gap-1 text-[12px] font-semibold" style={ink3}>Availability
              <select value={role.availability} onChange={(e) => update({ availability: e.target.value as Availability })} className={sel} style={{ ...line, color: "var(--v-ink)" }}>
                <option value="now">Free now</option><option value="soon">Free within 3 months</option><option value="any">Any availability</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-[12px] font-semibold" style={ink3}>Minimum experience
              <select value={role.min_years ?? 0} onChange={(e) => update({ min_years: Number(e.target.value) || null })} className={sel} style={{ ...line, color: "var(--v-ink)" }}>
                {[0, 1, 2, 3, 5, 8, 10, 15].map((y) => <option key={y} value={y}>{y ? `${y}+ years` : "Any"}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-[12px] font-semibold" style={ink3}>Level
              <select value={role.seniority_min ? `${role.seniority_min}:${role.seniority_mode ?? "target"}` : ""} onChange={(e) => {
                if (!e.target.value) return update({ seniority_min: null, seniority_mode: "target" });
                const [lvl, mode] = e.target.value.split(":");
                update({ seniority_min: lvl, seniority_mode: (mode as SeniorityMode) || "target" });
              }} className={sel} style={{ ...line, color: "var(--v-ink)" }}>
                <option value="">Any level</option>
                <option value="Junior:target">Junior</option><option value="Mid:target">Mid</option><option value="Senior:target">Senior</option><option value="Lead:target">Lead</option><option value="Principal:target">Principal</option>
                <option value="Senior:min">Senior or above</option><option value="Lead:min">Lead or above</option>
              </select>
            </label>
            <div className="flex flex-col gap-1 text-[12px] font-semibold" style={ink3}>People needed
              <div className="inline-flex w-fit items-center gap-1 rounded-md border bg-white px-2 py-1.5 text-[14px]" style={{ ...line, color: "var(--v-ink)" }}>
                <button onClick={() => m.setRoleCount(role.id, role.count - 1)} disabled={role.count <= 1} className="grid size-6 place-items-center rounded-md disabled:opacity-30"><Minus size={13} /></button>
                <span className="w-6 text-center">{role.count}</span>
                <button onClick={() => m.setRoleCount(role.id, role.count + 1)} disabled={role.count >= 10} className="grid size-6 place-items-center rounded-md disabled:opacity-30"><Plus size={13} /></button>
              </div>
            </div>
          </div>
          {role.countries.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {role.countries.map((c) => (
                <span key={c} className="inline-flex items-center gap-1 rounded-md border bg-white px-3 py-1 text-[13px] font-semibold" style={line}>Based in {c}<button onClick={() => update({ countries: role.countries.filter((x) => x !== c) })} style={ink3}><X size={13} /></button></span>
              ))}
            </div>
          )}
          <div className="flex flex-wrap items-center justify-end gap-2">
            {changed && <Btn variant="ghost" small onClick={() => m.resetRole(role.id)}><RotateCcw size={13} /> Undo my changes</Btn>}
            {canRemove && <Btn variant="danger" small onClick={() => m.removeRole(role.id)}><Trash2 size={13} /> Remove this role</Btn>}
          </div>
          {m.interp && !m.interp.ai_used && m.interp.warnings.map((w) => <p key={w} className="rounded-md px-3 py-2 text-[13px]" style={{ background: "var(--v-warn-soft)", color: "var(--v-warn)" }}>{w}</p>)}
        </div>
      )}
    </Card>
  );
}
