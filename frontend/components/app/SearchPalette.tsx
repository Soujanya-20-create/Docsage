"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { CornerDownLeft, FileText, MessageCircle, Search } from "lucide-react";
import { api, type Doc } from "@/lib/api";
import { useChats } from "@/lib/chats";

export const OPEN_SEARCH_EVENT = "docsage:search";

type Hit = { key: string; kind: "chat" | "doc"; label: string; hint: string; go: () => void };

/** Ctrl/Cmd+K palette over the signed-in user's chats and documents. Filtering is client-side. */
export function SearchPalette() {
  const router = useRouter();
  const reduce = useReducedMotion();
  const { chats, setActiveId } = useChats();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [docs, setDocs] = useState<Doc[]>([]);
  const [cursor, setCursor] = useState(0);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const toggle = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === "Escape") setOpen(false);
    };
    const show = () => setOpen(true);
    window.addEventListener("keydown", toggle);
    window.addEventListener(OPEN_SEARCH_EVENT, show);
    return () => {
      window.removeEventListener("keydown", toggle);
      window.removeEventListener(OPEN_SEARCH_EVENT, show);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setCursor(0);
    api<Doc[]>("/documents").then(setDocs).catch(() => undefined);
    const t = setTimeout(() => input.current?.focus(), 30);
    return () => clearTimeout(t);
  }, [open]);

  const hits = useMemo<Hit[]>(() => {
    const q = query.trim().toLowerCase();
    const match = (s: string) => !q || s.toLowerCase().includes(q);
    const c: Hit[] = chats
      .filter((x) => match(x.title))
      .slice(0, 6)
      .map((x) => ({
        key: `c${x.id}`,
        kind: "chat",
        label: x.title,
        hint: "Chat",
        go: () => {
          setActiveId(x.id);
          router.push("/chat");
        },
      }));
    const d: Hit[] = docs
      .filter((x) => match(x.filename))
      .slice(0, 6)
      .map((x) => ({ key: `d${x.id}`, kind: "doc", label: x.filename, hint: "Document", go: () => router.push("/documents") }));
    return [...c, ...d];
  }, [query, chats, docs, router, setActiveId]);

  function choose(h?: Hit) {
    if (!h) return;
    setOpen(false);
    h.go();
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-start justify-center bg-[#0c1330]/40 px-4 pt-[12vh] backdrop-blur-sm"
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(e) => e.target === e.currentTarget && setOpen(false)}
        >
          <motion.div
            role="dialog"
            aria-label="Search documents and chats"
            className="card w-full max-w-xl overflow-hidden"
            initial={reduce ? false : { opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
          >
            <div className="flex items-center gap-3 border-b border-line px-4">
              <Search className="h-[18px] w-[18px] text-muted" strokeWidth={1.9} aria-hidden />
              <input
                ref={input}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setCursor(0);
                }}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setCursor((c) => Math.min(c + 1, hits.length - 1));
                  } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setCursor((c) => Math.max(c - 1, 0));
                  } else if (e.key === "Enter") choose(hits[cursor]);
                }}
                placeholder="Search documents and chats"
                aria-label="Search"
                className="h-14 flex-1 bg-transparent text-[0.95rem] outline-none placeholder:text-muted"
              />
              <kbd className="rounded-md bg-brand-soft px-1.5 py-0.5 text-[11px] font-semibold text-muted">Esc</kbd>
            </div>
            <ul className="scroll-thin max-h-80 overflow-y-auto p-2">
              {hits.length === 0 && <li className="px-3 py-8 text-center text-sm text-muted">Nothing matches &quot;{query}&quot;.</li>}
              {hits.map((h, i) => (
                <li key={h.key}>
                  <button
                    onMouseEnter={() => setCursor(i)}
                    onClick={() => choose(h)}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm ${i === cursor ? "bg-brand-soft" : ""}`}
                  >
                    <span className={`tint-ico grid h-8 w-8 shrink-0 place-items-center rounded-lg ${h.kind === "chat" ? "t-violet" : "t-blue"}`}>
                      {h.kind === "chat" ? <MessageCircle className="h-4 w-4" strokeWidth={1.8} aria-hidden /> : <FileText className="h-4 w-4" strokeWidth={1.8} aria-hidden />}
                    </span>
                    <span className="min-w-0 flex-1 truncate font-medium">{h.label}</span>
                    <span className="text-xs text-muted">{h.hint}</span>
                    {i === cursor && <CornerDownLeft className="h-3.5 w-3.5 text-muted" strokeWidth={1.9} aria-hidden />}
                  </button>
                </li>
              ))}
            </ul>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
