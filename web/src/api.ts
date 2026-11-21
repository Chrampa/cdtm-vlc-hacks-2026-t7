import type { BriefSpec, Candidate, Explanation, InterpretResponse, Meta, RoleSpec, SearchResponse, TeamReview } from "./types";

async function call<T>(path: string, body?: unknown, signal?: AbortSignal): Promise<T> {
  const res = await fetch(path, {
    method: body === undefined ? "GET" : "POST",
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal,
  });
  if (!res.ok) {
    let msg = `Request failed (${res.status})`;
    try {
      const j = await res.json();
      if (typeof j.detail === "string") msg = j.detail;
    } catch {
      /* keep default */
    }
    throw new Error(msg);
  }
  return res.json() as Promise<T>;
}

export const api = {
  meta: () => call<Meta>("/api/meta"),
  interpret: (brief: string, signal?: AbortSignal) => call<InterpretResponse>("/api/interpret", { brief }, signal),
  search: (spec: BriefSpec, signal?: AbortSignal) => call<SearchResponse>("/api/search", { spec, limit: 10 }, signal),
  explain: (role: RoleSpec, employee_id: string) => call<Explanation>("/api/explain", { role, employee_id }),
  candidate: (role: RoleSpec, employee_id: string) => call<Candidate>("/api/candidate", { role, employee_id }),
  teamReview: (team: unknown[]) => call<TeamReview>("/api/team-review", { team }),
};
