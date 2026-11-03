"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { FileText, MessageSquarePlus, Send, Trash2 } from "lucide-react";
import { api, ask, json, type Chat, type Message, type Source } from "@/lib/api";

function Sources({ sources }: { sources: Source[] }) {
  if (!sources.length) return null;
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {sources.map((s) => (
        <details key={s.n} className="rounded-lg border border-line bg-bg text-xs">
          <summary className="flex cursor-pointer items-center gap-1 px-2 py-1">
            <FileText className="h-3 w-3 text-brand" />
            <span className="font-semibold">[{s.n}]</span> {s.filename}, p.{s.page}
          </summary>
          <p className="max-w-xs px-2 pb-2 text-muted">{s.excerpt}…</p>
        </details>
      ))}
    </div>
  );
}

export default function ChatPage() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const bottom = useRef<HTMLDivElement>(null);

  const loadChats = useCallback(() => api<Chat[]>("/chats").then(setChats), []);
  useEffect(() => { loadChats(); }, [loadChats]);
  useEffect(() => { bottom.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  async function open(id: number) {
    setActiveId(id);
    setError("");
    setMessages(await api<Message[]>(`/chats/${id}/messages`));
  }

  async function remove(id: number) {
    await api(`/chats/${id}`, { method: "DELETE" });
    if (id === activeId) {
      setActiveId(null);
      setMessages([]);
    }
    loadChats();
  }

  async function send(e: FormEvent) {
    e.preventDefault();
    const text = question.trim();
    if (!text || busy) return;
    setQuestion("");
    setError("");
    setBusy(true);

    let id = activeId;
    if (id === null) {
      id = (await api<Chat>("/chats", json({}))).id;
      setActiveId(id);
    }
    setMessages((m) => [
      ...m,
      { id: Date.now(), role: "user", content: text, sources: [] },
      { id: Date.now() + 1, role: "assistant", content: "", sources: [] },
    ]);
    const patchLast = (change: (m: Message) => Message) =>
      setMessages((all) => all.map((m, i) => (i === all.length - 1 ? change(m) : m)));

    try {
      await ask(id, text, {
        onSources: (sources) => patchLast((m) => ({ ...m, sources })),
        onToken: (token) => patchLast((m) => ({ ...m, content: m.content + token })),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "The answer failed");
      setMessages((all) => all.filter((m, i) => i !== all.length - 1 || m.content));
    } finally {
      setBusy(false);
      loadChats();
    }
  }

  return (
    <div className="flex h-full">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-line p-3 sm:flex">
        <button onClick={() => { setActiveId(null); setMessages([]); }} className="btn btn-ghost mb-3 w-full">
          <MessageSquarePlus className="h-4 w-4" /> New chat
        </button>
        <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto">
          {chats.map((c) => (
            <li key={c.id} className={`group flex items-center rounded-lg ${c.id === activeId ? "bg-line" : "hover:bg-line"}`}>
              <button onClick={() => open(c.id)} className="min-w-0 flex-1 truncate px-3 py-2 text-left text-sm">{c.title}</button>
              <button onClick={() => remove(c.id)} aria-label={`Delete chat ${c.title}`} className="p-2 text-muted opacity-0 hover:text-danger focus:opacity-100 group-hover:opacity-100">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <section className="flex min-w-0 flex-1 flex-col">
        <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
          {messages.length === 0 && (
            <div className="mx-auto mt-24 max-w-md text-center">
              <h1 className="text-2xl font-bold">Ask your documents</h1>
              <p className="mt-2 text-sm text-muted">Answers are grounded in what you uploaded and cite the page they came from.</p>
            </div>
          )}
          {messages.map((m) => (
            <div key={m.id} className={m.role === "user" ? "flex justify-end" : ""}>
              <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${m.role === "user" ? "bg-brand text-brand-fg" : "border border-line bg-card"}`}>
                {m.role === "user" ? m.content : (
                  <>
                    <div className="prose-chat">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content || "…"}</ReactMarkdown>
                    </div>
                    <Sources sources={m.sources} />
                  </>
                )}
              </div>
            </div>
          ))}
          <div ref={bottom} />
        </div>

        {error && <p role="alert" className="px-4 pb-2 text-sm text-danger sm:px-6">{error}</p>}
        <form onSubmit={send} className="flex gap-2 border-t border-line p-3 sm:p-4">
          <input
            className="input"
            placeholder="Ask a question about your documents…"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            maxLength={4000}
          />
          <button className="btn" disabled={busy || !question.trim()} aria-label="Send">
            <Send className="h-4 w-4" />
          </button>
        </form>
      </section>
    </div>
  );
}
