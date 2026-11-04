import type { ReactNode } from "react";
import { Reveal } from "./Reveal";

/** A section's headline and one supporting sentence, stacked. */
export function SectionHeading({ title, children, center = false }: { title: ReactNode; children?: ReactNode; center?: boolean }) {
  return (
    <Reveal className={`mx-auto mb-12 max-w-6xl px-4 sm:mb-16 sm:px-6 ${center ? "text-center" : ""}`}>
      <h2 className={`text-3xl font-semibold leading-tight tracking-tight sm:text-4xl lg:text-5xl ${center ? "mx-auto max-w-3xl" : "max-w-3xl"}`}>{title}</h2>
      {children && <p className={`mt-4 text-lg leading-relaxed text-muted ${center ? "mx-auto max-w-2xl" : "max-w-2xl"}`}>{children}</p>}
    </Reveal>
  );
}
