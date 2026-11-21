import type {
  BriefSpec,
  Candidate,
  Explanation,
  InterpretResponse,
  Meta,
  Project,
  ProjectCreate,
  ProjectUpdate,
  RoleSpec,
  SearchResponse,
  TeamOptionId,
  TeamReview,
  TeamShape,
} from "./types";

async function call<T>(
  path: string,
  body?: unknown,
  signal?: AbortSignal,
  method?: "GET" | "POST" | "PUT" | "DELETE",
): Promise<T> {
  const m = method ?? (body === undefined ? "GET" : "POST");
  const res = await fetch(path, {
    method: m,
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

async function errorText(res: Response): Promise<string> {
  try {
    const j = await res.json();
    if (typeof j.detail === "string") return j.detail;
  } catch {
    /* keep default */
  }
  return `Request failed (${res.status})`;
}

/** Recorded audio -> text (ElevenLabs speech-to-text, via our server). */
async function transcribe(audio: Blob): Promise<{ text: string; language?: string }> {
  const res = await fetch("/api/transcribe", { method: "POST", headers: { "Content-Type": audio.type || "audio/webm" }, body: audio });
  if (!res.ok) throw new Error(await errorText(res));
  return res.json();
}

/** Text -> MP3 (ElevenLabs text-to-speech, via our server). */
async function speak(text: string, signal?: AbortSignal): Promise<Blob> {
  const res = await fetch("/api/speak", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }), signal });
  if (!res.ok) throw new Error(await errorText(res));
  return res.blob();
}

export interface SearchOptions {
  team_shape?: TeamShape | null;
  locks?: Record<string, string>;
  option?: TeamOptionId;
}

export const api = {
  meta: () => call<Meta>("/api/meta"),
  interpret: (brief: string, signal?: AbortSignal) => call<InterpretResponse>("/api/interpret", { brief }, signal),
  search: (spec: BriefSpec, opts?: SearchOptions, signal?: AbortSignal) =>
    call<SearchResponse>("/api/search", { spec, limit: 10, ...(opts ?? {}) }, signal),
  explain: (role: RoleSpec, employee_id: string) => call<Explanation>("/api/explain", { role, employee_id }),
  candidate: (role: RoleSpec, employee_id: string) => call<Candidate>("/api/candidate", { role, employee_id }),
  teamReview: (team: unknown[]) => call<TeamReview>("/api/team-review", { team }),
  transcribe,
  speak,
  projects: {
    list: () => call<Project[]>("/api/projects"),
    get: (id: string) => call<Project>(`/api/projects/${encodeURIComponent(id)}`),
    create: (data: ProjectCreate) => call<Project>("/api/projects", data, undefined, "POST"),
    update: (id: string, patch: ProjectUpdate) =>
      call<Project>(`/api/projects/${encodeURIComponent(id)}`, patch, undefined, "PUT"),
    delete: (id: string) =>
      call<{ ok: boolean; id: string }>(`/api/projects/${encodeURIComponent(id)}`, undefined, undefined, "DELETE"),
  },
};
