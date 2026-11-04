import type { Metadata } from "next";
import { PageHeader } from "@/components/site/PageHeader";
import { Reveal } from "@/components/site/Reveal";
import { CtaBand } from "@/components/site/CtaBand";
import { IngestTimeline, QueryTimeline } from "@/components/home/Timeline";

export const metadata: Metadata = {
  title: "How it works",
  description: "What happens to a document when you upload it, and what happens to your question when you ask it.",
};

const stack = [
  ["Frontend", "Next.js, React, TypeScript, Tailwind CSS"],
  ["API", "FastAPI with async SQLAlchemy"],
  ["Search", "Qdrant vectors and BM25 keyword search"],
  ["Embeddings", "BAAI bge-small-en-v1.5 (384 dimensions)"],
  ["Reading", "PyMuPDF and Tesseract OCR"],
  ["Language models", "Groq, Cerebras and OpenRouter in order"],
];

export default function HowItWorksPage() {
  return (
    <>
      <PageHeader title="What happens to your documents and questions">
        Two short journeys: a file becoming searchable, and a question becoming a cited answer.
      </PageHeader>

      <section className="py-12 sm:py-20">
        <div className="mx-auto grid max-w-6xl gap-14 px-4 sm:px-6 lg:grid-cols-[0.7fr_1.3fr] lg:gap-20">
          <Reveal className="lg:sticky lg:top-28 lg:self-start">
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">When you upload</h2>
            <p className="mt-4 max-w-sm text-base leading-relaxed text-muted">
              Indexing takes a few seconds for a typical document. You can watch the status and inspect the extracted passages from the Documents page.
            </p>
          </Reveal>
          <IngestTimeline />
        </div>
      </section>

      <section className="py-12 sm:py-20">
        <div className="mx-auto grid max-w-6xl gap-14 px-4 sm:px-6 lg:grid-cols-[0.7fr_1.3fr] lg:gap-20">
          <Reveal className="lg:sticky lg:top-28 lg:self-start">
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">When you ask</h2>
            <p className="mt-4 max-w-sm text-base leading-relaxed text-muted">
              The model never sees your whole library, only the few passages that matched, which keeps answers focused and checkable.
            </p>
          </Reveal>
          <QueryTimeline />
        </div>
      </section>

      <section className="py-12 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">The stack</h2>
          <dl className="mt-10 grid gap-x-12 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
            {stack.map(([term, detail], i) => (
              <Reveal key={term} delay={(i % 3) * 0.07}>
                <dt className="text-sm font-semibold text-brand">{term}</dt>
                <dd className="mt-1 text-[0.95rem] leading-relaxed text-muted">{detail}</dd>
              </Reveal>
            ))}
          </dl>
        </div>
      </section>

      <CtaBand />
    </>
  );
}
