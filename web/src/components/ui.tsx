import { Check, CircleDashed, Minus, X } from "lucide-react";
import type { ReactNode } from "react";

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

export function Button({
  children, onClick, kind = "primary", disabled, className, type = "button", title,
}: {
  children: ReactNode; onClick?: () => void; kind?: "primary" | "ghost" | "subtle"; disabled?: boolean;
  className?: string; type?: "button" | "submit"; title?: string;
}) {
  const base = "inline-flex items-center justify-center gap-2 rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 disabled:opacity-50";
  const kinds = {
    primary: "bg-accent text-white hover:bg-accent/90 px-4 py-2.5",
    ghost: "text-muted hover:text-ink hover:bg-black/5 px-2.5 py-1.5",
    subtle: "bg-white border border-line text-ink hover:border-faint px-3 py-2",
  };
  return (
    <button type={type} title={title} onClick={onClick} disabled={disabled} className={cx(base, kinds[kind], className)}>
      {children}
    </button>
  );
}

export function Pill({ children, tone = "neutral", title, className }: {
  children: ReactNode; tone?: "neutral" | "good" | "warn" | "bad" | "accent"; title?: string; className?: string;
}) {
  const tones = {
    neutral: "bg-black/[.04] text-muted",
    good: "bg-good-soft text-good",
    warn: "bg-warn-soft text-warn",
    bad: "bg-bad-soft text-bad",
    accent: "bg-accent-soft text-accent",
  };
  return (
    <span title={title} className={cx("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap", tones[tone], className)}>
      {children}
    </span>
  );
}

export function availabilityTone(code: number): "good" | "warn" | "neutral" {
  return code === 0 ? "good" : code === 1 ? "warn" : "neutral";
}

export function StatusIcon({ status, size = 14 }: { status: string; size?: number }) {
  if (status === "covered") return <span className="inline-flex shrink-0 rounded-full bg-good-soft p-0.5 text-good"><Check size={size} strokeWidth={2.5} /></span>;
  if (status === "partial") return <span className="inline-flex shrink-0 rounded-full bg-warn-soft p-0.5 text-warn"><Minus size={size} strokeWidth={2.5} /></span>;
  if (status === "missing") return <span className="inline-flex shrink-0 rounded-full bg-bad-soft p-0.5 text-bad"><X size={size} strokeWidth={2.5} /></span>;
  return <span className="inline-flex shrink-0 rounded-full bg-black/5 p-0.5 text-faint"><CircleDashed size={size} /></span>;
}

export function statusWord(status: string) {
  return status === "covered" ? "Shown" : status === "partial" ? "Partly shown" : status === "missing" ? "Not shown" : "Can't be checked";
}

export function FitScore({ fit, size = "md" }: { fit: number; size?: "sm" | "md" | "lg" }) {
  const color = fit >= 80 ? "text-good" : fit >= 60 ? "text-ink" : "text-warn";
  const bar = fit >= 80 ? "bg-good" : fit >= 60 ? "bg-accent" : "bg-warn";
  const text = size === "lg" ? "text-3xl" : size === "md" ? "text-xl" : "text-base";
  return (
    <div className="flex flex-col items-end gap-1" title="Fit = weighted share of requirements this person demonstrably covers">
      <div className={cx("font-semibold tabular-nums leading-none", text, color)}>{fit}<span className="text-xs font-medium text-faint">%</span></div>
      <div className="h-1 w-14 overflow-hidden rounded-full bg-black/5"><div className={cx("h-full rounded-full", bar)} style={{ width: `${Math.max(3, fit)}%` }} /></div>
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return <span className={cx("inline-block size-4 animate-spin rounded-full border-2 border-current border-r-transparent", className)} />;
}

export function Cite({ id, onClick }: { id: string; onClick?: (id: string) => void }) {
  return (
    <button
      onClick={() => onClick?.(id)}
      className="mx-0.5 inline-flex items-center rounded bg-accent-soft px-1 align-[1px] text-[10px] font-semibold leading-4 text-accent hover:bg-accent hover:text-white"
      title="Show this evidence"
    >
      {id}
    </button>
  );
}

/** Renders text with [S2]-style citations turned into clickable chips. */
export function CitedText({ text, onCite }: { text: string; onCite?: (id: string) => void }) {
  const parts = text.split(/(\[[A-Z]\d{1,3}\])/g);
  return (
    <>
      {parts.map((p, i) => {
        const m = p.match(/^\[([A-Z]\d{1,3})\]$/);
        return m ? <Cite key={i} id={m[1]} onClick={onCite} /> : <span key={i}>{p}</span>;
      })}
    </>
  );
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-2 flex items-center justify-between">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-faint">{children}</h3>
      {right}
    </div>
  );
}

export const fmt = new Intl.NumberFormat("en-US");
