import raw from "./snapshot.json";

export interface DReq { label: string; importance: "must" | "nice"; status: "covered" | "partial" | "missing" | "unknown"; line: string }
export interface DCand {
  employee_id: string; name: string; position: string; role: string; area: string; location: string;
  availability: string; availability_code: number; years: number; seniority: string; fit: number;
  must_covered: number; must_total: number; other_team: boolean; keyword_hit: boolean | null; sector: string;
  strengths: string[]; gaps: string[]; requirements: DReq[]; risks: string[];
}
export interface DEvidence { id: string; type: string; text: string; name?: string | null; level?: number | string | null; years?: number | null; used_in?: string[] | null }

export const snap = raw as unknown as {
  brief: string; title: string; summary: string; role_title: string; availability: string;
  requirements: { label: string; importance: "must" | "nice"; implicit: boolean; reason: string | null; means: string[] }[];
  funnel: { label: string; count: number }[];
  keyword: { terms: string[]; count: number; missed_in_top: number };
  total_shown: number;
  candidates: DCand[];
  detail: {
    employee_id: string; evidence: DEvidence[];
    requirements: { label: string; importance: string; status: string; lines: string[]; evidence: string[] }[];
    explanation: { summary: string; verify: string[]; verdict: string; removed: number };
    risks: string[];
  };
  team: {
    title: string; stats: { slots: number; filled: number; avg_fit: number };
    roles: { title: string; count: number; people: { name: string; position: string; fit: number; availability: string; availability_code: number; must: string }[]; complement: { name: string; role: string; covers: string[] } | null }[];
  };
};

export const top = snap.candidates[0];
export const fmt = new Intl.NumberFormat("en-US");

export function initials(name: string) {
  const p = name.split(" ");
  return (p[0][0] + (p[1]?.[0] ?? "")).toUpperCase();
}

/** Split "text [S6] more [P1]" into text and citation parts. */
export function cited(text: string): ({ t: string } | { id: string })[] {
  return text.split(/(\[[A-Z]\d{1,3}\])/g).filter(Boolean).map((s) => {
    const m = s.match(/^\[([A-Z]\d{1,3})\]$/);
    return m ? { id: m[1] } : { t: s };
  });
}

/** Like cited(), but each source is shown only the first time it is cited. */
export function citedOnce(text: string): ({ t: string } | { id: string })[] {
  const seen = new Set<string>();
  return cited(text).filter((p) => ("t" in p ? true : seen.has(p.id) ? false : (seen.add(p.id), true)));
}

const evIndex = Object.fromEntries(snap.detail.evidence.map((e) => [e.id, e]));

/** A human label for an evidence id: "BigQuery", "2022 claims project", "Atos", "Profile". */
export function evLabel(id: string): string {
  const e = evIndex[id];
  if (!e) return id;
  if (e.type === "skill") return e.name ?? id;
  if (e.type === "project") return `Project ${e.text.match(/(20\d\d)/)?.[1] ?? ""}`.trim();
  if (e.type === "job") return e.text.split(" at ")[1]?.split(" (")[0] ?? "Job";
  if (e.type === "language") return e.text;
  if (e.type === "cert") return "Certificate";
  return "Profile";
}
export function evType(id: string): string {
  return evIndex[id]?.type ?? "fact";
}
export const evidence = (id: string) => evIndex[id];

export const sources = (() => {
  // ordered unique ids cited in the explanation, for footnote numbering
  const ids: string[] = [];
  for (const t of [snap.detail.explanation.summary, ...snap.detail.explanation.verify]) {
    for (const p of cited(t)) if ("id" in p && !ids.includes(p.id)) ids.push(p.id);
  }
  return ids;
})();

export const hiddenLine = (c: DCand) => `Works as ${c.role}, not in Data Engineering`;

/** "BigQuery — level 4/5, 16 years, used in 1 job" → {name, level, years} */
export function parseSkill(line: string): { name: string; level: number; years: string } | null {
  const m = line.match(/^(.+?) — level (\d)\/5, ([\d.]+ (?:years?|months))/);
  return m ? { name: m[1], level: Number(m[2]), years: m[3] } : null;
}

/** Compact evidence for tight cells: "BigQuery · 4/5 · 16 yrs", "Main sector", "1 project · 2024". */
export function shortLine(line: string): string {
  const s = parseSkill(line);
  if (s) return `${s.name} · ${s.level}/5 · ${s.years.replace(" years", " yrs").replace(" year", " yr")}`;
  if (line.startsWith("Main sector")) return "Main sector";
  const p = line.match(/^(\d+) projects? for .* \(latest (\d{4})\)/);
  if (p) return `${p[1]} project${p[1] === "1" ? "" : "s"} · ${p[2]}`;
  if (line.startsWith("Worked at")) return line.replace("Worked at ", "Ex-");
  return line.length > 28 ? line.slice(0, 27) + "…" : line;
}

/** One plain sentence an HR reader can repeat. Built only from computed coverage. */
export function plainWhy(c: DCand): string {
  const cov = c.requirements.filter((r) => r.status === "covered" && r.importance === "must");
  const part = c.requirements.filter((r) => r.status === "partial");
  const s = cov.map((r) => parseSkill(r.line)).find(Boolean);
  const sector = cov.find((r) => /sector/i.test(r.label));
  let out = s ? `${s.name} at ${s.level}/5 for ${s.years}` : `Covers ${cov.length} must-haves`;
  if (sector) out += ", insurance background";
  out += part.length ? `. Check ${part[0].label.toLowerCase()}.` : ".";
  return out;
}

export const statusGlyph = (s: string) => (s === "covered" ? "●" : s === "partial" ? "◐" : "○");
export const statusWord = (s: string) => (s === "covered" ? "Shown" : s === "partial" ? "Partly shown" : "Not shown");
export const first = (name: string) => name.split(" ")[0];
