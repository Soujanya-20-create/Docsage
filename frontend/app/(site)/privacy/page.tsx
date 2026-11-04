import type { Metadata } from "next";
import Link from "next/link";
import { LegalLayout, type LegalSection } from "@/components/site/LegalLayout";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "What DocSage collects, why, who processes it, how long it is kept, and how to delete it.",
};

const sections: LegalSection[] = [
  {
    id: "who",
    title: "Who we are",
    body: (
      <p>
        {site.name} is operated by {site.legalName}, which is the controller of the personal data described here. You can reach us at{" "}
        <a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a>.
      </p>
    ),
  },
  {
    id: "collect",
    title: "What we collect",
    body: (
      <>
        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th>Why</th>
              <th>Basis</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Name and email address</td>
              <td>Create and identify your account, send account emails</td>
              <td>Contract</td>
            </tr>
            <tr>
              <td>Password (stored only as a bcrypt hash)</td>
              <td>Sign you in</td>
              <td>Contract</td>
            </tr>
            <tr>
              <td>Documents you upload, and the text and search data extracted from them</td>
              <td>Provide search and answers over your documents</td>
              <td>Contract</td>
            </tr>
            <tr>
              <td>Your questions, answers and citations</td>
              <td>Show chat history and keep follow-up questions in context</td>
              <td>Contract</td>
            </tr>
            <tr>
              <td>Session records and the time you accepted the terms</td>
              <td>Keep you signed in securely, and show what you agreed to</td>
              <td>Contract, legitimate interests</td>
            </tr>
            <tr>
              <td>IP address and request metadata</td>
              <td>Rate limiting, abuse prevention and security</td>
              <td>Legitimate interests</td>
            </tr>
          </tbody>
        </table>
        <p>
          Documents may themselves contain personal data about you or other people. You are responsible for having the right to upload them (see the{" "}
          <Link href="/terms">Terms of Service</Link>). We do not use your documents to advertise to you and we do not sell personal data.
        </p>
      </>
    ),
  },
  {
    id: "documents",
    title: "How documents are handled",
    body: (
      <>
        <ul>
          <li>The uploaded file is read to extract text, using OCR for scanned pages. The original file is then deleted.</li>
          <li>The text is split into passages and turned into numeric vectors. Passages and vectors are stored under your account only.</li>
          <li>When you ask a question, the best-matching passages and your question are sent to a language model provider to write the answer.</li>
          <li>If the OCR engine is unavailable, an image may be sent to a vision-capable model provider to read its text.</li>
        </ul>
      </>
    ),
  },
  {
    id: "processors",
    title: "Who processes your data",
    body: (
      <>
        <p>We use service providers who process data on our behalf. Which ones are active depends on how the operator has configured the service:</p>
        <ul>
          <li>
            <strong>Language model providers</strong> (Groq, Cerebras, OpenRouter, tried in that order) receive your question and the relevant
            excerpts, and in the OCR fallback case an image. Each has its own data policy, so avoid uploading material that must not leave your control.
          </li>
          <li>
            <strong>Frontend and API hosting providers</strong> serve the site and store the database and search index.
          </li>
          <li>
            <strong>Email delivery</strong> (Resend or SMTP) receives your email address and the content of account emails, such as confirmation and
            password reset messages.
          </li>
          <li>
            <strong>Error monitoring</strong> (Sentry), if enabled, receives technical error details. It is configured not to send personal data or
            document content.
          </li>
        </ul>
        <p>
          Some of these providers are outside your country, including outside the European Economic Area and the United Kingdom. Where that
          applies, transfers rely on appropriate safeguards such as standard contractual clauses.
        </p>
      </>
    ),
  },
  {
    id: "retention",
    title: "How long we keep data",
    body: (
      <ul>
        <li>Original uploaded files: deleted once processing finishes.</li>
        <li>Extracted passages, vectors and chats: until you delete them or your account.</li>
        <li>Account details: until you delete your account.</li>
        <li>Sign-in sessions: up to 7 days, and replaced each time they are used. They end sooner when you sign out or change your password.</li>
        <li>Short-lived rate limit counters: for the length of the limit window only.</li>
        <li>Backups made by hosting providers may persist for a limited period after deletion before they are overwritten.</li>
      </ul>
    ),
  },
  {
    id: "rights",
    title: "Your rights",
    body: (
      <>
        <p>
          Depending on where you live, you may have the right to access your data, correct it, delete it, restrict or object to some processing,
          receive it in a portable format, and withdraw consent. You can delete your account and all associated data yourself from Settings. For
          anything else, write to <a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a> and we will respond within one month.
        </p>
        <p>You also have the right to complain to your local data protection authority.</p>
      </>
    ),
  },
  {
    id: "security",
    title: "Security",
    body: (
      <p>
        We protect data with measures including hashed passwords, short-lived access tokens, an HttpOnly session cookie, rotating refresh
        tokens, rate limiting, encrypted connections, strict security headers and per-user data separation. No system is perfectly secure. The{" "}
        <Link href="/security">Security page</Link> describes the measures in more detail and how to report a vulnerability.
      </p>
    ),
  },
  {
    id: "children",
    title: "Children",
    body: <p>{site.name} is not intended for anyone under 16, and we do not knowingly collect their data. If you believe a child has an account, contact us and we will delete it.</p>,
  },
  {
    id: "cookies",
    title: "Cookies",
    body: (
      <p>
        We use one essential cookie to keep you signed in and nothing for advertising or tracking. Details are in the{" "}
        <Link href="/cookies">Cookie Policy</Link>.
      </p>
    ),
  },
  {
    id: "changes",
    title: "Changes to this policy",
    body: (
      <p>
        We will update this policy when our practices change and show the new date at the top. For material changes we will take reasonable steps to
        tell you.
      </p>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <LegalLayout
      current="/privacy"
      title="Privacy Policy"
      intro="What DocSage collects, why, who else handles it, how long it is kept, and how to delete it."
      sections={sections}
    />
  );
}
