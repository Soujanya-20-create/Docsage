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
      <Reveal className="relative mx-auto max-w-6xl overflow-hidden rounded-[2rem] cta-vivid px-6 py-16 text-center shadow-[0_30px_70px_-30px_rgb(124_77_255/0.8)] sm:px-12 sm:py-20">
        <div aria-hidden className="pointer-events-none absolute -left-16 -top-20 h-64 w-64 rounded-full bg-[#27d3c0]/40 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-24 right-0 h-72 w-72 rounded-full bg-[#ff6fa8]/45 blur-3xl" />
        <div aria-hidden className="bg-grid pointer-events-none absolute inset-0 opacity-25 [--brand:#fff]" />
        <h2 className="relative mx-auto max-w-2xl text-3xl font-extrabold tracking-tight text-white sm:text-4xl">{title}</h2>
        <p className="relative mx-auto mt-4 max-w-xl text-base leading-relaxed text-white/85">{text}</p>
        <div className="relative mt-8 flex justify-center">
          <Link href="/register" className="btn btn-lg !bg-white !bg-none !text-[#2554e8]">
            Get started <ArrowRight className="h-4 w-4" strokeWidth={2} aria-hidden />
          </Link>
        </div>
        <p className="relative mt-6 inline-flex items-center gap-2 text-sm text-white/80">
          <ShieldCheck className="h-4 w-4" strokeWidth={1.75} aria-hidden /> Delete your account and everything in it at any time.
        </p>
      </Reveal>
    </section>
  );
}
