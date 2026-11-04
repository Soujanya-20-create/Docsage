const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export type User = { id: number; email: string; name: string; email_verified: boolean };
export type Doc = {
  id: number;
  filename: string;
  kind: "pdf" | "image";
  size: number;
  status: "processing" | "ready" | "failed";
  error: string | null;
  pages: number;
  chunk_count: number;
  created_at: string;
};
/** Countdown values (seconds) returned when a one-time code is sent. */
export type OtpTiming = { expires_in: number; resend_in: number };

export type Stats = {
  totals: { documents: number; ready: number; pages: number; passages: number; chats: number; questions: number; storage_bytes: number };
  quota: { max_documents: number; max_storage_mb: number };
  by_status: Record<string, number>;
  by_kind: Record<string, number>;
  activity: { date: string; questions: number; uploads: number }[];
  top_documents: { filename: string; citations: number }[];
  recent_documents: { id: number; filename: string; kind: string; status: string; pages: number; created_at: string }[];
  recent_chats: { id: number; title: string; questions: number; created_at: string }[];
};

export type Chunk = { id: number; page: number; position: number; text: string };
export type Chat = { id: number; title: string; created_at: string };
export type Source = { n: number; document_id: number; filename: string; page: number; excerpt: string };
export type Message = { id: number; role: "user" | "assistant"; content: string; sources: Source[] };

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/* ---- session ---------------------------------------------------------------------------------
 * The access token is kept in memory only (never localStorage), so a script injected into the page
 * cannot read a long-lived credential. The refresh token is an HttpOnly cookie handled by
 * /api/session/*, which signs the user back in after a reload.
 */
let accessToken: string | null = null;
let expiresAt = 0;
let refreshing: Promise<RefreshResult> | null = null;

export type RefreshResult = "ok" | "none" | "error";

function remember(data: { access_token: string; expires_in: number }) {
  accessToken = data.access_token;
  expiresAt = Date.now() + data.expires_in * 1000;
}

export function forgetSession() {
  accessToken = null;
  expiresAt = 0;
}

async function errorFrom(res: Response): Promise<ApiError> {
  let message = res.statusText || "Something went wrong";
  try {
    const body = await res.json();
    const detail = body.detail;
    message =
      typeof detail === "string" ? detail : Array.isArray(detail) ? String(detail[0]?.msg ?? message).replace(/^Value error, /, "") : message;
  } catch {}
  return new ApiError(res.status, message);
}

async function session(action: string, body?: unknown): Promise<Response> {
  return fetch(`/api/session/${action}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-DocSage": "1" },
    body: body === undefined ? undefined : JSON.stringify(body),
    credentials: "same-origin",
  });
}

/** Trade the refresh cookie for a new access token. "none" = signed out, "error" = could not reach the server. */
export function restoreSession(): Promise<RefreshResult> {
  refreshing ??= (async (): Promise<RefreshResult> => {
    try {
      const res = await session("refresh");
      if (res.status === 204) {
        forgetSession();
        return "none"; // no session cookie: simply not signed in
      }
      if (res.ok) {
        remember(await res.json());
        return "ok";
      }
      if (res.status === 401) {
        forgetSession();
        return "none";
      }
      return "error";
    } catch {
      return "error";
    } finally {
      setTimeout(() => (refreshing = null), 0);
    }
  })();
  return refreshing;
}

export async function authenticate(action: "login" | "register", body: Record<string, unknown>): Promise<void> {
  const res = await session(action, body);
  if (!res.ok) throw await errorFrom(res);
  remember(await res.json());
}

export async function endSession(): Promise<void> {
  forgetSession();
  await session("logout").catch(() => undefined);
}

/** fetch with the bearer token attached; renews an expiring token first and retries once on a 401. */
async function authedFetch(path: string, init: RequestInit = {}): Promise<Response> {
  if (!accessToken || expiresAt - Date.now() < 20_000) {
    const state = await restoreSession();
    if (state === "error") throw new ApiError(503, "The server is not reachable right now. Please try again.");
  }
  const send = () => {
    const headers = new Headers(init.headers);
    if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
    return fetch(`${BASE}/api${path}`, { ...init, headers });
  };
  let res = await send();
  if (res.status === 401 && (await restoreSession()) === "ok") res = await send();
  return res;
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !(init.body instanceof FormData)) headers.set("Content-Type", "application/json");
  const res = await authedFetch(path, { ...init, headers });
  if (!res.ok) throw await errorFrom(res);
  return res.status === 204 ? (undefined as T) : res.json();
}

export const json = (data: unknown, method = "POST"): RequestInit => ({ method, body: JSON.stringify(data) });

/** Calls that need no session: password reset and email confirmation links. */
export async function publicApi<T = void>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}/api${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await errorFrom(res);
  return res.status === 204 ? (undefined as T) : res.json();
}

type AskHandlers = {
  onSources: (sources: Source[]) => void;
  onToken: (text: string) => void;
};

/** POST a question and read the Server-Sent Events answer as it streams in. */
export async function ask(chatId: number, question: string, handlers: AskHandlers, signal?: AbortSignal, documentIds?: number[]) {
  const res = await authedFetch(`/chats/${chatId}/ask`, {
    ...json({ question, document_ids: documentIds?.length ? documentIds : null }),
    headers: { "Content-Type": "application/json" },
    signal,
  });
  if (!res.ok || !res.body) throw await errorFrom(res);

  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) return;
    buffer += value;
    let end: number;
    while ((end = buffer.indexOf("\n\n")) !== -1) {
      const block = buffer.slice(0, end);
      buffer = buffer.slice(end + 2);
      const name = /^event: (.*)$/m.exec(block)?.[1];
      const data = JSON.parse(/^data: (.*)$/m.exec(block)?.[1] ?? "null");
      if (name === "sources") handlers.onSources(data);
      else if (name === "token") handlers.onToken(data);
      else if (name === "error") throw new Error(data);
    }
  }
}
