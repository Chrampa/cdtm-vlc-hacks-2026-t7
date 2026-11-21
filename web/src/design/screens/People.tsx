import { CalendarClock, Check, CircleAlert, MapPin, Search, Sparkles, Star } from "lucide-react";
import { citedOnce, evidence, evLabel, first, fmt, initials, plainWhy, snap, top } from "../data";

const ink2 = { color: "var(--v-ink2)" };
const line = { borderColor: "var(--v-line)" };
const AV = ["#DCEFE9", "#F9E4D4", "#E3E6F8", "#F6E7B8", "#E9DFF3", "#DDEBF6"];
const AV_INK = ["#0B5D51", "#8A4316", "#2F3E8F", "#7A5A0B", "#5B3A84", "#1E5C86"];

function Avatar({ name, i, size = 52 }: { name: string; i: number; size?: number }) {
  return (
    <span className="grid shrink-0 place-items-center rounded-full font-bold" style={{ width: size, height: size, background: AV[i % 6], color: AV_INK[i % 6], fontSize: size * 0.36 }}>
      {initials(name)}
    </span>
  );
}

function Availability({ code, text }: { code: number; text: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold" style={{ color: code === 0 ? "var(--v-good)" : "var(--v-warn)" }}>
      <CalendarClock size={15} /> {code === 0 ? "Available now" : "Free in less than 3 months"}
      <span className="sr-only">{text}</span>
    </span>
  );
}

function Segments({ reqs }: { reqs: { status: string; importance: string; label: string }[] }) {
  const must = reqs.filter((r) => r.importance === "must");
  return (
    <div className="flex items-center gap-3">
      <div className="flex gap-1">
        {must.map((r) => (
          <span key={r.label} title={r.label} className="h-2 w-9 rounded-full" style={{
            background: r.status === "covered" ? "var(--v-accent)" : r.status === "partial" ? "linear-gradient(90deg,var(--v-warn) 50%,var(--v-line) 50%)" : "var(--v-line)",
          }} />
        ))}
      </div>
      <span className="text-[13px] font-medium" style={ink2}>{must.filter((r) => r.status === "covered").length} of {must.length} must-haves</span>
    </div>
  );
}

function TopBar() {
  return (
    <div className="flex items-center gap-6 px-10 py-5">
      <div className="flex items-center gap-2"><span className="grid size-9 place-items-center rounded-xl text-[15px] font-extrabold text-white" style={{ background: "var(--v-accent)" }}>In</span><span className="text-[18px] font-bold">Insider</span></div>
      <div className="flex flex-1 items-center gap-3 rounded-full border bg-white px-5 py-2.5 text-[14px]" style={line}>
        <Search size={16} style={ink2} /><span className="flex-1 truncate">{snap.title}</span><span className="font-semibold" style={{ color: "var(--v-accent)" }}>Edit</span>
      </div>
      <span className="grid size-9 place-items-center rounded-full text-[13px] font-bold" style={{ background: "#E9DFF3", color: "#5B3A84" }}>MR</span>
    </div>
  );
}

export function Components() {
  return (
    <div className="space-y-4 text-[14px]">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full px-5 py-2.5 font-semibold text-white" style={{ background: "var(--v-accent)" }}>Find people</span>
        <span className="rounded-full border px-5 py-2.5 font-semibold" style={{ ...line, color: "var(--v-accent)", background: "#fff" }}>View profile</span>
        <span className="inline-flex items-center gap-1 rounded-full px-3 py-2 font-semibold" style={{ background: "var(--v-sun-soft)", color: "#7A5A0B" }}><Sparkles size={14} /> Found in Analytics</span>
      </div>
      <div className="flex flex-wrap items-center gap-5"><Availability code={0} text="" /><Availability code={1} text="" /></div>
      <div className="flex items-center gap-4"><Avatar name="Jorge Salcedo" i={0} size={44} /><Avatar name="Abilio Tejedor" i={1} size={44} /><Avatar name="Angelina Manzanares" i={2} size={44} /><Segments reqs={top.requirements} /></div>
      <div className="flex gap-3">
        <span className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2" style={{ background: "var(--v-good-soft)", color: "var(--v-good)" }}><Check size={15} /> What fits</span>
        <span className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2" style={{ background: "var(--v-warn-soft)", color: "var(--v-warn)" }}><CircleAlert size={15} /> What to check</span>
      </div>
    </div>
  );
}

export function Shortlist() {
  return (
    <div className="pb-10">
      <TopBar />
      <div className="px-10 pt-4">
        <h1 className="v-display text-[34px] font-bold leading-[42px] tracking-tight">{snap.total_shown} people could do this</h1>
        <p className="mt-2 max-w-[820px] text-[16px] leading-7" style={ink2}>
          We looked at {fmt.format(snap.funnel[0].count)} colleagues. {fmt.format(snap.funnel[1].count)} are free within 3 months. None of these {snap.total_shown} work in Data Engineering: we found them through what they have actually done, not the words on their CV.
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <span className="text-[13px] font-semibold" style={ink2}>What matters</span>
          {snap.requirements.map((r) => (
            <span key={r.label} className="inline-flex items-center gap-1.5 rounded-full border bg-white px-3.5 py-1.5 text-[14px] font-medium" style={line}>
              {r.implicit ? <Sparkles size={13} style={{ color: "var(--v-accent)" }} /> : <Check size={14} style={{ color: "var(--v-accent)" }} />}{r.label}
            </span>
          ))}
          <span className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[14px] font-medium" style={{ background: "var(--v-accent-soft)", color: "var(--v-accent)" }}><CalendarClock size={14} /> Free within 3 months</span>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-5">
          {snap.candidates.slice(0, 4).map((c, i) => (
            <div key={c.employee_id} className="relative rounded-[var(--v-radius)] border bg-white p-6 shadow-[0_1px_2px_rgba(31,35,40,.04),0_8px_24px_rgba(31,35,40,.05)]" style={line}>
              {c.other_team && (
                <span className="absolute right-5 top-5 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-semibold" style={{ background: "var(--v-sun-soft)", color: "#7A5A0B" }}>
                  <Sparkles size={12} /> From the {c.role.replace(" (GCP)", "").replace(" Engineer", "")} team
                </span>
              )}
              <div className="flex items-center gap-4">
                <Avatar name={c.name} i={i} />
                <div>
                  <div className="text-[17px] font-bold">{c.name}</div>
                  <div className="flex items-center gap-1 text-[14px]" style={ink2}>{c.position} · <MapPin size={13} /> {c.location}</div>
                </div>
              </div>
              <div className="mt-4"><Availability code={c.availability_code} text={c.availability} /></div>
              <div className="mt-4 rounded-2xl p-4" style={{ background: "var(--v-surface2)" }}>
                <div className="text-[13px] font-bold" style={{ color: "var(--v-accent)" }}>Why {first(c.name)}?</div>
                <p className="mt-1 text-[15px] leading-6">{plainWhy(c)}</p>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <Segments reqs={c.requirements} />
                <span className="text-[13px] font-semibold" style={ink2}>{c.fit}% match</span>
              </div>
              <div className="mt-5 flex gap-2">
                <span className="rounded-full border px-4 py-2 text-[14px] font-semibold" style={{ ...line, color: "var(--v-accent)" }}>View profile</span>
                <span className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[14px] font-semibold" style={ink2}><Star size={15} /> Shortlist</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function Detail() {
  const d = snap.detail;
  const e = d.explanation;
  const fits = d.requirements.filter((r) => r.status === "covered");
  const check = d.requirements.filter((r) => r.status !== "covered");
  const jobs = d.evidence.filter((x) => x.type === "job");
  return (
    <div className="pb-10">
      <TopBar />
      <div className="grid grid-cols-[340px_1fr] gap-8 px-10 pt-4">
        <aside className="space-y-4">
          <div className="rounded-[var(--v-radius)] border bg-white p-6 text-center" style={line}>
            <div className="flex justify-center"><Avatar name={top.name} i={0} size={96} /></div>
            <h1 className="mt-4 text-[24px] font-bold leading-8">{top.name}</h1>
            <p className="text-[15px]" style={ink2}>{top.position}</p>
            <p className="mt-1 inline-flex items-center gap-1 text-[14px]" style={ink2}><MapPin size={13} /> {top.location}</p>
            <div className="mt-4"><Availability code={top.availability_code} text={top.availability} /></div>
            <div className="mt-5 flex justify-center gap-2">
              <span className="rounded-full px-5 py-2.5 text-[14px] font-semibold text-white" style={{ background: "var(--v-accent)" }}>Add to shortlist</span>
            </div>
          </div>
          <div className="rounded-[var(--v-radius)] border bg-white p-5 text-[14px]" style={line}>
            <div className="grid grid-cols-2 gap-y-2.5">
              <span style={ink2}>Match</span><b>{top.fit}%</b>
              <span style={ink2}>Experience</span><b>{top.years} years</b>
              <span style={ink2}>Level</span><b>{top.seniority}</b>
              <span style={ink2}>Main sector</span><b>{top.sector}</b>
              <span style={ink2}>Languages</span><b>{d.evidence.filter((x) => x.type === "language").map((x) => x.text).join(", ")}</b>
            </div>
          </div>
        </aside>
        <section className="space-y-5">
          <div className="rounded-[var(--v-radius)] border bg-white p-6" style={line}>
            <div className="flex items-center gap-2 text-[13px] font-bold" style={{ color: "var(--v-accent)" }}><Sparkles size={15} /> In short</div>
            <p className="mt-2 text-[17px] leading-8">
              {citedOnce(e.summary).map((p, i) => ("t" in p ? <span key={i}>{p.t}</span> : (
                <span key={i} className="mx-0.5 rounded-md px-1.5 py-0.5 text-[12px] font-semibold" style={{ background: "var(--v-accent-soft)", color: "var(--v-accent)" }}>{evLabel(p.id)}</span>
              )))}
            </p>
            <p className="mt-3 text-[12px]" style={ink2}>Written by AI from the profile below; every sentence is checked against it.</p>
          </div>
          <div className="grid grid-cols-2 gap-5">
            <div className="rounded-[var(--v-radius)] p-5" style={{ background: "var(--v-good-soft)" }}>
              <div className="flex items-center gap-2 text-[15px] font-bold" style={{ color: "var(--v-good)" }}><Check size={17} /> What fits</div>
              <ul className="mt-3 space-y-3 text-[14px]">{fits.map((r) => <li key={r.label}><b>{r.label}</b><div style={ink2}>{r.lines[0]}</div></li>)}</ul>
            </div>
            <div className="rounded-[var(--v-radius)] p-5" style={{ background: "var(--v-warn-soft)" }}>
              <div className="flex items-center gap-2 text-[15px] font-bold" style={{ color: "var(--v-warn)" }}><CircleAlert size={17} /> What to check</div>
              <ul className="mt-3 space-y-3 text-[14px]">
                {check.map((r) => <li key={r.label}><b>{r.label}</b> — only partly shown<div style={ink2}>{r.lines[0]}</div></li>)}
                {d.risks.slice(0, 1).map((r) => <li key={r}><b>Timing</b><div style={ink2}>{r}</div></li>)}
              </ul>
            </div>
          </div>
          <div className="rounded-[var(--v-radius)] border bg-white p-6" style={line}>
            <div className="text-[15px] font-bold">Career</div>
            <ol className="relative mt-4 space-y-4 border-l-2 pl-6" style={line}>
              {jobs.map((j, i) => (
                <li key={j.id} className="relative">
                  <span className="absolute -left-[31px] top-1 size-3 rounded-full border-2 bg-white" style={{ borderColor: i === 0 ? "var(--v-accent)" : "var(--v-line)" }} />
                  <div className="text-[14px] font-semibold">{evidence(j.id)?.text.replace(/\s*\([^()]*\)$/, "")}</div>
                  <div className="text-[13px]" style={ink2}>{evidence(j.id)?.text.match(/\(([^)]+)\)$/)?.[1]}</div>
                </li>
              ))}
            </ol>
          </div>
        </section>
      </div>
    </div>
  );
}
