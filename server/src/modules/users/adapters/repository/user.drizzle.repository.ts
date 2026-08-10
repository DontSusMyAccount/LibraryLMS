import "reflect-metadata";

import { asc, count, eq, ilike, or } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { inject, injectable } from "tsyringe";

import { users } from "../../../../infrastructure/database/schema";
import type { MemberType, Paginated, UserRecord } from "../../../../shared";
import { TOKENS } from "../../../tokens";
import type { IUserRepository } from "../../applications/ports/user.repository";

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

  async searchByName(
    query: string,
    { page, limit }: { page: number; limit: number },
  ): Promise<Paginated<UserRecord>> {
    const pattern = `%${escapeLikePattern(query)}%`;
    const whereCondition = or(
      ilike(users.fullName, pattern),
      ilike(users.studentOrStaffId, pattern),
    );

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
