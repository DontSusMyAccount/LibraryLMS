import "reflect-metadata";

import { and, asc, count, eq, ilike, or, type SQL } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { inject, injectable } from "tsyringe";

import { DomainConflictError, DomainNotFoundError } from "../../../../domains/errors";
import { branches, users } from "../../../../infrastructure/database/schema";
import type { MemberType, Paginated, UserRecord } from "../../../../shared";
import { TOKENS } from "../../../tokens";
import {
  type CreateUserInput,
  type IUserRepository,
  type SearchUsersOptions,
  type UpdateUserInput,
} from "../../applications/ports/user.repository";

const { PostgresError } = postgres;

const DUPLICATE_EMAIL_MESSAGE = "อีเมลนี้ถูกใช้งานแล้ว";
const DUPLICATE_ID_MESSAGE = "รหัสนักศึกษา/พนักงานนี้ถูกใช้งานแล้ว";
const USER_NOT_FOUND_MESSAGE = "ไม่พบสมาชิกที่ค้นหา";

const UNIQUE_VIOLATION_CODE = "23505";
const STUDENT_OR_STAFF_ID_UNIQUE_CONSTRAINT = "users_student_or_staff_id_unique";

type UserRow = typeof users.$inferSelect;

function toUserRecord(row: UserRow): UserRecord {
  return {
    id: row.id,
    email: row.email,
    passwordHash: row.passwordHash,
    fullName: row.fullName,
    role: row.role,
    memberType: row.memberType as MemberType,
    studentOrStaffId: row.studentOrStaffId ?? undefined,
    phone: row.phone ?? undefined,
    branchId: row.branchId ?? undefined,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

@injectable()
export class DrizzleUserRepository implements IUserRepository {
  constructor(@inject(TOKENS.Db) private readonly db: PostgresJsDatabase) {}

  async findByStudentOrStaffId(studentOrStaffId: string): Promise<UserRecord | null> {
    const rows = await this.db
      .select()
      .from(users)
      .where(eq(users.studentOrStaffId, studentOrStaffId))
      .limit(1);
    const row = rows[0];
    return row ? toUserRecord(row) : null;
  }

  async findByEmail(email: string): Promise<UserRecord | null> {
    const rows = await this.db.select().from(users).where(eq(users.email, email)).limit(1);
    const row = rows[0];
    return row ? toUserRecord(row) : null;
  }

  async findById(id: string): Promise<UserRecord | null> {
    const rows = await this.db.select().from(users).where(eq(users.id, id)).limit(1);
    const row = rows[0];
    return row ? toUserRecord(row) : null;
  }

  async create(input: CreateUserInput): Promise<UserRecord> {
    try {
      const rows = await this.db
        .insert(users)
        .values({
          email: input.email,
          passwordHash: input.passwordHash,
          fullName: input.fullName,
          role: input.role,
          memberType: input.memberType,
          studentOrStaffId: input.studentOrStaffId,
          phone: input.phone,
          branchId: input.branchId,
          status: input.status,
        })
        .returning();
      return toUserRecord(rows[0]!);
    } catch (error) {
      if (error instanceof PostgresError && error.code === UNIQUE_VIOLATION_CODE) {
        const message =
          error.constraint_name === STUDENT_OR_STAFF_ID_UNIQUE_CONSTRAINT
            ? DUPLICATE_ID_MESSAGE
            : DUPLICATE_EMAIL_MESSAGE;
        throw new DomainConflictError(message);
      }
      throw error;
    }
  }

  async update(id: string, input: UpdateUserInput): Promise<UserRecord> {
    const rows = await this.db
      .update(users)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    const row = rows[0];
    if (!row) {
      throw new DomainNotFoundError(USER_NOT_FOUND_MESSAGE);
    }
    return toUserRecord(row);
  }

  async branchExists(id: string): Promise<boolean> {
    const rows = await this.db
      .select({ id: branches.id })
      .from(branches)
      .where(eq(branches.id, id))
      .limit(1);
    return rows.length > 0;
  }

  async searchByKeyword(
    query: string,
    { page, limit, role, status }: SearchUsersOptions,
  ): Promise<Paginated<UserRecord>> {
    const conditions: SQL[] = [];
    const keyword = query.trim();

    if (keyword) {
      const pattern = `%${escapeLikePattern(keyword)}%`;
      conditions.push(
        or(
          ilike(users.fullName, pattern),
          ilike(users.email, pattern),
          ilike(users.studentOrStaffId, pattern),
        )!,
      );
    }
    if (role) {
      conditions.push(eq(users.role, role));
    }
    if (status) {
      conditions.push(eq(users.status, status));
    }

    const whereCondition = conditions.length === 0 ? undefined : and(...conditions);

    const totalRows = await this.db.select({ value: count() }).from(users).where(whereCondition);
    const total = totalRows[0]?.value ?? 0;

    const rows = await this.db
      .select()
      .from(users)
      .where(whereCondition)
      .orderBy(asc(users.fullName), asc(users.email))
      .limit(limit)
      .offset((page - 1) * limit);

    return {
      data: rows.map(toUserRecord),
      total,
      page,
      limit,
      totalPages: total === 0 ? 0 : Math.ceil(total / limit),
    };
  }
}
