import Link from "next/link";
import { ArrowLeft, FileCheck2, LockKeyhole, Quote } from "lucide-react";
import { Brand } from "@/components/Brand";
import ChatDemo from "@/components/demo/ChatDemo";

const points = [
  { icon: Quote, text: "Every answer cites the file and page it came from." },
  { icon: FileCheck2, text: "PDFs and scans, searched by meaning and exact words." },
  { icon: LockKeyhole, text: "Originals are deleted after indexing. Delete everything any time." },
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-[100dvh] lg:grid-cols-[1.05fr_1fr]">
      {/* Left: what you are signing in to */}
      <aside className="relative isolate hidden overflow-hidden border-r border-line lg:flex lg:flex-col lg:justify-between lg:p-12 xl:p-16">
        <div className="bg-grid absolute inset-0 -z-10" aria-hidden />
        <div className="bg-wash absolute inset-0 -z-10" aria-hidden />
        <Link href="/" aria-label="DocSage home" className="inline-flex w-fit">
          <Brand size={28} />
        </Link>

        <div className="my-10">
          <h2 className="max-w-md text-4xl font-semibold leading-[1.08] tracking-tight xl:text-5xl">Ask your documents. Get answers you can check.</h2>
          <ul className="mt-8 space-y-4">
            {points.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-3 text-[0.95rem] leading-relaxed text-muted">
                <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand">
                  <Icon className="h-4 w-4" strokeWidth={1.75} aria-hidden />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>

        <ChatDemo className="max-w-xl" />
      </aside>

      {/* Right: the form */}
      <main className="flex flex-col px-4 py-6 sm:px-8">
        <div className="flex items-center justify-between">
          <Link href="/" aria-label="DocSage home" className="lg:invisible">
            <Brand />
          </Link>
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-fg">
            <ArrowLeft className="h-4 w-4" strokeWidth={1.75} aria-hidden /> Back to site
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-center py-10">{children}</div>
        <p className="text-center text-xs text-muted">
          <Link href="/terms" className="hover:text-fg">Terms</Link>
          <span className="mx-2" aria-hidden>·</span>
          <Link href="/privacy" className="hover:text-fg">Privacy</Link>
          <span className="mx-2" aria-hidden>·</span>
          <Link href="/security" className="hover:text-fg">Security</Link>
        </p>
      </main>
    </div>
  );
}
