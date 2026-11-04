import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, LifeBuoy, LockKeyhole, ShieldAlert } from "lucide-react";
import { PageHeader } from "@/components/site/PageHeader";
import { Reveal } from "@/components/site/Reveal";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact",
  description: "Get help, ask a privacy question, or report a security issue.",
};

const topics = [
  {
    icon: LifeBuoy,
    title: "Help with DocSage",
    text: "Something not working, or not sure how to do something? Tell us what you expected and what happened.",
    subject: "Support",
    action: "Ask for help",
  },
  {
    icon: LockKeyhole,
    title: "Privacy requests",
    text: "Ask for a copy of your data, a correction, or deletion. You can also delete your account yourself in Settings.",
    subject: "Privacy request",
    action: "Make a request",
  },
  {
    icon: ShieldAlert,
    title: "Security reports",
    text: "Report a vulnerability privately with steps to reproduce it. Please do not publish details before we have replied.",
    subject: "Security report",
    action: "Report an issue",
  },
];

export default function ContactPage() {
  return (
    <>
      <PageHeader title="Talk to a person">Pick the topic closest to your question and we will route it to the right place.</PageHeader>

      <section className="pb-24 pt-4">
        <div className="mx-auto grid max-w-6xl gap-5 px-4 sm:px-6 md:grid-cols-3">
          {topics.map(({ icon: Icon, title, text, subject, action }, i) => (
            <Reveal key={title} delay={i * 0.08}>
              <div className="card flex h-full flex-col p-7">
                <span className="inline-grid h-11 w-11 place-items-center rounded-xl bg-brand-soft text-brand">
                  <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
                </span>
                <h2 className="mt-5 text-xl font-semibold tracking-tight">{title}</h2>
                <p className="mt-2 flex-1 text-[0.95rem] leading-relaxed text-muted">{text}</p>
                <Link href={`mailto:${site.contactEmail}?subject=${encodeURIComponent(subject)}`} className="btn btn-ghost mt-6 self-start">
                  {action} <ArrowUpRight className="h-4 w-4" strokeWidth={2} aria-hidden />
                </Link>
              </div>
            </Reveal>
          ))}
        </div>
        <p className="mx-auto mt-10 max-w-6xl px-4 text-sm text-muted sm:px-6">
          Prefer plain email? Write to <a className="font-semibold text-brand hover:underline" href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a>.
        </p>
      </section>
    </>
  );
}
