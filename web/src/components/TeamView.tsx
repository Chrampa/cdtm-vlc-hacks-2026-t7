import { ArrowRight, ShieldCheck, Sparkles } from "lucide-react";
import type { Candidate, SearchResponse, TeamReview } from "../types";
import { availabilityTone, FitScore, Pill, SectionTitle, Spinner, StatusIcon } from "./ui";

export function TeamView({ result, review, onOpen, onRole }: {
  result: SearchResponse; review: TeamReview | "loading" | undefined; onOpen: (c: Candidate, roleId: string) => void; onRole: (roleId: string) => void;
}) {
  const t = result.team;
  const unfilled = result.roles.filter((r) => r.candidates.filter((c) => c.proposed).length < r.count);
  return (
    <div className="fade-in space-y-4">
      {t && (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border border-line bg-white px-4 py-3 text-sm">
          <div><span className="text-2xl font-semibold tabular-nums">{t.filled}</span><span className="text-muted"> of {t.slots} places filled</span></div>
          <div><span className="text-2xl font-semibold tabular-nums">{t.avg_fit}%</span><span className="text-muted"> average fit</span></div>
          <div className="flex items-center gap-1.5 text-muted"><ShieldCheck size={15} className="text-good" /> Nobody is in two roles · availability respected</div>
          {t.gain_vs_greedy > 0.4 && (
            <div className="text-muted" title="Compared with filling roles one by one, always taking the best remaining person">
              Optimised as a whole: <b className="text-ink">+{t.gain_vs_greedy} pts</b> per person vs. role-by-role picking
            </div>
          )}
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        {result.roles.map((r) => {
          const proposed = r.candidates.filter((c) => c.proposed);
          return (
            <div key={r.id} className="rounded-xl border border-line bg-white p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="font-semibold">{r.title}{r.count > 1 && <span className="text-muted"> ×{r.count}</span>}</div>
                <button onClick={() => onRole(r.id)} className="inline-flex items-center gap-1 text-xs text-accent hover:underline">
                  {Math.max(0, r.candidates.length - proposed.length)} alternatives <ArrowRight size={12} />
                </button>
              </div>
              {proposed.length === 0 && <p className="text-sm text-muted">Nobody passes the hard filters for this role.</p>}
              <div className="space-y-2">
                {proposed.map((c) => (
                  <button key={c.employee_id} onClick={() => onOpen(c, r.id)} className="flex w-full items-start gap-3 rounded-lg border border-line p-3 text-left hover:border-faint">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium">{c.name}</div>
                      <div className="truncate text-xs text-muted">{c.position} · {c.years} yrs</div>
                      <div className="mt-2 flex flex-wrap gap-x-2.5 gap-y-1">
                        {c.requirements.filter((q) => q.importance === "must" && q.status !== "unknown").map((q) => (
                          <span key={q.id} className="inline-flex items-center gap-1 text-xs text-ink/80"><StatusIcon status={q.status} size={10} /> {q.label}</span>
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <FitScore fit={c.fit} size="sm" />
                      <Pill tone={availabilityTone(c.availability_code)}>{c.availability}</Pill>
                    </div>
                  </button>
                ))}
              </div>
              {r.complement && (
                <p className="mt-2 text-xs text-muted">
                  Gap cover: <span className="font-medium text-ink">{r.complement.person.name}</span> ({r.complement.person.role}) covers {r.complement.covers.join(", ")}.
                </p>
              )}
            </div>
          );
        })}
      </div>

      <div className="rounded-xl bg-white p-4 ring-1 ring-line">
        <SectionTitle><span className="inline-flex items-center gap-1"><Sparkles size={12} className="text-accent" /> Team review</span></SectionTitle>
        {review === "loading" && <div className="flex items-center gap-2 text-sm text-muted"><Spinner className="size-3 text-accent" /> AI is reviewing the team…</div>}
        {review && review !== "loading" && !review.ok && <p className="text-sm text-muted">{review.error}</p>}
        {review && review !== "loading" && review.ok && (
          <div className="space-y-3 text-sm leading-relaxed">
            <p>{review.summary}</p>
            {review.risks && review.risks.length > 0 && (
              <div><div className="mb-1 text-xs font-semibold text-muted">Watch out</div><ul className="list-disc space-y-0.5 pl-5">{review.risks.map((x, i) => <li key={i}>{x}</li>)}</ul></div>
            )}
            {review.suggestions && review.suggestions.length > 0 && (
              <div><div className="mb-1 text-xs font-semibold text-muted">Suggested next steps</div><ul className="list-disc space-y-0.5 pl-5">{review.suggestions.map((x, i) => <li key={i}>{x}</li>)}</ul></div>
            )}
          </div>
        )}
        {unfilled.length > 0 && <p className="mt-2 text-xs text-warn">Not enough eligible people for: {unfilled.map((r) => r.title).join(", ")}.</p>}
      </div>
    </div>
  );
}
