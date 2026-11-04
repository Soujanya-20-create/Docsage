"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { ThinkingOrb } from "thinking-orbs";
import { ArrowRight, Check, FileText, PlayCircle, Quote, ScanText, ShieldCheck, Sparkles } from "lucide-react";
import ChatDemo from "@/components/demo/ChatDemo";

const HEADLINE = ["Answers", "from", "your", "documents,", "with", "sources"];
const TRUST = ["Free to start", "Cites every page", "Delete anytime"];
const TYPES = ["PDF", "PNG", "JPG", "WEBP"];

function Float({ className, delay = 0, children }: { className: string; delay?: number; children: React.ReactNode }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={`glass absolute z-20 hidden items-center gap-2.5 rounded-2xl px-3.5 py-2.5 text-xs font-bold shadow-xl lg:flex ${className}`}
      animate={reduce ? undefined : { y: [0, -9, 0] }}
      transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut", delay }}
    >
      {children}
    </motion.div>
  );
}

export function Hero() {
  const reduce = useReducedMotion();
  const rise = (delay: number) =>
    reduce
      ? {}
      : { initial: { opacity: 0, y: 22 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.8, delay, ease: [0.16, 1, 0.3, 1] as const } };

  return (
    <section className="relative isolate overflow-hidden pb-20 pt-24 lg:min-h-[100dvh]">
      {/* aurora background */}
      <div className="bg-grid absolute inset-0 -z-10" aria-hidden />
      <div aria-hidden className="hero-aurora absolute inset-0 -z-10" />
      <div aria-hidden className="absolute -left-24 top-24 -z-10 h-80 w-80 rounded-full bg-[#2f64f0]/25 blur-3xl" />
      <div aria-hidden className="absolute right-0 top-10 -z-10 h-96 w-96 rounded-full bg-[#7c4dff]/25 blur-3xl" />
      <div aria-hidden className="absolute bottom-0 left-1/3 -z-10 h-72 w-72 rounded-full bg-[#e5487a]/15 blur-3xl" />

      <div className="mx-auto grid max-w-6xl items-center gap-14 px-4 sm:px-6 lg:min-h-[calc(100dvh-6rem)] lg:grid-cols-[1.05fr_1fr] lg:gap-8">
        <div>
          <motion.p {...rise(0)} className="glass inline-flex items-center gap-2 rounded-full py-1.5 pl-1.5 pr-4 text-sm font-semibold">
            <span className="bg-grad grid h-6 w-6 place-items-center rounded-full text-white">
              <Sparkles className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
            </span>
            AI document analyst with page-level proof
          </motion.p>

          <h1 className="mt-6 text-[2.75rem] font-extrabold leading-[1.03] tracking-tight sm:text-5xl lg:text-[3.6rem] xl:text-[4.1rem]">
            {HEADLINE.map((word, i) => (
              <span key={i} className="inline-block overflow-hidden pb-1.5 align-bottom">
                <motion.span
                  className={`inline-block ${i >= 4 ? "text-grad" : ""}`}
                  initial={reduce ? false : { y: "110%" }}
                  animate={{ y: 0 }}
                  transition={{ duration: 0.8, delay: 0.08 * i + 0.1, ease: [0.16, 1, 0.3, 1] }}
                >
                  {word}&nbsp;
                </motion.span>
              </span>
            ))}
          </h1>

          <motion.p {...rise(0.65)} className="mt-6 max-w-lg text-lg leading-relaxed text-muted">
            Upload PDFs or scans, ask in plain language, and get answers that point to the exact page they came from. No more hunting through hundred-page files.
          </motion.p>

          <motion.div {...rise(0.8)} className="mt-8 flex flex-wrap items-center gap-3">
            <Link href="/register" className="btn btn-lg !px-7">
              Get started free <ArrowRight className="h-4 w-4" strokeWidth={2} aria-hidden />
            </Link>
            <Link href="/how-it-works" className="btn btn-ghost btn-lg">
              <PlayCircle className="h-4 w-4" strokeWidth={1.75} aria-hidden /> See how it works
            </Link>
          </motion.div>

          <motion.ul {...rise(0.95)} className="mt-7 flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium text-muted">
            {TRUST.map((t) => (
              <li key={t} className="inline-flex items-center gap-2">
                <span className="tint-ico t-green grid h-5 w-5 place-items-center rounded-full">
                  <Check className="h-3 w-3" strokeWidth={3} aria-hidden />
                </span>
                {t}
              </li>
            ))}
          </motion.ul>

          <motion.div {...rise(1.05)} className="mt-9 flex flex-wrap items-center gap-2.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted/80">Reads</span>
            {TYPES.map((t) => (
              <span key={t} className="glass inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold">
                <FileText className="h-3.5 w-3.5 text-brand" strokeWidth={2} aria-hidden /> {t}
              </span>
            ))}
          </motion.div>
        </div>

        <motion.div
          {...(reduce ? {} : { initial: { opacity: 0, y: 40, rotate: 0.6 }, animate: { opacity: 1, y: 0, rotate: 0 }, transition: { duration: 1, delay: 0.35, ease: [0.16, 1, 0.3, 1] as const } })}
          className="relative flex justify-center lg:justify-end"
        >
          {/* glow and orb behind the demo */}
          <div aria-hidden className="absolute inset-x-6 -inset-y-6 -z-10 rounded-[3rem] bg-gradient-to-br from-[#2f64f0]/35 via-[#7c4dff]/35 to-[#e5487a]/25 blur-3xl" />
          <div aria-hidden className="absolute -right-3 -top-8 z-20 hidden sm:block">
            <span className="glass grid h-20 w-20 place-items-center rounded-full">
              <ThinkingOrb state="breathing" size={64} theme="auto" aria-label="" />
            </span>
          </div>

          <Float className="-left-10 top-[42%]" delay={0}>
            <span className="tint-ico t-green grid h-8 w-8 place-items-center rounded-xl">
              <Quote className="h-4 w-4" strokeWidth={2.25} aria-hidden />
            </span>
            Cited from page 11
          </Float>
          <Float className="-right-4 bottom-28" delay={1.6}>
            <span className="tint-ico t-amber grid h-8 w-8 place-items-center rounded-xl">
              <ScanText className="h-4 w-4" strokeWidth={2} aria-hidden />
            </span>
            Scans read with OCR
          </Float>
          <Float className="bottom-6 -left-4" delay={3}>
            <span className="tint-ico t-violet grid h-8 w-8 place-items-center rounded-xl">
              <ShieldCheck className="h-4 w-4" strokeWidth={2} aria-hidden />
            </span>
            Private by default
          </Float>

          <ChatDemo />
        </motion.div>
      </div>
    </section>
  );
}
