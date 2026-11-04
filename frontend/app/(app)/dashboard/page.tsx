"use client";

import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BorderBeam } from "border-beam";
import { MetalFx } from "metal-fx";
import { ThinkingOrb } from "thinking-orbs";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Circle,
  FileText,
  Image as ImageIcon,
  Layers,
  Loader2,
  MessageSquare,
  MessagesSquare,
  RefreshCw,
  Sparkles,
  UploadCloud,
} from "lucide-react";
import { AreaChart, Sparkline } from "@/components/charts/AreaChart";
import { BarList } from "@/components/charts/BarList";
import { CountUp } from "@/components/charts/CountUp";
import { DonutChart } from "@/components/charts/DonutChart";
import { ApiError, api, type Stats } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useChats } from "@/lib/chats";
import { usePrefs } from "@/lib/prefs";

const PROMPTS = ["Summarize my latest document", "What are the key dates?", "Find the payment terms"];

function greeting(): string {
  const h = new Date().getHours();
  return h < 5 ? "Working late" : h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

const formatBytes = (b: number) => (b < 1024 * 1024 ? `${Math.max(0, Math.round(b / 1024))} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`);

function Panel({ title, hint, action, children, className = "" }: { title: string; hint?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`card flex flex-col p-5 sm:p-6 ${className}`}>
      <header className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold tracking-tight">{title}</h2>
          {hint && <p className="mt-0.5 text-sm text-muted">{hint}</p>}
        </div>
        {action}
      </header>
      <div className="flex-1">{children}</div>
    </section>
  );
}

function StatCard({ icon: Icon, label, value, detail, trend }: { icon: typeof FileText; label: string; value: number; detail: string; trend?: number[] }) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-soft text-brand">
          <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden />
        </span>
        {trend && trend.some((v) => v > 0) && <Sparkline values={trend} />}
      </div>
      <p className="mt-4 text-3xl font-semibold tabular-nums tracking-tight">
        <CountUp value={value} />
      </p>
      <p className="mt-1 text-sm font-medium">{label}</p>
      <p className="text-xs text-muted">{detail}</p>
    </div>
  );
}

function Meter({ label, used, max, format }: { label: string; used: number; max: number; format: (n: number) => string }) {
  const pct = Math.min(100, Math.round((used / Math.max(1, max)) * 100));
  return (
    <div>
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="tabular-nums text-muted">
          {format(used)} of {format(max)}
        </span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-line" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
        <div className={`h-full rounded-full transition-[width] duration-700 ${pct > 85 ? "bg-warn" : "bg-brand-solid"}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Loading dashboard">
      <div className="sk h-64 !rounded-3xl" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="sk h-36 !rounded-3xl" />
        ))}
      </div>
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="sk h-80 !rounded-3xl lg:col-span-2" />
        <div className="sk h-80 !rounded-3xl" />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { setPendingQuestion, setActiveId, newChat } = useChats();
  const [prefs] = usePrefs();
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState("");
  const [question, setQuestion] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      setStats(await api<Stats>("/stats"));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load your dashboard.");
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  // Follow documents that are still being read.
  const processing = stats?.by_status.processing ?? 0;
  useEffect(() => {
    if (!processing) return;
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, [processing, load]);

  function startChat(text?: string) {
    newChat();
    if (text?.trim()) setPendingQuestion(text.trim());
    router.push("/chat");
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    startChat(question);
  }

  const first = (user?.name || "").split(" ")[0];
  const beamTheme = prefs.theme === "dark" ? "dark" : "light";

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5 px-4 py-6 sm:px-6 sm:py-8">
      {/* Hero */}
      <section className="relative isolate overflow-hidden rounded-3xl border border-line bg-card shadow-[var(--shadow)]">
        <div className="bg-wash absolute inset-0 -z-10" aria-hidden />
        <div className="bg-grid absolute inset-0 -z-10 opacity-70" aria-hidden />
        <div className="grid items-center gap-8 p-6 sm:p-10 lg:grid-cols-[1.35fr_0.65fr]">
          <div>
            <p className="text-sm font-semibold text-brand">
              {greeting()}
              {first ? `, ${first}` : ""}
            </p>
            <h1 className="mt-2 max-w-xl text-3xl font-semibold leading-[1.1] tracking-tight sm:text-4xl">Start a chat with your documents</h1>
            <p className="mt-3 max-w-lg text-[0.95rem] leading-relaxed text-muted">Ask a question in plain language. Every answer cites the file and page it came from.</p>

            <form onSubmit={submit} className="mt-6 max-w-xl">
              <BorderBeam size="md" colorVariant="ocean" strength={0.7} theme={beamTheme}>
                <div className="flex items-center gap-2 rounded-2xl border border-line bg-card p-2 pl-4">
                  <label htmlFor="hero-ask" className="sr-only">
                    Ask a question
                  </label>
                  <input
                    id="hero-ask"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    maxLength={4000}
                    placeholder="Ask anything about your documents"
                    className="min-w-0 flex-1 bg-transparent py-2 text-[0.95rem] outline-none placeholder:text-muted"
                  />
                  <MetalFx preset="chromatic" theme={beamTheme} innerShadow>
                    <button type="submit" className="inline-flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-semibold text-fg">
                      Start chat <ArrowRight className="h-4 w-4" strokeWidth={2} aria-hidden />
                    </button>
                  </MetalFx>
                </div>
              </BorderBeam>
            </form>

            <div className="mt-5 flex flex-wrap items-center gap-2.5">
              {PROMPTS.map((p) => (
                <button key={p} type="button" onClick={() => startChat(p)} className="rounded-full border border-line bg-card px-3.5 py-1.5 text-xs font-medium text-muted transition-colors hover:border-brand hover:text-fg">
                  {p}
                </button>
              ))}
              <Link href="/documents" className="inline-flex items-center gap-1.5 px-1 text-xs font-semibold text-brand hover:underline">
                <UploadCloud className="h-3.5 w-3.5" strokeWidth={2} aria-hidden /> Upload documents
              </Link>
            </div>
          </div>

          <div className="relative hidden place-items-center lg:grid" aria-hidden>
            <div className="grid h-44 w-44 place-items-center rounded-full border border-line bg-brand-soft/60">
              <ThinkingOrb state="weaving" size={64} theme="auto" />
            </div>
          </div>
        </div>
      </section>

      {error && (
        <div role="alert" className="card flex flex-wrap items-center gap-3 border-danger/40 p-4 text-sm">
          <AlertCircle className="h-5 w-5 text-danger" strokeWidth={1.75} aria-hidden />
          <span className="flex-1">{error}</span>
          <button onClick={load} className="btn btn-ghost !py-1.5">
            <RefreshCw className="h-4 w-4" strokeWidth={1.75} aria-hidden /> Try again
          </button>
        </div>
      )}

      {!stats && !error && <Skeleton />}

      {stats && (
        <>
          {/* First-run checklist until the basics are done */}
          {(stats.totals.ready === 0 || stats.totals.questions === 0 || !user?.email_verified) && (
            <section className="card p-5 sm:p-6">
              <h2 className="text-base font-semibold tracking-tight">Get set up</h2>
              <ul className="mt-4 grid gap-3 md:grid-cols-3">
                {[
                  { done: stats.totals.ready > 0, title: "Upload a document", text: "PDFs and scans both work.", href: "/documents", cta: "Upload" },
                  { done: stats.totals.questions > 0, title: "Ask your first question", text: "Answers cite their pages.", href: "/chat", cta: "Open chat" },
                  { done: !!user?.email_verified, title: "Confirm your email", text: "Enter the 6-digit code we sent.", href: "/verify-email", cta: "Enter code" },
                ].map((s) => (
                  <li key={s.title} className={`flex items-start gap-3 rounded-2xl border p-4 ${s.done ? "border-ok/30 bg-ok/5" : "border-line"}`}>
                    {s.done ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-ok" strokeWidth={1.75} aria-hidden /> : <Circle className="mt-0.5 h-5 w-5 shrink-0 text-muted" strokeWidth={1.75} aria-hidden />}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold">{s.title}</p>
                      <p className="text-xs text-muted">{s.text}</p>
                      {!s.done && (
                        <Link href={s.href} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline">
                          {s.cta} <ArrowRight className="h-3 w-3" strokeWidth={2} aria-hidden />
                        </Link>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Numbers */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard icon={FileText} label="Documents" value={stats.totals.documents} detail={`${stats.totals.ready} ready${processing ? `, ${processing} processing` : ""}`} trend={stats.activity.map((a) => a.uploads)} />
            <StatCard icon={Layers} label="Pages indexed" value={stats.totals.pages} detail={`${stats.totals.passages.toLocaleString()} searchable passages`} />
            <StatCard icon={MessageSquare} label="Questions asked" value={stats.totals.questions} detail="Across all chats" trend={stats.activity.map((a) => a.questions)} />
            <StatCard icon={MessagesSquare} label="Chats" value={stats.totals.chats} detail={stats.totals.chats ? "Saved in the sidebar" : "Start one above"} />
          </div>

          {/* Charts */}
          <div className="grid gap-5 lg:grid-cols-3">
            <Panel title="Activity" hint="Questions asked and documents uploaded, last 14 days" className="lg:col-span-2">
              <AreaChart data={stats.activity.map((a) => ({ label: a.date, a: a.questions, b: a.uploads }))} aLabel="Questions" bLabel="Uploads" />
            </Panel>
            <Panel title="Your library" hint="By file type and status">
              <div className="space-y-6">
                <DonutChart
                  centerLabel="files"
                  slices={[
                    { label: "PDF", value: stats.by_kind.pdf ?? 0, color: "var(--brand-solid)" },
                    { label: "Images", value: stats.by_kind.image ?? 0, color: "var(--ink)" },
                  ]}
                />
                <ul className="flex flex-wrap gap-2 text-xs">
                  {[
                    ["ready", "Ready", "text-ok"],
                    ["processing", "Processing", "text-muted"],
                    ["failed", "Failed", "text-danger"],
                  ].map(([key, label, tone]) => (
                    <li key={key} className={`rounded-full border border-line px-2.5 py-1 font-medium ${tone}`}>
                      {label} {stats.by_status[key] ?? 0}
                    </li>
                  ))}
                </ul>
              </div>
            </Panel>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <Panel title="Most cited documents" hint="How often answers drew on each file">
              {stats.top_documents.length ? (
                <BarList items={stats.top_documents.map((d) => ({ label: d.filename, value: d.citations }))} unit="answer" />
              ) : (
                <p className="rounded-2xl bg-bg p-5 text-sm text-muted">Once you ask questions, the documents your answers rely on most will be ranked here.</p>
              )}
            </Panel>
            <Panel title="Usage" hint="Your plan limits">
              <div className="space-y-6">
                <Meter label="Documents" used={stats.totals.documents} max={stats.quota.max_documents} format={(n) => String(n)} />
                <Meter label="Storage" used={stats.totals.storage_bytes} max={stats.quota.max_storage_mb * 1024 * 1024} format={formatBytes} />
                <p className="text-xs leading-relaxed text-muted">Storage counts the size of the files you uploaded. The original files themselves are deleted once they are indexed.</p>
              </div>
            </Panel>
          </div>

          {/* Recent */}
          <div className="grid gap-5 lg:grid-cols-2">
            <Panel title="Recent documents" action={<Link href="/documents" className="text-sm font-semibold text-brand hover:underline">View all</Link>}>
              {stats.recent_documents.length === 0 ? (
                <div className="grid place-items-center rounded-2xl border border-dashed border-line px-4 py-10 text-center">
                  <UploadCloud className="h-8 w-8 text-brand" strokeWidth={1.5} aria-hidden />
                  <p className="mt-3 text-sm font-semibold">No documents yet</p>
                  <Link href="/documents" className="btn mt-4">
                    Upload your first document
                  </Link>
                </div>
              ) : (
                <ul className="divide-y divide-line">
                  {stats.recent_documents.map((d) => (
                    <li key={d.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                      {d.kind === "pdf" ? <FileText className="h-5 w-5 shrink-0 text-brand" strokeWidth={1.75} aria-hidden /> : <ImageIcon className="h-5 w-5 shrink-0 text-brand" strokeWidth={1.75} aria-hidden />}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{d.filename}</p>
                        <p className="text-xs text-muted">{d.status === "ready" ? `${d.pages} page${d.pages === 1 ? "" : "s"}` : d.status === "processing" ? "Reading and indexing" : "Could not be read"}</p>
                      </div>
                      {d.status === "processing" ? (
                        <Loader2 className="h-4 w-4 animate-spin text-muted" aria-label="Processing" />
                      ) : d.status === "failed" ? (
                        <AlertCircle className="h-4 w-4 text-danger" aria-label="Failed" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4 text-ok" aria-label="Ready" />
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            <Panel title="Recent chats" action={<button onClick={() => startChat()} className="text-sm font-semibold text-brand hover:underline">New chat</button>}>
              {stats.recent_chats.length === 0 ? (
                <div className="grid place-items-center rounded-2xl border border-dashed border-line px-4 py-10 text-center">
                  <Sparkles className="h-8 w-8 text-brand" strokeWidth={1.5} aria-hidden />
                  <p className="mt-3 text-sm font-semibold">No conversations yet</p>
                  <button onClick={() => startChat()} className="btn mt-4">
                    Start a chat
                  </button>
                </div>
              ) : (
                <ul className="divide-y divide-line">
                  {stats.recent_chats.map((c) => (
                    <li key={c.id}>
                      <button
                        onClick={() => {
                          setActiveId(c.id);
                          router.push("/chat");
                        }}
                        className="flex w-full items-center gap-3 py-3 text-left first:pt-0 last:pb-0"
                      >
                        <MessageSquare className="h-5 w-5 shrink-0 text-brand" strokeWidth={1.75} aria-hidden />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">{c.title}</span>
                          <span className="text-xs text-muted">
                            {c.questions} question{c.questions === 1 ? "" : "s"}
                          </span>
                        </span>
                        <ArrowRight className="h-4 w-4 shrink-0 text-muted" strokeWidth={1.75} aria-hidden />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>
        </>
      )}
    </div>
  );
}
