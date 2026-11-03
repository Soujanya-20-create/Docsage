const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const KEY = "docsage.tokens";

export type Tokens = { access_token: string; refresh_token: string };
export type User = { id: number; email: string; name: string };
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
export type Chunk = { id: number; page: number; position: number; text: string };
export type Chat = { id: number; title: string; created_at: string };
export type Source = { n: number; document_id: number; filename: string; page: number; excerpt: string };
export type Message = { id: number; role: "user" | "assistant"; content: string; sources: Source[] };

export const tokens = {
  get(): Tokens | null {
    try {
      return JSON.parse(localStorage.getItem(KEY) ?? "null");
    } catch {
      return null;
    }
  },
  set(value: Tokens) {
    localStorage.setItem(KEY, JSON.stringify(value));
  },
  clear() {
    localStorage.removeItem(KEY);
  },
};

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function errorFrom(res: Response): Promise<ApiError> {
  let message = res.statusText;
  try {
    const body = await res.json();
    const detail = body.detail;
    message = typeof detail === "string" ? detail : Array.isArray(detail) ? detail[0]?.msg ?? message : message;
  } catch {}
  return new ApiError(res.status, message);
}

let refreshing: Promise<boolean> | null = null;

async function refreshTokens(): Promise<boolean> {
  const current = tokens.get();
  if (!current) return false;
  refreshing ??= fetch(`${BASE}/api/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: current.refresh_token }),
  })
    .then(async (res) => {
      if (!res.ok) return false;
      tokens.set(await res.json());
      return true;
    })
    .catch(() => false)
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

/** fetch with the bearer token attached; retries once after refreshing an expired token. */
async function authedFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const send = () => {
    const headers = new Headers(init.headers);
    const access = tokens.get()?.access_token;
    if (access) headers.set("Authorization", `Bearer ${access}`);
    return fetch(`${BASE}/api${path}`, { ...init, headers });
  };
  let res = await send();
  if (res.status === 401 && (await refreshTokens())) res = await send();
  return res;
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !(init.body instanceof FormData)) headers.set("Content-Type", "application/json");
  const res = await authedFetch(path, { ...init, headers });
  if (!res.ok) throw await errorFrom(res);
  return res.status === 204 ? (undefined as T) : res.json();
}

export const json = (data: unknown): RequestInit => ({ method: "POST", body: JSON.stringify(data) });

export async function signIn(path: "login" | "register", body: Record<string, string>) {
  const res = await fetch(`${BASE}/api/auth/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await errorFrom(res);
  tokens.set(await res.json());
}

type AskHandlers = {
  onSources: (sources: Source[]) => void;
  onToken: (text: string) => void;
};

/** POST a question and read the Server-Sent Events answer as it streams in. */
export async function ask(chatId: number, question: string, handlers: AskHandlers, signal?: AbortSignal) {
  const res = await authedFetch(`/chats/${chatId}/ask`, {
    ...json({ question }),
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
