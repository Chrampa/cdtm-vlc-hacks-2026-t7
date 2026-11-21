import { Check, CircleAlert, X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { first, shortLine } from "../../core/helpers";
import type { Candidate } from "../../types";
import { AvailDot, Avatar, Btn, FitMeter, GemTag, StatusIcon, ink2, ink3, line } from "./ui";

interface Row {
  key: string;
  label: string;
  sub?: string;
  same: boolean;
  cell: (c: Candidate) => ReactNode;
}

export function Compare({ people, roleTitle, onClose, onOpen, action }: {
  people: Candidate[];
  roleTitle: string;
  onClose: () => void;
  onOpen: (c: Candidate) => void;
  action?: (c: Candidate) => { label: string; done?: boolean; onClick?: () => void } | null;
}) {
  const [onlyDiff, setOnlyDiff] = useState(true);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [onClose]);

  const allSame = <T,>(f: (c: Candidate) => T) => people.every((p) => f(p) === f(people[0]));
  const reqs = [...people[0].requirements].sort((a, b) => (a.importance === b.importance ? 0 : a.importance === "must" ? -1 : 1));
  const best = Math.max(...people.map((p) => p.fit));

  const rows: Row[] = [
    { key: "level", label: "Level", same: allSame((c) => c.seniority), cell: (c) => <span className="text-[14px] font-semibold">{c.seniority}</span> },
    { key: "years", label: "Experience", same: allSame((c) => c.years), cell: (c) => <span className="text-[14px] font-semibold">{c.years} years</span> },
    { key: "avail", label: "Availability", same: allSame((c) => c.availability_code), cell: (c) => <AvailDot code={c.availability_code} /> },
    { key: "loc", label: "Location", same: allSame((c) => c.location.split(",").pop()?.trim()), cell: (c) => <span className="text-[14px]">{c.location}</span> },
    ...reqs.map((r) => ({
      key: r.id,
      label: r.label,
      sub: r.importance === "must" ? "Must have" : "Nice to have",
      same: allSame((c) => c.requirements.find((q) => q.id === r.id)?.status ?? "missing"),
      cell: (c: Candidate) => {
        const x = c.requirements.find((q) => q.id === r.id);
        const s = x?.status ?? "missing";
        return (
          <span className="flex items-start gap-2">
            <StatusIcon s={s} />
            <span className="text-[13px] leading-5" style={ink2}>{s === "missing" ? "Not shown" : x?.lines[0] ? shortLine(x.lines[0]) : "—"}</span>
          </span>
        );
      },
    })),
    {
      key: "risks",
      label: "What to check",
      same: people.every((p) => p.risks.length === 0),
      cell: (c) => (
        <ul className="space-y-1 text-[13px] leading-5" style={{ color: c.risks.length ? "var(--v-warn)" : "var(--v-ink3)" }}>
          {c.risks.length ? c.risks.map((r) => <li key={r.text} className="flex gap-1.5"><CircleAlert size={13} className="mt-0.5 shrink-0" />{r.text}</li>) : <li>Nothing stands out</li>}
        </ul>
      ),
    },
  ];
  const visible = onlyDiff ? rows.filter((r) => !r.same) : rows;
  const hiddenCount = rows.length - visible.length;
  const cols = `minmax(140px, 190px) repeat(${people.length}, minmax(200px, 1fr))`;

  const head = (c: Candidate) => {
    const a = action?.(c);
    return (
      <div className="flex h-full flex-col rounded-[var(--v-radius)] border bg-white p-4" style={{ borderColor: c.fit === best ? "var(--v-good)" : "var(--v-line)" }}>
        <button onClick={() => onOpen(c)} className="flex items-center gap-3 text-left">
          <Avatar c={c} size={40} />
          <div className="min-w-0">
            <div className="truncate text-[15px] font-bold">{c.name}</div>
            <div className="truncate text-[12px]" style={ink2}>{c.position}</div>
          </div>
        </button>
        <div className="mt-3 flex flex-wrap items-center gap-2"><FitMeter fit={c.fit} /><GemTag c={c} /></div>
        {c.fit === best && <div className="mt-1 text-[12px] font-bold" style={{ color: "var(--v-good)" }}>Highest match</div>}
        <div className="mt-auto pt-3">
          {a && (a.done ? (
            <span className="inline-flex items-center gap-1.5 text-[13px] font-bold" style={{ color: "var(--v-good)" }}><Check size={15} strokeWidth={3} /> {a.label}</span>
          ) : (
            <Btn variant="primary" small onClick={() => { a.onClick?.(); onClose(); }}>{a.label}</Btn>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="v-people fixed inset-0 z-50 overflow-y-auto bg-black/30 p-0 sm:p-4 md:p-8" onClick={onClose}>
      <div className="fade-in mx-auto min-h-[100dvh] max-w-6xl overflow-hidden sm:min-h-0 sm:rounded-[var(--v-radius)]" onClick={(e) => e.stopPropagation()} style={{ background: "var(--v-bg)", color: "var(--v-ink)", fontFamily: "var(--v-body)" }}>
        <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b bg-white px-4 py-3.5 sm:px-6" style={line}>
          <div className="min-w-0">
            <div className="truncate text-[12px]" style={ink2}>{roleTitle}</div>
            <h2 className="text-[19px] font-bold sm:text-[21px]">Who fits best?</h2>
          </div>
          <div className="flex items-center gap-3">
            <label className="inline-flex cursor-pointer items-center gap-2 text-[13px] font-semibold">
              <input type="checkbox" checked={onlyDiff} onChange={(e) => setOnlyDiff(e.target.checked)} className="size-4 accent-[var(--v-accent)]" />
              Only differences
            </label>
            <button onClick={onClose} aria-label="Close" className="grid size-9 place-items-center rounded-md border bg-white" style={{ ...line, ...ink2 }}><X size={17} /></button>
          </div>
        </div>

        {/* Mobile: one card per row */}
        <div className="space-y-3 p-4 pb-[max(2rem,env(safe-area-inset-bottom))] md:hidden">
          <div className="grid grid-cols-2 gap-2.5">{people.map((c) => <div key={c.employee_id}>{head(c)}</div>)}</div>
          {visible.map((r) => (
            <div key={r.key} className="rounded-[var(--v-radius)] border bg-white p-4" style={line}>
              <div className="flex items-baseline justify-between gap-2 border-b pb-2" style={line}>
                <div className="text-[14px] font-bold">{r.label}</div>
                {r.sub && <div className="text-[11px] font-semibold uppercase" style={ink3}>{r.sub}</div>}
              </div>
              <div className="mt-2.5 space-y-2.5">
                {people.map((c) => (
                  <div key={c.employee_id} className="flex items-start gap-2.5">
                    <span className="w-16 shrink-0 truncate pt-0.5 text-[12px] font-bold">{first(c.name)}</span>
                    <div className="min-w-0 flex-1">{r.cell(c)}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Desktop: side by side */}
        <div className="hidden overflow-x-auto px-6 pb-6 pt-4 md:block">
          <div className="min-w-fit space-y-2">
            <div className="grid gap-3" style={{ gridTemplateColumns: cols }}>
              <div />
              {people.map((c) => <div key={c.employee_id}>{head(c)}</div>)}
            </div>
            {visible.map((r) => (
              <div key={r.key} className="grid items-start gap-3 rounded-[var(--v-radius)] bg-white px-4 py-3" style={{ gridTemplateColumns: cols }}>
                <div><div className="text-[14px] font-bold">{r.label}</div>{r.sub && <div className="text-[12px]" style={ink3}>{r.sub}</div>}</div>
                {people.map((c) => <div key={c.employee_id}>{r.cell(c)}</div>)}
              </div>
            ))}
          </div>
        </div>
        {onlyDiff && hiddenCount > 0 && (
          <p className="px-6 pb-6 text-center text-[13px]" style={ink3}>
            {hiddenCount} row{hiddenCount > 1 ? "s" : ""} where everyone is the same {hiddenCount > 1 ? "are" : "is"} hidden ·{" "}
            <button className="font-semibold underline" onClick={() => setOnlyDiff(false)}>show all</button>
          </p>
        )}
      </div>
    </div>
  );
}
