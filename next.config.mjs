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
    // รูปอุปกรณ์ที่ upload เก็บที่ public/uploads/<timestamp>-<rand>.jpg
    // ชื่อไฟล์ unique ทุกครั้งจึง cache แบบ immutable ได้ ปลอดภัย
    return [
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
