import { Hero } from "@/components/home/Hero";
import { StickySteps } from "@/components/home/StickySteps";
import { FeatureBento } from "@/components/home/FeatureBento";
import { UseCases } from "@/components/home/UseCases";
import { SecurityBand } from "@/components/home/SecurityBand";
import { Faq } from "@/components/home/Faq";
import { CtaBand } from "@/components/site/CtaBand";
import { SectionHeading } from "@/components/site/SectionHeading";

export default function Home() {
  return (
    <>
      <Hero />

      <section className="py-24 sm:py-32">
        <SectionHeading title="From a pile of files to a cited answer">
          Four steps, and the last one is checking the answer against the page it came from.
        </SectionHeading>
        <StickySteps />
      </section>

      <section className="py-16 sm:py-24">
        <SectionHeading title="Search that finds what you meant">
          Built for the documents people actually have: long, dense and sometimes scanned.
        </SectionHeading>
        <FeatureBento />
      </section>

      <section className="py-16 sm:py-24">
        <SectionHeading title="Made for work with long documents">
          Whatever you need to read, the question is the same: where does it say that?
        </SectionHeading>
        <UseCases />
      </section>

      <section className="py-16 sm:py-24">
        <SecurityBand />
      </section>

      <section className="py-16 sm:py-24">
        <SectionHeading title="Questions people ask first" center />
        <Faq />
      </section>

      <CtaBand />
    </>
  );
}
