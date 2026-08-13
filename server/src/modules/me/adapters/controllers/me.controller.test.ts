import "reflect-metadata";

import { Elysia } from "elysia";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { toHttpError } from "../../../../libs/http-error.factory";
import type { LoanRecord, ReservationRecord, UserPublic } from "../../../../shared";
import type { CancelMyReservationUsecase } from "../../applications/usecases/cancel-my-reservation.usecase";
import type { CreateMyReservationUsecase } from "../../applications/usecases/create-my-reservation.usecase";
import type { GetMeUsecase } from "../../applications/usecases/get-me.usecase";
import type { ListMyFinesUsecase } from "../../applications/usecases/list-my-fines.usecase";
import type { ListMyLoansUsecase } from "../../applications/usecases/list-my-loans.usecase";
import type { ListMyReservationsUsecase } from "../../applications/usecases/list-my-reservations.usecase";
import type { RenewMyLoanUsecase } from "../../applications/usecases/renew-my-loan.usecase";
import type { SelfCheckoutUsecase } from "../../applications/usecases/self-checkout.usecase";
import { MeController } from "./me.controller";

const JWT_SECRET = "test-jwt-secret";
const INTERNAL_SECRET = "test-internal-secret";

const STUDENT_HEADERS = {
  "x-internal-secret": INTERNAL_SECRET,
  "x-user-id": "u-student-1",
  "x-user-role": "student",
  "x-user-status": "active",
  "x-fullname": encodeURIComponent("นิสิตคนหนึ่ง"),
};

const ADMIN_HEADERS = {
  "x-internal-secret": INTERNAL_SECRET,
  "x-user-id": "u-admin-1",
  "x-user-role": "admin",
  "x-user-status": "active",
  "x-fullname": encodeURIComponent("ผู้ดูแลระบบ"),
};

const VALID_LOAN_ID = "123e4567-e89b-12d3-a456-426614174001";
const VALID_RESERVATION_ID = "123e4567-e89b-12d3-a456-426614174002";

function buildPublicUser(overrides: Partial<UserPublic> = {}): UserPublic {
  return {
    id: "u-student-1",
    email: "student@x.ac.th",
    fullName: "นิสิตทดสอบ",
    role: "student",
    memberType: "undergraduate",
    status: "active",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function buildLoan(overrides: Partial<LoanRecord> = {}): LoanRecord {
  return {
    id: VALID_LOAN_ID,
    copyId: "c-1",
    userId: "u-student-1",
    borrowedAt: "2026-08-01T00:00:00.000Z",
    dueAt: "2026-09-03T00:00:00.000Z",
    status: "active",
    renewedCount: 1,
    loanPeriodDays: 14,
    dailyFineRate: 5,
    createdAt: "2026-08-01T00:00:00.000Z",
    ...overrides,
  };
}

function buildReservation(overrides: Partial<ReservationRecord> = {}): ReservationRecord {
  return {
    id: VALID_RESERVATION_ID,
    bookId: "b-1",
    userId: "u-student-1",
    status: "cancelled",
    reservedAt: "2026-08-01T00:00:00.000Z",
    createdAt: "2026-08-01T00:00:00.000Z",
    ...overrides,
  };
}

type MockedUsecases = {
  getMe: GetMeUsecase;
  listMyLoans: ListMyLoansUsecase;
  renewMyLoan: RenewMyLoanUsecase;
  listMyReservations: ListMyReservationsUsecase;
  createMyReservation: CreateMyReservationUsecase;
  cancelMyReservation: CancelMyReservationUsecase;
  listMyFines: ListMyFinesUsecase;
  selfCheckout: SelfCheckoutUsecase;
};

function buildApp(mocks: MockedUsecases): Elysia {
  const controller = new MeController(
    mocks.getMe,
    mocks.listMyLoans,
    mocks.renewMyLoan,
    mocks.listMyReservations,
    mocks.createMyReservation,
    mocks.cancelMyReservation,
    mocks.listMyFines,
    mocks.selfCheckout,
    JWT_SECRET,
    INTERNAL_SECRET,
  );

  return new Elysia()
    .onError(({ code, error, set }) => {
      const httpError = toHttpError(error, code);
      set.status = httpError.statusCode;
      return httpError.body;
    })
    .use(controller.getRoutes() as unknown as Elysia) as unknown as Elysia;
}

function jsonRequest(path: string, init: RequestInit): Request {
  return new Request(`http://localhost${path}`, {
    ...init,
    headers: { "content-type": "application/json", ...(init.headers as Record<string, string>) },
  });
}

describe("MeController routes (self-service)", () => {
  let mocks: MockedUsecases;
  let app: Elysia;

  beforeEach(() => {
    mocks = {
      getMe: { execute: vi.fn() } as unknown as GetMeUsecase,
      listMyLoans: { execute: vi.fn() } as unknown as ListMyLoansUsecase,
      renewMyLoan: { execute: vi.fn() } as unknown as RenewMyLoanUsecase,
      listMyReservations: { execute: vi.fn() } as unknown as ListMyReservationsUsecase,
      createMyReservation: { execute: vi.fn() } as unknown as CreateMyReservationUsecase,
      cancelMyReservation: { execute: vi.fn() } as unknown as CancelMyReservationUsecase,
      listMyFines: { execute: vi.fn() } as unknown as ListMyFinesUsecase,
      selfCheckout: { execute: vi.fn() } as unknown as SelfCheckoutUsecase,
    };
    app = buildApp(mocks);
  });

  it("GET /me เรียก GetMeUsecase ด้วย userId จาก session (ไม่รับจาก client)", async () => {
    const execute = vi.fn(async () => ({
      user: buildPublicUser(),
      policy: null,
      unpaidFineTotal: 0,
      activeLoanCount: 1,
    }));
    mocks.getMe.execute = execute;

    const res = await app.handle(jsonRequest("/me/", { headers: STUDENT_HEADERS }));

    expect(res.status).toBe(200);
    expect(execute).toHaveBeenCalledWith({ query: { userId: "u-student-1" } });
  });

  it("POST /me/checkout เรียก SelfCheckoutUsecase ด้วย copyCode + userId จาก session + actorId=userId", async () => {
    const execute = vi.fn(async () => ({
      loan: buildLoan(),
      dueDate: "2026-09-03T00:00:00.000Z",
    }));
    mocks.selfCheckout.execute = execute;

    const res = await app.handle(
      jsonRequest("/me/checkout", {
        method: "POST",
        headers: STUDENT_HEADERS,
        body: JSON.stringify({ copyCode: "BK-001" }),
      }),
    );

    expect(res.status).toBe(200);
    expect(execute).toHaveBeenCalledWith({
      command: { copyCode: "BK-001", userId: "u-student-1" },
      actorId: "u-student-1",
    });
  });

  it("POST /me/checkout ปฏิเสธ body ไม่มี copyCode → 422", async () => {
    const res = await app.handle(
      jsonRequest("/me/checkout", {
        method: "POST",
        headers: STUDENT_HEADERS,
        body: "{}",
      }),
    );

    expect(res.status).toBe(422);
    expect(mocks.selfCheckout.execute).not.toHaveBeenCalled();
  });

  it("POST /me/reservations เรียก CreateMyReservationUsecase ด้วย bookId + userId จาก session", async () => {
    const execute = vi.fn(async () => ({ reservation: buildReservation({ status: "waiting" }) }));
    mocks.createMyReservation.execute = execute;

    const res = await app.handle(
      jsonRequest("/me/reservations", {
        method: "POST",
        headers: STUDENT_HEADERS,
        body: JSON.stringify({ bookId: "b-1" }),
      }),
    );

    expect(res.status).toBe(200);
    expect(execute).toHaveBeenCalledWith({ command: { bookId: "b-1", userId: "u-student-1" } });
  });

  it("DELETE /me/reservations/:id เรียก CancelMyReservationUsecase ด้วย id + userId จาก session", async () => {
    const execute = vi.fn(async () => ({ reservation: buildReservation() }));
    mocks.cancelMyReservation.execute = execute;

    const res = await app.handle(
      jsonRequest(`/me/reservations/${VALID_RESERVATION_ID}`, {
        method: "DELETE",
        headers: STUDENT_HEADERS,
      }),
    );

    expect(res.status).toBe(200);
    expect(execute).toHaveBeenCalledWith({
      command: { id: VALID_RESERVATION_ID, userId: "u-student-1" },
      actorId: "u-student-1",
    });
  });

  it("POST /me/loans/:id/renew เรียก RenewMyLoanUsecase ด้วย id + userId จาก session", async () => {
    const execute = vi.fn(async () => ({
      loan: buildLoan(),
      dueDate: "2026-09-03T00:00:00.000Z",
    }));
    mocks.renewMyLoan.execute = execute;

    const res = await app.handle(
      jsonRequest(`/me/loans/${VALID_LOAN_ID}/renew`, {
        method: "POST",
        headers: STUDENT_HEADERS,
      }),
    );

    expect(res.status).toBe(200);
    expect(execute).toHaveBeenCalledWith({
      command: { id: VALID_LOAN_ID, userId: "u-student-1" },
    });
  });

  it("GET /me/loans เรียก ListMyLoansUsecase ด้วย userId จาก session", async () => {
    const execute = vi.fn(async () => ({ loans: [] }));
    mocks.listMyLoans.execute = execute;

    const res = await app.handle(jsonRequest("/me/loans", { headers: STUDENT_HEADERS }));

    expect(res.status).toBe(200);
    expect(execute).toHaveBeenCalledWith({ query: { userId: "u-student-1" } });
  });

  it("GET /me/fines เรียก ListMyFinesUsecase ด้วย userId จาก session", async () => {
    const execute = vi.fn(async () => ({ fines: [], unpaidTotal: 0 }));
    mocks.listMyFines.execute = execute;

    const res = await app.handle(jsonRequest("/me/fines", { headers: STUDENT_HEADERS }));

    expect(res.status).toBe(200);
    expect(execute).toHaveBeenCalledWith({ query: { userId: "u-student-1" } });
  });

  it("admin/librarian เรียก /me → 403 (เฉพาะผู้ยืมเท่านั้น)", async () => {
    const res = await app.handle(jsonRequest("/me/", { headers: ADMIN_HEADERS }));

    expect(res.status).toBe(403);
    expect(mocks.getMe.execute).not.toHaveBeenCalled();
  });
});
