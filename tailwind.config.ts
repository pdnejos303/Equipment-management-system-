// Path: tailwind.config.ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "var(--font-noto-thai)", "system-ui", "sans-serif"],
        thai: ["var(--font-noto-thai)", "var(--font-inter)", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        // Brand — CSS-var driven so all 4 themes can swap at runtime
        brand: {
          50:  "#fffbeb",
          100: "#fef3c7",
          200: "#fde68a",
          300: "#fcd34d",
          400: "rgb(var(--brand-light-rgb) / <alpha-value>)",
          500: "rgb(var(--brand-rgb) / <alpha-value>)",
          600: "rgb(var(--brand-dark-rgb) / <alpha-value>)",
          700: "#b45309",
          800: "#92400e",
          900: "#78350f",
          950: "#451a03",
        },
        // Surface layers — CSS-var driven; DEFAULT+dark use rgb() for /opacity support
        surface: {
          DEFAULT: "rgb(var(--surface-rgb) / <alpha-value>)",
          dark:    "rgb(var(--background-rgb) / <alpha-value>)",
          hover:   "var(--surface-hover)",
          active:  "var(--surface-active)",
          raised:  "var(--surface-raised)",
        },
        // Border — rgb() for /opacity support on DEFAULT, plain var for subtle/strong
        border: {
          DEFAULT: "rgb(var(--border-rgb) / <alpha-value>)",
          subtle:  "var(--border-subtle)",
          strong:  "var(--border-strong)",
        },
        // Semantic text shortcuts
        muted: "#6b7280",
        // Status indicator colors (use as text / bg helpers in utils.ts)
        status: {
          active:      "#34d399",
          "active-bg": "#0d2b22",
          available:   "#60a5fa",
          "available-bg": "#0d1e35",
          maintenance: "#fbbf24",
          "maintenance-bg": "#2d2007",
          retired:     "#6b7280",
          "retired-bg": "#1c1c1c",
        },
      },
      borderRadius: {
        sm:    "6px",
        DEFAULT: "8px",
        md:    "10px",
        lg:    "12px",
        xl:    "16px",
        "2xl": "20px",
        "3xl": "24px",
      },
      boxShadow: {
        sm:         "0 1px 2px rgba(0,0,0,0.3)",
        DEFAULT:    "0 2px 6px rgba(0,0,0,0.25)",
        md:         "0 4px 12px rgba(0,0,0,0.3)",
        lg:         "0 6px 20px rgba(0,0,0,0.35)",
        xl:         "0 10px 32px rgba(0,0,0,0.4)",
        "brand":    "0 0 12px rgb(var(--brand-rgb) / 0.08)",
        "brand-lg": "0 0 24px rgb(var(--brand-rgb) / 0.12)",
        "glow":     "0 0 0 1px rgb(var(--brand-rgb) / 0.2), 0 0 12px rgb(var(--brand-rgb) / 0.06)",
        "inner":    "inset 0 1px 2px rgba(0,0,0,0.25)",
        "card":     "0 1px 3px rgba(0,0,0,0.25)",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0", transform: "translateY(4px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in-up": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in-down": {
          from: { opacity: "0", transform: "translateY(-6px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in-scale": {
          from: { opacity: "0", transform: "scale(0.97)" },
          to:   { opacity: "1", transform: "scale(1)" },
        },
        "slide-in-left": {
          from: { opacity: "0", transform: "translateX(-8px)" },
          to:   { opacity: "1", transform: "translateX(0)" },
        },
        "slide-in-right": {
          from: { opacity: "0", transform: "translateX(8px)" },
          to:   { opacity: "1", transform: "translateX(0)" },
        },
        "slide-in-bottom": {
          from: { opacity: "0", transform: "translateY(10px) scale(0.98)" },
          to:   { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.95)" },
          to:   { opacity: "1", transform: "scale(1)" },
        },
        "modal-in": {
          from: { opacity: "0", transform: "translate3d(0, 4px, 0)" },
          to:   { opacity: "1", transform: "translate3d(0, 0, 0)" },
        },
        "overlay-in": {
          from: { opacity: "0" },
          to:   { opacity: "1" },
        },
        "progress-fill": {
          from: { transform: "scaleX(0)" },
          to:   { transform: "scaleX(1)" },
        },
        "counter-grow": {
          from: { opacity: "0", transform: "scale(0.8)" },
          to:   { opacity: "1", transform: "scale(1)" },
        },
        shimmer: {
          from: { backgroundPosition: "-200% 0" },
          to:   { backgroundPosition: "200% 0" },
        },
        "bounce-subtle": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%":      { transform: "translateY(-2px)" },
        },
        "glow-pulse": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgb(var(--brand-rgb) / 0)" },
          "50%":      { boxShadow: "0 0 10px 2px rgb(var(--brand-rgb) / 0.08)" },
        },
        "brand-pulse": {
          "0%, 100%": { opacity: "1" },
          "50%":      { opacity: "0.7" },
        },
        "spin-slow": {
          from: { transform: "rotate(0deg)" },
          to:   { transform: "rotate(360deg)" },
        },
        "ping-slow": {
          "0%":        { transform: "scale(1)", opacity: "1" },
          "75%, 100%": { transform: "scale(1.4)", opacity: "0" },
        },
        "orb-float": {
          "0%, 100%": { transform: "translate(0, 0)" },
          "50%":      { transform: "translate(8px, -6px)" },
        },
        "loading-slide": {
          "0%":   { width: "0%", marginLeft: "0" },
          "50%":  { width: "60%", marginLeft: "20%" },
          "100%": { width: "0%", marginLeft: "100%" },
        },
        "scan-line": {
          "0%, 100%": { top: "8px", opacity: "1" },
          "50%":      { top: "calc(100% - 10px)", opacity: "0.6" },
        },
      },
      animation: {
        "fade-in":        "fade-in 0.4s ease-out both",
        "fade-in-up":     "fade-in-up 0.5s ease-out both",
        "fade-in-down":   "fade-in-down 0.35s ease-out both",
        "fade-in-scale":  "fade-in-scale 0.3s ease-out both",
        "slide-in-left":  "slide-in-left 0.4s ease-out both",
        "slide-in-right": "slide-in-right 0.4s ease-out both",
        "slide-in-bottom":"slide-in-bottom 0.3s cubic-bezier(0.16,1,0.3,1) both",
        "scale-in":       "scale-in 0.3s ease-out both",
        "modal-in":       "modal-in 0.15s ease-out both",
        "overlay-in":     "overlay-in 0.15s ease-out both",
        "progress-fill":  "progress-fill 1s ease-out 0.3s both",
        "counter-grow":   "counter-grow 0.5s cubic-bezier(0.16,1,0.3,1) both",
        shimmer:          "shimmer 2s linear infinite",
        "bounce-subtle":  "bounce-subtle 2s ease-in-out infinite",
        "glow-pulse":     "glow-pulse 2s ease-in-out infinite",
        "brand-pulse":    "brand-pulse 2s ease-in-out infinite",
        "spin-slow":      "spin-slow 3s linear infinite",
        "ping-slow":      "ping-slow 2s cubic-bezier(0,0,0.2,1) infinite",
        "orb-float":      "orb-float 8s ease-in-out infinite",
        "loading-slide":  "loading-slide 1.5s ease-in-out infinite",
        "scan-line":      "scan-line 2s ease-in-out infinite",
      },
      transitionTimingFunction: {
        spring: "cubic-bezier(0.16, 1, 0.3, 1)",
        smooth: "cubic-bezier(0.4, 0, 0.2, 1)",
        snappy: "cubic-bezier(0.2, 0, 0, 1)",
      },
      spacing: {
        "4.5": "1.125rem",
        "13":  "3.25rem",
        "15":  "3.75rem",
        "18":  "4.5rem",
        "22":  "5.5rem",
      },
    },
  },
  safelist: [
    // border-top-color dynamic classes (stat cards, alert cards, user role cards)
    "border-t-red-500", "border-t-amber-500", "border-t-blue-500",
    "border-t-green-500", "border-t-gray-400", "border-t-brand-500",
    "border-t-gray-500",
    // border-left-color dynamic classes (alert rows)
    "border-l-red-500", "border-l-amber-500", "border-l-blue-500",
    "border-l-4",
    // text colors used in dynamic lookups
    "text-red-400", "text-amber-400", "text-blue-400",
    "text-green-400", "text-gray-400", "text-emerald-400",
    // bg colors used in dynamic lookups
    "bg-red-500/10", "bg-amber-500/10", "bg-blue-500/10",
    "bg-green-500/10", "bg-gray-500/10",
    "bg-red-500/5", "bg-amber-500/5", "bg-blue-500/5",
    "border-red-500/30", "border-amber-500/30", "border-blue-500/30",
    "border-red-500/40", "border-amber-500/40", "border-blue-500/40",
    // avatar gradients (users page)
    "from-red-500", "to-orange-500",
    "from-blue-500", "to-cyan-500",
    "from-purple-500", "to-pink-500",
    "from-green-500", "to-teal-500",
    "from-amber-500", "to-yellow-500",
    "bg-gradient-to-br",
  ],
  plugins: [],
};
export default config;
