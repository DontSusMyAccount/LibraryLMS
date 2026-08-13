import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import SettingsPage from "@/app/(dashboard)/settings/page";

describe("SettingsPage", () => {
  it("แสดงหัวข้อ การตั้งค่า", () => {
    render(<SettingsPage />);

    expect(screen.getByText("การตั้งค่า")).toBeTruthy();
  });

  it("มีตัวสลับธีม (dark/light)", () => {
    render(<SettingsPage />);

    expect(screen.getByRole("button", { name: /สลับเป็นโหมด/ })).toBeTruthy();
  });
});
