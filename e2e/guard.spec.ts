import { expect, test } from "@playwright/test";

import { loginAsAdmin } from "./helpers";

test.describe("route guard (ต้องล็อกอินก่อนเข้าถึง)", () => {
  test("ยังไม่ล็อกอิน → เข้า /dashboard ถูกเปลี่ยนเส้นทางไป /login", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });

  test("ยังไม่ล็อกอิน → เข้า /members ถูกเปลี่ยนเส้นทางไป /login", async ({ page }) => {
    await page.goto("/members");
    await expect(page).toHaveURL(/\/login/);
  });

  test("ล็อกอินแล้ว → เข้า /dashboard ได้ปกติ (ไม่ถูกเปลี่ยนเส้นทาง)", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/dashboard/);
  });
});
