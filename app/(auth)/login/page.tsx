import type { Metadata } from "next";

import { PagePlaceholder } from "@/app/_shared/components/page-placeholder";

export const metadata: Metadata = {
  title: "เข้าสู่ระบบ",
};

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-background p-6">
      <PagePlaceholder
        title="เข้าสู่ระบบ"
        description="หน้าเข้าสู่ระบบจะมาในขั้นตอนถัดไป อยู่ระหว่างพัฒนา"
      />
    </main>
  );
}
