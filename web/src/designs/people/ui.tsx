import { Check, Minus, Sparkles, X } from "lucide-react";
import { useEffect, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import { availText, avatarColors, fitWord, hiddenReasons, initials, toneColor } from "../../core/helpers";
import type { Candidate, ProjectStatus } from "../../types";

export const ink2 = { color: "var(--v-ink2)" };
export const ink3 = { color: "var(--v-ink3)" };
export const line = { borderColor: "var(--v-line)" };

export function Avatar({ c, size = 44 }: { c: { name: string; employee_id: string }; size?: number }) {
  const { bg, fg } = avatarColors(c.employee_id);
  return (
    <span className="grid shrink-0 place-items-center rounded-full font-bold" style={{ width: size, height: size, background: bg, color: fg, fontSize: size * 0.36 }}>
      {initials(c.name)}
    </span>
  );
}

/** Talentic brand: full wordmark, or just the magnifier mark. */
export function Logo({ height = 24, mark }: { height?: number; mark?: boolean }) {
  return <img src={mark ? "/talentic-mark.png" : "/talentic-logo.png"} alt="Talentic" draggable={false} className="block w-auto select-none" style={{ height }} />;
}

export function Spinner({ size = 16 }: { size?: number }) {
  return <span className="inline-block animate-spin rounded-full border-2 border-current border-r-transparent" style={{ width: size, height: size }} />;
}

/** Five-step bar + a word ("Strong", "Good"…) with the number in small print. */
export function FitMeter({ fit, gap, large, hideNumber }: { fit: number; gap?: boolean; large?: boolean; hideNumber?: boolean }) {
  const { word, tone } = fitWord(fit);
  const filled = Math.max(1, Math.round(fit / 20));
  const color = toneColor[tone];
  return (
    <span className="inline-flex items-center gap-2" title={`${fit}% match${gap ? " · a must-have is not shown" : ""}`}>
      <span className="inline-flex gap-[3px]">
        {[1, 2, 3, 4, 5].map((n) => (
          <span key={n} className={`rounded-[2px] ${large ? "h-2 w-4" : "h-1.5 w-3"}`} style={{ background: n <= filled ? color : "var(--v-line)" }} />
        ))}
      </span>
      <span className={`font-bold ${large ? "text-[16px]" : "text-[13px]"}`} style={{ color: "var(--v-ink)" }}>{word}</span>
      {!hideNumber && <span className={`${large ? "text-[14px]" : "text-[12px]"}`} style={ink3}>{fit}%</span>}
    </span>
  );
}

export function availColor(code: number) {
  return code === 0 ? "var(--v-good)" : code === 1 ? "var(--v-warn)" : "var(--v-ink3)";
}

export function AvailDot({ code, short, quiet }: { code: number; short?: boolean; quiet?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold" style={{ color: quiet ? "var(--v-ink2)" : availColor(code) }}>
      <span className="size-2 shrink-0 rounded-full" style={{ background: availColor(code) }} />
      {availText(code, short)}
    </span>
  );
}

/** One icon per must-have: ✓ shown, – partly shown, ✕ not shown. */
export function MustDots({ c }: { c: Candidate }) {
  const must = c.requirements.filter((r) => r.importance === "must" && r.status !== "unknown");
  if (!must.length) return null;
  return (
    <span className="inline-flex items-center gap-1" title={must.map((r) => `${r.label}: ${r.status === "covered" ? "shown" : r.status === "partial" ? "partly shown" : "not shown"}`).join("\n")}>
      {must.map((r) => <StatusIcon key={r.id} s={r.status} size={16} />)}
    </span>
  );
}

export function StatusIcon({ s, size = 20 }: { s: string; size?: number }) {
  const I = s === "covered" ? Check : s === "partial" ? Minus : X;
  const bg = s === "covered" ? "var(--v-good-soft)" : s === "partial" ? "var(--v-warn-soft)" : s === "unknown" ? "var(--v-chip)" : "var(--v-bad-soft)";
  const fg = s === "covered" ? "var(--v-good)" : s === "partial" ? "var(--v-warn)" : s === "unknown" ? "var(--v-ink3)" : "var(--v-bad)";
  return (
    <span className="grid shrink-0 place-items-center rounded-[4px]" style={{ width: size, height: size, background: bg, color: fg }}>
      <I size={Math.round(size * 0.62)} strokeWidth={3} />
    </span>
  );
}

/** The case's key idea: the right person is already here, just in another team. */
export function GemTag({ c, label }: { c: Candidate; label?: boolean }) {
  if (!c.other_team && !c.hidden_sector) return null;
  return (
    <span title={hiddenReasons(c).join("\n")} className="inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-bold" style={{ background: "var(--v-gold-soft)", color: "var(--v-gold)" }}>
      <Sparkles size={11} /> {label === false ? "" : "Hidden gem"}
    </span>
  );
}

type BtnVariant = "primary" | "secondary" | "ghost" | "link" | "danger";
export function Btn({ variant = "secondary", small, className = "", children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; small?: boolean }) {
  const base = `inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-md font-semibold transition-colors disabled:opacity-40 ${small ? "px-3 py-1.5 text-[13px]" : "px-4 py-2 text-[14px]"}`;
  const v: Record<BtnVariant, string> = {
    primary: "bg-[var(--v-accent)] text-white hover:brightness-110",
    secondary: "border border-[var(--v-line)] bg-white text-[var(--v-ink)] hover:border-[var(--v-accent)]",
    ghost: "text-[var(--v-ink2)] hover:bg-[var(--v-chip)]",
    link: "!px-1 text-[var(--v-accent)] hover:underline",
    danger: "text-[var(--v-bad)] hover:bg-[var(--v-bad-soft)]",
  };
  return <button {...rest} className={`${base} ${v[variant]} ${className}`}>{children}</button>;
}

export function Chip({ children, tone = "neutral", title }: { children: ReactNode; tone?: "neutral" | "good" | "warn" | "bad" | "gold" | "accent"; title?: string }) {
  const t = {
    neutral: { background: "var(--v-chip)", color: "var(--v-ink)" },
    good: { background: "var(--v-good-soft)", color: "var(--v-good)" },
    warn: { background: "var(--v-warn-soft)", color: "var(--v-warn)" },
    bad: { background: "var(--v-bad-soft)", color: "var(--v-bad)" },
    gold: { background: "var(--v-gold-soft)", color: "var(--v-gold)" },
    accent: { background: "var(--v-accent-soft)", color: "var(--v-accent)" },
  }[tone];
  return <span title={title} className="inline-flex max-w-full items-center gap-1 rounded-md px-2.5 py-1 text-[12px] font-semibold" style={t}>{children}</span>;
}

export const STATUS_META: Record<ProjectStatus, { label: string; tone: "neutral" | "good" | "warn" }> = {
  draft: { label: "Search", tone: "neutral" },
  active: { label: "Search", tone: "neutral" },
  staffed: { label: "Project", tone: "good" },
  archived: { label: "Archived", tone: "neutral" },
};

export function StatusChip({ status }: { status: ProjectStatus }) {
  const s = STATUS_META[status] ?? STATUS_META.draft;
  return <Chip tone={s.tone}>{status === "staffed" && <Check size={12} strokeWidth={3} />}{s.label}</Chip>;
}

function useLockScroll(onClose: () => void) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener("keydown", onKey); };
  }, [onClose]);
}

/** Right-hand panel for secondary tasks (replace a person, team rules…). */
export function Drawer({ title, sub, onClose, children, footer, wide }: { title: ReactNode; sub?: ReactNode; onClose: () => void; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  useLockScroll(onClose);
  return (
    <div className="v-people fixed inset-0 z-50 flex justify-end bg-black/25" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className={`slide-in flex h-[100dvh] w-full flex-col ${wide ? "max-w-4xl" : "max-w-[480px]"}`} style={{ background: "var(--v-bg)", color: "var(--v-ink)", fontFamily: "var(--v-body)" }}>
        <div className="flex items-start justify-between gap-3 border-b bg-white px-5 py-4" style={line}>
          <div className="min-w-0">
            <div className="text-[17px] font-bold leading-6">{title}</div>
            {sub && <div className="mt-0.5 text-[13px]" style={ink2}>{sub}</div>}
          </div>
          <button onClick={onClose} aria-label="Close" className="grid size-8 shrink-0 place-items-center rounded-md hover:bg-[var(--v-chip)]" style={ink2}><X size={18} /></button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
        {footer && <div className="border-t bg-white px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]" style={line}>{footer}</div>}
      </div>
    </div>
  );
}

/** Small "⋯" style popover menu. */
export function Menu({ trigger, items }: { trigger: ReactNode; items: { label: ReactNode; onClick: () => void; danger?: boolean }[] }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);
  return (
    <div ref={box} className="relative">
      <span onClick={() => setOpen((v) => !v)}>{trigger}</span>
      {open && (
        <div className="fade-in absolute right-0 top-full z-40 mt-1.5 min-w-[200px] rounded-md border bg-white p-1.5 shadow-[0_16px_40px_rgba(31,35,40,.16)]" style={line}>
          {items.map((it, i) => (
            <button key={i} onClick={() => { setOpen(false); it.onClick(); }} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-[13px] font-semibold hover:bg-[var(--v-chip)]" style={{ color: it.danger ? "var(--v-bad)" : "var(--v-ink)" }}>
              {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function Card({ children, className = "", style }: { children: ReactNode; className?: string; style?: React.CSSProperties }) {
  return <div className={`rounded-[var(--v-radius)] border bg-white ${className}`} style={{ ...line, ...style }}>{children}</div>;
}
