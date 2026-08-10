import { describe, expect, expectTypeOf, it } from "vitest";

import {
  type ApiError,
  type ApiResponse,
  type ApiResult,
  type BookCopy,
  type BookTitle,
  type BorrowingPolicy,
  type CheckinResult,
  type CheckoutResult,
  type CopyStatus,
  type DueDateInfo,
  type ErrorMessage,
  type FineReason,
  type FineRecord,
  type LoanRecord,
  type LoanStatus,
  type MemberType,
  type NotificationChannel,
  type NotificationLog,
  type NotificationStatus,
  type NotificationType,
  type Paginated,
  type PaginatedResponse,
  type ReservationRecord,
  type ReservationStatus,
  type SessionUser,
  type SystemSetting,
  type ToPublic,
  type UserPublic,
  type UserRecord,
  type UserRole,
  type UserStatus,
  toPublic,
} from "./shared";

describe("shared enum unions", () => {
  it("UserRole มีค่า admin/librarian/faculty/staff/student ตรงกับ user_role ใน schema.sql", () => {
    expectTypeOf<UserRole>().toEqualTypeOf<
      "admin" | "librarian" | "faculty" | "staff" | "student"
    >();
  });

  it("UserStatus มีค่า active/suspended/graduated/inactive ตรงกับ user_status", () => {
    expectTypeOf<UserStatus>().toEqualTypeOf<"active" | "suspended" | "graduated" | "inactive">();
  });

  it("MemberType มีค่า general/undergraduate/graduate ตรงกับ CHECK constraint users.member_type", () => {
    expectTypeOf<MemberType>().toEqualTypeOf<"general" | "undergraduate" | "graduate">();
  });

  it("CopyStatus มีค่า 6 ค่า ตรงกับ copy_status", () => {
    expectTypeOf<CopyStatus>().toEqualTypeOf<
      "available" | "borrowed" | "reserved" | "lost" | "damaged" | "withdrawn"
    >();
  });

  it("LoanStatus มีค่า active/returned/overdue/lost ตรงกับ loan_status", () => {
    expectTypeOf<LoanStatus>().toEqualTypeOf<"active" | "returned" | "overdue" | "lost">();
  });

  it("ReservationStatus มีค่า 6 ค่า ตรงกับ reservation_status", () => {
    expectTypeOf<ReservationStatus>().toEqualTypeOf<
      "waiting" | "ready" | "fulfilled" | "expired" | "cancelled" | "suspended"
    >();
  });

  it("FineReason มีค่า overdue/lost/damaged ตรงกับ fine_reason", () => {
    expectTypeOf<FineReason>().toEqualTypeOf<"overdue" | "lost" | "damaged">();
  });

  it("NotificationType มีค่า due_reminder/overdue/reservation_ready ตรงกับ notification_type", () => {
    expectTypeOf<NotificationType>().toEqualTypeOf<
      "due_reminder" | "overdue" | "reservation_ready"
    >();
  });

  it("NotificationChannel มีค่า email/line ตรงกับ notification_channel", () => {
    expectTypeOf<NotificationChannel>().toEqualTypeOf<"email" | "line">();
  });

  it("NotificationStatus มีค่า pending/sent/failed ตรงกับ notification_status", () => {
    expectTypeOf<NotificationStatus>().toEqualTypeOf<"pending" | "sent" | "failed">();
  });
});

describe("shared response envelope", () => {
  it("ApiResponse<T> เป็น { success: true; data: T; message? }", () => {
    expectTypeOf<ApiResponse<{ id: string }>>().toEqualTypeOf<{
      success: true;
      data: { id: string };
      message?: string;
    }>();
  });

  it("ApiError เป็น { success: false; error: string }", () => {
    expectTypeOf<ApiError>().toEqualTypeOf<{ success: false; error: string }>();
  });

  it("ApiResult<T> รวม ApiResponse<T> และ ApiError", () => {
    expectTypeOf<ApiResult<string>>().toEqualTypeOf<ApiResponse<string> | ApiError>();
  });

  it("Paginated<T> มี total/page/limit/totalPages", () => {
    expectTypeOf<Paginated<number>>().toEqualTypeOf<{
      data: number[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    }>();
  });

  it("PaginatedResponse<T> เป็น ApiResponse + pagination fields (ตรงกับ response.schema.ts)", () => {
    expectTypeOf<PaginatedResponse<number>>().toEqualTypeOf<{
      success: true;
      data: number[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    }>();
  });

  it("ErrorMessage เป็น string", () => {
    expectTypeOf<ErrorMessage>().toEqualTypeOf<string>();
  });
});

describe("shared user types", () => {
  it("SessionUser มี id/email/fullName/role/status และ branchId? (ไม่มี passwordHash)", () => {
    expectTypeOf<SessionUser>().toEqualTypeOf<{
      id: string;
      email: string;
      fullName: string;
      role: UserRole;
      status: UserStatus;
      branchId?: string;
    }>();
    expectTypeOf<keyof SessionUser & "passwordHash">().toEqualTypeOf<never>();
  });

  it("UserRecord เป็น row ของ users (มี passwordHash)", () => {
    expectTypeOf<UserRecord>().toMatchTypeOf<{
      id: string;
      email: string;
      passwordHash: string;
      fullName: string;
      role: UserRole;
      status: UserStatus;
      createdAt: string;
      updatedAt: string;
    }>();
  });

  it("UserPublic ไม่มี passwordHash และมี field สาธารณะครบ", () => {
    expectTypeOf<UserPublic>().toEqualTypeOf<{
      id: string;
      email: string;
      fullName: string;
      role: UserRole;
      status: UserStatus;
      memberType: MemberType;
      studentOrStaffId?: string;
      phone?: string;
      branchId?: string;
      createdAt: string;
      updatedAt: string;
    }>();
    expectTypeOf<keyof UserPublic & "passwordHash">().toEqualTypeOf<never>();
  });

  it("ToPublic<T> ตัด passwordHash ออกจาก type", () => {
    expectTypeOf<ToPublic<{ passwordHash: string; name: string }>>().toEqualTypeOf<{
      name: string;
    }>();
    expectTypeOf<ToPublic<UserRecord>>().toEqualTypeOf<UserPublic>();
  });

  it("toPublic() ตัด passwordHash ออกจาก object จริง", () => {
    const user = {
      id: "u-1",
      email: "librarian@ac.th",
      passwordHash: "hashed-secret",
      fullName: "บรรณารักษ์ทดสอบ",
      role: "librarian",
      memberType: "general",
      status: "active",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    } satisfies UserRecord;

    const publicUser = toPublic(user);

    expect(publicUser).not.toHaveProperty("passwordHash");
    expect(publicUser).toMatchObject({
      id: "u-1",
      email: "librarian@ac.th",
      fullName: "บรรณารักษ์ทดสอบ",
      role: "librarian",
      status: "active",
    });
    expectTypeOf(publicUser).toMatchTypeOf<UserPublic>();
    expectTypeOf<keyof typeof publicUser & "passwordHash">().toEqualTypeOf<never>();
  });
});

describe("shared catalog types", () => {
  it("BookTitle มี field ตามตาราง books", () => {
    expectTypeOf<BookTitle>().toMatchTypeOf<{
      id: string;
      title: string;
      author: string;
      isbn?: string;
      categoryId?: string;
      coverUrl?: string;
      publishedYear?: number;
    }>();
  });

  it("BookCopy มี field ตามตาราง book_copies", () => {
    expectTypeOf<BookCopy>().toMatchTypeOf<{
      id: string;
      bookId: string;
      copyCode: string;
      status: CopyStatus;
      branchId?: string;
      shelfLocation?: string;
    }>();
  });
});

describe("shared circulation types", () => {
  it("BorrowingPolicy มี policy fields ครบตาม borrowing_policies", () => {
    expectTypeOf<BorrowingPolicy>().toEqualTypeOf<{
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
    }>();
  });

  it("LoanRecord มี field ตามตาราง loans", () => {
    expectTypeOf<LoanRecord>().toMatchTypeOf<{
      id: string;
      copyId: string;
      userId: string;
      borrowedAt: string;
      dueAt: string;
      status: LoanStatus;
      renewedCount: number;
      loanPeriodDays: number;
      dailyFineRate: number;
    }>();
  });

  it("DueDateInfo มี dueDate + snapshot policy", () => {
    expectTypeOf<DueDateInfo>().toEqualTypeOf<{
      dueDate: string;
      loanPeriodDays: number;
      dailyFineRate: number;
    }>();
  });

  it("CheckoutResult มี loan + dueDate", () => {
    expectTypeOf<CheckoutResult>().toMatchTypeOf<{ dueDate: string; loan: LoanRecord }>();
  });

  it("CheckinResult มี loan + fine?", () => {
    expectTypeOf<CheckinResult>().toMatchTypeOf<{ loan: LoanRecord; fine?: FineRecord }>();
  });
});

describe("shared reservation/fine/notification types", () => {
  it("ReservationRecord มี field ตามตาราง reservations", () => {
    expectTypeOf<ReservationRecord>().toMatchTypeOf<{
      id: string;
      bookId: string;
      userId: string;
      status: ReservationStatus;
      reservedAt: string;
      readyAt?: string;
      pickupDeadline?: string;
    }>();
  });

  it("FineRecord มี field ตามตาราง fines", () => {
    expectTypeOf<FineRecord>().toMatchTypeOf<{
      id: string;
      userId: string;
      loanId?: string;
      amount: number;
      reason: FineReason;
      paid: boolean;
      waived: boolean;
    }>();
  });

  it("NotificationLog มี field ตามตาราง notification_logs", () => {
    expectTypeOf<NotificationLog>().toMatchTypeOf<{
      id: string;
      userId: string;
      type: NotificationType;
      channel: NotificationChannel;
      status: NotificationStatus;
      referenceId?: string;
      errorMessage?: string;
    }>();
  });

  it("SystemSetting ใช้ unknown สำหรับ JSONB value", () => {
    expectTypeOf<SystemSetting>().toMatchTypeOf<{ id: string; key: string; value: unknown }>();
  });
});
