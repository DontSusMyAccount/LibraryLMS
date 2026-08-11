import { describe, expect, it } from "vitest";

import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, type UserRecord } from "../../../../shared";
import type { IUserRepository } from "../ports/user.repository";
import { ListUsersUsecase } from "./list-users.usecase";

function buildUser(overrides: Partial<UserRecord> = {}): UserRecord {
  return {
    id: "u-1",
    email: "a@x.ac.th",
    passwordHash: "hashed",
    fullName: "นิสิตทดสอบ",
    role: "student",
    memberType: "undergraduate",
    studentOrStaffId: "610012345",
    status: "active",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

const MEMBERS = [
  buildUser({ id: "u-1", fullName: "นิสิตอัจฉริยะ", studentOrStaffId: "610012345" }),
  buildUser({ id: "u-2", fullName: "นิสิตใจดี", studentOrStaffId: "610012346" }),
  buildUser({
    id: "u-3",
    email: "somchai@x.ac.th",
    fullName: "อาจารย์สมชาย",
    role: "faculty",
    studentOrStaffId: "ST-0001",
  }),
];

function createRepository(records: UserRecord[]): IUserRepository {
  return {
    findByStudentOrStaffId: async () => null,
    findByEmail: async () => null,
    searchByName: async (query) => {
      const filtered = records.filter((record) => record.fullName.includes(query));
      return {
        data: filtered,
        total: filtered.length,
        page: 1,
        limit: DEFAULT_PAGE_SIZE,
        totalPages: Math.ceil(filtered.length / DEFAULT_PAGE_SIZE),
      };
    },
    branchExists: async () => true,
    create: async () => buildUser(),
    findById: async () => null,
    update: async () => buildUser(),
  };
}

describe("ListUsersUsecase", () => {
  it("ค้นหาชื่อบางส่วน (ไทย) คืนผลลัพธ์ paginated ไม่มี passwordHash", async () => {
    const usecase = new ListUsersUsecase(createRepository(MEMBERS));

    const result = await usecase.execute({
      query: { q: "นิสิต", page: 1, limit: DEFAULT_PAGE_SIZE },
    });

    expect(result.total).toBe(2);
    expect(result.data).toHaveLength(2);
    expect(result.totalPages).toBe(1);
    for (const member of result.data) {
      expect(member).not.toHaveProperty("passwordHash");
    }
  });

  it("ไม่พบผลลัพธ์ คืนรายการว่างและ total = 0", async () => {
    const usecase = new ListUsersUsecase(createRepository(MEMBERS));

    const result = await usecase.execute({
      query: { q: "ไม่มีใครชื่อนี้", page: 1, limit: DEFAULT_PAGE_SIZE },
    });

    expect(result.data).toEqual([]);
    expect(result.total).toBe(0);
    expect(result.totalPages).toBe(0);
  });

  it("clamp page ต่ำกว่า 1 และ limit เกิน MAX_PAGE_SIZE", async () => {
    const usecase = new ListUsersUsecase(createRepository(MEMBERS));

    const result = await usecase.execute({
      query: { q: "นิสิต", page: 0, limit: MAX_PAGE_SIZE + 50 },
    });

    expect(result.page).toBe(1);
    expect(result.limit).toBe(MAX_PAGE_SIZE);
  });

  it("query ว่างหรือเป็น whitespace คืนผลว่าง (ไม่แสดงรายชื่อทั้งหมด)", async () => {
    const usecase = new ListUsersUsecase(createRepository(MEMBERS));

    const result = await usecase.execute({
      query: { q: "   ", page: 1, limit: DEFAULT_PAGE_SIZE },
    });

    expect(result.data).toEqual([]);
    expect(result.total).toBe(0);
  });
});
