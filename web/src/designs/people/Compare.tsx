import { Check, CircleAlert, Minus, X } from "lucide-react";
import { useEffect } from "react";
import { citedOnce, whyLine } from "../../core/helpers";
import type { Candidate, Explanation } from "../../types";
import { Availability, Avatar } from "./PeopleApp";

const ink2 = { color: "var(--v-ink2)" };
const line = { borderColor: "var(--v-line)" };

function Status({ s }: { s: string }) {
  const I = s === "covered" ? Check : s === "partial" ? Minus : X;
  const bg = s === "covered" ? "var(--v-good-soft)" : s === "partial" ? "var(--v-warn-soft)" : "var(--v-bad-soft)";
  const fg = s === "covered" ? "var(--v-good)" : s === "partial" ? "var(--v-warn)" : "var(--v-bad)";
  return <span className="grid size-6 shrink-0 place-items-center rounded-full" style={{ background: bg, color: fg }}><I size={14} strokeWidth={3} /></span>;
}

export function Compare({ people, roleTitle, explanation, onClose, onOpen }: {
  people: Candidate[]; roleTitle: string; explanation: (id: string) => Explanation | "loading" | undefined; onClose: () => void; onOpen: (c: Candidate) => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  const reqs = [...people[0].requirements].sort((a, b) => (a.importance === b.importance ? 0 : a.importance === "must" ? -1 : 1));
  const cols = `minmax(170px, 220px) repeat(${people.length}, minmax(220px, 1fr))`;
  const best = Math.max(...people.map((p) => p.fit));

  return (
    <div className="v-people fixed inset-0 z-50 overflow-y-auto bg-black/30 p-3 sm:p-8" onClick={onClose}>
      <div className="fade-in mx-auto max-w-6xl overflow-hidden rounded-[24px]" onClick={(e) => e.stopPropagation()} style={{ background: "var(--v-bg)", color: "var(--v-ink)", fontFamily: "var(--v-body)" }}>
        <div className="flex items-center justify-between px-6 py-4">
          <div><div className="text-[13px]" style={ink2}>Side by side · {roleTitle}</div><h2 className="text-[22px] font-bold">Who fits best?</h2></div>
          <button onClick={onClose} className="rounded-full border bg-white px-4 py-2 text-[14px] font-semibold" style={{ ...line, color: "var(--v-accent)" }}>Close</button>
        </div>
        <div className="overflow-x-auto px-6 pb-6">
          <div className="min-w-fit space-y-2">
            <div className="grid gap-3" style={{ gridTemplateColumns: cols }}>
              <div />
              {people.map((c) => (
                <button key={c.employee_id} onClick={() => onOpen(c)} className="rounded-[18px] border bg-white p-4 text-left" style={{ borderColor: c.fit === best ? "var(--v-accent)" : "var(--v-line)" }}>
                  <div className="flex items-center gap-3"><Avatar c={c} size={44} /><div className="min-w-0"><div className="truncate font-bold">{c.name}</div><div className="truncate text-[13px]" style={ink2}>{c.position}</div></div></div>
                  <div className="mt-3 flex items-center justify-between"><Availability code={c.availability_code} short /><span className="text-[18px] font-bold">{c.fit}%</span></div>
                  {c.fit === best && <div className="mt-2 text-[12px] font-bold" style={{ color: "var(--v-accent)" }}>Highest match</div>}
                </button>
              ))}
            </div>
            <Row cols={cols} label="Why">{people.map((c) => <p key={c.employee_id} className="text-[14px] leading-6">{whyLine(c)}</p>)}</Row>
            {reqs.map((r) => (
              <Row key={r.id} cols={cols} label={r.label} sub={r.importance === "must" ? "Must have" : "Nice to have"}>
                {people.map((c) => {
                  const x = c.requirements.find((q) => q.id === r.id);
                  return <div key={c.employee_id} className="flex gap-2.5"><Status s={x?.status ?? "missing"} /><span className="text-[13px] leading-5" style={ink2}>{x?.lines[0]}</span></div>;
                })}
              </Row>
            ))}
            <Row cols={cols} label="What to check">
              {people.map((c) => (
                <ul key={c.employee_id} className="space-y-1 text-[13px] leading-5" style={{ color: "var(--v-warn)" }}>
                  {c.risks.length ? c.risks.map((r) => <li key={r.text} className="flex gap-1.5"><CircleAlert size={13} className="mt-0.5 shrink-0" />{r.text}</li>) : <li style={ink2}>Nothing stands out</li>}
                </ul>
              ))}
            </Row>
            <Row cols={cols} label="In short" sub="Written by AI">
              {people.map((c) => {
                const e = explanation(c.employee_id);
                if (!e || e === "loading") return <div key={c.employee_id} className="space-y-1.5"><div className="shimmer h-3 rounded-full" /><div className="shimmer h-3 w-3/4 rounded-full" /></div>;
                return <p key={c.employee_id} className="text-[13px] leading-5">{e.ok ? citedOnce(e.summary ?? "").filter((p) => "t" in p).map((p) => ("t" in p ? p.t : "")).join("").replace(/\s+([.,])/g, "$1") : e.error}</p>;
              })}
            </Row>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, sub, cols, children }: { label: string; sub?: string; cols: string; children: React.ReactNode }) {
  return (
    <div className="grid items-start gap-3 rounded-[18px] bg-white p-4" style={{ gridTemplateColumns: cols }}>
      <div><div className="text-[14px] font-bold">{label}</div>{sub && <div className="text-[12px]" style={ink2}>{sub}</div>}</div>
      {children}
    </div>
  );
}
