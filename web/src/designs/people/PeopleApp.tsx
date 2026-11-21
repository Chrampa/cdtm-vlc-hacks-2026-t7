import { ArrowLeft, ArrowRight, CalendarClock, Check, CircleAlert, Lock, MapPin, Plus, RotateCcw, Search, ShieldCheck, Sparkles, Users, X } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { DesignSwitch, type DesignId } from "../../core/DesignSwitch";
import { avatarColors, first, fmt, hiddenReasons, initials, teamLabel, whyLine } from "../../core/helpers";
import type { Matcher } from "../../core/useMatcher";
import type { Availability, Candidate, Requirement, RoleResult, RoleSpec } from "../../types";
import { Profile } from "./Profile";
import { Compare } from "./Compare";

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
    <div className="flex items-center gap-3">
      <div className="flex gap-1">
        {must.map((r) => (
          <span key={r.id} title={`${r.label}: ${r.status === "covered" ? "shown" : r.status === "partial" ? "partly shown" : "not shown"}`} className={`h-2 rounded-full ${compact ? "w-5" : "w-8"}`} style={{
            background: r.status === "covered" ? "var(--v-accent)" : r.status === "partial" ? "linear-gradient(90deg,var(--v-warn) 50%,var(--v-line) 50%)" : "var(--v-line)",
          }} />
        ))}
      </div>
      {!compact && <span className="text-[13px] font-medium" style={ink2}>{c.must_covered} of {c.must_total} must-haves</span>}
    </div>
  );
}

export function Pill({ children, onClick, active, title }: { children: ReactNode; onClick?: () => void; active?: boolean; title?: string }) {
  return (
    <button onClick={onClick} title={title} className="inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-[14px] font-semibold transition-colors"
      style={active ? { background: "var(--v-accent)", color: "#fff", borderColor: "var(--v-accent)" } : { ...line, background: "#fff", color: "var(--v-accent)" }}>
      {children}
    </button>
  );
}

function Spinner() {
  return <span className="inline-block size-4 animate-spin rounded-full border-2 border-current border-r-transparent" />;
}

// ------------------------------------------------------------------ shell
export default function PeopleApp({ m, switchTo }: { m: Matcher; switchTo: (d: DesignId) => void }) {
  return (
    <div className="v-people v-frame min-h-full">
      <header className="sticky top-0 z-30 border-b backdrop-blur" style={{ ...line, background: "rgba(246,243,238,.92)" }}>
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-6 py-3">
          <button onClick={m.goHome} className="flex items-center gap-2">
            <span className="grid size-9 place-items-center rounded-xl text-[14px] font-extrabold text-white" style={{ background: "var(--v-accent)" }}>In</span>
            <span className="text-[17px] font-bold">Insider</span>
          </button>
          {m.view === "results" && m.spec && (
            <button onClick={m.goHome} className="hidden min-w-0 flex-1 items-center gap-3 rounded-full border bg-white px-5 py-2 text-left text-[14px] md:flex" style={line}>
              <Search size={15} style={ink2} /><span className="min-w-0 flex-1 truncate">{m.spec.title}</span><span className="font-semibold" style={{ color: "var(--v-accent)" }}>Edit</span>
            </button>
          )}
          <div className="ml-auto flex items-center gap-3">
            <DesignSwitch current="people" onChange={switchTo} />
          </div>
        </div>
      </header>
      {m.view === "home" ? <Home m={m} /> : <Results m={m} />}
    </div>
  );
}

// ------------------------------------------------------------------- home
function Home({ m }: { m: Matcher }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => ref.current?.focus(), []);
  const ready = m.brief.trim().length >= 10;
  return (
    <main className="mx-auto max-w-3xl px-6 pb-24 pt-16 fade-in">
      <h1 className="v-display text-[40px] font-bold leading-[48px] tracking-tight">Who do you need?</h1>
      <p className="mt-3 max-w-2xl text-[17px] leading-7" style={ink2}>
        Describe the role or the team in your own words. We’ll find colleagues who already have the experience, even when their CV uses different words.
      </p>
      <form className="mt-8" onSubmit={(e) => { e.preventDefault(); if (ready) m.submit(); }}>
        <div className="rounded-[22px] border bg-white shadow-[0_1px_2px_rgba(31,35,40,.04),0_12px_32px_rgba(31,35,40,.06)] focus-within:border-[var(--v-accent)]" style={line}>
          <textarea
            ref={ref} value={m.brief} onChange={(e) => m.setBrief(e.target.value)} rows={5} maxLength={6000}
            onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && ready) m.submit(); }}
            placeholder="For example: a senior data engineer with GCP experience for an insurance client, free within two months. Spanish and English."
            className="block w-full resize-none rounded-[22px] bg-transparent px-6 py-5 text-[16px] leading-7 outline-none placeholder:text-[var(--v-ink2)]/60"
          />
          <div className="flex items-center justify-between gap-3 px-4 pb-4">
            <span className="pl-2 text-[13px]" style={ink2}>Any language · one role or a whole team</span>
            <button type="submit" disabled={!ready} className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-[15px] font-semibold text-white transition-opacity disabled:opacity-40" style={{ background: "var(--v-accent)" }}>
              Find people <ArrowRight size={17} />
            </button>
          </div>
        </div>
      </form>
      {m.phase === "error" && m.error && <p className="mt-4 rounded-2xl px-4 py-3 text-[14px]" style={{ background: "var(--v-bad-soft)", color: "var(--v-bad)" }}>{m.error}</p>}
      {m.meta && (
        <>
          <div className="mt-10 text-[13px] font-semibold" style={ink2}>Or start from an example</div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {m.meta.examples.map((ex) => (
              <button key={ex.id} onClick={() => m.submit(ex.brief)} className="group rounded-2xl border bg-white p-4 text-left transition-colors hover:border-[var(--v-accent)]" style={line}>
                <div className="flex items-center justify-between text-[15px] font-bold">{ex.title}<ArrowRight size={16} className="opacity-0 transition-opacity group-hover:opacity-100" style={{ color: "var(--v-accent)" }} /></div>
                <div className="mt-1 text-[13px]" style={ink2}>{ex.tests}</div>
              </button>
            ))}
          </div>
          <p className="mt-10 text-[13px]" style={ink2}>
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
  const { result, spec } = m;

  useEffect(() => { setSelected({}); setOpen(null); }, [spec?.title]);
  useEffect(() => { if (m.tab === "team") m.loadReview(); }, [m.tab, m]);

  if (m.phase === "interpreting" || m.phase === "searching") return <Loading m={m} />;
  if (m.phase === "error") {
    return (
      <main className="mx-auto max-w-xl px-6 py-24 text-center">
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

  return (
    <main className="mx-auto max-w-6xl px-6 pb-32 pt-8 fade-in">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="v-display text-[32px] font-bold leading-10 tracking-tight">
            {result.multi && m.tab === "team" ? (/team$/i.test(spec.title) ? spec.title : `A team for ${spec.title}`) : role ? `${role.candidates.length} people could do this` : spec.title}
          </h1>
          <p className="mt-2 max-w-3xl text-[16px] leading-7" style={ink2}>
            {result.multi && m.tab === "team" ? spec.summary : role ? <RoleIntro role={role} /> : null}
          </p>
        </div>
        {m.refreshing && <span className="mt-3" style={{ color: "var(--v-accent)" }}><Spinner /></span>}
      </div>

      {result.multi && (
        <div className="mt-6 flex flex-wrap gap-2">
          <Pill active={m.tab === "team"} onClick={() => m.setTab("team")}><Users size={15} /> Team</Pill>
          {result.roles.map((r) => <Pill key={r.id} active={m.tab === r.id} onClick={() => m.setTab(r.id)}>{r.title}{r.count > 1 ? ` ×${r.count}` : ""}</Pill>)}
        </div>
      )}

      {m.tab === "team" && result.multi && <Team m={m} onOpen={openCard} />}

      {role && roleSpec && (
        <>
          <WhatMatters m={m} role={roleSpec} />
          {role.candidates.length === 0 ? (
            <div className="mt-8 rounded-[22px] border border-dashed bg-white p-10 text-center text-[15px]" style={{ ...line, ...ink2 }}>
              Nobody passes the rules you set. Try “Free within 3 months” or fewer years of experience.
            </div>
          ) : (
            <>
            {role.complement && (
              <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-[var(--v-radius)] px-5 py-4 text-[15px]" style={{ background: "var(--v-accent-soft)" }}>
                <Users size={18} style={{ color: "var(--v-accent)" }} />
                <span><b>Nobody covers everything alone.</b> Pair {role.candidates.find((x) => x.employee_id === role.complement!.for)?.name.split(" ")[0]} with{" "}
                  <button className="font-bold underline underline-offset-2" onClick={() => openId(role.id, role.complement!.person.employee_id)}>{role.complement.person.name}</button>
                  {" "}({role.complement.person.role}), who covers <b>{role.complement.covers.join(", ")}</b>.</span>
              </div>
            )}
            <div className="mt-6 grid gap-5 md:grid-cols-2">
              {role.candidates.map((c) => (
                <PersonCard key={c.employee_id} c={c} multi={result.multi} selected={sel.includes(c.employee_id)} onToggle={() => toggle(c.employee_id)} onOpen={() => openCard(role.id, c)} />
              ))}
            </div>
            </>
          )}
        </>
      )}

      {role && sel.length > 0 && (
        <div className="fixed inset-x-0 bottom-5 z-30 flex justify-center px-4">
          <div className="fade-in flex items-center gap-3 rounded-full border bg-white py-2 pl-3 pr-2 shadow-[0_12px_32px_rgba(31,35,40,.16)]" style={line}>
            <div className="flex -space-x-2">{people.map((c) => <span key={c.employee_id} className="rounded-full ring-2 ring-white"><Avatar c={c} size={32} /></span>)}</div>
            <span className="text-[14px] font-medium">{sel.length < 2 ? "Pick one more to compare" : `${sel.length} people selected`}</span>
            <button onClick={() => setSelected((p) => ({ ...p, [role.id]: [] }))} className="rounded-full px-3 py-2 text-[14px] font-semibold" style={ink2}>Clear</button>
            <button disabled={sel.length < 2} onClick={() => { setComparing(true); people.forEach((c) => m.explain(role.id, c.employee_id)); }}
              className="rounded-full px-5 py-2.5 text-[14px] font-semibold text-white disabled:opacity-40" style={{ background: "var(--v-accent)" }}>Compare</button>
          </div>
        </div>
      )}

      {comparing && role && people.length >= 2 && (
        <Compare people={people} roleTitle={role.title} explanation={(id) => m.explanation(role.id, id)} onClose={() => setComparing(false)} onOpen={(c) => { setComparing(false); openCard(role.id, c); }} />
      )}
      {open && (
        <Profile c={open.c} roleTitle={m.roleById[open.roleId]?.title ?? ""} exp={m.explanation(open.roleId, open.c.employee_id)} onClose={() => setOpen(null)} />
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

function PersonCard({ c, selected, onToggle, onOpen, multi }: { c: Candidate; selected: boolean; onToggle: () => void; onOpen: () => void; multi: boolean }) {
  const hidden = hiddenReasons(c);
  const ribbon = c.other_team ? `From the ${teamLabel(c.role)} team` : c.hidden_sector ? "Hidden sector experience" : null;
  return (
    <article className="relative flex flex-col rounded-[var(--v-radius)] border bg-white p-6 shadow-[0_1px_2px_rgba(31,35,40,.04),0_8px_24px_rgba(31,35,40,.05)] transition-shadow hover:shadow-[0_1px_2px_rgba(31,35,40,.04),0_14px_32px_rgba(31,35,40,.10)]"
      style={{ borderColor: selected ? "var(--v-accent)" : "var(--v-line)", boxShadow: selected ? "0 0 0 3px var(--v-accent-soft)" : undefined }}>
      {ribbon && (
        <span title={hidden.join("\n")} className="absolute right-5 top-5 inline-flex max-w-[48%] items-center gap-1 truncate rounded-full px-2.5 py-1 text-[12px] font-semibold" style={{ background: "var(--v-sun-soft)", color: "#7A5A0B" }}>
          <Sparkles size={12} className="shrink-0" /> <span className="truncate">{ribbon}</span>
        </span>
      )}
      <button onClick={onOpen} className="flex items-center gap-4 pr-[46%] text-left md:pr-[38%]">
        <Avatar c={c} />
        <div className="min-w-0">
          <div className="text-[17px] font-bold leading-6">{c.name}</div>
          <div className="truncate text-[14px]" style={ink2}>{c.position}</div>
          <div className="flex items-center gap-1 text-[13px]" style={ink2}><MapPin size={12} /> {c.location} · {c.years} yrs</div>
        </div>
      </button>
      <div className="mt-4 flex items-center gap-2">
        <Availability code={c.availability_code} />
        {c.proposed && multi && <span className="rounded-full px-2 py-0.5 text-[12px] font-semibold" style={{ background: "var(--v-accent-soft)", color: "var(--v-accent)" }}>In the proposed team</span>}
      </div>
      <div className="mt-4 rounded-2xl p-4" style={{ background: "var(--v-surface2)" }}>
        <div className="text-[13px] font-bold" style={{ color: "var(--v-accent)" }}>Why {first(c.name)}?</div>
        <p className="mt-1 text-[15px] leading-6">{whyLine(c)}</p>
        {c.risks[0] && <p className="mt-2 flex items-start gap-1.5 text-[13px]" style={{ color: "var(--v-warn)" }}><CircleAlert size={14} className="mt-0.5 shrink-0" /> {c.risks[0].text}</p>}
      </div>
      <div className="mt-4 flex items-center justify-between gap-3">
        <Segments c={c} />
        <span className="text-[14px] font-bold">{c.fit}% <span className="font-medium" style={ink2}>match</span></span>
      </div>
      <div className="mt-5 flex gap-2">
        <Pill onClick={onOpen}>View profile</Pill>
        <button onClick={onToggle} className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[14px] font-semibold" style={selected ? { background: "var(--v-accent-soft)", color: "var(--v-accent)" } : ink2}>
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

function WhatMatters({ m, role }: { m: Matcher; role: RoleSpec }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const close = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpenId(null); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);
  const update = (patch: Partial<RoleSpec>) => m.editRole({ ...role, ...patch });
  const setReq = (id: string, patch: Partial<Requirement> | null) => {
    setOpenId(null);
    update({ requirements: patch === null ? role.requirements.filter((q) => q.id !== id) : role.requirements.map((q) => (q.id === id ? { ...q, ...patch } : q)) });
  };
  const orig = m.originalRole(role.id);
  const changed = orig && JSON.stringify(orig) !== JSON.stringify(role);
  const sorted = [...role.requirements].sort((a, b) => (a.importance === b.importance ? 0 : a.importance === "must" ? -1 : 1));
  const select = "appearance-none rounded-full border bg-white px-4 py-2 text-[14px] font-semibold outline-none";

  return (
    <div ref={box} className="mt-7 rounded-[var(--v-radius)] border bg-white p-5" style={line}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 text-[13px] font-bold" style={ink2}>What matters</span>
        {sorted.map((q) => {
          const must = q.importance === "must";
          return (
            <div key={q.id} className="relative">
              <button onClick={() => setOpenId(openId === q.id ? null : q.id)}
                className="inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[14px] font-semibold"
                style={must ? { background: "var(--v-accent-soft)", borderColor: "transparent", color: "var(--v-ink)" } : { ...line, background: "#fff", color: "var(--v-ink2)" }}>
                {q.implicit ? <Sparkles size={13} style={{ color: "var(--v-accent)" }} /> : must ? <Check size={14} style={{ color: "var(--v-accent)" }} /> : null}
                {q.label}{!must && <span className="text-[11px] font-bold uppercase">· nice</span>}
              </button>
              {openId === q.id && (
                <div className="absolute left-0 top-full z-40 mt-2 w-80 rounded-2xl border bg-white p-4 text-[14px] shadow-[0_16px_40px_rgba(31,35,40,.16)] fade-in" style={line}>
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
      <div className="mt-4 flex flex-wrap items-center gap-2 border-t pt-4" style={line}>
        <span className="mr-1 inline-flex items-center gap-1 text-[13px] font-bold" style={ink2}><Lock size={13} /> Always applied</span>
        <select value={role.availability} onChange={(e) => update({ availability: e.target.value as Availability })} className={select} style={{ ...line, color: "var(--v-accent)" }}>
          <option value="now">Available now</option>
          <option value="soon">Free within 3 months</option>
          <option value="any">Any availability</option>
        </select>
        <label className="inline-flex items-center gap-1 rounded-full border bg-white px-4 py-2 text-[14px] font-semibold" style={{ ...line, color: "var(--v-accent)" }}>
          <input type="number" min={0} max={40} value={role.min_years ?? ""} placeholder="0"
            onChange={(e) => update({ min_years: e.target.value === "" || Number(e.target.value) <= 0 ? null : Math.min(40, Number(e.target.value)) })}
            className="w-7 bg-transparent text-right outline-none" />+ years
        </label>
        {role.countries.map((c) => (
          <span key={c} className="inline-flex items-center gap-1 rounded-full border bg-white px-4 py-2 text-[14px] font-semibold" style={line}>
            Based in {c}<button onClick={() => update({ countries: role.countries.filter((x) => x !== c) })} style={ink2}><X size={14} /></button>
          </span>
        ))}
        <span className="mx-1 text-[13px] font-bold" style={ink2}>Preference</span>
        <select value={role.seniority_min ?? ""} onChange={(e) => update({ seniority_min: e.target.value || null })} className={select} style={{ ...line, color: "var(--v-accent)" }}>
          <option value="">Any seniority</option>
          {["Junior", "Mid", "Senior", "Lead", "Principal"].map((s) => <option key={s} value={s}>{s} or above</option>)}
        </select>
        {changed && <button onClick={() => m.resetRole(role.id)} className="ml-auto inline-flex items-center gap-1 text-[13px] font-semibold" style={ink2}><RotateCcw size={13} /> Undo my changes</button>}
      </div>
      {m.interp && !m.interp.ai_used && m.interp.warnings.map((w) => <p key={w} className="mt-3 rounded-xl px-3 py-2 text-[13px]" style={{ background: "var(--v-warn-soft)", color: "var(--v-warn)" }}>{w}</p>)}
    </div>
  );
}

// ------------------------------------------------------------------ team
function Team({ m, onOpen }: { m: Matcher; onOpen: (roleId: string, c: Candidate) => void }) {
  const r = m.result!;
  const t = r.team!;
  const review = m.review;
  return (
    <div className="mt-7 space-y-5 fade-in">
      <div className="flex flex-wrap items-center gap-x-8 gap-y-3 rounded-[var(--v-radius)] border bg-white px-6 py-5" style={line}>
        <div><span className="text-[30px] font-bold">{t.filled}</span><span className="text-[15px]" style={ink2}> of {t.slots} places filled</span></div>
        <div><span className="text-[30px] font-bold">{t.avg_fit}%</span><span className="text-[15px]" style={ink2}> average match</span></div>
        <div className="flex items-center gap-2 text-[14px] font-semibold" style={{ color: "var(--v-good)" }}><ShieldCheck size={17} /> Nobody is in two roles · everyone is free in time</div>
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        {r.roles.map((role) => {
          const proposed = role.candidates.filter((c) => c.proposed);
          return (
            <div key={role.id} className="rounded-[var(--v-radius)] border bg-white p-5" style={line}>
              <div className="flex items-center justify-between">
                <div className="text-[17px] font-bold">{role.title}{role.count > 1 && <span style={ink2}> ×{role.count}</span>}</div>
                <button onClick={() => m.setTab(role.id)} className="inline-flex items-center gap-1 text-[13px] font-semibold" style={{ color: "var(--v-accent)" }}>
                  {Math.max(0, role.candidates.length - proposed.length)} alternatives <ArrowRight size={13} />
                </button>
              </div>
              <div className="mt-3 space-y-2.5">
                {proposed.length === 0 && <p className="text-[14px]" style={ink2}>Nobody passes the rules for this role.</p>}
                {proposed.map((c) => (
                  <button key={c.employee_id} onClick={() => onOpen(role.id, c)} className="flex w-full items-center gap-3 rounded-2xl p-3 text-left transition-colors hover:bg-[var(--v-surface2)]">
                    <Avatar c={c} size={44} />
                    <div className="min-w-0 flex-1">
                      <div className="text-[15px] font-bold">{c.name}</div>
                      <div className="truncate text-[13px]" style={ink2}>{c.position}</div>
                      <div className="mt-1.5 flex items-center gap-3"><Segments c={c} compact /><Availability code={c.availability_code} short /></div>
                    </div>
                    <span className="text-[16px] font-bold">{c.fit}%</span>
                  </button>
                ))}
              </div>
              {role.complement && (
                <p className="mt-3 rounded-xl px-3 py-2 text-[13px]" style={{ background: "var(--v-accent-soft)" }}>
                  Gap cover: <b>{role.complement.person.name}</b> ({role.complement.person.role}) covers {role.complement.covers.join(", ")}.
                </p>
              )}
            </div>
          );
        })}
      </div>
      <div className="rounded-[var(--v-radius)] border bg-white p-6" style={line}>
        <div className="flex items-center gap-2 text-[14px] font-bold" style={{ color: "var(--v-accent)" }}><Sparkles size={15} /> Team check</div>
        {review === "loading" && <div className="mt-3 flex items-center gap-2 text-[14px]" style={ink2}><Spinner /> Reviewing the team…</div>}
        {review && review !== "loading" && !review.ok && <p className="mt-2 text-[14px]" style={ink2}>{review.error}</p>}
        {review && review !== "loading" && review.ok && (
          <div className="mt-2 space-y-4 text-[15px] leading-7">
            <p>{review.summary}</p>
            <div className="grid gap-4 md:grid-cols-2">
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
    <main className="mx-auto max-w-xl px-6 py-20 fade-in">
      <div className="rounded-[22px] border bg-white p-6" style={line}>
        <p className="line-clamp-3 text-[15px] italic leading-6" style={ink2}>“{m.brief}”</p>
        <ol className="mt-6 space-y-5">
          {steps.map((s, i) => (
            <li key={s.key} className="flex gap-3" style={{ opacity: i > idx ? 0.4 : 1 }}>
              <span className="mt-0.5 grid size-6 place-items-center rounded-full" style={{ background: i < idx ? "var(--v-accent)" : "var(--v-accent-soft)", color: i < idx ? "#fff" : "var(--v-accent)" }}>
                {i < idx ? <Check size={14} strokeWidth={3} /> : i === idx ? <Spinner /> : null}
              </span>
              <div><div className="text-[16px] font-bold">{s.label}</div><div className="text-[14px]" style={ink2}>{s.sub}</div></div>
            </li>
          ))}
        </ol>
      </div>
    </main>
  );
}
