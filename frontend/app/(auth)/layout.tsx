import Link from "next/link";
import { ArrowLeft, FileCheck2, LockKeyhole, Quote, ScanText, Sparkles } from "lucide-react";
import { Brand } from "@/components/Brand";

const points = [
  { icon: Quote, title: "Cited answers", text: "Every answer names the file and page it came from.", tone: "#8fb0ff" },
  { icon: ScanText, title: "PDFs and scans", text: "Searched by meaning and by exact words.", tone: "#c4a8ff" },
  { icon: LockKeyhole, title: "Private by default", text: "Delete your documents and account any time.", tone: "#7be0b5" },
];

const stats = [
  { value: "2×", label: "search modes" },
  { value: "3", label: "AI providers" },
  { value: "0", label: "files kept after indexing" },
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid h-[100dvh] overflow-hidden lg:grid-cols-[1.05fr_1fr]">
      {/* Left: what you are signing in to */}
      <aside className="auth-panel relative isolate hidden overflow-hidden text-white lg:flex lg:flex-col lg:justify-between lg:p-10 xl:p-14">
        <div aria-hidden className="absolute -left-24 top-1/3 -z-10 h-80 w-80 rounded-full bg-[#4f8bff]/40 blur-3xl" />
        <div aria-hidden className="absolute -right-16 -top-16 -z-10 h-72 w-72 rounded-full bg-[#b07cff]/45 blur-3xl" />
        <div aria-hidden className="absolute bottom-0 right-1/4 -z-10 h-64 w-64 rounded-full bg-[#27d3c0]/20 blur-3xl" />
        <div aria-hidden className="bg-grid absolute inset-0 -z-10 opacity-25 [--brand:#fff]" />

        <Link href="/" aria-label="DocSage home" className="inline-flex w-fit rounded-2xl bg-white/95 px-3 py-1.5 text-[#0c1330] shadow-lg">
          <Brand size={26} />
        </Link>

        <div className="my-6">
          <p className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur">
            <Sparkles className="h-3.5 w-3.5" strokeWidth={2} aria-hidden /> AI document analyst
          </p>
          <h2 className="mt-4 max-w-md text-4xl font-extrabold leading-[1.08] tracking-tight xl:text-[2.75rem]">
            Ask your documents.
            <span className="block bg-gradient-to-r from-[#bcd2ff] to-[#e0ccff] bg-clip-text text-transparent">Get answers you can check.</span>
          </h2>
          <ul className="mt-6 space-y-2.5">
            {points.map(({ icon: Icon, title, text, tone }) => (
              <li key={title} className="flex items-center gap-3.5 rounded-2xl border border-white/15 bg-white/10 p-3 backdrop-blur-md">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/15" style={{ color: tone }}>
                  <Icon className="h-5 w-5" strokeWidth={1.8} aria-hidden />
                </span>
                <span className="text-[0.9rem] leading-snug">
                  <strong className="block font-bold">{title}</strong>
                  <span className="text-white/75">{text}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* A compact sample answer; it only shows when the window is tall enough to stay clear of clipping. */}
        <div className="auth-demo rounded-2xl border border-white/20 bg-white/95 p-4 text-[#0c1330] shadow-2xl">
          <p className="text-xs font-semibold text-[#5b6785]">Sample question</p>
          <p className="mt-1 text-sm font-bold">When does this agreement renew?</p>
          <p className="mt-2 text-sm leading-relaxed text-[#35405f]">
            It renews for one-year terms unless either side gives written notice <strong>90 days</strong> before the term ends.
          </p>
          <p className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg bg-[#e9efff] px-2.5 py-1 text-xs font-semibold text-[#2554e8]">
            <Quote className="h-3 w-3" aria-hidden /> Services Agreement.pdf, p.11
          </p>
        </div>
        <dl className="auth-stats grid grid-cols-3 gap-3">
          {stats.map((s) => (
            <div key={s.label} className="rounded-2xl border border-white/15 bg-white/10 px-3 py-2.5 backdrop-blur-md">
              <dt className="text-2xl font-extrabold leading-none">{s.value}</dt>
              <dd className="mt-1 text-xs text-white/70">{s.label}</dd>
            </div>
          ))}
        </dl>
      </aside>

      {/* Right: the form */}
      <main className="flex min-h-0 flex-col overflow-y-auto px-4 py-4 sm:px-8 sm:py-5">
        <div className="flex items-center justify-between">
          <Link href="/" aria-label="DocSage home" className="lg:invisible">
            <Brand />
          </Link>
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-fg">
            <ArrowLeft className="h-4 w-4" strokeWidth={1.75} aria-hidden /> Back to site
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-center py-3">{children}</div>
        <p className="text-center text-xs text-muted">
          <Link href="/terms" className="hover:text-fg">Terms</Link>
          <span className="mx-2" aria-hidden>·</span>
          <Link href="/privacy" className="hover:text-fg">Privacy</Link>
          <span className="mx-2" aria-hidden>·</span>
          <Link href="/security" className="hover:text-fg">Security</Link>
        </p>
      </main>
    </div>
  );
}
