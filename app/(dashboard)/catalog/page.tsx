import type { Metadata } from "next";

import { PagePlaceholder } from "@/app/_shared/components/page-placeholder";

export const metadata: Metadata = {
  title: "แคตตาล็อก",
};

export default function CatalogPage() {
  return (
    <PagePlaceholder
      title="แคตตาล็อก"
      description="จัดการหนังสือ สื่อ และหมวดหมู่ภายในห้องสมุด อยู่ระหว่างพัฒนา"
    />
  );
}
