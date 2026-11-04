"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Check, FileText, Share2 } from "lucide-react";
import type { Message, Source } from "@/lib/api";

/** Cited sources as compact expandable chips. Used by the chat page and the landing-page demo. */
export function SourceChips({ sources }: { sources: Source[] }) {
  if (!sources.length) return null;
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {sources.map((s) => (
        <details key={s.n} className="rounded-xl border border-line bg-bg text-xs">
          <summary className="flex cursor-pointer list-none items-center gap-1.5 px-2.5 py-1.5">
            <FileText className="h-3 w-3 text-brand" strokeWidth={2} aria-hidden />
            <span className="font-semibold">[{s.n}]</span> {s.filename}, p.{s.page}
          </summary>
          <p className="max-w-xs px-2.5 pb-2.5 text-muted">{s.excerpt}...</p>
        </details>
      ))}
    </div>
  );
}

/**
 * Answers are generated from user-supplied documents, so treat them as untrusted: no images (they could
 * leak data through a request to another site), and links open safely in a new tab.
 */
export function AnswerMarkdown({ children }: { children: string }) {
  return (
    <div className="prose-chat">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        skipHtml
        urlTransform={(url) => (/^https?:\/\//i.test(url) ? url : "")}
        components={{
          img: () => null,
          a: ({ href, children: label }) => (
            <a href={href} target="_blank" rel="noopener noreferrer nofollow">
              {label}
            </a>
          ),
        }}
      >
        {children || "..."}
      </ReactMarkdown>
    </div>
  );
}

export function shareText(question: string, answer: string, sources: Source[]): string {
  const cites = sources.map((s) => `[${s.n}] ${s.filename}, page ${s.page}`).join("\n");
  return `Q: ${question}\n\n${answer}\n\nSources\n${cites}\n\nAnswered by DocSage`;
}

/** Shares an answer together with its citations: the system share sheet when available, else the clipboard. */
export function ShareButton({ question, message }: { question: string; message: Message }) {
  const [done, setDone] = useState(false);

  async function share() {
    const text = shareText(question, message.content, message.sources);
    try {
      if (typeof navigator.share === "function" && /Mobi|Android/i.test(navigator.userAgent)) {
        await navigator.share({ title: "DocSage answer", text });
      } else {
        await navigator.clipboard.writeText(text);
      }
      setDone(true);
      setTimeout(() => setDone(false), 2200);
    } catch {
      /* the user dismissed the share sheet, or the clipboard is blocked */
    }
  }

  return (
    <button
      type="button"
      onClick={share}
      className="mt-3 inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold text-muted transition-colors hover:bg-brand-soft hover:text-brand"
    >
      {done ? <Check className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden /> : <Share2 className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />}
      {done ? "Copied with citations" : "Share answer"}
    </button>
  );
}
