# syntax=docker/dockerfile:1

# ===== Stage 1: Dependencies =====
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

COPY package.json package-lock.json* ./
COPY prisma ./prisma
RUN npm install

# ===== Stage 2: Builder =====
FROM node:20-alpine AS builder
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# NEXT_PUBLIC_APP_URL คือ fallback สำหรับ SSR เท่านั้น
# Browser QR ใช้ window.location.origin อัตโนมัติ จึงไม่ต้อง bake URL จริงเข้าไป
ARG NEXT_PUBLIC_APP_URL=""
ARG NEXT_PUBLIC_COMPANY_NAME="EquipTrack"
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_COMPANY_NAME=$NEXT_PUBLIC_COMPANY_NAME
ENV OPENAI_API_KEY=build-placeholder
# เปิด standalone output เฉพาะตอน Docker build (next.config.mjs อ่าน flag นี้)
ENV BUILD_STANDALONE=1

RUN npx prisma generate
RUN npm run build

# ===== Stage 3: Runner =====
FROM node:20-alpine AS runner
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

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

# โฟลเดอร์เก็บ SQLite DB
RUN mkdir -p /app/data && chown -R nextjs:nodejs /app/data

USER nextjs

EXPOSE 3000

CMD ["sh", "-c", "npx prisma db push --skip-generate --accept-data-loss=false && node server.js"]