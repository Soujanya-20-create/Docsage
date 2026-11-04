"use client";

import { useSearchParams } from "next/navigation";
import { FormNotice } from "./Fields";

/** Shown on the sign-in screen right after a successful password reset. */
export function ResetNotice() {
  const reset = useSearchParams().get("reset");
  return reset ? <FormNotice>Your password was changed. Sign in with the new one.</FormNotice> : null;
}
