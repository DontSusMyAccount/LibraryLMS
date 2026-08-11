import { describe, expect, it } from "vitest";

import { DomainNotFoundError } from "../../../../domains/errors";
import type { UserRecord } from "../../../../shared";
import type { IUserRepository } from "../ports/user.repository";
import { FindUserUsecase } from "./find-user.usecase";

function buildUser(overrides: Partial<UserRecord> = {}): UserRecord {
  return {
    id: "u-1",
    email: "a@x.ac.th",
    passwordHash: "hashed",
    fullName: "นิสิตทดสอบ",
    role: "student",
    memberType: "undergraduate",
    studentOrStaffId: "610012345",
    phone: "0812345678",
    branchId: "b-1",
    status: "active",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function createRepository(user: UserRecord | null): IUserRepository {
  return {
    findByStudentOrStaffId: async (studentOrStaffId) =>
      user && user.studentOrStaffId === studentOrStaffId ? user : null,
    findByEmail: async (email) => (user && user.email === email ? user : null),
    searchByName: async () => ({ data: [], total: 0, page: 1, limit: 12, totalPages: 0 }),
    branchExists: async () => true,
    create: async () => buildUser(),
    findById: async () => null,
    update: async () => buildUser(),
  };
}

describe("FindUserUsecase", () => {
  it("ค้นหาด้วย studentOrStaffId คืน UserPublic ไม่มี passwordHash", async () => {
    const usecase = new FindUserUsecase(createRepository(buildUser()));

    const result = await usecase.execute({ command: { studentOrStaffId: "610012345" } });

    expect(result.user.studentOrStaffId).toBe("610012345");
    expect(result.user.fullName).toBe("นิสิตทดสอบ");
    expect(result.user).not.toHaveProperty("passwordHash");
  });

  it("ค้นหาด้วย email คืน UserPublic ไม่มี passwordHash", async () => {
    const usecase = new FindUserUsecase(createRepository(buildUser()));

    const result = await usecase.execute({ command: { email: "a@x.ac.th" } });

    expect(result.user.email).toBe("a@x.ac.th");
    expect(result.user).not.toHaveProperty("passwordHash");
  });

  it("หา studentOrStaffId ไม่เจอ throw DomainNotFoundError", async () => {
    const usecase = new FindUserUsecase(createRepository(buildUser()));

    await expect(
      usecase.execute({ command: { studentOrStaffId: "999999999" } }),
    ).rejects.toBeInstanceOf(DomainNotFoundError);
  });

  it("หา email ไม่เจอ throw DomainNotFoundError", async () => {
    const usecase = new FindUserUsecase(createRepository(buildUser()));

    await expect(usecase.execute({ command: { email: "ghost@x.ac.th" } })).rejects.toBeInstanceOf(
      DomainNotFoundError,
    );
  });
});
