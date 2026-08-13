import type { Metadata } from "next";

import { MyFinesPage } from "@/app/features/my-fines/my-fines.page";

export const metadata: Metadata = {
  title: "ค่าปรับของฉัน",
};

export default function PortalMyFinesPage() {
  return <MyFinesPage />;
}
