import { AlertCircle, ArrowLeftRight, ArrowRight, Check, CheckCircle2, Clock, Globe, Lock, RotateCcw, ShieldCheck, SlidersHorizontal, Sparkles, Unlock, Users, X } from "lucide-react";
import { useState } from "react";
import type { Candidate, SearchResponse, TeamMember, TeamNeed, TeamOption, TeamOptionId, TeamReview, TeamShape } from "../types";
import { availabilityTone, cx, FitScore, Pill, SectionTitle, Spinner, StatusIcon } from "./ui";

const ROLE_TONE: Record<string, { label: string; tone: "accent" | "neutral" | "good" }> = {
  anchor: { label: "Anchor", tone: "accent" },
  builder: { label: "Builder", tone: "neutral" },
  learner: { label: "Learner", tone: "good" },
};

function ShapeEditor({ shape, onChange, onReset, hasCustom }: {
  shape: TeamShape; onChange: (s: TeamShape) => void; onReset: () => void; hasCustom: boolean;
}) {
  const set = (patch: Partial<TeamShape>) => onChange({ ...shape, ...patch });
  const sel = "rounded-lg border border-line bg-white px-2.5 py-1.5 text-xs font-medium outline-none hover:border-faint";
  return (
    <div className="fade-in rounded-xl border border-line bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-sm font-semibold">
          <SlidersHorizontal size={14} className="text-accent" /> Team shape rules
        </div>
        <div className="flex items-center gap-3 text-xs">
          <label className="inline-flex cursor-pointer items-center gap-1.5 font-medium">
            <input type="checkbox" checked={shape.enabled} onChange={(e) => set({ enabled: e.target.checked })} className="accent-accent" />
            Balance team automatically
          </label>
          {hasCustom && (
            <button onClick={onReset} className="inline-flex items-center gap-1 text-muted hover:text-ink">
              <RotateCcw size={12} /> Defaults
            </button>
          )}
        </div>
      </div>

      {shape.enabled && (
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-xs">
          <label className="flex flex-col gap-1">
            <span className="text-muted">Anchors (Lead/Principal)</span>
            <select value={shape.anchors_min} onChange={(e) => set({ anchors_min: Number(e.target.value) })} className={sel}>
              <option value={0}>No minimum</option>
              <option value={1}>At least 1</option>
              <option value={2}>At least 2</option>
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-muted">Max Senior or above</span>
            <select value={shape.max_senior_plus_ratio} onChange={(e) => set({ max_senior_plus_ratio: Number(e.target.value) })} className={sel}>
              <option value={0.4}>At most 40%</option>
              <option value={0.5}>At most 50%</option>
              <option value={0.6}>At most 60%</option>
              <option value={0.8}>At most 80%</option>
              <option value={1}>No cap</option>
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-muted">Mid-level floor (3+ people)</span>
            <select value={shape.min_mid} onChange={(e) => set({ min_mid: Number(e.target.value) })} className={sel}>
              <option value={0}>No minimum</option>
              <option value={1}>At least 1 Mid</option>
              <option value={2}>At least 2 Mids</option>
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-muted">Junior floor (4+ people)</span>
            <select value={shape.min_junior} onChange={(e) => set({ min_junior: Number(e.target.value) })} className={sel}>
              <option value={0}>No minimum</option>
              <option value={1}>At least 1 Junior</option>
              <option value={2}>At least 2 Juniors</option>
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-muted">Max time-zone spread</span>
            <select value={shape.max_tz_spread} onChange={(e) => set({ max_tz_spread: Number(e.target.value) })} className={sel}>
              <option value={2}>≤ 2 hours</option>
              <option value={4}>≤ 4 hours</option>
              <option value={6}>≤ 6 hours</option>
              <option value={8}>≤ 8 hours</option>
              <option value={24}>Any time zone</option>
            </select>
          </label>
          <label className="flex cursor-pointer items-center gap-1.5 pt-4 font-medium">
            <input type="checkbox" checked={shape.mentor_juniors} onChange={(e) => set({ mentor_juniors: e.target.checked })} className="accent-accent" />
            Mentor every Junior (same area)
          </label>
          <label className="flex cursor-pointer items-center gap-1.5 pt-4 font-medium">
            <input type="checkbox" checked={shape.prefer_shared_language} onChange={(e) => set({ prefer_shared_language: e.target.checked })} className="accent-accent" />
            Shared language (B2+)
          </label>
          <label className="flex cursor-pointer items-center gap-1.5 pt-4 font-medium">
            <input type="checkbox" checked={shape.avoid_duplicates} onChange={(e) => set({ avoid_duplicates: e.target.checked })} className="accent-accent" />
            Avoid near-duplicates
          </label>
        </div>
      )}
    </div>
  );
}

function SlotCard({ member, onOpen, onRole, onToggleLock, onSwap }: {
  member: TeamMember;
  onOpen: (c: Candidate, roleId: string) => void;
  onRole: (roleId: string) => void;
  onToggleLock: (slotId: string, employeeId: string) => void;
  onSwap: (slotId: string, employeeId: string) => void;
}) {
  const [swapping, setSwapping] = useState(false);
  const c = member.candidate;
  const badge = ROLE_TONE[member.team_role] ?? ROLE_TONE.builder;

  return (
    <div className={cx("rounded-xl border bg-white p-4 transition-colors", member.locked ? "border-accent" : "border-line")}>
      <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate font-semibold">{member.slot_label}</span>
          <Pill tone={badge.tone}>{badge.label}</Pill>
        </div>
        <div className="flex items-center gap-1.5">
          {c && (
            <button
              onClick={() => onToggleLock(member.slot_id, c.employee_id)}
              title={member.locked ? "Unlock this slot" : "Lock this person and re-solve the rest of the team around them"}
              className={cx(
                "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
                member.locked ? "border-accent bg-accent text-white" : "border-line text-muted hover:border-faint hover:text-ink",
              )}
            >
              {member.locked ? <Lock size={11} /> : <Unlock size={11} />}
              {member.locked ? "Locked" : "Lock"}
            </button>
          )}
          {member.swaps.length > 0 && (
            <button
              onClick={() => setSwapping((v) => !v)}
              className={cx(
                "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
                swapping ? "border-ink bg-ink text-white" : "border-line text-accent hover:border-accent/50",
              )}
            >
              <ArrowLeftRight size={11} /> Swap
            </button>
          )}
        </div>
      </div>

      {!c ? (
        <p className="text-sm text-muted">Nobody passes the hard filters for this slot.</p>
      ) : (
        <>
          <button
            onClick={() => onOpen(c, member.role_id)}
            className="flex w-full items-start gap-3 rounded-lg border border-line p-3 text-left transition-colors hover:border-faint"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate font-medium">{c.name}</span>
                <span className="text-xs text-muted">{c.seniority}</span>
              </div>
              <div className="truncate text-xs text-muted">{c.position} · {c.location}</div>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <Pill tone={availabilityTone(c.availability_code)}>{c.availability}</Pill>
                {c.requirements.filter((q) => q.importance === "must" && q.status !== "unknown").slice(0, 3).map((q) => (
                  <span key={q.id} className="inline-flex items-center gap-1 text-xs text-muted">
                    <StatusIcon status={q.status} />{q.label}
                  </span>
                ))}
              </div>
            </div>
            <FitScore fit={c.fit} />
          </button>

          {member.mentor && (
            <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-surface px-2.5 py-1.5 text-xs text-muted">
              <Users size={12} className="shrink-0 text-accent" />
              <span>
                {member.team_role === "learner" ? "Mentored by" : "Paired with"}{" "}
                <b className="text-ink">{member.mentor.name}</b> ({member.mentor.seniority} · {member.mentor.slot_label})
              </span>
            </div>
          )}

          {swapping && (
            <div className="fade-in mt-3 space-y-2 border-t border-line pt-3">
              <div className="flex items-center justify-between text-xs text-muted">
                <span>Alternatives for {member.slot_label}</span>
                <button onClick={() => onRole(member.role_id)} className="inline-flex items-center gap-1 text-accent hover:underline">
                  All candidates <ArrowRight size={12} />
                </button>
              </div>
              {member.swaps.map((sw) => (
                <div key={sw.candidate.employee_id} className="flex items-center justify-between gap-2 rounded-lg border border-line p-2.5 text-xs">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate font-medium text-ink">{sw.candidate.name}</span>
                      <span className="text-muted">{sw.candidate.seniority} · {sw.candidate.fit}%</span>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {sw.impact.map((imp) => (
                        <Pill
                          key={imp}
                          tone={imp.startsWith("Breaks") || imp.startsWith("Drops") ? "warn" : imp.startsWith("Ready") || imp.startsWith("Fixes") || imp.startsWith("+") ? "good" : "neutral"}
                        >
                          {imp}
                        </Pill>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={() => { onSwap(member.slot_id, sw.candidate.employee_id); setSwapping(false); }}
                    className="shrink-0 rounded-lg bg-accent px-2.5 py-1.5 text-xs font-medium text-white hover:bg-accent/90"
                  >
                    Use
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export function TeamView({
  result,
  review,
  activeOption,
  customShape,
  locks,
  onSelectOption,
  onChangeShape,
  onResetShape,
  onToggleLock,
  onSwap,
  onClearLocks,
  onEditTeamNeed,
  onOpen,
  onRole,
}: {
  result: SearchResponse;
  review: TeamReview | "loading" | undefined;
  activeOption: TeamOptionId;
  customShape: TeamShape | null;
  locks: Record<string, string>;
  onSelectOption: (opt: TeamOptionId) => void;
  onChangeShape: (s: TeamShape) => void;
  onResetShape: () => void;
  onToggleLock: (slotId: string, employeeId: string) => void;
  onSwap: (slotId: string, employeeId: string) => void;
  onClearLocks: () => void;
  onEditTeamNeed: (needId: string, patch: Partial<TeamNeed> | null) => void;
  onOpen: (c: Candidate, roleId: string) => void;
  onRole: (roleId: string) => void;
}) {
  const [editShape, setEditShape] = useState(false);
  const [showAllChecks, setShowAllChecks] = useState(false);
  const t = result.team;
  if (!t || !t.options?.length) return null;

  const opt: TeamOption = t.options.find((o) => o.id === activeOption) ?? t.options[0];
  const failedChecks = opt.shape.checks.filter((ch) => !ch.ok);
  const visibleChecks = showAllChecks ? opt.shape.checks : failedChecks;
  const lockCount = Object.keys(locks).length;
  const bestIds = t.options[0]?.members.map((x) => x.candidate?.employee_id).join(",");
  const optIds = opt.members.map((x) => x.candidate?.employee_id).join(",");
  const sameAsBest = opt.id !== "best_fit" && bestIds === optIds;

  return (
    <div className="fade-in space-y-4">
      <div className="grid gap-3 md:grid-cols-3">
        {t.options.map((o) => {
          const active = o.id === opt.id;
          return (
            <button
              key={o.id}
              onClick={() => onSelectOption(o.id)}
              className={cx(
                "rounded-xl border p-3.5 text-left transition-all",
                active ? "border-accent bg-white ring-1 ring-accent" : "border-line bg-white/70 hover:border-faint hover:bg-white",
              )}
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className={cx("text-sm font-semibold", active ? "text-accent" : "text-ink")}>{o.label}</span>
                <span className="text-lg font-semibold tabular-nums">{o.avg_fit}%</span>
              </div>
              <div className="mt-1 text-xs text-muted">{o.shape.summary}</div>
              <div className="mt-1 flex items-center justify-between text-xs">
                <span className={o.ready_now_count === o.slots_filled ? "font-medium text-good" : "text-muted"}>{o.ready_by}</span>
                <span className="tabular-nums text-faint">{o.slots_filled}/{o.slots_total}</span>
              </div>
            </button>
          );
        })}
      </div>

      <div className="space-y-3 rounded-xl border border-line bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5">
            <span className="inline-flex items-center gap-1.5 font-medium">
              <ShieldCheck size={15} className={opt.shape.balanced ? "text-good" : "text-accent"} />
              {opt.shape.summary}
            </span>
            <span className="inline-flex items-center gap-1.5 text-muted">
              <Globe size={14} /> {opt.shared_languages.length ? opt.shared_languages.slice(0, 2).join(", ") + " (B2+)" : "No shared B2+ language"}
            </span>
            <span className="inline-flex items-center gap-1.5 text-muted">
              <Clock size={14} /> {opt.tz_summary}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {lockCount > 0 && (
              <button onClick={onClearLocks} className="inline-flex items-center gap-1 rounded-full border border-line px-2.5 py-1 text-xs font-medium text-muted hover:border-faint hover:text-ink">
                <Unlock size={12} /> Clear {lockCount} lock{lockCount > 1 ? "s" : ""}
              </button>
            )}
            <button
              onClick={() => setEditShape((v) => !v)}
              className={cx(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                editShape ? "border-accent bg-accent-soft text-accent" : "border-line text-accent hover:border-accent/50",
              )}
            >
              <SlidersHorizontal size={12} /> Edit shape
            </button>
          </div>
        </div>

        {opt.team_needs.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 border-t border-line pt-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-faint">Whole-team needs</span>
            {opt.team_needs.map((tn) => (
              <span
                key={tn.id}
                title={tn.members.length ? `Covered by: ${tn.members.join(", ")}` : "Not yet covered"}
                className={cx(
                  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
                  tn.ok ? "border-good/30 bg-good-soft text-good" : "border-warn/30 bg-warn-soft text-warn",
                )}
              >
                {tn.ok ? <Check size={12} /> : <AlertCircle size={12} />}
                <span>{tn.label}</span>
                <span className="tabular-nums opacity-80">{tn.covered}/{tn.target}</span>
                <button onClick={() => onEditTeamNeed(tn.id, null)} title="Remove team need" className="opacity-60 hover:opacity-100"><X size={11} /></button>
              </span>
            ))}
          </div>
        )}

        {opt.shape.checks.length > 0 && (
          <div className="space-y-1 border-t border-line pt-3 text-xs">
            {visibleChecks.map((ch) => (
              <div key={ch.rule} className={cx("flex items-start gap-1.5", ch.ok ? "text-muted" : "text-warn")}>
                {ch.ok ? <CheckCircle2 size={13} className="mt-0.5 shrink-0 text-good" /> : <AlertCircle size={13} className="mt-0.5 shrink-0" />}
                <span><b className={ch.ok ? "text-ink" : "text-warn"}>{ch.label}:</b> {ch.detail}</span>
              </div>
            ))}
            <button onClick={() => setShowAllChecks((v) => !v)} className="font-medium text-accent hover:underline">
              {showAllChecks ? "Hide passing rules" : failedChecks.length ? `Show all ${opt.shape.checks.length} balance rules` : `All ${opt.shape.checks.length} balance rules met — inspect`}
            </button>
          </div>
        )}

        {sameAsBest && (
          <p className="text-xs text-muted">
            {opt.id === "ready_now" ? "Same people as Best fit — everyone is already available now." : "Same people as Best fit — this mix is already as lean as the rules allow."}
          </p>
        )}
      </div>

      {editShape && (
        <ShapeEditor shape={customShape ?? t.shape} onChange={onChangeShape} onReset={onResetShape} hasCustom={customShape !== null} />
      )}

      <div className="grid gap-3 md:grid-cols-2">
        {opt.members.map((member) => (
          <SlotCard
            key={member.slot_id}
            member={member}
            onOpen={onOpen}
            onRole={onRole}
            onToggleLock={onToggleLock}
            onSwap={onSwap}
          />
        ))}
      </div>

      <div className="rounded-xl border border-line bg-white p-4">
        <div className="mb-2 flex items-center gap-1.5">
          <Sparkles size={14} className="text-accent" />
          <SectionTitle>Team review</SectionTitle>
        </div>
        {review === "loading" && <div className="flex items-center gap-2 text-sm text-muted"><Spinner /> Reviewing the team…</div>}
        {review && review !== "loading" && !review.ok && <p className="text-sm text-muted">{review.error}</p>}
        {review && review !== "loading" && review.ok && (
          <div className="space-y-3 text-sm leading-relaxed">
            <p>{review.summary}</p>
            <div className="grid gap-3 md:grid-cols-2">
              {!!review.risks?.length && (
                <div>
                  <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-warn">Watch out</div>
                  <ul className="list-disc space-y-1 pl-4 text-muted">{review.risks.map((x, i) => <li key={i}>{x}</li>)}</ul>
                </div>
              )}
              {!!review.suggestions?.length && (
                <div>
                  <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-good">Suggestions</div>
                  <ul className="list-disc space-y-1 pl-4 text-muted">{review.suggestions.map((x, i) => <li key={i}>{x}</li>)}</ul>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
