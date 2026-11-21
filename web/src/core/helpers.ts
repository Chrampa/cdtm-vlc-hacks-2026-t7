import type { Candidate, Evidence, ReqResult } from "../types";

export const fmt = new Intl.NumberFormat("en-US");

export function initials(name: string) {
  const p = name.split(" ").filter(Boolean);
  return ((p[0]?.[0] ?? "") + (p[1]?.[0] ?? "")).toUpperCase();
}
export const first = (name: string) => name.split(" ")[0];

const AV_BG = ["#DCEFE9", "#F9E4D4", "#E3E6F8", "#F6E7B8", "#E9DFF3", "#DDEBF6", "#F3E1E7", "#E4EEDC"];
const AV_FG = ["#0B5D51", "#8A4316", "#2F3E8F", "#7A5A0B", "#5B3A84", "#1E5C86", "#8C2F52", "#3E6427"];
/** A stable colour per person, so the same face looks the same everywhere. */
export function avatarColors(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return { bg: AV_BG[h % AV_BG.length], fg: AV_FG[h % AV_FG.length] };
}

export function parseSkill(line: string): { name: string; level: number; years: string } | null {
  const m = line.match(/^(.+?) — level (\d)\/5, ([\d.]+ (?:years?|months))/);
  return m ? { name: m[1], level: Number(m[2]), years: m[3] } : null;
}

/** Compact evidence for tight cells. */
export function shortLine(line: string): string {
  const s = parseSkill(line);
  if (s) return `${s.name} · ${s.level}/5 · ${s.years.replace(" years", " yrs").replace(" year", " yr")}`;
  if (line.startsWith("Main sector")) return "Main sector";
  const p = line.match(/^(\d+) projects? for .* \(latest (\d{4})\)/);
  if (p) return `${p[1]} project${p[1] === "1" ? "" : "s"} · ${p[2]}`;
  if (line.startsWith("Worked at")) return line.replace("Worked at ", "Worked at ");
  if (line.startsWith("Certified: ")) return "Certified";
  const l = line.match(/^(\w+) (A1|A2|B1|B2|C1|C2|Nativo) \(needs/);
  if (l) return `${l[1]} ${l[2]}`;
  return line.length > 30 ? line.slice(0, 29) + "…" : line;
}

function sectorName(r: ReqResult): string | null {
  const l = r.lines[0] ?? "";
  const m = l.match(/Main sector is (.+)$/) || l.match(/for (.+?) clients/);
  return m ? m[1] : null;
}

/** One plain sentence an HR reader can repeat, built only from computed coverage. */
export function whyLine(c: Candidate): string {
  const must = c.requirements.filter((r) => r.importance === "must" && r.status !== "unknown");
  const cov = must.filter((r) => r.status === "covered");
  const skill = cov.map((r) => parseSkill(r.lines[0] ?? "")).find(Boolean);
  const sector = c.requirements.find((r) => r.kind === "sector" && r.status === "covered");
  const gap = must.find((r) => r.status !== "covered");
  let out = skill ? `${skill.name} at ${skill.level}/5 for ${skill.years}` : cov.length ? `Shows ${cov.slice(0, 2).map((r) => r.label.toLowerCase()).join(" and ")}` : "Partly matches";
  const sn = sector ? sectorName(sector) : null;
  if (sn) out += `, ${sn.toLowerCase()} background`;
  out += gap ? `. Check ${gap.label.toLowerCase()}.` : ". Covers every must-have.";
  return out;
}

export const statusWord = (s: string) => (s === "covered" ? "Shown" : s === "partial" ? "Partly shown" : s === "missing" ? "Not shown" : "Can't be checked");

export function cited(text: string): ({ t: string } | { id: string })[] {
  return text.split(/(\[[A-Z]\d{1,3}\])/g).filter(Boolean).map((s) => {
    const m = s.match(/^\[([A-Z]\d{1,3})\]$/);
    return m ? { id: m[1] } : { t: s };
  });
}
export function citedOnce(text: string) {
  const seen = new Set<string>();
  return cited(text).filter((p) => ("t" in p ? true : seen.has(p.id) ? false : (seen.add(p.id), true)));
}

/** Human label for an evidence id within one candidate's evidence list. */
export function evLabel(ev: Evidence[], id: string): string {
  const e = ev.find((x) => x.id === id);
  if (!e) return id;
  if (e.type === "skill") return e.name ?? id;
  if (e.type === "project") return `Project ${e.text.match(/(20\d\d)/)?.[1] ?? ""}`.trim();
  if (e.type === "job") return e.text.split(" at ")[1]?.replace(/\s*\([^()]*\)$/, "") ?? "Job";
  if (e.type === "language") return e.text;
  if (e.type === "cert") return "Certificate";
  return "Profile";
}

/** Footnote ordering: unique ids in order of first citation. */
export function footnoteIds(...texts: (string | undefined)[]): string[] {
  const ids: string[] = [];
  for (const t of texts) if (t) for (const p of cited(t)) if ("id" in p && !ids.includes(p.id)) ids.push(p.id);
  return ids;
}

export function hiddenReasons(c: Candidate): string[] {
  const r: string[] = [];
  if (c.other_team) r.push(`Works as ${c.role}, not the team that usually does this role`);
  if (c.hidden_sector) r.push(`Has the sector experience outside their main sector (${c.sector})`);
  if (c.keyword_hit === false) r.push("A keyword search for the brief’s terms would not find this person");
  return r;
}

/** Talent found outside the obvious places: another team, or sector experience outside the main sector. */
export const outside = (c: Candidate) => c.other_team || c.hidden_sector;

export const teamLabel = (role: string) => role.replace(/\s*\(.*\)$/, "").replace(/ (Engineer|Developer|Consultant|Analyst|Specialist|Manager)$/, "");

// ------------------------------------------------------------ plain-language helpers for HR
export type Tone = "good" | "ok" | "warn" | "bad";

/** A word an HR reader understands instead of a bare percentage. */
export function fitWord(fit: number): { word: string; tone: Tone } {
  if (fit >= 85) return { word: "Strong", tone: "good" };
  if (fit >= 70) return { word: "Good", tone: "ok" };
  if (fit >= 55) return { word: "Fair", tone: "warn" };
  return { word: "Weak", tone: "bad" };
}

export const toneColor: Record<Tone, string> = {
  good: "var(--v-good)",
  ok: "var(--v-good)",
  warn: "var(--v-warn)",
  bad: "var(--v-bad)",
};

export function availText(code: number, short = false): string {
  if (code === 0) return short ? "Free now" : "Available now";
  if (code === 1) return short ? "Free < 3 mo" : "Free within 3 months";
  return short ? "On a project" : "Currently on a project";
}

/** Must-haves the profile does not (fully) show. */
export function mustGaps(c: Candidate): ReqResult[] {
  return c.requirements.filter((r) => r.importance === "must" && (r.status === "missing" || r.status === "partial"));
}

/** Must-haves first, then fit, then people free sooner. */
export function rankCandidates(list: Candidate[]): Candidate[] {
  return [...list].sort(
    (a, b) =>
      b.must_covered / Math.max(1, b.must_total) - a.must_covered / Math.max(1, a.must_total) ||
      b.fit - a.fit ||
      a.availability_code - b.availability_code,
  );
}

export const OPTION_NAME: Record<string, string> = {
  best_fit: "Recommended",
  ready_now: "Everyone free now",
  leanest: "Fewer seniors",
};

const RULE_TEXT: Record<string, { breaks: string; fixes: string }> = {
  anchor: { breaks: "No Lead left on the team", fixes: "Adds a Lead to the team" },
  "senior cap": { breaks: "Too many seniors", fixes: "Better seniority balance" },
  mid: { breaks: "No Mid-level left", fixes: "Adds a Mid-level" },
  junior: { breaks: "No junior left", fixes: "Adds a mentored junior" },
  language: { breaks: "No shared language", fixes: "Restores a shared language" },
  timezone: { breaks: "Time zones too far apart", fixes: "Time zones closer together" },
};

/** Turn the solver's swap impact codes into short plain trade-offs. */
export function plainImpacts(sw: { fit_delta: number; bench_delta: number; impact: string[] }): { good: boolean; text: string }[] {
  const out: { good: boolean; text: string }[] = [];
  if (sw.fit_delta > 0) out.push({ good: true, text: `Team match +${sw.fit_delta}%` });
  if (sw.fit_delta < 0) out.push({ good: false, text: `Team match ${sw.fit_delta}%` });
  if (sw.bench_delta > 0) out.push({ good: true, text: "Free now" });
  if (sw.bench_delta < 0) out.push({ good: false, text: "Not free for up to 3 months" });
  for (const imp of sw.impact) {
    const br = imp.match(/^Breaks (.+)$/);
    const fx = imp.match(/^Fixes (.+)$/);
    const plus = imp.match(/^\+(\d+) (.+)$/);
    const drops = imp.match(/^Drops (.+)$/);
    if (br) out.push({ good: false, text: RULE_TEXT[br[1]]?.breaks ?? `Breaks ${br[1]}` });
    else if (fx) out.push({ good: true, text: RULE_TEXT[fx[1]]?.fixes ?? `Fixes ${fx[1]}` });
    else if (plus) out.push({ good: true, text: `Adds ${plus[2].toLowerCase()}` });
    else if (drops) out.push({ good: false, text: `Loses ${drops[1].toLowerCase()}` });
  }
  return out;
}

export function copyText(text: string): Promise<void> {
  if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.style.position = "fixed";
  ta.style.opacity = "0";
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand("copy");
  } finally {
    document.body.removeChild(ta);
  }
  return Promise.resolve();
}
