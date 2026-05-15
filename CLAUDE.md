# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

EquipTrack — Equipment Management System for small/medium businesses. Built with Next.js 14 (App Router), Prisma, PostgreSQL (Supabase), and Tailwind CSS. Multi-language UI (Thai/English/Japanese). Dark theme.

Demo credentials: `admin@company.com` / `admin123`

## Development Commands

```bash
npm run dev          # Start dev server (localhost:3000)
npm run build        # Production build
npm run start        # Start production server
npm run db:push      # Push Prisma schema to database
npm run db:seed      # Seed sample data (8 assets, 4 users)
npm run db:studio    # Open Prisma Studio GUI
# postinstall runs `prisma generate` automatically
```

No test framework is configured. No linter script in package.json — ESLint runs via `npx eslint`.

## Architecture

### Auth & Authorization
- **NextAuth.js** with JWT strategy (not database sessions). Config in `src/lib/auth.ts`.
- Three roles: `ADMIN` (full access + user management), `USER` (create/edit), `VIEWER` (read-only).
- Server-side guard: `requireRole()` / `canDelete()` from `src/lib/role-guard.ts`.
- Client-side hook: `useRole()` from `src/lib/useRole.ts`.
- Middleware at `src/middleware.ts` protects `/dashboard/*` and `/api/*` routes.

### Database (Prisma)
- Schema: `prisma/schema.prisma` — 7 core tables: User, Asset, AssetPhoto, Assignment, MaintenanceRecord, Booking, plus NextAuth tables.
- Prisma client singleton: `src/lib/prisma.ts`.
- Asset categories: LAPTOP, MONITOR, VEHICLE, FURNITURE, CAMERA, PROJECTOR, PRINTER, PHONE, OTHER.
- Asset statuses: ACTIVE, AVAILABLE, MAINTENANCE, RETIRED.
- Booking has overlap detection to prevent double-booking.

### API Routes (`src/app/api/`)
All API routes are Next.js Route Handlers. Key patterns:
- CRUD endpoints return JSON. Auth checked via `getServerSession(authOptions)`.
- `/api/assets`, `/api/assignments`, `/api/maintenance`, `/api/bookings` — standard REST.
- `/api/ai/*` — AI features (chat, suggest, analyze, predict-maintenance, insights) using OpenAI.
- `/api/export` — CSV/PDF export with multi-language support.
- `/api/upload` — Photo upload to Supabase Storage.
- `/api/cron/` — Vercel Cron for daily alert emails via Resend.

### Frontend Patterns
- **Providers wrapper** (`src/components/Providers.tsx`): wraps app with SessionProvider + I18nProvider.
- **i18n**: Custom React Context in `src/lib/i18n.tsx` — not next-intl or similar library.
- **Dashboard layout** (`src/app/dashboard/layout.tsx`): Sidebar + AIChatWidget, responsive with mobile hamburger menu.
- **Public page**: `/asset/[code]` — QR code scans resolve here (no auth required).
- **Utility helpers** in `src/lib/utils.ts`: `cn()` (clsx+twMerge), `formatMoney()`, `formatDate()`, status/category color configs.
- **SweetAlert2** wrapper: `src/lib/swal.ts` (dark-themed).
- **Asset labels**: QR codes via `qrcode`, barcodes via `JsBarcode` (Code128).
- **Depreciation**: Straight-line method in `src/lib/depreciation.ts`.

### Key UI Libraries
- Radix UI for accessible primitives (Dialog, Dropdown, Select, Tabs)
- Recharts for dashboard charts
- Custom Tailwind component classes defined in `src/app/globals.css` (.card, .input, .btn-primary, .badge)
- Custom animations in `tailwind.config.ts` (fade-in, slide-in, scale-in, etc.)

## Path Alias

`@/*` maps to `./src/*` (configured in tsconfig.json).

## Environment Variables

See `.env.example`. Required: `DATABASE_URL`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`. Optional: Google OAuth, Resend (email alerts), OpenAI (AI features), Supabase (photo storage).

## Build Notes

- `next.config.mjs` ignores ESLint errors during build and allows all HTTPS remote images.
- TypeScript strict mode is enabled.

## Design Context

### Users
Small business owners and operations managers in Thailand who wear many hats. They check the dashboard between meetings, approve bookings on mobile, and scan QR codes on the floor. They're not dedicated IT staff — they need an interface that respects their time, surfaces the right information immediately, and requires zero onboarding. Thai is the primary locale; EN and JA are first-class secondary locales.

### Brand Personality
**Professional · Reliable · Clean** — calm, confident, quietly impressive. Emotional goals: confidence, efficiency, trust.

### Aesthetic Direction
- **Reference:** Linear, Vercel — dark, refined, fast-feeling. Obsessive spacing, crisp typography, minimal but never bare.
- **Anti-reference:** Generic Bootstrap admin panels, light-mode-heavy UIs.
- **Theme:** Dark-only. Background `#0a0a0a`, surface `#111111`, brand amber `#f59e0b`.
- **Motion:** Smooth and purposeful. Skeletons over spinners. Staggered list entrances.

### Design Principles
1. **Clarity over decoration** — Every element earns its place. Remove anything that doesn't aid comprehension.
2. **Speed as a feature** — UI feels instant. Skeletons, prefetched routes, animate state transitions not loading states.
3. **Data is the hero** — Charts and numbers are the point. UI frames them, never competes.
4. **Dark, premium, refined** — Tight spacing, consistent radius, amber used sparingly for maximum impact.
5. **Thai-first, globally graceful** — Layouts accommodate Thai text. EN/JA are not afterthoughts.
