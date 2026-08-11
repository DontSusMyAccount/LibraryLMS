import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PaginatedResponse } from "@libsys/shared";

import type { CreateMemberInput, MemberListItem, UpdateMemberInput } from "../members.types";

const mocks = vi.hoisted(() => ({
  fetchMembers: vi.fn(),
  createMember: vi.fn(),
  updateMember: vi.fn(),
}));

vi.mock("../actions/members.action", () => ({
  fetchMembers: mocks.fetchMembers,
  createMember: mocks.createMember,
  updateMember: mocks.updateMember,
}));

import { useMembersStore } from "./members.store";

function makeMember(overrides: Partial<MemberListItem> = {}): MemberListItem {
  return {
    id: "user-1",
    email: "somsri@example.ac.th",
    fullName: "สมศรี ใจดี",
    role: "student",
    memberType: "undergraduate",
    studentOrStaffId: "6501123456",
    phone: "0812345678",
    branchId: "branch-1",
    status: "active",
    createdAt: "2026-08-01T00:00:00",
    updatedAt: "2026-08-01T00:00:00",
    ...overrides,
  };
}

function makePage(
  members: MemberListItem[],
  page = 1,
  total = members.length,
): PaginatedResponse<MemberListItem> {
  return {
    success: true as const,
    data: members,
    total,
    page,
    limit: 12,
    totalPages: Math.ceil(total / 12),
  };
}

const LIST_PARAMS_SHAPE = {
  page: 1,
  limit: 12,
  search: undefined,
  role: undefined,
  status: undefined,
};

beforeEach(() => {
  useMembersStore.setState({
    members: [],
    search: "",
    roleFilter: null,
    statusFilter: null,
    page: 1,
    limit: 12,
    total: 0,
    totalPages: 1,
    isLoading: false,
    isError: false,
    errorMessage: null,
  });
  for (const mock of Object.values(mocks)) {
    mock.mockReset();
  }
});

describe("members.store — รายการสมาชิก", () => {
  it("loadMembers โหลดรายการ + เก็บ pagination state จากผลลัพธ์", async () => {
    const members = [makeMember(), makeMember({ id: "user-2", fullName: "ประสงค์ ดี" })];
    mocks.fetchMembers.mockResolvedValue(makePage(members, 1, 2));

    await useMembersStore.getState().loadMembers();

    expect(mocks.fetchMembers).toHaveBeenCalledWith(LIST_PARAMS_SHAPE);
    expect(useMembersStore.getState().members).toHaveLength(2);
    expect(useMembersStore.getState().total).toBe(2);
    expect(useMembersStore.getState().totalPages).toBe(1);
    expect(useMembersStore.getState().isLoading).toBe(false);
    expect(useMembersStore.getState().isError).toBe(false);
  });

  it("loadMembers ล้มเหลว → isError true + errorMessage ภาษาไทยจาก error", async () => {
    mocks.fetchMembers.mockRejectedValue(new Error("ไม่พบข้อมูลสมาชิก"));

    await useMembersStore.getState().loadMembers();

    expect(useMembersStore.getState().isError).toBe(true);
    expect(useMembersStore.getState().errorMessage).toBe("ไม่พบข้อมูลสมาชิก");
    expect(useMembersStore.getState().isLoading).toBe(false);
  });

  it("setSearch รีเซ็ตหน้าเป็น 1 และโหลดใหม่พร้อม search param", async () => {
    mocks.fetchMembers.mockResolvedValueOnce(makePage([makeMember()], 1, 1));
    await useMembersStore.getState().loadMembers();
    useMembersStore.setState({ page: 3 });

    const found = [makeMember({ id: "user-s", fullName: "ลมหนาว" })];
    mocks.fetchMembers.mockResolvedValueOnce(makePage(found, 1, 1));

    await useMembersStore.getState().setSearch("ลม");

    expect(mocks.fetchMembers).toHaveBeenLastCalledWith({
      page: 1,
      limit: 12,
      search: "ลม",
      role: undefined,
      status: undefined,
    });
    expect(useMembersStore.getState().search).toBe("ลม");
    expect(useMembersStore.getState().page).toBe(1);
    expect(useMembersStore.getState().members).toEqual(found);
  });

  it("setRoleFilter('student') รีเซ็ตหน้าเป็น 1 และโหลดใหม่พร้อม role param", async () => {
    mocks.fetchMembers.mockResolvedValueOnce(makePage([makeMember()], 1, 1));
    await useMembersStore.getState().loadMembers();
    useMembersStore.setState({ page: 2 });

    const filtered = [makeMember({ id: "user-r", role: "student" })];
    mocks.fetchMembers.mockResolvedValueOnce(makePage(filtered, 1, 1));

    await useMembersStore.getState().setRoleFilter("student");

    expect(mocks.fetchMembers).toHaveBeenLastCalledWith({
      page: 1,
      limit: 12,
      search: undefined,
      role: "student",
      status: undefined,
    });
    expect(useMembersStore.getState().roleFilter).toBe("student");
    expect(useMembersStore.getState().page).toBe(1);
    expect(useMembersStore.getState().members).toEqual(filtered);
  });

  it("setRoleFilter(null) ไม่ส่ง role param", async () => {
    mocks.fetchMembers.mockResolvedValueOnce(makePage([makeMember()], 1, 1));
    await useMembersStore.getState().loadMembers();
    mocks.fetchMembers.mockClear();

    mocks.fetchMembers.mockResolvedValueOnce(
      makePage([makeMember({ id: "user-all", role: "librarian" })], 1, 1),
    );

    await useMembersStore.getState().setRoleFilter(null);

    expect(mocks.fetchMembers).toHaveBeenLastCalledWith({
      page: 1,
      limit: 12,
      search: undefined,
      role: undefined,
      status: undefined,
    });
    expect(useMembersStore.getState().roleFilter).toBeNull();
  });

  it("setStatusFilter('suspended') รีเซ็ตหน้าเป็น 1 และโหลดใหม่พร้อม status param", async () => {
    mocks.fetchMembers.mockResolvedValueOnce(makePage([makeMember()], 1, 1));
    await useMembersStore.getState().loadMembers();
    useMembersStore.setState({ page: 4 });

    const filtered = [makeMember({ id: "user-sus", status: "suspended" })];
    mocks.fetchMembers.mockResolvedValueOnce(makePage(filtered, 1, 1));

    await useMembersStore.getState().setStatusFilter("suspended");

    expect(mocks.fetchMembers).toHaveBeenLastCalledWith({
      page: 1,
      limit: 12,
      search: undefined,
      role: undefined,
      status: "suspended",
    });
    expect(useMembersStore.getState().statusFilter).toBe("suspended");
    expect(useMembersStore.getState().page).toBe(1);
    expect(useMembersStore.getState().members).toEqual(filtered);
  });

  it("setPage เปลี่ยนหน้าแล้วโหลดรายการใหม่", async () => {
    mocks.fetchMembers.mockResolvedValueOnce(makePage([makeMember()], 1, 20));
    await useMembersStore.getState().loadMembers();
    useMembersStore.setState({ totalPages: 2 });

    const secondPage = [makeMember({ id: "user-p2" })];
    mocks.fetchMembers.mockResolvedValueOnce(makePage(secondPage, 2, 20));

    await useMembersStore.getState().setPage(2);

    expect(mocks.fetchMembers).toHaveBeenLastCalledWith({
      page: 2,
      limit: 12,
      search: undefined,
      role: undefined,
      status: undefined,
    });
    expect(useMembersStore.getState().page).toBe(2);
    expect(useMembersStore.getState().members).toEqual(secondPage);
  });
});

describe("members.store — สร้างสมาชิก", () => {
  it("createMember สำเร็จ → โหลดรายการใหม่และคืน member ที่สร้าง", async () => {
    mocks.fetchMembers.mockResolvedValueOnce(makePage([], 1, 0));
    await useMembersStore.getState().loadMembers();
    mocks.fetchMembers.mockClear();

    const created = makeMember({
      id: "user-new",
      email: "new@example.ac.th",
      fullName: "ใหม่ สดใส",
    });
    const input: CreateMemberInput = {
      email: "new@example.ac.th",
      fullName: "ใหม่ สดใส",
      role: "student",
      password: "secret123",
    };
    mocks.createMember.mockResolvedValue(created);
    mocks.fetchMembers.mockResolvedValueOnce(makePage([created], 1, 1));

    const result = await useMembersStore.getState().createMember(input);

    expect(result?.id).toBe("user-new");
    expect(mocks.createMember).toHaveBeenCalledWith(input);
    expect(mocks.fetchMembers).toHaveBeenCalledTimes(1);
    expect(useMembersStore.getState().members).toHaveLength(1);
    expect(useMembersStore.getState().members[0].id).toBe("user-new");
  });

  it("createMember ล้มเหลว → คืน null และเก็บ errorMessage", async () => {
    mocks.createMember.mockRejectedValue(new Error("อีเมลนี้ถูกใช้แล้ว"));

    const input: CreateMemberInput = {
      email: "dup@example.ac.th",
      fullName: "ซ้ำ",
      role: "student",
      password: "secret123",
    };
    const result = await useMembersStore.getState().createMember(input);

    expect(result).toBeNull();
    expect(useMembersStore.getState().errorMessage).toBe("อีเมลนี้ถูกใช้แล้ว");
  });
});

describe("members.store — อัปเดตสมาชิก", () => {
  it("updateMember สำเร็จ → แทนที่ member ในรายการ (merge) และคืนค่าที่อัปเดต", async () => {
    const initial = [makeMember(), makeMember({ id: "user-2", fullName: "คนที่สอง" })];
    mocks.fetchMembers.mockResolvedValueOnce(makePage(initial, 1, 2));
    await useMembersStore.getState().loadMembers();

    const updated = makeMember({ id: "user-1", status: "suspended" });
    const patch: UpdateMemberInput = { status: "suspended" };
    mocks.updateMember.mockResolvedValue(updated);

    const result = await useMembersStore.getState().updateMember("user-1", patch);

    expect(result?.id).toBe("user-1");
    expect(result?.status).toBe("suspended");
    expect(mocks.updateMember).toHaveBeenCalledWith("user-1", patch);
    expect(useMembersStore.getState().members).toHaveLength(2);
    expect(useMembersStore.getState().members[0]).toEqual(updated);
  });

  it("updateMember ล้มเหลว → คืน null และเก็บ errorMessage", async () => {
    mocks.updateMember.mockRejectedValue(new Error("ไม่สามารถอัปเดตสมาชิกได้"));

    const result = await useMembersStore.getState().updateMember("user-1", {
      fullName: "ชื่อใหม่",
    });

    expect(result).toBeNull();
    expect(useMembersStore.getState().errorMessage).toBe("ไม่สามารถอัปเดตสมาชิกได้");
  });
});

describe("members.store — reset", () => {
  it("reset กลับสู่ค่าเริ่มต้น", async () => {
    mocks.fetchMembers.mockResolvedValueOnce(makePage([makeMember()], 1, 1));
    await useMembersStore.getState().loadMembers();
    useMembersStore.setState({ search: "ลม", roleFilter: "student", statusFilter: "suspended" });

    useMembersStore.getState().reset();

    expect(useMembersStore.getState().members).toEqual([]);
    expect(useMembersStore.getState().search).toBe("");
    expect(useMembersStore.getState().roleFilter).toBeNull();
    expect(useMembersStore.getState().statusFilter).toBeNull();
    expect(useMembersStore.getState().page).toBe(1);
    expect(useMembersStore.getState().limit).toBe(12);
    expect(useMembersStore.getState().total).toBe(0);
    expect(useMembersStore.getState().totalPages).toBe(1);
    expect(useMembersStore.getState().isLoading).toBe(false);
    expect(useMembersStore.getState().isError).toBe(false);
    expect(useMembersStore.getState().errorMessage).toBeNull();
  });
});
