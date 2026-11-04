"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";

/** Top of every inner page: a headline and one sentence, over the soft blueprint grid. */
export function PageHeader({ title, children, eyebrow }: { title: ReactNode; children: ReactNode; eyebrow?: string }) {
  const reduce = useReducedMotion();
  const fade = (delay: number) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, y: 18 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] as const },
        };
  return (
    <section className="relative isolate overflow-hidden pb-14 pt-32 sm:pb-20 sm:pt-40">
      <div className="bg-grid absolute inset-0 -z-10" aria-hidden />
      <div className="bg-wash absolute inset-0 -z-10" aria-hidden />
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {eyebrow && (
          <motion.p {...fade(0)} className="glass mb-5 inline-flex items-center rounded-full px-3.5 py-1.5 text-sm font-semibold text-brand">
            {eyebrow}
          </motion.p>
        )}
        <motion.h1 {...fade(0.05)} className="max-w-3xl text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
          {title}
        </motion.h1>
        <motion.p {...fade(0.15)} className="mt-5 max-w-2xl text-lg leading-relaxed text-muted">
          {children}
        </motion.p>
      </div>
    </section>
  );
}
