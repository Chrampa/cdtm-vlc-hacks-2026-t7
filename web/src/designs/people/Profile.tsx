import { ArrowLeft, Check, ChevronDown, CircleAlert, MapPin, ShieldCheck, Sparkles } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { citedOnce, hiddenReasons, shortLine } from "../../core/helpers";
import type { Candidate, Explanation } from "../../types";
import { AvailDot, Avatar, Btn, Card, FitMeter, GemTag, StatusIcon, ink2, ink3, line } from "./ui";

const VERDICT: Record<string, string> = { strong: "Strong match", good: "Good match", partial: "Partial match", weak: "Weak match" };

/** The first n sentences of an AI summary (citations stay with their sentence). */
function firstSentences(text: string, n: number): string {
  const re = /[.!?](?=\s+[A-Z"“(]|\s*$)/g;
  let m: RegExpExecArray | null;
  let count = 0;
  while ((m = re.exec(text))) {
    if (++count === n) return text.slice(0, m.index + 1);
  }
  return text;
}

export interface ProfileAction {
  label: string;
  done?: boolean;
  onClick?: () => void;
}

export function Profile({ c, roleTitle, exp, onClose, action }: { c: Candidate; roleTitle: string; exp: Explanation | "loading" | undefined; onClose: () => void; action?: ProfileAction }) {
  const [hl, setHl] = useState<string[]>([]);
  const [cvOpen, setCvOpen] = useState(false);
  const [more, setMore] = useState(false);
  const refs = useRef<Record<string, HTMLElement | null>>({});
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [onClose]);
  useEffect(() => { panel.current?.scrollTo({ top: 0 }); setHl([]); setCvOpen(false); setMore(false); }, [c.employee_id]);

  const show = (ids: string[]) => {
    setHl(ids);
    setCvOpen(true);
    window.setTimeout(() => refs.current[ids[0]]?.scrollIntoView({ behavior: "smooth", block: "center" }), 60);
  };
  const reg = (id: string) => (el: HTMLElement | null) => { refs.current[id] = el; };
  const hlStyle = (id: string) => (hl.includes(id) ? { background: "var(--v-gold-soft)", boxShadow: "0 0 0 2px var(--v-gold)" } : undefined);

  const reqs = [...c.requirements].sort((a, b) => (a.importance === b.importance ? 0 : a.importance === "must" ? -1 : 1));
  const jobs = c.evidence.filter((e) => e.type === "job");
  const projects = c.evidence.filter((e) => e.type === "project");
  const skills = c.evidence.filter((e) => e.type === "skill");
  const certs = c.evidence.filter((e) => e.type === "cert");
  const langs = c.evidence.filter((e) => e.type === "language");
  const hidden = hiddenReasons(c);
  const gap = c.must_covered < c.must_total;

  // Each group of adjacent citations becomes one small numbered marker that highlights its sources in the CV.
  let group = 0;
  const renderCited = (text: string) => {
    const parts = citedOnce(text);
    const out: ReactNode[] = [];
    let ids: string[] = [];
    const flush = (key: string) => {
      if (!ids.length) return;
      const these = ids;
      ids = [];
      const n = ++group;
      out.push(
        <button key={key} onClick={() => show(these)} title="Show in the CV" className="mx-[2px] inline-grid size-[18px] place-items-center rounded-[3px] align-[2px] text-[10px] font-bold hover:brightness-95" style={{ background: "var(--v-gold-soft)", color: "var(--v-gold)" }}>
          {n}
        </button>,
      );
    };
    parts.forEach((p, i) => {
      if ("id" in p) { ids.push(p.id); return; }
      if (!p.t.trim() && ids.length) return;
      flush(`g${i}`);
      out.push(<span key={i}>{p.t.replace(/\s+([.,;])/g, "$1")}</span>);
    });
    flush("gend");
    return out;
  };

  return (
    <div className="v-people fixed inset-0 z-50 flex justify-end bg-black/25" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="slide-in flex h-[100dvh] w-full max-w-3xl flex-col" style={{ background: "var(--v-bg)", color: "var(--v-ink)", fontFamily: "var(--v-body)" }}>
        <div className="flex items-center justify-between gap-2 border-b bg-white px-3 py-2.5 sm:px-5" style={line}>
          <button onClick={onClose} className="inline-flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-2 text-[14px] font-semibold" style={{ color: "var(--v-accent)" }}>
            <ArrowLeft size={16} /> Back
          </button>
          <span className="min-w-0 truncate text-right text-[13px]" style={ink2}>Candidate for {roleTitle}</span>
        </div>

        <div ref={panel} className="min-h-0 flex-1 overflow-y-auto">
          <div className="space-y-4 p-4 sm:p-6">
            {/* Who + verdict */}
            <Card className="p-5">
              <div className="flex items-start gap-4">
                <Avatar c={c} size={64} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-[21px] font-bold leading-7">{c.name}</h2>
                    <GemTag c={c} />
                  </div>
                  <p className="text-[14px]" style={ink2}>{c.position} · {c.seniority} · {c.years} yrs</p>
                  <p className="mt-0.5 inline-flex items-center gap-1 text-[13px]" style={ink2}><MapPin size={13} /> {c.location}</p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3 border-t pt-4" style={line}>
                <FitMeter fit={c.fit} gap={gap} large />
                <AvailDot code={c.availability_code} />
                <span className="text-[13px] font-semibold" style={{ color: gap ? "var(--v-warn)" : "var(--v-good)" }}>
                  {c.must_covered} of {c.must_total} must-haves
                </span>
              </div>
              {hidden.length > 0 && (
                <div className="mt-4 rounded-md px-4 py-3 text-[13px] leading-5" style={{ background: "var(--v-gold-soft)" }}>
                  <div className="flex items-center gap-1.5 font-bold" style={{ color: "var(--v-gold)" }}><Sparkles size={14} /> Found outside the obvious places</div>
                  <ul className="mt-1 space-y-0.5">{hidden.map((h) => <li key={h}>{h}</li>)}</ul>
                </div>
              )}
            </Card>

            {/* Requirement checklist */}
            <Card className="p-5">
              <div className="text-[15px] font-bold">What we asked for</div>
              <ul className="mt-3 divide-y" style={line}>
                {reqs.map((r) => (
                  <li key={r.id} className="flex items-start gap-3 py-2.5" style={line}>
                    <StatusIcon s={r.status} />
                    <div className="min-w-0 flex-1">
                      <div className="text-[14px] font-semibold">
                        {r.label}
                        {r.importance === "nice" && <span className="ml-1.5 text-[11px] font-bold uppercase" style={ink3}>nice to have</span>}
                      </div>
                      <div className="text-[13px]" style={ink2}>
                        {r.status === "missing" ? "Not shown in the profile" : r.status === "unknown" ? "Can’t be checked from the profile" : r.lines[0] ? shortLine(r.lines[0]) : ""}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
              {c.risks.length > 0 && (
                <div className="mt-3 space-y-1.5 rounded-md px-4 py-3" style={{ background: "var(--v-warn-soft)" }}>
                  {c.risks.map((r) => (
                    <p key={r.text} className="flex items-start gap-1.5 text-[13px] font-medium" style={{ color: "var(--v-warn)" }}><CircleAlert size={14} className="mt-0.5 shrink-0" /> {r.text}</p>
                  ))}
                </div>
              )}
            </Card>

            {/* AI summary */}
            <Card className="p-5">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-2 text-[15px] font-bold"><Sparkles size={15} style={{ color: "var(--v-accent)" }} /> In short</span>
                {exp && exp !== "loading" && exp.ok && exp.verdict && <span className="text-[13px] font-bold" style={ink2}>{VERDICT[exp.verdict]}</span>}
              </div>
              {(!exp || exp === "loading") && (
                <div className="mt-3 space-y-2"><div className="shimmer h-4 rounded-[2px]" /><div className="shimmer h-4 w-4/5 rounded-[2px]" /></div>
              )}
              {exp && exp !== "loading" && !exp.ok && <p className="mt-2 text-[14px]" style={ink2}>{exp.error}</p>}
              {exp && exp !== "loading" && exp.ok && (
                <>
                  <p className="mt-2 text-[15px] leading-7">
                    {renderCited(more ? exp.summary ?? "" : firstSentences(exp.summary ?? "", 1))}
                    {firstSentences(exp.summary ?? "", 1).length < (exp.summary ?? "").length && (
                      <button onClick={() => setMore((v) => !v)} className="ml-1.5 text-[13px] font-semibold hover:underline" style={{ color: "var(--v-accent)" }}>{more ? "Less" : "More"}</button>
                    )}
                  </p>
                  {!!exp.verify?.length && (
                    <div className="mt-4 border-t pt-3" style={line}>
                      <div className="text-[13px] font-bold">Ask in the interview</div>
                      <ul className="mt-1.5 list-disc space-y-1 pl-5 text-[14px] leading-6">
                        {exp.verify.map((v) => <li key={v}>{renderCited(v)}</li>)}
                      </ul>
                    </div>
                  )}
                  <p className="mt-3 flex items-start gap-1.5 text-[12px]" style={ink3}>
                    <ShieldCheck size={13} className="mt-0.5 shrink-0" /> Written by AI and checked against the profile{exp.removed_claims ? ` (${exp.removed_claims} unsupported statement${exp.removed_claims > 1 ? "s" : ""} removed)` : ""}. Numbers point to the CV.
                  </p>
                </>
              )}
            </Card>

            {/* Full CV, folded */}
            <Card>
              <button onClick={() => setCvOpen((v) => !v)} className="flex w-full items-center justify-between px-5 py-4 text-left text-[15px] font-bold">
                Full CV
                <ChevronDown size={18} className="transition-transform" style={{ ...ink2, transform: cvOpen ? "rotate(180deg)" : undefined }} />
              </button>
              {cvOpen && (
                <div className="space-y-5 border-t px-5 pb-5 pt-4 fade-in" style={line}>
                  <div>
                    <div className="text-[13px] font-bold" style={ink2}>Skills</div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {skills.map((s) => (
                        <span key={s.id} ref={reg(s.id)} className="inline-flex items-center gap-2 rounded-md border bg-white px-3 py-1 text-[13px]" style={{ ...line, ...hlStyle(s.id) }} title={`${s.years} years · level ${s.level}/5`}>
                          <b>{s.name}</b>
                          <span className="inline-flex gap-0.5">{[1, 2, 3, 4, 5].map((n) => <span key={n} className="size-1.5 rounded-full" style={{ background: n <= Number(s.level) ? "var(--v-ink)" : "var(--v-line)" }} />)}</span>
                          <span style={ink3}>{s.years}y</span>
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                      <div className="text-[13px] font-bold" style={ink2}>Languages</div>
                      <div className="mt-1.5 space-y-0.5 text-[14px]">{langs.map((l) => <div key={l.id} ref={reg(l.id)} className="rounded px-1" style={hlStyle(l.id)}>{l.text}</div>)}</div>
                    </div>
                    {certs.length > 0 && (
                      <div>
                        <div className="text-[13px] font-bold" style={ink2}>Certificates</div>
                        <div className="mt-1.5 space-y-0.5 text-[14px]">{certs.map((x) => <div key={x.id} ref={reg(x.id)} className="rounded px-1" style={hlStyle(x.id)}>{x.text}</div>)}</div>
                      </div>
                    )}
                  </div>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                      <div className="text-[13px] font-bold" style={ink2}>Career</div>
                      <ol className="relative mt-2 space-y-3 border-l-2 pl-5" style={line}>
                        {jobs.map((j, i) => (
                          <li key={j.id} ref={reg(j.id)} className="relative rounded-md px-1" style={hlStyle(j.id)}>
                            <span className="absolute -left-[27px] top-1.5 size-2.5 rounded-full border-2 bg-white" style={{ borderColor: i === 0 ? "var(--v-ink)" : "var(--v-line)" }} />
                            <div className="text-[14px] font-semibold">{j.text.replace(/\s*\([^()]*\)$/, "")}</div>
                            <div className="text-[12px]" style={ink3}>{j.text.match(/\(([^()]*)\)$/)?.[1]}</div>
                          </li>
                        ))}
                      </ol>
                    </div>
                    <div>
                      <div className="text-[13px] font-bold" style={ink2}>Projects</div>
                      <ul className="mt-2 space-y-2.5">
                        {projects.map((p) => (
                          <li key={p.id} ref={reg(p.id)} className="rounded-md px-1 text-[14px]" style={hlStyle(p.id)}>
                            <div className="font-semibold">{p.text.split(" — ")[0]}</div>
                            <div className="text-[12px]" style={ink3}>{p.text.split(" — ")[1]}</div>
                          </li>
                        ))}
                      </ul>
                      {c.education.length > 0 && <div className="mt-4 text-[12px]" style={ink3}>{c.education.map((e) => <div key={e}>{e}</div>)}</div>}
                    </div>
                  </div>
                </div>
              )}
            </Card>
            <p className="pb-2 text-[12px]" style={ink3}>Synthetic profile from the NTT DATA case dataset. Match and checklist are computed from the profile; only “In short” is written by AI.</p>
          </div>
        </div>

        {action && (
          <div className="flex items-center justify-between gap-3 border-t bg-white px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6" style={line}>
            <span className="min-w-0 truncate text-[13px]" style={ink2}>{c.name.split(" ")[0]} · {roleTitle}</span>
            {action.done ? (
              <span className="inline-flex items-center gap-1.5 text-[14px] font-bold" style={{ color: "var(--v-good)" }}><Check size={16} strokeWidth={3} /> {action.label}</span>
            ) : (
              <Btn variant="primary" onClick={() => { action.onClick?.(); onClose(); }}>{action.label}</Btn>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
