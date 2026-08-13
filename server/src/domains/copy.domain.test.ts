import { describe, expect, it } from "vitest";

import type { CopyStatus } from "../shared";
import { canTransitionCopy } from "./copy.domain";

const ALL_STATUSES: CopyStatus[] = [
  "available",
  "borrowed",
  "reserved",
  "lost",
  "damaged",
  "withdrawn",
];

describe("copy state machine", () => {
  it("available สู่ borrowed / reserved / lost / damaged / withdrawn ได้", () => {
    expect(canTransitionCopy("available", "borrowed")).toBe(true);
    expect(canTransitionCopy("available", "reserved")).toBe(true);
    expect(canTransitionCopy("available", "lost")).toBe(true);
    expect(canTransitionCopy("available", "damaged")).toBe(true);
    expect(canTransitionCopy("available", "withdrawn")).toBe(true);
  });

  it("borrowed คืนได้เป็น available หรือเสียหาย/สูญหาย/ถอน", () => {
    expect(canTransitionCopy("borrowed", "available")).toBe(true);
    expect(canTransitionCopy("borrowed", "lost")).toBe(true);
    expect(canTransitionCopy("borrowed", "damaged")).toBe(true);
    expect(canTransitionCopy("borrowed", "withdrawn")).toBe(true);
  });

  it("borrowed → borrowed ถูก reject (ไม่มี transition ไปสถานะเดิม)", () => {
    expect(canTransitionCopy("borrowed", "borrowed")).toBe(false);
    expect(canTransitionCopy("available", "available")).toBe(false);
  });

  it("borrowed → reserved ผิดกฎ ถูก reject", () => {
    expect(canTransitionCopy("borrowed", "reserved")).toBe(false);
  });

  it("reserved → available / borrowed ได้", () => {
    expect(canTransitionCopy("reserved", "available")).toBe(true);
    expect(canTransitionCopy("reserved", "borrowed")).toBe(true);
  });

  it("lost / damaged เหลือทางเดียวคือ withdrawn", () => {
    expect(canTransitionCopy("lost", "withdrawn")).toBe(true);
    expect(canTransitionCopy("damaged", "withdrawn")).toBe(true);
    expect(canTransitionCopy("lost", "available")).toBe(false);
    expect(canTransitionCopy("damaged", "borrowed")).toBe(false);
  });

  it("withdrawn เป็นสถานะปลายทาง ไม่ transition ไปไหน", () => {
    for (const status of ALL_STATUSES) {
      expect(canTransitionCopy("withdrawn", status)).toBe(false);
    }
  });

  it("transition ไปสถานะที่ไม่อยู่ใน enum คืน false (ปลอดภัย)", () => {
    expect(canTransitionCopy("available", "unknown" as CopyStatus)).toBe(false);
  });
});
