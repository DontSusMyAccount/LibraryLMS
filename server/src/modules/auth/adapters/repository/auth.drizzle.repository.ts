import "reflect-metadata";

import { eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { inject, injectable } from "tsyringe";

import type { MemberType, UserRecord } from "../../../../shared";
import { TOKENS } from "../../../tokens";
import { users } from "../../../../infrastructure/database/schema";
import type { IAuthRepository } from "../../applications/ports/auth.repository";

@injectable()
export class DrizzleAuthRepository implements IAuthRepository {
  constructor(@inject(TOKENS.Db) private readonly db: PostgresJsDatabase) {}

  async findByEmail(email: string): Promise<UserRecord | null> {
    const rows = await this.db.select().from(users).where(eq(users.email, email)).limit(1);
    const row = rows[0];
    if (!row) {
      return null;
    }

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
}
