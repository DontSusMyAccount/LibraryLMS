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
  buildUser({
    id: "u-4",
    email: "suspend@x.ac.th",
    fullName: "พนักงานถูกระงับ",
    role: "staff",
    status: "suspended",
  }),
];

function createRepository(records: UserRecord[]): IUserRepository {
  return {
    findByStudentOrStaffId: async () => null,
    findByEmail: async () => null,
    searchByKeyword: async (query, { page, limit, role, status }) => {
      const keyword = query.trim();
      const filtered = records.filter((record) => {
        const matchesKeyword =
          !keyword ||
          record.fullName.includes(keyword) ||
          record.email.includes(keyword) ||
          (record.studentOrStaffId ?? "").includes(keyword);
        const matchesRole = role === undefined || record.role === role;
        const matchesStatus = status === undefined || record.status === status;
        return matchesKeyword && matchesRole && matchesStatus;
      });
      return {
        data: filtered,
        total: filtered.length,
        page,
        limit,
        totalPages: Math.ceil(filtered.length / limit),
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

  it("ค้นหาด้วยอีเมลบางส่วนก็เจอ (keyword ครอบคลุม name/email/studentOrStaffId)", async () => {
    const usecase = new ListUsersUsecase(createRepository(MEMBERS));

    const result = await usecase.execute({
      query: { q: "somchai", page: 1, limit: DEFAULT_PAGE_SIZE },
    });

    expect(result.data).toHaveLength(1);
    expect(result.data[0]?.email).toBe("somchai@x.ac.th");
  });

  it("ค้นหาด้วย studentOrStaffId บางส่วนก็เจอ", async () => {
    const usecase = new ListUsersUsecase(createRepository(MEMBERS));

    const result = await usecase.execute({
      query: { q: "ST-0001", page: 1, limit: DEFAULT_PAGE_SIZE },
    });

    expect(result.data).toHaveLength(1);
    expect(result.data[0]?.fullName).toBe("อาจารย์สมชาย");
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

  it("ไม่มี q และไม่มี filter → คืนผู้ใช้ทั้งหมดแบบ paginated (โหลดตารางเต็มตอนเปิดหน้า)", async () => {
    const usecase = new ListUsersUsecase(createRepository(MEMBERS));

    const result = await usecase.execute({ query: {} });

    expect(result.total).toBe(MEMBERS.length);
    expect(result.data).toHaveLength(MEMBERS.length);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(DEFAULT_PAGE_SIZE);
    for (const member of result.data) {
      expect(member).not.toHaveProperty("passwordHash");
    }
  });

  it("q เป็น whitespace เท่านั้น เทียบเท่ากับไม่มี q → คืนผู้ใช้ทั้งหมด", async () => {
    const usecase = new ListUsersUsecase(createRepository(MEMBERS));

    const result = await usecase.execute({ query: { q: "   " } });

    expect(result.total).toBe(MEMBERS.length);
    expect(result.data).toHaveLength(MEMBERS.length);
  });

  it("มีเฉพาะ filter role → กรองตาม role", async () => {
    const usecase = new ListUsersUsecase(createRepository(MEMBERS));

    const result = await usecase.execute({ query: { role: "faculty" } });

    expect(result.total).toBe(1);
    expect(result.data[0]?.fullName).toBe("อาจารย์สมชาย");
  });

  it("มีเฉพาะ filter status → กรองตาม status", async () => {
    const usecase = new ListUsersUsecase(createRepository(MEMBERS));

    const result = await usecase.execute({ query: { status: "suspended" } });

    expect(result.total).toBe(1);
    expect(result.data[0]?.fullName).toBe("พนักงานถูกระงับ");
  });

  it("q + role + status มาพร้อมกัน → กรองครบทุกเงื่อนไข", async () => {
    const usecase = new ListUsersUsecase(createRepository(MEMBERS));

    const result = await usecase.execute({
      query: { q: "นิสิต", role: "student", status: "active" },
    });

    expect(result.total).toBe(2);
    expect(result.data.map((member) => member.id)).toEqual(["u-1", "u-2"]);
  });

  it("role/status ตรงแต่ q ไม่ตรง → ไม่เจอ (ทุกเงื่อนไข AND กัน)", async () => {
    const usecase = new ListUsersUsecase(createRepository(MEMBERS));

    const result = await usecase.execute({
      query: { q: "ไม่มีชื่อนี้", role: "student", status: "active" },
    });

    expect(result.total).toBe(0);
    expect(result.data).toEqual([]);
  });
});
