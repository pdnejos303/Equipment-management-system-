// Path: src/app/page.tsx
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { HomeClient } from "./HomeClient";

export default async function Home() {
  const session = await getServerSession(authOptions);
  if (session) redirect("/overview");

  return <HomeClient />;
}
