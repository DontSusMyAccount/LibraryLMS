import type { AuditLog } from "../../../../shared";

export const auditRepositoryToken = Symbol("AuditRepository").toString();

export interface IWriteAuditLogInput {
  userId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  metadata?: unknown;
}

export interface IAuditRepository {
  record(input: IWriteAuditLogInput): Promise<AuditLog>;
}
