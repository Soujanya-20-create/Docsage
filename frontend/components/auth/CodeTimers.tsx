"use client";

import { Clock } from "lucide-react";
import { clock } from "@/lib/useCountdown";

/** "Code expires in 9:42" and the resend button that unlocks after the cooldown. */
export function CodeTimers({
  expiresIn,
  resendIn,
  onResend,
  resending,
}: {
  expiresIn: number;
  resendIn: number;
  onResend: () => void;
  resending: boolean;
}) {
  const expired = expiresIn <= 0;
  const urgent = !expired && expiresIn <= 60;
  return (
    <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm">
      <p
        className={`flex items-center gap-1.5 font-medium tabular-nums ${expired ? "text-danger" : urgent ? "text-warn" : "text-muted"}`}
        aria-live={urgent || expired ? "polite" : "off"}
      >
        <Clock className="h-4 w-4" strokeWidth={1.75} aria-hidden />
        {expired ? "This code has expired" : `Code expires in ${clock(expiresIn)}`}
      </p>
      <button
        type="button"
        onClick={onResend}
        disabled={resendIn > 0 || resending}
        className="font-semibold text-brand enabled:hover:underline disabled:cursor-not-allowed disabled:text-muted"
      >
        {resending ? "Sending" : resendIn > 0 ? `Resend code in ${clock(resendIn)}` : expired ? "Send a new code" : "Resend code"}
      </button>
    </div>
  );
}
