import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import bcrypt from "bcryptjs";
import { inArray, or } from "drizzle-orm";

import { bookCopies, books, loans, reservations, users } from "../infrastructure/database/schema";
import { createDatabaseClient } from "../libs/db";

/**
 * E2E fixtures script — รันด้วย `bun run server/src/e2e/fixtures.ts`
 * bun โหลด .env เอง (เหมือน db:seed) จึงไม่ต้องส่ง env จากภายนอก
 * สคริปต์นี้ต้องการแค่ DATABASE_URL (ไม่ต้องใช้ AUTH_SECRET/INTERNAL_SECRET)
 *
 * - ไม่มี args → seed ข้อมูล (member + book + copy + reservation waiting)
 * - `--cleanup` → ลบข้อมูลที่ seed ไว้ (อิงไฟล์ fixtures.json)
 *
 * เขียนผลลัพธ์เป็น JSON ที่ e2e/helpers.ts อ่านเพื่อใช้ใน spec
 */

const FIXTURES_PATH = path.resolve(import.meta.dir, "..", "..", "..", "e2e", ".fixtures.json");
const E2E_ENV_PATH = path.resolve(import.meta.dir, "..", "..", "..", ".env.e2e");

/** โหลด .env.e2e (DATABASE_URL จริงสำหรับ e2e) — ทับค่า placeholder จาก .env ที่ bun โหลดไว้ */
function loadE2eEnv(): void {
  let content: string;
  try {
    content = readFileSync(E2E_ENV_PATH, "utf8");
  } catch {
    throw new Error(`ไม่พบ ${E2E_ENV_PATH} — เติม DATABASE_URL จริงก่อนรัน e2e`);
  }
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }
    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();
    if (key) {
      process.env[key] = value;
    }
  }
}

function databaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url || !url.startsWith("postgres")) {
    throw new Error("DATABASE_URL ไม่ถูกต้อง — ตรวจสอบ .env.e2e (ต้องเริ่มต้นด้วย postgres://)");
  }
  return url;
}

export interface E2EFixtures {
  member: { id: string; fullName: string; studentOrStaffId: string; email: string };
  book: { id: string; title: string; isbn: string };
  copy: { id: string; copyCode: string };
  reservation: { id: string };
}

interface FixtureRows {
  userIds: string[];
  bookIds: string[];
  copyIds: string[];
  reservationIds: string[];
}

function uniqueSuffix(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

function uniqueIsbn(): string {
  const randomPart = Math.floor(Math.random() * 10_000_000_000)
    .toString()
    .padStart(10, "0");
  return `978${randomPart}`;
}

function loadExistingFixtures(): E2EFixtures | null {
  try {
    return JSON.parse(readFileSync(FIXTURES_PATH, "utf8")) as E2EFixtures;
  } catch {
    return null;
  }
}

function buildRows(fixtures: E2EFixtures): FixtureRows {
  return {
    userIds: [fixtures.member.id],
    bookIds: [fixtures.book.id],
    copyIds: [fixtures.copy.id],
    reservationIds: [fixtures.reservation.id],
  };
}

async function cleanup(db: Awaited<ReturnType<typeof createDatabaseClient>>["db"]): Promise<void> {
  const fixtures = loadExistingFixtures();
  if (!fixtures) {
    console.log("[e2e-fixtures] ไม่พบ .fixtures.json — ไม่มีอะไรให้ล้าง");
    return;
  }
  const rows = buildRows(fixtures);

  // ลบ loans ของสมาชิก/สำเนา fixtures ก่อนเสมอ (สเปก circulation สร้าง loan จากการยืมจริง
  // → copy ids ไม่อยู่ใน .fixtures.json ต้องลบอิง userId/copyId แทน)
  if (rows.userIds.length > 0 || rows.copyIds.length > 0) {
    await db
      .delete(loans)
      .where(or(inArray(loans.userId, rows.userIds), inArray(loans.copyId, rows.copyIds)));
  }
  if (rows.reservationIds.length > 0) {
    await db.delete(reservations).where(inArray(reservations.id, rows.reservationIds));
  }
  if (rows.copyIds.length > 0) {
    await db.delete(bookCopies).where(inArray(bookCopies.id, rows.copyIds));
  }
  if (rows.bookIds.length > 0) {
    await db.delete(books).where(inArray(books.id, rows.bookIds));
  }
  if (rows.userIds.length > 0) {
    await db.delete(users).where(inArray(users.id, rows.userIds));
  }
  console.log("[e2e-fixtures] ล้างข้อมูล seed เรียบร้อย");
}

async function seed(): Promise<void> {
  const suffix = uniqueSuffix();
  const memberFullName = `สมาชิก E2E ${suffix}`;
  const memberStudentId = `E2E-${suffix}`;
  const memberEmail = `e2e-${suffix}@library.test`;
  const bookTitle = `หนังสือ E2E ${suffix}`;
  const bookAuthor = "ผู้แต่ง E2E";
  const isbn = uniqueIsbn();
  const copyCode = `COPY-${suffix}`;

  const { client, db } = createDatabaseClient(databaseUrl());

  try {
    const [{ id: memberId }] = await db
      .insert(users)
      .values({
        email: memberEmail,
        passwordHash: bcrypt.hashSync("Member@1234", 10),
        fullName: memberFullName,
        role: "student",
        memberType: "undergraduate",
        studentOrStaffId: memberStudentId,
        status: "active",
      })
      .returning({ id: users.id });

    const [{ id: bookId }] = await db
      .insert(books)
      .values({ isbn, title: bookTitle, author: bookAuthor })
      .returning({ id: books.id });

    const [{ id: copyId }] = await db
      .insert(bookCopies)
      .values({ bookId, copyCode, status: "available" })
      .returning({ id: bookCopies.id });

    const [{ id: reservationId }] = await db
      .insert(reservations)
      .values({ bookId, userId: memberId, status: "waiting" })
      .returning({ id: reservations.id });

    const fixtures: E2EFixtures = {
      member: {
        id: memberId,
        fullName: memberFullName,
        studentOrStaffId: memberStudentId,
        email: memberEmail,
      },
      book: { id: bookId, title: bookTitle, isbn },
      copy: { id: copyId, copyCode },
      reservation: { id: reservationId },
    };
    writeFileSync(FIXTURES_PATH, JSON.stringify(fixtures, null, 2), "utf8");
    console.log(`[e2e-fixtures] seed สำเร็จ → ${FIXTURES_PATH}`);
  } finally {
    await client.end();
  }
}

const args = process.argv.slice(2);

async function main(): Promise<void> {
  loadE2eEnv();

  if (args.includes("--cleanup")) {
    const { client, db } = createDatabaseClient(databaseUrl());
    try {
      await cleanup(db);
    } finally {
      await client.end();
    }
    return;
  }

  const existing = loadExistingFixtures();
  if (existing) {
    console.log("[e2e-fixtures] พบ fixtures เดิม — ล้างก่อน seed ใหม่");
    const { client, db } = createDatabaseClient(databaseUrl());
    try {
      await cleanup(db);
    } finally {
      await client.end();
    }
  }
  await seed();
}

main().catch((error: unknown) => {
  console.error("[e2e-fixtures] ผิดพลาด:", error);
  process.exit(1);
});
