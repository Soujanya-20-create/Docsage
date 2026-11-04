"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useInView, useReducedMotion } from "motion/react";
import { Check, FileText, Layers, Loader2, Quote, Search, Share2, Sparkles, UploadCloud } from "lucide-react";

/**
 * A scripted preview of the real product loop: upload, ask, analyze, share. It repeats while it is on
 * screen and shows the finished state without animation when the visitor prefers reduced motion.
 * The document and its numbers are sample data.
 */
const FILE = "Harbor Logistics MSA.pdf";
const PAGES = 12;
const QUESTION = "How much notice does either side need to give to end the agreement?";
const ANSWER = [
  "Either party can end the agreement with ",
  "60 days of written notice",
  ". If the other side breaches and does not fix it within 30 days, notice can be immediate.",
];
const ANSWER_TEXT = ANSWER.join("");
const STEPS = [
  { icon: Search, label: "Keyword search" },
  { icon: Layers, label: "Meaning search" },
  { icon: Sparkles, label: "Merge and rank" },
];
const TIMELINE = ["Upload", "Ask", "Analyze", "Share"] as const;

type Stage = "upload" | "ask" | "analyze" | "share";

const spring = { type: "spring", stiffness: 160, damping: 22 } as const;

export default function ChatDemo({ className = "" }: { className?: string }) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.35 });

  const [stage, setStage] = useState<Stage>("upload");
  const [page, setPage] = useState(0);
  const [q, setQ] = useState(0);
  const [steps, setSteps] = useState(0);
  const [a, setA] = useState(0);
  const [shared, setShared] = useState(false);
  const [cycle, setCycle] = useState(0);

  // The loop. Every wait is cancellable so leaving the viewport (or the page) stops it cleanly.
  useEffect(() => {
    if (reduce || !inView) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    let alive = true;
    const wait = (ms: number) => new Promise<void>((resolve) => timers.push(setTimeout(resolve, ms)));

    (async () => {
      while (alive) {
        setStage("upload"); setPage(0); setQ(0); setSteps(0); setA(0); setShared(false);
        await wait(900);
        for (let i = 1; i <= PAGES && alive; i++) { setPage(i); await wait(120); }
        await wait(500);
        setStage("ask");
        for (let i = 1; i <= QUESTION.length && alive; i++) { setQ(i); await wait(24); }
        await wait(350);
        setStage("analyze");
        for (let i = 1; i <= STEPS.length && alive; i++) { setSteps(i); await wait(650); }
        await wait(250);
        for (let i = 1; i <= ANSWER_TEXT.length && alive; i++) { setA(i); await wait(16); }
        await wait(900);
        setStage("share");
        await wait(1100);
        setShared(true);
        await wait(3200);
        setCycle((c) => c + 1);
        await wait(450);
      }
    })();

    return () => {
      alive = false;
      timers.forEach(clearTimeout);
    };
  }, [reduce, inView]);

  // Reduced motion: show the finished conversation.
  const staticView = !!reduce;
  const view = staticView
    ? { stage: "share" as Stage, page: PAGES, q: QUESTION.length, steps: STEPS.length, a: ANSWER_TEXT.length, shared: false }
    : { stage, page, q, steps, a, shared };

  const indexed = view.page >= PAGES;
  const showQuestion = view.stage !== "upload";
  const showAnswer = view.a > 0;
  const answerDone = view.a >= ANSWER_TEXT.length;
  const activeStep = TIMELINE.findIndex((t) => t.toLowerCase() === view.stage);

  const answerParts = ANSWER.map((part, i) => {
    const before = ANSWER.slice(0, i).reduce((n, p) => n + p.length, 0);
    return part.slice(0, Math.max(0, Math.min(part.length, view.a - before)));
  });

  return (
    <div ref={ref} className={`card relative w-full max-w-[560px] overflow-hidden ${className}`} role="img" aria-label="Animated preview: a document is uploaded, a question is asked, DocSage analyzes it and answers with a citation, then the answer is shared.">
      <div className="flex items-center justify-between border-b border-line px-4 py-3" aria-hidden>
        <div className="flex items-center gap-2 text-sm font-bold">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/docsage-mark.png" alt="" className="h-5 w-5" />
          DocSage
        </div>
        <span className="text-xs text-muted">Sample document</span>
      </div>

      <div className="relative h-[440px] overflow-hidden px-4 py-4 sm:px-5" aria-hidden>
        <AnimatePresence mode="wait">
          <motion.div
            key={cycle}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.35 } }}
            className="flex h-full flex-col gap-3"
          >
            {/* document */}
            <motion.div layout transition={spring} className="rounded-xl border border-line bg-bg p-3">
              <div className="flex items-center gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand">
                  {indexed ? <FileText className="h-4.5 w-4.5" strokeWidth={1.75} /> : <UploadCloud className="h-4.5 w-4.5" strokeWidth={1.75} />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{view.page > 0 || staticView ? FILE : "Drop a PDF or image"}</p>
                  <p className="text-xs text-muted">
                    {indexed ? `${PAGES} pages indexed` : view.page > 0 ? `Reading page ${view.page} of ${PAGES}` : "Scans are read with OCR"}
                  </p>
                </div>
                {indexed ? (
                  <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={spring} className="grid h-6 w-6 place-items-center rounded-full bg-ok/15 text-ok">
                    <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                  </motion.span>
                ) : view.page > 0 ? (
                  <Loader2 className="h-4 w-4 animate-spin text-brand" />
                ) : null}
              </div>
              {!indexed && (
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-line">
                  <motion.div className="h-full rounded-full bg-brand-solid" animate={{ width: `${(view.page / PAGES) * 100}%` }} transition={{ duration: 0.15, ease: "linear" }} />
                </div>
              )}
            </motion.div>

            {/* question */}
            {showQuestion && (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={spring} className="flex justify-end">
                <p className={`max-w-[88%] rounded-2xl rounded-br-md bg-brand-solid px-3.5 py-2.5 text-sm text-brand-fg ${view.q < QUESTION.length ? "caret" : ""}`}>
                  {QUESTION.slice(0, view.q)}
                </p>
              </motion.div>
            )}

            {/* analysis */}
            {view.steps > 0 && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring} className="flex flex-wrap gap-1.5">
                {STEPS.map(({ icon: Icon, label }, i) => {
                  const done = showAnswer || i < view.steps - 1;
                  return i < view.steps ? (
                    <motion.span
                      key={label}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={spring}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-line px-2 py-1 text-xs text-muted"
                    >
                      {done ? <Check className="h-3 w-3 text-ok" strokeWidth={2.5} /> : <Icon className="h-3 w-3 text-brand" strokeWidth={2} />}
                      {label}
                    </motion.span>
                  ) : null;
                })}
              </motion.div>
            )}

            {/* answer */}
            {showAnswer && (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={spring} className="rounded-2xl rounded-bl-md border border-line bg-card p-3.5 text-sm leading-relaxed">
                <p className={answerDone ? "" : "caret"}>
                  {answerParts[0]}
                  <span className="font-semibold">{answerParts[1]}</span>
                  {answerParts[2]}
                  {answerDone && <sup className="ml-1 rounded bg-brand-soft px-1 text-[10px] font-bold text-brand">1</sup>}
                </p>
                {answerDone && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} transition={{ duration: 0.4 }} className="overflow-hidden">
                    <div className="mt-3 rounded-xl border border-line bg-bg p-2.5 text-xs">
                      <p className="flex items-center gap-1.5 font-semibold">
                        <Quote className="h-3 w-3 text-brand" strokeWidth={2} /> [1] {FILE}, p.9
                      </p>
                      <p className="mt-1 text-muted">
                        ...either Party may terminate this Agreement for convenience upon{" "}
                        <mark className="rounded bg-brand-soft px-0.5 font-medium text-fg">sixty (60) days prior written notice</mark>...
                      </p>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}

            {/* share */}
            <div className="mt-auto flex h-9 items-center justify-end">
              {(view.stage === "share" || staticView) && answerDone && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring}>
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors ${
                      view.shared ? "border-ok/40 bg-ok/10 text-ok" : "border-line text-fg"
                    }`}
                  >
                    {view.shared ? <Check className="h-3.5 w-3.5" strokeWidth={2.5} /> : <Share2 className="h-3.5 w-3.5" strokeWidth={2} />}
                    {view.shared ? "Copied with citations" : "Share answer"}
                  </span>
                </motion.div>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* progress through the loop */}
      <div className="grid grid-cols-4 border-t border-line text-center text-xs" aria-hidden>
        {TIMELINE.map((label, i) => (
          <div key={label} className="relative px-2 py-2.5">
            <span className={`font-semibold transition-colors ${i <= activeStep ? "text-brand" : "text-muted"}`}>{label}</span>
            {i === activeStep && <motion.span layoutId="demo-step" className="absolute inset-x-3 top-0 h-0.5 rounded-full bg-brand-solid" transition={spring} />}
          </div>
        ))}
      </div>
    </div>
  );
}
