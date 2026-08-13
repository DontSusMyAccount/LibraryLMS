import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { ReservationListItem } from "@/app/features/reservations/reservation.types";
import { ReservationTable } from "./reservation-table";

function makeItem(overrides: Partial<ReservationListItem> = {}): ReservationListItem {
  const id = overrides.id ?? "r-1";
  return {
    id,
    bookId: "book-1",
    userId: "user-1",
    status: "waiting",
    reservedAt: "2026-08-01T00:00:00",
    createdAt: "2026-08-01T00:00:00",
    bookTitle: "คัมภีร์ลมปราณ",
    bookAuthor: "ผู้แต่งตัวอย่าง",
    borrowerName: "สมชาย ใจดี",
    ...overrides,
  };
}

function renderTable(errorMessage: string | null, items: ReservationListItem[] = [makeItem()]) {
  return render(
    <ReservationTable
      reservations={items}
      queueReservations={items}
      expandedBookId={null}
      isBusy={false}
      onToggleExpand={() => undefined}
      onMarkReady={() => vi.fn()}
      errorMessage={errorMessage}
    />,
  );
}

describe("ReservationTable — errorMessage จาก action", () => {
  it("มี errorMessage → แสดงข้อความผิดพลาดในตาราง", () => {
    const { container } = renderTable("รายการนี้ไม่มีแล้ว");

    const alert = container.querySelector("[data-slot='reservation-table-error']");
    expect(alert).toBeTruthy();
    expect(alert?.textContent).toContain("รายการนี้ไม่มีแล้ว");
  });

  it("ไม่มี errorMessage → ไม่แสดงข้อความผิดพลาด", () => {
    const { container } = renderTable(null);

    expect(container.querySelector("[data-slot='reservation-table-error']")).toBeNull();
  });
});

describe("ReservationTable — ชื่อผู้จอง", () => {
  it("มี borrowerName → แสดงชื่อจริง ไม่ใช่สมาชิก #", () => {
    const { container } = renderTable(null, [
      makeItem({ borrowerName: "สมชาย ใจดี", userId: "user-abc" }),
    ]);

    expect(container.textContent).toContain("สมชาย ใจดี");
    expect(container.textContent).not.toContain("สมาชิก #");
  });

  it("ไม่มี borrowerName → แสดง fallback สมาชิก #userId", () => {
    const { container } = renderTable(null, [
      makeItem({ borrowerName: undefined, userId: "user-abc1234" }),
    ]);

    expect(container.textContent).toContain("สมาชิก #user-abc");
  });

  it("คิวเมื่อขยาย: แสดงชื่อจริงของผู้จองและคิว FIFO ครบทุกหน้า (รวมรายการนอกหน้าปัจจุบัน)", () => {
    const visible = [makeItem({ id: "r-1", reservedAt: "2026-08-01T00:00:00" })];
    const fullQueue = [
      makeItem({ id: "r-1", reservedAt: "2026-08-01T00:00:00" }),
      makeItem({
        id: "r-2",
        reservedAt: "2026-07-30T00:00:00",
        userId: "user-2",
        borrowerName: "สมศรี รักดี",
      }),
    ];
    const { container } = render(
      <ReservationTable
        reservations={visible}
        queueReservations={fullQueue}
        expandedBookId="book-1"
        isBusy={false}
        onToggleExpand={() => undefined}
        onMarkReady={() => vi.fn()}
        errorMessage={null}
      />,
    );

    expect(container.textContent).toContain("สมศรี รักดี");
    expect(container.textContent).toContain("สมชาย ใจดี");
    const positions = container.querySelectorAll("[data-slot='queue-position']");
    expect(positions).toHaveLength(2);
    expect(positions[0]?.textContent).toContain("1");
  });
});
