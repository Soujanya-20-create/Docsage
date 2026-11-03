"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type DragEvent } from "react";
import { AlertCircle, CheckCircle2, ChevronDown, FileText, Image as ImageIcon, Loader2, Trash2, UploadCloud } from "lucide-react";
import { api, type Chunk, type Doc } from "@/lib/api";

const formatSize = (bytes: number) => (bytes < 1024 * 1024 ? `${Math.round(bytes / 1024)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`);

function StatusBadge({ doc }: { doc: Doc }) {
  if (doc.status === "processing")
    return <span className="flex items-center gap-1 text-xs text-muted"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Processing</span>;
  if (doc.status === "failed")
    return <span className="flex items-center gap-1 text-xs text-danger"><AlertCircle className="h-3.5 w-3.5" /> Failed</span>;
  return <span className="flex items-center gap-1 text-xs text-ok"><CheckCircle2 className="h-3.5 w-3.5" /> Ready</span>;
}

function DocRow({ doc, onDelete }: { doc: Doc; onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  const [chunks, setChunks] = useState<Chunk[] | null>(null);

  async function toggle() {
    setOpen(!open);
    if (!open && !chunks) setChunks(await api<Chunk[]>(`/documents/${doc.id}/chunks`));
  }

  const Icon = doc.kind === "pdf" ? FileText : ImageIcon;
  return (
    <li className="rounded-xl border border-line bg-card">
      <div className="flex items-center gap-3 p-3">
        <Icon className="h-5 w-5 shrink-0 text-brand" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{doc.filename}</p>
          <p className="text-xs text-muted">
            {formatSize(doc.size)}
            {doc.status === "ready" && ` · ${doc.pages} page${doc.pages === 1 ? "" : "s"} · ${doc.chunk_count} chunks`}
          </p>
          {doc.error && <p className="mt-1 text-xs text-danger">{doc.error}</p>}
        </div>
        <StatusBadge doc={doc} />
        {doc.status === "ready" && (
          <button onClick={toggle} aria-label="Show extracted chunks" aria-expanded={open} className="rounded-lg p-1.5 text-muted hover:bg-line">
            <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
          </button>
        )}
        <button onClick={onDelete} aria-label={`Delete ${doc.filename}`} className="rounded-lg p-1.5 text-muted hover:bg-line hover:text-danger">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
      {open && (
        <div className="max-h-72 space-y-2 overflow-y-auto border-t border-line p-3">
          {chunks?.map((c) => (
            <p key={c.id} className="rounded-lg bg-bg p-2 text-xs leading-relaxed">
              <span className="mr-2 font-semibold text-brand">p.{c.page}</span>{c.text}
            </p>
          )) ?? <p className="text-xs text-muted">Loading…</p>}
        </div>
      )}
    </li>
  );
}

export default function DocumentsPage() {
  const [docs, setDocs] = useState<Doc[] | null>(null);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const load = useCallback(() => api<Doc[]>("/documents").then(setDocs).catch((e) => setError(e.message)), []);
  useEffect(() => { load(); }, [load]);

  // Poll while anything is still being processed.
  const pending = docs?.some((d) => d.status === "processing");
  useEffect(() => {
    if (!pending) return;
    const timer = setInterval(load, 2500);
    return () => clearInterval(timer);
  }, [pending, load]);

  async function upload(files: FileList | File[]) {
    setUploading(true);
    setError("");
    for (const file of Array.from(files)) {
      const body = new FormData();
      body.append("file", file);
      try {
        await api<Doc>("/documents", { method: "POST", body });
      } catch (e) {
        setError(`${file.name}: ${e instanceof Error ? e.message : "upload failed"}`);
      }
    }
    setUploading(false);
    load();
  }

  async function remove(doc: Doc) {
    await api(`/documents/${doc.id}`, { method: "DELETE" });
    load();
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files.length) upload(e.dataTransfer.files);
  };

  return (
    <div className="mx-auto max-w-3xl p-4 sm:p-8">
      <h1 className="text-2xl font-bold">Documents</h1>
      <p className="mt-1 text-sm text-muted">Upload PDFs or images, then ask questions about them in <Link href="/chat" className="font-semibold text-brand">Chat</Link>.</p>

      <button
        type="button"
        onClick={() => input.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        disabled={uploading}
        className={`mt-6 flex w-full flex-col items-center gap-2 rounded-2xl border-2 border-dashed p-8 text-center transition-colors ${dragging ? "border-brand bg-brand/10" : "border-line hover:border-brand"}`}
      >
        {uploading ? <Loader2 className="h-8 w-8 animate-spin text-brand" /> : <UploadCloud className="h-8 w-8 text-brand" />}
        <span className="font-semibold">{uploading ? "Uploading…" : "Drop files here or click to browse"}</span>
        <span className="text-xs text-muted">PDF, PNG, JPG or WebP</span>
      </button>
      <input ref={input} type="file" multiple hidden accept=".pdf,.png,.jpg,.jpeg,.webp" onChange={(e) => e.target.files && upload(e.target.files)} />

      {error && <p role="alert" className="mt-4 text-sm text-danger">{error}</p>}

      <ul className="mt-6 space-y-2">
        {docs?.map((doc) => <DocRow key={doc.id} doc={doc} onDelete={() => remove(doc)} />)}
      </ul>
      {docs?.length === 0 && <p className="mt-6 text-center text-sm text-muted">No documents yet.</p>}
    </div>
  );
}
