import { expect, test } from "@playwright/test";

import { loadFixtures, loginAsAdminAndVisit } from "./helpers";

test.describe("คิวจอง", () => {
  test("คิวจองสถานะรอคิว → กดพร้อมให้ยืม → สถานะเปลี่ยนเป็นพร้อมรับ", async ({ page }) => {
    const fixtures = loadFixtures();

    await loginAsAdminAndVisit(page, "/reservations");
    await expect(page.locator('[data-slot="reservations-page"]')).toBeVisible();

    const table = page.locator('[data-slot="reservation-table"]');
    await expect(table).toBeVisible();

    // แถวของการจองที่ seed ไว้ (ชื่อสมาชิกถูก mask เป็น "สมาชิก #..." — ใช้ชื่อหนังสือที่ unique แทน)
    const row = table.getByRole("row").filter({ hasText: fixtures.book.title });
    await expect(row).toContainText(fixtures.book.title);
    await expect(row).toContainText("รอคิว");

    // กดพร้อมให้ยืม → สถานะเปลี่ยน
    await row.getByRole("button", { name: "พร้อมให้ยืม" }).click();
    await expect(row).toContainText("พร้อมรับ");
    await expect(row.getByRole("button", { name: "พร้อมให้ยืม" })).not.toBeVisible();
  });
});
