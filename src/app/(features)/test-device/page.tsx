import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getTestDevices, getCategories } from "./actions";
import TestDeviceClient from "./TestDeviceClient";



export default async function TestDevicePage() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    redirect("/api/auth/signin");
  }

  const devices = await getTestDevices();
  const categories = await getCategories();

  return (
    <div className="page-enter space-y-6">
      <TestDeviceClient 
        initialDevices={devices} 
        categories={categories} 
        currentUser={session.user} 
      />
    </div>
  );
}
