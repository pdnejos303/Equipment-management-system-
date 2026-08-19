// Path: src/app/api/auth/[...nextauth]/route.ts
import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextRequest } from "next/server";

const handler = NextAuth(authOptions);

async function auth(req: NextRequest, ctx: any) {
  // Dynamically set NEXTAUTH_URL to support both localhost and IP address simultaneously
  const proto = req.headers.get("x-forwarded-proto") || "http";
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  if (host) {
    process.env.NEXTAUTH_URL = `${proto}://${host}`;
  }

  ctx.params = await ctx.params;
  return handler(req as any, ctx);
}

export { auth as GET, auth as POST };
