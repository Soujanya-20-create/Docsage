"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

/** Sends people who are already signed in straight to their dashboard. Pause it while a form is mid-submit. */
export function RedirectIfSignedIn({ disabled = false }: { disabled?: boolean }) {
  const { user } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (user && !disabled) router.replace("/workspace");
  }, [user, disabled, router]);
  return null;
}
