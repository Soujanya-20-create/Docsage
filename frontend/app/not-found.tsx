import Link from "next/link";
import { ArrowLeft, FileQuestion } from "lucide-react";
import { Brand } from "@/components/Brand";

export default function NotFound() {
  return (
    <main className="relative isolate grid min-h-[100dvh] place-items-center px-4">
      <div className="bg-grid absolute inset-0 -z-10" aria-hidden />
      <div className="bg-wash absolute inset-0 -z-10" aria-hidden />
      <div className="max-w-md text-center">
        <Link href="/" className="inline-flex" aria-label="DocSage home">
          <Brand />
        </Link>
        <span className="mx-auto mt-10 grid h-14 w-14 place-items-center rounded-2xl bg-brand-soft text-brand">
          <FileQuestion className="h-7 w-7" strokeWidth={1.75} aria-hidden />
        </span>
        <h1 className="mt-6 text-3xl font-semibold tracking-tight">We could not find that page</h1>
        <p className="mt-3 text-muted">The link may be old or mistyped. Head back and try again.</p>
        <Link href="/" className="btn btn-lg mt-8">
          <ArrowLeft className="h-4 w-4" strokeWidth={2} aria-hidden /> Back to home
        </Link>
      </div>
    </main>
  );
}
