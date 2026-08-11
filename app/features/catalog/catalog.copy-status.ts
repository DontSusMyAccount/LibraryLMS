import type { CopyStatus } from "@libsys/shared";

export const COPY_STATUS_LABELS: Record<CopyStatus, string> = {
  available: "พร้อมยืม",
  borrowed: "ยืมอยู่",
  reserved: "ถูกจอง",
  lost: "สูญหาย",
  damaged: "ชำรุด",
  withdrawn: "จำหน่ายออก",
};

export const ALLOWED_COPY_TRANSITIONS: Record<CopyStatus, readonly CopyStatus[]> = {
  available: ["borrowed", "reserved", "lost", "damaged", "withdrawn"],
  borrowed: ["available", "lost", "damaged", "withdrawn"],
  reserved: ["available", "borrowed", "lost", "damaged", "withdrawn"],
  lost: ["withdrawn"],
  damaged: ["withdrawn"],
  withdrawn: [],
};

export function canTransitionCopy(from: CopyStatus, to: CopyStatus): boolean {
  if (from === to) {
    return false;
  }
  return ALLOWED_COPY_TRANSITIONS[from].includes(to);
}
