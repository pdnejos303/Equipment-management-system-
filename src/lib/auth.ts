// Path: src/lib/auth.ts
// ============================================================
// File: auth.ts
// Path: equip-track/src/lib/auth.ts
// Desc: NextAuth.js config — Google OAuth + Credentials (bcrypt)
//       ใช้ PrismaAdapter เก็บ session ใน DB
// ============================================================

import { type NextAuthOptions } from "next-auth"; // พิมเขียวมาตฐาน
import { PrismaAdapter } from "@next-auth/prisma-adapter"; // ตัวทืี่เชื่อมต่อไป DB
import GoogleProvider from "next-auth/providers/google";// จัดการเร่อง Oauth
import CredentialsProvider from "next-auth/providers/credentials"; // ระบบ Login ด้วย email/password
import bcrypt from "bcryptjs"; // เข้ารหัส
import { prisma } from "./prisma"; // เข้าถึง DB

const providers: NextAuthOptions ["providers"] = []; // ว่างก่อนจะได้ Push ได้

// Only add Google provider if credentials are configured
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      allowDangerousEmailAccountLinking: true,
    })
  );
}

providers.push( 
  CredentialsProvider({ // ({ คือ Configuration Object})
    name: "Email",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },

    async authorize(credentials) {
      // 1. Validation: เช็คว่าส่ง email กับ password มาจริงไหม ถ้าไม่มีให้เตะออกทันที (return null)
      if (!credentials?.email || !credentials?.password) return null;
// 2. Database Lookup: ใช้ Prisma ไปดึงข้อมูล User จาก DB โดยหาจาก Email
      const user = await prisma.user.findUnique({
        where: { email: credentials.email },
      });
// 3. User Existence & Password Check: 
  // - ถ้าไม่เจอ User ใน DB หรือ User คนนั้นไม่มี password (เช่น สมัครผ่าน Google มาก่อน) ให้ return null
      if (!user || !user.hashedPassword) return null;
// 4. Hash Verification: ใช้ bcrypt เทียบ Password (Plain text) กับ hashedPassword ใน DB
      const isValid = await bcrypt.compare(
        credentials.password,
        user.hashedPassword
      );
      // 5. Auth Result:
  // - ถ้า Password ไม่ตรง return null (NextAuth จะถือว่า Login Failed)
      if (!isValid) return null;
// - ถ้าผ่านหมด ให้ส่ง Object ของ User กลับไป (ข้อมูลนี้จะไปอยู่ใน JWT ต่อ)
      return {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
      };
    },
  })
);

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),

  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },

  pages: {
    signIn: "/login",
    error: "/login",
  },

  providers,

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const dbUser = await prisma.user.findUnique({
          where: { email: user.email! },
          select: { id: true, role: true },
        });
        if (dbUser) {
          token.userId = dbUser.id;
          token.role = dbUser.role as "ADMIN" | "USER" | "VIEWER";
        }
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.userId;
        (session.user as any).role = token.role;
      }
      return session;
    },
  },
};

// ── Password helpers ──

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

// ── Type augmentation ──

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role: "ADMIN" | "USER" | "VIEWER";
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId: string;
    role: "ADMIN" | "USER" | "VIEWER";
  }
}
