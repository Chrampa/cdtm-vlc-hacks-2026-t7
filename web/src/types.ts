export type Importance = "must" | "nice";
export type Kind = "skill" | "sector" | "language" | "certification" | "soft";
export type Match = "exact" | "equivalent" | "related" | "transferable";
export type Availability = "now" | "soon" | "any";

export interface SkillRef { name: string; match: Match }
export interface TargetRole { name: string; fit: number }

export interface Requirement {
  id: string;
  label: string;
  keyword: string;
  kind: Kind;
  importance: Importance;
  implicit: boolean;
  reason: string | null;
  skills: SkillRef[];
  certs: string[];
  sector: string | null;
  language: string | null;
  min_level: string | null;
  soft: string[];
  unmapped: boolean;
}

export interface RoleSpec {
  id: string;
  title: string;
  count: number;
  seniority_min: string | null;
  min_years: number | null;
  availability: Availability;
  countries: string[];
  mobility_required: boolean;
  target_roles: TargetRole[];
  requirements: Requirement[];
}

export interface BriefSpec { title: string; summary: string; roles: RoleSpec[] }

export interface InterpretResponse {
  spec: BriefSpec;
  ai_used: boolean;
  model: string | null;
  warnings: string[];
  seconds: number;
}

export interface ReqResult {
  id: string;
  label: string;
  importance: Importance;
  kind: Kind;
  implicit: boolean;
  status: "covered" | "partial" | "missing" | "unknown";
  score: number | null;
  evidence: string[];
  lines: string[];
}

export interface Evidence {
  id: string;
  type: "fact" | "project" | "job" | "skill" | "cert" | "language";
  text: string;
  name?: string;
  level?: number | string;
  years?: number;
  used_in?: string[];
  last_used?: number | null;
}

export interface Risk { text: string; evidence: string[]; severity: number }

export interface Candidate {
  employee_id: string;
  name: string;
  role: string;
  position: string;
  area: string;
  seniority: string;
  years: number;
  location: string;
  availability: string;
  availability_code: number;
  sector: string;
  fit: number;
  role_fit: number | null;
  must_covered: number;
  must_total: number;
  penalized: boolean;
  requirements: ReqResult[];
  strengths: string[];
  gaps: string[];
  risks: Risk[];
  seniority_check: { required: string; actual: string; status: string } | null;
  other_team: boolean;
  hidden_sector: boolean;
  keyword_hit: boolean | null;
  headline: string;
  proposed: boolean;
  evidence: Evidence[];
  soft_skills: string[];
  methodologies: string[];
  education: string[];
  summary: string;
}

export interface Lite { employee_id: string; name: string; role: string; seniority: string; availability: string; fit: number; location: string }

export interface RoleResult {
  id: string;
  title: string;
  count: number;
  funnel: { label: string; count: number }[];
  eligible: number;
  keyword: { terms: string[]; count: number | null; missed_in_top: number } | null;
  candidates: Candidate[];
  complement: { for: string; person: Lite; covers: string[]; gaps: string[] } | null;
}

export interface SearchResponse {
  roles: RoleResult[];
  team: { slots: number; filled: number; avg_fit: number; greedy_avg_fit: number; gain_vs_greedy: number } | null;
  multi: boolean;
  seconds: number;
}

export interface Explanation {
  ok: boolean;
  summary?: string | null;
  verdict?: "strong" | "good" | "partial" | "weak" | null;
  verify?: string[];
  removed_claims?: number;
  model?: string;
  seconds?: number;
  error?: string;
}

export interface TeamReview {
  ok: boolean;
  summary?: string;
  risks?: string[];
  suggestions?: string[];
  error?: string;
}

export interface Example { id: string; title: string; tests: string; brief: string }

export interface Meta {
  profiles: number;
  available_now: number;
  available_soon: number;
  ai: boolean;
  models: Record<string, string>;
  examples: Example[];
}
