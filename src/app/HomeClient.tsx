// Path: src/app/HomeClient.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Monitor, Bell, QrCode, BarChart3, Shield, Zap, ChevronRight, ArrowRight,
} from "lucide-react";

const features = [
  { icon: Monitor, title: "ติดตามแบบเรียลไทม์",  desc: "ดูสถานะอุปกรณ์ทั้งหมดในหน้าเดียว — ใช้งาน ว่าง ซ่อม หรือเสื่อมสภาพ", accent: "from-amber-500/20 to-orange-500/20" },
  { icon: Bell,    title: "แจ้งเตือนอัตโนมัติ",   desc: "แจ้งเตือนประกันหมดอายุและกำหนดซ่อมบำรุงทางอีเมลทุกวัน", accent: "from-blue-500/20 to-cyan-500/20" },
  { icon: QrCode,  title: "QR Code & Barcode",    desc: "สร้างและสแกน QR Code / Barcode สำหรับอุปกรณ์แต่ละชิ้นได้ทันที", accent: "from-emerald-500/20 to-teal-500/20" },
  { icon: BarChart3, title: "รายงานและวิเคราะห์", desc: "ดูรายงานค่าเสื่อมราคา Export CSV/PDF รองรับ TH · EN · JA", accent: "from-violet-500/20 to-purple-500/20" },
  { icon: Shield,  title: "จัดการสิทธิ์ผู้ใช้",  desc: "แบ่งสิทธิ์ Admin · User · Viewer ควบคุมการเข้าถึงได้แม่นยำ", accent: "from-rose-500/20 to-pink-500/20" },
  { icon: Zap,     title: "AI Assistant",         desc: "ถามตอบด้วย AI วิเคราะห์อุปกรณ์ และพยากรณ์การบำรุงรักษา", accent: "from-amber-500/20 to-yellow-500/20" },
];

export function HomeClient() {
  const [navScrolled, setNavScrolled] = useState(false);
  const [visibleCards, setVisibleCards] = useState<Set<number>>(new Set());
  const [reducedMotion, setReducedMotion] = useState(false);

  const heroContentRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    setReducedMotion(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  // Scroll — navbar blur + hero content parallax
  useEffect(() => {
    const handleScroll = () => {
      const y = window.scrollY;
      setNavScrolled(y > 24);
      if (!reducedMotion && heroContentRef.current) {
        heroContentRef.current.style.transform = `translateY(${y * 0.08}px)`;
        heroContentRef.current.style.opacity = `${Math.max(0, 1 - y * 0.0015)}`;
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [reducedMotion]);

  // Scroll-reveal for feature cards
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const idx = Number(entry.target.getAttribute("data-idx"));
            if (!isNaN(idx)) setVisibleCards((prev) => new Set([...prev, idx]));
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );

    cardRefs.current.forEach((el) => { if (el) observer.observe(el); });
    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">

      {/* ── Background layer ── */}
      <div className="fixed inset-0 pointer-events-none select-none" aria-hidden="true">
        {/* Subtle grid — fine crosshatch, not the typical dot grid */}
        <div
          className="absolute inset-0"
          style={{
            opacity: 0.035,
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)
            `,
            backgroundSize: "80px 80px",
          }}
        />

        {/* Primary radial glow — top center, asymmetric */}
        <div
          className="absolute"
          style={{
            top: "-20%",
            left: "20%",
            width: "60%",
            height: "70%",
            background: "radial-gradient(ellipse 70% 60% at 55% 30%, rgba(245,158,11,0.07) 0%, transparent 70%)",
            filter: "blur(40px)",
          }}
        />

        {/* Vignette */}
        <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 75% 55% at 50% 35%, transparent 20%, var(--background) 100%)" }} />
      </div>

      {/* ── Navbar ── */}
      <nav className="fixed top-0 left-0 right-0 z-50">
        <div
          className="absolute inset-0 transition-all duration-500"
          style={{
            background: navScrolled ? "color-mix(in srgb, var(--background) 85%, transparent)" : "transparent",
            backdropFilter: navScrolled ? "blur(16px) saturate(140%)" : "none",
            borderBottom: navScrolled ? "1px solid rgba(255,255,255,0.04)" : "1px solid transparent",
          }}
        />

        <div className="relative flex items-center justify-between px-6 sm:px-10 py-4 max-w-6xl mx-auto">
          <div className="flex items-center gap-3 animate-fade-in-down">
            <div
              className="w-9 h-9 rounded-xl bg-brand-500 flex items-center justify-center text-black font-bold text-lg"
              style={{ boxShadow: "0 0 16px rgb(var(--brand-rgb) / 0.25)" }}
            >
              A
            </div>
            <span className="font-bold text-lg tracking-tight" style={{ color: "var(--text-default)" }}>Asset Management</span>
          </div>

          <Link
            href="/login"
            className="relative btn-primary !py-2 !px-5 !rounded-xl text-sm flex items-center gap-1.5 animate-fade-in-down overflow-hidden group"
            style={{ animationDelay: "80ms" }}
          >
            <span
              className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700"
              style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent)" }}
            />
            เข้าสู่ระบบ
            <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform duration-200" />
          </Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative text-center px-6 pt-44 pb-20 max-w-4xl mx-auto">
        <div ref={heroContentRef} style={{ willChange: "transform, opacity" }}>

          {/* Internal badge */}
          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium mb-8 animate-fade-in"
            style={{
              animationDelay: "200ms",
              background: "rgb(var(--brand-rgb) / 0.06)",
              border: "1px solid rgb(var(--brand-rgb) / 0.12)",
              color: "rgb(var(--brand-rgb))",
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-brand-pulse flex-shrink-0" />
            ระบบภายในบริษัท · Internal Use Only
          </div>

          {/* Headline */}
          <h1
            className="text-4xl sm:text-6xl xl:text-7xl font-bold leading-[1.08] tracking-tight mb-6 animate-fade-in-up"
            style={{ animationDelay: "320ms", color: "var(--text-default)" }}
          >
            ระบบจัดการอุปกรณ์
            <br />
            <span className="relative inline-block">
              <span
                className="text-brand-500 relative z-10"
                style={{ textShadow: "0 0 60px rgba(245,158,11,0.3)" }}
              >
                Asset Management
              </span>
              {/* Underline accent */}
              <span
                className="absolute -bottom-1 left-0 right-0 h-[3px] rounded-full"
                style={{ background: "linear-gradient(90deg, rgb(var(--brand-rgb) / 0.5), rgb(var(--brand-rgb) / 0.1))" }}
              />
            </span>
          </h1>

          {/* Subheading */}
          <p
            className="text-lg sm:text-xl max-w-2xl mx-auto mb-10 leading-relaxed animate-fade-in-up"
            style={{ animationDelay: "460ms", color: "var(--text-muted)" }}
          >
            ติดตามสถานะ มอบหมาย แจ้งเตือนซ่อมบำรุง และสแกน QR Code
            <br className="hidden sm:block" />
            สำหรับพนักงานในบริษัทเท่านั้น
          </p>

          {/* CTAs */}
          <div
            className="flex items-center justify-center gap-3 flex-wrap animate-fade-in-up"
            style={{ animationDelay: "600ms" }}
          >
            <Link
              href="/login"
              className="relative btn-primary !py-3.5 !px-8 !rounded-xl !text-base flex items-center gap-2 overflow-hidden group"
            >
              <span
                className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700"
                style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent)" }}
              />
              เข้าสู่ระบบ
              <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform duration-200" />
            </Link>
          </div>

          <p
            className="text-xs mt-5 animate-fade-in font-mono tracking-wide"
            style={{ animationDelay: "750ms", color: "var(--text-subtle)" }}
          >
            admin@company.com / admin123
          </p>
        </div>
      </section>

      {/* ── Feature grid ── */}
      <section className="max-w-5xl mx-auto px-6 pb-28">
        <div className="text-center mb-12">
          <p className="text-xs font-semibold uppercase tracking-widest text-brand-500 mb-3">Features</p>
          <h2 className="text-2xl sm:text-3xl font-bold" style={{ color: "var(--text-default)" }}>ความสามารถของระบบ</h2>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((f, i) => (
            <div
              key={i}
              ref={(el) => { cardRefs.current[i] = el; }}
              data-idx={i}
              className="group relative rounded-xl p-5 cursor-default transition-all duration-300 bg-surface border border-[var(--border)]"
              style={{
                opacity: visibleCards.has(i) ? 1 : 0,
                transform: visibleCards.has(i) ? "translateY(0)" : "translateY(24px)",
                transition: `opacity 0.5s ease ${i * 70}ms, transform 0.5s cubic-bezier(0.16,1,0.3,1) ${i * 70}ms, border-color 0.3s, box-shadow 0.3s`,
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.borderColor = "rgb(var(--brand-rgb) / 0.15)";
                (e.currentTarget as HTMLDivElement).style.boxShadow = "0 8px 32px rgba(0,0,0,0.3), 0 0 0 1px rgb(var(--brand-rgb) / 0.05)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.borderColor = "";
                (e.currentTarget as HTMLDivElement).style.boxShadow = "";
              }}
            >
              {/* Icon with gradient bg */}
              <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${f.accent} flex items-center justify-center mb-3 group-hover:scale-105 transition-transform duration-300`}>
                <f.icon size={20} className="text-brand-500" />
              </div>
              <h3 className="font-semibold mb-1.5 text-sm" style={{ color: "var(--text-default)" }}>{f.title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="relative py-8 text-center">
        <div className="absolute top-0 left-1/4 right-1/4 h-px" style={{ background: "linear-gradient(90deg, transparent, var(--border), transparent)" }} />
        <p className="text-xs" style={{ color: "var(--text-subtle)" }}>
          Asset Management v2.0 — ระบบจัดการอุปกรณ์ภายในบริษัท
        </p>
      </footer>
    </div>
  );
}
