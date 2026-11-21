import { ArrowLeftRight, ArrowRight, Check, Lock, RotateCcw, SlidersHorizontal, Unlock, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { DesignSwitch, type DesignId } from "../../core/DesignSwitch";
import { fmt, hiddenReasons, outside, shortLine, statusWord } from "../../core/helpers";
import type { Matcher } from "../../core/useMatcher";
import type { Availability, Candidate, Requirement, RoleResult, RoleSpec, SeniorityMode, TeamOption, TeamShape } from "../../types";
import { Detail } from "./Detail";

const ink2 = { color: "var(--v-ink2)" };
const line = { borderColor: "var(--v-line)" };
const label = "text-[11px] font-semibold uppercase tracking-[.12em]";
const availColor = (code: number) => (code === 0 ? "var(--v-good)" : code === 1 ? "var(--v-warn)" : "var(--v-ink2)");
const availShort = (code: number) => (code === 0 ? "Now" : code === 1 ? "≤ 3 mo" : "Assigned");

export function Dot({ s, size = 14 }: { s: string; size?: number }) {
  const st = { width: size, height: size };
  if (s === "covered") return <span className="inline-block shrink-0 rounded-full" style={{ ...st, background: "var(--v-ink)" }} />;
  if (s === "partial") return <span className="inline-block shrink-0 rounded-full border-[1.5px]" style={{ ...st, borderColor: "var(--v-ink2)", background: "linear-gradient(90deg, var(--v-ink2) 50%, transparent 50%)" }} />;
  if (s === "unknown") return <span className="inline-block shrink-0 rounded-full border-[1.5px] border-dashed" style={{ ...st, borderColor: "var(--v-line)" }} />;
  return <span className="inline-block shrink-0 rounded-full border-[1.5px]" style={{ ...st, borderColor: "var(--v-ink2)" }} />;
}
const Tick = () => <span className="absolute right-0 top-0 size-0 border-l-[14px] border-t-[14px] border-l-transparent" style={{ borderTopColor: "var(--v-accent)" }} />;

function Bar({ w }: { w: number }) {
  return <span className="block h-[3px] w-full" style={{ background: "var(--v-line)" }}><span className="block h-full" style={{ width: `${w}%`, background: "var(--v-ink)" }} /></span>;
}

// ------------------------------------------------------------------ shell
export default function MapApp({ m, switchTo }: { m: Matcher; switchTo: (d: DesignId) => void }) {
  const role0 = m.spec?.roles[0];
  return (
    <div className="v-matrix v-frame min-h-full">
      <header className="sticky top-0 z-30 border-b bg-white" style={line}>
        <div className="flex items-center gap-6 px-8 py-3.5">
          <button onClick={m.goHome} className="text-[15px] font-bold uppercase tracking-[.22em]">Insider</button>
          {m.view === "results" && m.spec && (
            <div className="hidden min-w-0 items-baseline gap-2 text-[14px] md:flex">
              <b className="truncate">{m.spec.title}</b>
              {role0 && !m.result?.multi && <span className="truncate" style={ink2}>· {role0.availability === "now" ? "available now" : role0.availability === "soon" ? "free ≤ 3 months" : "any availability"}{role0.min_years ? ` · ${role0.min_years}+ years` : ""}</span>}
              <button onClick={m.goHome} className="ml-2 shrink-0 text-[13px] underline underline-offset-4">Edit brief</button>
            </div>
          )}
          <div className="ml-auto flex items-center gap-3"><DesignSwitch current="map" onChange={switchTo} tone="swiss" /></div>
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
    <main className="mx-auto grid max-w-6xl gap-12 px-8 pb-24 pt-16 lg:grid-cols-[1.2fr_1fr] fade-in">
      <div>
        <div className={label} style={ink2}>Talent matcher · {m.meta ? fmt.format(m.meta.profiles) : "—"} people</div>
        <h1 className="v-display mt-3 text-[56px] font-semibold leading-[58px] tracking-tight">Who do you need?</h1>
        <p className="mt-4 max-w-xl text-[16px] leading-7" style={ink2}>Write the need as you would to a colleague. You get a grid: requirements down the side, people across the top, evidence in every cell.</p>
        <form className="mt-8" onSubmit={(e) => { e.preventDefault(); if (ready) m.submit(); }}>
          <textarea
            ref={ref} value={m.brief} onChange={(e) => m.setBrief(e.target.value)} rows={6} maxLength={6000}
            onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && ready) m.submit(); }}
            placeholder="A senior data engineer with GCP experience for an insurance client, free within two months…"
            className="block w-full resize-none border-[1.5px] bg-white px-5 py-4 text-[16px] leading-7 outline-none focus:border-[var(--v-ink)]" style={{ borderColor: "var(--v-ink2)" }}
          />
          <div className="mt-3 flex items-center justify-between">
            <span className="text-[13px]" style={ink2}>Any language · several roles at once · Ctrl+Enter</span>
            <button type="submit" disabled={!ready} className="inline-flex items-center gap-2 px-6 py-3 text-[14px] font-semibold text-white disabled:opacity-30" style={{ background: "var(--v-ink)" }}>Build the map <ArrowRight size={16} /></button>
          </div>
        </form>
        {m.phase === "error" && m.error && <p className="mt-4 border-l-2 px-3 py-2 text-[14px]" style={{ borderColor: "var(--v-bad)", color: "var(--v-bad)" }}>{m.error}</p>}
      </div>
      <div>
        <div className={label} style={ink2}>Examples</div>
        <div className="mt-3 border-t" style={line}>
          {m.meta?.examples.map((ex, i) => (
            <button key={ex.id} onClick={() => m.submit(ex.brief)} className="group grid w-full grid-cols-[32px_1fr_20px] items-baseline gap-2 border-b py-4 text-left" style={line}>
              <span className="v-num text-[12px]" style={ink2}>{String(i + 1).padStart(2, "0")}</span>
              <span><span className="block text-[15px] font-semibold">{ex.title}</span><span className="block text-[13px]" style={ink2}>{ex.tests}</span></span>
              <ArrowRight size={16} className="opacity-30 transition-opacity group-hover:opacity-100" />
            </button>
          ))}
        </div>
        {m.meta && (
          <dl className="mt-8 grid grid-cols-3 gap-4">
            <div><dt className={label} style={ink2}>People</dt><dd className="v-num mt-1 text-[22px]">{fmt.format(m.meta.profiles)}</dd></div>
            <div><dt className={label} style={ink2}>Free now</dt><dd className="v-num mt-1 text-[22px]" style={{ color: "var(--v-good)" }}>{fmt.format(m.meta.available_now)}</dd></div>
            <div><dt className={label} style={ink2}>≤ 3 months</dt><dd className="v-num mt-1 text-[22px]" style={{ color: "var(--v-warn)" }}>{fmt.format(m.meta.available_soon)}</dd></div>
          </dl>
        )}
      </div>
    </main>
  );
}

// ---------------------------------------------------------------- results
function Results({ m }: { m: Matcher }) {
  const [open, setOpen] = useState<{ roleId: string; c: Candidate } | null>(null);
  const { result, spec } = m;
  useEffect(() => { setOpen(null); }, [spec?.title]);
  useEffect(() => { if (m.tab === "team") m.loadReview(); }, [m.tab, m]);

  if (m.phase === "interpreting" || m.phase === "searching") return <Loading m={m} />;
  if (m.phase === "error") {
    return (
      <main className="px-8 py-20">
        <p className="text-[16px]" style={{ color: "var(--v-bad)" }}>{m.error}</p>
        <div className="mt-6 flex gap-2"><button onClick={m.goHome} className="border px-4 py-2 text-[14px] font-semibold" style={line}>Back</button><button onClick={() => m.submit()} className="px-4 py-2 text-[14px] font-semibold text-white" style={{ background: "var(--v-ink)" }}>Try again</button></div>
      </main>
    );
  }
  if (!result || !spec) return null;
  const role = result.roles.find((r) => r.id === m.tab);
  const openCard = (roleId: string, c: Candidate) => { setOpen({ roleId, c }); m.explain(roleId, c.employee_id); };
  const openId = async (roleId: string, eid: string) => { const c = await m.candidate(roleId, eid); if (c) openCard(roleId, c); };

  return (
    <main className="pb-24 fade-in">
      {result.multi && (
        <nav className="flex gap-0 overflow-x-auto border-b px-8" style={line}>
          {[{ id: "team", t: "Team" }, ...result.roles.map((r) => ({ id: r.id, t: `${r.title}${r.count > 1 ? ` ×${r.count}` : ""}` }))].map((x) => (
            <button key={x.id} onClick={() => m.setTab(x.id)} className="-mb-px shrink-0 border-b-2 px-4 py-3 text-[12px] font-semibold uppercase tracking-[.1em]"
              style={{ borderColor: m.tab === x.id ? "var(--v-ink)" : "transparent", color: m.tab === x.id ? "var(--v-ink)" : "var(--v-ink2)" }}>{x.t}</button>
          ))}
        </nav>
      )}
      {m.tab === "team" && result.multi && <Team m={m} onOpen={openCard} />}
      {role && m.roleById[role.id] && <RoleMatrix m={m} role={role} spec={m.roleById[role.id]} onOpen={(c) => openCard(role.id, c)} onOpenId={(eid) => openId(role.id, eid)} />}
      {open && <Detail c={open.c} roleTitle={m.roleById[open.roleId]?.title ?? ""} exp={m.explanation(open.roleId, open.c.employee_id)} onClose={() => setOpen(null)} />}
    </main>
  );
}

function RoleMatrix({ m, role, spec, onOpen, onOpenId }: { m: Matcher; role: RoleResult; spec: RoleSpec; onOpen: (c: Candidate) => void; onOpenId: (eid: string) => void }) {
  const [sel, setSel] = useState<string[]>([]);
  const [only, setOnly] = useState(false);
  const [cell, setCell] = useState<{ q: string; e: string } | null>(null);
  const [menu, setMenu] = useState<string | null>(null);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => { setSel([]); setOnly(false); }, [role.id]);
  useEffect(() => {
    const close = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) { setCell(null); setMenu(null); } };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const cands = only && sel.length ? role.candidates.filter((c) => sel.includes(c.employee_id)) : role.candidates;
  const update = (patch: Partial<RoleSpec>) => m.editRole({ ...spec, ...patch });
  const setReq = (id: string, patch: Partial<Requirement> | null) => {
    setMenu(null);
    update({ requirements: patch === null ? spec.requirements.filter((q) => q.id !== id) : spec.requirements.map((q) => (q.id === id ? { ...q, ...patch } : q)) });
  };
  const must = spec.requirements.filter((q) => q.importance === "must");
  const nice = spec.requirements.filter((q) => q.importance === "nice");
  const orig = m.originalRole(role.id);
  const changed = orig && JSON.stringify(orig) !== JSON.stringify(spec);
  const colW = 172;
  const grid = { gridTemplateColumns: `280px repeat(${cands.length}, ${colW}px)` };
  const kw = role.keyword;
  const f = role.funnel;

  const reqRow = (q: Requirement) => (
    <div key={q.id} className="contents">
      <div className="sticky left-0 z-10 border-b border-r bg-white p-4" style={line}>
        <button onClick={() => setMenu(menu === q.id ? null : q.id)} className="w-full text-left">
          <div className="text-[14px] font-medium leading-5">{q.label}</div>
          {q.implicit && <div className="mt-0.5 text-[11px] font-semibold uppercase tracking-[.08em]" style={{ color: "var(--v-accent-ink)" }} title={q.reason ?? ""}>Inferred</div>}
          {q.unmapped && <div className="mt-0.5 text-[11px]" style={ink2}>Not in any profile field</div>}
        </button>
        {menu === q.id && (
          <div className="absolute left-4 top-full z-30 mt-1 w-72 border bg-white p-3 text-[13px] shadow-[0_12px_32px_rgba(0,0,0,.14)]" style={{ borderColor: "var(--v-ink)" }}>
            {q.implicit && q.reason && <p className="mb-2" style={ink2}>Inferred: {q.reason}</p>}
            {q.skills.length > 0 && <p className="mb-2" style={ink2}>Counts: {q.skills.map((s) => s.name).join(", ")}</p>}
            {q.sector && <p className="mb-2" style={ink2}>Sector evidence: {q.sector}</p>}
            {q.language && <p className="mb-2" style={ink2}>{q.language} ≥ {q.min_level ?? "B2"}</p>}
            <div className="flex gap-2">
              <button onClick={() => setReq(q.id, { importance: q.importance === "must" ? "nice" : "must" })} className="flex-1 border px-2 py-1.5 font-semibold" style={line}>{q.importance === "must" ? "Move to nice-to-have" : "Make it a must"}</button>
              <button onClick={() => setReq(q.id, null)} className="border px-2 py-1.5 font-semibold" style={{ ...line, color: "var(--v-bad)" }}>Remove</button>
            </div>
          </div>
        )}
      </div>
      {cands.map((c, i) => {
        const r = c.requirements.find((x) => x.id === q.id);
        const s = r?.status ?? "unknown";
        const isOpen = cell?.q === q.id && cell.e === c.employee_id;
        return (
          <div key={c.employee_id} className="relative border-b border-r" style={{ ...line, background: i === 0 ? "var(--v-surface2)" : undefined }}>
            <button onClick={() => setCell(isOpen ? null : { q: q.id, e: c.employee_id })} className="flex h-full w-full items-start gap-2 p-4 text-left text-[12px] leading-4 hover:bg-black/[.03]">
              <span className="mt-px"><Dot s={s} /></span>
              <span style={{ color: s === "covered" ? "var(--v-ink)" : "var(--v-ink2)" }}>{s === "unknown" ? "—" : s === "missing" ? "Not shown" : shortLine(r?.lines[0] ?? "")}</span>
            </button>
            {isOpen && r && (
              <div className="absolute left-0 top-full z-30 w-72 border bg-white p-3 text-[12px] leading-5 shadow-[0_12px_32px_rgba(0,0,0,.14)]" style={{ borderColor: "var(--v-ink)" }}>
                <div className="mb-1 flex items-center gap-2 font-semibold"><Dot s={s} size={11} /> {statusWord(s)} · {c.name}</div>
                {r.lines.map((l) => <div key={l} style={ink2}>{l}</div>)}
                <button onClick={() => onOpen(c)} className="mt-2 inline-flex items-center gap-1 font-semibold underline underline-offset-4">Open profile <ArrowRight size={12} /></button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  const band = (t: string) => <div className="sticky left-0 border-b border-r px-4 py-2" style={{ ...line, gridColumn: "1 / -1", background: "var(--v-surface2)" }}><span className={label}>{t}</span></div>;
  const anyHidden = role.candidates.some(outside);

  return (
    <div ref={box} className="px-8 pt-7">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="v-display text-[30px] font-semibold leading-9 tracking-tight">Who covers what{m.result?.multi ? ` — ${role.title}` : ""}</h1>
          <p className="mt-1 text-[14px]" style={ink2}>
            {f.map((s, i) => <span key={i}>{i > 0 && " → "}<span className="v-num" style={{ color: "var(--v-ink)" }}>{fmt.format(s.count)}</span> {i === 0 ? "people" : s.label.toLowerCase()}</span>)} → best {role.candidates.length}
            {kw && kw.count !== null && <> · keyword search for “{kw.terms.join(" + ")}” finds <span className="v-num" style={{ color: "var(--v-ink)" }}>{fmt.format(kw.count)}</span>{kw.missed_in_top ? `, misses ${kw.missed_in_top} of these` : ""}</>}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-[12px]" style={ink2}>
          <span className="inline-flex items-center gap-1.5"><Dot s="covered" /> shown</span>
          <span className="inline-flex items-center gap-1.5"><Dot s="partial" /> partly</span>
          <span className="inline-flex items-center gap-1.5"><Dot s="missing" /> not shown</span>
          {anyHidden && <span className="inline-flex items-center gap-1.5"><span className="font-bold" style={{ color: "var(--v-accent)" }}>◤</span> outside the usual team</span>}
          {m.refreshing && <span className="v-num" style={{ color: "var(--v-ink)" }}>updating…</span>}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 border-y py-3 text-[13px]" style={line}>
        <span className={label} style={ink2}>Rules</span>
        <select value={spec.availability} onChange={(e) => update({ availability: e.target.value as Availability })} className="border bg-white px-2 py-1 font-medium outline-none" style={line}>
          <option value="now">Available now</option><option value="soon">Free ≤ 3 months</option><option value="any">Any availability</option>
        </select>
        <label className="inline-flex items-center gap-1.5 border px-2 py-1 font-medium" style={line}>
          <input type="number" min={0} max={40} value={spec.min_years ?? ""} placeholder="0" onChange={(e) => update({ min_years: e.target.value === "" || Number(e.target.value) <= 0 ? null : Math.min(40, Number(e.target.value)) })} className="v-num w-7 bg-transparent text-right outline-none" />+ years
        </label>
        {spec.countries.map((c) => <span key={c} className="inline-flex items-center gap-1 border px-2 py-1" style={line}>{c}<button onClick={() => update({ countries: spec.countries.filter((x) => x !== c) })}><X size={12} /></button></span>)}
        <span className={label} style={ink2}>Preference</span>
        <select
          value={spec.seniority_min ? `${spec.seniority_min}:${spec.seniority_mode ?? "target"}` : ""}
          onChange={(e) => {
            if (!e.target.value) return update({ seniority_min: null, seniority_mode: "target" });
            const [lvl, mode] = e.target.value.split(":");
            update({ seniority_min: lvl, seniority_mode: (mode as SeniorityMode) || "target" });
          }}
          className="border bg-white px-2 py-1 font-medium outline-none" style={line}
        >
          <option value="">Any seniority</option>
          <option value="Junior:target">Junior (target)</option>
          <option value="Mid:target">Mid (target)</option>
          <option value="Senior:target">Senior (target)</option>
          <option value="Lead:target">Lead (target)</option>
          <option value="Principal:target">Principal (target)</option>
          <option value="Senior:min">Senior+</option>
          <option value="Lead:min">Lead+</option>
        </select>
        <span style={ink2}>Click a requirement to change it.</span>
        {changed && <button onClick={() => m.resetRole(role.id)} className="ml-auto font-semibold underline underline-offset-4">Undo my changes</button>}
      </div>

      {role.candidates.length === 0 ? (
        <p className="mt-10 text-[15px]" style={ink2}>Nobody passes these rules. Loosen availability or required years.</p>
      ) : (
        <div className="mt-5 overflow-x-auto border-l border-t" style={line}>
          <div className="grid w-max" style={grid}>
            <div className="sticky left-0 z-10 border-b border-r bg-white p-4" style={line}>
              <div className={label} style={ink2}>Requirement</div>
              <div className="mt-3 text-[12px] leading-5" style={ink2}>Tick columns to compare them side by side, or open anyone for the full evidence.</div>
            </div>
            {cands.map((c, i) => {
              const hidden = hiddenReasons(c);
              const on = sel.includes(c.employee_id);
              return (
                <div key={c.employee_id} className="relative border-b border-r p-4" style={{ ...line, background: on ? "var(--v-accent-soft)" : i === 0 ? "var(--v-surface2)" : undefined }}>
                  {outside(c) && <span title={hidden.join("\n")}><Tick /></span>}
                  <div className="flex items-center justify-between">
                    <span className="v-num text-[11px]" style={ink2}>{String(role.candidates.indexOf(c) + 1).padStart(2, "0")}{c.proposed && m.result?.multi ? " · team" : ""}</span>
                    <button onClick={() => setSel(on ? sel.filter((x) => x !== c.employee_id) : [...sel, c.employee_id])} title="Select to compare"
                      className="mr-3 grid size-4 place-items-center border" style={{ borderColor: on ? "var(--v-ink)" : "var(--v-ink2)", background: on ? "var(--v-ink)" : "#fff" }}>
                      {on && <Check size={11} color="#fff" strokeWidth={3} />}
                    </button>
                  </div>
                  <button onClick={() => onOpen(c)} className="mt-1 block text-left">
                    <span className="line-clamp-2 min-h-9 text-[14px] font-semibold leading-[18px] hover:underline">{c.name}</span>
                    <span className="mt-0.5 line-clamp-1 text-[12px]" style={ink2}>{c.position}</span>
                  </button>
                  <div className="mt-3 flex items-end justify-between">
                    <span className="v-num text-[26px] font-medium leading-none">{c.fit}</span>
                    <span className="text-[11px] font-semibold uppercase tracking-[.06em]" style={{ color: availColor(c.availability_code) }}>{availShort(c.availability_code)}</span>
                  </div>
                  <div className="mt-2"><Bar w={c.fit} /></div>
                </div>
              );
            })}

            {band("Must have")}
            {must.length ? must.map(reqRow) : <div className="border-b border-r p-4 text-[13px]" style={{ ...line, ...ink2, gridColumn: "1 / -1" }}>No must-haves. Click a nice-to-have to make it one.</div>}
            {nice.length > 0 && band("Nice to have")}
            {nice.map(reqRow)}

            {band("At a glance")}
            <div className="sticky left-0 z-10 border-b border-r bg-white p-4 text-[14px] font-medium" style={line}>Must-haves shown</div>
            {cands.map((c, i) => <div key={c.employee_id} className="v-num border-b border-r p-4 text-[14px]" style={{ ...line, background: i === 0 ? "var(--v-surface2)" : undefined }}>{c.must_covered}/{c.must_total}</div>)}
            {spec.seniority_min && (
              <>
                <div className="sticky left-0 z-10 border-b border-r bg-white p-4 text-[14px] font-medium" style={line}>Seniority ({spec.seniority_min}{spec.seniority_mode === "min" ? "+" : " target"})</div>
                {cands.map((c, i) => <div key={c.employee_id} className="flex items-center gap-2 border-b border-r p-4 text-[12px]" style={{ ...line, background: i === 0 ? "var(--v-surface2)" : undefined }}><Dot s={c.seniority_check?.status ?? "covered"} />{c.seniority} · {c.years}y</div>)}
              </>
            )}
            <div className="sticky left-0 z-10 border-b border-r bg-white p-4 text-[14px] font-medium" style={line}>Main risk</div>
            {cands.map((c, i) => <div key={c.employee_id} className="border-b border-r p-4 text-[12px] leading-4" style={{ ...line, ...ink2, background: i === 0 ? "var(--v-surface2)" : undefined }}>{c.risks[0]?.text ?? "—"}</div>)}
            {kw && (
              <>
                <div className="sticky left-0 z-10 border-b border-r bg-white p-4 text-[14px] font-medium" style={line}>Found by keyword search</div>
                {cands.map((c, i) => <div key={c.employee_id} className="border-b border-r p-4 text-[12px] font-semibold" style={{ ...line, background: i === 0 ? "var(--v-surface2)" : undefined, color: c.keyword_hit ? "var(--v-ink2)" : "var(--v-accent-ink)" }}>{c.keyword_hit ? "Yes" : "No — found by meaning"}</div>)}
              </>
            )}
            <div className="sticky left-0 z-10 border-b border-r bg-white p-3" style={line} />
            {cands.map((c, i) => (
              <div key={c.employee_id} className="border-b border-r p-3" style={{ ...line, background: i === 0 ? "var(--v-surface2)" : undefined }}>
                <button onClick={() => onOpen(c)} className="inline-flex items-center gap-1 text-[12px] font-semibold underline underline-offset-4">Open <ArrowRight size={12} /></button>
              </div>
            ))}
          </div>
        </div>
      )}

      {role.complement && (
        <p className="mt-4 border-l-2 pl-3 text-[14px]" style={{ borderColor: "var(--v-accent)" }}>
          No single column covers every must-have. Pair <b>{role.candidates.find((c) => c.employee_id === role.complement!.for)?.name}</b> with{" "}
          <button onClick={() => onOpenId(role.complement!.person.employee_id)} className="font-semibold underline underline-offset-4">{role.complement.person.name}</button> ({role.complement.person.role}), who covers {role.complement.covers.join(", ")}.
        </p>
      )}

      {sel.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-white" style={{ borderColor: "var(--v-ink)" }}>
          <div className="flex items-center gap-4 px-8 py-3 text-[14px]">
            <span className="v-num font-semibold">{sel.length}</span><span>selected</span>
            <button onClick={() => setOnly(!only)} className="px-4 py-2 font-semibold text-white" style={{ background: "var(--v-ink)" }}>{only ? "Show everyone" : "Compare only these"}</button>
            <button onClick={() => { setSel([]); setOnly(false); }} className="font-semibold underline underline-offset-4">Clear</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ team
function MapShapeEditor({ shape, onChange, onReset, hasCustom }: { shape: TeamShape; onChange: (s: TeamShape) => void; onReset: () => void; hasCustom: boolean }) {
  const set = (patch: Partial<TeamShape>) => onChange({ ...shape, ...patch });
  const ctl = "border bg-white px-2 py-1 text-[13px] font-medium outline-none";
  return (
    <div className="mt-4 border p-4 fade-in" style={line}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className={label}>Team shape rules</div>
        <div className="flex items-center gap-4 text-[13px]">
          <label className="inline-flex cursor-pointer items-center gap-2 font-medium">
            <input type="checkbox" checked={shape.enabled} onChange={(e) => set({ enabled: e.target.checked })} />
            Balance team
          </label>
          {hasCustom && (
            <button onClick={onReset} className="inline-flex items-center gap-1 font-semibold underline underline-offset-4">
              <RotateCcw size={12} /> Defaults
            </button>
          )}
        </div>
      </div>
      {shape.enabled && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-[12px]">
          <label className="flex flex-col gap-1">
            <span className={label} style={ink2}>Anchors (Lead+)</span>
            <select value={shape.anchors_min} onChange={(e) => set({ anchors_min: Number(e.target.value) })} className={ctl} style={line}>
              <option value={0}>None</option><option value={1}>≥ 1</option><option value={2}>≥ 2</option>
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className={label} style={ink2}>Max Senior+</span>
            <select value={shape.max_senior_plus_ratio} onChange={(e) => set({ max_senior_plus_ratio: Number(e.target.value) })} className={ctl} style={line}>
              <option value={0.4}>≤ 40%</option><option value={0.5}>≤ 50%</option><option value={0.6}>≤ 60%</option><option value={0.8}>≤ 80%</option><option value={1}>No cap</option>
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className={label} style={ink2}>Mid floor</span>
            <select value={shape.min_mid} onChange={(e) => set({ min_mid: Number(e.target.value) })} className={ctl} style={line}>
              <option value={0}>None</option><option value={1}>≥ 1 Mid</option><option value={2}>≥ 2 Mids</option>
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className={label} style={ink2}>Junior floor</span>
            <select value={shape.min_junior} onChange={(e) => set({ min_junior: Number(e.target.value) })} className={ctl} style={line}>
              <option value={0}>None</option><option value={1}>≥ 1 Junior</option><option value={2}>≥ 2 Juniors</option>
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className={label} style={ink2}>Max TZ spread</span>
            <select value={shape.max_tz_spread} onChange={(e) => set({ max_tz_spread: Number(e.target.value) })} className={ctl} style={line}>
              <option value={2}>≤ 2h</option><option value={4}>≤ 4h</option><option value={6}>≤ 6h</option><option value={8}>≤ 8h</option><option value={24}>Any</option>
            </select>
          </label>
          <label className="flex cursor-pointer items-center gap-2 pt-4 font-medium">
            <input type="checkbox" checked={shape.mentor_juniors} onChange={(e) => set({ mentor_juniors: e.target.checked })} />
            Mentor every Junior
          </label>
          <label className="flex cursor-pointer items-center gap-2 pt-4 font-medium">
            <input type="checkbox" checked={shape.prefer_shared_language} onChange={(e) => set({ prefer_shared_language: e.target.checked })} />
            Shared language (B2+)
          </label>
          <label className="flex cursor-pointer items-center gap-2 pt-4 font-medium">
            <input type="checkbox" checked={shape.avoid_duplicates} onChange={(e) => set({ avoid_duplicates: e.target.checked })} />
            Avoid duplicates
          </label>
        </div>
      )}
    </div>
  );
}

function Team({ m, onOpen }: { m: Matcher; onOpen: (roleId: string, c: Candidate) => void }) {
  const [editShape, setEditShape] = useState(false);
  const [showAllChecks, setShowAllChecks] = useState(false);
  const [swapSlot, setSwapSlot] = useState<string | null>(null);
  const t = m.result!.team!;
  const opt: TeamOption | null = m.activeTeamOption;
  const review = m.review;
  const lockCount = Object.keys(m.locks).length;

  if (!opt) {
    return <div className="px-8 pt-7 text-[14px]" style={ink2}>No team options available.</div>;
  }

  const failedChecks = opt.shape.checks.filter((ch) => !ch.ok);
  const visibleChecks = showAllChecks ? opt.shape.checks : failedChecks;

  return (
    <div className="grid gap-10 px-8 pt-7 xl:grid-cols-[1fr_340px] fade-in">
      <div>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="v-display text-[30px] font-semibold leading-9 tracking-tight">The team</h1>
            <p className="mt-1 text-[14px]" style={ink2}>Optimised jointly for role fit, balanced seniority, whole-team needs, shared language, and time zones.</p>
          </div>
          <div className="flex items-center gap-2">
            {lockCount > 0 && (
              <button onClick={m.clearLocks} className="inline-flex items-center gap-1 border px-3 py-1.5 text-[12px] font-semibold" style={line}>
                <Unlock size={12} /> Clear {lockCount} lock{lockCount > 1 ? "s" : ""}
              </button>
            )}
            <button onClick={() => setEditShape((v) => !v)} className="inline-flex items-center gap-1.5 border px-3 py-1.5 text-[12px] font-semibold" style={editShape ? { borderColor: "var(--v-ink)", background: "var(--v-ink)", color: "#fff" } : line}>
              <SlidersHorizontal size={12} /> Edit shape
            </button>
          </div>
        </div>

        {/* 3 Alternative tabs */}
        <div className="mt-5 grid grid-cols-3 border-l border-t" style={line}>
          {t.options.map((o, idx) => {
            const active = o.id === opt.id;
            return (
              <button
                key={o.id}
                onClick={() => { m.setTeamOption(o.id); setSwapSlot(null); }}
                className="border-b border-r p-4 text-left transition-colors"
                style={{ ...line, background: active ? "var(--v-surface2)" : "#fff", boxShadow: active ? "inset 0 -2px 0 var(--v-ink)" : undefined }}
              >
                <div className="flex items-baseline justify-between">
                  <span className={label} style={{ color: active ? "var(--v-ink)" : "var(--v-ink2)" }}>{String(idx + 1).padStart(2, "0")} {o.label}</span>
                  <span className="v-num text-[22px] font-medium">{o.avg_fit}</span>
                </div>
                <div className="mt-1 text-[12px]" style={ink2}>{o.shape.summary}</div>
                <div className="mt-0.5 text-[11px] font-semibold uppercase tracking-[.06em]" style={{ color: o.ready_now_count === o.slots_filled ? "var(--v-good)" : "var(--v-ink2)" }}>{o.ready_by}</div>
              </button>
            );
          })}
        </div>

        {/* Scorecard */}
        <dl className="mt-4 grid grid-cols-2 border-l border-t sm:grid-cols-4" style={line}>
          <div className="border-b border-r p-3.5" style={line}>
            <dt className={label} style={ink2}>Places</dt>
            <dd className="v-num mt-1 text-[22px] font-medium">{opt.slots_filled}/{opt.slots_total}</dd>
          </div>
          <div className="border-b border-r p-3.5" style={line}>
            <dt className={label} style={ink2}>Shape</dt>
            <dd className="mt-1 text-[13px] font-semibold leading-5">{opt.shape.summary}</dd>
          </div>
          <div className="border-b border-r p-3.5" style={line}>
            <dt className={label} style={ink2}>Shared language</dt>
            <dd className="mt-1 text-[13px] font-semibold leading-5">{opt.shared_languages.length ? opt.shared_languages.slice(0, 2).join(", ") : "None at B2+"}</dd>
          </div>
          <div className="border-b border-r p-3.5" style={line}>
            <dt className={label} style={ink2}>Time zones</dt>
            <dd className="mt-1 text-[13px] font-semibold leading-5">{opt.tz_summary}</dd>
          </div>
        </dl>

        {/* Whole-team needs */}
        {opt.team_needs.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-2 text-[12px]">
            <span className={label} style={ink2}>Whole-team needs</span>
            {opt.team_needs.map((tn) => (
              <span key={tn.id} title={tn.members.join(", ")} className="inline-flex items-center gap-1.5 border px-2.5 py-1 font-semibold" style={{ borderColor: tn.ok ? "var(--v-ink)" : "var(--v-warn)", color: tn.ok ? "var(--v-ink)" : "var(--v-warn)" }}>
                <span>{tn.ok ? "✓" : "!"} {tn.label}</span>
                <span className="v-num" style={ink2}>{tn.covered}/{tn.target}</span>
                <button onClick={() => m.editTeamNeed(tn.id, null)} title="Remove" style={ink2}><X size={11} /></button>
              </span>
            ))}
          </div>
        )}

        {/* Shape rule notes */}
        {opt.shape.checks.length > 0 && (
          <div className="mt-3 space-y-1 text-[12px]">
            {visibleChecks.map((ch) => (
              <div key={ch.rule} style={{ color: ch.ok ? "var(--v-ink2)" : "var(--v-warn)" }}>
                <span className="font-semibold">{ch.ok ? "✓" : "!"} {ch.label}:</span> {ch.detail}
              </div>
            ))}
            <button onClick={() => setShowAllChecks((v) => !v)} className="font-semibold underline underline-offset-4" style={ink2}>
              {showAllChecks ? "Hide passing rules" : failedChecks.length ? `Inspect all ${opt.shape.checks.length} rules` : `All ${opt.shape.checks.length} shape rules met — inspect`}
            </button>
          </div>
        )}

        {editShape && (
          <MapShapeEditor shape={m.teamShape ?? t.shape} onChange={m.updateTeamShape} onReset={m.resetTeamShape} hasCustom={m.teamShape !== null} />
        )}

        {/* Slots table */}
        <div className="mt-5 overflow-x-auto border-l border-t" style={line}>
          <table className="w-full min-w-[780px] text-left text-[13px]">
            <thead>
              <tr className="text-[11px] font-semibold uppercase tracking-[.12em]" style={ink2}>
                {["Slot", "Person", "Fit", "Must-haves", "Availability", "Actions"].map((h) => (
                  <th key={h} className="border-b border-r px-4 py-3 font-semibold" style={line}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {opt.members.map((member) => {
                const c = member.candidate;
                const openSwap = swapSlot === member.slot_id;
                return (
                  <tr key={member.slot_id} style={{ background: member.locked ? "var(--v-surface2)" : undefined }}>
                    <td className="border-b border-r px-4 py-3 align-top" style={line}>
                      <div className="font-semibold">{member.slot_label}</div>
                      <div className="mt-1 inline-block border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[.1em]" style={{ ...line, color: member.team_role === "anchor" ? "var(--v-accent-ink)" : member.team_role === "learner" ? "var(--v-good)" : "var(--v-ink2)" }}>
                        {member.team_role}
                      </div>
                    </td>
                    {c ? (
                      <>
                        <td className="border-b border-r px-4 py-3 align-top" style={line}>
                          <button onClick={() => onOpen(member.role_id, c)} className="text-left font-semibold hover:underline">{c.name}</button>
                          <div style={ink2}>{c.seniority} · {c.position} · {c.location}</div>
                          {member.mentor && (
                            <div className="mt-1 text-[12px]" style={{ color: "var(--v-accent-ink)" }}>
                              {member.team_role === "learner" ? "Mentored by" : "Paired with"} {member.mentor.name} ({member.mentor.seniority})
                            </div>
                          )}
                          {openSwap && member.swaps.length > 0 && (
                            <div className="mt-3 border-t pt-2.5 space-y-2" style={line}>
                              <div className={label} style={ink2}>Swap alternatives</div>
                              {member.swaps.map((sw) => (
                                <div key={sw.candidate.employee_id} className="flex items-center justify-between gap-2 border p-2 text-[12px] bg-white" style={line}>
                                  <div className="min-w-0">
                                    <div className="font-semibold">{sw.candidate.name} <span className="font-normal" style={ink2}>· {sw.candidate.seniority} · {sw.candidate.fit}%</span></div>
                                    <div style={ink2}>{sw.impact.join(" · ")}</div>
                                  </div>
                                  <button
                                    onClick={() => { m.swapMember(member.slot_id, sw.candidate.employee_id); setSwapSlot(null); }}
                                    className="shrink-0 px-2.5 py-1 text-[11px] font-semibold text-white"
                                    style={{ background: "var(--v-ink)" }}
                                  >
                                    Swap
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="v-num border-b border-r px-4 py-3 align-top text-[18px]" style={line}>{c.fit}</td>
                        <td className="border-b border-r px-4 py-3 align-top" style={line}>
                          <div className="flex flex-wrap gap-x-3 gap-y-1">
                            {c.requirements.filter((q) => q.importance === "must" && q.status !== "unknown").map((q) => (
                              <span key={q.id} className="inline-flex items-center gap-1.5" title={statusWord(q.status)}><Dot s={q.status} size={11} />{q.label}</span>
                            ))}
                          </div>
                        </td>
                        <td className="border-b border-r px-4 py-3 align-top text-[12px] font-semibold uppercase tracking-[.06em]" style={{ ...line, color: availColor(c.availability_code) }}>{c.availability}</td>
                        <td className="border-b border-r px-4 py-3 align-top" style={line}>
                          <div className="flex flex-col items-start gap-1.5">
                            <button
                              onClick={() => m.toggleLock(member.slot_id, c.employee_id)}
                              className="inline-flex items-center gap-1 text-[12px] font-semibold underline underline-offset-4"
                              style={{ color: member.locked ? "var(--v-accent-ink)" : "var(--v-ink)" }}
                            >
                              {member.locked ? <Lock size={12} /> : <Unlock size={12} />} {member.locked ? "Locked" : "Lock"}
                            </button>
                            {member.swaps.length > 0 && (
                              <button onClick={() => setSwapSlot(openSwap ? null : member.slot_id)} className="inline-flex items-center gap-1 text-[12px] font-semibold underline underline-offset-4">
                                <ArrowLeftRight size={12} /> {openSwap ? "Close" : "Swap"}
                              </button>
                            )}
                            <button onClick={() => m.setTab(member.role_id)} className="text-[12px] underline underline-offset-4" style={ink2}>Role tab</button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <td colSpan={5} className="border-b border-r px-4 py-3" style={{ ...line, color: "var(--v-bad)" }}>Nobody eligible for this place — loosen the rules in the role tab.</td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <aside className="border-t pt-5 xl:border-l xl:border-t-0 xl:pl-8 xl:pt-0" style={line}>
        <div className={label} style={ink2}>Team review · AI</div>
        {review === "loading" && <p className="mt-3 text-[14px]" style={ink2}>Reviewing the team…</p>}
        {review && review !== "loading" && !review.ok && <p className="mt-3 text-[14px]" style={ink2}>{review.error}</p>}
        {review && review !== "loading" && review.ok && (
          <div className="mt-3 space-y-5 text-[14px] leading-6">
            <p>{review.summary}</p>
            {!!review.risks?.length && <div><div className={label} style={{ color: "var(--v-warn)" }}>Risks</div><ol className="mt-2 list-decimal space-y-1.5 pl-5">{review.risks.map((x) => <li key={x}>{x}</li>)}</ol></div>}
            {!!review.suggestions?.length && <div><div className={label} style={ink2}>Next steps</div><ol className="mt-2 list-decimal space-y-1.5 pl-5">{review.suggestions.map((x) => <li key={x}>{x}</li>)}</ol></div>}
          </div>
        )}
      </aside>
    </div>
  );
}
function Loading({ m }: { m: Matcher }) {
  const steps = [["interpreting", "Reading the brief"], ["searching", `Scoring ${m.meta ? fmt.format(m.meta.profiles) : "all"} people`]];
  const idx = steps.findIndex(([k]) => k === m.phase);
  return (
    <main className="max-w-2xl px-8 py-16 fade-in">
      <p className="border-l-2 pl-4 text-[15px] leading-6" style={{ ...ink2, borderColor: "var(--v-ink)" }}>{m.brief}</p>
      <div className="mt-8 space-y-5">
        {steps.map(([k, t], i) => (
          <div key={k} style={{ opacity: i > idx ? 0.35 : 1 }}>
            <div className="flex justify-between text-[13px] font-semibold uppercase tracking-[.1em]"><span>{String(i + 1).padStart(2, "0")} {t}</span><span className="v-num">{i < idx ? "done" : i === idx ? "…" : ""}</span></div>
            <div className="mt-2 h-[3px] overflow-hidden" style={{ background: "var(--v-line)" }}>
              <div className={`h-full ${i === idx ? "w-1/2 animate-pulse" : i < idx ? "w-full" : "w-0"}`} style={{ background: "var(--v-ink)" }} />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
