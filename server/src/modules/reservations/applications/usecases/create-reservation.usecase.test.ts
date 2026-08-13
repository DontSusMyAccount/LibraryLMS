import { describe, expect, it } from "vitest";

import {
  DomainConflictError,
  DomainForbiddenError,
  DomainNotFoundError,
} from "../../../../domains/errors";
import type {
  AuditLog,
  BookTitle,
  Paginated,
  ReservationRecord,
  UserStatus,
} from "../../../../shared";
import type { IAuditRepository } from "../../../shared/applications/ports/audit.repository";
import type {
  ICreateReservationInput,
  IReservationListQuery,
  IReservationMemberInfo,
  IReservationRepository,
  IUpdateReservationInput,
} from "../ports/reservation.repository";
import { CreateReservationUsecase } from "./create-reservation.usecase";

const NOW = new Date("2026-08-06T00:00:00.000Z");

interface ReservationRepoState {
  members: IReservationMemberInfo[];
  books: BookTitle[];
  reservations: ReservationRecord[];
  nextId: number;
}

function buildBook(overrides: Partial<BookTitle> = {}): BookTitle {
  return {
    id: "b-1",
    title: "หนังสือทดสอบ",
    author: "ผู้เขียน",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function buildReservation(overrides: Partial<ReservationRecord> = {}): ReservationRecord {
  return {
    id: "r-1",
    bookId: "b-1",
    userId: "u-1",
    status: "waiting",
    reservedAt: "2026-08-01T00:00:00.000Z",
    createdAt: "2026-08-01T00:00:00.000Z",
    ...overrides,
  };
}

function createReservationRepository(state: ReservationRepoState): IReservationRepository {
  return {
    findMemberById: async (userId) => state.members.find((member) => member.id === userId) ?? null,
    findBookById: async (bookId) => state.books.find((book) => book.id === bookId) ?? null,
    findActiveByUserAndBook: async (userId, bookId) =>
      state.reservations.find(
        (item) =>
          item.userId === userId &&
          item.bookId === bookId &&
          (item.status === "waiting" || item.status === "ready" || item.status === "suspended"),
      ) ?? null,
    findById: async (id) => state.reservations.find((item) => item.id === id) ?? null,
    createReservation: async (input: ICreateReservationInput) => {
      const reservation = {
        id: `r-${state.nextId++}`,
        bookId: input.bookId,
        userId: input.userId,
        branchId: input.branchId,
        status: "waiting",
        reservedAt: input.reservedAt,
        createdAt: input.reservedAt,
      } as ReservationRecord;
      state.reservations.push(reservation);
      return reservation;
    },
    listReservations: async (
      query: IReservationListQuery,
    ): Promise<Paginated<ReservationRecord>> => {
      const filtered = query.status
        ? state.reservations.filter((item) => item.status === query.status)
        : [...state.reservations];
      const total = filtered.length;
      const start = (query.page - 1) * query.limit;
      return {
        data: filtered.slice(start, start + query.limit),
        total,
        page: query.page,
        limit: query.limit,
        totalPages: total === 0 ? 0 : Math.ceil(total / query.limit),
      };
    },
    findByBookQueue: async (bookId) =>
      [...state.reservations]
        .filter(
          (item) =>
            item.bookId === bookId &&
            (item.status === "waiting" || item.status === "ready" || item.status === "suspended"),
        )
        .sort((a, b) => new Date(a.reservedAt).getTime() - new Date(b.reservedAt).getTime()),
    countActiveByBook: async () => 0,
    updateStatus: async (id: string, input: IUpdateReservationInput) => {
      const item = state.reservations.find((entry) => entry.id === id);
      if (!item) return null;
      item.status = input.status;
      if (input.readyAt) item.readyAt = input.readyAt;
      if (input.pickupDeadline) item.pickupDeadline = input.pickupDeadline;
      if (input.fulfilledLoanId) item.fulfilledLoanId = input.fulfilledLoanId;
      return item;
    },
    findReadyOverdue: async () => [],
    findActiveLoanWithBook: async () => null,
    getSystemSetting: async () => 3,
  };
}

function createAuditRepository(): IAuditRepository & { records: AuditLog[] } {
  const records: AuditLog[] = [];
  return {
    records,
    record: async (input) => {
      const log: AuditLog = {
        id: `log-${records.length + 1}`,
        userId: input.userId,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        metadata: input.metadata,
        createdAt: "2026-01-01T00:00:00.000Z",
      };
      records.push(log);
      return log;
    },
  };
}

function buildState(overrides: Partial<ReservationRepoState> = {}): ReservationRepoState {
  return {
    members: [{ id: "u-1", status: "active" }],
    books: [buildBook()],
    reservations: [],
    nextId: 100,
    ...overrides,
  };
}

describe("CreateReservationUsecase", () => {
  it("จองหนังสือสำเร็จ → สร้างรายการจองสถานะ waiting พร้อม reservedAt = now และ audit", async () => {
    const state = buildState();
    const auditRepo = createAuditRepository();
    const usecase = new CreateReservationUsecase(createReservationRepository(state), auditRepo);

    const result = await usecase.execute({
      command: { bookId: "b-1", userId: "u-1" },
      actorId: "u-librarian",
      now: NOW,
    });

    expect(result.reservation.status).toBe("waiting");
    expect(result.reservation.bookId).toBe("b-1");
    expect(result.reservation.userId).toBe("u-1");
    expect(result.reservation.reservedAt).toBe(NOW.toISOString());
    expect(state.reservations).toHaveLength(1);
    expect(auditRepo.records[0]).toMatchObject({
      action: "reservation.created",
      entityType: "reservation",
    });
  });

  it("จองซ้ำ book+user เดียวกัน (มี waiting อยู่แล้ว) → DomainConflictError", async () => {
    const state = buildState({
      reservations: [buildReservation({ id: "r-1", userId: "u-1", status: "waiting" })],
    });
    const usecase = new CreateReservationUsecase(
      createReservationRepository(state),
      createAuditRepository(),
    );

    await expect(
      usecase.execute({ command: { bookId: "b-1", userId: "u-1" }, now: NOW }),
    ).rejects.toThrowError(DomainConflictError);
  });

  it("สมาชิกถูกระงับสิทธิ์ (suspended) → DomainForbiddenError", async () => {
    const state = buildState({ members: [{ id: "u-1", status: "suspended" as UserStatus }] });
    const usecase = new CreateReservationUsecase(
      createReservationRepository(state),
      createAuditRepository(),
    );

    await expect(
      usecase.execute({ command: { bookId: "b-1", userId: "u-1" }, now: NOW }),
    ).rejects.toThrowError(DomainForbiddenError);
  });

  it("ไม่พบหนังสือ → DomainNotFoundError", async () => {
    const state = buildState({ books: [] });
    const usecase = new CreateReservationUsecase(
      createReservationRepository(state),
      createAuditRepository(),
    );

    await expect(
      usecase.execute({ command: { bookId: "b-999", userId: "u-1" }, now: NOW }),
    ).rejects.toThrowError(DomainNotFoundError);
  });

  it("ไม่พบสมาชิก → DomainNotFoundError", async () => {
    const state = buildState({ members: [] });
    const usecase = new CreateReservationUsecase(
      createReservationRepository(state),
      createAuditRepository(),
    );

    await expect(
      usecase.execute({ command: { bookId: "b-1", userId: "u-999" }, now: NOW }),
    ).rejects.toThrowError(DomainNotFoundError);
  });
});
