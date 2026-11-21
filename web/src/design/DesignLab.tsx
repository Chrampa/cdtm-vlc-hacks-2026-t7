import { useEffect, useState, type ComponentType, type CSSProperties, type ReactNode } from "react";
import "./design.css";
import { AUDIENCE, DIAGNOSIS, NON_NEGOTIABLES, VARIANTS, type Variant } from "./variants";
import * as Dossier from "./screens/Dossier";
import * as Console from "./screens/Console";
import * as People from "./screens/People";
import * as Spotlight from "./screens/Spotlight";
import * as Matrix from "./screens/Matrix";

const SCREENS: Record<Variant["id"], { Shortlist: ComponentType; Detail: ComponentType; Components: ComponentType }> = {
  dossier: Dossier, console: Console, people: People, spotlight: Spotlight, matrix: Matrix,
};

const FONTS =
  "https://fonts.googleapis.com/css2?family=Newsreader:opsz,wght@6..72,400;6..72,500;6..72,600&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Space+Grotesk:wght@400;500;600;700&family=Inter+Tight:wght@400;500;600;700&display=swap";

function css(s: string): CSSProperties {
  const out: Record<string, string> = {};
  for (const part of s.split(";")) {
    const [k, v] = part.split(":");
    if (k && v) out[k.trim().replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = v.trim();
  }
  return out as CSSProperties;
}

function Frame({ url, children, label }: { url: string; children: ReactNode; label: string }) {
  return (
    <figure className="mt-10">
      <figcaption className="mb-3 text-sm font-semibold text-slate-700">{label}</figcaption>
      <div className="overflow-x-auto rounded-xl border border-slate-300 bg-white shadow-[0_8px_30px_rgba(15,23,42,.08)]">
        <div className="flex min-w-[1280px] items-center gap-2 border-b border-slate-200 bg-slate-100 px-4 py-2.5">
          <span className="size-3 rounded-full bg-slate-300" /><span className="size-3 rounded-full bg-slate-300" /><span className="size-3 rounded-full bg-slate-300" />
          <span className="ml-4 rounded-md bg-white px-3 py-1 text-xs text-slate-500">{url}</span>
        </div>
        <div className="w-[1280px]">{children}</div>
      </div>
    </figure>
  );
}

function CodeSheet({ v }: { v: Variant }) {
  const S = SCREENS[v.id];
  return (
    <section className={`v-${v.id} v-frame overflow-hidden rounded-xl border border-slate-300`}>
      <div className="grid gap-8 p-8 lg:grid-cols-[1.1fr_1fr]">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[.14em]" style={{ color: "var(--v-ink2)" }}>Direction {v.num} · design code</div>
          <h2 className="v-display mt-2 text-4xl font-semibold leading-tight">{v.name}</h2>
          <p className="mt-1 text-lg" style={{ color: "var(--v-ink2)" }}>{v.tagline}</p>
          <p className="mt-5 text-[15px] leading-relaxed">{v.idea}</p>
          <p className="mt-3 text-[15px] leading-relaxed"><b>Best for:</b> {v.bestFor}</p>
          <div className="mt-6 grid gap-6 sm:grid-cols-2">
            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--v-ink2)" }}>Principles</h4>
              <ol className="list-decimal space-y-1.5 pl-5 text-sm leading-relaxed">{v.principles.map((p) => <li key={p}>{p}</li>)}</ol>
            </div>
            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--v-ink2)" }}>Signature elements</h4>
              <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed">{v.signature.map((p) => <li key={p}>{p}</li>)}</ul>
            </div>
            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--v-good)" }}>Strengths</h4>
              <ul className="space-y-1 text-sm">{v.pros.map((p) => <li key={p}>+ {p}</li>)}</ul>
            </div>
            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--v-warn)" }}>Trade-offs</h4>
              <ul className="space-y-1 text-sm">{v.cons.map((p) => <li key={p}>− {p}</li>)}</ul>
            </div>
          </div>
        </div>
        <div className="space-y-7">
          <div>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--v-ink2)" }}>Colour</h4>
            <div className="grid grid-cols-3 gap-2">
              {v.colors.map((c) => (
                <div key={c.name} className="overflow-hidden rounded-md border" style={{ borderColor: "var(--v-line)", background: "var(--v-surface)" }}>
                  <div className="h-10" style={{ background: c.value, borderBottom: "1px solid var(--v-line)" }} />
                  <div className="px-2 py-1.5">
                    <div className="text-xs font-semibold">{c.name} <span className="font-mono font-normal" style={{ color: "var(--v-ink2)" }}>{c.value}</span></div>
                    <div className="text-[11px] leading-tight" style={{ color: "var(--v-ink2)" }}>{c.usage}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--v-ink2)" }}>Type</h4>
            <div className="space-y-3">
              {v.fonts.map((f) => (
                <div key={f.role} className="flex items-baseline gap-4 border-b pb-2" style={{ borderColor: "var(--v-line)" }}>
                  <div className="w-24 shrink-0 text-[11px]" style={{ color: "var(--v-ink2)" }}>{f.role}<br />{f.family}<br />{f.spec}</div>
                  <div className="min-w-0 truncate" style={css(f.css)}>{f.sample}</div>
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs" style={{ color: "var(--v-ink2)" }}>Shape: {v.shape}</p>
          </div>
          <div>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--v-ink2)" }}>Components</h4>
            <S.Components />
          </div>
        </div>
      </div>
    </section>
  );
}

export default function DesignLab() {
  const initial = Math.max(0, VARIANTS.findIndex((v) => `#${v.num}` === location.hash));
  const [i, setI] = useState(initial);
  const v = VARIANTS[i];
  const S = SCREENS[v.id];

  useEffect(() => {
    if (!document.getElementById("design-fonts")) {
      const l = document.createElement("link");
      l.id = "design-fonts"; l.rel = "stylesheet"; l.href = FONTS;
      document.head.appendChild(l);
    }
    document.title = "Insider · Design directions";
  }, []);
  useEffect(() => {
    const onHash = () => {
      const k = VARIANTS.findIndex((x) => `#${x.num}` === location.hash);
      if (k >= 0) setI(k);
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  useEffect(() => {
    if (location.hash !== `#${v.num}`) history.pushState(null, "", `#${v.num}`);
    window.scrollTo({ top: 0 });
  }, [v.num]);

  return (
    <div className="min-h-full bg-slate-50 font-sans text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-[1340px] px-6 py-8">
          <div className="text-xs font-semibold uppercase tracking-[.14em] text-slate-500">Insider · Talent Matcher</div>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Five design directions</h1>
          <p className="mt-2 max-w-3xl text-slate-600">
            Each direction is a complete design code: principles, colours, type, components and the two key screens, built with real results from the matcher (“Data Engineer with GCP for an insurance client”). Pick one, or mix: “2’s table with 1’s type”.
          </p>
          <div className="mt-6 grid gap-6 lg:grid-cols-3">
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Who we design for</h3>
              <ul className="space-y-2 text-sm">
                {AUDIENCE.map((a) => <li key={a.who}><b>{a.who}</b> · {a.how}<br /><span className="text-slate-600">Needs: {a.need}</span></li>)}
                <li className="text-slate-600">Plus, today: the jury, on a projector, for 3 minutes.</li>
              </ul>
            </div>
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">What’s wrong with the current UI</h3>
              <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">{DIAGNOSIS.map((d) => <li key={d}>{d}</li>)}</ul>
            </div>
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Rules every direction keeps</h3>
              <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">{NON_NEGOTIABLES.map((d) => <li key={d}>{d}</li>)}</ul>
            </div>
          </div>
        </div>
      </header>

      <nav className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1340px] gap-1 overflow-x-auto px-6">
          {VARIANTS.map((x, k) => (
            <button
              key={x.id}
              onClick={() => setI(k)}
              className={`-mb-px shrink-0 border-b-2 px-4 py-3 text-left transition-colors ${k === i ? "border-slate-900" : "border-transparent text-slate-500 hover:text-slate-900"}`}
            >
              <div className="text-sm font-semibold">{x.num}. {x.name}</div>
              <div className="max-w-[220px] truncate text-xs text-slate-500">{x.tagline.split(" — ")[1] ?? x.tagline}</div>
            </button>
          ))}
        </div>
      </nav>

      <main className="mx-auto max-w-[1340px] px-6 py-8">
        <CodeSheet v={v} />
        <Frame url="insider · search results" label="Screen 1 · Shortlist for one role (the screen HR spends most time on)">
          <div className={`v-${v.id} v-frame`}><S.Shortlist /></div>
        </Frame>
        <Frame url="insider · candidate" label="Screen 2 · Why this person (decision and justification)">
          <div className={`v-${v.id} v-frame`}><S.Detail /></div>
        </Frame>
        <div className="mt-10 flex items-center justify-between border-t border-slate-200 pt-6 text-sm text-slate-600">
          <button disabled={i === 0} onClick={() => setI(i - 1)} className="rounded-lg px-3 py-2 hover:bg-slate-200 disabled:opacity-30">← {VARIANTS[i - 1]?.name ?? ""}</button>
          <span>Direction {v.num} of {VARIANTS.length}. All names and profiles are synthetic data from the case.</span>
          <button disabled={i === VARIANTS.length - 1} onClick={() => setI(i + 1)} className="rounded-lg px-3 py-2 hover:bg-slate-200 disabled:opacity-30">{VARIANTS[i + 1]?.name ?? ""} →</button>
        </div>
      </main>
    </div>
  );
}
