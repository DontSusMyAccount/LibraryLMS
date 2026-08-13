import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { UserRole, UserStatus } from "@libsys/shared";
import { ROLE_LABELS } from "@/app/_shared/constants/member.labels";
import { STATUS_LABELS } from "@/app/_shared/constants/member.labels";

import { ProfileCard } from "./profile-card";

const PROFILE = {
  fullName: "à¸ªà¸¡à¸Šà¸²à¸¢ à¹ƒà¸ˆà¸”à¸µ",
  email: "somchai@library.local",
  role: "admin" as UserRole,
  status: "active" as UserStatus,
};

describe("ProfileCard", () => {
  it("à¹à¸ªà¸”à¸‡à¸Šà¸·à¹ˆà¸­-à¸™à¸²à¸¡à¸ªà¸à¸¸à¸¥ à¹à¸¥à¸°à¸­à¸µà¹€à¸¡à¸¥à¸‚à¸­à¸‡à¸œà¸¹à¹‰à¹ƒà¸Šà¹‰", () => {
    render(<ProfileCard {...PROFILE} />);

    expect(screen.getByText("à¸ªà¸¡à¸Šà¸²à¸¢ à¹ƒà¸ˆà¸”à¸µ")).toBeTruthy();
    expect(screen.getByText("somchai@library.local")).toBeTruthy();
  });

  it("à¹à¸ªà¸”à¸‡à¸šà¸—à¸šà¸²à¸—à¹à¸¥à¸°à¸ªà¸–à¸²à¸™à¸°à¹€à¸›à¹‡à¸™ label à¸ à¸²à¸©à¸²à¹„à¸—à¸¢", () => {
    render(<ProfileCard {...PROFILE} />);

    expect(screen.getByText(ROLE_LABELS.admin)).toBeTruthy();
    expect(screen.getByText(STATUS_LABELS.active)).toBeTruthy();
  });
});
