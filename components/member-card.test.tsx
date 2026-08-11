import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { UserPublic } from "@libsys/shared";

import type { MemberCardData } from "@/app/features/circulation/circulation.types";
import { MemberCard } from "./member-card";

function makeUser(overrides: Partial<UserPublic> = {}): UserPublic {
  return {
    id: "user-1",
    email: "somchai@example.com",
    fullName: "สมชาย ใจดี",
    role: "student",
    memberType: "undergraduate",
    studentOrStaffId: "6401001",
    status: "active",
    createdAt: "2026-08-01T00:00:00",
    updatedAt: "2026-08-01T00:00:00",
    ...overrides,
  };
}

function makeMember(finesTotal: number | null): MemberCardData {
  return {
    user: makeUser(),
    activeLoans: [],
    activeLoansCount: 0,
    overdueCount: 0,
    finesTotal,
    isSuspended: false,
    maxRenewals: 2,
  };
}

describe("MemberCard", () => {
  it("finesTotal เป็น null (ไม่มี endpoint) → แสดง '-' + คำเตือนไม่สามารถโหลดยอดค่าปรับได้", () => {
    const { container } = render(<MemberCard member={makeMember(null)} />);

    expect(container.textContent).toContain("ค่าปรับ");
    expect(container.textContent).toContain("-");
    expect(container.textContent).toContain("ไม่สามารถโหลดยอดค่าปรับได้");
  });

  it("finesTotal มีตัวเลข → แสดงยอด และไม่มีคำเตือน", () => {
    const { container } = render(<MemberCard member={makeMember(50)} />);

    expect(container.textContent).toContain("50");
    expect(container.textContent).not.toContain("ไม่สามารถโหลดยอดค่าปรับได้");
  });
});
