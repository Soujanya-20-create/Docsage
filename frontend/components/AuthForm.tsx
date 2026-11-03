"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useAuth } from "@/lib/auth";

export default function AuthForm({ mode }: { mode: "login" | "register" }) {
  const { login, register } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const isLogin = mode === "login";

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (isLogin) await login(email, password);
      else await register(name, email, password);
      router.replace("/documents");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <form onSubmit={submit} className="w-full max-w-sm rounded-2xl border border-line bg-card p-6 shadow-sm">
        <Link href="/" className="mb-4 flex items-center gap-2 font-bold">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/docsage-mark.png" alt="" className="h-6 w-6" /> DocSage
        </Link>
        <h1 className="text-2xl font-bold">{isLogin ? "Welcome back" : "Create your account"}</h1>
        <div className="mt-5 space-y-3">
          {!isLogin && (
            <input className="input" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
          )}
          <input className="input" type="email" placeholder="Email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          <input
            className="input"
            type="password"
            placeholder={isLogin ? "Password" : "Password (8+ characters)"}
            required
            minLength={isLogin ? undefined : 8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={isLogin ? "current-password" : "new-password"}
          />
        </div>
        {error && <p role="alert" className="mt-3 text-sm text-danger">{error}</p>}
        <button className="btn mt-5 w-full" disabled={busy}>{busy ? "Please wait…" : isLogin ? "Sign in" : "Create account"}</button>
        <p className="mt-4 text-center text-sm text-muted">
          {isLogin ? "New here? " : "Already have an account? "}
          <Link className="font-semibold text-brand" href={isLogin ? "/register" : "/login"}>
            {isLogin ? "Create an account" : "Sign in"}
          </Link>
        </p>
      </form>
    </main>
  );
}
