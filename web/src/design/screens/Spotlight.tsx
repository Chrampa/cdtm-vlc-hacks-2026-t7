import { ArrowRight, Check, ChevronLeft, ChevronRight, Minus, MonitorPlay, Sparkles, X } from "lucide-react";
import { citedOnce, evLabel, fmt, plainWhy, snap, statusWord, top } from "../data";

const ink2 = { color: "var(--v-ink2)" };
const line = { borderColor: "var(--v-line)" };
const tone = (s: string) => (s === "covered" ? "var(--v-good)" : s === "partial" ? "var(--v-warn)" : "var(--v-bad)");

function Ring({ fit, must, size = 132 }: { fit: number; must: string; size?: number }) {
  const r = size / 2 - 8;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--v-line)" strokeWidth="8" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--v-accent)" strokeWidth="8" strokeLinecap="round" strokeDasharray={`${(fit / 100) * c} ${c}`} />
      </svg>
      <div className="absolute text-center">
        <div className="v-num font-semibold leading-none" style={{ fontSize: size * 0.32 }}>{fit}</div>
        <div className="mt-1 text-[11px] font-semibold uppercase tracking-[.08em]" style={ink2}>{must} must</div>
      </div>
    </div>
  );
}

function StatusIcon({ s, size = 16 }: { s: string; size?: number }) {
  const I = s === "covered" ? Check : s === "partial" ? Minus : X;
  return <span className="grid shrink-0 place-items-center rounded-full" style={{ width: size + 8, height: size + 8, background: s === "covered" ? "var(--v-good-soft)" : s === "partial" ? "var(--v-warn-soft)" : "var(--v-bad-soft)", color: tone(s) }}><I size={size} strokeWidth={3} /></span>;
}

function TopBar() {
  return (
    <div className="flex items-center justify-between border-b px-10 py-4" style={line}>
      <div className="flex items-center gap-4"><span className="v-display text-[20px] font-bold">insider</span><span className="text-[14px]" style={ink2}>/ {snap.role_title}</span></div>
      <span className="inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[13px] font-medium" style={line}><MonitorPlay size={14} /> Present</span>
    </div>
  );
}

export function Components() {
  return (
    <div className="space-y-4 text-[14px]">
      <div className="flex flex-wrap items-center gap-3">
        <span className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 font-semibold" style={{ background: "var(--v-accent)", color: "var(--v-on-accent)" }}>Next candidate <ArrowRight size={15} /></span>
        <span className="rounded-full border px-5 py-2.5 font-semibold" style={line}>Add to team</span>
      </div>
      <div className="flex items-center gap-6">
        <Ring fit={83} must="3/4" size={96} />
        <div className="space-y-2">
          {["covered", "partial", "missing"].map((s) => <div key={s} className="flex items-center gap-2"><StatusIcon s={s} size={12} />{statusWord(s)}</div>)}
        </div>
        <div className="space-y-2">
          <span className="block rounded-full px-3 py-1 text-[13px] font-semibold" style={{ background: "var(--v-good-soft)", color: "var(--v-good)" }}>Available now</span>
          <span className="block rounded-full px-3 py-1 text-[13px] font-semibold" style={{ background: "var(--v-warn-soft)", color: "var(--v-warn)" }}>Free in &lt; 3 months</span>
        </div>
      </div>
      <div className="flex items-end gap-3"><span className="v-num text-[44px] font-semibold leading-none" style={{ color: "var(--v-accent)" }}>8</span><span className="pb-1 text-[12px] font-semibold uppercase tracking-[.1em]" style={ink2}>found outside<br />the usual team</span></div>
    </div>
  );
}

export function Shortlist() {
  const exp = snap.detail.explanation;
  const steps = [
    { n: fmt.format(snap.funnel[0].count), l: "colleagues searched" },
    { n: fmt.format(snap.funnel[1].count), l: "free within 3 months" },
    { n: String(snap.total_shown), l: "strong matches" },
    { n: `${snap.total_shown} of ${snap.total_shown}`, l: "found outside Data Engineering", hi: true },
  ];
  return (
    <div className="pb-10">
      <TopBar />
      <div className="px-10 pt-8">
        <div className="grid grid-cols-4 gap-4">
          {steps.map((s, i) => (
            <div key={s.l} className="relative rounded-[var(--v-radius)] border p-5" style={{ ...line, background: s.hi ? "var(--v-accent-soft)" : "var(--v-surface)" }}>
              <div className="v-num text-[44px] font-semibold leading-none" style={{ color: s.hi ? "var(--v-accent)" : "var(--v-ink)" }}>{s.n}</div>
              <div className="mt-2 text-[12px] font-semibold uppercase tracking-[.1em]" style={ink2}>{s.l}</div>
              {i < 3 && <ChevronRight size={20} className="absolute -right-4 top-1/2 z-10 -translate-y-1/2" style={ink2} />}
            </div>
          ))}
        </div>
        <p className="mt-3 text-[14px]" style={ink2}>A keyword search for <b style={{ color: "var(--v-ink)" }}>{snap.keyword.terms.join(" + ")}</b> returns 0 people.</p>

        <div className="mt-8 grid grid-cols-[1fr_340px] gap-6">
          <div className="rounded-[var(--v-radius)] border p-8" style={{ ...line, background: "var(--v-surface)" }}>
            <div className="flex items-start gap-8">
              <Ring fit={top.fit} must={`${top.must_covered}/${top.must_total}`} />
              <div className="min-w-0 flex-1">
                <div className="text-[12px] font-semibold uppercase tracking-[.1em]" style={{ color: "var(--v-accent)" }}>No. 1 · found outside the usual team</div>
                <h2 className="v-display mt-1 text-[38px] font-semibold leading-[44px]">{top.name}</h2>
                <p className="mt-1 text-[17px]" style={ink2}>{top.position} · {top.location}</p>
                <span className="mt-3 inline-block rounded-full px-3 py-1 text-[13px] font-semibold" style={{ background: "var(--v-warn-soft)", color: "var(--v-warn)" }}>{top.availability}</span>
              </div>
            </div>
            <div className="mt-7 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[.1em]" style={ink2}><Sparkles size={13} /> Why</div>
            <p className="mt-2 text-[19px] leading-[30px]">
              {citedOnce(exp.summary).map((p, i) => ("t" in p ? <span key={i}>{p.t}</span> : (
                <span key={i} className="mx-0.5 rounded-full border px-2 py-0.5 align-[2px] text-[12px] font-semibold" style={{ ...line, color: "var(--v-accent)" }}>{evLabel(p.id)}</span>
              )))}
            </p>
            <div className="mt-7 grid grid-cols-2 gap-3">
              {top.requirements.map((r) => (
                <div key={r.label} className="flex items-center gap-3 rounded-xl px-4 py-3" style={{ background: "var(--v-surface2)" }}>
                  <StatusIcon s={r.status} /><div><div className="text-[15px] font-semibold">{r.label}</div><div className="text-[13px]" style={ink2}>{statusWord(r.status)}</div></div>
                </div>
              ))}
            </div>
            <div className="mt-7 flex items-center justify-between">
              <span className="inline-flex items-center gap-2 text-[14px] font-medium" style={ink2}><ChevronLeft size={16} /> Previous</span>
              <div className="flex gap-3">
                <span className="rounded-full border px-5 py-2.5 text-[14px] font-semibold" style={line}>Add to team</span>
                <span className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-[14px] font-semibold" style={{ background: "var(--v-accent)", color: "var(--v-on-accent)" }}>Next candidate <ArrowRight size={15} /></span>
              </div>
            </div>
          </div>

          <aside>
            <div className="mb-3 text-[12px] font-semibold uppercase tracking-[.1em]" style={ink2}>Up next</div>
            <div className="space-y-2.5">
              {snap.candidates.slice(1, 6).map((c, i) => (
                <div key={c.employee_id} className="flex items-center gap-4 rounded-[var(--v-radius)] border p-4" style={{ ...line, background: "var(--v-surface)" }}>
                  <span className="v-num w-5 text-[15px]" style={ink2}>{i + 2}</span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[15px] font-semibold">{c.name}</div>
                    <div className="truncate text-[13px]" style={ink2}>{c.position}</div>
                    <div className="mt-1 text-[12px] font-semibold" style={{ color: c.availability_code === 0 ? "var(--v-good)" : "var(--v-warn)" }}>{c.availability}</div>
                  </div>
                  <div className="v-num text-[26px] font-semibold">{c.fit}</div>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

export function Detail() {
  const d = snap.detail;
  const skills = d.evidence.filter((x) => x.type === "skill").slice(0, 6);
  return (
    <div className="pb-10">
      <TopBar />
      <div className="px-10 pt-8">
        <div className="flex items-end justify-between">
          <div>
            <div className="text-[12px] font-semibold uppercase tracking-[.1em]" style={{ color: "var(--v-accent)" }}>Candidate no. 1 · {snap.role_title}</div>
            <h1 className="v-display mt-1 text-[48px] font-semibold leading-[54px]">{top.name}</h1>
            <p className="mt-1 text-[18px]" style={ink2}>{top.position} · {top.years} years · {top.location}</p>
          </div>
          <Ring fit={top.fit} must={`${top.must_covered}/${top.must_total}`} size={150} />
        </div>
        <div className="mt-8 grid grid-cols-[1.25fr_1fr] gap-6">
          <div className="space-y-3">
            {d.requirements.map((r) => (
              <div key={r.label} className="rounded-[var(--v-radius)] border p-5" style={{ ...line, background: "var(--v-surface)" }}>
                <div className="flex items-center gap-3"><StatusIcon s={r.status} /><span className="text-[18px] font-semibold">{r.label}</span><span className="ml-auto text-[13px] font-semibold" style={{ color: tone(r.status) }}>{statusWord(r.status)}</span></div>
                <div className="mt-2 pl-9 text-[15px] leading-6" style={ink2}>{r.lines.slice(0, 2).join(" · ")}</div>
              </div>
            ))}
          </div>
          <div className="space-y-4">
            <div className="rounded-[var(--v-radius)] p-5" style={{ background: "var(--v-warn-soft)" }}>
              <div className="text-[12px] font-semibold uppercase tracking-[.1em]" style={{ color: "var(--v-warn)" }}>Ask in the interview</div>
              <ul className="mt-2 space-y-2 text-[15px] leading-6">{d.explanation.verify.map((v) => <li key={v}>{v.replace(/\s*\[[A-Z]\d+\]/g, "")}</li>)}</ul>
            </div>
            <div className="rounded-[var(--v-radius)] border p-5" style={{ ...line, background: "var(--v-surface)" }}>
              <div className="text-[12px] font-semibold uppercase tracking-[.1em]" style={ink2}>Strongest skills</div>
              <div className="mt-3 space-y-3">
                {skills.map((s) => (
                  <div key={s.id} className="grid grid-cols-[130px_1fr_60px] items-center gap-3 text-[14px]">
                    <span className="truncate font-medium">{s.name}</span>
                    <span className="h-2 rounded-full" style={{ background: "var(--v-line)" }}><span className="block h-full rounded-full" style={{ width: `${(Number(s.level) / 5) * 100}%`, background: "var(--v-accent)" }} /></span>
                    <span className="v-num text-right" style={ink2}>{s.years}y</span>
                  </div>
                ))}
              </div>
            </div>
            <p className="text-[13px]" style={ink2}>{plainWhy(top)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
