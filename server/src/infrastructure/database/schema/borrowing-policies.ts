import { sql } from "drizzle-orm";
import {
  check,
  integer,
  numeric,
  pgTable,
  timestamp,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { userRoleEnum } from "./enums";

export const borrowingPolicies = pgTable(
  "borrowing_policies",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    role: userRoleEnum("role").notNull(),
    memberType: varchar("member_type", { length: 20 }).notNull().default("general"),
    maxActiveLoans: integer("max_active_loans").notNull().default(5),
    loanPeriodDays: integer("loan_period_days").notNull().default(14),
    maxRenewals: integer("max_renewals").notNull().default(2),
    gracePeriodDays: integer("grace_period_days").notNull().default(3),
    dailyFineRate: numeric("daily_fine_rate", { precision: 10, scale: 2 })
      .notNull()
      .default("5.00"),
    maxUnpaidFine: numeric("max_unpaid_fine", { precision: 10, scale: 2 })
      .notNull()
      .default("100.00"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("uq_borrowing_policies_role_member_type").on(table.role, table.memberType),
    check(
      "chk_borrowing_policies_member_type",
      sql`${table.memberType} IN ('general', 'undergraduate', 'graduate')`,
    ),
    check("chk_borrowing_policies_max_active_loans", sql`${table.maxActiveLoans} >= 0`),
    check("chk_borrowing_policies_loan_period_days", sql`${table.loanPeriodDays} > 0`),
    check("chk_borrowing_policies_max_renewals", sql`${table.maxRenewals} >= 0`),
    check("chk_borrowing_policies_grace_period_days", sql`${table.gracePeriodDays} >= 0`),
    check("chk_borrowing_policies_daily_fine_rate", sql`${table.dailyFineRate} >= 0`),
    check("chk_borrowing_policies_max_unpaid_fine", sql`${table.maxUnpaidFine} >= 0`),
  ],
);
