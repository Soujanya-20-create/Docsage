"use client";

import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { Reveal } from "./Reveal";

/** Closing call to action shared by the marketing pages. */
export function CtaBand({
  title = "Ask your first question in a minute",
  text = "Create an account, upload a document, and see the cited answer for yourself.",
}: {
  title?: string;
  text?: string;
}) {
  return (
    <section className="px-4 pb-24 sm:px-6">
      <Reveal className="relative mx-auto max-w-6xl overflow-hidden rounded-[var(--radius-card)] bg-ink px-6 py-16 text-center sm:px-12 sm:py-20">
        <div
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{ background: "radial-gradient(60% 80% at 80% 0%, rgb(47 111 237 / 0.45), transparent 70%)" }}
          aria-hidden
        />
        <h2 className="relative mx-auto max-w-2xl text-3xl font-semibold tracking-tight text-bg sm:text-4xl">{title}</h2>
        <p className="relative mx-auto mt-4 max-w-xl text-base leading-relaxed text-bg/75">{text}</p>
        <div className="relative mt-8 flex justify-center">
          <Link href="/register" className="btn btn-lg bg-bg text-fg hover:bg-bg/90">
            Get started <ArrowRight className="h-4 w-4" strokeWidth={2} aria-hidden />
          </Link>
        </div>
        <p className="relative mt-6 inline-flex items-center gap-2 text-sm text-bg/70">
          <ShieldCheck className="h-4 w-4" strokeWidth={1.75} aria-hidden /> Delete your account and everything in it at any time.
        </p>
      </Reveal>
    </section>
  );
}
