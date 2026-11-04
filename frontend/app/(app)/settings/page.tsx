"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Database, Download, KeyRound, LogOut, Mail, Monitor, Moon, Palette, Sun, Trash2, UserRound, Volume2 } from "lucide-react";
import { FormError, FormNotice, PasswordField, StrengthMeter, TextField, passwordProblem } from "@/components/auth/Fields";
import { ApiError, api, json, publicApi, type OtpTiming } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useChats } from "@/lib/chats";
import { usePrefs, type Prefs } from "@/lib/prefs";
import { useReadAloud } from "@/lib/speech";

const reason = (err: unknown, fallback: string) => (err instanceof ApiError || err instanceof Error ? err.message : fallback);

const SECTIONS = [
  { id: "profile", label: "Profile", icon: UserRound },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "voice", label: "Chat and voice", icon: Volume2 },
  { id: "data", label: "Your data", icon: Database },
  { id: "security", label: "Security", icon: KeyRound },
  { id: "danger", label: "Delete account", icon: Trash2 },
];

function Section({ id, title, description, children, danger }: { id: string; title: string; description: string; children: ReactNode; danger?: boolean }) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className={`card scroll-mt-6 p-6 sm:p-7 ${danger ? "!border-danger/40" : ""}`}>
      <h2 id={`${id}-h`} className="text-lg font-semibold tracking-tight">
        {title}
      </h2>
      <p className="mt-1 text-sm text-muted">{description}</p>
      <div className="mt-6">{children}</div>
    </section>
  );
}

function Toggle({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div>
        <p className="text-sm font-medium">{label}</p>
        {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? "bg-brand-solid" : "bg-line"}`}
      >
        <span className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-5" : ""}`} />
      </button>
    </div>
  );
}

/* ---------------------------------------------------------------- profile */
function Profile() {
  const { user, refreshUser } = useAuth();
  const [name, setName] = useState(user?.name ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  async function save(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSaved(false);
    setBusy(true);
    try {
      await api("/auth/me", json({ name: name.trim() }, "PATCH"));
      await refreshUser();
      setSaved(true);
    } catch (err) {
      setError(reason(err, "Could not save your name."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save} className="max-w-md space-y-5">
      <FormError>{error}</FormError>
      <FormNotice>{saved ? "Saved." : ""}</FormNotice>
      <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} autoComplete="name" />
      <div>
        <p className="label">Email</p>
        <p className="flex flex-wrap items-center gap-2 text-sm">
          {user?.email}
        </p>
      </div>
      <button className="btn" disabled={busy || name.trim() === (user?.name ?? "")}>
        {busy ? "Saving" : "Save changes"}
      </button>
    </form>
  );
}

/* ------------------------------------------------------------- appearance */
function Appearance() {
  const [prefs, set] = usePrefs();
  const options: { value: Prefs["theme"]; label: string; icon: typeof Sun }[] = [
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
    { value: "system", label: "System", icon: Monitor },
  ];
  return (
    <div role="radiogroup" aria-label="Theme" className="grid max-w-lg grid-cols-3 gap-3">
      {options.map(({ value, label, icon: Icon }) => {
        const on = prefs.theme === value;
        return (
          <button
            key={value}
            role="radio"
            aria-checked={on}
            onClick={() => set({ theme: value })}
            className={`flex flex-col items-center gap-2 rounded-2xl border p-4 text-sm font-medium transition-colors ${on ? "border-brand bg-brand-soft text-fg" : "border-line text-muted hover:border-brand"}`}
          >
            <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
            {label}
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------ chat + voice */
const LANGS: [string, string][] = [
  ["", "Browser default"],
  ["en-US", "English (US)"],
  ["en-GB", "English (UK)"],
  ["es-ES", "Spanish"],
  ["fr-FR", "French"],
  ["de-DE", "German"],
  ["it-IT", "Italian"],
  ["pt-BR", "Portuguese (Brazil)"],
  ["hi-IN", "Hindi"],
  ["ja-JP", "Japanese"],
  ["zh-CN", "Chinese (Mandarin)"],
];

function VoiceSettings() {
  const [prefs, set] = usePrefs();
  const speech = useReadAloud(prefs.voiceLang, prefs.speechRate);
  return (
    <div className="max-w-xl divide-y divide-line">
      <div className="pb-4">
        <label htmlFor="voice-lang" className="label">
          Voice language
        </label>
        <select id="voice-lang" className="input" value={prefs.voiceLang} onChange={(e) => set({ voiceLang: e.target.value })}>
          {LANGS.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
        <p className="mt-1.5 text-xs text-muted">Used for speaking your questions and for reading answers aloud.</p>
      </div>
      <div className="py-4">
        <label htmlFor="voice-rate" className="label flex justify-between">
          <span>Reading speed</span>
          <span className="tabular-nums text-muted">{prefs.speechRate.toFixed(1)}x</span>
        </label>
        <input id="voice-rate" type="range" min={0.7} max={1.4} step={0.1} value={prefs.speechRate} onChange={(e) => set({ speechRate: Number(e.target.value) })} className="w-full accent-[var(--brand-solid)]" />
        {speech.supported && (
          <button type="button" className="btn btn-ghost mt-3 !py-1.5" onClick={() => (speech.speakingId === "test" ? speech.stop() : speech.speak("test", "This is how DocSage will read your answers."))}>
            <Volume2 className="h-4 w-4" strokeWidth={1.75} aria-hidden /> {speech.speakingId === "test" ? "Stop" : "Play a sample"}
          </button>
        )}
      </div>
      <Toggle checked={prefs.autoRead} onChange={(v) => set({ autoRead: v })} label="Read answers aloud automatically" hint="Starts as soon as an answer is finished." />
      <Toggle checked={prefs.enterToSend} onChange={(v) => set({ enterToSend: v })} label="Press Enter to send" hint="Turn off to send with the button. Shift+Enter always adds a new line." />
    </div>
  );
}

/* -------------------------------------------------------------------- data */
function YourData() {
  const { clearAll, chats } = useChats();
  const [busy, setBusy] = useState<"" | "export" | "clear">("");
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function exportData() {
    setError("");
    setBusy("export");
    try {
      const data = await api<unknown>("/stats/export");
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
      const a = Object.assign(document.createElement("a"), { href: url, download: "docsage-export.json" });
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(reason(err, "Could not export your data."));
    } finally {
      setBusy("");
    }
  }

  async function clear() {
    setError("");
    setNotice("");
    setBusy("clear");
    try {
      await clearAll();
      setNotice("Your chat history was cleared.");
      setConfirm(false);
    } catch (err) {
      setError(reason(err, "Could not clear your chats."));
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="max-w-xl space-y-5">
      <FormError>{error}</FormError>
      <FormNotice>{notice}</FormNotice>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium">Export your data</p>
          <p className="text-xs text-muted">Your account details, document list and every chat, as a JSON file.</p>
        </div>
        <button onClick={exportData} disabled={busy !== ""} className="btn btn-ghost">
          <Download className="h-4 w-4" strokeWidth={1.75} aria-hidden /> {busy === "export" ? "Preparing" : "Download"}
        </button>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-line pt-5">
        <div>
          <p className="text-sm font-medium">Clear chat history</p>
          <p className="text-xs text-muted">Deletes {chats.length} conversation{chats.length === 1 ? "" : "s"}. Your documents are kept.</p>
        </div>
        {confirm ? (
          <div className="flex gap-2">
            <button onClick={clear} disabled={busy !== ""} className="btn btn-danger">
              {busy === "clear" ? "Clearing" : "Yes, clear all"}
            </button>
            <button onClick={() => setConfirm(false)} className="btn btn-ghost">
              Cancel
            </button>
          </div>
        ) : (
          <button onClick={() => setConfirm(true)} disabled={chats.length === 0} className="btn btn-ghost">
            <Trash2 className="h-4 w-4" strokeWidth={1.75} aria-hidden /> Clear chats
          </button>
        )}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- security */
function ChangePassword() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const problem = passwordProblem(next, user?.email);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setTouched(true);
    if (problem) return;
    setBusy(true);
    try {
      await api("/auth/change-password", json({ current_password: current, new_password: next }));
      await logout(); // every session was ended on the server, so sign in again
      router.replace("/login");
    } catch (err) {
      setError(reason(err, "Could not change the password."));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="max-w-md space-y-5">
      <FormError>{error}</FormError>
      <PasswordField label="Current password" autoComplete="current-password" required value={current} onChange={(e) => setCurrent(e.target.value)} />
      <div>
        <PasswordField label="New password" autoComplete="new-password" required maxLength={128} value={next} onChange={(e) => setNext(e.target.value)} error={touched && problem ? problem : undefined} />
        <StrengthMeter password={next} />
      </div>
      <button className="btn" disabled={busy || !current || !next}>
        {busy ? "Saving" : "Change password"}
      </button>
      <p className="text-xs text-muted">Changing your password signs you out on every device.</p>
    </form>
  );
}

function SecurityActions() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [busy, setBusy] = useState<"" | "code" | "all">("");
  const [error, setError] = useState("");

  async function emailCode() {
    if (!user) return;
    setError("");
    setBusy("code");
    try {
      const t = await publicApi<OtpTiming>("/auth/forgot-password", { email: user.email });
      try {
        sessionStorage.setItem("docsage:reset", JSON.stringify({ email: user.email, expiresAt: Date.now() + t.expires_in * 1000, resendAt: Date.now() + t.resend_in * 1000 }));
      } catch {}
      router.push(`/reset-password?email=${encodeURIComponent(user.email)}`);
    } catch (err) {
      setError(reason(err, "Could not send the code."));
      setBusy("");
    }
  }

  async function signOutEverywhere() {
    setError("");
    setBusy("all");
    try {
      await api("/auth/logout-all", { method: "POST" });
      await logout();
      router.replace("/login");
    } catch (err) {
      setError(reason(err, "Could not sign out everywhere."));
      setBusy("");
    }
  }

  return (
    <div className="max-w-xl space-y-5">
      <FormError>{error}</FormError>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium">Forgot your current password?</p>
          <p className="text-xs text-muted">We will email a 6-digit code to {user?.email} so you can set a new one.</p>
        </div>
        <button onClick={emailCode} disabled={busy !== ""} className="btn btn-ghost">
          <Mail className="h-4 w-4" strokeWidth={1.75} aria-hidden /> {busy === "code" ? "Sending" : "Email me a code"}
        </button>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-line pt-5">
        <div>
          <p className="text-sm font-medium">Sign out on all devices</p>
          <p className="text-xs text-muted">Ends every session, including this one.</p>
        </div>
        <button onClick={signOutEverywhere} disabled={busy !== ""} className="btn btn-ghost">
          <LogOut className="h-4 w-4" strokeWidth={1.75} aria-hidden /> {busy === "all" ? "Signing out" : "Sign out everywhere"}
        </button>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------- danger */
function DeleteAccount() {
  const { logout } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await api("/auth/me", json({ password }, "DELETE"));
      await logout();
      router.replace("/");
    } catch (err) {
      setError(reason(err, "Could not delete the account."));
      setBusy(false);
    }
  }

  if (!open)
    return (
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="max-w-md text-sm leading-relaxed text-muted">Permanently removes your account, documents, search data and chats. This cannot be undone.</p>
        <button onClick={() => setOpen(true)} className="btn btn-ghost !border-danger/50 !text-danger">
          <Trash2 className="h-4 w-4" strokeWidth={1.75} aria-hidden /> Delete account
        </button>
      </div>
    );

  return (
    <form onSubmit={submit} className="max-w-md space-y-5">
      <p className="text-sm leading-relaxed text-muted">Enter your password to confirm. Everything you uploaded and every chat is deleted straight away.</p>
      <FormError>{error}</FormError>
      <PasswordField label="Password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
      <div className="flex gap-3">
        <button type="submit" disabled={busy || !password} className="btn btn-danger">
          {busy ? "Deleting" : "Delete everything"}
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setPassword("");
            setError("");
          }}
          className="btn btn-ghost"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

/* -------------------------------------------------------------------- page */
export default function SettingsPage() {
  const [active, setActive] = useState("profile");

  // Highlight the section being read.
  useEffect(() => {
    const seen = new Map<string, number>();
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => seen.set(e.target.id, e.intersectionRatio));
        const top = [...seen.entries()].sort((a, b) => b[1] - a[1])[0];
        if (top && top[1] > 0) setActive(top[0]);
      },
      { rootMargin: "-10% 0px -60% 0px", threshold: [0, 0.25, 0.5, 1] },
    );
    SECTIONS.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) io.observe(el);
    });
    return () => io.disconnect();
  }, []);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted">Manage your profile, how DocSage looks and sounds, your data, and your security.</p>
      </header>

      <div className="mt-8 grid gap-8 lg:grid-cols-[13rem_1fr]">
        <nav aria-label="Settings sections" className="lg:sticky lg:top-6 lg:self-start">
          <ul className="flex gap-1 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:pb-0">
            {SECTIONS.map(({ id, label, icon: Icon }) => (
              <li key={id} className="shrink-0">
                <a
                  href={`#${id}`}
                  aria-current={active === id ? "true" : undefined}
                  className={`flex items-center gap-2.5 whitespace-nowrap rounded-xl px-3 py-2 text-sm font-medium transition-colors ${active === id ? "bg-brand-soft text-fg" : "text-muted hover:bg-brand-soft/60 hover:text-fg"} ${id === "danger" ? "!text-danger" : ""}`}
                >
                  <Icon className="h-4 w-4" strokeWidth={1.75} aria-hidden /> {label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="min-w-0 space-y-6">
          <Section id="profile" title="Profile" description="How you appear in DocSage.">
            <Profile />
          </Section>
          <Section id="appearance" title="Appearance" description="Light is the default. Your choice is saved on this device.">
            <Appearance />
          </Section>
          <Section id="voice" title="Chat and voice" description="Speaking your questions and hearing answers read aloud use your browser's built-in voice features.">
            <VoiceSettings />
          </Section>
          <Section id="data" title="Your data" description="You own your documents and chats. Take a copy or clear them any time.">
            <YourData />
          </Section>
          <Section id="security" title="Security" description="Keep your account safe.">
            <div className="space-y-8">
              <ChangePassword />
              <div className="border-t border-line pt-8">
                <SecurityActions />
              </div>
            </div>
          </Section>
          <Section id="danger" title="Delete account" description="Remove your account and everything in it." danger>
            <DeleteAccount />
          </Section>
        </div>
      </div>
    </div>
  );
}
