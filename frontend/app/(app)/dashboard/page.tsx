"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  BarChart3,
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
import { ApiError, api, type Stats, type User } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useChats } from "@/lib/chats";


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
    <div className="card p-4 sm:p-5">
      <div className="flex items-center justify-between">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-soft text-brand">
          <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden />
        </span>
        {/* A trend needs at least two active days; one spike reads as a glitch. Too tight beside the icon on phones. */}
        {trend && trend.filter((v) => v > 0).length >= 2 && (
          <span className="hidden sm:block">
            <Sparkline values={trend} />
          </span>
        )}
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

/** First-run steps, shown until the basics are done. Confirming the email only counts when the server can send a code. */
function SetupChecklist({ stats, user }: { stats: Stats; user: User | null }) {
  const steps = [
    { done: stats.totals.ready > 0, title: "Upload a document", text: "PDFs and scans both work.", href: "/documents", cta: "Upload" },
    { done: stats.totals.questions > 0, title: "Ask your first question", text: "Answers cite their pages.", href: "/chat", cta: "Open chat" },
  ];
  if (user?.email_enabled) steps.push({ done: user.email_verified, title: "Confirm your email", text: "Enter the 6-digit code we sent.", href: "/verify-email", cta: "Enter code" });
  if (steps.every((s) => s.done)) return null;

  return (
    <section className="card p-5 sm:p-6">
      <h2 className="text-base font-semibold tracking-tight">Get set up</h2>
      <ul className={`mt-4 grid gap-3 ${steps.length === 3 ? "md:grid-cols-3" : "md:grid-cols-2"}`}>
        {steps.map((s) => (
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
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState("");

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

  const first = (user?.name || "").split(" ")[0];

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5 px-4 py-6 sm:px-6 sm:py-8">
      <header className="flex flex-wrap items-center gap-4">
        <span className="tint-ico t-green grid h-12 w-12 place-items-center rounded-2xl">
          <BarChart3 className="h-6 w-6" strokeWidth={1.8} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-extrabold tracking-tight">Analytics</h1>
          <p className="text-sm text-muted">
            {greeting()}
            {first ? `, ${first}` : ""}. Here is how your documents and questions are doing.
          </p>
        </div>
        <button onClick={() => startChat()} className="btn">
          <MessageSquare className="h-4 w-4" strokeWidth={2} aria-hidden /> New chat
        </button>
      </header>

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

      {stats && <SetupChecklist stats={stats} user={user} />}

      {/* A new account sees only the checklist: the numbers and charts arrive with the first document. */}
      {stats && stats.totals.documents > 0 && (
        <>
          {/* Numbers */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
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
