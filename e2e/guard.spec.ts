import { expect, test } from "@playwright/test";

import { loadFixtures, loginAsAdmin } from "./helpers";

const MEMBER_PASSWORD = "Member@1234";

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

  test("student ล็อกอิน → redirect ไป /my-loans (ฝั่งผู้ยืม)", async ({ page }) => {
    const { member } = loadFixtures();
    await page.goto("/login");
    await page.locator("#login-email").fill(member.email);
    await page.locator("#login-password").fill(MEMBER_PASSWORD);
    await page.getByRole("button", { name: "เข้าสู่ระบบ" }).click();

    await expect(page).toHaveURL(/\/my-loans/);
    await expect(page.locator('[data-slot="my-loans-page"]')).toBeVisible();
  });

  test("student พยายามเข้าหน้า backoffice /dashboard → redirect กลับ /my-loans", async ({
    page,
  }) => {
    const { member } = loadFixtures();
    await page.goto("/login");
    await page.locator("#login-email").fill(member.email);
    await page.locator("#login-password").fill(MEMBER_PASSWORD);
    await page.getByRole("button", { name: "เข้าสู่ระบบ" }).click();
    await expect(page).toHaveURL(/\/my-loans/);

    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/my-loans/);
  });
});
