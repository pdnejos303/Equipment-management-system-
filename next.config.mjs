// Path: next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
  // standalone ใช้สำหรับ Docker build เท่านั้น (Dockerfile copy จาก .next/standalone)
  // Windows local build ไม่ set BUILD_STANDALONE → เลี่ยง EPERM symlink error
  output: process.env.BUILD_STANDALONE ? "standalone" : undefined,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  async headers() {
    // ── Security Headers ──────────────────────────────────────────────────────
    // ใช้ 'unsafe-inline' ใน script-src เพราะมี anti-flash inline script ใน layout.tsx
    // และ Next.js App Router inject inline style ผ่าน styled-jsx ด้วย
    const ContentSecurityPolicy = [
      "default-src 'self'",
      // script: self + inline (anti-flash theme script ใน layout.tsx)
      "script-src 'self' 'unsafe-inline'",
      // style: self + inline (Next.js styled-jsx) + Google Fonts
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      // font: self + Google Fonts CDN
      "font-src 'self' https://fonts.gstatic.com",
      // img: self + data URI (base64) + blob (preview) + https ทั่วไป (avatar / Google OAuth photo)
      "img-src 'self' data: blob: https:",
      // fetch/XHR: self เท่านั้น (OpenAI ถูกเรียกฝั่ง server ไม่ใช่ client)
      "connect-src 'self'",
      // Google OAuth redirect ไม่ใช้ iframe จึง frame-src none ได้
      "frame-src 'none'",
      // ห้าม embed Flash / PDF plugin เก่า
      "object-src 'none'",
      // ห้าม <base href="..."> จาก attacker
      "base-uri 'self'",
      // form ส่งได้แค่ไปยัง origin ตัวเอง
      "form-action 'self'",
      // ห้ามโหลด worker จากที่อื่น
      "worker-src 'self' blob:",
    ].join("; ");

    return [
      // ── Security headers ทุก path ─────────────────────────────────────────
      {
        source: "/(.*)",
        headers: [
          // ป้องกัน Clickjacking — ห้าม iframe โปรเจคนี้จากทุกที่
          { key: "X-Frame-Options", value: "DENY" },
          // ป้องกัน MIME sniffing — browser ต้องใช้ content-type ที่ server ส่งมาเท่านั้น
          { key: "X-Content-Type-Options", value: "nosniff" },
          // จำกัดข้อมูล Referrer ไม่ให้รั่วไปยัง third-party
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // ปิด browser feature ที่ไม่ได้ใช้
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
          // ป้องกัน XSS, code injection, data injection
          { key: "Content-Security-Policy", value: ContentSecurityPolicy },
        ],
      },
      // ── Cache uploads แบบ immutable ──────────────────────────────────────
      // รูปอุปกรณ์ที่ upload เก็บที่ public/uploads/<timestamp>-<rand>.jpg
      // ชื่อไฟล์ unique ทุกครั้งจึง cache แบบ immutable ได้ ปลอดภัย
      {
        source: "/uploads/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ];
  },
};

export default nextConfig;
