import { describe, expect, it } from "vitest";

import { formatThaiDate, formatThaiShortDate } from "./circulation.format";

describe("circulation.format", () => {
  it("formatThaiDate รองรับทั้ง string ISO และ Date object", () => {
    const expected = "25 สิงหาคม 2569";

    expect(formatThaiDate("2026-08-25T00:00:00.000Z")).toBe(expected);
    expect(formatThaiDate(new Date("2026-08-25T00:00:00.000Z"))).toBe(expected);
  });

  it("formatThaiShortDate รองรับทั้ง string ISO และ Date object (eden แปลง ISO string เป็น Date)", () => {
    const expected = "25 ส.ค.";

    expect(formatThaiShortDate("2026-08-25T00:00:00.000Z")).toBe(expected);
    expect(formatThaiShortDate(new Date("2026-08-25T00:00:00.000Z"))).toBe(expected);
  });
});
