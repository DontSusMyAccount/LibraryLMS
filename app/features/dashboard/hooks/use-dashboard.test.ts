import type { FineRecord, LoanRecord, ReservationRecord } from "@libsys/shared";
import { describe, expect, it } from "vitest";

import type { DashboardActiveLoanItem } from "../dashboard.types";
import { buildKpis } from "./use-dashboard";

function makeLoan(overrides: Partial<LoanRecord> = {}): LoanRecord {
  return {
    id: "loan-1",
    copyId: "copy-1",
    userId: "u-1",
    borrowedAt: "2026-08-10T12:00:00",
    dueAt: "2026-08-24T12:00:00",
    status: "active",
    renewedCount: 0,
    loanPeriodDays: 14,
    dailyFineRate: 5,
    createdAt: "2026-08-10T12:00:00",
    ...overrides,
  };
}

function makeActiveLoan(overrides: Partial<DashboardActiveLoanItem> = {}): DashboardActiveLoanItem {
  return {
    loan: makeLoan(),
    overdue: false,
    daysOverdue: 0,
    ...overrides,
  };
}

function makeReservation(overrides: Partial<ReservationRecord> = {}): ReservationRecord {
  return {
    id: "res-1",
    bookId: "book-1",
    userId: "u-1",
    status: "waiting",
    reservedAt: "2026-08-10T12:00:00",
    createdAt: "2026-08-10T12:00:00",
    ...overrides,
  };
}

function makeFine(overrides: Partial<FineRecord> = {}): FineRecord {
  return {
    id: "fine-1",
    userId: "u-1",
    amount: 10,
    reason: "overdue",
    paid: false,
    waived: false,
    createdAt: "2026-08-10T12:00:00",
    ...overrides,
  };
}

const NOW = new Date(2026, 7, 10, 12, 0, 0);

describe("buildKpis", () => {
  it("นับเฉพาะรายการที่ยืมในวันนี้ (ข้ามวัน = เปรียบเทียบตามวันปฏิทิน ไม่ใช่เวลาที่แน่นอน)", () => {
    const loans = [
      makeActiveLoan({ loan: makeLoan({ borrowedAt: "2026-08-10T08:30:00" }) }),
      makeActiveLoan({ loan: makeLoan({ borrowedAt: "2026-08-10T23:15:00" }) }),
      makeActiveLoan({ loan: makeLoan({ borrowedAt: "2026-08-09T23:59:00" }) }),
      makeActiveLoan({ loan: makeLoan({ borrowedAt: "2026-08-11T00:20:00" }) }),
    ];

    const kpis = buildKpis({ loans, reservations: [], fines: [], now: NOW });

    expect(kpis.checkedOutToday).toBe(2);
  });

  it("นับ checkedOutToday ตามวันปฏิทินแม้อีกฝั่งของเที่ยงคืน (ข้ามวัน): 00:20 ที่ผ่านไปถือเป็นวันเดียวกับที่อ้างอิง", () => {
    const midnightOver = new Date(2026, 7, 11, 0, 30, 0);
    const loans = [makeActiveLoan({ loan: makeLoan({ borrowedAt: "2026-08-11T00:20:00" }) })];

    const kpis = buildKpis({ loans, reservations: [], fines: [], now: midnightOver });

    expect(kpis.checkedOutToday).toBe(1);
  });

  it("นับเฉพาะรายการที่ค้างส่งผ่าน grace (overdue=true)", () => {
    const loans = [
      makeActiveLoan({ overdue: true, daysOverdue: 3 }),
      makeActiveLoan({ overdue: false, daysOverdue: 0 }),
      makeActiveLoan({ overdue: true, daysOverdue: 1 }),
    ];

    const kpis = buildKpis({ loans, reservations: [], fines: [], now: NOW });

    expect(kpis.overdue).toBe(2);
  });

  it("readyQueue นับเฉพาะรายการจองที่มีสถานะ ready", () => {
    const reservations = [
      makeReservation({ id: "res-1", status: "ready" }),
      makeReservation({ id: "res-2", status: "waiting" }),
      makeReservation({ id: "res-3", status: "fulfilled" }),
      makeReservation({ id: "res-4", status: "ready" }),
    ];

    const kpis = buildKpis({ loans: [], reservations, fines: [], now: NOW });

    expect(kpis.readyQueue).toBe(2);
  });

  it("unpaidFines นับเฉพาะค่าปรับที่ยังไม่ชำระและยังไม่ได้ยกเว้น", () => {
    const fines = [
      makeFine({ id: "fine-1" }),
      makeFine({ id: "fine-2", paid: true }),
      makeFine({ id: "fine-3", waived: true }),
      makeFine({ id: "fine-4", paid: true, waived: true }),
    ];

    const kpis = buildKpis({ loans: [], reservations: [], fines, now: NOW });

    expect(kpis.unpaidFines).toBe(1);
  });

  it("คืนค่าเป็น 0 ทั้งหมดเมื่อไม่มีข้อมูล", () => {
    const kpis = buildKpis({ loans: [], reservations: [], fines: [], now: NOW });

    expect(kpis).toEqual({ checkedOutToday: 0, overdue: 0, readyQueue: 0, unpaidFines: 0 });
  });
});
