import type { ReactNode } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/site/PageHeader";
import { site } from "@/lib/site";

export type LegalSection = { id: string; title: string; body: ReactNode };

const others = [
  { href: "/terms", label: "Terms of Service" },
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/cookies", label: "Cookie Policy" },
];

/** Shared shell for the legal pages: header, sticky contents list, and the document itself. */
export function LegalLayout({
  title,
  intro,
  sections,
  current,
}: {
  title: string;
  intro: string;
  sections: LegalSection[];
  current: string;
}) {
  return (
    <>
      <PageHeader title={title}>{intro}</PageHeader>
      <div className="mx-auto grid max-w-6xl gap-10 px-4 pb-24 sm:px-6 lg:grid-cols-[15rem_1fr] lg:gap-16">
        <aside className="lg:sticky lg:top-28 lg:self-start">
          <p className="text-sm font-semibold">On this page</p>
          <nav aria-label="Contents" className="mt-3">
            <ol className="space-y-1.5 text-sm">
              {sections.map((s, i) => (
                <li key={s.id}>
                  <a href={`#${s.id}`} className="block rounded-md py-1 text-muted transition-colors hover:text-fg">
                    <span className="mr-2 tabular-nums text-muted/70">{i + 1}.</span>
                    {s.title}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
          <div className="mt-8 hidden border-t border-line pt-5 text-sm lg:block">
            <p className="font-semibold">Other documents</p>
            <ul className="mt-2 space-y-1.5">
              {others
                .filter((o) => o.href !== current)
                .map((o) => (
                  <li key={o.href}>
                    <Link href={o.href} className="text-muted hover:text-fg">
                      {o.label}
                    </Link>
                  </li>
                ))}
            </ul>
          </div>
        </aside>

        <article className="legal min-w-0 max-w-3xl">
          <p className="!mt-0 text-sm">
            <strong>Effective and last updated:</strong> {site.legalUpdated}
          </p>
          <p className="rounded-xl border border-line bg-card p-4 text-sm">
            These documents describe how {site.name} works today. They are provided in good faith and should be reviewed by a qualified lawyer
            for your situation and jurisdiction before you rely on them as legal advice.
          </p>
          {sections.map((s, i) => (
            <section key={s.id} aria-labelledby={s.id}>
              <h2 id={s.id}>
                {i + 1}. {s.title}
              </h2>
              {s.body}
            </section>
          ))}
        </article>
      </div>
    </>
  );
}
