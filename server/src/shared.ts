export const USER_ROLES = ["admin", "librarian", "faculty", "staff", "student"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const USER_STATUSES = ["active", "suspended", "graduated", "inactive"] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

export const MEMBER_TYPES = ["general", "undergraduate", "graduate"] as const;
export type MemberType = (typeof MEMBER_TYPES)[number];

export const COPY_STATUSES = [
  "available",
  "borrowed",
  "reserved",
  "lost",
  "damaged",
  "withdrawn",
] as const;
export type CopyStatus = (typeof COPY_STATUSES)[number];

export const LOAN_STATUSES = ["active", "returned", "overdue", "lost"] as const;
export type LoanStatus = (typeof LOAN_STATUSES)[number];

export const RESERVATION_STATUSES = [
  "waiting",
  "ready",
  "fulfilled",
  "expired",
  "cancelled",
  "suspended",
] as const;
export type ReservationStatus = (typeof RESERVATION_STATUSES)[number];

export const FINE_REASONS = ["overdue", "lost", "damaged"] as const;
export type FineReason = (typeof FINE_REASONS)[number];

export const NOTIFICATION_TYPES = ["due_reminder", "overdue", "reservation_ready"] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const NOTIFICATION_CHANNELS = ["email", "line"] as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

export const NOTIFICATION_STATUSES = ["pending", "sent", "failed"] as const;
export type NotificationStatus = (typeof NOTIFICATION_STATUSES)[number];

export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_SIZE = 12;
export const MAX_PAGE_SIZE = 100;

export interface ApiResponse<T> {
  success: true;
  data: T;
  message?: string;
}

export interface ApiError {
  success: false;
  error: string;
}

export type ApiResult<T> = ApiResponse<T> | ApiError;

export type ErrorMessage = string;

export interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  success: true;
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface SessionUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  status: UserStatus;
  branchId?: string;
}

export interface UserRecord {
  id: string;
  email: string;
  passwordHash: string;
  fullName: string;
  role: UserRole;
  memberType: MemberType;
  studentOrStaffId?: string;
  phone?: string;
  branchId?: string;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
}

export type ToPublic<T extends { passwordHash: string }> = Omit<T, "passwordHash">;

export function toPublic<T extends { passwordHash: string }>(entity: T): ToPublic<T> {
  const { passwordHash: _passwordHash, ...publicEntity } = entity;
  return publicEntity;
}

export type UserPublic = ToPublic<UserRecord>;

export interface Category {
  id: string;
  name: string;
  parentId?: string;
  createdAt: string;
}

export interface BookTitle {
  id: string;
  isbn?: string;
  title: string;
  author: string;
  publisher?: string;
  language?: string;
  categoryId?: string;
  description?: string;
  coverUrl?: string;
  publishedYear?: number;
  createdAt: string;
  updatedAt: string;
}

export interface BookCopy {
  id: string;
  bookId: string;
  branchId?: string;
  copyCode: string;
  status: CopyStatus;
  shelfLocation?: string;
  acquiredAt?: string;
  createdAt: string;
}

export interface BookWithCopies extends BookTitle {
  copies: BookCopy[];
}

export interface BorrowingPolicy {
  id: string;
  role: UserRole;
  memberType: MemberType;
  maxActiveLoans: number;
  loanPeriodDays: number;
  maxRenewals: number;
  gracePeriodDays: number;
  dailyFineRate: number;
  maxUnpaidFine: number;
  createdAt: string;
}

export interface CourseReserve {
  id: string;
  copyId: string;
  courseCode: string;
  courseName?: string;
  instructorId?: string;
  loanPeriodHours: number;
  startDate: string;
  endDate: string;
  createdAt: string;
}

export interface LoanRecord {
  id: string;
  copyId: string;
  userId: string;
  courseReserveId?: string;
  borrowedAt: string;
  dueAt: string;
  returnedAt?: string;
  status: LoanStatus;
  renewedCount: number;
  recalledAt?: string;
  loanPeriodDays: number;
  dailyFineRate: number;
  checkedOutBy?: string;
  checkedInBy?: string;
  createdAt: string;
}

export interface DueDateInfo {
  dueDate: string;
  loanPeriodDays: number;
  dailyFineRate: number;
}

export interface CheckoutResult {
  loan: LoanRecord;
  dueDate: string;
}

export interface CheckinResult {
  loan: LoanRecord;
  fine?: FineRecord;
}

export interface ReservationRecord {
  id: string;
  bookId: string;
  userId: string;
  branchId?: string;
  status: ReservationStatus;
  reservedAt: string;
  readyAt?: string;
  pickupDeadline?: string;
  fulfilledLoanId?: string;
  createdAt: string;
}

export interface FineRecord {
  id: string;
  loanId?: string;
  userId: string;
  amount: number;
  reason: FineReason;
  paid: boolean;
  paidAt?: string;
  waived: boolean;
  createdAt: string;
}

export interface NotificationLog {
  id: string;
  userId: string;
  type: NotificationType;
  channel: NotificationChannel;
  referenceId?: string;
  status: NotificationStatus;
  errorMessage?: string;
  sentAt?: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  userId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  metadata?: unknown;
  createdAt: string;
}

export interface SystemSetting {
  id: string;
  key: string;
  value: unknown;
  description?: string;
  updatedAt: string;
}
