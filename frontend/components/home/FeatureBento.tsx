"use client";

import { motion, useReducedMotion } from "motion/react";
import { ArrowRight, Layers, Lock, ScanText, Search, Trash2, Workflow } from "lucide-react";
import { Reveal } from "@/components/site/Reveal";

const ease = [0.16, 1, 0.3, 1] as const;

function Bar({ label, width, delay, tone = "brand" }: { label: string; width: number; delay: number; tone?: "brand" | "muted" }) {
  const reduce = useReducedMotion();
  return (
    <div className="flex items-center gap-3 text-xs">
      <span className="w-24 shrink-0 text-muted">{label}</span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-line">
        <motion.div
          className={`h-full rounded-full ${tone === "brand" ? "bg-brand-solid" : "bg-ink/50"}`}
          initial={reduce ? false : { width: 0 }}
          whileInView={{ width: `${width}%` }}
          viewport={{ once: true }}
          transition={{ duration: 1, delay, ease }}
        />
      </div>
    </div>
  );
}

function Cell({ className = "", children, delay = 0 }: { className?: string; children: React.ReactNode; delay?: number }) {
  return (
    <Reveal delay={delay} className={className}>
      <motion.div whileHover={{ y: -4 }} transition={{ type: "spring", stiffness: 300, damping: 24 }} className="h-full">
        {children}
      </motion.div>
    </Reveal>
  );
}

const providers = ["Groq", "Cerebras", "OpenRouter"];

export function FeatureBento() {
  return (
    <div className="mx-auto grid max-w-6xl gap-4 px-4 sm:px-6 md:grid-cols-6">
      {/* 1. hybrid search, wide, tinted with the brand colour */}
      <Cell className="md:col-span-4">
        <div className="card hero-banner relative h-full overflow-hidden p-7 sm:p-9">
          <span className="tint-ico t-blue inline-grid h-11 w-11 place-items-center rounded-2xl">
            <Search className="h-5 w-5" strokeWidth={1.75} aria-hidden />
          </span>
          <h3 className="mt-5 text-2xl font-semibold tracking-tight">Two kinds of search, merged</h3>
          <p className="mt-2 max-w-md text-[0.95rem] leading-relaxed text-muted">
            Keyword search catches exact terms like clause numbers and names. Meaning search catches rephrasings. Reciprocal rank fusion merges both lists.
          </p>
          <div className="mt-7 space-y-3 rounded-2xl border border-line bg-card/80 p-4 backdrop-blur-sm">
            <Bar label="Keyword" width={72} delay={0.1} tone="muted" />
            <Bar label="Meaning" width={88} delay={0.25} tone="muted" />
            <div className="flex items-center gap-2 pt-1 text-xs font-semibold text-brand">
              <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} aria-hidden /> Merged and ranked
            </div>
            <Bar label="Best passages" width={96} delay={0.5} />
          </div>
        </div>
      </Cell>

      {/* 2. citations, tall, dark panel */}
      <Cell className="md:col-span-2" delay={0.08}>
        <div className="card bg-grad relative h-full overflow-hidden border-0 p-7 text-white sm:p-8">
          <span className="inline-grid h-11 w-11 place-items-center rounded-2xl bg-white/20 text-white">
            <Layers className="h-5 w-5" strokeWidth={1.75} aria-hidden />
          </span>
          <h3 className="mt-5 text-2xl font-semibold tracking-tight">Every claim has a page</h3>
          <p className="mt-2 text-[0.95rem] leading-relaxed text-white/85">File, page number and the exact excerpt travel with each answer.</p>
          <div className="mt-6 rounded-2xl bg-white/15 p-3.5 text-xs leading-relaxed text-white/90">
            ...payment is due within <mark className="rounded bg-white/35 px-0.5 text-white">thirty (30) days</mark> of the invoice date...
            <p className="mt-2 font-semibold text-white">Services Agreement.pdf, p.6</p>
          </div>
        </div>
      </Cell>

      {/* 3. OCR */}
      <Cell className="md:col-span-2" delay={0.04}>
        <div className="card h-full p-7 sm:p-8">
          <span className="tint-ico t-amber inline-grid h-11 w-11 place-items-center rounded-2xl">
            <ScanText className="h-5 w-5" strokeWidth={1.75} aria-hidden />
          </span>
          <h3 className="mt-5 text-xl font-semibold tracking-tight">Scans and photos work</h3>
          <p className="mt-2 text-[0.95rem] leading-relaxed text-muted">Pages without a text layer are read with Tesseract OCR, so an old scanned contract is as searchable as a new PDF.</p>
        </div>
      </Cell>

      {/* 4. provider fallback */}
      <Cell className="md:col-span-2" delay={0.12}>
        <div className="card h-full p-7 sm:p-8">
          <span className="tint-ico t-violet inline-grid h-11 w-11 place-items-center rounded-2xl">
            <Workflow className="h-5 w-5" strokeWidth={1.75} aria-hidden />
          </span>
          <h3 className="mt-5 text-xl font-semibold tracking-tight">Never stuck on one model</h3>
          <p className="mt-2 text-[0.95rem] leading-relaxed text-muted">If a provider is rate limited or down, the next one answers.</p>
          <ol className="mt-4 flex items-center gap-1.5 text-xs font-semibold">
            {providers.map((p, i) => (
              <li key={p} className="flex items-center gap-1.5">
                <span className="rounded-lg border border-line bg-bg px-2 py-1">{p}</span>
                {i < providers.length - 1 && <ArrowRight className="h-3 w-3 text-muted" strokeWidth={2} aria-hidden />}
              </li>
            ))}
          </ol>
        </div>
      </Cell>

      {/* 5. privacy */}
      <Cell className="md:col-span-2" delay={0.2}>
        <div className="card tint t-green h-full p-7 sm:p-8">
          <span className="tint-ico t-green inline-grid h-11 w-11 place-items-center rounded-2xl">
            <Lock className="h-5 w-5" strokeWidth={1.75} aria-hidden />
          </span>
          <h3 className="mt-5 text-xl font-semibold tracking-tight">Private by default</h3>
          <p className="mt-2 text-[0.95rem] leading-relaxed text-muted">Every query is scoped to your account. Originals are deleted after processing, and one click removes the rest.</p>
          <p className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-brand">
            <Trash2 className="h-3.5 w-3.5" strokeWidth={2} aria-hidden /> Delete account and data
          </p>
        </div>
      </Cell>
    </div>
  );
}
