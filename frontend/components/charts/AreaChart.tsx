"use client";

import { useId, useMemo, useState, type PointerEvent } from "react";
import { motion, useReducedMotion } from "motion/react";

export type Point = { label: string; a: number; b: number };

const W = 640;
const H = 240;
const PAD = { l: 34, r: 10, t: 14, b: 28 };

function niceMax(n: number): number {
  if (n <= 4) return 4;
  const pow = 10 ** Math.floor(Math.log10(n));
  return Math.ceil(n / pow) * pow;
}

/** A smooth line through the points: horizontal tangents at each point, no overshoot. */
function smooth(pts: [number, number][]): string {
  if (!pts.length) return "";
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1];
    const [x1, y1] = pts[i];
    const mx = (x0 + x1) / 2;
    d += ` C${mx},${y0} ${mx},${y1} ${x1},${y1}`;
  }
  return d;
}

const shortDay = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone: "UTC" });

/**
 * Two series over time. `a` is drawn as a filled area in the brand colour and `b` as a quiet line.
 * Hover or touch shows the exact values for a day.
 */
export function AreaChart({ data, aLabel, bLabel }: { data: Point[]; aLabel: string; bLabel: string }) {
  const id = useId().replace(/:/g, "");
  const reduce = useReducedMotion();
  const [hover, setHover] = useState<number | null>(null);

  const { max, xs, ya, yb } = useMemo(() => {
    const max = niceMax(Math.max(1, ...data.flatMap((d) => [d.a, d.b])));
    const step = (W - PAD.l - PAD.r) / Math.max(1, data.length - 1);
    const y = (v: number) => PAD.t + (1 - v / max) * (H - PAD.t - PAD.b);
    const xs = data.map((_, i) => PAD.l + i * step);
    return { max, xs, ya: data.map((d) => y(d.a)), yb: data.map((d) => y(d.b)) };
  }, [data]);

  const line = smooth(xs.map((x, i) => [x, ya[i]]));
  const area = `${line} L${xs[xs.length - 1]},${H - PAD.b} L${xs[0]},${H - PAD.b} Z`;
  const lineB = smooth(xs.map((x, i) => [x, yb[i]]));
  const ticks = [0, 0.5, 1].map((t) => Math.round(max * t));

  function move(e: PointerEvent<SVGSVGElement>) {
    const box = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - box.left) / box.width) * W;
    const i = Math.round(((x - PAD.l) / (W - PAD.l - PAD.r)) * (data.length - 1));
    setHover(Math.min(data.length - 1, Math.max(0, i)));
  }

  const total = data.reduce((s, d) => s + d.a, 0);
  const tip = hover !== null ? data[hover] : null;

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full touch-pan-y"
        role="img"
        aria-label={`${aLabel} and ${bLabel} over the last ${data.length} days. ${total} ${aLabel.toLowerCase()} in total.`}
        onPointerMove={move}
        onPointerLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id={`g${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--brand-solid)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--brand-solid)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {ticks.map((t) => {
          const y = PAD.t + (1 - t / max) * (H - PAD.t - PAD.b);
          return (
            <g key={t}>
              <line x1={PAD.l} x2={W - PAD.r} y1={y} y2={y} stroke="var(--line)" strokeDasharray={t === 0 ? undefined : "3 5"} />
              <text x={PAD.l - 8} y={y + 4} textAnchor="end" fontSize="11" fill="var(--muted)">
                {t}
              </text>
            </g>
          );
        })}

        {data.map((d, i) =>
          i % Math.ceil(data.length / 5) === 0 || i === data.length - 1 ? (
            <text key={d.label} x={xs[i]} y={H - 8} textAnchor={i === 0 ? "start" : i === data.length - 1 ? "end" : "middle"} fontSize="11" fill="var(--muted)">
              {shortDay(d.label)}
            </text>
          ) : null,
        )}

        <motion.path d={area} fill={`url(#g${id})`} initial={reduce ? false : { opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: 0.9, delay: 0.3 }} />
        <motion.path
          d={lineB}
          fill="none"
          stroke="var(--muted)"
          strokeWidth="1.75"
          strokeDasharray="4 5"
          strokeLinecap="round"
          initial={reduce ? false : { pathLength: 0 }}
          whileInView={{ pathLength: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
        />
        <motion.path
          d={line}
          fill="none"
          stroke="var(--brand-solid)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={reduce ? false : { pathLength: 0 }}
          whileInView={{ pathLength: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
        />

        {hover !== null && (
          <g pointerEvents="none">
            <line x1={xs[hover]} x2={xs[hover]} y1={PAD.t} y2={H - PAD.b} stroke="var(--line)" />
            <circle cx={xs[hover]} cy={yb[hover]} r="4" fill="var(--card)" stroke="var(--muted)" strokeWidth="2" />
            <circle cx={xs[hover]} cy={ya[hover]} r="5" fill="var(--card)" stroke="var(--brand-solid)" strokeWidth="2.5" />
          </g>
        )}
      </svg>

      {tip && hover !== null && (
        <div
          className="pointer-events-none absolute top-1 z-10 -translate-x-1/2 rounded-xl border border-line bg-card px-3 py-2 text-xs shadow-[var(--shadow)]"
          style={{ left: `${Math.min(88, Math.max(12, (xs[hover] / W) * 100))}%` }}
        >
          <p className="font-semibold">{shortDay(tip.label)}</p>
          <p className="mt-1 flex items-center gap-1.5 text-muted">
            <span className="h-2 w-2 rounded-full bg-brand-solid" aria-hidden /> {aLabel}: <b className="text-fg">{tip.a}</b>
          </p>
          <p className="flex items-center gap-1.5 text-muted">
            <span className="h-2 w-2 rounded-full bg-muted" aria-hidden /> {bLabel}: <b className="text-fg">{tip.b}</b>
          </p>
        </div>
      )}

      <div className="mt-2 flex gap-5 text-xs text-muted">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-4 rounded-full bg-brand-solid" aria-hidden /> {aLabel}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-0 w-4 border-t-2 border-dashed border-muted" aria-hidden /> {bLabel}
        </span>
      </div>
    </div>
  );
}

/** A tiny trend line for stat cards. */
export function Sparkline({ values }: { values: number[] }) {
  const max = Math.max(1, ...values);
  const w = 96;
  const h = 32;
  const pts: [number, number][] = values.map((v, i) => [(i / Math.max(1, values.length - 1)) * w, h - 3 - (v / max) * (h - 6)]);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-8 w-24" aria-hidden>
      <path d={smooth(pts)} fill="none" stroke="var(--brand-solid)" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
