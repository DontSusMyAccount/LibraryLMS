import { addDays } from "date-fns";
import { describe, expect, it } from "vitest";

import type { ReservationRecord } from "../shared";
import { DomainConflictError } from "./errors";
import {
  advanceQueue,
  assertNoActiveDuplicate,
  calcPickupDeadline,
  canTransitionReservation,
  compareReservationQueueOrder,
  isPickupExpired,
  resolvePickupDays,
} from "./reservation.domain";

const NOW = new Date("2026-08-10T00:00:00.000Z");

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

describe("FIFO queue order", () => {
  it("คิวเรียงตาม reservedAt (FIFO) — คนจองก่อนอยู่หน้าคิว", () => {
    const first = buildReservation({ id: "r-1", reservedAt: "2026-08-01T00:00:00.000Z" });
    const second = buildReservation({ id: "r-2", reservedAt: "2026-08-02T00:00:00.000Z" });

    const sorted = [second, first].sort(compareReservationQueueOrder);

    expect(sorted[0]!.id).toBe("r-1");
    expect(sorted[1]!.id).toBe("r-2");
  });

  it("reservedAt เท่ากัน → ใช้ id เป็นตัวตัดสิน (deterministic)", () => {
    const a = buildReservation({ id: "r-a", reservedAt: "2026-08-01T00:00:00.000Z" });
    const b = buildReservation({ id: "r-b", reservedAt: "2026-08-01T00:00:00.000Z" });

    const sorted = [b, a].sort(compareReservationQueueOrder);

    expect(sorted[0]!.id).toBe("r-a");
  });
});

describe("duplicate reservation", () => {
  it("มีรายการจอง active ของ user+book เดิม → DomainConflictError", () => {
    const existing = buildReservation({ id: "r-1", status: "waiting" });

    expect(() => assertNoActiveDuplicate(existing)).toThrowError(DomainConflictError);
  });

  it("ไม่มีรายการจองซ้ำ → ผ่าน (ไม่ throw)", () => {
    expect(() => assertNoActiveDuplicate(null)).not.toThrow();
  });
});

describe("canTransitionReservation", () => {
  it("waiting → ready / cancelled / expired / suspended ถูกต้อง", () => {
    expect(canTransitionReservation("waiting", "ready")).toBe(true);
    expect(canTransitionReservation("waiting", "cancelled")).toBe(true);
    expect(canTransitionReservation("waiting", "expired")).toBe(true);
    expect(canTransitionReservation("waiting", "suspended")).toBe(true);
  });

  it("ready → fulfilled / expired / cancelled", () => {
    expect(canTransitionReservation("ready", "fulfilled")).toBe(true);
    expect(canTransitionReservation("ready", "expired")).toBe(true);
    expect(canTransitionReservation("ready", "cancelled")).toBe(true);
  });

  it("suspended → waiting (resume) / cancelled", () => {
    expect(canTransitionReservation("suspended", "waiting")).toBe(true);
    expect(canTransitionReservation("suspended", "cancelled")).toBe(true);
  });

  it("terminal states เปลี่ยนไปไหนไม่ได้ และ self-transition เป็น false", () => {
    expect(canTransitionReservation("fulfilled", "ready")).toBe(false);
    expect(canTransitionReservation("expired", "waiting")).toBe(false);
    expect(canTransitionReservation("cancelled", "waiting")).toBe(false);
    expect(canTransitionReservation("waiting", "waiting")).toBe(false);
    expect(canTransitionReservation("waiting", "fulfilled")).toBe(false);
  });
});

describe("calcPickupDeadline", () => {
  it("pickup_deadline = ready_at + pickup days", () => {
    expect(calcPickupDeadline(NOW, 3)).toEqual(addDays(NOW, 3));
  });
});

describe("advanceQueue", () => {
  it("คนแรกในคิว (waiting) ถูกเลื่อนเป็น ready พร้อม readyAt + pickupDeadline", () => {
    const first = buildReservation({ id: "r-1", reservedAt: "2026-08-01T00:00:00.000Z" });
    const second = buildReservation({ id: "r-2", reservedAt: "2026-08-02T00:00:00.000Z" });

    const { queue, promoted } = advanceQueue([first, second], NOW, 3);

    expect(promoted).not.toBeNull();
    expect(promoted!.id).toBe("r-1");
    expect(promoted!.status).toBe("ready");
    expect(promoted!.readyAt).toBe(NOW.toISOString());
    expect(promoted!.pickupDeadline).toBe(addDays(NOW, 3).toISOString());
    expect(queue.find((item) => item.id === "r-2")!.status).toBe("waiting");
  });

  it("ถ้าไม่มีรายการ waiting → ไม่มีใครถูกเลื่อน", () => {
    const ready = buildReservation({ id: "r-1", status: "ready" });
    const fulfilled = buildReservation({ id: "r-2", status: "fulfilled" });

    const { queue, promoted } = advanceQueue([ready, fulfilled], NOW, 3);

    expect(promoted).toBeNull();
    expect(queue).toHaveLength(2);
  });

  it("ข้ามรายการ suspended (ไม่เสียลำดับคิว) แล้วเลื่อน waiting คนถัดไป", () => {
    const earlySuspended = buildReservation({
      id: "r-1",
      status: "suspended",
      reservedAt: "2026-08-01T00:00:00.000Z",
    });
    const nextWaiting = buildReservation({
      id: "r-2",
      status: "waiting",
      reservedAt: "2026-08-02T00:00:00.000Z",
    });

    const { queue, promoted } = advanceQueue([earlySuspended, nextWaiting], NOW, 3);

    expect(promoted!.id).toBe("r-2");
    expect(promoted!.status).toBe("ready");
    expect(queue.find((item) => item.id === "r-1")!.status).toBe("suspended");
  });
});

describe("suspended keeps queue position", () => {
  it("หยุดพัก (suspend) → resume กลับมา waiting แล้วยังได้ลำดับตาม reservedAt เดิม (หน้า queue)", () => {
    const early = buildReservation({ id: "r-early", reservedAt: "2026-08-01T00:00:00.000Z" });
    const late = buildReservation({ id: "r-late", reservedAt: "2026-08-02T00:00:00.000Z" });

    const suspended = { ...early, status: "suspended" as const };
    const resumed = { ...suspended, status: "waiting" as const };

    const ordered = [late, resumed].sort(compareReservationQueueOrder);

    expect(ordered[0]!.id).toBe("r-early");
    expect(ordered[0]!.status).toBe("waiting");
  });
});

describe("isPickupExpired", () => {
  it("ready ที่เลย pickupDeadline → expired", () => {
    const ready = buildReservation({
      id: "r-1",
      status: "ready",
      readyAt: "2026-08-05T00:00:00.000Z",
      pickupDeadline: "2026-08-08T00:00:00.000Z",
    });

    expect(isPickupExpired(ready, new Date("2026-08-09T00:00:00.000Z"))).toBe(true);
    expect(isPickupExpired(ready, new Date("2026-08-08T00:00:00.000Z"))).toBe(false);
  });

  it("waiting ไม่มี pickupDeadline → ไม่ถือว่า expired", () => {
    const waiting = buildReservation({ id: "r-1", status: "waiting" });

    expect(isPickupExpired(waiting, NOW)).toBe(false);
  });
});

describe("resolvePickupDays", () => {
  it("อ่านค่า pickup days จาก system_settings (default 3)", () => {
    expect(resolvePickupDays(5)).toBe(5);
    expect(resolvePickupDays(null)).toBe(3);
    expect(resolvePickupDays("5")).toBe(3);
    expect(resolvePickupDays(0)).toBe(3);
  });
});
