import type { CopyStatus } from "../shared";

const ALLOWED_TRANSITIONS: Record<CopyStatus, readonly CopyStatus[]> = {
  available: ["borrowed", "reserved", "lost", "damaged", "withdrawn"],
  borrowed: ["available", "lost", "damaged", "withdrawn"],
  reserved: ["available", "borrowed", "lost", "damaged", "withdrawn"],
  lost: ["withdrawn"],
  damaged: ["withdrawn"],
  withdrawn: [],
};

export function canTransitionCopy(from: CopyStatus, to: CopyStatus): boolean {
  if (from === to) return false;
  return ALLOWED_TRANSITIONS[from].includes(to);
}
