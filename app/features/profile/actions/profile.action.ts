import { eden } from "@/app/_shared/lib/eden-client";
import { edenRequest } from "@/app/_shared/lib/eden-helpers";

import type { ProfileSummary } from "../profile.types";

/** ดึงข้อมูลโปรไฟล์ของ user ที่ login (admin/librarian) จาก /auth/me — me module สงวนไว้ฝั่งผู้ยืม (BORROWER_ROLES) */
export async function fetchMyProfile(): Promise<ProfileSummary> {
  const user = await edenRequest(await eden.auth.me.get());
  return {
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    status: user.status,
  };
}
