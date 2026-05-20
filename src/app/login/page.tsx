// Path: src/app/login/page.tsx
"use client";

import { signIn } from "next-auth/react";
import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { showError, showSuccess } from "@/lib/swal";
import { Mail, Lock, User, Eye, EyeOff, Monitor, Bell, QrCode, ChevronRight, Loader2, Package, BarChart3 } from "lucide-react";

/* ── Skeleton redirect screen ── */
function RedirectSkeleton() {
  return (
    <div className="w-full animate-fade-in space-y-6">
      <div className="text-center space-y-3">
        <div className="w-12 h-12 rounded-xl bg-brand-500/20 mx-auto animate-pulse" />
        <div className="h-4 w-32 bg-[var(--surface-hover)] rounded mx-auto animate-pulse" />
      </div>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-16 rounded-xl bg-[var(--surface-hover)]/60 border border-[var(--border)] animate-pulse"
              style={{ animationDelay: `${i * 100}ms` }}
            />
          ))}
        </div>
        <div className="h-32 rounded-xl bg-[var(--surface-hover)]/40 border border-[var(--border)] animate-pulse" style={{ animationDelay: "400ms" }} />
      </div>
    </div>
  );
}

function AuthForms() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/overview";
  const router = useRouter();
  const { t } = useI18n();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl,
    });
    if (result?.error) {
      showError(t("login.error"));
      setLoading(false);
    } else if (result?.url) {
      setRedirecting(true);
      router.push(callbackUrl);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      showError(t("login.passwordMin"));
      return;
    }
    if (password !== confirmPassword) {
      showError(t("login.passwordMismatch"));
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      if (!res.ok) {
        const data = await res.json();
        showError(data.error || t("forms.error"));
        setLoading(false);
        return;
      }
      await showSuccess(t("login.registerSuccess"), t("login.registerSuccessMsg"));
      setMode("login");
      setName("");
      setConfirmPassword("");
      setLoading(false);
    } catch {
      showError(t("forms.error"));
      setLoading(false);
    }
  };

  const switchMode = (newMode: "login" | "register") => {
    setMode(newMode);
    setName("");
    setConfirmPassword("");
    setShowPassword(false);
  };

  if (redirecting) return <RedirectSkeleton />;

  return (
    <div className="w-full">
      {/* Tab Switcher */}
      <div role="tablist" aria-label="Authentication mode" className="relative flex mb-5 rounded-xl p-1 border border-[var(--border)]" style={{ background: "var(--surface-hover)" }}>
        <div
          className="tab-indicator absolute top-1 bottom-1 bg-brand-500 rounded-lg"
          aria-hidden="true"
          style={{
            width: "calc(50% - 4px)",
            transform: mode === "login" ? "translateX(0)" : "translateX(calc(100% + 4px))",
            boxShadow: "0 0 12px rgb(var(--brand-rgb) / 0.2)",
          }}
        />
        <button
          role="tab"
          id="login-tab"
          aria-selected={mode === "login"}
          aria-controls="login-panel"
          onClick={() => switchMode("login")}
          className={`relative z-10 flex-1 py-2 text-sm font-semibold rounded-lg transition-colors duration-300 ${
            mode === "login" ? "text-black" : "text-[var(--text-subtle)] hover:text-[var(--text-default)]"
          }`}
        >
          {t("login.tabLogin")}
        </button>
        <button
          role="tab"
          id="register-tab"
          aria-selected={mode === "register"}
          aria-controls="register-panel"
          onClick={() => switchMode("register")}
          className={`relative z-10 flex-1 py-2 text-sm font-semibold rounded-lg transition-colors duration-300 ${
            mode === "register" ? "text-black" : "text-[var(--text-subtle)] hover:text-[var(--text-default)]"
          }`}
        >
          {t("login.tabRegister")}
        </button>
      </div>

      {/* Google Sign In */}
      <button
        onClick={() => signIn("google", { callbackUrl })}
        className="w-full flex items-center justify-center gap-3 font-semibold py-2.5 px-4 rounded-xl active:scale-[0.99] transition-all duration-200 text-sm"
        style={{ background: "var(--surface-hover)", border: "1px solid var(--border)", color: "var(--text-default)", boxShadow: "var(--shadow-sm)" }}
      >
        <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" focusable="false">
          <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" />
          <path fill="#34A853" d="M9.003 18c2.43 0 4.467-.806 5.956-2.18l-2.909-2.26c-.806.54-1.837.86-3.047.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9.003 18z" />
          <path fill="#FBBC05" d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71s.102-1.17.282-1.71V4.958H.957A8.997 8.997 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" />
          <path fill="#EA4335" d="M9.003 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.464.891 11.428 0 9.002 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29c.708-2.127 2.692-3.71 5.036-3.71z" />
        </svg>
        {mode === "login" ? t("login.googleBtn") : t("login.googleRegBtn")}
      </button>

      {/* Divider */}
      <div className="flex items-center gap-4 my-4">
        <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, transparent, var(--border), transparent)" }} />
        <span className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--text-subtle)" }}>{t("login.or")}</span>
        <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, transparent, var(--border), transparent)" }} />
      </div>

      {/* Login Form */}
      {mode === "login" && (
        <form id="login-panel" role="tabpanel" aria-labelledby="login-tab" onSubmit={handleLogin} className="space-y-3 animate-fade-in">
          <div className="space-y-3">
            <div>
              <label htmlFor="login-email" className="block text-xs font-semibold mb-1.5 ml-1" style={{ color: "var(--text-muted)" }}>{t("login.email")}</label>
              <div className="input-icon-wrapper">
                <Mail size={16} className="input-icon" aria-hidden="true" />
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@company.com"
                  required
                  className="input !py-3 !rounded-xl !pl-10"
                  autoComplete="email"
                />
              </div>
            </div>
            <div>
              <label htmlFor="login-password" className="block text-xs font-semibold mb-1.5 ml-1" style={{ color: "var(--text-muted)" }}>{t("login.password")}</label>
              <div className="input-icon-wrapper relative">
                <Lock size={16} className="input-icon" aria-hidden="true" />
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="input !py-3 !rounded-xl !pl-10 !pr-10"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-colors duration-150"
                  style={{ color: "var(--text-subtle)" }}
                  onMouseEnter={(e) => { (e.target as HTMLElement).style.color = "var(--text-default)"; }}
                  onMouseLeave={(e) => { (e.target as HTMLElement).style.color = "var(--text-subtle)"; }}
                >
                  {showPassword ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
                </button>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full !py-2.5 !rounded-xl !text-sm disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader2 size={16} className="animate-spin" />
                {t("login.submitting")}
              </span>
            ) : (
              <>
                {t("login.submit")}
                <ChevronRight size={16} />
              </>
            )}
          </button>

          <p className="text-[11px] text-center mt-2 rounded-lg py-2 border border-[var(--border)] font-mono tracking-wide" style={{ color: "var(--text-subtle)", background: "var(--surface-hover)" }}>
            {t("login.demo")}
          </p>

          <p className="text-center text-sm mt-3" style={{ color: "var(--text-muted)" }}>
            {t("login.noAccount")}{" "}
            <button
              type="button"
              onClick={() => switchMode("register")}
              className="text-brand-500 font-semibold hover:text-brand-400 transition"
            >
              {t("login.switchRegister")}
            </button>
          </p>
        </form>
      )}

      {/* Register Form */}
      {mode === "register" && (
        <form id="register-panel" role="tabpanel" aria-labelledby="register-tab" onSubmit={handleRegister} className="space-y-3 animate-fade-in">
          <div className="space-y-3">
            <div>
              <label htmlFor="register-name" className="block text-xs font-semibold mb-1.5 ml-1" style={{ color: "var(--text-muted)" }}>{t("login.name")}</label>
              <div className="input-icon-wrapper">
                <User size={16} className="input-icon" aria-hidden="true" />
                <input
                  id="register-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                  required
                  className="input !py-3 !rounded-xl !pl-10"
                  autoComplete="name"
                />
              </div>
            </div>
            <div>
              <label htmlFor="register-email" className="block text-xs font-semibold mb-1.5 ml-1" style={{ color: "var(--text-muted)" }}>{t("login.email")}</label>
              <div className="input-icon-wrapper">
                <Mail size={16} className="input-icon" aria-hidden="true" />
                <input
                  id="register-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  required
                  className="input !py-3 !rounded-xl !pl-10"
                  autoComplete="email"
                />
              </div>
            </div>
            <div>
              <label htmlFor="register-password" className="block text-xs font-semibold mb-1.5 ml-1" style={{ color: "var(--text-muted)" }}>{t("login.password")}</label>
              <div className="input-icon-wrapper relative">
                <Lock size={16} className="input-icon" aria-hidden="true" />
                <input
                  id="register-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="input !py-3 !rounded-xl !pl-10 !pr-10"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-colors duration-150"
                  style={{ color: "var(--text-subtle)" }}
                  onMouseEnter={(e) => { (e.target as HTMLElement).style.color = "var(--text-default)"; }}
                  onMouseLeave={(e) => { (e.target as HTMLElement).style.color = "var(--text-subtle)"; }}
                >
                  {showPassword ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
                </button>
              </div>
            </div>
            <div>
              <label htmlFor="register-confirm-password" className="block text-xs font-semibold mb-1.5 ml-1" style={{ color: "var(--text-muted)" }}>{t("login.confirmPassword")}</label>
              <div className="input-icon-wrapper">
                <Lock size={16} className="input-icon" aria-hidden="true" />
                <input
                  id="register-confirm-password"
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="input !py-3 !rounded-xl !pl-10"
                  autoComplete="new-password"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full !py-2.5 !rounded-xl !text-sm disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader2 size={16} className="animate-spin" />
                {t("login.registering")}
              </span>
            ) : (
              <>
                {t("login.registerBtn")}
                <ChevronRight size={16} />
              </>
            )}
          </button>

          <p className="text-center text-sm mt-3" style={{ color: "var(--text-muted)" }}>
            {t("login.hasAccount")}{" "}
            <button
              type="button"
              onClick={() => switchMode("login")}
              className="text-brand-500 font-semibold hover:text-brand-400 transition"
            >
              {t("login.switchLogin")}
            </button>
          </p>
        </form>
      )}
    </div>
  );
}

function FeaturePanel() {
  const { t } = useI18n();

  const features = [
    { icon: Monitor, text: t("login.feature1") },
    { icon: Bell, text: t("login.feature2") },
    { icon: QrCode, text: t("login.feature3") },
  ];

  return (
    <div className="hidden lg:flex flex-col justify-center p-10 xl:p-12 relative overflow-hidden">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div
          className="absolute inset-0"
          style={{
            opacity: 0.025,
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)
            `,
            backgroundSize: "64px 64px",
          }}
        />
        {/* Gradient glow */}
        <div
          className="absolute"
          style={{
            top: "10%",
            right: "-10%",
            width: "50%",
            height: "60%",
            background: "radial-gradient(ellipse at center, rgba(245,158,11,0.05) 0%, transparent 70%)",
            filter: "blur(40px)",
          }}
        />
      </div>

      <div className="max-w-md relative z-10">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8">
          <div
            className="w-12 h-12 rounded-xl bg-brand-500 flex items-center justify-center text-black font-extrabold text-xl"
            style={{ boxShadow: "0 0 20px rgb(var(--brand-rgb) / 0.25)" }}
            aria-hidden="true"
          >
            E
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--text-default)" }}>EquipTrack</h1>
            <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>{t("app.subtitle")}</p>
          </div>
        </div>

        {/* Welcome text */}
        <div className="mb-6">
          <h2 className="text-3xl xl:text-4xl font-bold leading-tight" style={{ color: "var(--text-default)" }}>
            {t("login.welcome")}
            <span className="block text-brand-500 mt-1" style={{ textShadow: "0 0 40px rgb(var(--brand-rgb) / 0.2)" }}>EquipTrack</span>
          </h2>
          <p className="mt-3 text-base leading-relaxed" style={{ color: "var(--text-muted)" }}>
            {t("login.welcomeSub")}
          </p>
        </div>

        {/* Feature list */}
        <div className="space-y-2">
          {features.map((f, i) => (
            <div
              key={i}
              className="flex items-center gap-3 p-2.5 rounded-xl transition-colors duration-200 hover:bg-[var(--surface-hover)]"
            >
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: "rgb(var(--brand-rgb) / 0.08)", border: "1px solid rgb(var(--brand-rgb) / 0.1)" }}
              >
                <f.icon size={18} className="text-brand-500" />
              </div>
              <span className="text-sm font-medium" style={{ color: "var(--text-muted)" }}>{f.text}</span>
            </div>
          ))}
        </div>

        {/* Trust indicators */}
        <div className="mt-8 flex items-center gap-6">
          <div className="flex -space-x-2">
            {["P", "S", "A", "K"].map((letter, i) => (
              <div
                key={i}
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2"
                style={{
                  background: `hsl(${i * 60 + 30}, 60%, 45%)`,
                  borderColor: "var(--background)",
                  color: "white",
                }}
              >
                {letter}
              </div>
            ))}
          </div>
          <p className="text-xs" style={{ color: "var(--text-subtle)" }}>
            ระบบภายในบริษัท · Internal Use Only
          </p>
        </div>
      </div>
    </div>
  );
}

function LoginSubtitle() {
  const { t } = useI18n();
  return <>{t("app.subtitle")}</>;
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex bg-background">
      {/* Left panel — features (desktop only) */}
      <div className="hidden lg:flex lg:w-[55%] xl:w-[55%] border-r border-[var(--border)]/50">
        <Suspense fallback={null}>
          <FeaturePanel />
        </Suspense>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-5 sm:p-6">
        <div className="w-full max-w-[420px] animate-fade-in-up">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-5">
            <div
              className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-brand-500 text-black font-extrabold text-xl mb-2"
              style={{ boxShadow: "0 0 20px rgb(var(--brand-rgb) / 0.25)" }}
              aria-hidden="true"
            >
              E
            </div>
            <h1 className="text-xl font-bold" style={{ color: "var(--text-default)" }}>EquipTrack</h1>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
              <Suspense fallback="...">
                <LoginSubtitle />
              </Suspense>
            </p>
          </div>

          {/* Form card */}
          <div className="card !rounded-2xl p-5 sm:p-6 relative overflow-hidden">
            {/* Top accent line */}
            <div className="absolute top-0 left-6 right-6 h-px" style={{ background: "linear-gradient(90deg, transparent, rgb(var(--brand-rgb) / 0.25), transparent)" }} />

            {/* Language switcher */}
            <div className="flex justify-end mb-3 -mt-1 -mr-1">
              <LanguageSwitcher />
            </div>

            <Suspense fallback={<div className="text-center py-12" style={{ color: "var(--text-subtle)" }}>...</div>}>
              <AuthForms />
            </Suspense>
          </div>

          {/* Footer */}
          <p className="text-center text-[11px] mt-4" style={{ color: "var(--text-subtle)" }}>
            EquipTrack v2.0 — Equipment Management System
          </p>
        </div>
      </div>
    </div>
  );
}
