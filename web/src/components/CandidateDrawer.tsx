import { AlertTriangle, Eye, ShieldCheck, Sparkles, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Candidate, Evidence, Explanation } from "../types";
import { hiddenReasons } from "./RoleView";
import { availabilityTone, CitedText, cx, FitScore, Pill, SectionTitle, Spinner, StatusIcon, statusWord } from "./ui";

const VERDICT: Record<string, { label: string; tone: "good" | "accent" | "warn" | "bad" }> = {
  strong: { label: "Strong fit", tone: "good" },
  good: { label: "Good fit", tone: "accent" },
  partial: { label: "Partial fit", tone: "warn" },
  weak: { label: "Weak fit", tone: "bad" },
};

export function AiSummary({ exp, onCite, compact }: { exp: Explanation | "loading" | undefined; onCite?: (id: string) => void; compact?: boolean }) {
  if (exp === undefined) return null;
  if (exp === "loading") {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs text-muted"><Spinner className="size-3 text-accent" /> AI is reading the evidence…</div>
        <div className="shimmer h-3 w-full rounded" /><div className="shimmer h-3 w-4/5 rounded" />
      </div>
    );
  }
  if (!exp.ok) return <p className="text-sm text-muted">{exp.error}</p>;
  return (
    <div className="space-y-2.5 text-sm leading-relaxed">
      <p><CitedText text={exp.summary ?? ""} onCite={onCite} /></p>
      {!compact && exp.verify && exp.verify.length > 0 && (
        <div>
          <div className="mb-1 text-xs font-semibold text-muted">Check in the interview</div>
          <ul className="list-disc space-y-1 pl-5 text-ink/90">
            {exp.verify.map((v, i) => <li key={i}><CitedText text={v} onCite={onCite} /></li>)}
          </ul>
        </div>
      )}
      {!compact && (
        <p className="flex items-center gap-1.5 text-[11px] text-faint">
          <ShieldCheck size={12} /> Every sentence is checked against the cited evidence
          {exp.removed_claims ? ` · ${exp.removed_claims} unsupported statement${exp.removed_claims > 1 ? "s" : ""} removed` : ""}
        </p>
      )}
    </div>
  );
}

function EvidenceList({ items, highlight, refs }: { items: Evidence[]; highlight: string | null; refs: React.MutableRefObject<Record<string, HTMLElement | null>> }) {
  const groups: [string, Evidence["type"][]][] = [
    ["Skills", ["skill"]], ["Projects", ["project"]], ["Jobs", ["job"]], ["Certifications", ["cert"]], ["Languages", ["language"]], ["Profile", ["fact"]],
  ];
  return (
    <div className="space-y-4">
      {groups.map(([title, types]) => {
        const g = items.filter((e) => types.includes(e.type));
        if (!g.length) return null;
        return (
          <div key={title}>
            <div className="mb-1 text-xs font-semibold text-muted">{title}</div>
            <ul className="space-y-0.5">
              {g.map((e) => (
                <li
                  key={e.id}
                  ref={(el) => { refs.current[e.id] = el; }}
                  className={cx("flex gap-2 rounded-md px-1.5 py-1 text-sm transition-colors", highlight === e.id && "bg-accent-soft")}
                >
                  <span className="w-7 shrink-0 text-[11px] font-semibold leading-5 text-accent">{e.id}</span>
                  <span className="min-w-0 flex-1 text-ink/90">
                    {e.type === "skill" ? (
                      <span className="flex flex-wrap items-center gap-x-2">
                        <span className="font-medium">{e.name}</span>
                        <span className="inline-flex gap-0.5" title={`Self-rated level ${e.level}/5`}>
                          {[1, 2, 3, 4, 5].map((n) => <span key={n} className={cx("h-1.5 w-3 rounded-full", n <= Number(e.level) ? "bg-accent" : "bg-black/10")} />)}
                        </span>
                        <span className="text-xs text-muted">{e.years} yrs · {e.used_in?.length ? `used in ${e.used_in.join(", ")}` : "not used in a recorded project"}</span>
                      </span>
                    ) : e.text}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

export function CandidateDrawer({ c, roleTitle, exp, onClose }: {
  c: Candidate; roleTitle: string; exp: Explanation | "loading" | undefined; onClose: () => void;
}) {
  const [highlight, setHighlight] = useState<string | null>(null);
  const refs = useRef<Record<string, HTMLElement | null>>({});
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  useEffect(() => { panel.current?.scrollTo({ top: 0 }); setHighlight(null); }, [c.employee_id]);

  const cite = (id: string) => {
    setHighlight(id);
    refs.current[id]?.scrollIntoView({ behavior: "smooth", block: "center" });
  };
  const hidden = hiddenReasons(c);
  const reqs = [...c.requirements].sort((a, b) => (a.importance === b.importance ? 0 : a.importance === "must" ? -1 : 1));

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/20" onClick={onClose}>
      <div ref={panel} onClick={(e) => e.stopPropagation()} className="slide-in h-full w-full max-w-xl overflow-y-auto bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-line bg-white/95 px-5 py-4 backdrop-blur">
          <div className="min-w-0">
            <div className="text-xs text-faint">Candidate for {roleTitle}</div>
            <h2 className="truncate text-lg font-semibold">{c.name}</h2>
            <div className="text-sm text-muted">{c.position} · {c.years} yrs · {c.location}</div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Pill tone={availabilityTone(c.availability_code)}>{c.availability}</Pill>
              <Pill>{c.area}</Pill>
              <Pill>Main sector: {c.sector}</Pill>
              {hidden.length > 0 && <Pill tone="accent" title={hidden.join("\n")}><Eye size={11} /> Hidden match</Pill>}
            </div>
          </div>
          <div className="flex items-start gap-3">
            <FitScore fit={c.fit} size="lg" />
            <button onClick={onClose} className="rounded-md p-1 text-faint hover:bg-black/5 hover:text-ink" title="Close (Esc)"><X size={18} /></button>
          </div>
        </div>

        <div className="space-y-6 px-5 py-5">
          <section className="rounded-xl bg-canvas p-4">
            <SectionTitle right={exp && exp !== "loading" && exp.ok && exp.verdict ? <Pill tone={VERDICT[exp.verdict].tone}>{VERDICT[exp.verdict].label}</Pill> : null}>
              <span className="inline-flex items-center gap-1"><Sparkles size={12} className="text-accent" /> Why this person</span>
            </SectionTitle>
            <AiSummary exp={exp} onCite={cite} />
          </section>

          {hidden.length > 0 && (
            <section>
              <SectionTitle>Found outside the obvious places</SectionTitle>
              <ul className="space-y-1 text-sm text-ink/90">{hidden.map((h, i) => <li key={i}>• {h}</li>)}</ul>
            </section>
          )}

          <section>
            <SectionTitle right={<span className="text-xs text-faint">{c.must_covered}/{c.must_total} must-haves shown</span>}>Requirements</SectionTitle>
            <ul className="divide-y divide-line rounded-xl border border-line">
              {reqs.map((r) => (
                <li key={r.id} className="flex gap-3 px-3 py-2.5">
                  <StatusIcon status={r.status} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="font-medium">{r.label}</span>
                      <span className={cx("text-[11px] font-medium uppercase", r.importance === "must" ? "text-ink/60" : "text-faint")}>{r.importance === "must" ? "must" : "nice"}</span>
                      <span className="text-xs text-faint">{statusWord(r.status)}</span>
                    </div>
                    <ul className="mt-0.5 text-xs text-muted">
                      {r.lines.map((l, i) => <li key={i}>{l}</li>)}
                    </ul>
                    {r.evidence.length > 0 && <div className="mt-1">{r.evidence.slice(0, 6).map((id) => <button key={id} onClick={() => cite(id)} className="mr-1 rounded bg-accent-soft px-1 text-[10px] font-semibold text-accent hover:bg-accent hover:text-white">{id}</button>)}</div>}
                  </div>
                </li>
              ))}
              {c.seniority_check && (
                <li className="flex gap-3 px-3 py-2.5">
                  <StatusIcon status={c.seniority_check.status} />
                  <div className="text-sm"><span className="font-medium">Seniority</span> <span className="text-xs text-muted">— {c.seniority_check.actual}, asked {c.seniority_check.required}{c.seniority_check.mode === "min" ? " or above" : " (target)"}</span></div>
                </li>
              )}
            </ul>
          </section>

          {c.risks.length > 0 && (
            <section>
              <SectionTitle>Risks</SectionTitle>
              <ul className="space-y-1.5">
                {c.risks.map((r, i) => (
                  <li key={i} className="flex gap-2 rounded-lg bg-warn-soft px-3 py-2 text-sm text-warn">
                    <AlertTriangle size={15} className="mt-0.5 shrink-0" />
                    <span className="flex-1">{r.text}</span>
                    {r.evidence.map((id) => <button key={id} onClick={() => cite(id)} className="h-fit rounded bg-white/70 px-1 text-[10px] font-semibold">{id}</button>)}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section>
            <SectionTitle>Profile evidence</SectionTitle>
            <EvidenceList items={c.evidence} highlight={highlight} refs={refs} />
            {(c.education.length > 0 || c.soft_skills.length > 0) && (
              <div className="mt-4 space-y-1 text-sm text-muted">
                {c.education.map((e, i) => <div key={i}>🎓 {e}</div>)}
                {c.soft_skills.length > 0 && <div>Self-declared soft skills: {c.soft_skills.join(", ")}</div>}
                {c.methodologies.length > 0 && <div>Methodologies: {c.methodologies.join(", ")}</div>}
              </div>
            )}
          </section>
          <p className="pb-4 text-[11px] text-faint">Synthetic profile from the NTT DATA case dataset. Fit and coverage are computed in code from the fields above; the summary is AI-written and limited to cited evidence.</p>
        </div>
      </div>
    </div>
  );
}
