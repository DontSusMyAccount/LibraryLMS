import { date, index, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

import { branches } from "./branches";
import { books } from "./books";
import { copyStatusEnum } from "./enums";

export const bookCopies = pgTable(
  "book_copies",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    bookId: uuid("book_id")
      .notNull()
      .references(() => books.id, { onDelete: "cascade" }),
    branchId: uuid("branch_id").references(() => branches.id, { onDelete: "set null" }),
    copyCode: varchar("copy_code", { length: 50 }).notNull().unique(),
    status: copyStatusEnum("status").notNull().default("available"),
    shelfLocation: varchar("shelf_location", { length: 50 }),
    acquiredAt: date("acquired_at", { mode: "date" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_book_copies_status").on(table.status),
    index("idx_book_copies_book").on(table.bookId),
    index("idx_book_copies_branch").on(table.branchId),
  ],
);
