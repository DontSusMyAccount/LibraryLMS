import { index, jsonb, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

import { users } from "./users";

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    action: varchar("action", { length: 100 }).notNull(),
    entityType: varchar("entity_type", { length: 50 }).notNull(),
    entityId: uuid("entity_id"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_audit_logs_entity").on(table.entityType, table.entityId),
    index("idx_audit_logs_created").on(table.createdAt),
  ],
);
