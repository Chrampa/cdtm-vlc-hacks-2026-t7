import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cited, footnoteIds, hiddenReasons, statusWord } from "../../core/helpers";
import type { Candidate, Explanation } from "../../types";
import { Dot } from "./MapApp";

const ink2 = { color: "var(--v-ink2)" };
const line = { borderColor: "var(--v-line)" };
const label = "text-[11px] font-semibold uppercase tracking-[.12em]";

export function Detail({ c, roleTitle, exp, onClose }: { c: Candidate; roleTitle: string; exp: Explanation | "loading" | undefined; onClose: () => void }) {
  const [hl, setHl] = useState<string | null>(null);
  const refs = useRef<Record<string, HTMLElement | null>>({});
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [onClose]);
  useEffect(() => { panel.current?.scrollTo({ top: 0 }); setHl(null); }, [c.employee_id]);

  const ok = exp && exp !== "loading" && exp.ok ? exp : null;
  const notes = ok ? footnoteIds(ok.summary ?? "", ...(ok.verify ?? [])) : [];
  const ev = Object.fromEntries(c.evidence.map((e) => [e.id, e]));
  const show = (id: string) => { setHl(id); refs.current[id]?.scrollIntoView({ behavior: "smooth", block: "center" }); };
  const reg = (id: string) => (el: HTMLElement | null) => { refs.current[id] = el; };
  const rowBg = (id: string) => (hl === id ? { background: "var(--v-accent-soft)" } : undefined);
  const foot = (text: string) => cited(text).map((p, i, all) => ("t" in p ? <span key={i}>{p.t}</span> : (
    <button key={i} onClick={() => show(p.id)} className="v-num ml-px align-super text-[10px] font-semibold" style={{ color: "var(--v-accent-ink)" }}>{i > 0 && "id" in all[i - 1] ? "," : ""}{notes.indexOf(p.id) + 1}</button>
  )));
  const skills = c.evidence.filter((e) => e.type === "skill");
  const history = c.evidence.filter((e) => e.type === "job" || e.type === "project");
  const hidden = hiddenReasons(c);

  return (
    <div className="v-matrix fixed inset-0 z-50 flex justify-end bg-black/30" onClick={onClose}>
      <div ref={panel} onClick={(e) => e.stopPropagation()} className="slide-in h-full w-full max-w-[1180px] overflow-y-auto bg-white" style={{ color: "var(--v-ink)", fontFamily: "var(--v-body)" }}>
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-8 py-3" style={line}>
          <span className={label} style={ink2}>{roleTitle} · candidate</span>
          <button onClick={onClose} className="inline-flex items-center gap-1 text-[13px] font-semibold">Close <X size={15} /></button>
        </div>
        <div className="grid gap-0 px-8 py-8 lg:grid-cols-[260px_1fr_300px]">
          <aside className="pb-8 lg:border-r lg:pr-8" style={line}>
            <h2 className="v-display text-[30px] font-semibold leading-9 tracking-tight">{c.name}</h2>
            <p className="mt-1 text-[14px]" style={ink2}>{c.position}</p>
            <dl className="mt-6 grid grid-cols-[100px_1fr] gap-y-3 border-t pt-4 text-[13px]" style={line}>
              <dt style={ink2}>Fit</dt><dd className="v-num text-[24px] font-medium leading-6">{c.fit}</dd>
              <dt style={ink2}>Must-haves</dt><dd className="v-num">{c.must_covered}/{c.must_total}</dd>
              <dt style={ink2}>Availability</dt><dd className="font-semibold" style={{ color: c.availability_code === 0 ? "var(--v-good)" : "var(--v-warn)" }}>{c.availability}</dd>
              <dt style={ink2}>Experience</dt><dd>{c.years} years · {c.seniority}</dd>
              <dt style={ink2}>Location</dt><dd>{c.location}</dd>
              <dt style={ink2}>Team</dt><dd>{c.area}</dd>
              <dt style={ink2}>Main sector</dt><dd>{c.sector}</dd>
              {c.evidence.filter((e) => e.type === "language").map((l, i) => (
                <div key={l.id} className="contents"><dt style={ink2}>{i === 0 ? "Languages" : ""}</dt><dd ref={reg(l.id)} style={rowBg(l.id)}>{l.text}</dd></div>
              ))}
            </dl>
            {hidden.length > 0 && (
              <div className="mt-6 border-t pt-4 text-[13px] leading-5" style={line}>
                <div className={label} style={{ color: "var(--v-accent-ink)" }}>◤ Found outside the usual team</div>
                <ul className="mt-2 space-y-1">{hidden.map((h) => <li key={h}>{h}</li>)}</ul>
              </div>
            )}
          </aside>

          <section className="min-w-0 pb-8 lg:px-8">
            <div className={label} style={ink2}>Requirement → evidence</div>
            <div className="mt-3 border-l border-t" style={line}>
              {c.requirements.map((r) => (
                <div key={r.id} className="grid grid-cols-[170px_120px_1fr] border-b border-r text-[13px]" style={line}>
                  <div className="border-r p-3 font-medium" style={line}>{r.label}<div className="text-[10px] font-semibold uppercase tracking-[.1em]" style={ink2}>{r.importance}{r.implicit ? " · inferred" : ""}</div></div>
                  <div className="flex items-start gap-2 border-r p-3" style={line}><span className="mt-px"><Dot s={r.status} size={12} /></span>{statusWord(r.status)}</div>
                  <div className="p-3 leading-5" style={ink2}>
                    {r.lines.map((l) => <div key={l}>{l}</div>)}
                    {r.evidence.length > 0 && <div className="mt-1">{r.evidence.slice(0, 5).map((id) => <button key={id} onClick={() => show(id)} className="v-num mr-1.5 text-[11px] underline underline-offset-2" style={{ color: "var(--v-ink)" }}>{id}</button>)}</div>}
                  </div>
                </div>
              ))}
              {c.seniority_check && (
                <div className="grid grid-cols-[170px_120px_1fr] border-b border-r text-[13px]" style={line}>
                  <div className="border-r p-3 font-medium" style={line}>Seniority</div>
                  <div className="flex items-start gap-2 border-r p-3" style={line}><span className="mt-px"><Dot s={c.seniority_check.status} size={12} /></span>{statusWord(c.seniority_check.status)}</div>
                  <div className="p-3" style={ink2}>{c.seniority_check.actual}; asked {c.seniority_check.required}{c.seniority_check.mode === "min" ? " or above" : " (target)"}{c.seniority_check.overqualified ? " · may be overqualified" : ""}</div>
                </div>
              )}
            </div>

            <div className={`${label} mt-8`} style={ink2}>Evidence ledger · skills</div>
            <div className="mt-3 border-l border-t" style={line}>
              {skills.map((s) => (
                <div key={s.id} ref={reg(s.id)} className="grid grid-cols-[40px_170px_100px_70px_1fr] border-b border-r text-[13px] transition-colors" style={{ ...line, ...rowBg(s.id) }}>
                  <div className="v-num border-r p-2.5 text-[11px]" style={{ ...line, ...ink2 }}>{s.id}</div>
                  <div className="border-r p-2.5 font-medium" style={line}>{s.name}</div>
                  <div className="border-r p-2.5 tracking-[.15em]" style={line}>{"●".repeat(Number(s.level))}<span style={{ color: "var(--v-line)" }}>{"●".repeat(5 - Number(s.level))}</span></div>
                  <div className="v-num border-r p-2.5 text-right" style={line}>{s.years}y</div>
                  <div className="p-2.5" style={ink2}>{s.used_in?.length ? `used in ${s.used_in.join(", ")}` : "never used in a recorded project"}</div>
                </div>
              ))}
            </div>

            <div className={`${label} mt-8`} style={ink2}>Projects and jobs</div>
            <div className="mt-3 border-l border-t" style={line}>
              {history.map((h) => (
                <div key={h.id} ref={reg(h.id)} className="grid grid-cols-[40px_1fr] border-b border-r text-[13px] transition-colors" style={{ ...line, ...rowBg(h.id) }}>
                  <div className="v-num border-r p-2.5 text-[11px]" style={{ ...line, ...ink2 }}>{h.id}</div>
                  <div className="p-2.5">{h.text}</div>
                </div>
              ))}
            </div>
            {c.evidence.some((e) => e.type === "cert") && (
              <>
                <div className={`${label} mt-8`} style={ink2}>Certificates</div>
                <ul className="mt-2 text-[13px]">{c.evidence.filter((e) => e.type === "cert").map((x) => <li key={x.id} ref={reg(x.id)} style={rowBg(x.id)}>{x.text}</li>)}</ul>
              </>
            )}
          </section>

          <aside className="border-t pt-6 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0" style={line}>
            <div className={label} style={ink2}>Summary · AI</div>
            {(!exp || exp === "loading") && <div className="mt-3 space-y-2"><div className="shimmer h-3" /><div className="shimmer h-3 w-4/5" /><div className="shimmer h-3 w-3/5" /></div>}
            {exp && exp !== "loading" && !exp.ok && <p className="mt-3 text-[14px]" style={ink2}>{exp.error}</p>}
            {ok && (
              <>
                <p className="mt-3 text-[15px] leading-6">{foot(ok.summary ?? "")}</p>
                {!!ok.verify?.length && (
                  <>
                    <div className={`${label} mt-6`} style={ink2}>Check in interview</div>
                    <ol className="mt-2 list-decimal space-y-2 pl-4 text-[13px] leading-5">{ok.verify.map((v) => <li key={v}>{foot(v)}</li>)}</ol>
                  </>
                )}
                <div className={`${label} mt-6`} style={ink2}>Notes</div>
                <ol className="mt-2 space-y-1.5 text-[12px] leading-4" style={ink2}>
                  {notes.map((id, i) => <li key={id}><button onClick={() => show(id)} className="text-left"><span className="v-num font-semibold" style={{ color: "var(--v-accent-ink)" }}>{i + 1}</span> {ev[id]?.text ?? id}</button></li>)}
                </ol>
                <p className="mt-4 text-[11px] leading-4" style={ink2}>Every sentence is checked against these notes{ok.removed_claims ? `; ${ok.removed_claims} unsupported statement${ok.removed_claims > 1 ? "s were" : " was"} removed` : ""}.</p>
              </>
            )}
            <div className={`${label} mt-6`} style={ink2}>Risks</div>
            <ul className="mt-2 space-y-1.5 text-[13px]">{c.risks.length ? c.risks.map((r) => <li key={r.text} className="flex gap-2"><span style={{ color: "var(--v-warn)" }}>▲</span>{r.text}</li>) : <li style={ink2}>None flagged</li>}</ul>
          </aside>
        </div>
      </div>
    </div>
  );
}
