import { pgEnum } from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", [
  "admin",
  "librarian",
  "faculty",
  "staff",
  "student",
]);

export const userStatusEnum = pgEnum("user_status", [
  "active",
  "suspended",
  "graduated",
  "inactive",
]);

export const copyStatusEnum = pgEnum("copy_status", [
  "available",
  "borrowed",
  "reserved",
  "lost",
  "damaged",
  "withdrawn",
]);

export const loanStatusEnum = pgEnum("loan_status", ["active", "returned", "overdue", "lost"]);

export const reservationStatusEnum = pgEnum("reservation_status", [
  "waiting",
  "ready",
  "fulfilled",
  "expired",
  "cancelled",
  "suspended",
]);

export const fineReasonEnum = pgEnum("fine_reason", ["overdue", "lost", "damaged"]);

export const notificationTypeEnum = pgEnum("notification_type", [
  "due_reminder",
  "overdue",
  "reservation_ready",
]);

export const notificationChannelEnum = pgEnum("notification_channel", ["email", "line"]);

export const notificationStatusEnum = pgEnum("notification_status", ["pending", "sent", "failed"]);
