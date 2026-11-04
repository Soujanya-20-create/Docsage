"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { ArrowRight, PlayCircle } from "lucide-react";
import ChatDemo from "@/components/demo/ChatDemo";

const HEADLINE = ["Answers", "from", "your", "documents,", "with", "sources"];

export function Hero() {
  const reduce = useReducedMotion();
  const rise = (delay: number) =>
    reduce
      ? {}
      : { initial: { opacity: 0, y: 22 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.8, delay, ease: [0.16, 1, 0.3, 1] as const } };

  return (
    <section className="relative isolate overflow-hidden pb-16 pt-24 lg:min-h-[100dvh]">
      <div className="bg-grid absolute inset-0 -z-10" aria-hidden />
      <div className="bg-wash absolute inset-0 -z-10" aria-hidden />

      <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 sm:px-6 lg:min-h-[calc(100dvh-6rem)] lg:grid-cols-[1.05fr_1fr] lg:gap-8">
        <div>
          <h1 className="text-[2.6rem] font-semibold leading-[1.04] tracking-tight sm:text-5xl lg:text-[3.4rem] xl:text-6xl">
            {HEADLINE.map((word, i) => (
              <span key={i} className="inline-block overflow-hidden pb-1 align-bottom">
                <motion.span
                  className={`inline-block ${i >= 4 ? "text-brand" : ""}`}
                  initial={reduce ? false : { y: "110%" }}
                  animate={{ y: 0 }}
                  transition={{ duration: 0.8, delay: 0.08 * i, ease: [0.16, 1, 0.3, 1] }}
                >
                  {word}&nbsp;
                </motion.span>
              </span>
            ))}
          </h1>

          <motion.p {...rise(0.55)} className="mt-6 max-w-lg text-lg leading-relaxed text-muted">
            Upload PDFs or scans, ask in plain language, and get answers that point to the exact page they came from.
          </motion.p>

          <motion.div {...rise(0.7)} className="mt-8 flex flex-wrap items-center gap-3">
            <Link href="/register" className="btn btn-lg">
              Get started <ArrowRight className="h-4 w-4" strokeWidth={2} aria-hidden />
            </Link>
            <Link href="/how-it-works" className="btn btn-ghost btn-lg">
              <PlayCircle className="h-4 w-4" strokeWidth={1.75} aria-hidden /> See how it works
            </Link>
          </motion.div>
        </div>

        <motion.div
          {...(reduce ? {} : { initial: { opacity: 0, y: 40, rotate: 0.6 }, animate: { opacity: 1, y: 0, rotate: 0 }, transition: { duration: 1, delay: 0.35, ease: [0.16, 1, 0.3, 1] as const } })}
          className="flex justify-center lg:justify-end"
        >
          <ChatDemo />
        </motion.div>
      </div>
    </section>
  );
}
