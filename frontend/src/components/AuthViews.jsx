import React, { useState } from "react";
import { Eye, EyeOff, Check, ArrowRight, LockKeyhole, Mail, ShieldCheck, User, Phone, Plane, Ticket, AlertCircle, Loader2, KeyRound } from "lucide-react";
import { apiRequest } from "@/lib/api";
import { Logo } from "./Logo";

const PW_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,128}$/;

function passwordChecks(pw) {
  return {
    length: pw.length >= 8 && pw.length <= 128,
    upper: /[A-Z]/.test(pw),
    lower: /[a-z]/.test(pw),
    digit: /\d/.test(pw),
    special: /[^A-Za-z0-9]/.test(pw),
  };
}

function passwordScore(pw) {
  return Object.values(passwordChecks(pw)).filter(Boolean).length;
}

export function PasswordField({ value, onChange, testid, autoComplete = "new-password", label = "Password", showMeter = true }) {
  const [visible, setVisible] = useState(false);
  const checks = passwordChecks(value);
  const score = passwordScore(value);
  const label_ = score < 3 ? "Weak" : score < 5 ? "Good" : "Strong";

  return (
    <label data-testid={`${testid}-field`} className="flex flex-col gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
      {label}
      <div className="relative">
        <input
          data-testid={`${testid}-input`}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required
          maxLength={128}
          className="spatial-input w-full px-3.5 py-2.5 rounded-xl text-sm pr-10 bg-white/80 dark:bg-slate-800/80 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white"
        />
        <button
          type="button"
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-white/40 hover:text-slate-900 dark:hover:text-white transition-colors"
          data-testid={`${testid}-toggle`}
          onClick={() => setVisible(!visible)}
          aria-label={visible ? "Hide password" : "Show password"}
        >
          {visible ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>

      {showMeter && value.length > 0 && (
        <div className="password-strength mt-2 space-y-1.5" data-testid={`${testid}-strength`}>
          <div className="flex gap-1 h-1.5 w-full bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className={`flex-1 transition-all rounded-full ${
                  i <= score
                    ? score < 3
                      ? "bg-rose-500"
                      : score < 5
                      ? "bg-amber-400"
                      : "bg-emerald-400"
                    : "bg-transparent"
                }`}
              />
            ))}
          </div>
          <div className="flex justify-between text-[11px]">
            <span className="text-slate-500 dark:text-white/50">Security Grade</span>
            <span
              className={`font-bold ${
                score < 3 ? "text-rose-500 dark:text-rose-400" : score < 5 ? "text-amber-400" : "text-emerald-600 dark:text-emerald-400"
              }`}
            >
              {label_}
            </span>
          </div>
          <ul className="grid grid-cols-2 gap-1 text-[10px] text-slate-500 dark:text-white/60 pt-1">
            <li className={`flex items-center gap-1 ${checks.length ? "text-emerald-600 dark:text-emerald-300 font-semibold" : ""}`}>
              <Check size={10} /> 6–12 chars
            </li>
            <li className={`flex items-center gap-1 ${checks.upper ? "text-emerald-600 dark:text-emerald-300 font-semibold" : ""}`}>
              <Check size={10} /> Uppercase
            </li>
            <li className={`flex items-center gap-1 ${checks.lower ? "text-emerald-600 dark:text-emerald-300 font-semibold" : ""}`}>
              <Check size={10} /> Lowercase
            </li>
            <li className={`flex items-center gap-1 ${checks.digit ? "text-emerald-600 dark:text-emerald-300 font-semibold" : ""}`}>
              <Check size={10} /> Number
            </li>
            <li className={`flex items-center gap-1 ${checks.special ? "text-emerald-600 dark:text-emerald-300 font-semibold" : ""}`}>
              <Check size={10} /> Special symbol
            </li>
          </ul>
        </div>
      )}
    </label>
  );
}

export function PasswordFieldSimple({ value, onChange, testid, autoComplete = "current-password", label = "Password" }) {
  const [visible, setVisible] = useState(false);
  return (
    <label data-testid={`${testid}-field`} className="flex flex-col gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
      {label}
      <div className="relative">
        <input
          data-testid={`${testid}-input`}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required
          className="spatial-input w-full px-3.5 py-2.5 rounded-xl text-sm pr-10 bg-white/80 dark:bg-slate-800/80 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white"
        />
        <button
          type="button"
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-white/40 hover:text-slate-900 dark:hover:text-white transition-colors"
          data-testid={`${testid}-toggle`}
          onClick={() => setVisible(!visible)}
          aria-label={visible ? "Hide password" : "Show password"}
        >
          {visible ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </label>
  );
}

const AUTH_IMAGE = "https://images.unsplash.com/photo-1502784444187-359ac186c5bb?auto=format&fit=crop&w=1400&q=80";

const inputClass =
  "auth-input h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-[15px] text-slate-900 placeholder:text-slate-400 outline-none transition " +
  "focus:border-sky-500 focus:bg-white focus:ring-4 focus:ring-sky-500/15 " +
  "dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-white/30 dark:focus:border-sky-400 dark:focus:bg-white/10";

function Field({ icon: Icon, label, hint, testid, children, ...inputProps }) {
  return (
    <div className="flex flex-col gap-1.5" data-testid={`${testid}-field`}>
      <label htmlFor={testid} className="text-[13px] font-semibold text-slate-700 dark:text-slate-200">
        {label}
        {hint && <span className="ml-1 font-normal text-slate-400 dark:text-white/40">{hint}</span>}
      </label>
      <div className="relative">
        <Icon size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-white/40" />
        <input id={testid} data-testid={`${testid}-input`} className={inputClass} {...inputProps} />
        {children}
      </div>
    </div>
  );
}

function SecretField({ label, testid, value, onChange, autoComplete, children }) {
  const [visible, setVisible] = useState(false);
  return (
    <Field
      icon={LockKeyhole}
      label={label}
      testid={testid}
      type={visible ? "text" : "password"}
      autoComplete={autoComplete}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      required
      style={{ paddingRight: 48 }}
    >
      <button
        type="button"
        className="absolute right-2 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:text-white/40 dark:hover:bg-white/10 dark:hover:text-white"
        data-testid={`${testid}-toggle`}
        onClick={() => setVisible(!visible)}
        aria-label={visible ? "Hide password" : "Show password"}
      >
        {visible ? <EyeOff size={17} /> : <Eye size={17} />}
      </button>
      {children}
    </Field>
  );
}

function StrengthMeter({ value }) {
  if (!value) return null;
  const checks = passwordChecks(value);
  const score = passwordScore(value);
  const tone = score < 3 ? "bg-rose-500" : score < 5 ? "bg-amber-400" : "bg-emerald-500";
  const items = [["length", "8+ characters"], ["upper", "Uppercase"], ["lower", "Lowercase"], ["digit", "Number"], ["special", "Symbol"]];
  return (
    <div className="-mt-1 space-y-2" data-testid="sign-up-password-strength">
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <span key={i} className={`h-1 flex-1 rounded-full transition-colors ${i <= score ? tone : "bg-slate-200 dark:bg-white/10"}`} />
        ))}
      </div>
      <ul className="flex flex-wrap gap-x-3 gap-y-1 text-[12px]">
        {items.map(([key, text]) => (
          <li key={key} className={`flex items-center gap-1 ${checks[key] ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400 dark:text-white/40"}`}>
            <Check size={12} strokeWidth={3} /> {text}
          </li>
        ))}
      </ul>
    </div>
  );
}

function AuthShell({ mode, navigate, title, subtitle, children, testid }) {
  const isSignIn = mode === "signin";
  return (
    <main className="px-4 pt-24 pb-12 sm:pt-28 sm:pb-16" data-testid={testid}>
      <div className="mx-auto grid w-full max-w-5xl overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_30px_80px_-30px_rgba(15,23,42,0.35)] dark:border-white/10 dark:bg-slate-900 lg:grid-cols-[1.05fr_1fr]">
        {/* Visual panel */}
        <aside className="relative hidden min-h-[640px] flex-col justify-between overflow-hidden p-10 text-white lg:flex">
          <img src={AUTH_IMAGE} alt="" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-br from-slate-950/85 via-slate-900/60 to-sky-900/40" />
          <div className="relative flex items-center gap-3">
            <Logo size={40} />
            <span className="text-sm font-bold tracking-[0.2em]">ALL SKY FARES</span>
          </div>
          <div className="relative">
            <div className="text-4xl font-extrabold leading-tight text-white">
              {isSignIn ? "Welcome back." : "Your next trip"}
              <br />
              <span className="font-serif italic font-normal text-sky-200">{isSignIn ? "Pick up where you left off." : "starts with one account."}</span>
            </div>
            <ul className="mt-8 space-y-4 text-[15px] text-white/85">
              <li className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15"><Plane size={16} /></span>Live airline fares with no surprise markups</li>
              <li className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15"><Ticket size={16} /></span>Every booking and itinerary in one place</li>
              <li className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15"><Phone size={16} /></span>24/7 travel desk: +1 (877) 818-4167</li>
            </ul>
          </div>
          <div className="relative flex items-center gap-2 text-xs text-white/60">
            <ShieldCheck size={14} /> Secured with encrypted sessions. We never store card numbers.
          </div>
        </aside>

        {/* Form panel */}
        <section className="flex flex-col justify-center p-6 sm:p-10 lg:p-12">
          <div className="mb-6 flex items-center gap-3 lg:hidden">
            <Logo size={36} />
            <span className="text-xs font-bold tracking-[0.2em] text-slate-700 dark:text-white/80">ALL SKY FARES</span>
          </div>

          <div className="mb-8 grid grid-cols-2 rounded-xl bg-slate-100 p-1 text-sm font-semibold dark:bg-white/5" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={isSignIn}
              data-testid="go-to-sign-in-button"
              onClick={() => !isSignIn && navigate("login")}
              className={`rounded-lg py-2.5 transition ${isSignIn ? "bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white" : "text-slate-500 hover:text-slate-800 dark:text-white/50 dark:hover:text-white"}`}
            >
              Sign in
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={!isSignIn}
              data-testid="go-to-sign-up-button"
              onClick={() => isSignIn && navigate("signup")}
              className={`rounded-lg py-2.5 transition ${!isSignIn ? "bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white" : "text-slate-500 hover:text-slate-800 dark:text-white/50 dark:hover:text-white"}`}
            >
              Create account
            </button>
          </div>

          <h1 className="text-[28px] font-extrabold leading-tight tracking-tight text-slate-900 dark:text-white">{title}</h1>
          <p className="mt-1.5 mb-7 text-[15px] text-slate-500 dark:text-white/60">{subtitle}</p>
          {children}
        </section>
      </div>
    </main>
  );
}

function AuthError({ message, testid }) {
  if (!message) return null;
  return (
    <div role="alert" data-testid={testid} className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
      <AlertCircle size={18} className="mt-px shrink-0" />
      <span>{message}</span>
    </div>
  );
}

function SubmitButton({ busy, label, busyLabel, testid }) {
  return (
    <button
      type="submit"
      data-testid={testid}
      disabled={busy}
      className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 text-[15px] font-bold text-white shadow-lg shadow-orange-500/25 transition hover:from-orange-600 hover:to-orange-700 focus:outline-none focus:ring-4 focus:ring-orange-500/30 disabled:cursor-not-allowed disabled:opacity-70"
    >
      {busy ? <Loader2 size={18} className="animate-spin" /> : null}
      <span>{busy ? busyLabel : label}</span>
      {!busy && <ArrowRight size={18} />}
    </button>
  );
}

export function SignInView({ onSuccess, navigate }) {
  const [form, setForm] = useState({ email: "", password: "", code: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  // "password", or "code": a 6-digit code emailed to the account (works for accounts made at checkout).
  const [method, setMethod] = useState("password");
  const [codeSent, setCodeSent] = useState(false);

  const run = async (fn) => {
    setError("");
    setBusy(true);
    try {
      await fn();
    } catch (err) {
      setError(err.message || "Sign in failed");
    } finally {
      setBusy(false);
    }
  };

  const submit = (e) => {
    e.preventDefault();
    run(async () => {
      if (method === "password") {
        const data = await apiRequest("/auth/login", { method: "POST", body: { email: form.email.trim(), password: form.password } });
        onSuccess(data.user);
      } else if (!codeSent) {
        await apiRequest("/auth/login-code/request", { method: "POST", body: { email: form.email.trim() } });
        setCodeSent(true);
      } else {
        const data = await apiRequest("/auth/login-code/verify", { method: "POST", body: { email: form.email.trim(), code: form.code.trim() } });
        onSuccess(data.user);
      }
    });
  };

  const switchMethod = (next) => {
    setMethod(next);
    setCodeSent(false);
    setError("");
    setForm({ ...form, password: "", code: "" });
  };

  return (
    <AuthShell mode="signin" navigate={navigate} testid="sign-in-page" title="Sign in to your account" subtitle="Manage trips, view itineraries and get help from our travel desk.">
      <form className="space-y-5" data-testid="sign-in-form" onSubmit={submit} noValidate={false}>
        <Field
          icon={Mail}
          label="Email address"
          testid="sign-in-email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          required
        />
        {method === "password" ? (
          <div className="space-y-2">
            <SecretField label="Password" testid="sign-in-password" autoComplete="current-password" value={form.password} onChange={(v) => setForm({ ...form, password: v })} />
            <div className="flex justify-end">
              <button type="button" data-testid="forgot-password-button" onClick={() => navigate("forgot")} className="text-[13px] font-semibold text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300">
                Forgot password?
              </button>
            </div>
          </div>
        ) : codeSent ? (
          <div className="space-y-2">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-400/30 dark:bg-emerald-500/10 dark:text-emerald-200" data-testid="sign-in-code-sent">
              If an account exists for {form.email.trim()}, we've emailed a 6-digit code. It expires in 10 minutes.
            </div>
            <Field
              icon={KeyRound}
              label="Sign-in code"
              testid="sign-in-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="\d{6}"
              maxLength={6}
              placeholder="123456"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value.replace(/\D/g, "") })}
              required
            />
            <div className="flex justify-end">
              <button type="button" onClick={() => { setCodeSent(false); setForm({ ...form, code: "" }); }} className="text-[13px] font-semibold text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300">
                Send a new code
              </button>
            </div>
          </div>
        ) : (
          <p className="-mt-1 text-[13px] text-slate-500 dark:text-white/50">We'll email you a one-time code. No password needed, including for accounts created when you booked.</p>
        )}
        <AuthError message={error} testid="sign-in-error" />
        <SubmitButton
          busy={busy}
          label={method === "password" ? "Sign in" : codeSent ? "Verify and sign in" : "Email me a code"}
          busyLabel={method === "code" && !codeSent ? "Sending…" : "Signing in…"}
          testid="sign-in-submit-button"
        />
        <div className="flex items-center gap-3 text-xs text-slate-400 dark:text-white/30">
          <span className="h-px flex-1 bg-slate-200 dark:bg-white/10" /> or <span className="h-px flex-1 bg-slate-200 dark:bg-white/10" />
        </div>
        <button
          type="button"
          data-testid="sign-in-method-toggle"
          onClick={() => switchMethod(method === "password" ? "code" : "password")}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 text-[14px] font-semibold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:text-white/80 dark:hover:bg-white/5"
        >
          {method === "password" ? <><Mail size={17} /> Email me a sign-in code instead</> : <><LockKeyhole size={17} /> Use my password instead</>}
        </button>
        <p className="text-center text-sm text-slate-500 dark:text-white/50">
          New to All Sky Fares?{" "}
          <button type="button" onClick={() => navigate("signup")} className="font-semibold text-sky-600 hover:underline dark:text-sky-400">Create an account</button>
        </p>
      </form>
    </AuthShell>
  );
}

export function SignUpView({ onSuccess, navigate }) {
  const [form, setForm] = useState({ first_name: "", last_name: "", email: "", phone: "", password: "", confirm: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const update = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const mismatch = form.confirm.length > 0 && form.confirm !== form.password;

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!PW_REGEX.test(form.password)) {
      setError("Password must be at least 8 characters with uppercase, lowercase, number, and special character.");
      return;
    }
    if (form.password !== form.confirm) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      const data = await apiRequest("/auth/register", {
        method: "POST",
        body: {
          first_name: form.first_name.trim(),
          last_name: form.last_name.trim(),
          email: form.email.trim(),
          password: form.password,
          phone: form.phone.trim() || null,
        },
      });
      onSuccess(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell mode="signup" navigate={navigate} testid="sign-up-page" title="Create your account" subtitle="It takes a minute. You'll be signed in straight away.">
      <form className="space-y-5" data-testid="sign-up-form" onSubmit={submit}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field icon={User} label="First name" testid="sign-up-first-name" autoComplete="given-name" value={form.first_name} onChange={update("first_name")} required maxLength={80} />
          <Field icon={User} label="Last name" testid="sign-up-last-name" autoComplete="family-name" value={form.last_name} onChange={update("last_name")} required maxLength={80} />
        </div>
        <Field icon={Mail} label="Email address" testid="sign-up-email" type="email" autoComplete="email" placeholder="you@example.com" value={form.email} onChange={update("email")} required />
        <Field icon={Phone} label="Phone number" hint="(optional)" testid="sign-up-phone" type="tel" autoComplete="tel" placeholder="+1 555 019 2830" value={form.phone} onChange={update("phone")} maxLength={40} />
        <SecretField label="Password" testid="sign-up-password" autoComplete="new-password" value={form.password} onChange={(v) => setForm({ ...form, password: v })} />
        <StrengthMeter value={form.password} />
        <div className="space-y-1.5">
          <SecretField label="Confirm password" testid="sign-up-confirm" autoComplete="new-password" value={form.confirm} onChange={(v) => setForm({ ...form, confirm: v })} />
          {mismatch && <p className="text-[12px] text-rose-600 dark:text-rose-400">Passwords don't match yet.</p>}
        </div>
        <AuthError message={error} testid="sign-up-error" />
        <SubmitButton busy={busy} label="Create account" busyLabel="Creating account…" testid="sign-up-submit-button" />
        <p className="text-center text-[12px] leading-relaxed text-slate-400 dark:text-white/40">
          By creating an account you agree to our{" "}
          <button type="button" onClick={() => navigate("terms")} className="underline hover:text-slate-600 dark:hover:text-white/70">Terms</button> and{" "}
          <button type="button" onClick={() => navigate("privacy")} className="underline hover:text-slate-600 dark:hover:text-white/70">Privacy Policy</button>.
        </p>
      </form>
    </AuthShell>
  );
}

export function ForgotPasswordView({ navigate }) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await apiRequest("/auth/forgot-password", { method: "POST", body: { email: email.trim() } });
      setSent(true);
    } catch (e) {
      setSent(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="signin-page min-h-[80vh] flex items-center justify-center px-4 pt-24 sm:pt-28 pb-12" data-testid="forgot-password-page">
      <div className="w-full max-w-md liquid-glass-card p-8 sm:p-10 rounded-3xl border border-slate-200 dark:border-white/15 shadow-2xl relative bg-white/95 dark:bg-slate-900/90">
        <div className="text-center mb-6">
          <div className="inline-flex justify-center mb-4">
            <Logo size={42} />
          </div>
          <span className="eyebrow text-xs font-semibold tracking-wider text-cyan-600 dark:text-cyan-400 uppercase block mb-1">
            ACCOUNT RECOVERY
          </span>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Reset your password</h1>
        </div>

        {sent ? (
          <div className="signin-form text-center space-y-4" data-testid="forgot-password-sent">
            <div className="w-14 h-14 rounded-full bg-cyan-100 dark:bg-cyan-500/20 text-cyan-600 dark:text-cyan-300 flex items-center justify-center mx-auto border border-cyan-300 dark:border-cyan-400/30">
              <Mail size={26} />
            </div>
            <b className="text-slate-900 dark:text-white text-base block">Check your inbox</b>
            <p className="text-slate-600 dark:text-slate-300 text-xs">If an account exists for that address, we have dispatched secure reset instructions.</p>
            <button
              className="primary-button spatial-btn-primary w-full py-3 rounded-xl font-bold text-sm"
              data-testid="forgot-to-reset-button"
              onClick={() => navigate("reset")}
            >
              I have a reset code <ArrowRight size={14} className="inline ml-1" />
            </button>
            <button
              type="button"
              className="auth-switch text-xs text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
              data-testid="forgot-back-button"
              onClick={() => navigate("login")}
            >
              Back to sign in
            </button>
          </div>
        ) : (
          <form className="signin-form space-y-4" data-testid="forgot-password-form" onSubmit={submit}>
            <label className="flex flex-col gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200" data-testid="forgot-email-field">
              Registered email
              <input
                data-testid="forgot-email-input"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="spatial-input w-full px-3.5 py-2.5 rounded-xl text-sm bg-white/80 dark:bg-slate-800/80 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white"
              />
            </label>
            <button
              className="primary-button spatial-btn-primary w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2"
              data-testid="forgot-submit-button"
              disabled={busy}
            >
              <span>{busy ? "Sending Instructions…" : "Send Reset Link"}</span>
              <ArrowRight size={16} />
            </button>
            <button
              type="button"
              className="auth-switch text-xs text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white w-full text-center block pt-2"
              data-testid="forgot-back-to-signin-button"
              onClick={() => navigate("login")}
            >
              Back to sign in
            </button>
          </form>
        )}
      </div>
    </main>
  );
}

export function ResetPasswordView({ navigate }) {
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token") || "";
  // Link from the booking email of an account made at guest checkout.
  const welcome = params.get("welcome") === "1";
  const [form, setForm] = useState({ email: "", otp: "", password: "", confirm: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const update = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!PW_REGEX.test(form.password)) {
      setError("Password must be at least 8 characters with uppercase, lowercase, number, and special character.");
      return;
    }
    if (form.password !== form.confirm) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      const body = token
        ? { token, new_password: form.password }
        : { email: form.email.trim(), otp: form.otp.trim(), new_password: form.password };
      await apiRequest("/auth/reset-password", { method: "POST", body });
      setDone(true);
    } catch (err) {
      setError(err.message || "Could not reset password");
    } finally {
      setBusy(false);
    }
  };

  const inputClass = "spatial-input w-full px-3.5 py-2.5 rounded-xl text-sm bg-white/80 dark:bg-slate-800/80 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white";
  const labelClass = "flex flex-col gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200";

  return (
    <main className="signin-page min-h-[80vh] flex items-center justify-center px-4 pt-24 sm:pt-28 pb-12" data-testid="reset-password-page">
      <div className="w-full max-w-md liquid-glass-card p-8 sm:p-10 rounded-3xl border border-slate-200 dark:border-white/15 shadow-2xl relative bg-white/95 dark:bg-slate-900/90">
        <div className="text-center mb-6">
          <div className="inline-flex justify-center mb-4">
            <Logo size={42} />
          </div>
          <span className="eyebrow text-xs font-semibold tracking-wider text-cyan-600 dark:text-cyan-400 uppercase block mb-1">
            {welcome ? "WELCOME TO ALL SKY FARES" : "ACCOUNT RECOVERY"}
          </span>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{welcome ? "Set your password" : "Choose a new password"}</h1>
          {welcome && <p className="mt-2 text-sm text-slate-500 dark:text-white/60">Your account was created with your booking. Choose a password, or skip this and sign in with an emailed code any time.</p>}
        </div>

        {done ? (
          <div className="signin-form text-center space-y-4" data-testid="reset-password-done">
            <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 flex items-center justify-center mx-auto border border-emerald-300 dark:border-emerald-400/30">
              <Check size={26} />
            </div>
            <p className="text-slate-600 dark:text-slate-300 text-sm">{welcome ? "Password saved. Sign in to see your booking." : "Password updated. Sign in with your new password."}</p>
            <button
              className="primary-button spatial-btn-primary w-full py-3 rounded-xl font-bold text-sm"
              onClick={() => navigate("login")}
            >
              Go to sign in
            </button>
          </div>
        ) : (
          <form className="signin-form space-y-4" data-testid="reset-password-form" onSubmit={submit}>
            {!token && (
              <>
                <label className={labelClass}>
                  Registered email
                  <input data-testid="reset-email-input" type="email" autoComplete="email" value={form.email} onChange={update("email")} required className={inputClass} />
                </label>
                <label className={labelClass}>
                  6-digit code from the email
                  <input data-testid="reset-otp-input" inputMode="numeric" pattern="\d{6}" maxLength={6} value={form.otp} onChange={update("otp")} required className={`${inputClass} font-mono tracking-[0.4em]`} />
                </label>
              </>
            )}
            <PasswordField value={form.password} onChange={(v) => setForm({ ...form, password: v })} testid="reset-password" label="New password" />
            <PasswordFieldSimple value={form.confirm} onChange={(v) => setForm({ ...form, confirm: v })} testid="reset-confirm" autoComplete="new-password" label="Confirm new password" />
            {error && (
              <div className="text-xs text-rose-600 dark:text-rose-300" data-testid="reset-password-error">{error}</div>
            )}
            <button
              className="primary-button spatial-btn-primary w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2"
              data-testid="reset-submit-button"
              disabled={busy}
            >
              <span>{busy ? "Saving…" : welcome ? "Save password" : "Update password"}</span>
              <ArrowRight size={16} />
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
