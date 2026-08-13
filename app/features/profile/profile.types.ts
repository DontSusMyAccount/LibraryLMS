import type { UserRole, UserStatus } from "@libsys/shared";

/** ข้อมูลโปรไฟล์ที่แสดงบนหน้า /profile (admin/librarian) */
export interface ProfileSummary {
  fullName: string;
  email: string;
  role: UserRole;
  status: UserStatus;
}
