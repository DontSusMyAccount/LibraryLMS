import { describe, expect, it, vi } from "vitest";

import {
  DomainConflictError,
  DomainError,
  DomainForbiddenError,
  DomainNotFoundError,
} from "../../../../domains/errors";
import type { UserRecord } from "../../../../shared";
import type { IUserRepository, UpdateUserInput } from "../ports/user.repository";
import type { IUpdateUserCommand } from "../schemas/user-schemas";
import { UpdateUserUsecase } from "./update-user.usecase";

const ORIGINAL_UPDATED_AT = "2026-01-01T00:00:00.000Z";
const UPDATED_AT = "2026-02-02T00:00:00.000Z";

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
    updatedAt: ORIGINAL_UPDATED_AT,
    ...overrides,
  };
}

function buildUpdatedUser(id: string, input: UpdateUserInput): UserRecord {
  return {
    ...buildUser(),
    id,
    ...input,
    updatedAt: UPDATED_AT,
  };
}

function createRepository(
  options: { existingUser?: UserRecord | null; existingById?: UserRecord | null } = {},
) {
  const findById = vi.fn(async (id: string): Promise<UserRecord | null> => {
    const user = options.existingUser;
    return user && user.id === id ? user : null;
  });
  const update = vi.fn(async (id: string, input: UpdateUserInput): Promise<UserRecord> =>
    buildUpdatedUser(id, input),
  );
  const findByStudentOrStaffId = vi.fn(async (studentOrStaffId: string) => {
    const user = options.existingById;
    return user && user.studentOrStaffId === studentOrStaffId ? user : null;
  });
  const repository: IUserRepository = {
    findByStudentOrStaffId,
    findByEmail: async () => null,
    searchByName: async () => ({ data: [], total: 0, page: 1, limit: 12, totalPages: 0 }),
    branchExists: async () => true,
    create: async () => buildUser(),
    findById,
    update,
  };
  return { repository, findById, update, findByStudentOrStaffId };
}

describe("UpdateUserUsecase", () => {
  it("อัปเดตสำเร็จ: เปลี่ยน fullName/status → คืน UserPublic ที่แก้แล้ว updatedAt เปลี่ยน ไม่มี passwordHash", async () => {
    const { repository, update } = createRepository({ existingUser: buildUser() });
    const usecase = new UpdateUserUsecase(repository);

    const result = await usecase.execute({
      command: { fullName: "นิสิตปรับปรุง", status: "suspended" },
      id: "u-1",
      actorId: "u-admin",
    });

    expect(result.user.fullName).toBe("นิสิตปรับปรุง");
    expect(result.user.status).toBe("suspended");
    expect(result.user.updatedAt).toBe(UPDATED_AT);
    expect(result.user.updatedAt).not.toBe(ORIGINAL_UPDATED_AT);
    expect(result.user).not.toHaveProperty("passwordHash");
    expect(update).toHaveBeenCalledWith("u-1", { fullName: "นิสิตปรับปรุง", status: "suspended" });
  });

  it("type-level: command รับไม่ได้ email/password (ไม่มี field เหล่านี้)", () => {
    // @ts-expect-error — email ไม่ใช่ field ที่แก้ไขได้ผ่าน path นี้
    const badEmailCommand: IUpdateUserCommand = { email: "a@x.ac.th" };
    // @ts-expect-error — password ไม่ใช่ field ที่แก้ไขได้ผ่าน path นี้
    const badPasswordCommand: IUpdateUserCommand = { password: "secret123" };
    expect(badEmailCommand).toBeDefined();
    expect(badPasswordCommand).toBeDefined();
  });

  it("actorId == id และเปลี่ยน role/status → DomainForbiddenError 403 ก่อนเรียก repo", async () => {
    const { repository, findById, update } = createRepository({ existingUser: buildUser() });
    const usecase = new UpdateUserUsecase(repository);

    const error = await usecase
      .execute({ command: { role: "librarian" }, id: "u-1", actorId: "u-1" })
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(DomainForbiddenError);
    expect(error).toMatchObject({
      statusCode: 403,
      message: "ไม่สามารถเปลี่ยนสถานะ/บทบาทของตัวเองได้",
    });
    expect(findById).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it("actorId == id แต่แก้เฉพาะ fullName → ผ่านได้ (guard ไม่ฟ้อง)", async () => {
    const { repository, update } = createRepository({ existingUser: buildUser() });
    const usecase = new UpdateUserUsecase(repository);

    const result = await usecase.execute({
      command: { fullName: "ชื่อใหม่" },
      id: "u-1",
      actorId: "u-1",
    });

    expect(result.user.fullName).toBe("ชื่อใหม่");
    expect(update).toHaveBeenCalledTimes(1);
  });

  it("หา user ไม่เจอ (findById null) → DomainNotFoundError 404 (ไม่พบสมาชิกที่ค้นหา)", async () => {
    const { repository, update } = createRepository({ existingUser: null });
    const usecase = new UpdateUserUsecase(repository);

    const error = await usecase
      .execute({ command: { fullName: "ใครก็ได้" }, id: "u-ghost", actorId: "u-admin" })
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(DomainNotFoundError);
    expect(error).toMatchObject({ statusCode: 404, message: "ไม่พบสมาชิกที่ค้นหา" });
    expect(update).not.toHaveBeenCalled();
  });

  it("studentOrStaffId ซ้ำกับคนอื่น (id ต่างกัน) → DomainConflictError 409 (รหัสนักศึกษา/พนักงานนี้ถูกใช้งานแล้ว)", async () => {
    const { repository, update } = createRepository({
      existingUser: buildUser({ id: "u-1", studentOrStaffId: "610012345" }),
      existingById: buildUser({ id: "u-other", studentOrStaffId: "610099999" }),
    });
    const usecase = new UpdateUserUsecase(repository);

    const error = await usecase
      .execute({ command: { studentOrStaffId: "610099999" }, id: "u-1", actorId: "u-admin" })
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(DomainConflictError);
    expect(error).toMatchObject({
      statusCode: 409,
      message: "รหัสนักศึกษา/พนักงานนี้ถูกใช้งานแล้ว",
    });
    expect(update).not.toHaveBeenCalled();
  });

  it("studentOrStaffId เหมือนเดิมของตัวเอง (id เดียวกัน) → ผ่าน ไม่ conflict", async () => {
    const { repository, update } = createRepository({
      existingUser: buildUser({ id: "u-1", studentOrStaffId: "610012345" }),
      existingById: buildUser({ id: "u-1", studentOrStaffId: "610012345" }),
    });
    const usecase = new UpdateUserUsecase(repository);

    const result = await usecase.execute({
      command: { studentOrStaffId: "610012345" },
      id: "u-1",
      actorId: "u-admin",
    });

    expect(result.user.id).toBe("u-1");
    expect(update).toHaveBeenCalledTimes(1);
  });

  it("body ว่าง (ไม่มี field) → DomainError 422 (ไม่พบข้อมูลที่ต้องการแก้ไข) ก่อนเรียก repo", async () => {
    const { repository, findById, update } = createRepository({ existingUser: buildUser() });
    const usecase = new UpdateUserUsecase(repository);

    const error = await usecase
      .execute({ command: {}, id: "u-1", actorId: "u-admin" })
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(DomainError);
    expect(error).toMatchObject({ statusCode: 422, message: "ไม่พบข้อมูลที่ต้องการแก้ไข" });
    expect(findById).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });
});
