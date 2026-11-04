"use client";

import { useCallback, useEffect, useRef, useState, type DragEvent } from "react";
import Link from "next/link";
import { ThinkingOrb } from "thinking-orbs";
import { Check, Copy, Sparkles, UploadCloud, Volume2, VolumeX } from "lucide-react";
import { Composer } from "@/components/chat/Composer";
import { AnswerMarkdown, ShareButton, SourceChips } from "@/components/chat/Message";
import { ApiError, api, ask, json, type Chat, type Doc, type Message } from "@/lib/api";
import { useChats } from "@/lib/chats";
import { usePrefs } from "@/lib/prefs";
import { useReadAloud } from "@/lib/speech";
import { useUploads } from "@/lib/upload";

const SUGGESTIONS = [
  "Summarize this document in five bullet points",
  "What are the key dates and deadlines?",
  "List the obligations and who owns each one",
  "Find anything about payment terms or penalties",
];

const iconBtn =
  "inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold text-muted transition-colors hover:bg-brand-soft hover:text-brand";

function CopyButton({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className={iconBtn}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 1800);
        } catch {}
      }}
    >
      {done ? <Check className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden /> : <Copy className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />}
      {done ? "Copied" : "Copy"}
    </button>
  );
}

export default function ChatPage() {
  const { activeId, setActiveId, resetKey, reload, pendingQuestion, setPendingQuestion } = useChats();
  const [prefs] = usePrefs();
  const [messages, setMessages] = useState<Message[]>([]);
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [loadingChat, setLoadingChat] = useState(false);
  const [error, setError] = useState("");
  const [readyDocs, setReadyDocs] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const stick = useRef(true);
  const abort = useRef<AbortController | null>(null);
  const skipLoad = useRef<number | null>(null);
  const drag = useRef(0);
  const speech = useReadAloud(prefs.voiceLang, prefs.speechRate);

  const refreshDocs = useCallback(() => {
    api<Doc[]>("/documents")
      .then((d) => setReadyDocs(d.filter((x) => x.status === "ready").length))
      .catch(() => undefined);
  }, []);
  const uploads = useUploads(refreshDocs);
  useEffect(refreshDocs, [refreshDocs]);

  // "New chat" clears everything, even when the screen is already empty.
  useEffect(() => {
    abort.current?.abort();
    speech.stop();
    setMessages([]);
    setQuestion("");
    setError("");
    uploads.items.length && uploads.items.forEach((u) => uploads.remove(u.key));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

  // Open an existing conversation picked in the sidebar.
  useEffect(() => {
    if (activeId === null || skipLoad.current === activeId) return;
    let live = true;
    setLoadingChat(true);
    setError("");
    api<Message[]>(`/chats/${activeId}/messages`)
      .then((m) => live && setMessages(m))
      .catch((e) => live && setError(e instanceof Error ? e.message : "Could not load this chat."))
      .finally(() => live && setLoadingChat(false));
    return () => {
      live = false;
    };
  }, [activeId]);

  // Keep the newest text in view, unless the reader scrolled up to read.
  useEffect(() => {
    const el = scroller.current;
    if (el && stick.current) el.scrollTo({ top: el.scrollHeight });
  }, [messages, busy]);

  const send = useCallback(
    async (override?: string) => {
      const text = (override ?? question).trim();
      if (!text || busy) return;
      const ids = uploads.items.filter((u) => u.status === "ready" && u.docId).map((u) => u.docId!);
      setQuestion("");
      setError("");
      setBusy(true);
      stick.current = true;
      speech.stop();
      const controller = new AbortController();
      abort.current = controller;

      const patchLast = (change: (m: Message) => Message) => setMessages((all) => all.map((m, i) => (i === all.length - 1 ? change(m) : m)));

      try {
        let id = activeId;
        if (id === null) {
          id = (await api<Chat>("/chats", json({}))).id;
          skipLoad.current = id; // we already hold this conversation's messages
          setActiveId(id);
        }
        const stamp = Date.now();
        setMessages((m) => [
          ...m,
          { id: stamp, role: "user", content: text, sources: [] },
          { id: stamp + 1, role: "assistant", content: "", sources: [] },
        ]);
        let full = "";
        await ask(
          id,
          text,
          {
            onSources: (sources) => patchLast((m) => ({ ...m, sources })),
            onToken: (token) => {
              full += token;
              patchLast((m) => ({ ...m, content: m.content + token }));
            },
          },
          controller.signal,
          ids,
        );
        uploads.items.forEach((u) => uploads.remove(u.key)); // the attached files were used for this question
        if (prefs.autoRead && full) speech.speak(`m${stamp + 1}`, full);
      } catch (err) {
        if (controller.signal.aborted) return; // stopped by the user: keep what was written
        setError(err instanceof ApiError || err instanceof Error ? err.message : "The answer failed.");
        setQuestion((q) => q || text); // give the question back so it can be retried
        setMessages((all) => all.filter((m, i) => i !== all.length - 1 || m.content));
      } finally {
        setBusy(false);
        abort.current = null;
        void reload();
      }
    },
    [question, busy, activeId, setActiveId, uploads, speech, prefs.autoRead, reload],
  );

  // A question typed on the dashboard arrives here and is sent straight away.
  useEffect(() => {
    if (pendingQuestion) {
      const q = pendingQuestion;
      setPendingQuestion(null);
      void send(q);
    }
  }, [pendingQuestion, setPendingQuestion, send]);

  /* ---- drag and drop anywhere on the screen ---- */
  const hasFiles = (e: DragEvent) => Array.from(e.dataTransfer.types).includes("Files");
  const onDragEnter = (e: DragEvent) => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    drag.current++;
    setDragging(true);
  };
  const onDragLeave = (e: DragEvent) => {
    if (!hasFiles(e)) return;
    drag.current = Math.max(0, drag.current - 1);
    if (drag.current === 0) setDragging(false);
  };
  const onDrop = (e: DragEvent) => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    drag.current = 0;
    setDragging(false);
    uploads.add(Array.from(e.dataTransfer.files));
  };

  const empty = messages.length === 0 && !loadingChat;
  const composer = (
    <Composer
      value={question}
      onChange={setQuestion}
      onSend={() => void send()}
      onStop={() => abort.current?.abort()}
      busy={busy}
      uploads={uploads}
      autoFocus
    />
  );

  return (
    <div
      className="relative flex h-full flex-col"
      onDragEnter={onDragEnter}
      onDragOver={(e) => hasFiles(e) && e.preventDefault()}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {dragging && (
        <div className="pointer-events-none absolute inset-3 z-30 grid place-items-center rounded-3xl border-2 border-dashed border-brand bg-brand-soft/90 backdrop-blur-sm" aria-hidden>
          <div className="text-center">
            <UploadCloud className="mx-auto h-10 w-10 text-brand" strokeWidth={1.5} />
            <p className="mt-3 text-lg font-semibold">Drop files to attach</p>
            <p className="text-sm text-muted">PDF, PNG, JPG or WebP, up to 20 MB</p>
          </div>
        </div>
      )}

      {empty ? (
        <div className="flex flex-1 flex-col items-center justify-center overflow-y-auto px-4 py-10">
          <div className="w-full max-w-3xl">
            <div className="text-center">
              <div className="mx-auto grid h-24 w-24 place-items-center">
                <ThinkingOrb state="breathing" size={64} theme="auto" aria-label="DocSage is ready" />
              </div>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">What would you like to know?</h1>
              <p className="mx-auto mt-2 max-w-md text-[0.95rem] text-muted">
                {readyDocs === 0 ? (
                  <>
                    Attach a document with the paperclip, drop one anywhere on this screen, or{" "}
                    <Link href="/documents" className="font-semibold text-brand hover:underline">
                      open your library
                    </Link>
                    .
                  </>
                ) : (
                  <>Ask about {readyDocs === null ? "your documents" : `your ${readyDocs} document${readyDocs === 1 ? "" : "s"}`}. Answers cite the page they came from.</>
                )}
              </p>
            </div>
            <div className="mt-8">{composer}</div>
            <ul className="mt-6 grid gap-2.5 sm:grid-cols-2">
              {SUGGESTIONS.map((s) => (
                <li key={s}>
                  <button
                    type="button"
                    onClick={() => setQuestion(s)}
                    className="flex w-full items-start gap-2.5 rounded-2xl border border-line bg-card px-4 py-3 text-left text-sm text-muted transition-colors hover:border-brand hover:text-fg"
                  >
                    <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-brand" strokeWidth={1.75} aria-hidden />
                    {s}
                  </button>
                </li>
              ))}
            </ul>
            {error && (
              <p role="alert" className="mt-4 text-center text-sm text-danger">
                {error}
              </p>
            )}
          </div>
        </div>
      ) : (
        <>
          <div
            ref={scroller}
            onScroll={(e) => {
              const el = e.currentTarget;
              stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
            }}
            className="scroll-thin flex-1 overflow-y-auto"
          >
            <div className="mx-auto w-full max-w-3xl space-y-7 px-4 py-8">
              {loadingChat && (
                <div className="space-y-3" aria-label="Loading conversation">
                  <div className="sk ml-auto h-10 w-2/5" />
                  <div className="sk h-24 w-4/5" />
                </div>
              )}
              {messages.map((m, i) => {
                const last = i === messages.length - 1;
                const writing = busy && last && m.role === "assistant";
                const id = `m${m.id}`;
                return m.role === "user" ? (
                  <div key={m.id} className="flex justify-end">
                    <p className="max-w-[85%] whitespace-pre-wrap rounded-3xl bg-brand-solid px-4 py-2.5 text-[0.95rem] leading-relaxed text-brand-fg">{m.content}</p>
                  </div>
                ) : (
                  <div key={m.id} className="flex gap-3">
                    <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full border border-line bg-card">
                      <Sparkles className="h-4 w-4 text-brand" strokeWidth={1.75} aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1 text-[0.95rem]">
                      {writing && !m.content ? (
                        <p className="flex items-center gap-2.5 py-1.5 text-sm text-muted" role="status">
                          <ThinkingOrb state={m.sources.length ? "composing" : "searching"} size={20} theme="auto" aria-label="Working" />
                          {m.sources.length ? "Writing the answer" : "Searching your documents"}
                        </p>
                      ) : (
                        <>
                          <AnswerMarkdown>{m.content}</AnswerMarkdown>
                          <SourceChips sources={m.sources} />
                          {!writing && m.content && (
                            <div className="-ml-2 mt-2 flex flex-wrap items-center gap-1">
                              <CopyButton text={m.content} />
                              {speech.supported && (
                                <button
                                  type="button"
                                  className={iconBtn}
                                  onClick={() => (speech.speakingId === id ? speech.stop() : speech.speak(id, m.content))}
                                  aria-pressed={speech.speakingId === id}
                                >
                                  {speech.speakingId === id ? (
                                    <VolumeX className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                                  ) : (
                                    <Volume2 className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                                  )}
                                  {speech.speakingId === id ? "Stop" : "Read aloud"}
                                </button>
                              )}
                              <span className="-mt-3">
                                <ShareButton question={messages[i - 1]?.content ?? ""} message={m} />
                              </span>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="mx-auto w-full max-w-3xl px-4 pb-4 pt-2">
            {error && (
              <p role="alert" className="mb-2 text-center text-sm text-danger">
                {error}
              </p>
            )}
            {composer}
          </div>
        </>
      )}
    </div>
  );
}

