import { expect, test } from "@playwright/test";

import { loginAsAdminAndVisit } from "./helpers";

function uniqueIsbn(): string {
  const randomPart = Math.floor(Math.random() * 10_000_000_000)
    .toString()
    .padStart(10, "0");
  return `978${randomPart}`;
}

test.describe("หน้าแคตตาล็อก", () => {
  test("เพิ่มหนังสือใหม่ผ่าน dialog → ค้นหาแล้วพบหนังสือ", async ({ page }) => {
    const title = `หนังสือ E2E UI ${Date.now().toString(36)}`;
    const isbn = uniqueIsbn();

    await loginAsAdminAndVisit(page, "/catalog");
    await expect(page.locator('[data-slot="catalog-page"]')).toBeVisible();

    await page.getByRole("button", { name: "เพิ่มหนังสือ" }).first().click();
    await expect(page.locator('[data-slot="dialog-title"]')).toHaveText("เพิ่มหนังสือ");

    await page.locator("#book-title").fill(title);
    await page.locator("#book-author").fill("ผู้แต่ง E2E");
    await page.locator("#book-isbn").fill(isbn);
    await page.getByRole("button", { name: "บันทึก" }).click();

    await expect(page.locator('[data-slot="dialog"]')).not.toBeVisible();

    await page.getByLabel("ค้นหาหนังสือ").fill(title);
    await expect(page.locator('[data-slot="book-table"]')).toContainText(title);
  });

  test("กรอกชื่อหนังสือว่าง → แสดง validation ภาษาไทย", async ({ page }) => {
    await loginAsAdminAndVisit(page, "/catalog");
    await page.getByRole("button", { name: "เพิ่มหนังสือ" }).first().click();
    await page.getByRole("button", { name: "บันทึก" }).click();

    await expect(page.locator('[data-slot="book-title-error"]')).toHaveText("กรุณากรอกชื่อหนังสือ");
  });
});
