"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import { BarChart3, FileText, Image as ImageIcon, LayoutGrid, Layers, List, MessageCircle, MessageSquarePlus, Search, Settings, UploadCloud } from "lucide-react";
import { api, type Stats } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useChats } from "@/lib/chats";
import { OPEN_SEARCH_EVENT } from "@/components/app/SearchPalette";

type Filter = "all" | "documents" | "chats";
type Item = { key: string; kind: "doc" | "chat"; title: string; meta: string; tone: string; icon: typeof FileText; go: () => void };

const ago = (iso: string) => {
  const m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  return d === 1 ? "yesterday" : `${d} days ago`;
};

export default function WorkspacePage() {
  const { user } = useAuth();
  const { setActiveId, newChat } = useChats();
  const router = useRouter();
  const reduce = useReducedMotion();
  const [stats, setStats] = useState<Stats | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [layout, setLayout] = useState<"grid" | "list">("grid");

  useEffect(() => {
    api<Stats>("/stats").then(setStats).catch(() => undefined);
  }, []);

  const items = useMemo<Item[]>(() => {
    if (!stats) return [];
    const docs: Item[] = stats.recent_documents.map((d) => ({
      key: `d${d.id}`,
      kind: "doc",
      title: d.filename,
      meta: `${d.status === "ready" ? `${d.pages} page${d.pages === 1 ? "" : "s"}` : d.status} · ${ago(d.created_at)}`,
      tone: d.kind === "pdf" ? "t-blue" : "t-amber",
      icon: d.kind === "pdf" ? FileText : ImageIcon,
      go: () => router.push("/documents"),
    }));
    const chats: Item[] = stats.recent_chats.map((c) => ({
      key: `c${c.id}`,
      kind: "chat",
      title: c.title,
      meta: `${c.questions} question${c.questions === 1 ? "" : "s"} · ${ago(c.created_at)}`,
      tone: "t-violet",
      icon: MessageCircle,
      go: () => {
        setActiveId(c.id);
        router.push("/chat");
      },
    }));
    return filter === "documents" ? docs : filter === "chats" ? chats : [...docs, ...chats];
  }, [stats, filter, router, setActiveId]);

  const first = (user?.name || "there").split(/\s+/)[0];
  const t = stats?.totals;

  const actions = [
    { label: "New Chat", icon: MessageSquarePlus, tone: "t-blue", onClick: () => { newChat(); router.push("/chat"); } },
    { label: "Upload Document", icon: UploadCloud, tone: "t-violet", onClick: () => router.push("/documents") },
    { label: "Search", icon: Search, tone: "t-amber", onClick: () => window.dispatchEvent(new Event(OPEN_SEARCH_EVENT)) },
    { label: "Analytics", icon: BarChart3, tone: "t-green", onClick: () => router.push("/dashboard") },
    { label: "Settings", icon: Settings, tone: "t-cyan", onClick: () => router.push("/settings") },
  ];

  const tiles = [
    { label: "Total Documents", value: t?.documents, icon: FileText, tone: "t-blue" },
    { label: "Passages Indexed", value: t?.passages, icon: Layers, tone: "t-violet" },
    { label: "Total Chats", value: t?.chats, icon: MessageCircle, tone: "t-green" },
    { label: "Questions Asked", value: t?.questions, icon: MessageSquarePlus, tone: "t-amber" },
  ];

  const rise = (i: number) =>
    reduce ? {} : { initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 }, transition: { delay: i * 0.05, duration: 0.45, ease: [0.16, 1, 0.3, 1] as const } };

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 px-4 py-6 sm:px-8 sm:py-8">
      {/* Title row */}
      <header className="flex flex-wrap items-center gap-4">
        <span className="tint-ico t-blue grid h-12 w-12 place-items-center rounded-2xl">
          <Layers className="h-6 w-6" strokeWidth={1.8} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-extrabold tracking-tight">Workspace</h1>
          <p className="text-sm text-muted">Your documents and conversations in one place.</p>
        </div>
        <button
          onClick={() => window.dispatchEvent(new Event(OPEN_SEARCH_EVENT))}
          className="glass hidden min-w-[20rem] items-center gap-3 rounded-full px-5 py-3 text-sm text-muted transition-shadow hover:shadow-[var(--shadow-lift)] md:flex"
        >
          <Search className="h-[18px] w-[18px]" strokeWidth={1.9} aria-hidden />
          <span className="flex-1 text-left">Search documents or chats</span>
          <kbd className="rounded-lg bg-brand-soft px-2 py-0.5 text-xs font-semibold">Ctrl + K</kbd>
        </button>
      </header>

      {/* Hero */}
      <motion.section {...rise(0)} className="hero-banner card relative overflow-hidden px-6 py-9 sm:px-10 sm:py-12">
        <div className="relative z-10 max-w-xl">
          <p className="text-sm font-semibold text-brand">Welcome back, {first}</p>
          <h2 className="mt-2 text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">
            Your AI document <span className="text-grad">workspace</span>
          </h2>
          <p className="mt-3 text-[0.95rem] leading-relaxed text-muted">
            Upload PDFs and scans, ask in plain language, and get answers that point to the exact page they came from.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button onClick={() => { newChat(); router.push("/chat"); }} className="btn btn-lg">
              <MessageSquarePlus className="h-[18px] w-[18px]" strokeWidth={2} aria-hidden /> Start a chat
            </button>
            <Link href="/documents" className="btn btn-ghost btn-lg">
              <UploadCloud className="h-[18px] w-[18px]" strokeWidth={2} aria-hidden /> Upload a document
            </Link>
          </div>
        </div>
        {/* decorative folder stack, pure CSS */}
        <div aria-hidden className="pointer-events-none absolute -right-6 top-1/2 hidden h-64 w-[26rem] -translate-y-1/2 sm:block">
          <div className="absolute right-24 top-6 h-44 w-56 rotate-[-9deg] rounded-3xl bg-gradient-to-br from-[#7aa5ff] to-[#4f6ff0] opacity-80 shadow-xl" />
          <div className="absolute right-14 top-10 h-44 w-56 rotate-[-3deg] rounded-3xl bg-gradient-to-br from-[#9d8bff] to-[#6a52f0] opacity-85 shadow-xl" />
          <div className="glass absolute right-6 top-14 grid h-44 w-56 rotate-[4deg] place-items-center rounded-3xl">
            <span className="bg-grad grid h-16 w-16 place-items-center rounded-2xl text-white shadow-lg">
              <FileText className="h-8 w-8" strokeWidth={1.8} />
            </span>
          </div>
        </div>
      </motion.section>

      {/* Quick actions */}
      <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {actions.map((a, i) => (
          <motion.li key={a.label} {...rise(i + 1)}>
            <button onClick={a.onClick} className={`tint ${a.tone} lift card flex w-full flex-col items-center gap-3 px-3 py-6 text-center`}>
              <span className={`tint-ico ${a.tone} grid h-12 w-12 place-items-center rounded-2xl`}>
                <a.icon className="h-6 w-6" strokeWidth={1.8} aria-hidden />
              </span>
              <span className="text-sm font-bold">{a.label}</span>
            </button>
          </motion.li>
        ))}
      </ul>

      {/* Recent work */}
      <section aria-labelledby="recent-h">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <h2 id="recent-h" className="mr-auto text-xl font-extrabold tracking-tight">
            Recent work
          </h2>
          <div role="tablist" aria-label="Filter" className="flex gap-1.5">
            {(["all", "documents", "chats"] as Filter[]).map((f) => (
              <button
                key={f}
                role="tab"
                aria-selected={filter === f}
                onClick={() => setFilter(f)}
                className={`rounded-full px-4 py-2 text-sm font-semibold capitalize transition-colors ${filter === f ? "bg-grad text-white shadow-md" : "bg-card text-muted hover:bg-brand-soft hover:text-fg"}`}
              >
                {f}
              </button>
            ))}
          </div>
          <div className="flex rounded-full bg-card p-1" role="group" aria-label="Layout">
            {([["grid", LayoutGrid], ["list", List]] as const).map(([k, Icon]) => (
              <button
                key={k}
                onClick={() => setLayout(k)}
                aria-pressed={layout === k}
                aria-label={`${k} view`}
                className={`grid h-9 w-9 place-items-center rounded-full ${layout === k ? "bg-grad text-white" : "text-muted hover:text-fg"}`}
              >
                <Icon className="h-4 w-4" strokeWidth={2} aria-hidden />
              </button>
            ))}
          </div>
        </div>

        {!stats && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-hidden>
            {[0, 1, 2, 3].map((i) => <div key={i} className="sk h-32 rounded-3xl" />)}
          </div>
        )}
        {stats && items.length === 0 && (
          <div className="card px-6 py-12 text-center">
            <p className="font-bold">Nothing here yet</p>
            <p className="mt-1 text-sm text-muted">Upload a document or start a chat and it will show up here.</p>
          </div>
        )}
        <ul className={layout === "grid" ? "grid gap-4 sm:grid-cols-2 lg:grid-cols-4" : "space-y-3"}>
          {items.map((it) => (
            <li key={it.key}>
              <button onClick={it.go} className={`tint ${it.tone} lift card w-full text-left ${layout === "grid" ? "p-5" : "flex items-center gap-4 p-4"}`}>
                <span className={`tint-ico ${it.tone} grid h-11 w-11 shrink-0 place-items-center rounded-xl`}>
                  <it.icon className="h-5 w-5" strokeWidth={1.8} aria-hidden />
                </span>
                <span className={`block min-w-0 ${layout === "grid" ? "mt-4" : "flex-1"}`}>
                  <span className="block truncate text-[0.95rem] font-bold">{it.title}</span>
                  <span className="mt-0.5 block truncate text-xs text-muted">{it.meta}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      {/* Totals */}
      <ul className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {tiles.map((s) => (
          <li key={s.label} className="card flex items-center gap-4 p-4 sm:p-5">
            <span className={`tint-ico ${s.tone} grid h-12 w-12 shrink-0 place-items-center rounded-2xl`}>
              <s.icon className="h-6 w-6" strokeWidth={1.8} aria-hidden />
            </span>
            <div>
              <p className="text-2xl font-extrabold tabular-nums leading-none">{s.value ?? "–"}</p>
              <p className="mt-1.5 text-sm text-muted">{s.label}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
