import type { Metadata } from "next";
import Link from "next/link";
import { Mail } from "lucide-react";
import { PageHeader } from "@/components/site/PageHeader";
import { Reveal } from "@/components/site/Reveal";
import { CtaBand } from "@/components/site/CtaBand";
import { commitments } from "@/lib/content";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Security",
  description: "How DocSage protects sign-in, limits what it stores, and lets you delete everything.",
};

const kept = [
  ["Email and name", "Kept while your account exists", "Used to sign you in and to send account emails."],
  ["Password", "Only a bcrypt hash is kept", "The password itself is never stored or logged."],
  ["Uploaded original files", "Deleted after processing", "Removed as soon as the text has been extracted and indexed."],
  ["Extracted passages and vectors", "Kept until you delete them", "This is what makes your documents searchable."],
  ["Chats and answers", "Kept until you delete them", "Includes the citations shown with each answer."],
  ["Sign-in sessions", "Expire after 7 days", "Each use replaces the token, and old ones stop working."],
];

const processors = [
  ["Frontend hosting", "Serves the website and keeps your session cookie", "Your requests to the site"],
  ["API and database hosting", "Runs the service and stores your data", "Everything listed above"],
  ["Language model providers", "Write the answer to your question", "Your question and the few matching excerpts"],
  ["Vision model (only without OCR)", "Reads images when Tesseract is not available", "The image being read"],
  ["Email delivery", "Sends confirmation and reset emails", "Your email address and the message"],
  ["Error monitoring (optional)", "Reports crashes to the operator", "Technical details, no document content"],
];

export default function SecurityPage() {
  return (
    <>
      <PageHeader title="Security, explained plainly">
        What DocSage does to protect your account, what it keeps, and who else touches your data.
      </PageHeader>

      <section className="py-12 sm:py-20">
        <ul className="mx-auto grid max-w-6xl gap-x-10 gap-y-10 px-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-3">
          {commitments.map(({ icon: Icon, title, text }, i) => (
            <Reveal as="li" key={title} delay={(i % 3) * 0.07}>
              <span className="inline-grid h-11 w-11 place-items-center rounded-xl bg-brand-soft text-brand">
                <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
              </span>
              <h2 className="mt-4 text-lg font-semibold">{title}</h2>
              <p className="mt-1.5 text-[0.95rem] leading-relaxed text-muted">{text}</p>
            </Reveal>
          ))}
        </ul>
      </section>

      <section className="py-12 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <Reveal className="card p-7 sm:p-12">
            <h2 className="text-3xl font-semibold tracking-tight">How signing in is protected</h2>
            <ol className="mt-8 grid gap-8 md:grid-cols-3">
              {[
                ["A short-lived pass", "After you sign in, the browser holds an access token in memory for 15 minutes. It is never written to disk, so it does not survive a closed tab."],
                ["A cookie scripts cannot read", "A longer-lived token lives in an HttpOnly, same-site cookie. Page scripts cannot read it, which limits what an injected script could steal."],
                ["Rotation and theft detection", "Every renewal issues a new token and retires the old one. If a retired token is replayed, all sessions for the account are ended."],
              ].map(([title, text], i) => (
                <li key={title}>
                  <p className="text-sm font-semibold text-brand">Step {i + 1}</p>
                  <h3 className="mt-1 text-lg font-semibold">{title}</h3>
                  <p className="mt-2 text-[0.95rem] leading-relaxed text-muted">{text}</p>
                </li>
              ))}
            </ol>
          </Reveal>
        </div>
      </section>

      <section className="py-12 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">What is kept, and for how long</h2>
          <div className="mt-8 overflow-x-auto rounded-[var(--radius-card)] border border-line bg-card">
            <table className="legal w-full min-w-[40rem] !m-0">
              <thead><tr><th>Data</th><th>Retention</th><th>Notes</th></tr></thead>
              <tbody>
                {kept.map(([a, b, c]) => (
                  <tr key={a}><td className="!text-fg font-medium">{a}</td><td>{b}</td><td>{c}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="py-12 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Who else processes your data</h2>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted">
            DocSage relies on a few services to run. The Privacy Policy names the providers in use and links to their terms.
          </p>
          <div className="mt-8 overflow-x-auto rounded-[var(--radius-card)] border border-line bg-card">
            <table className="legal w-full min-w-[40rem] !m-0">
              <thead><tr><th>Service</th><th>What it does</th><th>What it receives</th></tr></thead>
              <tbody>
                {processors.map(([a, b, c]) => (
                  <tr key={a}><td className="!text-fg font-medium">{a}</td><td>{b}</td><td>{c}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="py-12 sm:py-20">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <h2 className="text-3xl font-semibold tracking-tight">Found a vulnerability?</h2>
          <p className="mt-3 text-base leading-relaxed text-muted">
            Please tell us privately before sharing it publicly, and include steps to reproduce it. We will acknowledge your report and keep you updated.
          </p>
          <Link href={`mailto:${site.contactEmail}?subject=Security%20report`} className="btn btn-ghost btn-lg mt-6">
            <Mail className="h-4 w-4" strokeWidth={1.75} aria-hidden /> {site.contactEmail}
          </Link>
        </div>
      </section>

      <CtaBand />
    </>
  );
}
