# Security policy

## Reporting a vulnerability

Please report security issues privately by email to the address published on the site's Contact page, not in a public issue. Include steps to reproduce and the affected URL or endpoint. You will get an acknowledgement, and we will keep you updated until the issue is resolved. Please give us a reasonable time to fix it before sharing details publicly.

## What is in place

- Short-lived access tokens held in memory, with a rotating HttpOnly refresh cookie and reuse detection.
- Hashed passwords, a password policy, per-account and per-IP rate limits, single-use reset links.
- Strict security headers and a Content Security Policy, restricted CORS, API docs disabled in production.
- Upload limits and content checks, uploaded originals deleted after processing, full account deletion.

See the Security page on the site for the user-facing description.
