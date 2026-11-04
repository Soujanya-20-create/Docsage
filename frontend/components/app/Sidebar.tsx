"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { FileText, LayoutDashboard, LogOut, MessageSquarePlus, Search, Settings, Trash2, X } from "lucide-react";
import { Brand } from "@/components/Brand";
import { useAuth } from "@/lib/auth";
import { useChats } from "@/lib/chats";
import type { Chat } from "@/lib/api";

const DAY = 86_400_000;

/** Groups chats the way people expect to scan them: Today, Yesterday, last week, older. */
function group(chats: Chat[]): { label: string; items: Chat[] }[] {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const buckets: Record<string, Chat[]> = { Today: [], Yesterday: [], "Previous 7 days": [], Older: [] };
  for (const c of chats) {
    const age = start.getTime() - new Date(c.created_at).getTime();
    const key = age <= 0 ? "Today" : age <= DAY ? "Yesterday" : age <= 7 * DAY ? "Previous 7 days" : "Older";
    buckets[key].push(c);
  }
  return Object.entries(buckets)
    .filter(([, items]) => items.length)
    .map(([label, items]) => ({ label, items }));
}

const bottomNav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/documents", label: "Documents", icon: FileText },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const { user, logout } = useAuth();
  const { chats, loaded, activeId, setActiveId, newChat, remove, setDrawerOpen } = useChats();
  const pathname = usePathname();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [confirming, setConfirming] = useState<number | null>(null);

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    return group(q ? chats.filter((c) => c.title.toLowerCase().includes(q)) : chats);
  }, [chats, query]);

  const close = () => setDrawerOpen(false);

  function startChat() {
    newChat();
    close();
    router.push("/chat");
  }

  function openChat(id: number) {
    setActiveId(id);
    close();
    router.push("/chat");
  }

  async function signOut() {
    await logout();
    router.replace("/login");
  }

  return (
    <div className="flex h-full w-full flex-col bg-card">
      {/* Logo */}
      <div className="flex items-center justify-between px-4 pb-3 pt-4">
        <Link href="/" aria-label="DocSage home" onClick={close}>
          <Brand size={26} />
        </Link>
        <button onClick={close} aria-label="Close menu" className="grid h-9 w-9 place-items-center rounded-lg text-muted hover:bg-brand-soft md:hidden">
          <X className="h-5 w-5" strokeWidth={1.75} aria-hidden />
        </button>
      </div>

      {/* New chat + search */}
      <div className="space-y-2 px-3">
        <button onClick={startChat} className="btn btn-ghost w-full !justify-start">
          <MessageSquarePlus className="h-4 w-4" strokeWidth={1.75} aria-hidden /> New chat
        </button>
        <label className="relative block">
          <span className="sr-only">Search chats</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" strokeWidth={1.75} aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search chats"
            className="input !py-2 !pl-9 !text-sm"
          />
        </label>
      </div>

      {/* Recent chats */}
      <nav aria-label="Recent chats" className="scroll-thin mt-3 min-h-0 flex-1 overflow-y-auto px-3 pb-2">
        {!loaded && (
          <div className="space-y-2 pt-2" aria-hidden>
            {[70, 50, 85, 60].map((w) => (
              <div key={w} className="sk h-8" style={{ width: `${w}%` }} />
            ))}
          </div>
        )}
        {loaded && chats.length === 0 && <p className="px-2 pt-3 text-sm text-muted">Your conversations will appear here.</p>}
        {loaded && chats.length > 0 && groups.length === 0 && <p className="px-2 pt-3 text-sm text-muted">No chats match &quot;{query}&quot;.</p>}
        {groups.map(({ label, items }) => (
          <section key={label} className="mt-3 first:mt-1">
            <h2 className="px-2 pb-1 text-xs font-semibold uppercase tracking-wide text-muted">{label}</h2>
            <ul className="space-y-0.5">
              {items.map((c) => {
                const active = pathname.startsWith("/chat") && activeId === c.id;
                return (
                  <li key={c.id} className={`group flex items-center rounded-xl transition-colors ${active ? "bg-brand-soft" : "hover:bg-brand-soft/60"}`}>
                    <button
                      onClick={() => openChat(c.id)}
                      aria-current={active ? "page" : undefined}
                      className={`min-w-0 flex-1 truncate rounded-xl px-3 py-2 text-left text-sm ${active ? "font-semibold text-fg" : "text-muted group-hover:text-fg"}`}
                    >
                      {c.title}
                    </button>
                    {confirming === c.id ? (
                      <button
                        onClick={async () => {
                          setConfirming(null);
                          await remove(c.id);
                        }}
                        onBlur={() => setConfirming(null)}
                        autoFocus
                        className="mr-1 rounded-lg bg-danger px-2 py-1 text-xs font-semibold text-white"
                      >
                        Delete
                      </button>
                    ) : (
                      <button
                        onClick={() => setConfirming(c.id)}
                        aria-label={`Delete chat ${c.title}`}
                        className="mr-1 grid h-7 w-7 place-items-center rounded-lg text-muted opacity-0 hover:text-danger focus:opacity-100 group-hover:opacity-100"
                      >
                        <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </nav>

      {/* Bottom corner: dashboard, documents, settings, account */}
      <div className="border-t border-line p-3">
        <nav aria-label="App" className="space-y-0.5">
          {bottomNav.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                onClick={close}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                  active ? "bg-brand-solid text-brand-fg" : "text-muted hover:bg-brand-soft hover:text-fg"
                }`}
              >
                <Icon className="h-4 w-4" strokeWidth={1.75} aria-hidden /> {label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-2 flex items-center gap-2 rounded-xl px-2 py-2">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-soft text-sm font-semibold text-brand" aria-hidden>
            {(user?.name || user?.email || "?").charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-sm font-medium">{user?.name || "Your account"}</p>
            <p className="truncate text-xs text-muted" title={user?.email}>
              {user?.email}
            </p>
          </div>
          <button onClick={signOut} aria-label="Sign out" title="Sign out" className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-brand-soft hover:text-fg">
            <LogOut className="h-4 w-4" strokeWidth={1.75} aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
}
