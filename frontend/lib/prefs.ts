"use client";

import { useCallback, useSyncExternalStore } from "react";

/** Per-device preferences, kept in localStorage (never sent to the server). */
export type Prefs = {
  theme: "system" | "light" | "dark";
  voiceLang: string; // BCP 47 tag used for dictation and read-aloud, "" = browser default
  speechRate: number; // 0.7 to 1.4
  autoRead: boolean; // read answers aloud as soon as they finish
  enterToSend: boolean; // Enter sends, Shift+Enter adds a line
};

export const defaultPrefs: Prefs = { theme: "light", voiceLang: "", speechRate: 1, autoRead: false, enterToSend: true };

const KEY = "docsage:prefs";
const listeners = new Set<() => void>();
let cache: Prefs | null = null;

function read(): Prefs {
  if (cache) return cache;
  try {
    cache = { ...defaultPrefs, ...JSON.parse(localStorage.getItem(KEY) ?? "{}") };
  } catch {
    cache = { ...defaultPrefs };
  }
  return cache!;
}

function applyTheme(theme: Prefs["theme"]) {
  document.documentElement.dataset.theme = theme;
}

export function setPrefs(change: Partial<Prefs>) {
  cache = { ...read(), ...change };
  try {
    localStorage.setItem(KEY, JSON.stringify(cache));
  } catch {
    /* storage blocked: the choice lasts until the tab closes */
  }
  if (change.theme) applyTheme(cache.theme);
  listeners.forEach((l) => l());
}

const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};

/** Current preferences plus a setter. Server render and first paint use the defaults. */
export function usePrefs(): [Prefs, (change: Partial<Prefs>) => void] {
  const prefs = useSyncExternalStore(subscribe, read, () => defaultPrefs);
  const set = useCallback((change: Partial<Prefs>) => setPrefs(change), []);
  return [prefs, set];
}
