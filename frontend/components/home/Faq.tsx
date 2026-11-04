"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Plus } from "lucide-react";

export const faqs = [
  {
    q: "Which files can I upload?",
    a: "PDFs and images in PNG, JPG or WebP format, up to 20 MB each. Scanned pages and photos are read with OCR, so they become searchable like any other document.",
  },
  {
    q: "How do I know an answer is correct?",
    a: "Each answer lists the file, page and excerpt it used. Open a citation to read the original wording. If the documents do not contain the answer, DocSage says so instead of guessing.",
  },
  {
    q: "Are my documents used to train AI models?",
    a: "DocSage does not train models on your content. To write an answer, the relevant excerpts and your question are sent to a language model provider, and each provider has its own data policy. The Privacy Policy lists them.",
  },
  {
    q: "What happens to my original files?",
    a: "They are deleted as soon as DocSage has extracted and indexed the text. What remains is searchable text and vectors, which you can delete at any time.",
  },
  {
    q: "Can I share an answer with someone who has no account?",
    a: "Yes. Copy the answer with its citations, or use your device's share sheet. The recipient gets the text and the file and page references.",
  },
  {
    q: "How do I delete my data?",
    a: "Delete any document from the Documents page, or delete your whole account from Settings. Both remove the text, vectors and chat history.",
  },
];

export function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6">
      <ul className="divide-y divide-line rounded-[var(--radius-card)] border border-line bg-card">
        {faqs.map((item, i) => {
          const isOpen = open === i;
          return (
            <li key={item.q}>
              <h3>
                <button
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={`faq-${i}`}
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="flex w-full items-center justify-between gap-4 px-5 py-5 text-left text-base font-semibold sm:px-7"
                >
                  {item.q}
                  <motion.span animate={{ rotate: isOpen ? 45 : 0 }} transition={{ type: "spring", stiffness: 300, damping: 22 }} className="shrink-0 text-brand">
                    <Plus className="h-5 w-5" strokeWidth={2} aria-hidden />
                  </motion.span>
                </button>
              </h3>
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    id={`faq-${i}`}
                    role="region"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                    className="overflow-hidden"
                  >
                    <p className="px-5 pb-6 text-[0.95rem] leading-relaxed text-muted sm:px-7">{item.a}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
