"use client";

import { motion, useReducedMotion } from "motion/react";

/** Ranked horizontal bars: one row per item, widths relative to the largest. */
export function BarList({ items, unit }: { items: { label: string; value: number }[]; unit: string }) {
  const reduce = useReducedMotion();
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <ol className="space-y-4">
      {items.map((item, i) => (
        <li key={item.label}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate font-medium" title={item.label}>
              {item.label}
            </span>
            <span className="shrink-0 tabular-nums text-muted">
              {item.value} {unit}
              {item.value === 1 ? "" : "s"}
            </span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-line" role="presentation">
            <motion.div
              className="h-full rounded-full bg-brand-solid"
              initial={reduce ? false : { width: 0 }}
              whileInView={{ width: `${(item.value / max) * 100}%` }}
              viewport={{ once: true }}
              transition={{ duration: 0.9, delay: 0.08 * i, ease: [0.16, 1, 0.3, 1] }}
              style={reduce ? { width: `${(item.value / max) * 100}%` } : undefined}
            />
          </div>
        </li>
      ))}
    </ol>
  );
}
