"use client";

import { motion, useReducedMotion } from "motion/react";

export type Slice = { label: string; value: number; color: string };

const R = 52;
const C = 2 * Math.PI * R;

/** A ring split into slices, with the total in the middle and a legend beside it. */
export function DonutChart({ slices, centerLabel }: { slices: Slice[]; centerLabel: string }) {
  const reduce = useReducedMotion();
  const total = slices.reduce((s, x) => s + x.value, 0);
  let offset = 0;

  return (
    <div className="flex flex-wrap items-center gap-6">
      <div className="relative h-36 w-36 shrink-0">
        <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90" role="img" aria-label={`${total} ${centerLabel}: ${slices.map((s) => `${s.value} ${s.label}`).join(", ")}`}>
          <circle cx="60" cy="60" r={R} fill="none" stroke="var(--line)" strokeWidth="12" />
          {total > 0 &&
            slices
              .filter((s) => s.value > 0)
              .map((s, i) => {
                const len = (s.value / total) * C;
                const dash = Math.max(0, len - (slices.filter((x) => x.value > 0).length > 1 ? 3 : 0));
                const el = (
                  <motion.circle
                    key={s.label}
                    cx="60"
                    cy="60"
                    r={R}
                    fill="none"
                    stroke={s.color}
                    strokeWidth="12"
                    strokeLinecap="butt"
                    strokeDasharray={`${dash} ${C}`}
                    strokeDashoffset={-offset}
                    initial={reduce ? false : { strokeDasharray: `0 ${C}` }}
                    whileInView={{ strokeDasharray: `${dash} ${C}` }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.9, delay: 0.15 * i, ease: [0.16, 1, 0.3, 1] }}
                  />
                );
                offset += len;
                return el;
              })}
        </svg>
        <div className="absolute inset-0 grid place-items-center text-center">
          <div>
            <p className="text-2xl font-semibold leading-none tabular-nums">{total}</p>
            <p className="mt-1 text-xs text-muted">{centerLabel}</p>
          </div>
        </div>
      </div>
      <ul className="min-w-[8rem] flex-1 space-y-2.5 text-sm">
        {slices.map((s) => (
          <li key={s.label} className="flex items-center gap-2.5">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: s.color }} aria-hidden />
            <span className="flex-1 text-muted">{s.label}</span>
            <span className="font-semibold tabular-nums">{s.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
