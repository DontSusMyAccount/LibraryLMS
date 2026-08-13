import { expect, test } from "@playwright/test";

import { loadFixtures, loginAsAdmin } from "./helpers";

const MEMBER_PASSWORD = "Member@1234";

test.describe("โปรไฟล์และการตั้งค่า (admin)", () => {
  test("เปิดเมนูบัญชี → คลิก โปรไฟล์ของฉัน → เห็นข้อมูลโปรไฟล์", async ({ page }) => {
    await loginAsAdmin(page);

    await page.getByRole("button", { name: "แอดมินห้องสมุด" }).click();
    await page.getByRole("menuitem", { name: "โปรไฟล์ของฉัน" }).click();

    await expect(page).toHaveURL(/\/profile/);
    await expect(page.locator('[data-slot="profile-page"]')).toBeVisible();
    await expect(page.locator('[data-slot="profile-fullname"]')).toHaveText("ผู้ดูแลระบบ");
    await expect(page.locator('[data-slot="profile-email"]')).toHaveText("admin@library.local");
    await expect(page.locator('[data-slot="profile-role"]')).toHaveText("แอดมิน");
    await expect(page.locator('[data-slot="profile-status"]')).toHaveText("ใช้งาน");
  });

  test("เปิดเมนูบัญชี → คลิก การตั้งค่า → เห็นธีมสลับโหมด", async ({ page }) => {
    await loginAsAdmin(page);

    await page.getByRole("button", { name: "แอดมินห้องสมุด" }).click();
    await page.getByRole("menuitem", { name: "การตั้งค่า" }).click();

    await expect(page).toHaveURL(/\/settings/);
    await expect(page.locator('[data-slot="settings-page"]')).toBeVisible();
    await expect(
      page.locator('[data-slot="settings-page"]').getByRole("button", { name: /สลับเป็นโหมด/ }),
    ).toBeVisible();
  });

  test("ออกจากระบบจากหน้า /profile → กลับไป /login", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/profile");
    await expect(page.locator('[data-slot="profile-page"]')).toBeVisible();

    await page.getByRole("button", { name: "แอดมินห้องสมุด" }).click();
    await page.getByRole("menuitem", { name: "ออกจากระบบ" }).click();

    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe("route guard หน้าโปรไฟล์/ตั้งค่า", () => {
  test("ยังไม่ล็อกอิน → เข้า /profile ถูกเปลี่ยนเส้นทางไป /login", async ({ page }) => {
    await page.goto("/profile");
    await expect(page).toHaveURL(/\/login/);
  });

  test("ยังไม่ล็อกอิน → เข้า /settings ถูกเปลี่ยนเส้นทางไป /login", async ({ page }) => {
    await page.goto("/settings");
    await expect(page).toHaveURL(/\/login/);
  });

  test("student เข้า /profile และ /settings → redirect กลับ /my-loans", async ({ page }) => {
    const { member } = loadFixtures();
    await page.goto("/login");
    await page.locator("#login-email").fill(member.email);
    await page.locator("#login-password").fill(MEMBER_PASSWORD);
    await page.getByRole("button", { name: "เข้าสู่ระบบ" }).click();
    await expect(page).toHaveURL(/\/my-loans/);

    await page.goto("/profile");
    await expect(page).toHaveURL(/\/my-loans/);

    await page.goto("/settings");
    await expect(page).toHaveURL(/\/my-loans/);
  });
});
