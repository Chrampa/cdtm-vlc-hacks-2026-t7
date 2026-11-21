export type Importance = "must" | "nice";
export type Kind = "skill" | "sector" | "language" | "certification" | "soft";
export type Match = "exact" | "equivalent" | "related" | "transferable";
export type Availability = "now" | "soon" | "any";
export type SeniorityMode = "target" | "min";
export type TeamScope = "all" | "at_least";
export type TeamOptionId = "best_fit" | "ready_now" | "leanest";
export type TeamRoleBadge = "anchor" | "builder" | "learner";

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

export interface TeamNeed {
  id: string;
  label: string;
  kind: Kind;
  scope: TeamScope;
  min_people: number;
  importance: Importance;
  implicit: boolean;
  reason: string | null;
  skills: SkillRef[];
  certs: string[];
  sector: string | null;
  language: string | null;
  min_level: string | null;
  soft: string[];
  unmapped?: boolean;
}

export interface TeamShape {
  enabled: boolean;
  anchors_min: number;
  max_senior_plus_ratio: number;
  min_mid: number;
  min_junior: number;
  mentor_juniors: boolean;
  prefer_shared_language: boolean;
  max_tz_spread: number;
  avoid_duplicates: boolean;
}

export interface RoleSpec {
  id: string;
  title: string;
  count: number;
  seniority_min: string | null;
  seniority_mode?: SeniorityMode;
  min_years: number | null;
  availability: Availability;
  countries: string[];
  mobility_required: boolean;
  target_roles: TargetRole[];
  requirements: Requirement[];
}

export interface BriefSpec {
  title: string;
  summary: string;
  roles: RoleSpec[];
  team_needs?: TeamNeed[];
}

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
  seniority_check: { required: string; mode?: SeniorityMode; actual: string; status: string; overqualified?: boolean } | null;
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

export interface SwapCandidate extends Lite {
  position: string;
  area: string;
  availability_code: number;
  must_covered: number;
  must_total: number;
}

export interface TeamSwap {
  candidate: SwapCandidate;
  fit_delta: number;
  bench_delta: number;
  tz_delta: number;
  impact: string[];
}

export interface TeamMentor {
  slot_id: string;
  slot_label: string;
  employee_id: string;
  name: string;
  role: string;
  seniority: string;
}

export interface TeamMember {
  slot_id: string;
  role_id: string;
  slot_label: string;
  team_role: TeamRoleBadge;
  mentor: TeamMentor | null;
  locked: boolean;
  candidate: Candidate | null;
  swaps: TeamSwap[];
}

export interface TeamShapeCheck {
  rule: string;
  label: string;
  ok: boolean;
  detail: string;
}

export interface TeamNeedResult {
  id: string;
  label: string;
  scope: TeamScope;
  importance: Importance;
  implicit: boolean;
  reason: string | null;
  target: number;
  covered: number;
  ok: boolean;
  members: string[];
}

export interface TeamOption {
  id: TeamOptionId;
  label: string;
  tagline: string;
  slots_total: number;
  slots_filled: number;
  avg_fit: number;
  ready_now_count: number;
  ready_by: string;
  shape: {
    counts: { anchor: number; senior: number; mid: number; junior: number };
    summary: string;
    balanced: boolean;
    checks: TeamShapeCheck[];
  };
  team_needs: TeamNeedResult[];
  shared_languages: string[];
  tz_spread_hours: number;
  tz_summary: string;
  members: TeamMember[];
}

export interface TeamData {
  slots: number;
  filled: number;
  avg_fit: number;
  greedy_avg_fit: number;
  gain_vs_greedy: number;
  active_option: TeamOptionId;
  shape: TeamShape;
  locks: Record<string, string>;
  options: TeamOption[];
}

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
  team: TeamData | null;
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
  projects_count?: number;
  models: Record<string, string>;
  examples: Example[];
}

export type ProjectStatus = "draft" | "active" | "staffed" | "archived";

export interface ProjectMember {
  slot_id: string;
  role_id: string;
  slot_label: string;
  employee_id: string;
  name: string;
  role: string;
  position: string;
  area: string;
  seniority: string;
  location: string;
  availability: string;
  availability_code: number;
  fit: number;
  team_role: TeamRoleBadge;
  mentor_name: string | null;
}

export interface ProjectStats {
  slots_total: number;
  slots_filled: number;
  avg_fit: number;
  ready_by: string;
  shape_summary: string;
  shared_languages: string[];
  tz_summary: string;
}

export interface ProjectCreate {
  title: string;
  client?: string;
  status?: ProjectStatus;
  notes?: string;
  brief?: string;
  spec: BriefSpec;
  team_shape?: TeamShape | null;
  team_option?: TeamOptionId;
  locks?: Record<string, string>;
  members?: ProjectMember[];
  stats?: ProjectStats | null;
}

export interface ProjectUpdate {
  title?: string;
  client?: string;
  status?: ProjectStatus;
  notes?: string;
  brief?: string;
  spec?: BriefSpec;
  team_shape?: TeamShape | null;
  team_option?: TeamOptionId;
  locks?: Record<string, string>;
  members?: ProjectMember[];
  stats?: ProjectStats | null;
}

export interface Project {
  id: string;
  title: string;
  client: string;
  status: ProjectStatus;
  notes: string;
  brief: string;
  spec: BriefSpec;
  team_shape: TeamShape | null;
  team_option: TeamOptionId;
  locks: Record<string, string>;
  members: ProjectMember[];
  stats: ProjectStats | null;
  created_at: string;
  updated_at: string;
}

