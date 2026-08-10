import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { StatusBadge } from "./status-badge";

interface StatusCase {
  status: "confirmed" | "pending" | "cancelled";
  label: string;
  dotClass: string;
}

const STATUS_CASES: StatusCase[] = [
  { status: "confirmed", label: "ยืมอยู่", dotClass: "bg-accent-mint" },
  { status: "pending", label: "ค้างส่ง", dotClass: "bg-accent-amber" },
  { status: "cancelled", label: "พร้อมรับ", dotClass: "bg-accent-coral" },
];

describe("StatusBadge", () => {
  for (const statusCase of STATUS_CASES) {
    it(`renders ${statusCase.status} as a 6px dot with the Thai label "${statusCase.label}"`, () => {
      const { container } = render(<StatusBadge status={statusCase.status} />);

      expect(container.textContent).toContain(statusCase.label);

      const dot = container.querySelector("[data-slot='status-dot']");
      expect(dot).toBeTruthy();
      expect(dot?.className).toContain("size-1.5");
      expect(dot?.className).toContain("rounded-full");
      expect(dot?.className).toContain(statusCase.dotClass);
    });
  }
});
