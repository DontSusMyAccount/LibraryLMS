import { readFileSync } from "node:fs";
import path from "node:path";

import bcrypt from "bcryptjs";
import { count, eq } from "drizzle-orm";

import {
  borrowingPolicies,
  categories,
  systemSettings,
  users,
} from "./infrastructure/database/schema";
import { createDatabaseClient } from "./libs/db";
import { parseEnv } from "./libs/env";

const DEMO_ADMIN_EMAIL = "admin@library.local";
const DEMO_ADMIN_NAME = "ผู้ดูแลระบบ";

/**
 * รหัสผ่าน admin ตัวอย่าง — ไม่ hardcode ในโค้ดอีกต่อไป (เดิม Admin@1234 เปิดใน
 * sidebar + audit docs): อ่านจาก env SEED_ADMIN_PASSWORD; ถ้าไม่ตั้งจะสุ่มใหม่
 * แล้ว print ออกมา 1 ครั้ง (CI/e2e ตั้งค่านี้ให้ชัดเจน)
 */
function resolveAdminPassword(): string {
  const fromEnv = process.env.SEED_ADMIN_PASSWORD?.trim();
  if (fromEnv) {
    return fromEnv;
  }
  // 12 ตัวอักษร ผสม upper/lower/digit/symbol — กันเครื่องมือจำแนกง่ายเกิน
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%";
  const random = Array.from(
    { length: 12 },
    () => chars[Math.floor(Math.random() * chars.length)],
  ).join("");
  console.warn(
    "[seed] ไม่พบ SEED_ADMIN_PASSWORD — สุ่มรหัสผ่าน admin ตัวอย่างให้แล้ว " +
      "(รหัสจะแสดงครั้งเดียวด้านล่าง; ตั้ง SEED_ADMIN_PASSWORD เพื่อกำหนดเอง)",
  );
  return random;
}

const TRIGGERS_SQL_PATH = path.resolve(
  import.meta.dir,
  "infrastructure",
  "database",
  "triggers.sql",
);

const SEED_POLICIES: (typeof borrowingPolicies.$inferInsert)[] = [
  {
    role: "admin",
    memberType: "general",
    maxActiveLoans: 50,
    loanPeriodDays: 180,
    maxRenewals: 10,
    gracePeriodDays: 3,
    dailyFineRate: "5.00",
    maxUnpaidFine: "500.00",
  },
  {
    role: "librarian",
    memberType: "general",
    maxActiveLoans: 30,
    loanPeriodDays: 90,
    maxRenewals: 6,
    gracePeriodDays: 3,
    dailyFineRate: "5.00",
    maxUnpaidFine: "200.00",
  },
  {
    role: "faculty",
    memberType: "general",
    maxActiveLoans: 20,
    loanPeriodDays: 60,
    maxRenewals: 6,
    gracePeriodDays: 3,
    dailyFineRate: "5.00",
    maxUnpaidFine: "200.00",
  },
  {
    role: "staff",
    memberType: "general",
    maxActiveLoans: 10,
    loanPeriodDays: 30,
    maxRenewals: 4,
    gracePeriodDays: 3,
    dailyFineRate: "5.00",
    maxUnpaidFine: "200.00",
  },
  {
    role: "student",
    memberType: "undergraduate",
    maxActiveLoans: 5,
    loanPeriodDays: 14,
    maxRenewals: 2,
    gracePeriodDays: 3,
    dailyFineRate: "5.00",
    maxUnpaidFine: "100.00",
  },
  {
    role: "student",
    memberType: "graduate",
    maxActiveLoans: 8,
    loanPeriodDays: 21,
    maxRenewals: 3,
    gracePeriodDays: 3,
    dailyFineRate: "5.00",
    maxUnpaidFine: "100.00",
  },
];

const SEED_CATEGORIES: (typeof categories.$inferInsert)[] = [
  { name: "คอมพิวเตอร์ วิทยาการสารสนเทศ" },
  { name: "ปรัชญา จิตวิทยา" },
  { name: "ศาสนา" },
  { name: "สังคมศาสตร์" },
  { name: "ภาษา" },
  { name: "วิทยาศาสตร์" },
  { name: "เทคโนโลยี วิศวกรรม" },
  { name: "ศิลปะ นันทนาการ" },
  { name: "วรรณกรรม" },
  { name: "ประวัติศาสตร์ ภูมิศาสตร์" },
];

const SEED_SYSTEM_SETTINGS: (typeof systemSettings.$inferInsert)[] = [
  { key: "reminder_days_before_due", value: 2, description: "แจ้งเตือนก่อนครบกำหนดคืนกี่วัน" },
  {
    key: "overdue_reminder_interval_days",
    value: 1,
    description: "แจ้งเตือน overdue ซ้ำทุกกี่วัน",
  },
  { key: "reservation_pickup_days", value: 3, description: "กำหนดมารับหนังสือที่จองภายในกี่วัน" },
  { key: "max_active_reservations", value: 5, description: "จองพร้อมกันได้สูงสุดกี่รายการ" },
  {
    key: "allow_renew_with_hold",
    value: false,
    description: "อนุญาตต่ออายุเมื่อมีคนจองคิวอยู่หรือไม่",
  },
  { key: "recall_due_shorten_days", value: 7, description: "recall ย่นวันครบกำหนดเหลืออีกกี่วัน" },
];

async function main(): Promise<void> {
  const env = parseEnv(process.env as Record<string, string | undefined>);
  const { client, db } = createDatabaseClient(env.DATABASE_URL);

  try {
    const triggersSql = readFileSync(TRIGGERS_SQL_PATH, "utf8");
    await client.unsafe(triggersSql);
    console.log("[seed] ใช้ triggers.sql (updated_at trigger) เรียบร้อย");
    const hasPolicies = await db
      .select({ id: borrowingPolicies.id })
      .from(borrowingPolicies)
      .limit(1);
    if (hasPolicies.length === 0) {
      await db.insert(borrowingPolicies).values(SEED_POLICIES);
      console.log(`[seed] เพิ่ม borrowing_policies ${SEED_POLICIES.length} นโยบาย`);
    } else {
      console.log("[seed] borrowing_policies มีข้อมูลอยู่แล้ว — ข้าม");
    }

    const hasCategories = await db.select({ id: categories.id }).from(categories).limit(1);
    if (hasCategories.length === 0) {
      await db.insert(categories).values(SEED_CATEGORIES);
      console.log(`[seed] เพิ่ม categories ${SEED_CATEGORIES.length} หมวด (Dewey)`);
    } else {
      console.log("[seed] categories มีข้อมูลอยู่แล้ว — ข้าม");
    }

    const hasSettings = await db.select({ id: systemSettings.id }).from(systemSettings).limit(1);
    if (hasSettings.length === 0) {
      await db.insert(systemSettings).values(SEED_SYSTEM_SETTINGS);
      console.log(`[seed] เพิ่ม system_settings ${SEED_SYSTEM_SETTINGS.length} รายการ`);
    } else {
      console.log("[seed] system_settings มีข้อมูลอยู่แล้ว — ข้าม");
    }

    const existingAdmin = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, DEMO_ADMIN_EMAIL))
      .limit(1);
    if (existingAdmin.length === 0) {
      const adminPassword = resolveAdminPassword();
      const passwordHash = await bcrypt.hash(adminPassword, 12);
      await db.insert(users).values({
        email: DEMO_ADMIN_EMAIL,
        passwordHash,
        fullName: DEMO_ADMIN_NAME,
        role: "admin",
      });
      console.log(`[seed] เพิ่มผู้ดูแลระบบตัวอย่าง ${DEMO_ADMIN_EMAIL}`);
      console.log(`[seed] รหัสผ่าน admin ตัวอย่าง: ${adminPassword}`);
    } else {
      console.log("[seed] ผู้ดูแลระบบตัวอย่างมีอยู่แล้ว — ข้าม");
    }

    const [{ value: policyCount }] = await db.select({ value: count() }).from(borrowingPolicies);
    console.log(`[seed] smoke: borrowing_policies ทั้งหมด ${policyCount} แถว`);
  } finally {
    await client.end();
  }
}

main().catch((error: unknown) => {
  console.error("[seed] ผิดพลาด:", error);
  process.exit(1);
});
