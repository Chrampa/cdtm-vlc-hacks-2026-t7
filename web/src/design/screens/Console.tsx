import { Bookmark, Briefcase, Check, Command, Folder, Layers, Lock, Minus, Plus, Search, Settings, Sparkles, Users, X } from "lucide-react";
import { citedOnce, evidence, evLabel, evType, fmt, shortLine, snap, statusWord, top } from "../data";

const ink2 = { color: "var(--v-ink2)" };
const line = { borderColor: "var(--v-line)" };
const tone = (s: string) => (s === "covered" ? "var(--v-good)" : s === "partial" ? "var(--v-warn)" : "var(--v-bad)");
const soft = (s: string) => (s === "covered" ? "var(--v-good-soft)" : s === "partial" ? "var(--v-warn-soft)" : "var(--v-bad-soft)");

function StatusIcon({ s }: { s: string }) {
  const I = s === "covered" ? Check : s === "partial" ? Minus : X;
  return <span className="inline-grid size-4 place-items-center rounded" style={{ background: soft(s), color: tone(s) }}><I size={11} strokeWidth={3} /></span>;
}

function Avail({ code, text }: { code: number; text: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[12px] font-medium" style={{ color: code === 0 ? "var(--v-good)" : "var(--v-warn)" }}>
      <span className="size-1.5 rounded-full" style={{ background: "currentColor" }} />{code === 0 ? "Now" : "≤ 3 mo"}
      <span className="sr-only">{text}</span>
    </span>
  );
}

function Chip({ id }: { id: string }) {
  const t = evType(id);
  const I = t === "skill" ? Sparkles : t === "project" ? Folder : t === "job" ? Briefcase : Users;
  return (
    <span className="mx-0.5 inline-flex items-center gap-1 rounded border px-1.5 align-[1px] text-[11px] font-medium leading-[18px]" style={{ ...line, background: "var(--v-surface2)" }}>
      <I size={10} style={ink2} />{evLabel(id)}
    </span>
  );
}

function Shell({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <div className="flex h-[760px]">
      <nav className="flex w-14 flex-col items-center gap-5 py-4 text-white/60" style={{ background: "var(--v-rail)" }}>
        <span className="grid size-8 place-items-center rounded-md text-[13px] font-bold text-white" style={{ background: "var(--v-accent)" }}>In</span>
        <Search size={18} className="text-white" /><Users size={18} /><Layers size={18} /><Bookmark size={18} />
        <div className="flex-1" /><Settings size={18} />
      </nav>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-3 border-b px-5 py-2.5" style={{ ...line, background: "var(--v-surface)" }}>
          <span className="text-[13px]" style={ink2}>Searches /</span>
          <span className="text-[14px] font-semibold">{title}</span>
          <div className="ml-auto flex items-center gap-2 rounded-md border px-2 py-1 text-[12px]" style={{ ...line, ...ink2 }}><Command size={12} /> K</div>
        </div>
        {children}
      </div>
    </div>
  );
}

function QueryBar() {
  return (
    <div className="flex flex-wrap items-center gap-1.5 border-b px-5 py-2.5" style={{ ...line, background: "var(--v-surface)" }}>
      <span className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[12px] font-medium" style={{ background: "var(--v-ink)", color: "#fff" }}><Lock size={11} /> Free ≤ 3 mo</span>
      {snap.requirements.map((r) => (
        <span key={r.label} className="inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[12px]" style={line}>
          <span className="text-[10px] font-semibold uppercase" style={{ color: r.importance === "must" ? "var(--v-accent)" : "var(--v-ink2)" }}>{r.importance}</span>
          {r.label}{r.implicit && <Sparkles size={11} style={{ color: "var(--v-accent)" }} />}
        </span>
      ))}
      <span className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[12px]" style={ink2}><Plus size={12} /> Add</span>
      <span className="v-num ml-auto text-[12px]" style={ink2}>{fmt.format(snap.funnel[1].count)} eligible · {snap.total_shown} shown</span>
    </div>
  );
}

export function Components() {
  return (
    <div className="space-y-4 text-[13px]">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-md px-3 py-1.5 font-medium" style={{ background: "var(--v-accent)", color: "#fff" }}>Compare <span className="v-num opacity-70">C</span></span>
        <span className="rounded-md border px-3 py-1.5 font-medium" style={line}>Shortlist <span className="v-num" style={ink2}>S</span></span>
        <span className="rounded-md border px-2 py-1 text-[12px]" style={line}><span className="text-[10px] font-semibold uppercase" style={{ color: "var(--v-accent)" }}>must</span> BigQuery pipelines</span>
      </div>
      <div className="flex flex-wrap items-center gap-4">
        {["covered", "partial", "missing"].map((s) => <span key={s} className="inline-flex items-center gap-1.5"><StatusIcon s={s} /> {statusWord(s)}</span>)}
      </div>
      <div className="flex items-center gap-5">
        <span className="inline-flex items-center gap-1">{["covered", "covered", "partial", "covered"].map((s, i) => <span key={i} className="size-3 rounded-[3px]" style={{ background: tone(s) }} />)}<span className="v-num ml-1.5">3/4</span></span>
        <span className="inline-flex items-center gap-2"><span className="v-num w-6 text-right font-medium">83</span><span className="h-1.5 w-16 rounded-full" style={{ background: "var(--v-line)" }}><span className="block h-full w-[83%] rounded-full" style={{ background: "var(--v-accent)" }} /></span></span>
        <Avail code={0} text="Available now" /><Avail code={1} text="Free soon" />
      </div>
      <p>BigQuery at 4/5 for 16 years <Chip id="S6" /> <Chip id="P1" /></p>
    </div>
  );
}

export function Shortlist() {
  const sel = top;
  const exp = snap.detail.explanation;
  return (
    <Shell title={snap.role_title}>
      <QueryBar />
      <div className="flex min-h-0 flex-1">
        <div className="min-w-0 flex-1 overflow-hidden" style={{ background: "var(--v-surface)" }}>
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="border-b text-[11px] uppercase tracking-[.06em]" style={{ ...line, ...ink2 }}>
                <th className="w-9 py-2 pl-5"><span className="inline-block size-3.5 rounded border" style={line} /></th>
                <th className="w-8 font-medium">#</th>
                <th className="font-medium">Person</th>
                <th className="w-28 font-medium">Fit</th>
                <th className="w-32 font-medium">Must-haves</th>
                <th className="w-24 font-medium">Avail.</th>
                <th className="w-24 font-medium">Seniority</th>
                <th className="w-14 text-right font-medium">Yrs</th>
                <th className="w-28 pl-4 font-medium">Flags</th>
              </tr>
            </thead>
            <tbody>
              {snap.candidates.map((c, i) => {
                const active = c.employee_id === sel.employee_id;
                return (
                  <tr key={c.employee_id} className="border-b" style={{ ...line, background: active ? "var(--v-accent-soft)" : undefined }}>
                    <td className="py-2.5 pl-5"><span className="inline-grid size-3.5 place-items-center rounded border" style={{ ...line, background: i < 2 ? "var(--v-accent)" : undefined }}>{i < 2 && <Check size={10} color="#fff" strokeWidth={3} />}</span></td>
                    <td className="v-num" style={ink2}>{i + 1}</td>
                    <td className="py-2"><div className="font-medium">{c.name}</div><div className="text-[12px]" style={ink2}>{c.position} · {c.location}</div></td>
                    <td><span className="inline-flex items-center gap-2"><span className="v-num w-6 text-right font-medium">{c.fit}</span><span className="h-1.5 w-14 rounded-full" style={{ background: "var(--v-line)" }}><span className="block h-full rounded-full" style={{ width: `${c.fit}%`, background: "var(--v-accent)" }} /></span></span></td>
                    <td><span className="inline-flex items-center gap-1">{c.requirements.filter((r) => r.importance === "must").map((r) => <span key={r.label} title={`${r.label}: ${statusWord(r.status)}`} className="size-3 rounded-[3px]" style={{ background: tone(r.status) }} />)}<span className="v-num ml-1.5">{c.must_covered}/{c.must_total}</span></span></td>
                    <td><Avail code={c.availability_code} text={c.availability} /></td>
                    <td>{c.seniority}</td>
                    <td className="v-num text-right">{c.years}</td>
                    <td className="pl-4">{c.other_team && <span className="rounded px-1.5 py-0.5 text-[11px] font-medium" style={{ background: "var(--v-accent-soft)", color: "var(--v-accent)" }}>Other team</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="flex items-center gap-5 px-5 py-3 text-[12px]" style={ink2}>
            <span><span className="v-num rounded border px-1" style={line}>J</span>/<span className="v-num rounded border px-1" style={line}>K</span> move</span>
            <span><span className="v-num rounded border px-1" style={line}>X</span> select</span>
            <span><span className="v-num rounded border px-1" style={line}>C</span> compare 2 selected</span>
            <span className="ml-auto">Keyword search for {snap.keyword.terms.join(" + ")}: <b className="v-num" style={{ color: "var(--v-ink)" }}>0</b> results</span>
          </div>
        </div>

        <aside className="w-[390px] shrink-0 overflow-hidden border-l px-5 py-4" style={{ ...line, background: "var(--v-surface)" }}>
          <div className="flex items-start justify-between">
            <div><div className="text-[15px] font-semibold">{sel.name}</div><div className="text-[12px]" style={ink2}>{sel.position}</div></div>
            <div className="text-right"><div className="v-num text-[26px] font-medium leading-7">{sel.fit}</div><div className="text-[11px]" style={ink2}>fit</div></div>
          </div>
          <div className="mt-2 flex gap-2 text-[12px]">
            <span className="rounded px-1.5 py-0.5" style={{ background: "var(--v-warn-soft)", color: "var(--v-warn)" }}>Free ≤ 3 months</span>
            <span className="rounded px-1.5 py-0.5" style={{ background: "var(--v-accent-soft)", color: "var(--v-accent)" }}>Other team · {sel.area}</span>
          </div>
          <div className="mt-5 text-[11px] font-medium uppercase tracking-[.06em]" style={ink2}>Coverage</div>
          <div className="mt-2 space-y-2">
            {sel.requirements.map((r) => (
              <div key={r.label} className="grid grid-cols-[16px_1fr] gap-2 text-[13px]">
                <StatusIcon s={r.status} />
                <div><div className="font-medium">{r.label}</div><div className="text-[12px]" style={ink2}>{shortLine(r.line)}</div></div>
              </div>
            ))}
          </div>
          <div className="mt-5 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[.06em]" style={ink2}><Sparkles size={11} /> AI summary</div>
          <p className="mt-1.5 text-[13px] leading-[21px]">{citedOnce(exp.summary).map((p, i) => ("t" in p ? <span key={i}>{p.t}</span> : <Chip key={i} id={p.id} />))}</p>
          <div className="mt-5 text-[11px] font-medium uppercase tracking-[.06em]" style={ink2}>Risks</div>
          <ul className="mt-1.5 space-y-1 text-[13px]">{snap.detail.risks.map((r) => <li key={r} style={{ color: "var(--v-warn)" }}>▲ <span style={{ color: "var(--v-ink)" }}>{r}</span></li>)}</ul>
        </aside>
      </div>
    </Shell>
  );
}

export function Detail() {
  const d = snap.detail;
  const skills = d.evidence.filter((e) => e.type === "skill");
  const jobs = d.evidence.filter((e) => e.type === "job" || e.type === "project");
  return (
    <Shell title={`${snap.role_title} / ${top.name}`}>
      <div className="flex items-center gap-6 border-b px-6" style={{ ...line, background: "var(--v-surface)" }}>
        {["Overview", "Evidence", "Timeline", "Compare (2)"].map((t, i) => (
          <span key={t} className={`border-b-2 py-2.5 text-[13px] ${i === 0 ? "font-semibold" : ""}`} style={{ borderColor: i === 0 ? "var(--v-accent)" : "transparent", color: i === 0 ? "var(--v-ink)" : "var(--v-ink2)" }}>{t}</span>
        ))}
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-[1fr_340px] gap-5 overflow-hidden p-5">
        <div className="space-y-5">
          <div className="rounded-md border" style={{ ...line, background: "var(--v-surface)" }}>
            <div className="border-b px-4 py-2.5 text-[13px] font-semibold" style={line}>Requirement coverage</div>
            <table className="w-full text-left text-[13px]">
              <thead><tr className="text-[11px] uppercase tracking-[.06em]" style={ink2}><th className="px-4 py-2 font-medium">Requirement</th><th className="font-medium">Status</th><th className="font-medium">Best evidence</th><th className="pr-4 font-medium">Sources</th></tr></thead>
              <tbody>
                {d.requirements.map((r) => (
                  <tr key={r.label} className="border-t align-top" style={line}>
                    <td className="px-4 py-2.5 font-medium">{r.label}<div className="text-[11px] uppercase" style={{ color: "var(--v-accent)" }}>{r.importance}</div></td>
                    <td className="py-2.5"><span className="inline-flex items-center gap-1.5"><StatusIcon s={r.status} />{statusWord(r.status)}</span></td>
                    <td className="py-2.5" style={ink2}>{r.lines[0]}</td>
                    <td className="py-2.5 pr-4">{r.evidence.slice(0, 3).map((id) => <Chip key={id} id={id} />)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="rounded-md border" style={{ ...line, background: "var(--v-surface)" }}>
            <div className="border-b px-4 py-2.5 text-[13px] font-semibold" style={line}>Skills</div>
            <table className="w-full text-left text-[13px]">
              <thead><tr className="text-[11px] uppercase tracking-[.06em]" style={ink2}><th className="px-4 py-2 font-medium">Skill</th><th className="font-medium">Level</th><th className="text-right font-medium">Years</th><th className="pl-6 font-medium">Used in</th></tr></thead>
              <tbody>
                {skills.map((s) => (
                  <tr key={s.id} className="border-t" style={line}>
                    <td className="px-4 py-2 font-medium">{s.name}</td>
                    <td><span className="inline-flex gap-0.5">{[1, 2, 3, 4, 5].map((n) => <span key={n} className="h-2 w-3.5 rounded-sm" style={{ background: n <= Number(s.level) ? "var(--v-accent)" : "var(--v-line)" }} />)}</span></td>
                    <td className="v-num text-right">{s.years}</td>
                    <td className="pl-6" style={ink2}>{s.used_in?.length ? s.used_in.map((u) => evLabel(u)).join(", ") : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <aside className="space-y-4">
          <div className="rounded-md border p-4" style={{ ...line, background: "var(--v-surface)" }}>
            <div className="text-[15px] font-semibold">{top.name}</div>
            <div className="text-[12px]" style={ink2}>{top.position} · {top.location}</div>
            <dl className="mt-3 grid grid-cols-2 gap-y-2 text-[12px]">
              <dt style={ink2}>Fit</dt><dd className="v-num font-medium">{top.fit}</dd>
              <dt style={ink2}>Must-haves</dt><dd className="v-num font-medium">{top.must_covered}/{top.must_total}</dd>
              <dt style={ink2}>Availability</dt><dd style={{ color: "var(--v-warn)" }}>Free ≤ 3 months</dd>
              <dt style={ink2}>Experience</dt><dd className="v-num">{top.years}y · {top.seniority}</dd>
              <dt style={ink2}>Main sector</dt><dd>{top.sector}</dd>
            </dl>
          </div>
          <div className="rounded-md border p-4" style={{ ...line, background: "var(--v-surface)" }}>
            <div className="text-[11px] font-medium uppercase tracking-[.06em]" style={ink2}>Career</div>
            <ul className="mt-2 space-y-1.5 text-[12px]">{jobs.map((j) => <li key={j.id}>{evidence(j.id)?.text}</li>)}</ul>
          </div>
        </aside>
      </div>
    </Shell>
  );
}
