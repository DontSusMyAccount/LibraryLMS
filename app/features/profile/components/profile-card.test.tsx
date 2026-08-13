import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { UserRole, UserStatus } from "@libsys/shared";
import { ROLE_LABELS } from "@/app/features/members/components/members-table";
import { STATUS_LABELS } from "@/app/features/members/components/member-status-badge";

import { ProfileCard } from "./profile-card";

const PROFILE = {
  fullName: "สมชาย ใจดี",
  email: "somchai@library.local",
  role: "admin" as UserRole,
  status: "active" as UserStatus,
};

describe("ProfileCard", () => {
  it("แสดงชื่อ-นามสกุล และอีเมลของผู้ใช้", () => {
    render(<ProfileCard {...PROFILE} />);

    expect(screen.getByText("สมชาย ใจดี")).toBeTruthy();
    expect(screen.getByText("somchai@library.local")).toBeTruthy();
  });

  it("แสดงบทบาทและสถานะเป็น label ภาษาไทย", () => {
    render(<ProfileCard {...PROFILE} />);

    expect(screen.getByText(ROLE_LABELS.admin)).toBeTruthy();
    expect(screen.getByText(STATUS_LABELS.active)).toBeTruthy();
  });
});
