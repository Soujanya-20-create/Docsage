"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Loader2, Menu, Search } from "lucide-react";
import { Brand } from "@/components/Brand";
import { SearchPalette, OPEN_SEARCH_EVENT } from "@/components/app/SearchPalette";
import { Sidebar } from "@/components/app/Sidebar";
import { useAuth } from "@/lib/auth";
import { ChatsProvider, useChats } from "@/lib/chats";

function Shell({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { drawerOpen, setDrawerOpen } = useChats();
  const reduce = useReducedMotion();
  const [collapsed, setCollapsed] = useState(false);

  // Remember the sidebar choice on this device. Read after mount so server and client markup match.
  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem("docsage:sidebar") === "closed");
    } catch {}
  }, []);
  const toggle = () =>
    setCollapsed((c) => {
      try {
        localStorage.setItem("docsage:sidebar", c ? "open" : "closed");
      } catch {}
      return !c;
    });

  return (
    <div className="flex h-[100dvh]">
      <SearchPalette />
      {/* Desktop sidebar */}
      <aside className={`hidden shrink-0 border-r border-line transition-[width] duration-300 ease-out md:block ${collapsed ? "w-[4.75rem]" : "w-[17.5rem]"}`}>
        <Sidebar collapsed={collapsed} onToggle={toggle} />
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
