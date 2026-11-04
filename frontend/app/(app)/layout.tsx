"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Loader2, MailWarning, Menu, Search } from "lucide-react";
import { Brand } from "@/components/Brand";
import { SearchPalette, OPEN_SEARCH_EVENT } from "@/components/app/SearchPalette";
import { Sidebar } from "@/components/app/Sidebar";
import { ApiError, api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { ChatsProvider, useChats } from "@/lib/chats";
import Link from "next/link";

function VerifyBanner({ required }: { required: boolean }) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "sending" | "error">("idle");
  const [message, setMessage] = useState("");

  async function resend() {
    setState("sending");
    try {
      await api("/auth/resend-verification", { method: "POST" });
      router.push("/verify-email");
    } catch (err) {
      // A 429 just means a code was sent a moment ago: go and enter it.
      if (err instanceof ApiError && err.status === 429) return void router.push("/verify-email");
      setMessage(err instanceof ApiError ? err.message : "Could not send the code.");
      setState("error");
    }
  }

  return (
    <div role="status" className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-line bg-brand-soft px-4 py-2 text-sm">
      <MailWarning className="h-4 w-4 shrink-0 text-brand" strokeWidth={1.75} aria-hidden />
      <span className="text-fg">{state === "error" ? message : required ? "Confirm your email to upload documents and ask questions." : "Confirm your email so you can reset your password if you forget it."}</span>
      <Link href="/verify-email" className="font-semibold text-brand hover:underline">
        Enter code
      </Link>
      <button onClick={resend} disabled={state === "sending"} className="font-semibold text-muted hover:text-fg disabled:opacity-60">
        {state === "sending" ? "Sending" : "Email me a new code"}
      </button>
    </div>
  );
}

function Shell({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { drawerOpen, setDrawerOpen } = useChats();
  const reduce = useReducedMotion();

  return (
    <div className="flex h-[100dvh]">
      <SearchPalette />
      {/* Desktop sidebar */}
      <aside className="hidden w-[17.5rem] shrink-0 border-r border-line md:block">
        <Sidebar />
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.button
              aria-label="Close menu"
              className="fixed inset-0 z-40 bg-black/50 md:hidden"
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDrawerOpen(false)}
            />
            <motion.aside
              className="fixed inset-y-0 left-0 z-50 w-[85%] max-w-xs border-r border-line shadow-2xl md:hidden"
              initial={reduce ? false : { x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 380, damping: 36 }}
            >
              <Sidebar />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="glass flex items-center gap-3 border-x-0 border-t-0 px-3 py-2.5 md:hidden">
          <button onClick={() => setDrawerOpen(true)} aria-label="Open menu" className="grid h-10 w-10 place-items-center rounded-xl hover:bg-brand-soft">
            <Menu className="h-5 w-5" strokeWidth={1.75} aria-hidden />
          </button>
          <Brand size={26} />
          <button
            onClick={() => window.dispatchEvent(new Event(OPEN_SEARCH_EVENT))}
            aria-label="Search"
            className="ml-auto grid h-10 w-10 place-items-center rounded-xl hover:bg-brand-soft"
          >
            <Search className="h-5 w-5" strokeWidth={1.75} aria-hidden />
          </button>
        </header>
        {/* No banner when the server cannot email a code: there would be nothing to enter. */}
        {user && !user.email_verified && user.email_enabled && <VerifyBanner required={user.verification_required} />}
        <main className="min-h-0 flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}

export default function AppLayout({ children }: { children: ReactNode }) {
  const { user, loading, waking } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div className="flex h-[100dvh] flex-col items-center justify-center gap-3 text-muted">
        <Loader2 className="h-6 w-6 animate-spin text-brand" strokeWidth={1.75} aria-hidden />
        <p className="text-sm">{waking ? "The server is waking up. This can take up to a minute." : "Loading your workspace"}</p>
      </div>
    );
  }

  return (
    <ChatsProvider>
      <Shell>{children}</Shell>
    </ChatsProvider>
  );
}
