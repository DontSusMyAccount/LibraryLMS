import { expect, test } from "@playwright/test";

import { loadFixtures } from "./helpers";

const MEMBER_PASSWORD = "Member@1234";

test.describe("ออกจากระบบฝั่งผู้ยืม (portal)", () => {
  test("member ล็อกอิน → กดปุ่มออกจากระบบใน header → กลับไป /login", async ({ page }) => {
    const { member } = loadFixtures();
    await page.goto("/login");
    await page.locator("#login-email").fill(member.email);
    await page.locator("#login-password").fill(MEMBER_PASSWORD);
    await page.getByRole("button", { name: "เข้าสู่ระบบ" }).click();
    await expect(page).toHaveURL(/\/my-loans/);
    await expect(page.locator('[data-slot="my-loans-page"]')).toBeVisible();

    await page.getByRole("button", { name: "ออกจากระบบ" }).click();

    await expect(page).toHaveURL(/\/login/);
  });

  test("logout แล้วกลับเข้าหน้า protected → redirect ไป /login (session หายจริง)", async ({
    page,
  }) => {
    const { member } = loadFixtures();
    await page.goto("/login");
    await page.locator("#login-email").fill(member.email);
    await page.locator("#login-password").fill(MEMBER_PASSWORD);
    await page.getByRole("button", { name: "เข้าสู่ระบบ" }).click();
    await expect(page).toHaveURL(/\/my-loans/);

    await page.getByRole("button", { name: "ออกจากระบบ" }).click();
    await expect(page).toHaveURL(/\/login/);

    await page.goto("/my-loans");
    await expect(page).toHaveURL(/\/login/);
  });
});
