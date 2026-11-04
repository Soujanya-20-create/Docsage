"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthCard } from "@/components/auth/AuthCard";
import { FormError, SubmitButton, TextField } from "@/components/auth/Fields";
import { ApiError, publicApi, type OtpTiming } from "@/lib/api";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const address = email.trim().toLowerCase();
    try {
      const timing = await publicApi<OtpTiming>("/auth/forgot-password", { email: address });
      try {
        // Lets the next screen start its countdown from the real values, even after a reload.
        sessionStorage.setItem(
          "docsage:reset",
          JSON.stringify({ email: address, expiresAt: Date.now() + timing.expires_in * 1000, resendAt: Date.now() + timing.resend_in * 1000 }),
        );
      } catch {}
      router.push(`/reset-password?email=${encodeURIComponent(address)}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not send the code. Check your connection and try again.");
      setBusy(false);
    }
  }

  return (
    <AuthCard
      title="Reset your password"
      subtitle="Enter your email and we will send you a 6-digit code to choose a new password."
      footer={
        <Link href="/login" className="font-semibold text-brand hover:underline">
          Back to sign in
        </Link>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <FormError>{error}</FormError>
        <TextField label="Email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
        <SubmitButton busy={busy} busyLabel="Sending code">
          Send code
        </SubmitButton>
      </form>
    </AuthCard>
  );
}
