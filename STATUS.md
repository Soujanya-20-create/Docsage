# DocSage: work done and what is left

Last updated: 3 November 2026. Nothing has been committed to git yet.

## Verified (tested or built and looked at)

**Backend (FastAPI): 61 tests pass**
- Rotating JWT sessions: 15-minute access token in memory, refresh token in an HttpOnly cookie held by the Next.js server, replay detection.
- Password rules, per-account and per-IP rate limits, security headers, upload limits, account deletion.
- Database fixes: SQLite "database is locked", BM25 on tiny corpora, documents stuck "processing" after a restart.
- Alembic migrations (baseline regenerated, a test checks it matches the models).
- Docker image, `render.yaml`, `railway.json`, CI workflow, Dependabot, `SECURITY.md`.

**Frontend (Next.js): browser-tested earlier**
- Home, Features, How it works, Security, Contact, Terms, Privacy, Cookies, 404, robots and sitemap.
- Sign in, register, session survives reload, sign out, production CSP with no console errors.

## Written this session, typechecks clean, not yet seen in a browser

**Backend, covered by tests**
- Six-digit one-time codes for email confirmation and password reset: stored as keyed hashes, expire in 10 minutes, burn after 5 wrong guesses, 60-second resend cooldown, no account probing.
- `GET /api/auth/otp-status` so the countdown survives a reload.
- `GET /api/stats` (dashboard numbers), `GET /api/stats/export`, `PATCH /api/auth/me`, `POST /api/auth/logout-all`, `DELETE /api/chats`.

**Frontend**
- Light theme is the default. Dark is opt-in (Settings), and "System" follows the device.
- Code entry screens with six boxes, paste support and live expiry and resend timers: forgot password, reset password, verify email. Register now goes to the code screen, sign in goes to the dashboard.
- App shell: one sidebar (logo, New chat, search, recent chats grouped by date, then Dashboard, Documents, Settings and account at the bottom) with a mobile drawer.
- Chat screen: ChatGPT-style layout, attach menu (upload from device or pick from your library), drag and drop anywhere, voice dictation, read-aloud, stop, copy and share per answer, and suggested prompts.
- Libraries.dev effects installed: `thinking-orbs` (thinking indicator and empty state), `voice-glow` (mic-reactive glow on the composer), `metal-fx` (Send button), `border-beam` (installed, not placed yet).
- Chart components: area chart with hover tooltip, donut, ranked bars, count-up numbers, sparkline.

## Left to do

1. **Dashboard page** (`/dashboard`): hero with a start-chat box, stat cards, activity chart, library donut, most-cited documents, quota meters, recent documents and chats, and a first-run checklist. Place `border-beam` here.
2. **Settings page** (`/settings`): rebuild with sections for Profile, Appearance (light, dark, system), Chat and voice (language, speed, auto-read, Enter to send), Data (export, clear chats), Security (change password, send a reset code, sign out everywhere) and Delete account.
3. **Documents page**: restyle to match the new shell, add search, filter and bulk actions.
4. **Home page**: add product screenshots (dashboard, chat, documents) built from the real components with sample data, and polish spacing across all pages.
5. **Check in a browser**: the new chat screen, composer effects, OTP screens and dashboard in light, dark and mobile; fix whatever the first run shows. Run `npm run build`.
6. **Docs**: update `README.md`, the env examples and `render.yaml` for the OTP settings (`OTP_MINUTES`, `OTP_RESEND_SECONDS`, `OTP_MAX_ATTEMPTS`).
7. **Frontend tests**: there are none yet.
8. **Commit** when you want it.

## Things to know

- **No email provider is configured.** Codes are only printed in the backend log until you set `RESEND_API_KEY` or `SMTP_*`. Without email, a real user cannot receive a code.
- **LLM keys are still empty**, so chat answers cannot be tested end to end yet.
- **`voice-glow`'s `processing` prop is not in the installed package** (its types call it a "Pro" feature), so the glow only reacts to the microphone while dictating.
- **`metal-fx` needs WebGL2**; it falls back to a plain button without it.
- **Legal pages are not legal advice.** A lawyer should review them, and the operator details must be set in the Vercel env vars.
- Docker image and Postgres have not been run here.

## Suggested next features

- Citations that open the PDF at the cited page with the passage highlighted.
- Compare two documents; summaries and a key-facts panel per document.
- Chat folders or projects (a chat scoped to a set of documents) and pinned chats.
- Answer feedback (thumbs) to tune retrieval, and an "I could not find this" report.
- Saved prompt templates; export a chat to PDF or Markdown.
- Document sharing with a read-only link, and team workspaces.
- Import from Google Drive or by email; folder watching.
- Two-factor authentication (authenticator app) and a list of active sessions.
- Usage and quota page, plus an admin view of processing failures.
