"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { BookOpenText, Landmark, Scale, Wrench } from "lucide-react";
import type { LucideIcon } from "lucide-react";

type Case = { id: string; icon: LucideIcon; tab: string; title: string; text: string; question: string; answer: string; cite: string };

const cases: Case[] = [
  {
    id: "legal",
    icon: Scale,
    tab: "Contracts",
    title: "Find the clause, not the whole contract",
    text: "Ask about notice periods, liability caps or renewal terms and jump straight to the paragraph that says it.",
    question: "When does this agreement renew automatically?",
    answer: "It renews for successive one year terms unless either side gives written notice 90 days before the term ends.",
    cite: "Services Agreement.pdf, p.11",
  },
  {
    id: "finance",
    icon: Landmark,
    tab: "Reports",
    title: "Pull figures out of long reports",
    text: "Query annual reports and board packs in plain language and check each number against the page it came from.",
    question: "What drove the change in operating expenses?",
    answer: "Higher cloud hosting costs and a one-time restructuring charge, partly offset by lower travel spending.",
    cite: "Annual Report 2025.pdf, p.37",
  },
  {
    id: "research",
    icon: BookOpenText,
    tab: "Research",
    title: "Read a stack of papers in an afternoon",
    text: "Upload the papers you collected, then compare methods and results across all of them with citations on every line.",
    question: "Which studies used a sample larger than 500 participants?",
    answer: "Two of the uploaded papers did: the 2023 cohort study with 812 participants and the 2024 replication with 640.",
    cite: "Cohort Study 2023.pdf, p.4",
  },
  {
    id: "ops",
    icon: Wrench,
    tab: "Manuals",
    title: "Put the manual in everyone's pocket",
    text: "Photograph pages from a printed manual and ask how to do the job. Scanned pages are read with OCR.",
    question: "How often should the filter be replaced?",
    answer: "Replace the filter every 6 months, or every 3 months in dusty environments.",
    cite: "Maintenance Manual.pdf, p.22",
  },
];

export function UseCases() {
  const [active, setActive] = useState(cases[0].id);
  const current = cases.find((c) => c.id === active)!;

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6">
      <div role="tablist" aria-label="Use cases" className="flex gap-1 overflow-x-auto rounded-2xl border border-line bg-card p-1.5 sm:inline-flex">
        {cases.map(({ id, icon: Icon, tab }) => (
          <button
            key={id}
            role="tab"
            aria-selected={active === id}
            aria-controls={`panel-${id}`}
            id={`tab-${id}`}
            onClick={() => setActive(id)}
            className={`relative inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${active === id ? "text-brand-fg" : "text-muted hover:text-fg"}`}
          >
            {active === id && <motion.span layoutId="usecase-pill" className="absolute inset-0 rounded-xl bg-brand-solid" transition={{ type: "spring", stiffness: 380, damping: 32 }} />}
            <Icon className="relative h-4 w-4" strokeWidth={1.75} aria-hidden />
            <span className="relative">{tab}</span>
          </button>
        ))}
      </div>

      <div className="mt-8 min-h-[22rem] sm:min-h-[20rem]">
        <AnimatePresence mode="wait">
          <motion.div
            key={current.id}
            role="tabpanel"
            id={`panel-${current.id}`}
            aria-labelledby={`tab-${current.id}`}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="grid items-center gap-8 lg:grid-cols-[1fr_1.1fr] lg:gap-14"
          >
            <div>
              <h3 className="text-3xl font-semibold leading-tight tracking-tight">{current.title}</h3>
              <p className="mt-4 max-w-md text-base leading-relaxed text-muted">{current.text}</p>
            </div>
            <div className="card space-y-3 p-5 sm:p-6">
              <p className="ml-auto w-fit max-w-[90%] rounded-2xl rounded-br-md bg-brand-solid px-4 py-2.5 text-sm text-brand-fg">{current.question}</p>
              <div className="rounded-2xl rounded-bl-md border border-line bg-bg p-4 text-sm leading-relaxed">
                {current.answer}
                <p className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-line bg-card px-2.5 py-1 text-xs font-medium">
                  <span className="font-bold text-brand">[1]</span> {current.cite}
                </p>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
