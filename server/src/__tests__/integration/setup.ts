import bcrypt from "bcryptjs";
import { inArray } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { Elysia } from "elysia";
import type { Sql } from "postgres";

import { toHttpError } from "../../libs/http-error.factory";
import { createDatabaseClient } from "../../libs/db";
import { parseEnv } from "../../libs/env";
import { createAppModule } from "../../modules/app.module";
import {
  bookCopies,
  books,
  loans,
  reservations,
  users,
} from "../../infrastructure/database/schema";

const ADMIN_EMAIL = "admin@library.local";
const ADMIN_PASSWORD = "Admin@1234";

export interface HttpResponse {
  status: number;
  body: Record<string, unknown> | null;
}

export interface TestRowIds {
  loanIds: string[];
  reservationIds: string[];
  copyIds: string[];
  bookIds: string[];
  userIds: string[];
}

export interface TestContext {
  db: PostgresJsDatabase;
  client: Sql;
  request: (path: string, init?: RequestInit) => Promise<HttpResponse>;
  adminToken: string;
  adminUser: { id: string; email: string; role: string };
  unique: (prefix: string) => string;
  rows: TestRowIds;
  createMember: (prefix: string) => Promise<{ id: string; email: string }>;
}

let seq = 0;

function nextUnique(prefix: string): string {
  seq += 1;
  return `${prefix}-${Date.now().toString(36)}-${seq}`;
}

export async function bootstrapTestContext(): Promise<TestContext> {
  const env = parseEnv(process.env as Record<string, string | undefined>);
  const { client, db } = createDatabaseClient(env.DATABASE_URL);

  const app = new Elysia()
    .onError(({ code, error, set }) => {
      const httpError = toHttpError(error, code);
      set.status = httpError.statusCode;
      return httpError.body;
    })
    .use(
      createAppModule({
        db,
        jwtSecret: env.JWT_SECRET,
        internalSecret: env.INTERNAL_SECRET,
        storageDriver: env.storageDriver,
        uploadRoot: "uploads",
      }),
    );

  async function request(path: string, init?: RequestInit): Promise<HttpResponse> {
    const response = await app.handle(new Request(`http://localhost${path}`, init));
    const body = (await response.json().catch(() => null)) as Record<string, unknown> | null;
    return { status: response.status, body };
  }

  const loginResponse = await request("/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });
  const data = loginResponse.body?.data as {
    token: string;
    user: { id: string; email: string; role: string };
  };
  const adminToken = data.token;

  const rows: TestRowIds = {
    loanIds: [],
    reservationIds: [],
    copyIds: [],
    bookIds: [],
    userIds: [],
  };

  return {
    db,
    client,
    request,
    adminToken,
    adminUser: data.user,
    unique: nextUnique,
    rows,
    async createMember(prefix: string) {
      const email = `${nextUnique(prefix)}@library.test`;
      const [{ id }] = await db
        .insert(users)
        .values({
          email,
          passwordHash: bcrypt.hashSync("Member@1234", 10),
          fullName: "สมาชิกทดสอบ",
          role: "student",
          memberType: "undergraduate",
          status: "active",
        })
        .returning({ id: users.id });
      rows.userIds.push(id);
      return { id, email };
    },
  };
}

export function clearRowIds(ctx: TestContext): void {
  if (!ctx.rows) {
    return;
  }
  ctx.rows.loanIds.length = 0;
  ctx.rows.reservationIds.length = 0;
  ctx.rows.copyIds.length = 0;
  ctx.rows.bookIds.length = 0;
  ctx.rows.userIds.length = 0;
}

export async function cleanupTestRows(ctx: TestContext | undefined): Promise<void> {
  if (!ctx) {
    return;
  }
  const { rows, db } = ctx;
  if (rows.loanIds.length > 0) {
    await db.delete(loans).where(inArray(loans.id, rows.loanIds));
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
  clearRowIds(ctx);
}

export function authHeaders(
  token: string,
  extra: Record<string, string> = {},
): Record<string, string> {
  return { "content-type": "application/json", authorization: `Bearer ${token}`, ...extra };
}

export function uniqueIsbn(ctx: TestContext): string {
  void ctx;
  // 13 หลัก: 978 + 10 หลักสุ่ม — โอกาสชนกับแถวที่เหลือใน DB ต่ำมาก
  const randomPart = Math.floor(Math.random() * 10_000_000_000)
    .toString()
    .padStart(10, "0");
  return `978${randomPart}`;
}

export async function createBookViaApi(
  ctx: TestContext,
  title: string,
  author = "ผู้แต่งทดสอบ",
): Promise<{ id: string; isbn: string }> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const isbn = uniqueIsbn(ctx);
    const response = await ctx.request("/catalog/books", {
      method: "POST",
      headers: authHeaders(ctx.adminToken),
      body: JSON.stringify({ isbn, title, author }),
    });
    if (response.status === 200) {
      const id = (response.body?.data as { id: string }).id;
      ctx.rows.bookIds.push(id);
      return { id, isbn };
    }
    if (response.status !== 409) {
      throw new Error(`createBook ผิดพลาด: ${response.status} ${JSON.stringify(response.body)}`);
    }
  }
  throw new Error(`createBook ผิดพลาด: ISBN ชนซ้ำ 3 ครั้ง (${title})`);
}

export async function createCopyViaApi(
  ctx: TestContext,
  bookId: string,
  copyCode: string,
): Promise<{ id: string }> {
  const response = await ctx.request(`/catalog/books/${bookId}/copies`, {
    method: "POST",
    headers: authHeaders(ctx.adminToken),
    body: JSON.stringify({ copyCode }),
  });
  if (response.status !== 200) {
    throw new Error(`createCopy ผิดพลาด: ${response.status} ${JSON.stringify(response.body)}`);
  }
  const id = (response.body?.data as { id: string }).id;
  ctx.rows.copyIds.push(id);
  return { id };
}

export async function getCopyCode(ctx: TestContext, copyId: string): Promise<string> {
  const [row] = await ctx.db
    .select({ copyCode: bookCopies.copyCode })
    .from(bookCopies)
    .where(inArray(bookCopies.id, [copyId]))
    .limit(1);
  if (!row) {
    throw new Error(`ไม่พบสำเนา id=${copyId}`);
  }
  return row.copyCode;
}
