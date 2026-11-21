import { Lock, RotateCcw, Sparkles, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Availability, Requirement, RoleSpec } from "../types";
import { cx } from "./ui";

const SENIORITY = ["Junior", "Mid", "Senior", "Lead", "Principal"];
const MATCH_LABEL: Record<string, string> = { exact: "same skill", equivalent: "same idea, other name", related: "related", transferable: "transferable" };

function describe(q: Requirement): string[] {
  const out: string[] = [];
  if (q.implicit && q.reason) out.push(`Inferred: ${q.reason}`);
  if (q.skills.length) out.push("Counts: " + q.skills.map((s) => `${s.name} (${MATCH_LABEL[s.match]})`).join(", "));
  if (q.certs.length) out.push("Certificates: " + q.certs.join(", "));
  if (q.sector) out.push(`Sector evidence: main sector, client projects or employer in ${q.sector}`);
  if (q.language) out.push(`Language: ${q.language}, level ${q.min_level ?? "B2"} or higher`);
  if (q.soft.length) out.push("Self-declared: " + q.soft.join(", "));
  if (q.unmapped) out.push("No profile field can show this, so it is not scored.");
  return out;
}

function Chip({ q, open, onOpen, onToggle, onRemove }: {
  q: Requirement; open: boolean; onOpen: () => void; onToggle: () => void; onRemove: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const must = q.importance === "must";
  return (
    <div className="relative" ref={ref}>
      <button
        onClick={onOpen}
        className={cx(
          "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-sm transition-colors",
          must ? "border-ink/80 bg-ink text-white hover:bg-ink/85" : "border-line bg-white text-ink hover:border-faint",
          q.unmapped && "opacity-60",
        )}
      >
        {q.implicit && <Sparkles size={12} className={must ? "text-white/70" : "text-accent"} />}
        {q.label}
      </button>
      {open && (
        <div className="absolute left-0 top-full z-30 mt-1.5 w-80 rounded-xl border border-line bg-white p-3 text-sm shadow-lg fade-in">
          <div className="font-medium">{q.label}</div>
          <ul className="mt-1.5 space-y-1 text-xs text-muted">
            {describe(q).map((l, i) => <li key={i}>{l}</li>)}
          </ul>
          <div className="mt-3 flex gap-2">
            <button onClick={onToggle} className="flex-1 rounded-lg border border-line px-2 py-1.5 text-xs font-medium hover:border-faint">
              {must ? "Make nice-to-have" : "Make must-have"}
            </button>
            <button onClick={onRemove} className="rounded-lg border border-line px-2 py-1.5 text-xs font-medium text-bad hover:border-bad/40">Remove</button>
          </div>
        </div>
      )}
    </div>
  );
}

export function Understood({ role, original, onChange, warnings }: {
  role: RoleSpec; original: RoleSpec | undefined; onChange: (r: RoleSpec) => void; warnings: string[];
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const close = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpenId(null); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const update = (patch: Partial<RoleSpec>) => onChange({ ...role, ...patch });
  const setReq = (id: string, patch: Partial<Requirement> | null) => {
    const reqs = patch === null ? role.requirements.filter((q) => q.id !== id) : role.requirements.map((q) => (q.id === id ? { ...q, ...patch } : q));
    setOpenId(null);
    update({ requirements: reqs });
  };
  const must = role.requirements.filter((q) => q.importance === "must");
  const nice = role.requirements.filter((q) => q.importance === "nice");
  const changed = original && JSON.stringify(original) !== JSON.stringify(role);

  return (
    <div ref={box} className="rounded-xl border border-line bg-white p-4">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-faint"><Lock size={12} /> Always applied</span>
        <select
          value={role.availability}
          onChange={(e) => update({ availability: e.target.value as Availability })}
          className="rounded-full border border-line bg-white px-2.5 py-1 text-sm outline-none hover:border-faint"
          title="Hard filter: never skipped"
        >
          <option value="now">Available now</option>
          <option value="soon">Available within 3 months</option>
          <option value="any">Any availability (incl. assigned)</option>
        </select>
        <label className="inline-flex items-center gap-1.5 rounded-full border border-line px-2.5 py-1" title="Hard filter: never skipped">
          <input
            type="number" min={0} max={40} value={role.min_years ?? ""} placeholder="0"
            onChange={(e) => update({ min_years: e.target.value === "" || Number(e.target.value) <= 0 ? null : Math.min(40, Number(e.target.value)) })}
            className="w-8 bg-transparent text-right tabular-nums outline-none"
          />
          <span className="text-muted">+ years</span>
        </label>
        {role.countries.map((c) => (
          <span key={c} className="inline-flex items-center gap-1 rounded-full border border-line px-2.5 py-1">
            Based in {c}
            <button onClick={() => update({ countries: role.countries.filter((x) => x !== c) })} className="text-faint hover:text-ink"><X size={13} /></button>
          </span>
        ))}
        {role.mobility_required && (
          <span className="inline-flex items-center gap-1 rounded-full border border-line px-2.5 py-1">
            Mobility required <button onClick={() => update({ mobility_required: false })} className="text-faint hover:text-ink"><X size={13} /></button>
          </span>
        )}
        <span className="mx-1 h-4 w-px bg-line" />
        <select
          value={role.seniority_min ?? ""}
          onChange={(e) => update({ seniority_min: e.target.value || null })}
          className="rounded-full border border-line bg-white px-2.5 py-1 text-sm outline-none hover:border-faint"
          title="Preference (not a filter): people below get a lower score"
        >
          <option value="">Any seniority</option>
          {SENIORITY.map((s) => <option key={s} value={s}>{s} or above</option>)}
        </select>
        {changed && (
          <button onClick={() => original && onChange(original)} className="ml-auto inline-flex items-center gap-1 text-xs text-muted hover:text-ink">
            <RotateCcw size={12} /> Undo my changes
          </button>
        )}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-[110px_1fr]">
        <div className="pt-1 text-xs font-semibold uppercase tracking-wide text-faint">Must have</div>
        <div className="flex flex-wrap gap-1.5">
          {must.length ? must.map((q) => (
            <Chip key={q.id} q={q} open={openId === q.id} onOpen={() => setOpenId(openId === q.id ? null : q.id)}
              onToggle={() => setReq(q.id, { importance: "nice" })} onRemove={() => setReq(q.id, null)} />
          )) : <span className="text-sm text-faint">Nothing mandatory</span>}
        </div>
        <div className="pt-1 text-xs font-semibold uppercase tracking-wide text-faint">Nice to have</div>
        <div className="flex flex-wrap gap-1.5">
          {nice.length ? nice.map((q) => (
            <Chip key={q.id} q={q} open={openId === q.id} onOpen={() => setOpenId(openId === q.id ? null : q.id)}
              onToggle={() => setReq(q.id, { importance: "must" })} onRemove={() => setReq(q.id, null)} />
          )) : <span className="text-sm text-faint">—</span>}
        </div>
      </div>
      <p className="mt-3 flex items-center gap-1.5 text-xs text-faint">
        <Sparkles size={12} className="text-accent" /> inferred from the brief · nice-to-haves raise the score but never exclude anyone · click a requirement to change it
      </p>
      {warnings.map((w, i) => <p key={i} className="mt-2 rounded-lg bg-warn-soft px-3 py-2 text-xs text-warn">{w}</p>)}
    </div>
  );
}
