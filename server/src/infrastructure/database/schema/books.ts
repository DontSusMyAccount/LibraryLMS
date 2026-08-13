import { sql } from "drizzle-orm";
import { index, integer, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

import { categories } from "./categories";

export const books = pgTable(
  "books",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    isbn: varchar("isbn", { length: 20 }),
    title: varchar("title", { length: 300 }).notNull(),
    author: varchar("author", { length: 200 }).notNull(),
    publisher: varchar("publisher", { length: 200 }),
    language: varchar("language", { length: 50 }).default("th"),
    categoryId: uuid("category_id").references(() => categories.id, { onDelete: "set null" }),
    description: text("description"),
    coverUrl: text("cover_url"),
    publishedYear: integer("published_year"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_books_title_trgm").using("gin", sql`${table.title} gin_trgm_ops`),
    index("idx_books_author_trgm").using("gin", sql`${table.author} gin_trgm_ops`),
    index("idx_books_category").on(table.categoryId),
  ],
);
