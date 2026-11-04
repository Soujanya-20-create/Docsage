"use client";

import { useId, useState, type InputHTMLAttributes, type ReactNode } from "react";
import { AlertCircle, CheckCircle2, Eye, EyeOff, Loader2 } from "lucide-react";

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: ReactNode;
  error?: string;
  children: (id: string) => ReactNode;
}) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="label">
        {label}
      </label>
      {children(id)}
      {error ? (
        <p className="mt-1.5 text-sm text-danger" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

export function TextField({
  label,
  hint,
  error,
  ...props
}: { label: string; hint?: ReactNode; error?: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <Field label={label} hint={hint} error={error}>
      {(id) => <input id={id} className="input" aria-invalid={error ? true : undefined} {...props} />}
    </Field>
  );
}

export function PasswordField({
  label,
  hint,
  error,
  ...props
}: { label: string; hint?: ReactNode; error?: string } & Omit<InputHTMLAttributes<HTMLInputElement>, "type">) {
  const [shown, setShown] = useState(false);
  return (
    <Field label={label} hint={hint} error={error}>
      {(id) => (
        <div className="relative">
          <input
            id={id}
            type={shown ? "text" : "password"}
            className="input pr-11"
            aria-invalid={error ? true : undefined}
            {...props}
          />
          <button
            type="button"
            onClick={() => setShown((s) => !s)}
            aria-label={shown ? "Hide password" : "Show password"}
            aria-pressed={shown}
            className="absolute right-1.5 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-muted transition-colors hover:bg-brand-soft hover:text-fg"
          >
            {shown ? <EyeOff className="h-4 w-4" strokeWidth={1.75} aria-hidden /> : <Eye className="h-4 w-4" strokeWidth={1.75} aria-hidden />}
          </button>
        </div>
      )}
    </Field>
  );
}

const COMMON = ["password", "1234567890", "qwertyuiop", "letmein", "welcome", "admin", "docsage"];

/** Mirrors the server rules (10+ characters, not obvious) and rates length and variety. */
export function passwordProblem(password: string, email = ""): string | null {
  if (password.length < 10) return "Use at least 10 characters.";
  const lower = password.toLowerCase();
  if (COMMON.some((c) => lower === c || lower === `${c}123` || lower === `${c}1234`) || new Set(password).size < 4)
    return "That password is too easy to guess.";
  if (email && lower === email.toLowerCase()) return "The password must not be your email address.";
  return null;
}

function strength(password: string): number {
  if (!password) return 0;
  let score = 0;
  if (password.length >= 10) score++;
  if (password.length >= 14) score++;
  const kinds = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((r) => r.test(password)).length;
  if (kinds >= 3) score++;
  if (kinds === 4 && password.length >= 12) score++;
  return passwordProblem(password) ? 1 : Math.max(score, 1);
}

export function StrengthMeter({ password }: { password: string }) {
  const level = strength(password);
  const labels = ["", "Weak", "Fair", "Good", "Strong"];
  const tone = ["bg-line", "bg-danger", "bg-amber-500", "bg-brand-solid", "bg-ok"][level];
  return (
    <div className="mt-2" aria-live="polite">
      <div className="flex gap-1.5" aria-hidden>
        {[1, 2, 3, 4].map((i) => (
          <span key={i} className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${i <= level ? tone : "bg-line"}`} />
        ))}
      </div>
      <p className="mt-1.5 text-xs text-muted">{password ? `Password strength: ${labels[level]}` : "Longer is better. A short sentence works well."}</p>
    </div>
  );
}

export function FormError({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return (
    <div role="alert" className="flex items-start gap-2.5 rounded-xl border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
      <span>{children}</span>
    </div>
  );
}

export function FormNotice({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return (
    <div role="status" className="flex items-start gap-2.5 rounded-xl border border-ok/30 bg-ok/10 p-3 text-sm text-ok">
      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
      <span>{children}</span>
    </div>
  );
}

export function SubmitButton({ busy, children, busyLabel }: { busy: boolean; children: ReactNode; busyLabel: string }) {
  return (
    <button type="submit" disabled={busy} className="btn btn-lg w-full">
      {busy ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} aria-hidden /> {busyLabel}
        </>
      ) : (
        children
      )}
    </button>
  );
}
