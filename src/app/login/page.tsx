"use client";

import { signIn } from "next-auth/react";
import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { showError, showSuccess } from "@/lib/swal";
import {
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  ChevronRight,
  Loader2,
  Boxes,
} from "lucide-react";

function BrandMark() {
  const { t } = useI18n();
  return (
    <div className="flex flex-col items-center gap-3 text-center mb-8">
      <div className="w-12 h-12 rounded-xl bg-brand-500 text-black flex items-center justify-center shadow-lg">
        <Boxes size={24} strokeWidth={2.5} />
      </div>
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white drop-shadow-md">
          {t("app.title")}
        </h1>
        <p className="text-sm text-gray-300 mt-1 drop-shadow-sm">
          {t("landing.heroTag")}
        </p>
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

  return (
    <div className="w-full min-h-[480px] flex flex-col">
      {/* Tabs */}
      <div className="flex p-1 mb-6 bg-[var(--surface-hover)] rounded-lg">
        <button
          onClick={() => switchMode("login")}
          className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${
            mode === "login" ? "bg-[var(--surface)] text-[var(--text-default)] shadow-sm" : "text-[var(--text-muted)] hover:text-[var(--text-default)]"
          }`}
        >
          {t("login.tabLogin")}
        </button>
        <button
          onClick={() => switchMode("register")}
          className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${
            mode === "register" ? "bg-[var(--surface)] text-[var(--text-default)] shadow-sm" : "text-[var(--text-muted)] hover:text-[var(--text-default)]"
          }`}
        >
          {t("login.tabRegister")}
        </button>
      </div>

      {/* Google Login */}
      <button
        onClick={() => signIn("google", { callbackUrl })}
        className="w-full flex items-center justify-center gap-3 bg-[var(--surface)] border border-[var(--border)] hover:bg-[var(--surface-hover)] text-[var(--text-default)] py-2.5 rounded-lg text-sm font-medium transition-colors mb-6 shadow-sm"
      >
        <svg width="18" height="18" viewBox="0 0 18 18">
          <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" />
          <path fill="#34A853" d="M9.003 18c2.43 0 4.467-.806 5.956-2.18l-2.909-2.26c-.806.54-1.837.86-3.047.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9.003 18z" />
          <path fill="#FBBC05" d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71s.102-1.17.282-1.71V4.958H.957A8.997 8.997 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" />
          <path fill="#EA4335" d="M9.003 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.464.891 11.428 0 9.002 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29c.708-2.127 2.692-3.71 5.036-3.71z" />
        </svg>
        {mode === "login" ? t("login.googleBtn") : t("login.googleRegBtn")}
      </button>

      <div className="flex items-center gap-3 mb-6">
        <div className="flex-1 h-px bg-[var(--border)]"></div>
        <span className="text-[11px] uppercase tracking-widest font-semibold text-[var(--text-subtle)]">{t("login.or")}</span>
        <div className="flex-1 h-px bg-[var(--border)]"></div>
      </div>

      {mode === "login" ? (
        <form onSubmit={handleLogin} className="space-y-4 animate-in fade-in">
          <div>
            <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5 ml-1">{t("login.email")}</label>
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@company.com"
                className="w-full bg-[var(--surface)] border border-[var(--border)] text-[var(--text-default)] rounded-lg pl-10 pr-4 py-2.5 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none transition-all"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5 ml-1">{t("login.password")}</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[var(--surface)] border border-[var(--border)] text-[var(--text-default)] rounded-lg pl-10 pr-10 py-2.5 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-default)] transition-colors"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[var(--text-default)] hover:opacity-90 text-background py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 mt-2"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : t("login.submit")}
          </button>
          
          <div className="text-center">
            <span className="text-[11px] text-[var(--text-subtle)] font-mono">{t("login.demo")}</span>
          </div>
        </form>
      ) : (
        <form onSubmit={handleRegister} className="space-y-4 animate-in fade-in">
          <div>
            <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5 ml-1">{t("login.name")}</label>
            <div className="relative">
              <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                className="w-full bg-[var(--surface)] border border-[var(--border)] text-[var(--text-default)] rounded-lg pl-10 pr-4 py-2.5 text-sm focus:border-brand-500 outline-none transition-all"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5 ml-1">{t("login.email")}</label>
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="w-full bg-[var(--surface)] border border-[var(--border)] text-[var(--text-default)] rounded-lg pl-10 pr-4 py-2.5 text-sm focus:border-brand-500 outline-none transition-all"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5 ml-1">{t("login.password")}</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                type={showPassword ? "text" : "password"}
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[var(--surface)] border border-[var(--border)] text-[var(--text-default)] rounded-lg pl-10 pr-10 py-2.5 text-sm focus:border-brand-500 outline-none transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-default)]"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5 ml-1">{t("login.confirmPassword")}</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                type={showPassword ? "text" : "password"}
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[var(--surface)] border border-[var(--border)] text-[var(--text-default)] rounded-lg pl-10 pr-4 py-2.5 text-sm focus:border-brand-500 outline-none transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[var(--text-default)] hover:opacity-90 text-background py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 mt-2"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : t("login.registerBtn")}
          </button>
        </form>
      )}
    </div>
  );
}

export default function LoginPage() {
  const { t } = useI18n();
  return (
    <div className="min-h-screen flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Background Image */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat transition-transform duration-[20s] ease-out scale-105"
        style={{ backgroundImage: "url('/loginBG.jpg')" }}
      />
      {/* Semi-transparent dark overlay with blur */}
      <div className="absolute inset-0 z-0 bg-black/50 backdrop-blur-sm" />

      {/* Language Switcher */}
      <div className="absolute top-4 right-4 z-10 opacity-90 hover:opacity-100 transition-opacity">
        <LanguageSwitcher />
      </div>

      {/* Main Content */}
      <div className="w-full max-w-[400px] sm:max-w-[460px] animate-in fade-in slide-in-from-bottom-8 duration-700 z-10 mt-8">
        <BrandMark />
        
        <div className="bg-[var(--surface)] border border-[var(--border)] p-6 sm:p-8 rounded-2xl shadow-2xl relative overflow-hidden">
          <Suspense fallback={<div className="h-[300px] flex items-center justify-center"><Loader2 className="animate-spin text-brand-500" /></div>}>
            <AuthForms />
          </Suspense>
        </div>

        <p className="text-center text-[11px] text-white/60 mt-8 drop-shadow-md">
          Secured by NextAuth · © {new Date().getFullYear()} {t("app.title")}
        </p>
      </div>
    </div>
  );
}
