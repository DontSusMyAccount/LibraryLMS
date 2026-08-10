import type { Metadata } from "next";

import { PagePlaceholder } from "@/app/_shared/components/page-placeholder";

export const metadata: Metadata = {
  title: "ภาพรวม",
};

export default function DashboardPage() {
  return (
    <PagePlaceholder
      title="ภาพรวม"
      description="หน้านี้จะแสดงสถิติการใช้งานห้องสมุดแบบภาพรวม อยู่ระหว่างพัฒนา"
    />
  );
}
