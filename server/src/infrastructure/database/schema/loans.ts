import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  numeric,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { bookCopies } from "./book-copies";
import { courseReserves } from "./course-reserves";
import { loanStatusEnum } from "./enums";
import { users } from "./users";

export const loans = pgTable(
  "loans",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    copyId: uuid("copy_id")
      .notNull()
      .references(() => bookCopies.id, { onDelete: "restrict" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    courseReserveId: uuid("course_reserve_id").references(() => courseReserves.id, {
      onDelete: "set null",
    }),
    borrowedAt: timestamp("borrowed_at", { withTimezone: true }).notNull().defaultNow(),
    dueAt: timestamp("due_at", { withTimezone: true }).notNull(),
    returnedAt: timestamp("returned_at", { withTimezone: true }),
    status: loanStatusEnum("status").notNull().default("active"),
    renewedCount: integer("renewed_count").notNull().default(0),
    recalledAt: timestamp("recalled_at", { withTimezone: true }),
    loanPeriodDays: integer("loan_period_days").notNull().default(14),
    dailyFineRate: numeric("daily_fine_rate", { precision: 10, scale: 2 })
      .notNull()
      .default("5.00"),
    checkedOutBy: uuid("checked_out_by").references(() => users.id, { onDelete: "set null" }),
    checkedInBy: uuid("checked_in_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_loans_user").on(table.userId),
    index("idx_loans_copy").on(table.copyId),
    index("idx_loans_status_due").on(table.status, table.dueAt),
    index("idx_loans_course_reserve").on(table.courseReserveId),
    uniqueIndex("uq_loans_active_copy")
      .on(table.copyId)
      .where(sql`${table.status} = 'active'`),
    check("chk_loans_renewed_count", sql`${table.renewedCount} >= 0`),
    check("chk_loans_loan_period_days", sql`${table.loanPeriodDays} > 0`),
    check("chk_loans_daily_fine_rate", sql`${table.dailyFineRate} >= 0`),
    check("chk_loans_due_after_borrow", sql`${table.dueAt} > ${table.borrowedAt}`),
    check(
      "chk_loans_returned_after_borrow",
      sql`${table.returnedAt} IS NULL OR ${table.returnedAt} >= ${table.borrowedAt}`,
    ),
  ],
);
