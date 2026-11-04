/**
 * Session proxy. The refresh token lives only in an HttpOnly cookie on THIS site's domain and never
 * reaches browser JavaScript; the browser keeps just a short-lived access token in memory.
 * A first-party cookie also avoids the third-party cookie blocking that breaks Safari.
 */
import { NextResponse, type NextRequest } from "next/server";

const API = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const COOKIE = "docsage_rt";
const MAX_AGE = 60 * 60 * 24 * 7;
const ACTIONS = new Set(["login", "register", "refresh", "logout"]);

// A sleeping free-tier API can take a while to wake up.
export const maxDuration = 60;

function clientIp(request: NextRequest): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "";
}

async function callApi(path: string, request: NextRequest, body: unknown): Promise<Response> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const secret = process.env.BFF_SECRET;
  const ip = clientIp(request);
  if (secret && ip) {
    // Lets the API rate-limit the real visitor instead of this server.
    headers["X-BFF-Secret"] = secret;
    headers["X-Client-IP"] = ip;
  }
  return fetch(`${API}/api/auth/${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(55_000),
    cache: "no-store",
  });
}

function setSession(res: NextResponse, refreshToken: string) {
  res.cookies.set(COOKIE, refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/session",
    maxAge: MAX_AGE,
  });
}

function clearSession(res: NextResponse) {
  res.cookies.set(COOKIE, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/api/session", maxAge: 0 });
}

const noStore = { "Cache-Control": "no-store" };

export async function POST(request: NextRequest, { params }: { params: Promise<{ action: string }> }) {
  const { action } = await params;
  if (!ACTIONS.has(action)) return NextResponse.json({ detail: "Not found" }, { status: 404 });

  // CSRF: only our own pages can send this header, and a cross-site page cannot add it without CORS.
  const origin = request.headers.get("origin");
  if (request.headers.get("x-docsage") !== "1" || (origin && origin !== request.nextUrl.origin)) {
    return NextResponse.json({ detail: "Forbidden" }, { status: 403, headers: noStore });
  }

  const cookieToken = request.cookies.get(COOKIE)?.value;

  if (action === "logout") {
    if (cookieToken) await callApi("logout", request, { refresh_token: cookieToken }).catch(() => undefined);
    const res = new NextResponse(null, { status: 204, headers: noStore });
    clearSession(res);
    return res;
  }

  let body: unknown;
  if (action === "refresh") {
    // 204 (not 401) for visitors who simply are not signed in, so their console stays clean.
    if (!cookieToken) return new NextResponse(null, { status: 204, headers: noStore });
    body = { refresh_token: cookieToken };
  } else {
    body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") return NextResponse.json({ detail: "Invalid request" }, { status: 400, headers: noStore });
  }

  let upstream: Response;
  try {
    upstream = await callApi(action, request, body);
  } catch {
    // The API is unreachable or waking up. Keep the cookie: this is not a sign-out.
    return NextResponse.json({ detail: "The server is not reachable right now. Please try again." }, { status: 502, headers: noStore });
  }

  const data = await upstream.json().catch(() => ({}));
  if (!upstream.ok) {
    const res = NextResponse.json(data, { status: upstream.status, headers: noStore });
    if (action === "refresh" && upstream.status === 401) clearSession(res); // the session really is over
    return res;
  }

  const res = NextResponse.json({ access_token: data.access_token, expires_in: data.expires_in }, { headers: noStore });
  setSession(res, data.refresh_token);
  return res;
}
