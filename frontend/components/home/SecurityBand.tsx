"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Reveal } from "@/components/site/Reveal";
import { commitments } from "@/lib/content";

export function SecurityBand() {
  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6">
      <div className="card relative overflow-hidden bg-brand-soft/70 p-7 sm:p-12">
        <h2 className="max-w-2xl text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">Built so your documents stay yours</h2>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted">
          Contracts, reports and notes are sensitive. DocSage is designed around limiting what it keeps and who can reach it.
        </p>
        <ul className="mt-10 grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
          {commitments.map(({ icon: Icon, title, text }, i) => (
            <Reveal as="li" key={title} delay={i * 0.06}>
              <Icon className="h-6 w-6 text-brand" strokeWidth={1.5} aria-hidden />
              <h3 className="mt-3 text-base font-semibold">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">{text}</p>
            </Reveal>
          ))}
        </ul>
        <Link href="/security" className="mt-10 inline-flex items-center gap-2 text-sm font-semibold text-brand hover:underline">
          Read the security overview <ArrowRight className="h-4 w-4" strokeWidth={2} aria-hidden />
        </Link>
      </div>
    </div>
  );
}
