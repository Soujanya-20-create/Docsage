import type { ReactNode } from "react";

/** Heading block and body for the right-hand side of the auth screens. */
export function AuthCard({ title, subtitle, children, footer }: { title: string; subtitle?: ReactNode; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="w-full max-w-md">
      <h1 className="text-3xl font-extrabold tracking-tight">{title}</h1>
      {subtitle && <p className="mt-2 text-[0.95rem] leading-relaxed text-muted">{subtitle}</p>}
      <div className="mt-8">{children}</div>
      {footer && <div className="mt-8 text-center text-sm text-muted">{footer}</div>}
    </div>
  );
}
