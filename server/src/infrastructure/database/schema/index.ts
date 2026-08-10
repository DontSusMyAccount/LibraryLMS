import { auditLogs } from "./audit-logs";
import { bookCopies } from "./book-copies";
import { books } from "./books";
import { borrowingPolicies } from "./borrowing-policies";
import { branches } from "./branches";
import { categories } from "./categories";
import { courseReserves } from "./course-reserves";
import { fines } from "./fines";
import { loans } from "./loans";
import { notificationLogs } from "./notification-logs";
import { reservations } from "./reservations";
import { systemSettings } from "./system-settings";
import { users } from "./users";

export { auditLogs } from "./audit-logs";
export { bookCopies } from "./book-copies";
export { books } from "./books";
export { borrowingPolicies } from "./borrowing-policies";
export { branches } from "./branches";
export { categories } from "./categories";
export { courseReserves } from "./course-reserves";
export { fines } from "./fines";
export { loans } from "./loans";
export { notificationLogs } from "./notification-logs";
export { reservations } from "./reservations";
export { systemSettings } from "./system-settings";
export { users } from "./users";
export * from "./enums";

export const tables = {
  branches,
  categories,
  users,
  borrowingPolicies,
  systemSettings,
  books,
  bookCopies,
  courseReserves,
  loans,
  reservations,
  fines,
  notificationLogs,
  auditLogs,
} as const;

export type DatabaseSchema = typeof tables;
