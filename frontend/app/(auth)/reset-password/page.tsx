"use client";

import { Suspense, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthCard } from "@/components/auth/AuthCard";
import { CodeTimers } from "@/components/auth/CodeTimers";
import { OtpInput } from "@/components/auth/OtpInput";
import { FormError, FormNotice, PasswordField, StrengthMeter, SubmitButton, passwordProblem } from "@/components/auth/Fields";
import { ApiError, publicApi, type OtpTiming } from "@/lib/api";
import { useCountdown } from "@/lib/useCountdown";

function ResetForm() {
  const email = (useSearchParams().get("email") ?? "").trim().toLowerCase();
  const router = useRouter();
  const expiry = useCountdown(0);
  const resendWait = useCountdown(0);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  // Pick the countdowns up where the previous screen left them.
  useEffect(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem("docsage:reset") ?? "null");
      if (saved?.email === email) {
        expiry.start(Math.max(0, Math.ceil((saved.expiresAt - Date.now()) / 1000)));
        resendWait.start(Math.max(0, Math.ceil((saved.resendAt - Date.now()) / 1000)));
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email]);

  const problem = passwordProblem(password, email);
  const expired = expiry.left <= 0;

  if (!email) {
    return (
      <AuthCard
        title="Start from your email"
        subtitle="We need your email address to send the reset code."
        footer={
          <Link href="/forgot-password" className="font-semibold text-brand hover:underline">
            Request a code
          </Link>
        }
      >
        {null}
      </AuthCard>
    );
  }

  async function resend() {
    setError("");
    setNotice("");
    setResending(true);
    try {
      const t = await publicApi<OtpTiming>("/auth/forgot-password", { email });
      expiry.start(t.expires_in);
      resendWait.start(t.resend_in);
      setCode("");
      setNotice("A new code is on its way.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not send a new code.");
    } finally {
      setResending(false);
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setTouched(true);
    if (code.length !== 6 || problem) return;
    setBusy(true);
    try {
      await publicApi("/auth/reset-password", { email, code, new_password: password });
      try {
        sessionStorage.removeItem("docsage:reset");
      } catch {}
      router.replace("/login?reset=1");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not reset the password. Check your connection and try again.");
      setBusy(false);
    }
  }

  return (
    <AuthCard
      title="Enter your code"
      subtitle={
        <>
          We sent a 6-digit code to <strong className="text-fg">{email}</strong>. Enter it with a new password. You will be signed out on all devices.
        </>
      }
      footer={
        <Link href="/forgot-password" className="font-semibold text-brand hover:underline">
          Use a different email
        </Link>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <FormError>{error}</FormError>
        <FormNotice>{notice}</FormNotice>
        <div>
          <p className="label">Verification code</p>
          <OtpInput value={code} onChange={setCode} disabled={busy} invalid={touched && code.length !== 6} autoFocus />
          {touched && code.length !== 6 && (
            <p className="mt-1.5 text-sm text-danger" role="alert">
              Enter all 6 digits.
            </p>
          )}
          <CodeTimers expiresIn={expiry.left} resendIn={resendWait.left} onResend={resend} resending={resending} />
        </div>
        <div>
          <PasswordField
            label="New password"
            autoComplete="new-password"
            required
            maxLength={128}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={touched && problem ? problem : undefined}
          />
          <StrengthMeter password={password} />
        </div>
        <SubmitButton busy={busy || expired} busyLabel={expired && !busy ? "Code expired" : "Saving"}>
          Save new password
        </SubmitButton>
      </form>
    </AuthCard>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetForm />
    </Suspense>
  );
}
