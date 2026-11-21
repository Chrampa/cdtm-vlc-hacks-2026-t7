import { X } from "lucide-react";
import { useEffect } from "react";
import type { Candidate, Explanation } from "../types";
import { AiSummary } from "./CandidateDrawer";
import { availabilityTone, FitScore, Pill, StatusIcon } from "./ui";

export function CompareModal({ people, roleTitle, explanations, onClose, onOpen }: {
  people: Candidate[]; roleTitle: string; explanations: Record<string, Explanation | "loading">; onClose: () => void;
  onOpen: (c: Candidate) => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  const reqs = people[0]?.requirements ?? [];
  const sorted = [...reqs].sort((a, b) => (a.importance === b.importance ? 0 : a.importance === "must" ? -1 : 1));
  const col = `minmax(150px, 190px) repeat(${people.length}, minmax(200px, 1fr))`;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/30 p-2 sm:p-6" onClick={onClose}>
      <div className="fade-in w-full max-w-6xl rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-line px-5 py-3">
          <div>
            <div className="text-xs text-faint">Compare for {roleTitle}</div>
            <h2 className="font-semibold">{people.length} candidates side by side</h2>
          </div>
          <button onClick={onClose} className="rounded-md p-1 text-faint hover:bg-black/5 hover:text-ink"><X size={18} /></button>
        </div>
        <div className="overflow-x-auto">
          <div className="min-w-fit text-sm">
            <div className="grid border-b border-line bg-canvas/60" style={{ gridTemplateColumns: col }}>
              <div className="p-3" />
              {people.map((c) => (
                <div key={c.employee_id} className="flex items-start justify-between gap-2 p-3">
                  <div className="min-w-0">
                    <button className="truncate text-left font-semibold hover:text-accent" onClick={() => onOpen(c)}>{c.name}</button>
                    <div className="truncate text-xs text-muted">{c.position}</div>
                    <div className="mt-1"><Pill tone={availabilityTone(c.availability_code)}>{c.availability}</Pill></div>
                  </div>
                  <FitScore fit={c.fit} />
                </div>
              ))}
            </div>
            <Row label="Experience" col={col} cells={people.map((c) => `${c.seniority} · ${c.years} yrs · ${c.location}`)} />
            {sorted.map((r) => (
              <div key={r.id} className="grid border-b border-line" style={{ gridTemplateColumns: col }}>
                <div className="p-3">
                  <div className="font-medium">{r.label}</div>
                  <div className="text-[11px] uppercase text-faint">{r.importance === "must" ? "must" : "nice"}</div>
                </div>
                {people.map((c) => {
                  const x = c.requirements.find((q) => q.id === r.id);
                  return (
                    <div key={c.employee_id} className="flex gap-2 p-3">
                      {x && <StatusIcon status={x.status} />}
                      <span className="text-xs text-muted">{x?.lines[0]}</span>
                    </div>
                  );
                })}
              </div>
            ))}
            <ListRow label="Strengths" col={col} lists={people.map((c) => c.strengths.map((s) => s.split(":")[0]))} tone="text-good" />
            <ListRow label="Gaps" col={col} lists={people.map((c) => c.gaps)} tone="text-bad" />
            <ListRow label="Risks" col={col} lists={people.map((c) => c.risks.map((r) => r.text))} tone="text-warn" />
            <div className="grid" style={{ gridTemplateColumns: col }}>
              <div className="p-3 font-medium">In a sentence</div>
              {people.map((c) => (
                <div key={c.employee_id} className="p-3"><AiSummary exp={explanations[c.employee_id]} compact /></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, cells, col }: { label: string; cells: string[]; col: string }) {
  return (
    <div className="grid border-b border-line" style={{ gridTemplateColumns: col }}>
      <div className="p-3 font-medium">{label}</div>
      {cells.map((c, i) => <div key={i} className="p-3 text-muted">{c}</div>)}
    </div>
  );
}

function ListRow({ label, lists, col, tone }: { label: string; lists: string[][]; col: string; tone: string }) {
  return (
    <div className="grid border-b border-line" style={{ gridTemplateColumns: col }}>
      <div className="p-3 font-medium">{label}</div>
      {lists.map((l, i) => (
        <div key={i} className="p-3">
          {l.length ? <ul className={`space-y-1 text-xs ${tone}`}>{l.map((x, j) => <li key={j}>• {x}</li>)}</ul> : <span className="text-xs text-faint">None</span>}
        </div>
      ))}
    </div>
  );
}
