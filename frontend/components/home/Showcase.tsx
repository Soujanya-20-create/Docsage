"use client";

import { motion, useReducedMotion } from "motion/react";
import { BarChart3, Check, FileText, Layers, MessageSquarePlus, Quote, ScanText, Search, Settings, Sparkles } from "lucide-react";
import { Reveal } from "@/components/site/Reveal";

const stats = [
  { value: "2 engines", label: "Meaning and keyword search, merged", tone: "#2f64f0" },
  { value: "Page-level", label: "Citations on every answer", tone: "#7c4dff" },
  { value: "OCR built in", label: "Scans and photos become searchable", tone: "#ee8a1b" },
  { value: "3 providers", label: "Automatic failover between models", tone: "#12a36b" },
];

/** A row of headline numbers under the hero. */
export function StatsStrip() {
  return (
    <section className="px-4 sm:px-6">
      <Reveal className="mx-auto grid max-w-6xl gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.value} className="card lift p-5">
            <p className="text-2xl font-extrabold tracking-tight" style={{ color: s.tone }}>
              {s.value}
            </p>
            <p className="mt-1 text-sm leading-snug text-muted">{s.label}</p>
          </div>
        ))}
      </Reveal>
    </section>
  );
}

function Chip({ className, children, delay = 0 }: { className: string; children: React.ReactNode; delay?: number }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={`glass absolute z-10 hidden items-center gap-2 rounded-2xl px-3.5 py-2.5 text-xs font-bold shadow-xl md:flex ${className}`}
      animate={reduce ? undefined : { y: [0, -8, 0] }}
      transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay }}
    >
      {children}
    </motion.div>
  );
}

/** The product, drawn in HTML: a window with the sidebar, a question and a cited answer. */
export function Showcase() {
  return (
    <div className="relative mx-auto max-w-5xl px-4 sm:px-6">
      <div aria-hidden className="absolute inset-x-10 -inset-y-6 -z-10 rounded-[3rem] bg-gradient-to-br from-[#2f64f0]/30 via-[#7c4dff]/30 to-[#e5487a]/25 blur-3xl" />

      <Chip className="-left-2 top-16" delay={0}>
        <span className="tint-ico t-green grid h-7 w-7 place-items-center rounded-lg">
          <Check className="h-4 w-4" strokeWidth={2.5} aria-hidden />
        </span>
        Cited from page 11
      </Chip>
      <Chip className="-right-2 top-1/3" delay={1.2}>
        <span className="tint-ico t-amber grid h-7 w-7 place-items-center rounded-lg">
          <ScanText className="h-4 w-4" strokeWidth={2} aria-hidden />
        </span>
        Scanned PDF read with OCR
      </Chip>
      <Chip className="bottom-10 left-8" delay={2.2}>
        <span className="tint-ico t-violet grid h-7 w-7 place-items-center rounded-lg">
          <Sparkles className="h-4 w-4" strokeWidth={2} aria-hidden />
        </span>
        Streams as it thinks
      </Chip>

      <Reveal>
        <div className="card overflow-hidden rounded-[1.75rem] shadow-[0_40px_80px_-30px_rgb(60_70_170/0.45)]">
          {/* window chrome */}
          <div className="flex items-center gap-2 border-b border-line bg-brand-soft/60 px-4 py-3">
            <span className="h-3 w-3 rounded-full bg-[#ff6b6b]" />
            <span className="h-3 w-3 rounded-full bg-[#ffc94d]" />
            <span className="h-3 w-3 rounded-full bg-[#4fd18b]" />
            <span className="mx-auto rounded-full bg-card px-10 py-1 text-xs text-muted">docsage.app/chat</span>
          </div>

          <div className="grid md:grid-cols-[13rem_1fr]">
            <aside className="sidebar-surface hidden border-r border-line p-4 md:block">
              <p className="text-sm font-extrabold">
                Doc<span className="text-brand">Sage</span>
              </p>
              <ul className="mt-5 space-y-1 text-[13px] font-semibold text-muted">
                {[
                  [MessageSquarePlus, "New Chat", true],
                  [Layers, "Workspace", false],
                  [FileText, "My Documents", false],
                  [BarChart3, "Analytics", false],
                  [Settings, "Settings", false],
                ].map(([Icon, label, on]) => {
                  const I = Icon as typeof Layers;
                  return (
                    <li key={label as string} className={`flex items-center gap-2.5 rounded-xl px-3 py-2 ${on ? "bg-grad text-white" : ""}`}>
                      <I className="h-4 w-4" strokeWidth={1.9} aria-hidden />
                      {label as string}
                    </li>
                  );
                })}
              </ul>
              <p className="mt-6 px-2 text-[11px] font-bold uppercase tracking-wider text-muted/70">Recent</p>
              <ul className="mt-2 space-y-1.5 px-2 text-xs text-muted">
                <li className="truncate">Notice period in the MSA</li>
                <li className="truncate">Q3 operating expenses</li>
                <li className="truncate">Study sample sizes</li>
              </ul>
            </aside>

            <div className="space-y-4 p-5 sm:p-7">
              <div className="flex justify-end">
                <p className="bg-grad max-w-[85%] rounded-3xl rounded-br-lg px-5 py-3 text-sm text-white">When does this agreement renew automatically?</p>
              </div>
              <div className="flex gap-3">
                <span className="tint-ico t-violet grid h-9 w-9 shrink-0 place-items-center rounded-full">
                  <Sparkles className="h-4 w-4" aria-hidden />
                </span>
                <div className="glass rounded-3xl rounded-tl-lg px-5 py-4 text-sm leading-relaxed">
                  It renews for successive <strong>one year terms</strong> unless either side gives written notice <strong>90 days</strong> before the term ends.
                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    <span className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-bg px-2.5 py-1.5">
                      <Quote className="h-3 w-3 text-brand" aria-hidden /> <b>[1]</b> Services Agreement.pdf, p.11
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-bg px-2.5 py-1.5">
                      <Quote className="h-3 w-3 text-brand" aria-hidden /> <b>[2]</b> Services Agreement.pdf, p.12
                    </span>
                  </div>
                </div>
              </div>
              <div className="glass flex items-center gap-3 rounded-full px-4 py-2.5 text-sm text-muted">
                <Search className="h-4 w-4" aria-hidden /> Ask anything about your documents
                <span className="bg-grad ml-auto grid h-8 w-8 place-items-center rounded-full text-white">
                  <Sparkles className="h-4 w-4" aria-hidden />
                </span>
              </div>
            </div>
          </div>
        </div>
      </Reveal>
    </div>
  );
}
