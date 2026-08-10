import "reflect-metadata";

import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { inject, injectable } from "tsyringe";

import { auditLogs } from "../../../../infrastructure/database/schema";
import type { AuditLog } from "../../../../shared";
import { TOKENS } from "../../../tokens";
import type {
  IAuditRepository,
  IWriteAuditLogInput,
} from "../../applications/ports/audit.repository";

type AuditLogRow = typeof auditLogs.$inferSelect;

function toAuditLog(row: AuditLogRow): AuditLog {
  return {
    id: row.id,
    userId: row.userId ?? undefined,
    action: row.action,
    entityType: row.entityType,
    entityId: row.entityId ?? undefined,
    metadata: row.metadata ?? undefined,
    createdAt: row.createdAt.toISOString(),
  };
}

@injectable()
export class DrizzleAuditRepository implements IAuditRepository {
  constructor(@inject(TOKENS.Db) private readonly db: PostgresJsDatabase) {}

  async record(input: IWriteAuditLogInput): Promise<AuditLog> {
    const rows = await this.db
      .insert(auditLogs)
      .values({
        userId: input.userId,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        metadata: input.metadata,
      })
      .returning();
    return toAuditLog(rows[0]!);
  }
}
