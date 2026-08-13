import { beforeEach, describe, expect, it, vi } from "vitest";

import type { DashboardIdentity } from "@/app/features/dashboard/dashboard.types";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  dashboardPage: vi.fn(() => null),
}));

vi.mock("@/auth", () => ({ auth: mocks.auth }));

vi.mock("@/app/features/dashboard/dashboard.page", () => ({ default: mocks.dashboardPage }));

import DashboardRoute from "./page";

interface DashboardRouteElement {
  props: { identity: DashboardIdentity };
}

const SESSION = {
  user: {
    id: "u-1",
    role: "student",
    status: "active",
    fullName: "นิสิตตัวอย่าง",
    name: "นิสิตตัวอย่าง",
    email: "s@x.ac.th",
    image: null,
  },
  expires: "2099-01-01T00:00:00.000Z",
} as const;

describe("dashboard route (server)", () => {
  beforeEach(() => {
    mocks.auth.mockReset();
    mocks.dashboardPage.mockClear();
  });

  it("ดึง identity จาก session แล้วส่ง userId + userName ให้ DashboardPage", async () => {
    mocks.auth.mockResolvedValue(SESSION);

    const element = (await DashboardRoute()) as DashboardRouteElement;

    expect(element.props.identity).toEqual({ userId: "u-1", userName: "นิสิตตัวอย่าง" });
  });

  it("ไม่มี session → ส่ง identity เปล่าให้ DashboardPage", async () => {
    mocks.auth.mockResolvedValue(null);

    const element = (await DashboardRoute()) as DashboardRouteElement;

    expect(element.props.identity).toEqual({ userId: null, userName: "" });
  });
});
