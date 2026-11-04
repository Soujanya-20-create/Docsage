"use client";

import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import { AlertCircle, CheckCircle2, FileText, FolderOpen, Loader2, Mic, MicOff, Plus, SendHorizontal, Square, UploadCloud, X } from "lucide-react";
import { VoiceBeam, useMicrophone } from "voice-glow";
import { api, type Doc } from "@/lib/api";
import { usePrefs } from "@/lib/prefs";
import { useDictation } from "@/lib/speech";
import { ACCEPT, type Upload } from "@/lib/upload";

type Uploads = {
  items: Upload[];
  add: (files: File[]) => void;
  remove: (key: string) => void;
  attach: (docs: { id: number; filename: string; size: number }[]) => void;
};

function Chip({ item, onRemove }: { item: Upload; onRemove: () => void }) {
  const busy = item.status === "uploading" || item.status === "processing";
  return (
    <li
      title={item.error ?? (item.status === "ready" ? "Questions will search only the attached files" : undefined)}
      className={`flex max-w-[16rem] items-center gap-2 rounded-xl border py-1.5 pl-2.5 pr-1.5 text-xs ${
        item.status === "failed" ? "border-danger/40 bg-danger/10" : "border-line bg-bg"
      }`}
    >
      {busy ? (
        <Loader2 className="h-4 w-4 shrink-0 animate-spin text-brand" strokeWidth={2} aria-hidden />
      ) : item.status === "failed" ? (
        <AlertCircle className="h-4 w-4 shrink-0 text-danger" strokeWidth={2} aria-hidden />
      ) : (
        <FileText className="h-4 w-4 shrink-0 text-brand" strokeWidth={1.75} aria-hidden />
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{item.name}</span>
        <span className={`block truncate ${item.status === "failed" ? "text-danger" : "text-muted"}`}>
          {item.status === "uploading" ? "Uploading" : item.status === "processing" ? "Reading and indexing" : item.status === "failed" ? item.error : "Ready"}
        </span>
      </span>
      {item.status === "ready" && <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-ok" strokeWidth={2} aria-hidden />}
      <button onClick={onRemove} aria-label={`Remove ${item.name}`} className="grid h-6 w-6 shrink-0 place-items-center rounded-lg text-muted hover:bg-line hover:text-fg">
        <X className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
      </button>
    </li>
  );
}

function LibraryPicker({ onPick, onClose }: { onPick: (docs: Doc[]) => void; onClose: () => void }) {
  const [docs, setDocs] = useState<Doc[] | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  useEffect(() => {
    api<Doc[]>("/documents").then((all) => setDocs(all.filter((d) => d.status === "ready"))).catch(() => setDocs([]));
  }, []);

  return (
    <div role="dialog" aria-label="Choose documents" className="card absolute bottom-full left-0 z-20 mb-2 w-80 max-w-[calc(100vw-2rem)] p-2">
      <p className="px-2 pb-1 pt-1 text-xs font-semibold text-muted">Choose from your documents</p>
      <ul className="scroll-thin max-h-60 overflow-y-auto">
        {docs === null && <li className="sk m-2 h-8" aria-hidden />}
        {docs?.length === 0 && <li className="px-2 py-3 text-sm text-muted">No ready documents yet. Upload one first.</li>}
        {docs?.map((d) => (
          <li key={d.id}>
            <label className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-2 text-sm hover:bg-brand-soft">
              <input
                type="checkbox"
                checked={selected.has(d.id)}
                onChange={() =>
                  setSelected((s) => {
                    const next = new Set(s);
                    if (!next.delete(d.id)) next.add(d.id);
                    return next;
                  })
                }
                className="h-4 w-4 accent-[var(--brand-solid)]"
              />
              <span className="min-w-0 flex-1 truncate">{d.filename}</span>
            </label>
          </li>
        ))}
      </ul>
      <div className="mt-1 flex justify-end gap-2 border-t border-line pt-2">
        <button onClick={onClose} className="btn btn-ghost !px-3 !py-1.5">
          Cancel
        </button>
        <button
          disabled={selected.size === 0}
          onClick={() => {
            onPick((docs ?? []).filter((d) => selected.has(d.id)));
            onClose();
          }}
          className="btn !px-3 !py-1.5"
        >
          Attach {selected.size || ""}
        </button>
      </div>
    </div>
  );
}

export function Composer({
  value,
  onChange,
  onSend,
  onStop,
  busy,
  uploads,
  autoFocus,
  placeholder = "Ask anything about your documents",
}: {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onStop: () => void;
  busy: boolean;
  uploads: Uploads;
  autoFocus?: boolean;
  placeholder?: string;
}) {
  const [prefs] = usePrefs();
  const area = useRef<HTMLTextAreaElement>(null);
  const file = useRef<HTMLInputElement>(null);
  const base = useRef("");
  const [menu, setMenu] = useState(false);
  const [library, setLibrary] = useState(false);

  // The glow reacts to a real microphone stream while dictating.
  const mic = useMicrophone();
  const dictation = useDictation(prefs.voiceLang, (text) => onChange(base.current ? `${base.current} ${text}` : text));

  useEffect(() => {
    if (!dictation.listening) mic.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dictation.listening]);

  // Grow with the text up to a limit, then scroll.
  const fit = useCallback(() => {
    const el = area.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, []);
  useEffect(fit, [value, fit]);
  useEffect(() => {
    if (autoFocus) area.current?.focus();
  }, [autoFocus]);

  const indexing = uploads.items.some((u) => u.status === "uploading" || u.status === "processing");
  const canSend = value.trim().length > 0 && !indexing && !busy;

  function key(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing && prefs.enterToSend) {
      e.preventDefault();
      if (canSend) onSend();
    }
  }

  function toggleMic() {
    if (dictation.listening) {
      dictation.stop();
      mic.stop();
      return;
    }
    base.current = value.trim();
    void mic.start(); // from the click, so Safari allows audio
    dictation.start();
  }

  return (
    <div className="relative">
      <VoiceBeam stream={mic.stream} theme="auto" colorVariant="ocean" active={dictation.listening}>
      <div className="glass rounded-[1.75rem] transition-shadow focus-within:shadow-[0_0_0_3px_color-mix(in_srgb,var(--brand-solid)_22%,transparent),var(--shadow-lift)]">
        {uploads.items.length > 0 && (
          <ul className="flex flex-wrap gap-2 px-3 pt-3" aria-label="Attached files">
            {uploads.items.map((u) => (
              <Chip key={u.key} item={u} onRemove={() => uploads.remove(u.key)} />
            ))}
          </ul>
        )}

        <label className="sr-only" htmlFor="composer-input">
          Your question
        </label>
        <textarea
          id="composer-input"
          ref={area}
          rows={1}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={key}
          maxLength={4000}
          placeholder={dictation.listening ? "Listening. Start speaking" : placeholder}
          className="block max-h-[200px] w-full resize-none bg-transparent px-4 pb-1 pt-3.5 text-[0.95rem] leading-relaxed outline-none placeholder:text-muted"
        />

        <div className="flex items-center gap-1 px-2.5 pb-2.5">
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setMenu((m) => !m);
                setLibrary(false);
              }}
              aria-label="Attach files"
              aria-expanded={menu}
              className="grid h-10 w-10 place-items-center rounded-full bg-card text-brand shadow-sm ring-1 ring-line transition-colors hover:bg-brand-soft"
            >
              <Plus className={`h-5 w-5 transition-transform ${menu ? "rotate-45" : ""}`} strokeWidth={2} aria-hidden />
            </button>
            {menu && (
              <div role="menu" className="card absolute bottom-full left-0 z-20 mb-2 w-56 p-1.5">
                <button
                  role="menuitem"
                  onClick={() => {
                    setMenu(false);
                    file.current?.click();
                  }}
                  className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm hover:bg-brand-soft"
                >
                  <UploadCloud className="h-4 w-4 text-brand" strokeWidth={1.75} aria-hidden /> Upload from device
                </button>
                <button
                  role="menuitem"
                  onClick={() => {
                    setMenu(false);
                    setLibrary(true);
                  }}
                  className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm hover:bg-brand-soft"
                >
                  <FolderOpen className="h-4 w-4 text-brand" strokeWidth={1.75} aria-hidden /> Choose from my documents
                </button>
              </div>
            )}
            {library && <LibraryPicker onPick={(docs) => uploads.attach(docs)} onClose={() => setLibrary(false)} />}
          </div>
          <input
            ref={file}
            type="file"
            multiple
            hidden
            accept={ACCEPT}
            onChange={(e) => {
              if (e.target.files) uploads.add(Array.from(e.target.files));
              e.target.value = ""; // so choosing the same file again still fires
            }}
          />

          <button
            type="button"
            onClick={toggleMic}
            disabled={!dictation.supported}
            aria-label={dictation.listening ? "Stop voice input" : "Speak your question"}
            aria-pressed={dictation.listening}
            title={dictation.supported ? undefined : "Voice input is not supported in this browser. Try Chrome, Edge or Safari."}
            className={`grid h-10 w-10 place-items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
              dictation.listening ? "animate-pulse bg-danger text-white" : "text-muted hover:bg-brand-soft hover:text-fg"
            }`}
          >
            {dictation.listening ? <MicOff className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden /> : <Mic className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden />}
          </button>

          <span className="ml-1 min-w-0 flex-1 truncate text-xs text-muted" aria-live="polite">
            {dictation.error || (indexing ? "Indexing your files. You can send once they are ready." : "")}
          </span>

          {busy ? (
            <button type="button" onClick={onStop} aria-label="Stop generating" className="grid h-9 w-9 place-items-center rounded-full bg-fg text-bg transition-transform active:scale-95">
              <Square className="h-3.5 w-3.5 fill-current" aria-hidden />
            </button>
          ) : (
            <button
              type="button"
              onClick={onSend}
              disabled={!canSend}
              aria-label="Send"
              className="bg-grad grid h-11 w-11 place-items-center rounded-full text-white shadow-[0_10px_22px_-8px_rgb(79_70_229/0.8)] transition-all enabled:hover:brightness-110 enabled:active:scale-95 disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none"
            >
              <SendHorizontal className="h-5 w-5" strokeWidth={2} aria-hidden />
            </button>
          )}
        </div>
      </div>
      </VoiceBeam>
      <p className="mt-2 text-center text-xs text-muted">DocSage can make mistakes. Check important answers against the cited pages.</p>
    </div>
  );
}
