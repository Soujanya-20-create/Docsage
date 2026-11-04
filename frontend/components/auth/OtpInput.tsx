"use client";

import { useEffect, useRef, type ClipboardEvent, type KeyboardEvent } from "react";

const LENGTH = 6;

/** Six single-digit boxes that behave like one field: typing advances, backspace retreats, paste fills. */
export function OtpInput({
  value,
  onChange,
  onComplete,
  disabled,
  invalid,
  autoFocus,
}: {
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  disabled?: boolean;
  invalid?: boolean;
  autoFocus?: boolean;
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (autoFocus) refs.current[0]?.focus();
  }, [autoFocus]);

  const focus = (i: number) => refs.current[Math.min(Math.max(i, 0), LENGTH - 1)]?.focus();

  function commit(next: string, focusAt: number) {
    const clean = next.replace(/\D/g, "").slice(0, LENGTH);
    onChange(clean);
    if (clean.length === LENGTH) onComplete?.(clean);
    else focus(focusAt);
  }

  function onType(i: number, raw: string) {
    const digits = raw.replace(/\D/g, "");
    if (!digits) return;
    const chars = value.padEnd(LENGTH, " ").split("");
    // A browser autofill or fast typing can deliver several digits at once: spread them from this box.
    digits.split("").forEach((d, k) => {
      if (i + k < LENGTH) chars[i + k] = d;
    });
    commit(chars.join("").replace(/ /g, ""), i + digits.length);
  }

  function onKey(i: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace") {
      e.preventDefault();
      const chars = value.split("");
      if (chars[i]) chars[i] = "";
      else if (i > 0) {
        chars[i - 1] = "";
        focus(i - 1);
      }
      onChange(chars.join("").slice(0, LENGTH));
    } else if (e.key === "ArrowLeft") focus(i - 1);
    else if (e.key === "ArrowRight") focus(i + 1);
  }

  function onPaste(e: ClipboardEvent) {
    e.preventDefault();
    commit(e.clipboardData.getData("text"), LENGTH - 1);
  }

  return (
    <div className="flex justify-between gap-2 sm:gap-3" role="group" aria-label="6 digit code">
      {Array.from({ length: LENGTH }, (_, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          value={value[i] ?? ""}
          onChange={(e) => onType(i, e.target.value)}
          onKeyDown={(e) => onKey(i, e)}
          onPaste={onPaste}
          onFocus={(e) => e.target.select()}
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          maxLength={LENGTH}
          disabled={disabled}
          aria-label={`Digit ${i + 1}`}
          aria-invalid={invalid ? true : undefined}
          className="input !h-14 !w-full !px-0 text-center text-2xl font-semibold tabular-nums"
        />
      ))}
    </div>
  );
}
