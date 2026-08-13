import { sql } from "drizzle-orm";
import { boolean, check, index, numeric, pgTable, timestamp, uuid } from "drizzle-orm/pg-core";

import { fineReasonEnum } from "./enums";
import { loans } from "./loans";
import { users } from "./users";

export const fines = pgTable(
  "fines",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    loanId: uuid("loan_id").references(() => loans.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
    reason: fineReasonEnum("reason").notNull(),
    paid: boolean("paid").notNull().default(false),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    waived: boolean("waived").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_fines_user_paid").on(table.userId, table.paid),
    index("idx_fines_loan").on(table.loanId),
    check("chk_fines_amount", sql`${table.amount} >= 0`),
    check("chk_fines_paid_has_paid_at", sql`NOT ${table.paid} OR ${table.paidAt} IS NOT NULL`),
  ],
);
