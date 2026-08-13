import type { UserRole, UserStatus } from "@libsys/shared";

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: "แอดมิน",
  librarian: "บรรณารักษ์",
  faculty: "อาจารย์",
  staff: "เจ้าหน้าที่",
  student: "นักศึกษา",
};

export const STATUS_LABELS: Record<UserStatus, string> = {
  active: "ใช้งาน",
  suspended: "ระงับ",
  graduated: "สำเร็จการศึกษา",
  inactive: "ไม่ใช้งาน",
};
