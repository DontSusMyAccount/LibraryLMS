import { expect, test } from "@playwright/test";

import { loginAsAdmin } from "./helpers";

test.describe("หน้า dashboard", () => {
  test("แสดง KPI ทั้ง 4 การ์ด (ยืมวันนี้ / ยืมค้างส่ง / คิวจองพร้อมรับ / ค่าปรับค้างชำระ)", async ({
    page,
  }) => {
    await loginAsAdmin(page);
    await expect(page.locator('[data-slot="dashboard-kpis"]')).toBeVisible();

    const kpis = page.locator('[data-slot="dashboard-kpis"]');
    await expect(kpis.getByText("ยืมวันนี้")).toBeVisible();
    await expect(kpis.getByText("ยืมค้างส่ง")).toBeVisible();
    await expect(kpis.getByText("คิวจองพร้อมรับ")).toBeVisible();
    await expect(kpis.getByText("ค่าปรับค้างชำระ")).toBeVisible();
  });

  test("แสดงคำทักทายพร้อมชื่อผู้ใช้", async ({ page }) => {
    await loginAsAdmin(page);
    await expect(page.locator('[data-slot="dashboard-heading"]')).toContainText("สวัสดี");
  });
});
