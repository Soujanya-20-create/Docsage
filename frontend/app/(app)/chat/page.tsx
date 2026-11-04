"use client";

import { useCallback, useEffect, useRef, useState, type DragEvent } from "react";
import Link from "next/link";
import { ThinkingOrb } from "thinking-orbs";
import { CalendarClock, Check, Copy, FileDown, ListChecks, Loader2, Scale, Share2, Sparkles, UploadCloud, Volume2, VolumeX } from "lucide-react";
import { chatTranscript, downloadChatPdf } from "@/lib/exportChat";
import { useAuth } from "@/lib/auth";
import { Composer } from "@/components/chat/Composer";
import { AnswerMarkdown, ShareButton, SourceChips } from "@/components/chat/Message";
import { ApiError, api, ask, json, type Chat, type Doc, type Message } from "@/lib/api";
import { useChats } from "@/lib/chats";
import { usePrefs } from "@/lib/prefs";
import { useReadAloud } from "@/lib/speech";
import { useUploads } from "@/lib/upload";

const STARTERS = [
  { title: "Summarize", hint: "Turn long files into clear summaries", prompt: "Summarize this document in five bullet points", icon: Sparkles, tone: "t-violet" },
  { title: "Find Key Dates", hint: "Deadlines, renewals and milestones", prompt: "What are the key dates and deadlines?", icon: CalendarClock, tone: "t-blue" },
  { title: "Extract Obligations", hint: "Who owns what, in a list", prompt: "List the obligations and who owns each one", icon: ListChecks, tone: "t-green" },
  { title: "Check Terms", hint: "Payment terms and penalties", prompt: "Find anything about payment terms or penalties", icon: Scale, tone: "t-amber" },
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

const toolBtn =
  "inline-flex h-10 items-center gap-2 rounded-full px-3.5 text-sm font-semibold text-muted transition-colors hover:bg-brand-soft hover:text-brand disabled:opacity-50";

/** Top-right actions for the open conversation: copy it, share it, or save the whole thing as a PDF. */
function ChatToolbar({ title, messages, disabled }: { title: string; messages: Message[]; disabled: boolean }) {
  const [state, setState] = useState<"idle" | "copied" | "shared" | "pdf" | "error">("idle");
  const flash = (next: typeof state) => {
    setState(next);
    setTimeout(() => setState("idle"), 2000);
  };

  async function copy() {
    try {
      await navigator.clipboard.writeText(chatTranscript(title, messages));
      flash("copied");
    } catch {
      flash("error");
    }
  }

  async function share() {
    const text = chatTranscript(title, messages);
    try {
      if (typeof navigator.share === "function") await navigator.share({ title, text });
      else await navigator.clipboard.writeText(text);
      flash("shared");
    } catch {
      /* the share sheet was dismissed */
    }
  }

  async function pdf() {
    setState("pdf");
    try {
      await downloadChatPdf(title, messages);
      flash("idle");
    } catch {
      flash("error");
    }
  }

  return (
    <div className="flex items-center gap-1" role="toolbar" aria-label="Chat actions">
      <button type="button" onClick={copy} disabled={disabled} className={toolBtn} title="Copy the whole chat">
        {state === "copied" ? <Check className="h-4 w-4" strokeWidth={2.25} aria-hidden /> : <Copy className="h-4 w-4" strokeWidth={2} aria-hidden />}
        <span className="hidden sm:inline">{state === "copied" ? "Copied" : "Copy chat"}</span>
      </button>
      <button type="button" onClick={share} disabled={disabled} className={toolBtn} title="Share the chat with its citations">
        {state === "shared" ? <Check className="h-4 w-4" strokeWidth={2.25} aria-hidden /> : <Share2 className="h-4 w-4" strokeWidth={2} aria-hidden />}
        <span className="hidden sm:inline">{state === "shared" ? "Shared" : "Share"}</span>
      </button>
      <button type="button" onClick={pdf} disabled={disabled || state === "pdf"} className={`${toolBtn} bg-brand-soft text-brand`} title="Save the whole chat as a PDF">
        {state === "pdf" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <FileDown className="h-4 w-4" strokeWidth={2} aria-hidden />}
        <span className="hidden sm:inline">{state === "error" ? "Try again" : "Export PDF"}</span>
      </button>
    </div>
  );
}

export default function ChatPage() {
  const { chats, activeId, setActiveId, resetKey, reload, pendingQuestion, setPendingQuestion } = useChats();
  const [prefs] = usePrefs();
  const { user } = useAuth();
  const firstName = (user?.name || "there").split(/\s+/)[0];
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
    uploads.items.forEach((u) => uploads.remove(u.key));
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

  // A question typed on the dashboard arrives here and is sent straight away. The ref keeps a second run of this
  // effect (StrictMode, or a re-render before the cleared value lands) from sending it again into a new empty chat.
  const handedOff = useRef<string | null>(null);
  useEffect(() => {
    if (pendingQuestion && handedOff.current !== pendingQuestion) {
      handedOff.current = pendingQuestion;
      setPendingQuestion(null);
      void send(pendingQuestion);
    }
    if (!pendingQuestion) handedOff.current = null;
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
  const chatTitle = chats.find((c) => c.id === activeId)?.title || messages.find((m) => m.role === "user")?.content.slice(0, 60) || "New chat";
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
        <div className="chat-empty-bg flex flex-1 flex-col items-center overflow-y-auto px-4 py-8 sm:py-12">
          <div className="my-auto w-full max-w-4xl">
            <div className="text-center">
              <div className="relative mx-auto grid h-28 w-28 place-items-center">
                <span aria-hidden className="orb-halo" />
                <span className="glass relative grid h-24 w-24 place-items-center rounded-full">
                  <ThinkingOrb state="breathing" size={64} theme="auto" aria-label="DocSage is ready" />
                </span>
              </div>
              <h1 className="mt-6 text-3xl font-extrabold tracking-tight sm:text-5xl">
                Hello, <span className="text-grad">{firstName}</span> <span aria-hidden>👋</span>
              </h1>
              <p className="mx-auto mt-3 max-w-xl text-[0.98rem] leading-relaxed text-muted">
                {readyDocs === 0 ? (
                  <>
                    Your AI document analyst. Attach a file with the + button, drop one anywhere on this screen, or{" "}
                    <Link href="/documents" className="font-semibold text-brand hover:underline">
                      open your library
                    </Link>
                    .
                  </>
                ) : (
                  <>
                    Your AI document analyst. Ask about {readyDocs === null ? "your documents" : `your ${readyDocs} document${readyDocs === 1 ? "" : "s"}`} and get answers that cite the page they came from.
                  </>
                )}
              </p>
            </div>

            <ul className="mt-9 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
              {STARTERS.map(({ title, hint, prompt, icon: Icon, tone }) => (
                <li key={title}>
                  <button
                    type="button"
                    onClick={() => setQuestion(prompt)}
                    className="glass lift flex h-full w-full flex-col items-center gap-2.5 rounded-3xl px-3 py-5 text-center"
                  >
                    <span className={`tint-ico ${tone} grid h-12 w-12 place-items-center rounded-2xl`}>
                      <Icon className="h-6 w-6" strokeWidth={1.8} aria-hidden />
                    </span>
                    <span className="text-sm font-bold">{title}</span>
                    <span className="text-xs leading-snug text-muted">{hint}</span>
                  </button>
                </li>
              ))}
            </ul>

            <div className="mx-auto mt-8 max-w-3xl">{composer}</div>
            {error && (
              <p role="alert" className="mt-4 text-center text-sm text-danger">
                {error}
              </p>
            )}
          </div>
        </div>
      ) : (
        <>
          <div className="glass flex items-center gap-3 border-x-0 border-t-0 px-4 py-2.5 sm:px-6">
            <span className="tint-ico t-violet grid h-9 w-9 shrink-0 place-items-center rounded-xl">
              <Sparkles className="h-4 w-4" strokeWidth={1.9} aria-hidden />
            </span>
            <h1 className="min-w-0 flex-1 truncate text-[0.95rem] font-bold">{chatTitle}</h1>
            <ChatToolbar title={chatTitle} messages={messages} disabled={busy || messages.length === 0} />
          </div>
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
                    <p className="bg-grad max-w-[85%] whitespace-pre-wrap rounded-3xl rounded-br-lg px-5 py-3 text-[0.95rem] leading-relaxed text-brand-fg shadow-[0_12px_24px_-14px_rgb(79_70_229/0.7)]">{m.content}</p>
                  </div>
                ) : (
                  <div key={m.id} className="flex gap-3">
                    <span className="tint-ico t-violet mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full">
                      <Sparkles className="h-4 w-4" strokeWidth={1.9} aria-hidden />
                    </span>
                    <div className="glass min-w-0 flex-1 rounded-3xl rounded-tl-lg px-5 py-3.5 text-[0.95rem]">
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

