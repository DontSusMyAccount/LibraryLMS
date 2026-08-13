import type { Metadata } from "next";

import { auth } from "@/auth";
import DashboardPage from "@/app/features/dashboard/dashboard.page";

export const metadata: Metadata = {
  title: "ภาพรวม",
};

export default async function DashboardRoute() {
  const session = await auth();

  const identity = {
    userId: session?.user?.id ?? null,
    userName: session?.user?.fullName ?? "",
  };

  return <DashboardPage identity={identity} />;
}
