import type { Metadata } from "next";

import { PagePlaceholder } from "@/app/_shared/components/page-placeholder";

export const metadata: Metadata = {
  title: "คิวจอง",
};

export default function ReservationsPage() {
  return (
    <PagePlaceholder
      title="คิวจอง"
      description="จัดการคิวสำรองและรอรับหนังสือที่สมาชิกจองไว้ อยู่ระหว่างพัฒนา"
    />
  );
}
