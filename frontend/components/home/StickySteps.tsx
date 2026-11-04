"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { Check, FileImage, FileText, MessageSquareText, Quote, Share2, UploadCloud } from "lucide-react";
import type { LucideIcon } from "lucide-react";

gsap.registerPlugin(useGSAP, ScrollTrigger);

type Step = { icon: LucideIcon; title: string; text: string; visual: React.ReactNode };

const FILES = [
  { icon: FileText, label: "PDF" },
  { icon: FileImage, label: "PNG" },
  { icon: FileImage, label: "JPG" },
  { icon: FileImage, label: "WebP" },
];

const steps: Step[] = [
  {
    icon: UploadCloud,
    title: "Upload",
    text: "Drop in PDFs or photos of pages. Text is extracted and scans are read with OCR, then everything is split into passages and indexed for search.",
    visual: (
      <div className="rounded-2xl border-2 border-dashed border-brand/40 bg-brand-soft/60 p-6 text-center">
        <UploadCloud className="mx-auto h-8 w-8 text-brand" strokeWidth={1.5} aria-hidden />
        <p className="mt-3 text-sm font-semibold">Drop files here or click to browse</p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {FILES.map(({ icon: Icon, label }) => (
            <span key={label} className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-card px-2.5 py-1 text-xs font-medium">
              <Icon className="h-3.5 w-3.5 text-brand" strokeWidth={1.75} aria-hidden /> {label}
            </span>
          ))}
        </div>
      </div>
    ),
  },
  {
    icon: MessageSquareText,
    title: "Ask",
    text: "Write the question the way you would ask a colleague. DocSage searches by keyword and by meaning at the same time, so exact terms and paraphrases both land.",
    visual: (
      <div className="space-y-3">
        <div className="rounded-xl border border-line bg-card px-4 py-3 text-sm shadow-sm">
          Which clauses limit our liability if the vendor misses a delivery date?
        </div>
        <div className="flex flex-wrap gap-2 text-xs text-muted">
          {["Keyword match", "Meaning match", "Merged and ranked"].map((t) => (
            <span key={t} className="inline-flex items-center gap-1.5 rounded-lg bg-brand-soft px-2.5 py-1 font-medium text-brand">
              <Check className="h-3 w-3" strokeWidth={2.5} aria-hidden /> {t}
            </span>
          ))}
        </div>
      </div>
    ),
  },
  {
    icon: Quote,
    title: "Verify",
    text: "Every answer lists the file, page and excerpt it relied on. Open a citation to read the original wording before you trust a claim.",
    visual: (
      <div className="space-y-2.5 text-sm">
        {[
          { n: 1, where: "Vendor Agreement.pdf, p.14", text: "...liability shall not exceed the fees paid in the twelve (12) months preceding the claim..." },
          { n: 2, where: "Vendor Agreement.pdf, p.15", text: "...delay of more than ten (10) business days entitles the Customer to terminate..." },
        ].map((s) => (
          <div key={s.n} className="rounded-xl border border-line bg-card p-3">
            <p className="flex items-center gap-1.5 text-xs font-semibold">
              <FileText className="h-3.5 w-3.5 text-brand" strokeWidth={1.75} aria-hidden /> [{s.n}] {s.where}
            </p>
            <p className="mt-1.5 text-xs leading-relaxed text-muted">{s.text}</p>
          </div>
        ))}
      </div>
    ),
  },
  {
    icon: Share2,
    title: "Share",
    text: "Copy an answer together with its citations, or send it through your device's share sheet. The people you send it to can check every source.",
    visual: (
      <div className="rounded-2xl border border-line bg-card p-4 text-sm shadow-sm">
        <p className="text-xs font-semibold text-muted">Q: What is the notice period?</p>
        <p className="mt-2 leading-relaxed">Either side can end the agreement with 60 days of written notice.</p>
        <p className="mt-3 text-xs text-muted">[1] Harbor Logistics MSA.pdf, page 9</p>
        <span className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-brand-solid px-3 py-1.5 text-xs font-semibold text-brand-fg">
          <Share2 className="h-3.5 w-3.5" strokeWidth={2} aria-hidden /> Share answer
        </span>
      </div>
    ),
  },
];

/**
 * Four cards that stack as you scroll. CSS `position: sticky` pins each card, and GSAP ScrollTrigger
 * pushes the card underneath back in depth as the next one arrives, which is what shows the order of
 * the steps. On small screens or with reduced motion the cards simply stack normally.
 */
export function StickySteps() {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(min-width: 768px) and (prefers-reduced-motion: no-preference)", () => {
        const cards = gsap.utils.toArray<HTMLElement>(".step-card");
        cards.forEach((card, i) => {
          if (i === cards.length - 1) return;
          gsap.to(card, {
            scale: 0.94 - (cards.length - 2 - i) * 0.01,
            opacity: 0.45,
            ease: "none",
            transformOrigin: "50% 0%",
            scrollTrigger: { trigger: cards[i + 1], start: "top 85%", end: "top 18%", scrub: true },
          });
        });
      });
      return () => mm.revert();
    },
    { scope: root },
  );

  return (
    <div ref={root} className="mx-auto max-w-5xl px-4 sm:px-6">
      {steps.map(({ icon: Icon, title, text, visual }, i) => (
        <div key={title} className="step-card sticky mb-6 last:mb-0 md:mb-[14vh]" style={{ top: `calc(5.5rem + ${i * 14}px)`, zIndex: i + 1 }}>
          <div className="card grid gap-8 p-6 sm:p-10 md:min-h-[360px] md:grid-cols-[1fr_1.05fr] md:items-center md:gap-12">
            <div>
              <span className="inline-grid h-11 w-11 place-items-center rounded-xl bg-brand-soft text-brand">
                <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
              </span>
              <h3 className="mt-5 text-3xl font-semibold tracking-tight">
                <span className="mr-3 text-brand">{i + 1}</span>
                {title}
              </h3>
              <p className="mt-3 max-w-md text-base leading-relaxed text-muted">{text}</p>
            </div>
            <div>{visual}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
