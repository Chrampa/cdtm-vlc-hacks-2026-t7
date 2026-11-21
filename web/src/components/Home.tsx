import { ArrowRight, Sparkles } from "lucide-react";
import { useEffect, useRef } from "react";
import type { Meta } from "../types";
import { Button, fmt } from "./ui";

export function Home({ meta, brief, setBrief, onSubmit, error }: {
  meta: Meta | null; brief: string; setBrief: (s: string) => void; onSubmit: () => void; error: string | null;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => ref.current?.focus(), []);
  const ready = brief.trim().length >= 10;

  return (
    <div className="mx-auto flex min-h-[calc(100vh-56px)] max-w-2xl flex-col justify-center px-4 pb-24 pt-10 fade-in">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Who do you need?</h1>
      <p className="mt-2 text-muted">
        Describe the role or the team in your own words. We find the people who already work here and could do it — even if their CV uses different words.
      </p>

      <form
        className="mt-6"
        onSubmit={(e) => { e.preventDefault(); if (ready) onSubmit(); }}
      >
        <div className="rounded-xl border border-line bg-white shadow-sm focus-within:border-accent/50 focus-within:ring-4 focus-within:ring-accent/10">
          <textarea
            ref={ref}
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
            onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && ready) onSubmit(); }}
            rows={6}
            maxLength={6000}
            placeholder="e.g. We need a senior data engineer with GCP experience for an insurance client, available within two months. Spanish and English required."
            className="block w-full resize-none rounded-xl bg-transparent px-4 py-3.5 text-[15px] leading-relaxed outline-none placeholder:text-faint"
          />
          <div className="flex items-center justify-between border-t border-line px-3 py-2">
            <span className="text-xs text-faint">Any language · several roles at once is fine · Ctrl+Enter</span>
            <Button type="submit" disabled={!ready}>Find people <ArrowRight size={16} /></Button>
          </div>
        </div>
      </form>

      {error && <p className="mt-3 rounded-lg bg-bad-soft px-3 py-2 text-sm text-bad">{error}</p>}

      {meta && (
        <div className="mt-8">
          <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-faint"><Sparkles size={13} /> Try an example</div>
          <div className="flex flex-wrap gap-2">
            {meta.examples.map((ex) => (
              <button
                key={ex.id}
                title={`${ex.tests}\n\n${ex.brief}`}
                onClick={() => setBrief(ex.brief)}
                className="rounded-full border border-line bg-white px-3 py-1.5 text-sm text-ink hover:border-accent/40 hover:text-accent"
              >
                {ex.title}
              </button>
            ))}
          </div>
          <p className="mt-10 text-xs text-faint">
            {fmt.format(meta.profiles)} people · {fmt.format(meta.available_now)} available now · {fmt.format(meta.available_soon)} free within 3 months
            {!meta.ai && " · AI is not configured: basic interpretation only"}
          </p>
        </div>
      )}
    </div>
  );
}
