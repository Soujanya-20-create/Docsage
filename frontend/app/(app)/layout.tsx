"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { FileText, LogOut, MessageSquare } from "lucide-react";
import { useAuth } from "@/lib/auth";

const nav = [
  { href: "/documents", label: "Documents", icon: FileText },
  { href: "/chat", label: "Chat", icon: MessageSquare },
];

export default function AppLayout({ children }: { children: ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  if (loading || !user) {
    return <div className="flex h-screen items-center justify-center text-muted">Loading…</div>;
  }

  return (
    <div className="flex h-screen flex-col md:flex-row">
      <aside className="flex items-center justify-between gap-2 border-b border-line bg-card px-3 py-2 md:w-56 md:flex-col md:items-stretch md:justify-start md:border-b-0 md:border-r md:p-4">
        <Link href="/" className="flex items-center gap-2 font-bold md:mb-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/docsage-mark.png" alt="" className="h-6 w-6" /> DocSage
        </Link>
        <nav className="flex gap-1 md:flex-col">
          {nav.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              aria-current={pathname.startsWith(href) ? "page" : undefined}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${
                pathname.startsWith(href) ? "bg-brand text-brand-fg" : "text-muted hover:bg-line"
              }`}
            >
              <Icon className="h-4 w-4" /> {label}
            </Link>
          ))}
        </nav>
        <div className="md:mt-auto">
          <p className="mb-2 hidden truncate text-xs text-muted md:block">{user.email}</p>
          <button onClick={logout} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted hover:bg-line">
            <LogOut className="h-4 w-4" /> <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </aside>
      <main className="min-h-0 flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
