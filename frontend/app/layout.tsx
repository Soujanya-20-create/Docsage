import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Geist_Mono, Plus_Jakarta_Sans } from "next/font/google";
import Script from "next/script";
import { AuthProvider } from "@/lib/auth";
import { site } from "@/lib/site";
import "./globals.css";

const sans = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-geist", display: "swap" });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono", display: "swap" });

const title = `${site.name}: ${site.tagline}`;

export const metadata: Metadata = {
  // Vercel provides the production domain; it makes the share image URL absolute.
  metadataBase: new URL(
    process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000",
  ),
  title: { default: title, template: `%s | ${site.name}` },
  description: site.description,
  applicationName: site.name,
  openGraph: { title, description: site.description, siteName: site.name, type: "website" },
  twitter: { card: "summary_large_image", title, description: site.description },
};

export const viewport: Viewport = { themeColor: "#f3f5ff" };

// Applies a saved light/dark choice before first paint so there is no flash.
const THEME_SCRIPT = `try{var t=JSON.parse(localStorage.getItem("docsage:prefs")||"{}").theme;document.documentElement.dataset.theme=t==="dark"||t==="system"?t:"light"}catch(e){}`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`} data-theme="light" suppressHydrationWarning>
      <body>
        <Script id="theme-init" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
