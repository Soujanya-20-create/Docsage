"use client";

import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useSpring } from "motion/react";
import { Blocks, Database, FileSearch, Layers, MessageSquareQuote, Scissors, Search, Sparkles, UploadCloud, Workflow } from "lucide-react";
import type { LucideIcon } from "lucide-react";

type Item = { icon: LucideIcon; title: string; text: string };

const lanes = {
  ingest: [
    { icon: UploadCloud, title: "You upload a file", text: "PDFs and PNG, JPG or WebP images up to 20 MB. The content is checked, not just the file name." },
    { icon: FileSearch, title: "Text is extracted", text: "Text PDFs are read directly. Pages that are only an image go through Tesseract OCR." },
    { icon: Scissors, title: "Pages become passages", text: "Text is cut into passages of about 900 characters with 150 characters of overlap, so a sentence is never lost at a boundary." },
    { icon: Layers, title: "Each passage gets a meaning vector", text: "A small embedding model turns every passage into a 384-number vector that represents what it says." },
    { icon: Database, title: "Everything is indexed, the original is deleted", text: "Passages and vectors are stored under your account. The uploaded file is removed once indexing finishes." },
  ],
  query: [
    { icon: MessageSquareQuote, title: "You ask a question", text: "In plain language, across all your documents or just one." },
    { icon: Search, title: "Two searches run together", text: "Vector search finds passages with a similar meaning. BM25 finds passages that contain your exact words." },
    { icon: Blocks, title: "Results are merged", text: "Reciprocal rank fusion combines both lists, so a passage that ranks well in either rises to the top." },
    { icon: Workflow, title: "The best passages go to a language model", text: "Only the top excerpts and your question are sent. If one provider fails, the next in the chain answers." },
    { icon: Sparkles, title: "The answer streams back with citations", text: "You see it as it is written, with the file, page and excerpt behind each claim." },
  ],
} satisfies Record<string, Item[]>;

function Lane({ items }: { items: Item[] }) {
  const ref = useRef<HTMLOListElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 75%", "end 60%"] });
  const fill = useSpring(scrollYProgress, { stiffness: 120, damping: 28, mass: 0.4 });

  return (
    <ol ref={ref} className="relative">
      <span className="absolute left-[1.35rem] top-2 bottom-2 w-px bg-line" aria-hidden />
      <motion.span
        className="absolute left-[1.35rem] top-2 bottom-2 w-px origin-top bg-brand-solid"
        style={{ scaleY: reduce ? 1 : fill }}
        aria-hidden
      />
      {items.map(({ icon: Icon, title, text }, i) => (
        <motion.li
          key={title}
          className="relative flex gap-5 pb-10 last:pb-0"
          initial={reduce ? false : { opacity: 0, x: -14 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, amount: 0.6 }}
          transition={{ duration: 0.6, delay: 0.04 * (i % 2), ease: [0.16, 1, 0.3, 1] }}
        >
          <span className="relative z-10 grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-line bg-card text-brand shadow-sm">
            <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
          </span>
          <div className="pt-1">
            <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
            <p className="mt-1.5 max-w-xl text-[0.95rem] leading-relaxed text-muted">{text}</p>
          </div>
        </motion.li>
      ))}
    </ol>
  );
}

export function IngestTimeline() {
  return <Lane items={lanes.ingest} />;
}

export function QueryTimeline() {
  return <Lane items={lanes.query} />;
}
