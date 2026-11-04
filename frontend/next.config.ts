import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

// The browser talks to the API directly, so it must be allowed in connect-src.
function apiOrigin(): string {
  try {
    return new URL(process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000").origin;
  } catch {
    return "";
  }
}

// Next.js emits small inline scripts for hydration, so script-src needs 'unsafe-inline' unless every page is
// rendered per request with a nonce. The rest of the policy still blocks framing, plugins, foreign form
// targets, foreign scripts and outbound calls to anywhere except this site and the API.
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  `connect-src 'self' ${apiOrigin()}`.trim(),
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isProd ? ["upgrade-insecure-requests"] : []),
].join("; ");

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Pin the workspace root so a stray lockfile higher up the tree is not picked instead.
  turbopack: { root: __dirname },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          ...(isProd ? [{ key: "Content-Security-Policy", value: csp }] : []),
          ...(isProd ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }] : []),
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(self), geolocation=()" }, // the composer's voice input needs the mic
        ],
      },
    ];
  },
};

export default nextConfig;
