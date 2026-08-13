import { sql } from "drizzle-orm";
import { check, index, pgTable, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

import { books } from "./books";
import { branches } from "./branches";
import { reservationStatusEnum } from "./enums";
import { loans } from "./loans";
import { users } from "./users";

export const reservations = pgTable(
  "reservations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    bookId: uuid("book_id")
      .notNull()
      .references(() => books.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    branchId: uuid("branch_id").references(() => branches.id, { onDelete: "set null" }),
    status: reservationStatusEnum("status").notNull().default("waiting"),
    reservedAt: timestamp("reserved_at", { withTimezone: true }).notNull().defaultNow(),
    readyAt: timestamp("ready_at", { withTimezone: true }),
    pickupDeadline: timestamp("pickup_deadline", { withTimezone: true }),
    fulfilledLoanId: uuid("fulfilled_loan_id").references(() => loans.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_reservations_book_status").on(table.bookId, table.status),
    index("idx_reservations_user").on(table.userId),
    index("idx_reservations_branch").on(table.branchId),
    uniqueIndex("uq_reservations_active_user_book")
      .on(table.userId, table.bookId)
      .where(sql`${table.status} IN ('waiting', 'ready', 'suspended')`),
    check(
      "chk_reservations_pickup_after_ready",
      sql`${table.readyAt} IS NULL OR ${table.pickupDeadline} IS NULL OR ${table.pickupDeadline} > ${table.readyAt}`,
    ),
  ],
);
