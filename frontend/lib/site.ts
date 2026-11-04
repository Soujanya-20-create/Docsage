/** Names, links and legal details used across the site. Set the NEXT_PUBLIC_* values in Vercel. */
export const site = {
  name: "DocSage",
  tagline: "Answers from your documents, with sources",
  description:
    "Upload PDFs or scans, ask questions in plain language, and get answers that cite the exact page they came from.",
  // Legal details. Replace the defaults with the real operator before launch.
  legalName: process.env.NEXT_PUBLIC_LEGAL_NAME ?? "the operator of DocSage",
  contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "contact@example.com",
  jurisdiction: process.env.NEXT_PUBLIC_JURISDICTION ?? "the jurisdiction in which the operator is established",
  legalUpdated: "3 November 2026",
};

export const nav = [
  { href: "/features", label: "Features" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/security", label: "Security" },
  { href: "/contact", label: "Contact" },
];

export const footerGroups = [
  {
    title: "Product",
    links: [
      { href: "/features", label: "Features" },
      { href: "/how-it-works", label: "How it works" },
      { href: "/security", label: "Security" },
    ],
  },
  {
    title: "Account",
    links: [
      { href: "/login", label: "Sign in" },
      { href: "/register", label: "Create account" },
      { href: "/forgot-password", label: "Reset password" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/terms", label: "Terms of Service" },
      { href: "/privacy", label: "Privacy Policy" },
      { href: "/cookies", label: "Cookie Policy" },
    ],
  },
  {
    title: "Company",
    links: [{ href: "/contact", label: "Contact" }],
  },
];
