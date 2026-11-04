import type { Metadata } from "next";
import { CheckCircle2, ChevronDown, FileText, ScanText, Search } from "lucide-react";
import { PageHeader } from "@/components/site/PageHeader";
import { Reveal } from "@/components/site/Reveal";
import { CtaBand } from "@/components/site/CtaBand";
import { SourceChips } from "@/components/chat/Message";

export const metadata: Metadata = {
  title: "Features",
  description: "Hybrid search, page-level citations, OCR for scans, resilient AI providers and private-by-default storage.",
};

const clusters = [
  {
    title: "Reading documents",
    items: ["PDFs and PNG, JPG or WebP images", "Text extraction with PyMuPDF", "Tesseract OCR for scanned pages", "Vision-model fallback when OCR is unavailable", "Password-protected PDFs are flagged clearly"],
  },
  {
    title: "Finding answers",
    items: ["Meaning search with 384-dimension embeddings", "BM25 keyword search for exact terms", "Reciprocal rank fusion to merge both", "Search one document or all of them", "Passages of about 900 characters with overlap"],
  },
  {
    title: "Writing answers",
    items: ["Answers stream in as they are written", "Citations with file, page and excerpt", "A plain no-answer when sources are silent", "Follow-up questions keep their context", "Share an answer together with its citations"],
  },
  {
    title: "Your account",
    items: ["Sign in with email and password", "Password reset and email confirmation", "Change your password at any time", "Delete one document or the whole account", "Sessions that you can end everywhere"],
  },
];

function Visual({ children }: { children: React.ReactNode }) {
  return <div className="card bg-brand-soft/50 p-5 sm:p-7">{children}</div>;
}

export default function FeaturesPage() {
  return (
    <>
      <PageHeader title="Everything between a file and a trustworthy answer">
        DocSage reads, indexes, searches and cites, so you can spend your time on the question.
      </PageHeader>

      {/* Reading */}
      <section className="py-12 sm:py-20">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-2 lg:gap-16">
          <Reveal>
            <span className="inline-grid h-11 w-11 place-items-center rounded-xl bg-brand-soft text-brand">
              <ScanText className="h-5 w-5" strokeWidth={1.75} aria-hidden />
            </span>
            <h2 className="mt-5 text-3xl font-semibold tracking-tight sm:text-4xl">Reads what other tools skip</h2>
            <p className="mt-4 max-w-md text-base leading-relaxed text-muted">
              Text PDFs are extracted directly. Pages that are only a picture are read with OCR, so scanned contracts and photographed manuals become searchable too. You can open any document and inspect the exact passages that were indexed.
            </p>
          </Reveal>
          <Reveal delay={0.1}>
            <Visual>
              <div className="rounded-xl border border-line bg-card">
                <div className="flex items-center gap-3 p-3">
                  <FileText className="h-5 w-5 text-brand" strokeWidth={1.75} aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">Lease Agreement (scan).pdf</p>
                    <p className="text-xs text-muted">18 pages, 61 passages</p>
                  </div>
                  <span className="flex items-center gap-1 text-xs text-ok"><CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2} aria-hidden /> Ready</span>
                  <ChevronDown className="h-4 w-4 text-muted" strokeWidth={2} aria-hidden />
                </div>
                <div className="space-y-2 border-t border-line p-3 text-xs leading-relaxed">
                  <p className="rounded-lg bg-bg p-2"><span className="mr-2 font-semibold text-brand">p.3</span>The Tenant shall keep the premises in good repair and shall not make structural alterations without the Landlord's written consent.</p>
                  <p className="rounded-lg bg-bg p-2"><span className="mr-2 font-semibold text-brand">p.4</span>Rent is payable monthly in advance on the first day of each calendar month.</p>
                </div>
              </div>
            </Visual>
          </Reveal>
        </div>
      </section>

      {/* Search */}
      <section className="py-12 sm:py-20">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-2 lg:gap-16">
          <Reveal className="lg:order-2">
            <span className="inline-grid h-11 w-11 place-items-center rounded-xl bg-brand-soft text-brand">
              <Search className="h-5 w-5" strokeWidth={1.75} aria-hidden />
            </span>
            <h2 className="mt-5 text-3xl font-semibold tracking-tight sm:text-4xl">Finds the passage, however you phrase it</h2>
            <p className="mt-4 max-w-md text-base leading-relaxed text-muted">
              Ask for the &quot;termination clause&quot; and it also finds the paragraph that says &quot;either party may end this agreement&quot;. Exact terms like clause numbers and product names are matched by keyword at the same time.
            </p>
          </Reveal>
          <Reveal delay={0.1} className="lg:order-1">
            <Visual>
              <div className="grid grid-cols-2 gap-3 text-xs">
                {[
                  { title: "Keyword", rows: ["Clause 14.2", "Termination", "Notice period"] },
                  { title: "Meaning", rows: ["Ending the agreement", "How to cancel", "Notice requirements"] },
                ].map((col) => (
                  <div key={col.title} className="rounded-xl border border-line bg-card p-3">
                    <p className="font-semibold">{col.title} search</p>
                    <ul className="mt-2 space-y-1.5 text-muted">
                      {col.rows.map((r, i) => (
                        <li key={r} className="flex items-center gap-2"><span className="grid h-4 w-4 place-items-center rounded bg-brand-soft text-[10px] font-bold text-brand">{i + 1}</span>{r}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
              <p className="mt-3 rounded-xl bg-brand-solid px-3 py-2 text-center text-xs font-semibold text-brand-fg">Merged into one ranked list of the best passages</p>
            </Visual>
          </Reveal>
        </div>
      </section>

      {/* Answers, full width */}
      <section className="py-12 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <Reveal className="card overflow-hidden p-7 sm:p-12">
            <h2 className="max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">Answers you can check in seconds</h2>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted">
              The model only sees the passages that matched your question, and it is told to cite them or say it cannot answer. Open a citation to read the original wording.
            </p>
            <div className="mt-8 max-w-2xl rounded-2xl border border-line bg-bg p-5 text-sm leading-relaxed">
              <p>The supplier must deliver within 14 days of the order date [1]. Late delivery entitles the buyer to a 2% discount for each full week of delay [2].</p>
              <SourceChips
                sources={[
                  { n: 1, document_id: 1, filename: "Supply Contract.pdf", page: 5, excerpt: "The Supplier shall deliver the Goods within fourteen (14) days of the date of each Order" },
                  { n: 2, document_id: 1, filename: "Supply Contract.pdf", page: 6, excerpt: "For each full week of delay the Buyer shall be entitled to a discount of two percent (2%)" },
                ]}
              />
            </div>
          </Reveal>
        </div>
      </section>

      {/* grouped details */}
      <section className="py-12 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">The details</h2>
          <div className="mt-10 grid gap-x-12 gap-y-12 sm:grid-cols-2">
            {clusters.map((c, i) => (
              <Reveal key={c.title} delay={(i % 2) * 0.08}>
                <h3 className="border-b border-line pb-3 text-lg font-semibold">{c.title}</h3>
                <ul className="mt-4 space-y-3">
                  {c.items.map((item) => (
                    <li key={item} className="flex items-start gap-3 text-[0.95rem] leading-relaxed text-muted">
                      <CheckCircle2 className="mt-0.5 h-4.5 w-4.5 shrink-0 text-brand" strokeWidth={1.75} aria-hidden />
                      {item}
                    </li>
                  ))}
                </ul>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <CtaBand />
    </>
  );
}
