import { ArrowLeft, Check, CircleAlert, MapPin, ShieldCheck, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { citedOnce, evLabel, hiddenReasons } from "../../core/helpers";
import type { Candidate, Explanation } from "../../types";
import { Availability, Avatar } from "./PeopleApp";

const ink2 = { color: "var(--v-ink2)" };
const line = { borderColor: "var(--v-line)" };
const VERDICT: Record<string, string> = { strong: "Strong match", good: "Good match", partial: "Partial match", weak: "Weak match" };

export function Profile({ c, roleTitle, exp, onClose }: { c: Candidate; roleTitle: string; exp: Explanation | "loading" | undefined; onClose: () => void }) {
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

  const show = (id: string) => { setHl(id); refs.current[id]?.scrollIntoView({ behavior: "smooth", block: "center" }); };
  const reg = (id: string) => (el: HTMLElement | null) => { refs.current[id] = el; };
  const hlStyle = (id: string) => (hl === id ? { background: "var(--v-sun-soft)", boxShadow: "0 0 0 2px var(--v-sun)" } : undefined);

  const fits = c.requirements.filter((r) => r.status === "covered");
  const check = c.requirements.filter((r) => r.status === "partial" || r.status === "missing");
  const jobs = c.evidence.filter((e) => e.type === "job");
  const projects = c.evidence.filter((e) => e.type === "project");
  const skills = c.evidence.filter((e) => e.type === "skill");
  const certs = c.evidence.filter((e) => e.type === "cert");
  const langs = c.evidence.filter((e) => e.type === "language");
  const hidden = hiddenReasons(c);

  return (
    <div className="v-people fixed inset-0 z-50 flex justify-end bg-black/25" onClick={onClose}>
      <div ref={panel} onClick={(e) => e.stopPropagation()} className="slide-in h-full w-full max-w-5xl overflow-y-auto" style={{ background: "var(--v-bg)", color: "var(--v-ink)", fontFamily: "var(--v-body)" }}>
        <div className="sticky top-0 z-10 flex items-center justify-between border-b px-6 py-3 backdrop-blur" style={{ ...line, background: "rgba(246,243,238,.94)" }}>
          <button onClick={onClose} className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-[14px] font-semibold" style={{ color: "var(--v-accent)" }}><ArrowLeft size={16} /> Back to the list</button>
          <span className="text-[13px]" style={ink2}>Candidate for {roleTitle}</span>
        </div>

        <div className="grid gap-6 p-6 md:grid-cols-[300px_1fr]">
          <aside className="space-y-4">
            <div className="rounded-[var(--v-radius)] border bg-white p-6 text-center" style={line}>
              <div className="flex justify-center"><Avatar c={c} size={96} /></div>
              <h2 className="mt-4 text-[22px] font-bold leading-7">{c.name}</h2>
              <p className="mt-1 text-[15px]" style={ink2}>{c.position}</p>
              <p className="mt-1 inline-flex items-center gap-1 text-[14px]" style={ink2}><MapPin size={13} /> {c.location}</p>
              <div className="mt-4"><Availability code={c.availability_code} /></div>
              <div className="mt-5 rounded-2xl py-3" style={{ background: "var(--v-accent-soft)" }}>
                <div className="text-[28px] font-bold leading-8" style={{ color: "var(--v-accent)" }}>{c.fit}%</div>
                <div className="text-[13px] font-semibold" style={ink2}>match · {c.must_covered} of {c.must_total} must-haves</div>
              </div>
            </div>
            <div className="rounded-[var(--v-radius)] border bg-white p-5 text-[14px]" style={line}>
              <div className="grid grid-cols-[110px_1fr] gap-y-2.5">
                <span style={ink2}>Experience</span><b>{c.years} years</b>
                <span style={ink2}>Level</span><b>{c.seniority}</b>
                <span style={ink2}>Team</span><b>{c.area}</b>
                <span style={ink2}>Main sector</span><b>{c.sector}</b>
                <span style={ink2}>Languages</span><span className="font-semibold">{langs.map((l) => <span key={l.id} ref={reg(l.id)} className="block rounded" style={hlStyle(l.id)}>{l.text}</span>)}</span>
              </div>
            </div>
            {hidden.length > 0 && (
              <div className="rounded-[var(--v-radius)] p-5 text-[14px]" style={{ background: "var(--v-sun-soft)" }}>
                <div className="flex items-center gap-1.5 font-bold" style={{ color: "#7A5A0B" }}><Sparkles size={15} /> Found outside the obvious places</div>
                <ul className="mt-2 space-y-1.5 leading-5">{hidden.map((h) => <li key={h}>{h}</li>)}</ul>
              </div>
            )}
          </aside>

          <section className="min-w-0 space-y-5">
            <div className="rounded-[var(--v-radius)] border bg-white p-6" style={line}>
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-2 text-[14px] font-bold" style={{ color: "var(--v-accent)" }}><Sparkles size={15} /> In short</span>
                {exp && exp !== "loading" && exp.ok && exp.verdict && <span className="rounded-full px-3 py-1 text-[13px] font-bold" style={{ background: "var(--v-accent-soft)", color: "var(--v-accent)" }}>{VERDICT[exp.verdict]}</span>}
              </div>
              {(!exp || exp === "loading") && (
                <div className="mt-3 space-y-2"><div className="shimmer h-4 rounded-full" /><div className="shimmer h-4 w-4/5 rounded-full" /><div className="text-[13px]" style={ink2}>Reading the profile…</div></div>
              )}
              {exp && exp !== "loading" && !exp.ok && <p className="mt-2 text-[15px]" style={ink2}>{exp.error}</p>}
              {exp && exp !== "loading" && exp.ok && (
                <>
                  <p className="mt-3 text-[17px] leading-8">
                    {citedOnce(exp.summary ?? "").map((p, i) => ("t" in p ? <span key={i}>{p.t}</span> : (
                      <button key={i} onClick={() => show(p.id)} className="mx-0.5 rounded-md px-1.5 py-0.5 align-[1px] text-[12px] font-bold hover:brightness-95" style={{ background: "var(--v-accent-soft)", color: "var(--v-accent)" }}>{evLabel(c.evidence, p.id)}</button>
                    )))}
                  </p>
                  <p className="mt-3 flex items-center gap-1.5 text-[12px]" style={ink2}>
                    <ShieldCheck size={13} /> Written by AI from this profile. Each sentence is checked against the highlighted sources{exp.removed_claims ? ` (${exp.removed_claims} unsupported statement${exp.removed_claims > 1 ? "s" : ""} removed)` : ""}.
                  </p>
                </>
              )}
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              <div className="rounded-[var(--v-radius)] p-5" style={{ background: "var(--v-good-soft)" }}>
                <div className="flex items-center gap-2 text-[15px] font-bold" style={{ color: "var(--v-good)" }}><Check size={17} /> What fits</div>
                <ul className="mt-3 space-y-3 text-[14px]">
                  {fits.length === 0 && <li style={ink2}>No requirement is fully shown.</li>}
                  {fits.map((r) => <li key={r.id}><b>{r.label}</b>{r.importance === "nice" && <span style={ink2}> · nice-to-have</span>}<div className="leading-5" style={ink2}>{r.lines[0]}</div></li>)}
                </ul>
              </div>
              <div className="rounded-[var(--v-radius)] p-5" style={{ background: "var(--v-warn-soft)" }}>
                <div className="flex items-center gap-2 text-[15px] font-bold" style={{ color: "var(--v-warn)" }}><CircleAlert size={17} /> What to check</div>
                <ul className="mt-3 space-y-3 text-[14px]">
                  {check.map((r) => <li key={r.id}><b>{r.label}</b> — {r.status === "partial" ? "only partly shown" : "not shown"}{r.importance === "nice" && " (nice-to-have)"}<div className="leading-5" style={ink2}>{r.lines[0]}</div></li>)}
                  {c.risks.map((r) => <li key={r.text}>{r.text}</li>)}
                  {check.length === 0 && c.risks.length === 0 && <li style={ink2}>Nothing stands out.</li>}
                </ul>
              </div>
            </div>

            {exp && exp !== "loading" && exp.ok && !!exp.verify?.length && (
              <div className="rounded-[var(--v-radius)] border bg-white p-5" style={line}>
                <div className="text-[15px] font-bold">Ask in the interview</div>
                <ul className="mt-2 list-disc space-y-2 pl-5 text-[15px] leading-6">
                  {exp.verify.map((v) => <li key={v}>{citedOnce(v).map((p, i) => ("t" in p ? <span key={i}>{p.t}</span> : <button key={i} onClick={() => show(p.id)} className="mx-0.5 rounded-md px-1.5 text-[12px] font-bold" style={{ background: "var(--v-accent-soft)", color: "var(--v-accent)" }}>{evLabel(c.evidence, p.id)}</button>))}</li>)}
                </ul>
              </div>
            )}

            <div className="rounded-[var(--v-radius)] border bg-white p-6" style={line}>
              <div className="text-[15px] font-bold">Skills</div>
              <div className="mt-3 flex flex-wrap gap-2">
                {skills.map((s) => (
                  <span key={s.id} ref={reg(s.id)} className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[13px] transition-shadow" style={{ ...line, ...hlStyle(s.id) }} title={`${s.years} years · ${s.used_in?.length ? `used in ${s.used_in.length} projects/jobs` : "not used in a recorded project"}`}>
                    <b>{s.name}</b>
                    <span className="inline-flex gap-0.5">{[1, 2, 3, 4, 5].map((n) => <span key={n} className="size-1.5 rounded-full" style={{ background: n <= Number(s.level) ? "var(--v-accent)" : "var(--v-line)" }} />)}</span>
                    <span style={ink2}>{s.years}y</span>
                  </span>
                ))}
              </div>
              {certs.length > 0 && (
                <div className="mt-4 text-[14px]"><b>Certificates</b>{certs.map((x) => <div key={x.id} ref={reg(x.id)} className="rounded" style={{ ...ink2, ...hlStyle(x.id) }}>{x.text}</div>)}</div>
              )}
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              <div className="rounded-[var(--v-radius)] border bg-white p-6" style={line}>
                <div className="text-[15px] font-bold">Career</div>
                <ol className="relative mt-4 space-y-4 border-l-2 pl-6" style={line}>
                  {jobs.map((j, i) => (
                    <li key={j.id} ref={reg(j.id)} className="relative rounded-lg px-1" style={hlStyle(j.id)}>
                      <span className="absolute -left-[31px] top-1 size-3 rounded-full border-2 bg-white" style={{ borderColor: i === 0 ? "var(--v-accent)" : "var(--v-line)" }} />
                      <div className="text-[14px] font-semibold">{j.text.replace(/\s*\([^()]*\)$/, "")}</div>
                      <div className="text-[13px]" style={ink2}>{j.text.match(/\(([^()]*)\)$/)?.[1]}</div>
                    </li>
                  ))}
                </ol>
              </div>
              <div className="rounded-[var(--v-radius)] border bg-white p-6" style={line}>
                <div className="text-[15px] font-bold">Projects</div>
                <ul className="mt-3 space-y-3">
                  {projects.map((p) => (
                    <li key={p.id} ref={reg(p.id)} className="rounded-lg px-1 text-[14px]" style={hlStyle(p.id)}>
                      <div className="font-semibold">{p.text.split(" — ")[0]}</div>
                      <div className="text-[13px]" style={ink2}>{p.text.split(" — ")[1]}</div>
                    </li>
                  ))}
                </ul>
                {c.education.length > 0 && <div className="mt-5 border-t pt-4 text-[13px]" style={{ ...line, ...ink2 }}>{c.education.map((e) => <div key={e}>{e}</div>)}</div>}
              </div>
            </div>
            <p className="pb-6 text-[12px]" style={ink2}>Synthetic profile from the NTT DATA case dataset. Match and coverage are computed from the profile; only “In short” is written by AI.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
