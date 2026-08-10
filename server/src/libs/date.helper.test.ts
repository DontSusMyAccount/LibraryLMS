import { describe, it, expect } from "vitest";
import { addDays, isAfter, startOfDay } from "./date.helper";

describe("date.helper", () => {
  it("addDays เพิ่มจำนวนวัน", () => {
    const base = new Date("2026-08-10T00:00:00Z");
    expect(addDays(base, 14).toISOString()).toBe("2026-08-24T00:00:00.000Z");
  });

  it("isAfter เปรียบเทียบวัน", () => {
    expect(isAfter(new Date("2026-08-11T00:00:00Z"), new Date("2026-08-10T00:00:00Z"))).toBe(true);
    expect(isAfter(new Date("2026-08-09T00:00:00Z"), new Date("2026-08-10T00:00:00Z"))).toBe(false);
  });

  it("startOfDay ตัดเวลาเหลือเที่ยงคืน", () => {
    const result = startOfDay(new Date("2026-08-10T15:30:45Z"));
    expect(result.getHours()).toBe(0);
    expect(result.getMinutes()).toBe(0);
    expect(result.getSeconds()).toBe(0);
  });
});
