import type { Metadata } from "next";

import { PagePlaceholder } from "@/app/_shared/components/page-placeholder";

export const metadata: Metadata = {
  title: "เคาน์เตอร์ยืม-คืน",
};

export default function CirculationPage() {
  return (
    <PagePlaceholder
      title="เคาน์เตอร์ยืม-คืน"
      description="ดำเนินการยืม คืน ต่ออายุ และเรียกคืนหนังสือ อยู่ระหว่างพัฒนา"
    />
  );
}
