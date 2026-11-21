import { ArrowRight, Lock } from "lucide-react";
import { cited, evidence, fmt, plainWhy, snap, sources, statusGlyph, statusWord, top } from "../data";

const C = {
  ink2: { color: "var(--v-ink2)" },
  rule: { borderColor: "var(--v-line)" },
  accent: { color: "var(--v-accent)" },
};
const tone = (s: string) => (s === "covered" ? "var(--v-good)" : s === "partial" ? "var(--v-warn)" : "var(--v-bad)");
const availColor = (code: number) => (code === 0 ? "var(--v-good)" : "var(--v-warn)");

function Kicker({ children }: { children: React.ReactNode }) {
  return <div className="text-[11px] font-semibold uppercase tracking-[.1em]" style={C.ink2}>{children}</div>;
}

function Footnoted({ text }: { text: string }) {
  return (
    <>
      {cited(text).map((p, i, all) =>
        "t" in p ? <span key={i}>{p.t}</span> : (
          <sup key={i} className="ml-px font-sans text-[10px] font-semibold" style={C.accent}>{i > 0 && "id" in all[i - 1] ? "," : ""}{sources.indexOf(p.id) + 1}</sup>
        ),
      )}
    </>
  );
}

function TopBar() {
  return (
    <div className="flex items-center justify-between border-b px-12 py-4" style={C.rule}>
      <div className="v-display text-2xl font-semibold tracking-tight">Insider</div>
      <div className="flex items-center gap-7 text-sm" style={C.ink2}>
        <span>Searches</span><span>Teams</span><span>Saved</span>
        <span className="rounded px-3 py-1.5 font-medium" style={{ background: "var(--v-accent)", color: "var(--v-on-accent)" }}>New search</span>
      </div>
    </div>
  );
}

export function Components() {
  return (
    <div className="space-y-4 text-sm">
      <div className="flex flex-wrap items-center gap-3">
        <span className="rounded px-4 py-2 font-medium" style={{ background: "var(--v-accent)", color: "var(--v-on-accent)" }}>Find people</span>
        <span className="rounded border px-4 py-2 font-medium" style={C.rule}>Adjust the brief</span>
        <span className="inline-flex items-center gap-1 font-medium" style={C.accent}>Read the case <ArrowRight size={14} /></span>
      </div>
      <div className="flex flex-wrap gap-5">
        <span style={{ color: "var(--v-good)" }}>● Available now</span>
        <span style={{ color: "var(--v-warn)" }}>● Free in &lt; 3 months</span>
        <span style={C.ink2}>○ Assigned</span>
      </div>
      <div className="flex flex-wrap gap-5">
        {["covered", "partial", "missing"].map((s) => <span key={s} style={{ color: tone(s) }}>{statusGlyph(s)} {statusWord(s)}</span>)}
      </div>
      <div className="flex items-end gap-6">
        <div><span className="v-num text-4xl font-semibold">83</span><span style={C.ink2}> /100</span><div className="text-xs" style={C.ink2}>3 of 4 must-haves</div></div>
        <p className="max-w-[260px] text-[15px] leading-6">Shown in a 2022 insurance project<sup className="ml-px text-[10px] font-semibold" style={C.accent}>1</sup>.</p>
        <span className="px-1" style={{ background: "var(--v-mark)" }}>Found outside Data Engineering</span>
      </div>
    </div>
  );
}

export function Shortlist() {
  const must = snap.requirements.filter((r) => r.importance === "must");
  const nice = snap.requirements.filter((r) => r.importance === "nice");
  return (
    <div>
      <TopBar />
      <div className="grid grid-cols-[320px_1fr] gap-14 px-12 py-10">
        <aside className="space-y-7">
          <div>
            <Kicker>The brief</Kicker>
            <h2 className="v-display mt-2 text-[26px] font-semibold leading-8">{snap.role_title}</h2>
            <p className="mt-3 text-[14px] italic leading-6" style={C.ink2}>“{snap.brief}”</p>
          </div>
          <div className="border-t pt-5" style={C.rule}>
            <Kicker>Ground rules · always applied</Kicker>
            <ul className="mt-2 space-y-1 text-[14px]">
              <li className="flex items-center gap-2"><Lock size={13} style={C.ink2} /> Free within 3 months</li>
              <li className="flex items-center gap-2"><Lock size={13} style={C.ink2} /> Any years of experience</li>
            </ul>
          </div>
          <div className="border-t pt-5" style={C.rule}>
            <Kicker>Must have</Kicker>
            <ul className="mt-2 space-y-2.5 text-[15px]">
              {must.map((r) => (
                <li key={r.label}>
                  <div>{r.label}</div>
                  {r.implicit && <div className="text-[12px] leading-5" style={C.ink2}>Inferred: {r.reason}</div>}
                </li>
              ))}
            </ul>
          </div>
          <div className="border-t pt-5" style={C.rule}>
            <Kicker>Nice to have</Kicker>
            <p className="mt-2 text-[14px]" style={C.ink2}>{nice.length ? nice.map((r) => r.label).join(", ") : "Nothing extra was asked."}</p>
          </div>
          <div className="text-[14px] font-medium" style={C.accent}>Adjust the brief →</div>
        </aside>

        <section>
          <h1 className="v-display text-[34px] font-semibold leading-10">{snap.total_shown} people could take this role</h1>
          <p className="mt-2 text-[15px]" style={C.ink2}>
            From {fmt.format(snap.funnel[0].count)} colleagues · {fmt.format(snap.funnel[1].count)} free within 3 months · none of them currently in Data Engineering
          </p>
          <p className="mt-4 text-[15px] leading-6">
            <span className="px-1" style={{ background: "var(--v-mark)" }}>A keyword search for {snap.keyword.terms.join(" + ")} finds nobody.</span> Every person below was found by what they have done, not by the words on their CV.
          </p>

          <ol className="mt-8">
            {snap.candidates.slice(0, 5).map((c, i) => (
              <li key={c.employee_id} className="grid grid-cols-[48px_1fr_150px] gap-4 border-t py-6" style={C.rule}>
                <div className="v-num text-[28px] leading-8" style={C.ink2}>{i + 1}</div>
                <div>
                  <div className="v-display text-[24px] font-medium leading-8">{c.name}</div>
                  <div className="mt-0.5 text-[14px]" style={C.ink2}>{c.position} · {c.location} · {c.years} years</div>
                  <p className="v-display mt-3 text-[18px] italic leading-7">{plainWhy(c)}</p>
                  <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[13px]">
                    {c.requirements.map((r) => <span key={r.label} style={{ color: tone(r.status) }}>{statusGlyph(r.status)} <span style={{ color: "var(--v-ink)" }}>{r.label}</span></span>)}
                  </div>
                  {c.other_team && <div className="mt-3 inline-block px-1 text-[13px]" style={{ background: "var(--v-mark)" }}>Found outside Data Engineering — works as {c.role}</div>}
                </div>
                <div className="text-right">
                  <div><span className="v-num text-[40px] font-semibold leading-10">{c.fit}</span><span className="text-sm" style={C.ink2}> /100</span></div>
                  <div className="text-[13px]" style={C.ink2}>{c.must_covered} of {c.must_total} must-haves</div>
                  <div className="mt-3 text-[13px] font-medium" style={{ color: availColor(c.availability_code) }}>● {c.availability}</div>
                  <div className="mt-4 text-[13px] font-medium" style={C.accent}>Read the case →</div>
                </div>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  );
}

export function Detail() {
  const d = snap.detail;
  const e = d.explanation;
  return (
    <div>
      <TopBar />
      <div className="grid grid-cols-[1fr_300px] gap-14 px-12 py-10">
        <article className="max-w-[760px]">
          <div className="text-[13px]" style={C.ink2}>{snap.role_title} › Shortlist › No. 1</div>
          <div className="mt-6"><Kicker>Candidate no. 1 · Fit {top.fit}/100 · {top.must_covered} of {top.must_total} must-haves</Kicker></div>
          <h1 className="v-display mt-2 text-[46px] font-semibold leading-[52px]">{top.name}</h1>
          <p className="mt-2 text-[17px]" style={C.ink2}>{top.position} in {top.location} · {top.years} years · <span style={{ color: "var(--v-warn)" }}>{top.availability.toLowerCase()}</span></p>

          <div className="mt-8 rounded border p-6" style={{ ...C.rule, background: "var(--v-surface)" }}>
            <Kicker>AI summary · good fit</Kicker>
            <p className="v-display mt-3 text-[20px] leading-8"><Footnoted text={e.summary} /></p>
            <p className="mt-4 text-[12px]" style={C.ink2}>Each sentence is checked against the numbered sources; {e.removed ? `${e.removed} unsupported statement${e.removed > 1 ? "s were" : " was"} removed.` : "nothing unsupported was found."}</p>
          </div>

          <h3 className="v-display mt-10 text-[22px] font-semibold">The requirements</h3>
          <table className="mt-3 w-full text-left text-[14px]">
            <tbody>
              {d.requirements.map((r) => (
                <tr key={r.label} className="border-t align-top" style={C.rule}>
                  <td className="w-[34%] py-3 pr-4 font-medium">{r.label}<div className="text-[11px] font-semibold uppercase tracking-wider" style={C.ink2}>{r.importance}</div></td>
                  <td className="w-[18%] py-3 pr-4" style={{ color: tone(r.status) }}>{statusGlyph(r.status)} {statusWord(r.status)}</td>
                  <td className="py-3 leading-6" style={C.ink2}>{r.lines.slice(0, 2).map((l) => <div key={l}>{l}</div>)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h3 className="v-display mt-10 text-[22px] font-semibold">Check in the interview</h3>
          <ol className="mt-3 list-decimal space-y-3 pl-5 text-[15px] leading-7">{e.verify.map((v) => <li key={v}><Footnoted text={v} /></li>)}</ol>

          <h3 className="v-display mt-10 text-[22px] font-semibold">Risks</h3>
          <ul className="mt-3 space-y-2 text-[15px]">{d.risks.map((r) => <li key={r} style={{ color: "var(--v-warn)" }}>— <span style={{ color: "var(--v-ink)" }}>{r}</span></li>)}</ul>
        </article>

        <aside className="border-l pl-8" style={C.rule}>
          <Kicker>Sources</Kicker>
          <ol className="mt-3 space-y-3 text-[13px] leading-5">
            {sources.map((id, i) => (
              <li key={id} className="grid grid-cols-[18px_1fr] gap-1">
                <span className="font-semibold" style={C.accent}>{i + 1}</span>
                <span>{evidence(id)?.text}</span>
              </li>
            ))}
          </ol>
          <div className="mt-8 border-t pt-5 text-[13px] leading-6" style={{ ...C.rule, ...C.ink2 }}>
            Profile, skills and projects come from the employee record. The fit score is computed in code; only the summary is written by AI.
          </div>
        </aside>
      </div>
    </div>
  );
}
