# syntax=docker/dockerfile:1

# ===== Stage 1: Dependencies =====
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# Puppeteer: skip Chrome download — we install system chromium in the runner stage
# (Alpine glibc-incompatible binary would fail anyway; we use the OS package).
ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

COPY package.json pnpm-lock.yaml* ./
COPY prisma ./prisma
RUN npm install -g pnpm && pnpm install --frozen-lockfile
# ===== Stage 2: Builder =====
FROM node:20-alpine AS builder
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# NEXT_PUBLIC_APP_URL คือ fallback สำหรับ SSR เท่านั้น
# Browser QR ใช้ window.location.origin อัตโนมัติ จึงไม่ต้อง bake URL จริงเข้าไป
ARG NEXT_PUBLIC_APP_URL=""
ARG NEXT_PUBLIC_COMPANY_NAME="Asset Management"
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_COMPANY_NAME=$NEXT_PUBLIC_COMPANY_NAME
ENV OPENAI_API_KEY=build-placeholder
ENV BUILD_STANDALONE=1

RUN npx prisma generate
RUN npm run build

# ===== Stage 3: Runner =====
FROM node:20-alpine AS runner
# Chromium + fonts for puppeteer (used by PDF export / audit checklist).
# Alpine's chromium is the official build, smaller than puppeteer's bundled Chrome.
RUN apk add --no-cache \
      libc6-compat openssl \
      chromium nss freetype harfbuzz ca-certificates ttf-freefont \
      font-noto font-noto-cjk font-noto-thai
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
# Bind dual-stack (IPv6 + IPv4-mapped) — browsers on Windows resolve "localhost" to ::1 first,
# and Docker Desktop's port forward hangs if the container only listens on IPv4.
ENV HOSTNAME=::

# Point puppeteer at the system chromium instead of trying to download its own.
ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

# Next.js standalone output
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Prisma schema + node_modules ทั้งก้อน (เพื่อให้ prisma CLI ใช้งานได้)
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json

# โฟลเดอร์เก็บ SQLite DB + รูปอุปกรณ์ (mount เป็น Docker volume)
RUN mkdir -p /app/data /app/uploads \
 && chown -R nextjs:nodejs /app/data /app/uploads

USER nextjs

EXPOSE 3000

CMD ["sh", "-c", "npx prisma db push --skip-generate --accept-data-loss=false && node server.js"]