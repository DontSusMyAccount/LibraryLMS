import { expect, test } from "@playwright/test";

import { loadFixtures, loginAsAdminAndVisit } from "./helpers";

test.describe("เคาน์เตอร์ยืม-คืน", () => {
  test("ยืมหนังสือ → แสดงสแตมป์กำหนดคืน → คืนหนังสือสำเร็จ", async ({ page }) => {
    const fixtures = loadFixtures();

    await loginAsAdminAndVisit(page, "/circulation");
    await expect(page.locator('[data-slot="circulation-page"]')).toBeVisible();

    // ค้นหาและเลือกสมาชิก
    await page.getByLabel("ค้นหาสมาชิก").fill(fixtures.member.fullName);
    await page.getByRole("button", { name: "ค้นหา" }).click();
    await expect(page.locator('[data-slot="member-search-results"]')).toBeVisible();
    await page
      .locator('[data-slot="member-search-results"]')
      .getByText(fixtures.member.fullName)
      .click();

    // เพิ่มรหัสสำเนาและยืม
    await expect(page.locator('[data-slot="checkout-panel"]')).toBeVisible();
    await page.getByLabel("รหัสสำเนาหนังสือ").fill(fixtures.copy.copyCode);
    await page.getByRole("button", { name: "เพิ่ม" }).click();
    await expect(page.locator('[data-slot="checkout-cart"]')).toContainText(fixtures.copy.copyCode);

    await page.getByRole("button", { name: "ยืมหนังสือ" }).click();

    // สแตมป์กำหนดคืน + toast
    await expect(page.locator('[data-slot="due-date-stamp"]')).toBeVisible();
    await expect(page.locator('[data-slot="circulation-toast"]')).toContainText("ยืมสำเร็จ");

    // คืนหนังสือ (สลับแท็บ คืน)
    await page
      .locator('[data-slot="circulation-tabs"]')
      .getByRole("button", { name: "คืน" })
      .click();
    await expect(page.locator('[data-slot="checkin-panel"]')).toBeVisible();
    await page.getByLabel("รหัสสำเนาหนังสือที่คืน").fill(fixtures.copy.copyCode);
    await page.getByRole("button", { name: "คืนหนังสือ" }).click();

    await expect(page.locator('[data-slot="circulation-toast"]')).toContainText("คืนสำเร็จ");
  });

  test("ค้นหาสมาชิกไม่พบ → แสดงข้อความ 'ไม่พบสมาชิกที่ค้นหา'", async ({ page }) => {
    await loginAsAdminAndVisit(page, "/circulation");

    await page.getByLabel("ค้นหาสมาชิก").fill("ไม่มีสมาชิกชื่อนี้จริงๆ");
    await page.getByRole("button", { name: "ค้นหา" }).click();

    await expect(page.getByText("ไม่พบสมาชิกที่ค้นหา")).toBeVisible();
  });
});
