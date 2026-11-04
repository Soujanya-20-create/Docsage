"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2 } from "lucide-react";
import { AuthCard } from "@/components/auth/AuthCard";
import { CodeTimers } from "@/components/auth/CodeTimers";
import { OtpInput } from "@/components/auth/OtpInput";
import { FormError, FormNotice } from "@/components/auth/Fields";
import { ApiError, api, json, type OtpTiming } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useCountdown } from "@/lib/useCountdown";

export default function VerifyEmailPage() {
  const { user, loading, refreshUser } = useAuth();
  const router = useRouter();
  const expiry = useCountdown(0);
  const resendWait = useCountdown(0);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const submitted = useRef("");

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  // Start the timers from the server's view, so they survive a reload.
  useEffect(() => {
    if (!user || user.email_verified) return;
    api<OtpTiming>("/auth/otp-status")
      .then((t) => {
        expiry.start(t.expires_in);
        resendWait.start(t.resend_in);
      })
      .catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const verify = useCallback(
    async (value: string) => {
      if (submitted.current === value) return; // a double submit would burn an attempt
      submitted.current = value;
      setError("");
      setNotice("");
      setBusy(true);
      try {
        await api("/auth/verify-email", json({ code: value }));
        await refreshUser();
        setDone(true);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Could not check the code. Try again.");
        setCode("");
        submitted.current = "";
      } finally {
        setBusy(false);
      }
    },
    [refreshUser],
  );

  async function resend() {
    setError("");
    setNotice("");
    setResending(true);
    try {
      const t = await api<OtpTiming>("/auth/resend-verification", { method: "POST" });
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

  if (loading || !user) {
    return <Loader2 className="h-6 w-6 animate-spin text-brand" aria-label="Loading" />;
  }

  if (done || user.email_verified) {
    return (
      <AuthCard title="Email confirmed">
        <div className="card p-6 text-center">
          <CheckCircle2 className="mx-auto h-10 w-10 text-ok" strokeWidth={1.75} aria-hidden />
          <p className="mt-4 text-[0.95rem] leading-relaxed text-muted">Thank you. Your account is ready to use.</p>
          <Link href="/workspace" className="btn btn-lg mt-6 w-full">
            Go to my dashboard
          </Link>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Confirm your email"
      subtitle={
        <>
          We sent a 6-digit code to <strong className="text-fg">{user.email}</strong>. Enter it below to finish setting up.
        </>
      }
      footer={
        <Link href="/workspace" className="font-semibold text-brand hover:underline">
          Do this later
        </Link>
      }
    >
      <div className="space-y-5">
        <FormError>{error}</FormError>
        <FormNotice>{notice}</FormNotice>
        <div>
          <OtpInput value={code} onChange={setCode} onComplete={verify} disabled={busy} invalid={!!error} autoFocus />
          <CodeTimers expiresIn={expiry.left} resendIn={resendWait.left} onResend={resend} resending={resending} />
        </div>
        <button type="button" disabled={busy || code.length !== 6} onClick={() => verify(code)} className="btn btn-lg w-full">
          {busy ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Checking
            </>
          ) : (
            "Confirm email"
          )}
        </button>
      </div>
    </AuthCard>
  );
}
