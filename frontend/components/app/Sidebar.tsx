"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  ChevronDown,
  FileText,
  Infinity as InfinityIcon,
  Layers,
  LogOut,
  MessageCircle,
  MessageSquarePlus,
  MoreVertical,
  Settings,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
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

const navItems = [
  { href: "/workspace", label: "Workspace", icon: Layers },
  { href: "/documents", label: "My Documents", icon: FileText },
  { href: "/dashboard", label: "Analytics", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const { user, logout } = useAuth();
  const { chats, loaded, activeId, setActiveId, newChat, remove, setDrawerOpen } = useChats();
  const pathname = usePathname();
  const router = useRouter();
  const [confirming, setConfirming] = useState<number | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [recentOpen, setRecentOpen] = useState(true);

  const groups = useMemo(() => group(chats), [chats]);
  const onChat = pathname.startsWith("/chat");

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

  const initials = (user?.name || user?.email || "?")
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase())
    .slice(0, 2)
    .join("");

  return (
    <div className="sidebar-surface flex h-full w-full flex-col">
      {/* Logo */}
      <div className="flex items-start justify-between px-5 pb-3 pt-6">
        <Link href="/workspace" aria-label="DocSage workspace" onClick={close} className="block">
          <span className="text-[1.15rem]">
            <Brand size={34} />
          </span>
          <span className="mt-1 block pl-[44px] text-[11px] font-medium text-muted">Document Intelligence AI</span>
        </Link>
        <button onClick={close} aria-label="Close menu" className="grid h-9 w-9 place-items-center rounded-xl text-muted hover:bg-brand-soft md:hidden">
          <X className="h-5 w-5" strokeWidth={1.75} aria-hidden />
        </button>
      </div>

      {/* Primary navigation */}
      <nav aria-label="App" className="space-y-1 px-3 pt-2">
        <button
          onClick={startChat}
          aria-current={onChat ? "page" : undefined}
          className="nav-item w-full text-left"
        >
          <MessageSquarePlus className="h-[19px] w-[19px]" strokeWidth={1.9} aria-hidden />
          New Chat
        </button>
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link key={href} href={href} onClick={close} aria-current={active ? "page" : undefined} className="nav-item">
              <Icon className="h-[19px] w-[19px]" strokeWidth={1.9} aria-hidden />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Recent chats */}
      <div className="mt-5 flex min-h-0 flex-1 flex-col px-3">
        <button
          onClick={() => setRecentOpen((o) => !o)}
          aria-expanded={recentOpen}
          className="flex items-center justify-between rounded-lg px-3 py-1.5 text-left text-[13px] font-bold tracking-tight"
        >
          Recent Chats
          <ChevronDown className={`h-4 w-4 text-muted transition-transform ${recentOpen ? "" : "-rotate-90"}`} strokeWidth={2} aria-hidden />
        </button>

        {recentOpen && (
          <nav aria-label="Recent chats" className="scroll-thin mt-1 min-h-0 flex-1 overflow-y-auto pb-2">
            {!loaded && (
              <div className="space-y-2 px-1 pt-1" aria-hidden>
                {[70, 50, 85, 60].map((w) => (
                  <div key={w} className="sk h-9 rounded-xl" style={{ width: `${w}%` }} />
                ))}
              </div>
            )}
            {loaded && chats.length === 0 && <p className="px-3 pt-2 text-sm text-muted">Your conversations will appear here.</p>}
            {groups.map(({ label, items }) => (
              <section key={label} className="mt-3 first:mt-1">
                <h3 className="px-3 pb-1 text-[10.5px] font-bold uppercase tracking-wider text-muted/70">{label}</h3>
                <ul className="space-y-0.5">
                  {items.map((c) => {
                    const active = onChat && activeId === c.id;
                    return (
                      <li
                        key={c.id}
                        className={`group flex items-center rounded-xl transition-colors ${active ? "bg-brand-soft" : "hover:bg-brand-soft/60"}`}
                      >
                        <button
                          onClick={() => openChat(c.id)}
                          aria-current={active ? "page" : undefined}
                          className={`flex min-w-0 flex-1 items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-[13.5px] ${
                            active ? "font-semibold text-fg" : "font-medium text-muted group-hover:text-fg"
                          }`}
                        >
                          <MessageCircle className={`h-4 w-4 shrink-0 ${active ? "text-brand" : "text-muted/70"}`} strokeWidth={1.8} aria-hidden />
                          <span className="truncate">{c.title}</span>
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
        )}
      </div>

      {/* Plan card and account */}
      <div className="space-y-3 p-3">
        <div className="bg-grad relative overflow-hidden rounded-2xl p-3.5 text-white shadow-[0_14px_28px_-14px_rgb(79_70_229/0.8)]">
          <div aria-hidden className="absolute -right-6 -top-8 h-24 w-24 rounded-full bg-white/15 blur-xl" />
          <div className="relative flex items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/20">
              <InfinityIcon className="h-5 w-5" strokeWidth={2.25} aria-hidden />
            </span>
            <div className="leading-tight">
              <p className="text-[15px] font-bold">Total Plan</p>
              <p className="text-xs text-white/85">All features unlocked</p>
            </div>
          </div>
        </div>

        <div className="relative flex items-center gap-3 rounded-2xl px-2 py-1.5">
          <span className="bg-grad grid h-10 w-10 shrink-0 place-items-center rounded-full text-xs font-bold text-white" aria-hidden>
            {initials}
          </span>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-sm font-bold">{user?.name || "Your account"}</p>
            <p className="truncate text-xs text-muted" title={user?.email}>
              {user?.email}
            </p>
          </div>
          <button
            onClick={() => setShowMenu(!showMenu)}
            aria-label="Account menu"
            aria-expanded={showMenu}
            className="grid h-9 w-9 place-items-center rounded-xl text-muted hover:bg-brand-soft hover:text-fg"
          >
            <MoreVertical className="h-4 w-4" strokeWidth={1.9} aria-hidden />
          </button>
          {showMenu && (
            <div className="card absolute bottom-full right-0 z-10 mb-2 w-44 p-1.5">
              <Link
                href="/settings"
                onClick={() => {
                  setShowMenu(false);
                  close();
                }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted hover:bg-brand-soft hover:text-fg"
              >
                <Sparkles className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
                Preferences
              </Link>
              <button
                onClick={() => {
                  setShowMenu(false);
                  signOut();
                }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted hover:bg-brand-soft hover:text-fg"
              >
                <LogOut className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
