import { jsonb, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

export const systemSettings = pgTable("system_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: varchar("key", { length: 100 }).notNull().unique(),
  value: jsonb("value").notNull(),
  description: text("description"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
