import { ArrowRight } from "lucide-react";
import { cited, evidence, fmt, shortLine, snap, sources, statusGlyph, statusWord, top } from "../data";

const ink2 = { color: "var(--v-ink2)" };
const line = { borderColor: "var(--v-line)" };
const label = "text-[11px] font-semibold uppercase tracking-[.12em]";
const availColor = (code: number) => (code === 0 ? "var(--v-good)" : "var(--v-warn)");

function Dot({ s }: { s: string }) {
  if (s === "covered") return <span className="inline-block size-3.5 rounded-full" style={{ background: "var(--v-ink)" }} />;
  if (s === "partial") return <span className="inline-block size-3.5 rounded-full border-[1.5px]" style={{ borderColor: "var(--v-ink2)", background: "linear-gradient(90deg, var(--v-ink2) 50%, transparent 50%)" }} />;
  return <span className="inline-block size-3.5 rounded-full border-[1.5px]" style={{ borderColor: "var(--v-ink2)" }} />;
}

function Tick() {
  return <span className="absolute right-0 top-0 size-0 border-l-[14px] border-t-[14px] border-l-transparent" style={{ borderTopColor: "var(--v-accent)" }} />;
}

function TopBar() {
  return (
    <div className="flex items-center gap-8 border-b px-10 py-4" style={line}>
      <span className="text-[15px] font-bold uppercase tracking-[.2em]">Insider</span>
      <span className="text-[14px]"><b>{snap.role_title}</b><span style={ink2}> · free ≤ 3 months · any experience</span></span>
      <span className="text-[13px] underline underline-offset-4">Edit brief</span>
      <div className="ml-auto flex border text-[12px] font-semibold uppercase tracking-[.1em]" style={line}>
        <span className="px-3 py-1.5" style={{ background: "var(--v-ink)", color: "#fff" }}>Matrix</span><span className="px-3 py-1.5" style={ink2}>List</span><span className="px-3 py-1.5" style={ink2}>Team</span>
      </div>
    </div>
  );
}

export function Components() {
  return (
    <div className="space-y-4 text-[13px]">
      <div className="flex flex-wrap items-center gap-3">
        <span className="px-4 py-2 font-semibold text-white" style={{ background: "var(--v-ink)" }}>Build team from selection</span>
        <span className="border px-4 py-2 font-semibold" style={line}>Open profile</span>
        <span className="inline-flex items-center gap-1 font-semibold underline underline-offset-4">Edit brief</span>
      </div>
      <div className="flex flex-wrap items-center gap-5">
        {["covered", "partial", "missing"].map((s) => <span key={s} className="inline-flex items-center gap-2"><Dot s={s} /> {statusWord(s)}</span>)}
      </div>
      <div className="flex items-stretch gap-0 border" style={line}>
        <div className="relative w-40 border-r p-3" style={line}><Tick /><div className="v-num text-[11px]" style={ink2}>01</div><div className="font-semibold">Jorge Salcedo</div><div className="text-[12px]" style={ink2}>Analytics Engineer</div><div className="v-num mt-1 text-[20px] font-medium">83</div></div>
        <div className="flex flex-1 items-center gap-2 p-3"><Dot s="covered" /> <span>BigQuery · 4/5 · 16 yrs</span></div>
      </div>
      <p className="text-[12px]" style={ink2}><span style={{ color: "var(--v-accent-ink)" }} className="font-semibold">◤ Orange tick</span> = found outside the team that usually does this role.</p>
    </div>
  );
}

export function Shortlist() {
  const cands = snap.candidates.slice(0, 6);
  const must = top.requirements.map((r) => r.label);
  const col = `260px repeat(${cands.length}, minmax(0, 1fr))`;
  return (
    <div className="pb-10">
      <TopBar />
      <div className="px-10 pt-8">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="v-display text-[30px] font-semibold leading-9 tracking-tight">Who covers what</h1>
            <p className="mt-1 text-[14px]" style={ink2}>{fmt.format(snap.funnel[0].count)} people → {fmt.format(snap.funnel[1].count)} free within 3 months → best {cands.length} shown · keyword search for {snap.keyword.terms.join(" + ")} finds 0</p>
          </div>
          <div className="flex items-center gap-5 text-[12px]" style={ink2}>
            <span className="inline-flex items-center gap-1.5"><Dot s="covered" /> shown</span>
            <span className="inline-flex items-center gap-1.5"><Dot s="partial" /> partly</span>
            <span className="inline-flex items-center gap-1.5"><Dot s="missing" /> not shown</span>
            <span className="inline-flex items-center gap-1.5"><span className="font-bold" style={{ color: "var(--v-accent)" }}>◤</span> outside usual team</span>
          </div>
        </div>

        <div className="mt-6 border-l border-t" style={line}>
          <div className="grid" style={{ gridTemplateColumns: col }}>
            <div className="border-b border-r p-4" style={line}><div className={label} style={ink2}>Requirement</div></div>
            {cands.map((c, i) => (
              <div key={c.employee_id} className="relative border-b border-r p-4" style={{ ...line, background: i === 0 ? "var(--v-surface2)" : undefined }}>
                {c.other_team && <Tick />}
                <div className="v-num text-[11px]" style={ink2}>{String(i + 1).padStart(2, "0")}</div>
                <div className="mt-0.5 line-clamp-2 min-h-9 text-[14px] font-semibold leading-[18px]">{c.name}</div>
                <div className="truncate text-[12px]" style={ink2}>{c.position}</div>
                <div className="mt-3 flex items-end justify-between">
                  <span className="v-num text-[26px] font-medium leading-none">{c.fit}</span>
                  <span className="text-[11px] font-semibold uppercase tracking-[.06em]" style={{ color: availColor(c.availability_code) }}>{c.availability_code === 0 ? "Now" : "≤ 3 mo"}</span>
                </div>
              </div>
            ))}

            <div className="border-b border-r px-4 py-2" style={{ ...line, gridColumn: "1 / -1", background: "var(--v-surface2)" }}><span className={label}>Must have</span></div>
            {must.map((m) => (
              <div key={m} className="contents">
                <div className="border-b border-r p-4 text-[14px] font-medium" style={line}>{m}</div>
                {cands.map((c, i) => {
                  const r = c.requirements.find((x) => x.label === m)!;
                  return (
                    <div key={c.employee_id} className="flex items-start gap-2 border-b border-r p-4 text-[12px] leading-4" style={{ ...line, background: i === 0 ? "var(--v-surface2)" : undefined }}>
                      <span className="mt-px"><Dot s={r.status} /></span><span style={{ color: r.status === "covered" ? "var(--v-ink)" : "var(--v-ink2)" }}>{shortLine(r.line)}</span>
                    </div>
                  );
                })}
              </div>
            ))}

            <div className="border-b border-r px-4 py-2" style={{ ...line, gridColumn: "1 / -1", background: "var(--v-surface2)" }}><span className={label}>At a glance</span></div>
            <div className="border-b border-r p-4 text-[14px] font-medium" style={line}>Must-haves shown</div>
            {cands.map((c, i) => <div key={c.employee_id} className="v-num border-b border-r p-4 text-[14px]" style={{ ...line, background: i === 0 ? "var(--v-surface2)" : undefined }}>{c.must_covered}/{c.must_total}</div>)}
            <div className="border-b border-r p-4 text-[14px] font-medium" style={line}>Main risk</div>
            {cands.map((c, i) => <div key={c.employee_id} className="border-b border-r p-4 text-[12px] leading-4" style={{ ...line, ...ink2, background: i === 0 ? "var(--v-surface2)" : undefined }}>{c.risks[0] ?? "—"}</div>)}
            <div className="border-b border-r p-4" style={line} />
            {cands.map((c, i) => (
              <div key={c.employee_id} className="border-b border-r p-3" style={{ ...line, background: i === 0 ? "var(--v-surface2)" : undefined }}>
                <span className="inline-flex items-center gap-1 text-[12px] font-semibold underline underline-offset-4">Open <ArrowRight size={12} /></span>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between text-[13px]">
          <span style={ink2}>Click any cell to see the evidence behind it. Select columns to compare or to build a team.</span>
          <span className="px-4 py-2 font-semibold text-white" style={{ background: "var(--v-ink)" }}>Build team from selection</span>
        </div>
      </div>
    </div>
  );
}

export function Detail() {
  const d = snap.detail;
  const e = d.explanation;
  const skills = d.evidence.filter((x) => x.type === "skill");
  return (
    <div className="pb-10">
      <TopBar />
      <div className="grid grid-cols-[300px_1fr_300px] gap-0 px-10 pt-8">
        <aside className="border-r pr-8" style={line}>
          <div className="v-num text-[12px]" style={ink2}>01 / {snap.total_shown}</div>
          <h1 className="v-display mt-1 text-[32px] font-semibold leading-9 tracking-tight">{top.name}</h1>
          <p className="mt-1 text-[14px]" style={ink2}>{top.position}</p>
          <dl className="mt-6 grid grid-cols-[110px_1fr] gap-y-3 border-t pt-4 text-[13px]" style={line}>
            <dt style={ink2}>Fit</dt><dd className="v-num text-[22px] font-medium leading-6">{top.fit}</dd>
            <dt style={ink2}>Must-haves</dt><dd className="v-num">{top.must_covered}/{top.must_total}</dd>
            <dt style={ink2}>Availability</dt><dd style={{ color: availColor(top.availability_code) }} className="font-semibold">{top.availability}</dd>
            <dt style={ink2}>Experience</dt><dd>{top.years} years · {top.seniority}</dd>
            <dt style={ink2}>Location</dt><dd>{top.location}</dd>
            <dt style={ink2}>Main sector</dt><dd>{top.sector}</dd>
            <dt style={ink2}>Team</dt><dd><span className="font-semibold" style={{ color: "var(--v-accent-ink)" }}>◤ {top.area}</span></dd>
          </dl>
        </aside>
        <section className="px-8">
          <div className={label} style={ink2}>Requirement → evidence</div>
          <div className="mt-3 border-l border-t" style={line}>
            {d.requirements.map((r) => (
              <div key={r.label} className="grid grid-cols-[200px_110px_1fr] border-b border-r text-[13px]" style={line}>
                <div className="border-r p-3 font-medium" style={line}>{r.label}</div>
                <div className="flex items-center gap-2 border-r p-3" style={line}><Dot s={r.status} />{statusWord(r.status)}</div>
                <div className="p-3 leading-5" style={ink2}>{r.lines.slice(0, 2).join(" · ")}</div>
              </div>
            ))}
          </div>
          <div className={`${label} mt-8`} style={ink2}>Evidence ledger · skills</div>
          <div className="mt-3 border-l border-t" style={line}>
            {skills.map((s) => (
              <div key={s.id} className="grid grid-cols-[200px_110px_80px_1fr] border-b border-r text-[13px]" style={line}>
                <div className="border-r p-2.5 font-medium" style={line}>{s.name}</div>
                <div className="border-r p-2.5 tracking-[.15em]" style={line}>{"●".repeat(Number(s.level))}<span style={{ color: "var(--v-line)" }}>{"●".repeat(5 - Number(s.level))}</span></div>
                <div className="v-num border-r p-2.5 text-right" style={line}>{s.years}y</div>
                <div className="p-2.5" style={ink2}>{s.used_in?.length ? `${s.used_in.length} recorded use${s.used_in.length > 1 ? "s" : ""}` : "never used in a recorded project"}</div>
              </div>
            ))}
          </div>
        </section>
        <aside className="border-l pl-8" style={line}>
          <div className={label} style={ink2}>AI summary</div>
          <p className="mt-3 text-[15px] leading-6">
            {cited(e.summary).map((p, i, all) => ("t" in p ? <span key={i}>{p.t}</span> : <sup key={i} className="v-num ml-px text-[10px] font-semibold" style={{ color: "var(--v-accent-ink)" }}>{i > 0 && "id" in all[i - 1] ? "," : ""}{sources.indexOf(p.id) + 1}</sup>))}
          </p>
          <div className={`${label} mt-6`} style={ink2}>Notes</div>
          <ol className="mt-2 space-y-2 text-[12px] leading-4" style={ink2}>
            {sources.slice(0, 6).map((id, i) => <li key={id}><span className="v-num font-semibold" style={{ color: "var(--v-accent-ink)" }}>{i + 1}</span> {evidence(id)?.text}</li>)}
          </ol>
          <div className={`${label} mt-6`} style={ink2}>Risks</div>
          <ul className="mt-2 space-y-1.5 text-[13px]">{d.risks.map((r) => <li key={r}>{statusGlyph("partial")} {r}</li>)}</ul>
        </aside>
      </div>
    </div>
  );
}
