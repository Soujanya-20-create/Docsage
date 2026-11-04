"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** mm:ss for a number of seconds. */
export const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

/**
 * Counts down whole seconds to a fixed deadline, so a throttled background tab cannot make it drift.
 * `start(n)` (re)starts it; it ticks only while there is time left.
 */
export function useCountdown(initial = 0) {
  const deadline = useRef(Date.now() + initial * 1000);
  const [left, setLeft] = useState(initial);

  const start = useCallback((seconds: number) => {
    deadline.current = Date.now() + seconds * 1000;
    setLeft(Math.max(0, seconds));
  }, []);

  useEffect(() => {
    if (left <= 0) return;
    const timer = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((deadline.current - Date.now()) / 1000));
      setLeft(remaining);
      if (remaining === 0) clearInterval(timer);
    }, 500);
    return () => clearInterval(timer);
  }, [left > 0]); // eslint-disable-line react-hooks/exhaustive-deps

  return { left, start };
}
