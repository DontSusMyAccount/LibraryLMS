import { describe, expect, it, vi } from "vitest";

import { DomainConflictError } from "../../../../domains/errors";
import type { ReservationRecord } from "../../../../shared";
import type { ICreateMyReservationPort } from "../ports/create-my-reservation.port";
import { CreateMyReservationUsecase } from "./create-my-reservation.usecase";

function buildReservation(): ReservationRecord {
  return {
    id: "r-1",
    bookId: "b-1",
    userId: "u-1",
    status: "waiting",
    reservedAt: "2026-08-01T00:00:00.000Z",
    createdAt: "2026-08-01T00:00:00.000Z",
  };
}

describe("CreateMyReservationUsecase", () => {
  it("จองสำเร็จ — ส่ง userId จาก context (ห้ามรับจาก client)", async () => {
    const createUsecase = {
      execute: vi.fn(async () => ({ reservation: buildReservation() })),
    } as unknown as ICreateMyReservationPort;

    const usecase = new CreateMyReservationUsecase(createUsecase);
    const result = await usecase.execute({
      command: { bookId: "b-1", userId: "u-1" },
      actorId: "u-1",
    });

    expect(result.reservation.status).toBe("waiting");
    expect(createUsecase.execute).toHaveBeenCalledWith({
      command: { bookId: "b-1", userId: "u-1" },
      actorId: "u-1",
    });
  });

  it("จองซ้ำ → ส่งต่อ DomainConflictError จาก usecase เดิม", async () => {
    const createUsecase = {
      execute: vi.fn(async () => {
        throw new DomainConflictError("สมาชิกรายนี้ได้จองหนังสือเล่มนี้ไว้แล้ว");
      }),
    } as unknown as ICreateMyReservationPort;

    const usecase = new CreateMyReservationUsecase(createUsecase);
    await expect(
      usecase.execute({ command: { bookId: "b-1", userId: "u-1" }, actorId: "u-1" }),
    ).rejects.toThrowError(DomainConflictError);
  });
});
