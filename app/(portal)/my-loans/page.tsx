import type { Metadata } from "next";

import { MyLoansPage } from "@/app/features/my-loans/my-loans.page";

export const metadata: Metadata = {
  title: "การยืมของฉัน",
};

export default function PortalMyLoansPage() {
  return <MyLoansPage />;
}
