import { sql } from "drizzle-orm";
import {
  check,
  date,
  index,
  integer,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { bookCopies } from "./book-copies";
import { users } from "./users";

export const courseReserves = pgTable(
  "course_reserves",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    copyId: uuid("copy_id")
      .notNull()
      .references(() => bookCopies.id, { onDelete: "cascade" }),
    courseCode: varchar("course_code", { length: 30 }).notNull(),
    courseName: varchar("course_name", { length: 200 }),
    instructorId: uuid("instructor_id").references(() => users.id, { onDelete: "set null" }),
    loanPeriodHours: integer("loan_period_hours").notNull().default(3),
    startDate: date("start_date", { mode: "date" }).notNull(),
    endDate: date("end_date", { mode: "date" }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_course_reserves_copy").on(table.copyId),
    index("idx_course_reserves_course").on(table.courseCode),
    check("chk_course_reserves_loan_period_hours", sql`${table.loanPeriodHours} > 0`),
    check("chk_course_reserves_date_range", sql`${table.endDate} >= ${table.startDate}`),
  ],
);
