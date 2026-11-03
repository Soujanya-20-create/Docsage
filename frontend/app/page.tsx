import Link from "next/link";
import { FileText, Quote, ScanText, Search, Sparkles, UploadCloud } from "lucide-react";

const features = [
  { icon: Search, title: "Hybrid search", text: "Meaning-based vector search and BM25 keywords, merged so exact terms and paraphrases both land." },
  { icon: Quote, title: "Every answer cites its source", text: "See the file, page and excerpt behind each claim, so you can verify it in seconds." },
  { icon: ScanText, title: "Scans and images too", text: "Tesseract OCR, with a vision-model fallback, reads documents that have no text layer." },
];

const steps = [
  { icon: UploadCloud, title: "Upload", text: "Drop in PDFs or images. DocSage extracts, chunks and indexes them." },
  { icon: Sparkles, title: "Ask", text: "Question your documents in plain language and watch the answer stream in." },
  { icon: FileText, title: "Verify", text: "Open the cited pages and excerpts to confirm every answer." },
];

export default function Landing() {
  return (
    <main>
      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-5">
        <span className="flex items-center gap-2 text-lg font-bold">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/docsage-mark.png" alt="" className="h-7 w-7" />
          DocSage
        </span>
        <nav className="flex items-center gap-2">
          <Link href="/login" className="btn btn-ghost">Sign in</Link>
          <Link href="/register" className="btn">Get started</Link>
        </nav>
      </header>

      <section className="mx-auto max-w-3xl px-4 pb-16 pt-16 text-center sm:pt-24">
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl">
          Answers from your documents,{" "}
          <span className="text-brand">with sources</span>
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-lg text-muted">
          Upload PDFs or scans, ask in plain language, and get answers that point to the exact file and page they came from.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link href="/register" className="btn px-6 py-3">Start for free</Link>
          <Link href="/login" className="btn btn-ghost px-6 py-3">Sign in</Link>
        </div>
      </section>

      <section className="mx-auto grid max-w-5xl gap-4 px-4 pb-16 sm:grid-cols-3">
        {features.map(({ icon: Icon, title, text }) => (
          <div key={title} className="rounded-2xl border border-line bg-card p-5">
            <Icon className="h-6 w-6 text-brand" />
            <h3 className="mt-3 font-semibold">{title}</h3>
            <p className="mt-1 text-sm text-muted">{text}</p>
          </div>
        ))}
      </section>

      <section className="mx-auto max-w-5xl px-4 pb-20">
        <h2 className="mb-6 text-center text-2xl font-bold">How it works</h2>
        <ol className="grid gap-4 sm:grid-cols-3">
          {steps.map(({ icon: Icon, title, text }, i) => (
            <li key={title} className="rounded-2xl border border-line bg-card p-5">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-sm font-bold text-brand-fg">{i + 1}</span>
              <h3 className="mt-3 flex items-center gap-2 font-semibold"><Icon className="h-4 w-4 text-brand" />{title}</h3>
              <p className="mt-1 text-sm text-muted">{text}</p>
            </li>
          ))}
        </ol>
      </section>

      <footer className="border-t border-line py-6 text-center text-sm text-muted">DocSage · MIT licensed</footer>
    </main>
  );
}
