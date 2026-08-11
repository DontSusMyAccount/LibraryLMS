import type { Metadata } from "next";

import LoginPage from "@/app/features/login/login.page";

export const metadata: Metadata = {
  title: "เข้าสู่ระบบ",
};

export default function LoginRoute() {
  return <LoginPage />;
}
