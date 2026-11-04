import Link from "next/link";
import { Brand } from "@/components/Brand";
import { footerGroups, site } from "@/lib/site";

export function Footer() {
  return (
    <footer className="footer-deep text-white">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_repeat(4,1fr)]">
        <div>
          <span className="inline-flex rounded-2xl bg-white/95 px-3 py-1.5 text-[#0c1330]"><Brand size={26} /></span>
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/70">{site.description}</p>
        </div>
        {footerGroups.map((group) => (
          <nav key={group.title} aria-label={group.title}>
            <h2 className="text-sm font-bold text-white">{group.title}</h2>
            <ul className="mt-4 space-y-2.5">
              {group.links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-white/70 transition-colors hover:text-white">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-white/15">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-xs text-white/70 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>
            &copy; {new Date().getFullYear()} {site.name}. All rights reserved.
          </p>
          <p>Your documents stay yours. You can delete everything at any time.</p>
        </div>
      </div>
    </footer>
  );
}
