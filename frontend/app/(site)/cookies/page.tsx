import type { Metadata } from "next";
import Link from "next/link";
import { LegalLayout, type LegalSection } from "@/components/site/LegalLayout";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Cookie Policy",
  description: "DocSage uses a single essential cookie to keep you signed in, and no tracking or advertising cookies.",
};

const sections: LegalSection[] = [
  {
    id: "summary",
    title: "In short",
    body: (
      <p>
        {site.name} sets one cookie, and only after you sign in or create an account. It is strictly necessary to keep you signed in. We do not use
        analytics, advertising or tracking cookies, so there is no cookie banner to accept.
      </p>
    ),
  },
  {
    id: "cookie",
    title: "The cookie we use",
    body: (
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Purpose</th>
            <th>Lifetime</th>
            <th>Details</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <code>docsage_rt</code>
            </td>
            <td>Holds your sign-in session so you stay signed in between visits</td>
            <td>Up to 7 days, or until you sign out</td>
            <td>HttpOnly, SameSite=Lax, Secure in production, limited to the session path</td>
          </tr>
        </tbody>
      </table>
    ),
  },
  {
    id: "how",
    title: "How it protects you",
    body: (
      <ul>
        <li>HttpOnly means scripts on the page cannot read it, which limits the damage of a script injection attack.</li>
        <li>SameSite=Lax stops other sites from sending it along with requests they trigger.</li>
        <li>The cookie is only sent to the sign-in endpoints, not with every request.</li>
        <li>Every renewal replaces it with a new value and retires the old one.</li>
      </ul>
    ),
  },
  {
    id: "storage",
    title: "Other browser storage",
    body: (
      <p>
        Your short-lived access token is kept in the page&apos;s memory only and disappears when you close the tab. Your light or dark appearance
        follows your device setting. We do not store anything else about you in your browser.
      </p>
    ),
  },
  {
    id: "third",
    title: "Third parties",
    body: (
      <p>
        We do not embed third-party trackers, advertising or social media widgets. Fonts are served from this site. Hosting and service providers
        that process data for us are described in the <Link href="/privacy">Privacy Policy</Link>.
      </p>
    ),
  },
  {
    id: "control",
    title: "Your choices",
    body: (
      <p>
        You can delete the cookie at any time in your browser settings, or by signing out, which removes it. Blocking it means you will have to
        sign in again each time the page is reloaded. Questions: <a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a>.
      </p>
    ),
  },
];

export default function CookiesPage() {
  return (
    <LegalLayout
      current="/cookies"
      title="Cookie Policy"
      intro="One essential cookie, no tracking. Here is exactly what it does."
      sections={sections}
    />
  );
}
