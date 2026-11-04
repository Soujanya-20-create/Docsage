"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api, type Doc } from "./api";

export const ACCEPT = ".pdf,.png,.jpg,.jpeg,.webp";
const MAX_MB = 20;
const OK_TYPES = /\.(pdf|png|jpe?g|webp)$/i;

export type Upload = {
  key: string;
  name: string;
  size: number;
  status: "uploading" | "processing" | "ready" | "failed";
  docId?: number;
  error?: string;
};

/** Checks a file before it is sent, so the user gets an instant, specific reason. */
export function checkFile(file: File): string | null {
  if (!OK_TYPES.test(file.name)) return "Only PDF, PNG, JPG and WebP files are supported.";
  if (file.size > MAX_MB * 1024 * 1024) return `Files can be up to ${MAX_MB} MB.`;
  if (file.size === 0) return "This file is empty.";
  return null;
}

/**
 * Uploads files and follows each until indexing finishes. Used by the chat composer; the Documents
 * page has its own list view. `onSettled` fires whenever an upload reaches ready or failed.
 */
export function useUploads(onSettled?: () => void) {
  const [items, setItems] = useState<Upload[]>([]);
  const alive = useRef(true);
  const settled = useRef(onSettled);
  settled.current = onSettled;

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const patch = useCallback((key: string, change: Partial<Upload>) => {
    if (alive.current) setItems((all) => all.map((u) => (u.key === key ? { ...u, ...change } : u)));
  }, []);

  const track = useCallback(
    async (key: string, docId: number) => {
      for (let i = 0; i < 150 && alive.current; i++) {
        await new Promise((r) => setTimeout(r, 2000));
        try {
          const doc = await api<Doc>(`/documents/${docId}`);
          if (doc.status === "ready") return patch(key, { status: "ready" }), settled.current?.();
          if (doc.status === "failed") return patch(key, { status: "failed", error: doc.error ?? "Could not read this file." }), settled.current?.();
        } catch {
          /* transient: keep polling */
        }
      }
    },
    [patch],
  );

  const add = useCallback(
    async (files: File[]) => {
      for (const file of files) {
        const key = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const problem = checkFile(file);
        setItems((all) => [...all, { key, name: file.name, size: file.size, status: problem ? "failed" : "uploading", error: problem ?? undefined }]);
        if (problem) continue;
        const body = new FormData();
        body.append("file", file);
        try {
          const doc = await api<Doc>("/documents", { method: "POST", body });
          patch(key, { docId: doc.id, status: doc.status === "ready" ? "ready" : "processing" });
          if (doc.status !== "ready") void track(key, doc.id);
        } catch (err) {
          patch(key, { status: "failed", error: err instanceof Error ? err.message : "Upload failed." });
        }
      }
    },
    [patch, track],
  );

  const remove = useCallback((key: string) => setItems((all) => all.filter((u) => u.key !== key)), []);
  const clear = useCallback(() => setItems([]), []);
  const attach = useCallback((docs: { id: number; filename: string; size: number }[]) => {
    setItems((all) => {
      const have = new Set(all.map((u) => u.docId));
      const fresh = docs
        .filter((d) => !have.has(d.id))
        .map((d): Upload => ({ key: `doc-${d.id}`, name: d.filename, size: d.size, status: "ready", docId: d.id }));
      return [...all, ...fresh];
    });
  }, []);

  return { items, add, remove, clear, attach };
}
