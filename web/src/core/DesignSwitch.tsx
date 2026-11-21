export type DesignId = "people" | "map";

/** Small switch to flip between designs without losing the current search. */
export function DesignSwitch({ current, onChange, tone = "light" }: { current: DesignId; onChange: (d: DesignId) => void; tone?: "light" | "swiss" }) {
  const items: { id: DesignId; label: string }[] = [{ id: "people", label: "People" }, { id: "map", label: "Coverage Map" }];
  if (tone === "swiss") {
    return (
      <div className="flex border border-[var(--v-line)] text-[11px] font-semibold uppercase tracking-[.1em]" title="Design under test">
        {items.map((it) => (
          <button key={it.id} onClick={() => onChange(it.id)} className="px-2.5 py-1.5"
            style={current === it.id ? { background: "var(--v-ink)", color: "#fff" } : { color: "var(--v-ink2)" }}>
            {it.label}
          </button>
        ))}
      </div>
    );
  }
  return (
    <div className="flex rounded-full bg-black/[.05] p-0.5 text-[12px] font-semibold" title="Design under test">
      {items.map((it) => (
        <button key={it.id} onClick={() => onChange(it.id)} className="rounded-full px-3 py-1.5 transition-colors"
          style={current === it.id ? { background: "#fff", color: "var(--v-ink)", boxShadow: "0 1px 2px rgba(0,0,0,.08)" } : { color: "var(--v-ink2)" }}>
          {it.label}
        </button>
      ))}
    </div>
  );
}
