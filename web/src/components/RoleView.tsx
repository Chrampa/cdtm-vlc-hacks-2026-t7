import { ChevronRight, Eye, Users } from "lucide-react";
import type { Candidate, RoleResult } from "../types";
import { availabilityTone, cx, fmt, FitScore, Pill, StatusIcon } from "./ui";

export function hiddenReasons(c: Candidate): string[] {
  const r: string[] = [];
  if (c.other_team) r.push(`Works as ${c.role}, not the usual team for this role`);
  if (c.hidden_sector) r.push(`Has the sector experience outside their main sector (${c.sector})`);
  if (c.keyword_hit === false) r.push("A keyword search for the brief's terms would not find this person");
  return r;
}

function Row({ c, rank, selected, onSelect, onOpen, multi }: {
  c: Candidate; rank: number; selected: boolean; onSelect: () => void; onOpen: () => void; multi: boolean;
}) {
  const reqs = c.requirements.filter((r) => r.status !== "unknown");
  const shown = [...reqs.filter((r) => r.importance === "must"), ...reqs.filter((r) => r.importance === "nice")].slice(0, 6);
  const hidden = hiddenReasons(c);
  return (
    <div
      onClick={onOpen}
      className={cx(
        "group flex cursor-pointer gap-3 rounded-xl border bg-white p-4 transition-colors hover:border-faint",
        selected ? "border-accent/60 ring-2 ring-accent/10" : "border-line",
      )}
    >
      <div className="flex flex-col items-center gap-2 pt-0.5" onClick={(e) => e.stopPropagation()}>
        <span className="w-5 text-center text-sm font-medium tabular-nums text-faint">{rank}</span>
        <input
          type="checkbox" checked={selected} onChange={onSelect} title="Add to comparison"
          className="size-4 accent-[var(--color-accent)]"
        />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-semibold">{c.name}</span>
          {c.proposed && multi && <Pill tone="accent"><Users size={11} /> Proposed</Pill>}
          {hidden.length > 0 && <Pill tone="accent" title={hidden.join("\n")}><Eye size={11} /> Hidden match</Pill>}
        </div>
        <div className="mt-0.5 truncate text-sm text-muted">
          {c.position} · {c.years} yrs · {c.location}
        </div>
        <div className="mt-2.5 flex flex-wrap gap-x-3 gap-y-1.5">
          {shown.map((r) => (
            <span key={r.id} className={cx("inline-flex items-center gap-1 text-xs", r.importance === "nice" ? "text-faint" : "text-ink/80")} title={`${r.importance === "must" ? "Must" : "Nice"}: ${r.lines[0]}`}>
              <StatusIcon status={r.status} size={11} /> {r.label}
            </span>
          ))}
        </div>
        {c.risks.length > 0 && (
          <div className="mt-2 text-xs text-warn">⚠ {c.risks[0].text}{c.risks.length > 1 ? ` · +${c.risks.length - 1} more` : ""}</div>
        )}
      </div>
      <div className="flex flex-col items-end justify-between gap-2">
        <FitScore fit={c.fit} />
        <Pill tone={availabilityTone(c.availability_code)}>{c.availability}</Pill>
        <ChevronRight size={16} className="text-faint opacity-0 transition-opacity group-hover:opacity-100" />
      </div>
    </div>
  );
}

export function RoleView({ role, selected, toggle, open, multi, onOpenLite }: {
  role: RoleResult; selected: string[]; toggle: (id: string) => void; open: (c: Candidate) => void; multi: boolean;
  onOpenLite: (employeeId: string) => void;
}) {
  const f = role.funnel;
  const kw = role.keyword;
  return (
    <div className="fade-in">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2 text-sm text-muted">
        <div>
          {f.map((s, i) => (
            <span key={i}>
              {i > 0 && <span className="mx-1.5 text-faint">→</span>}
              <span className="tabular-nums font-medium text-ink">{fmt.format(s.count)}</span> {i === 0 ? "people" : s.label.toLowerCase()}
            </span>
          ))}
          <span className="mx-1.5 text-faint">→</span> best {role.candidates.length} by fit
        </div>
      </div>

      {kw && kw.count !== null && (
        <div className="mb-3 rounded-lg bg-accent-soft px-3 py-2 text-sm text-ink/80">
          A keyword search for <b>{kw.terms.join(" + ")}</b> finds {fmt.format(kw.count)} {kw.count === 1 ? "person" : "people"}
          {kw.missed_in_top > 0 && <> — <b>{kw.missed_in_top} of these {role.candidates.length}</b> would be missed because their profiles use different words.</>}
          {kw.missed_in_top === 0 && "."}
        </div>
      )}

      {role.candidates.length === 0 && (
        <div className="rounded-xl border border-dashed border-line bg-white p-8 text-center text-muted">
          Nobody passes the hard filters. Try “Available within 3 months” or fewer required years.
        </div>
      )}

      <div className="space-y-2.5">
        {role.candidates.map((c, i) => (
          <div key={c.employee_id}>
            <Row c={c} rank={i + 1} multi={multi} selected={selected.includes(c.employee_id)} onSelect={() => toggle(c.employee_id)} onOpen={() => open(c)} />
            {role.complement && role.complement.for === c.employee_id && (
              <div className="ml-8 mt-1.5 rounded-lg border border-dashed border-accent/40 bg-white px-3 py-2 text-sm">
                <span className="text-muted">Nobody covers everything. Pair with </span>
                <button className="font-medium text-accent hover:underline" onClick={() => onOpenLite(role.complement!.person.employee_id)}>
                  {role.complement.person.name}
                </button>
                <span className="text-muted"> ({role.complement.person.role}, {role.complement.person.availability.toLowerCase()}) who covers </span>
                <span className="font-medium">{role.complement.covers.join(", ")}</span>.
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
