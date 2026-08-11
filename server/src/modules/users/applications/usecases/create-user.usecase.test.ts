import bcrypt from "bcryptjs";
import { describe, expect, it, vi } from "vitest";

import { DomainConflictError, DomainError, DomainNotFoundError } from "../../../../domains/errors";
import type { UserRecord } from "../../../../shared";
import type { CreateUserInput, IUserRepository } from "../ports/user.repository";
import { CreateUserUsecase } from "./create-user.usecase";

const BASE_COMMAND = {
  email: "  new.student@x.ac.th  ",
  fullName: "นิสิตใหม่",
  role: "student",
  password: "secret123",
} as const;

function buildUser(overrides: Partial<UserRecord> = {}): UserRecord {
  return {
    id: "u-existing",
    email: "a@x.ac.th",
    passwordHash: "hashed",
    fullName: "นิสิตเดิม",
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

function buildCreatedUser(input: CreateUserInput): UserRecord {
  return {
    id: "u-new",
    email: input.email,
    passwordHash: input.passwordHash,
    fullName: input.fullName,
    role: input.role,
    memberType: input.memberType,
    studentOrStaffId: input.studentOrStaffId,
    phone: input.phone,
    branchId: input.branchId,
    status: input.status,
    createdAt: "2026-02-01T00:00:00.000Z",
    updatedAt: "2026-02-01T00:00:00.000Z",
  };
}

function createRepository(
  options: {
    existingByEmail?: UserRecord | null;
    existingById?: UserRecord | null;
    branchExists?: boolean;
  } = {},
) {
  const create = vi.fn(async (input: CreateUserInput): Promise<UserRecord> =>
    buildCreatedUser(input),
  );
  const branchExists = vi.fn(async () => options.branchExists ?? true);
  const repository: IUserRepository = {
    findByStudentOrStaffId: async (studentOrStaffId) =>
      options.existingById && options.existingById.studentOrStaffId === studentOrStaffId
        ? options.existingById
        : null,
    findByEmail: async (email) =>
      options.existingByEmail && options.existingByEmail.email === email
        ? options.existingByEmail
        : null,
    searchByName: async () => ({ data: [], total: 0, page: 1, limit: 12, totalPages: 0 }),
    branchExists,
    create,
  };
  return { repository, create, branchExists };
}

describe("CreateUserUsecase", () => {
  it("สร้างสำเร็จ: hash password cost 12, status active, memberType default student→undergraduate, คืน UserPublic", async () => {
    const { repository, create } = createRepository();
    const usecase = new CreateUserUsecase(repository);

    const result = await usecase.execute({ command: { ...BASE_COMMAND } });

    const input = create.mock.calls[0][0];
    expect(await bcrypt.compare(BASE_COMMAND.password, input.passwordHash)).toBe(true);
    expect(bcrypt.getRounds(input.passwordHash)).toBe(12);
    expect(input.email).toBe("new.student@x.ac.th");
    expect(input.status).toBe("active");
    expect(input.memberType).toBe("undergraduate");
    expect(result.user).not.toHaveProperty("passwordHash");
  });

  it("role อื่น (librarian) → memberType default เป็น general", async () => {
    const { repository, create } = createRepository();
    const usecase = new CreateUserUsecase(repository);

    await usecase.execute({ command: { ...BASE_COMMAND, role: "librarian" } });

    const input = create.mock.calls[0][0];
    expect(input.memberType).toBe("general");
  });

  it("email ซ้ำ → DomainConflictError 409 (อีเมลนี้ถูกใช้งานแล้ว)", async () => {
    const { repository, create } = createRepository({
      existingByEmail: buildUser({ email: "new.student@x.ac.th" }),
    });
    const usecase = new CreateUserUsecase(repository);

    const error = await usecase.execute({ command: { ...BASE_COMMAND } }).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(DomainConflictError);
    expect(error).toMatchObject({ statusCode: 409, message: "อีเมลนี้ถูกใช้งานแล้ว" });
    expect(create).not.toHaveBeenCalled();
  });

  it("studentOrStaffId ซ้ำ → DomainConflictError 409 (รหัสนักศึกษา/พนักงานนี้ถูกใช้งานแล้ว)", async () => {
    const { repository, create } = createRepository({ existingById: buildUser() });
    const usecase = new CreateUserUsecase(repository);

    const error = await usecase
      .execute({ command: { ...BASE_COMMAND, studentOrStaffId: "610012345" } })
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(DomainConflictError);
    expect(error).toMatchObject({
      statusCode: 409,
      message: "รหัสนักศึกษา/พนักงานนี้ถูกใช้งานแล้ว",
    });
    expect(create).not.toHaveBeenCalled();
  });

  it("branchId ให้มาแต่ไม่มีสาขานั้น → DomainNotFoundError 404 (ไม่พบสาขาที่เลือก)", async () => {
    const { repository, create } = createRepository({ branchExists: false });
    const usecase = new CreateUserUsecase(repository);

    const error = await usecase
      .execute({ command: { ...BASE_COMMAND, branchId: "b-missing" } })
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(DomainNotFoundError);
    expect(error).toMatchObject({ statusCode: 404, message: "ไม่พบสาขาที่เลือก" });
    expect(create).not.toHaveBeenCalled();
  });

  it("password เกิน 72 bytes → DomainError 422 (รหัสผ่านยาวเกินไป) ก่อน hash", async () => {
    const { repository, create } = createRepository();
    const usecase = new CreateUserUsecase(repository);
    const tooLongPassword = "ก".repeat(25);
    expect(Buffer.byteLength(tooLongPassword, "utf8")).toBe(75);

    const error = await usecase
      .execute({ command: { ...BASE_COMMAND, password: tooLongPassword } })
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(DomainError);
    expect(error).toMatchObject({
      statusCode: 422,
      message: "รหัสผ่านยาวเกินไป (สูงสุด 72 ตัวอักษร)",
    });
    expect(create).not.toHaveBeenCalled();
  });
});
