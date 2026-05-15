// Path: src/app/api/auth/[...nextauth]/route.ts
import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

const handler = NextAuth(authOptions);

async function auth(req: any, ctx: any) {
  ctx.params = await ctx.params;
  return handler(req, ctx);
}

export { auth as GET, auth as POST };
