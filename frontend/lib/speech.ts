"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/* Minimal typings for the browser's Web Speech API, which TypeScript's DOM lib does not include. */
type RecognitionResult = { isFinal: boolean; 0: { transcript: string } };
type RecognitionEvent = { resultIndex: number; results: ArrayLike<RecognitionResult> };
type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: RecognitionEvent) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
};
type RecognitionCtor = new () => Recognition;

function recognitionCtor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const MESSAGES: Record<string, string> = {
  "not-allowed": "Microphone access was blocked. Allow it in your browser's address bar.",
  "service-not-allowed": "Microphone access was blocked. Allow it in your browser's address bar.",
  "no-speech": "We did not hear anything. Try again.",
  "audio-capture": "No microphone was found.",
  network: "Voice input needs an internet connection.",
};

/**
 * Dictation: turns speech into text while `listening`. `onText` receives the full transcript of this
 * session so far (final plus interim), which the caller appends to what was already typed.
 */
export function useDictation(lang: string, onText: (transcript: string) => void) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState("");
  const rec = useRef<Recognition | null>(null);
  const cb = useRef(onText);
  cb.current = onText;

  useEffect(() => {
    setSupported(recognitionCtor() !== null);
    return () => rec.current?.abort();
  }, []);

  const stop = useCallback(() => rec.current?.stop(), []);

  const start = useCallback(() => {
    const Ctor = recognitionCtor();
    if (!Ctor) return;
    setError("");
    const r = new Ctor();
    r.lang = lang || navigator.language || "en-US";
    r.continuous = true;
    r.interimResults = true;
    r.onresult = (e) => {
      let text = "";
      for (let i = 0; i < e.results.length; i++) text += e.results[i][0].transcript;
      cb.current(text.trim());
    };
    r.onerror = (e) => setError(MESSAGES[e.error] ?? "Voice input stopped unexpectedly.");
    r.onend = () => setListening(false);
    rec.current = r;
    try {
      r.start();
      setListening(true);
    } catch {
      setListening(false);
    }
  }, [lang]);

  return { supported, listening, error, start, stop };
}

/** Removes markdown and citation markers so an answer reads naturally aloud. */
export function speakable(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/\[\d+\]/g, "")
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[*_#>~|-]{1,}/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Read-aloud with the browser's built-in voices. One utterance plays at a time across the page. */
export function useReadAloud(lang: string, rate: number) {
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const supported = typeof window !== "undefined" && "speechSynthesis" in window;

  const stop = useCallback(() => {
    if (supported) window.speechSynthesis.cancel();
    setSpeakingId(null);
  }, [supported]);

  const speak = useCallback(
    (id: string, markdown: string) => {
      if (!supported) return;
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(speakable(markdown));
      u.rate = rate;
      if (lang) u.lang = lang;
      const voice = window.speechSynthesis.getVoices().find((v) => (lang ? v.lang.toLowerCase().startsWith(lang.toLowerCase().slice(0, 2)) : v.default));
      if (voice) u.voice = voice;
      u.onend = u.onerror = () => setSpeakingId((cur) => (cur === id ? null : cur));
      setSpeakingId(id);
      window.speechSynthesis.speak(u);
    },
    [supported, lang, rate],
  );

  useEffect(() => () => {
    if (supported) window.speechSynthesis.cancel();
  }, [supported]);

  return { supported, speakingId, speak, stop };
}
