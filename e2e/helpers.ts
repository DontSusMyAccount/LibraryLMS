import { readFileSync } from "node:fs";
import path from "node:path";

import { expect, type Page } from "@playwright/test";

import type { E2EFixtures } from "../server/src/e2e/fixtures";

const ADMIN_EMAIL = "admin@library.local";
const ADMIN_PASSWORD = "Admin@1234";

const FIXTURES_PATH = path.resolve(process.cwd(), "e2e", ".fixtures.json");

export function loadFixtures(): E2EFixtures {
  const raw = readFileSync(FIXTURES_PATH, "utf8");
  return JSON.parse(raw) as E2EFixtures;
}

export async function loginAsAdmin(page: Page): Promise<void> {
  await page.goto("/login");
  await page.locator("#login-email").fill(ADMIN_EMAIL);
  await page.locator("#login-password").fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "เข้าสู่ระบบ" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

export async function loginAsAdminAndVisit(page: Page, pathname: string): Promise<void> {
  await loginAsAdmin(page);
  await page.goto(pathname);
}
