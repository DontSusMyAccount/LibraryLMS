import { sql } from "drizzle-orm";
import { check, index, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { branches } from "./branches";
import { userRoleEnum, userStatusEnum } from "./enums";

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: varchar("email", { length: 255 }).notNull().unique(),
    passwordHash: text("password_hash").notNull(),
    fullName: varchar("full_name", { length: 150 }).notNull(),
    role: userRoleEnum("role").notNull().default("student"),
    memberType: varchar("member_type", { length: 20 }).notNull().default("general"),
    studentOrStaffId: varchar("student_or_staff_id", { length: 50 }).unique(),
    phone: varchar("phone", { length: 20 }),
    branchId: uuid("branch_id").references(() => branches.id, { onDelete: "set null" }),
    status: userStatusEnum("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_users_role").on(table.role),
    index("idx_users_branch").on(table.branchId),
    // ilike '%...%' บน fullName/email ใช้ trgm — ไม่งั้น seq scan ทุกครั้งที่ค้นหาสมาชิก
    index("idx_users_fullname_trgm").using("gin", sql`${table.fullName} gin_trgm_ops`),
    index("idx_users_email_trgm").using("gin", sql`${table.email} gin_trgm_ops`),
    check(
      "chk_users_member_type",
      sql`${table.memberType} IN ('general', 'undergraduate', 'graduate')`,
    ),
  ],
);
