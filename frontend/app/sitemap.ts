import type { MetadataRoute } from "next";

const base = process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000";
const pages = ["", "/features", "/how-it-works", "/security", "/contact", "/terms", "/privacy", "/cookies", "/login", "/register"];

export default function sitemap(): MetadataRoute.Sitemap {
  return pages.map((p) => ({ url: `${base}${p}`, changeFrequency: "monthly", priority: p === "" ? 1 : 0.6 }));
}
