import { expect, test } from "@playwright/test";

import { loadFixtures, loginAsAdminAndVisit } from "./helpers";

const MEMBERS_TABLE = '[data-slot="members-table"]';
const MEMBER_FORM = '[data-slot="member-dialog-form"]';
const DIALOG_TITLE = '[data-slot="dialog-title"]';

function uniqueEmail(): string {
  const randomPart = Math.random().toString(36).slice(2, 8);
  return `e2e-${Date.now().toString(36)}-${randomPart}@test.local`;
}

function uniqueFullName(): string {
  const randomPart = Math.random().toString(36).slice(2, 8);
  return `สมาชิกทดสอบ E2E ${Date.now().toString(36)}-${randomPart}`;
}

test.describe("จัดการสมาชิก", () => {
  test("ค้นหาสมาชิกที่ seed ไว้ → เพิ่มสมาชิกใหม่ผ่าน dialog → ค้นหาแล้วพบ", async ({ page }) => {
    const fixtures = loadFixtures();
    const email = uniqueEmail();
    const fullName = uniqueFullName();

    await loginAsAdminAndVisit(page, "/members");
    await expect(page.locator('[data-slot="members-page"]')).toBeVisible();

    await page.getByLabel("ค้นหาสมาชิก").fill(fixtures.member.fullName);
    await expect(page.locator(MEMBERS_TABLE).locator("tbody tr")).toHaveCount(1);
    await expect(page.locator(MEMBERS_TABLE)).toContainText(fixtures.member.fullName);

    await page.getByRole("button", { name: "เพิ่มสมาชิก" }).first().click();
    await expect(page.locator(DIALOG_TITLE)).toHaveText("เพิ่มสมาชิก");

    await page.locator("#member-email").fill(email);
    await page.locator("#member-fullname").fill(fullName);
    await page.locator("#member-role").selectOption({ value: "student" });
    await page.locator("#member-password").fill("Test@1234");
    await page.locator("#member-confirm-password").fill("Test@1234");
    await page.locator(MEMBER_FORM).getByRole("button", { name: "เพิ่มสมาชิก" }).click();

    await expect(page.locator(DIALOG_TITLE)).not.toBeVisible();

    await page.getByLabel("ค้นหาสมาชิก").fill(fullName);
    await expect(page.locator(MEMBERS_TABLE)).toContainText(fullName);
  });

  test("กรอกข้อมูลไม่ถูกต้อง → แสดง validation ภาษาไทย", async ({ page }) => {
    await loginAsAdminAndVisit(page, "/members");
    await page.getByRole("button", { name: "เพิ่มสมาชิก" }).first().click();

    await page.locator(MEMBER_FORM).getByRole("button", { name: "เพิ่มสมาชิก" }).click();
    await expect(page.locator('[data-slot="member-email-error"]')).toHaveText("กรุณากรอกอีเมล");
    await expect(page.locator('[data-slot="member-fullname-error"]')).toHaveText(
      "กรุณากรอกชื่อ-นามสกุล",
    );

    await page.locator("#member-email").fill(`e2e-${Date.now().toString(36)}-short@test.local`);
    await page.locator("#member-password").fill("short");
    await page.locator("#member-confirm-password").fill("short");
    await page.locator(MEMBER_FORM).getByRole("button", { name: "เพิ่มสมาชิก" }).click();
    await expect(page.locator('[data-slot="member-password-error"]')).toHaveText(
      "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร",
    );
  });

  test("สร้างสมาชิกแล้วแก้ไขสถานะเป็นระงับ → badge และข้อมูลที่บันทึกอัปเดต", async ({ page }) => {
    const email = uniqueEmail();
    const fullName = uniqueFullName();

    await loginAsAdminAndVisit(page, "/members");
    await expect(page.locator('[data-slot="members-page"]')).toBeVisible();

    await page.getByRole("button", { name: "เพิ่มสมาชิก" }).first().click();
    await page.locator("#member-email").fill(email);
    await page.locator("#member-fullname").fill(fullName);
    await page.locator("#member-role").selectOption({ value: "student" });
    await page.locator("#member-password").fill("Test@1234");
    await page.locator("#member-confirm-password").fill("Test@1234");
    await page.locator(MEMBER_FORM).getByRole("button", { name: "เพิ่มสมาชิก" }).click();
    await expect(page.locator(DIALOG_TITLE)).not.toBeVisible();

    await page.getByLabel("ค้นหาสมาชิก").fill(fullName);
    await expect(page.locator(MEMBERS_TABLE)).toContainText(fullName);

    const row = page.locator(MEMBERS_TABLE).getByRole("row", { name: `แก้ไขสมาชิก ${fullName}` });
    await row.click();

    await expect(page.locator(DIALOG_TITLE)).toHaveText("แก้ไขสมาชิก");
    await expect(page.locator("#member-status")).toBeVisible();
    await expect(page.locator("#member-password")).toHaveCount(0);

    await page.locator("#member-status").selectOption({ value: "suspended" });
    await page.locator(MEMBER_FORM).getByRole("button", { name: "บันทึกการแก้ไข" }).click();
    await expect(page.locator(DIALOG_TITLE)).not.toBeVisible();

    const updatedRow = page
      .locator(MEMBERS_TABLE)
      .getByRole("row", { name: `แก้ไขสมาชิก ${fullName}` });
    await expect(updatedRow.getByText("ระงับ")).toBeVisible();

    await updatedRow.click();
    await expect(page.locator("#member-status")).toHaveValue("suspended");
  });
});
