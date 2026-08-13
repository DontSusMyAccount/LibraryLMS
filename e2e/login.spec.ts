import { expect, test } from "@playwright/test";

const ADMIN_EMAIL = "admin@library.local";
const ADMIN_PASSWORD = "Admin@1234";

test.describe("เข้าสู่ระบบ", () => {
  test("อีเมล/รหัสผ่านถูกต้อง → เข้าสู่ระบบสำเร็จและไปหน้า dashboard", async ({ page }) => {
    await page.goto("/login");
    await page.locator("#login-email").fill(ADMIN_EMAIL);
    await page.locator("#login-password").fill(ADMIN_PASSWORD);
    await page.getByRole("button", { name: "เข้าสู่ระบบ" }).click();

    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.locator('[data-slot="dashboard-kpis"]')).toBeVisible();
  });

  test("รหัสผ่านผิด → แสดงข้อความผิดพลาดภาษาไทย", async ({ page }) => {
    await page.goto("/login");
    await page.locator("#login-email").fill(ADMIN_EMAIL);
    await page.locator("#login-password").fill("wrong-password");
    await page.getByRole("button", { name: "เข้าสู่ระบบ" }).click();

    await expect(page.locator('[data-slot="login-credentials-error"]')).toHaveText(
      "อีเมลหรือรหัสผ่านไม่ถูกต้อง",
    );
  });

  test("ไม่กรอกอีเมล → แสดงข้อความ validation ภาษาไทย", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: "เข้าสู่ระบบ" }).click();

    await expect(page.locator('[data-slot="login-email-error"]')).toHaveText("กรุณากรอกอีเมล");
  });
});
