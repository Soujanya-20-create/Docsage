"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthCard } from "@/components/auth/AuthCard";
import { RedirectIfSignedIn } from "@/components/auth/RedirectIfSignedIn";
import { FormError, PasswordField, StrengthMeter, SubmitButton, TextField, passwordProblem } from "@/components/auth/Fields";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export default function RegisterPage() {
  const { register, waking } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const problem = passwordProblem(password, email);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setTouched(true);
    if (problem || !accepted) return;
    setBusy(true);
    try {
      await register(name.trim(), email.trim(), password, accepted);
      router.replace("/verify-email");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create the account. Check your connection and try again.");
      setBusy(false);
    }
  }

  return (
    <AuthCard
      title="Create your account"
      subtitle="Upload a document and ask your first question in under a minute."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-brand hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <RedirectIfSignedIn disabled={busy} />
      <form onSubmit={submit} className="space-y-5">
        <FormError>{error}</FormError>
        {waking && <p className="rounded-xl bg-brand-soft p-3 text-sm text-muted">The server is waking up. This can take up to a minute.</p>}
        <TextField label="Name" autoComplete="name" required maxLength={80} value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
        <TextField label="Email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
        <div>
          <PasswordField
            label="Password"
            autoComplete="new-password"
            required
            maxLength={128}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={touched && problem ? problem : undefined}
          />
          <StrengthMeter password={password} />
        </div>

        <div>
          <label className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed text-muted">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
              className="mt-1 h-4 w-4 shrink-0 rounded border-line accent-[var(--brand-solid)]"
            />
            <span>
              I agree to the{" "}
              <Link href="/terms" target="_blank" className="font-semibold text-brand hover:underline">
                Terms of Service
              </Link>{" "}
              and have read the{" "}
              <Link href="/privacy" target="_blank" className="font-semibold text-brand hover:underline">
                Privacy Policy
              </Link>
              .
            </span>
          </label>
          {touched && !accepted && (
            <p className="mt-1.5 text-sm text-danger" role="alert">
              Please accept the terms to continue.
            </p>
          )}
        </div>

        <SubmitButton busy={busy} busyLabel="Creating account">
          Create account
        </SubmitButton>
      </form>
    </AuthCard>
  );
}
