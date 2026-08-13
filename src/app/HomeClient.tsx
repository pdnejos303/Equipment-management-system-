"use client";

import Link from "next/link";
import {
  Monitor, QrCode, BarChart3, Shield, Zap, Laptop, ArrowRight
} from "lucide-react";
import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

export function HomeClient() {
  const [navScrolled, setNavScrolled] = useState(false);
  const { t } = useI18n();

  useEffect(() => {
    const handleScroll = () => setNavScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const features = [
    { icon: Monitor, title: t("landing.f1Title"), desc: t("landing.f1Desc") },
    { icon: Laptop, title: t("landing.f2Title"), desc: t("landing.f2Desc") },
    { icon: QrCode, title: t("landing.f3Title"), desc: t("landing.f3Desc") },
    { icon: Zap, title: t("landing.f4Title"), desc: t("landing.f4Desc") },
    { icon: BarChart3, title: t("landing.f5Title"), desc: t("landing.f5Desc") },
    { icon: Shield, title: t("landing.f6Title"), desc: t("landing.f6Desc") },
  ];

  return (
    <div className="min-h-screen bg-background font-sans text-[var(--text-default)] selection:bg-brand-500/30">
      
      {/* ── Minimalist Navbar ── */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${navScrolled ? 'bg-background/80 backdrop-blur-md border-b border-[var(--border)]' : 'bg-transparent'}`}>
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-brand-500 flex items-center justify-center text-black font-bold">A</div>
            <span className="font-bold tracking-tight">{t("app.title")}</span>
          </div>
          <div className="flex items-center gap-4">
            <LanguageSwitcher />
            <Link href="/login" className="text-sm font-medium hover:text-brand-500 transition-colors">
              {t("login.tabLogin")}
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero Section ── */}
      <section className="pt-32 pb-20 px-6 max-w-4xl mx-auto text-center flex flex-col items-center animate-in fade-in slide-in-from-bottom-8 duration-700">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--surface-hover)] border border-[var(--border)] text-xs font-medium text-[var(--text-muted)] mb-8">
          <span className="w-2 h-2 rounded-full bg-brand-500"></span>
          {t("landing.heroTag")}
        </div>
        
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 leading-tight">
          {t("landing.heroTitle1")} <br/>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-500 to-brand-400">
            {t("landing.heroTitle2")}
          </span>
        </h1>
        
        <p className="text-lg md:text-xl text-[var(--text-muted)] max-w-2xl mb-10 leading-relaxed">
          {t("landing.heroDesc")}
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4">
          <Link href="/login" className="bg-[var(--text-default)] text-background hover:opacity-90 px-8 py-3.5 rounded-lg font-medium transition-all flex items-center gap-2 shadow-lg">
            {t("landing.loginBtn")} <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      {/* ── Features Section ── */}
      <section className="py-20 px-6 max-w-6xl mx-auto border-t border-[var(--border)]">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold tracking-tight mb-4">{t("landing.featuresTitle")}</h2>
          <p className="text-[var(--text-muted)]">{t("landing.featuresDesc")}</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, idx) => (
            <div key={idx} className="bg-[var(--surface)] border border-[var(--border)] p-6 rounded-2xl hover:border-brand-500/50 hover:shadow-xl transition-all duration-300 group">
              <div className="w-12 h-12 rounded-xl bg-[var(--surface-hover)] flex items-center justify-center mb-5 group-hover:bg-brand-500/10 transition-colors">
                <feature.icon className="text-[var(--text-muted)] group-hover:text-brand-500 transition-colors" size={24} />
              </div>
              <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
              <p className="text-[var(--text-subtle)] leading-relaxed text-sm">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="py-8 text-center border-t border-[var(--border)]">
        <p className="text-sm text-[var(--text-subtle)]">
          © {new Date().getFullYear()} {t("app.title")}. {t("landing.footer")}
        </p>
      </footer>

    </div>
  );
}
