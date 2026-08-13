import { describe, expect, it } from "vitest";
import bcrypt from "bcryptjs";

import { DomainUnauthorizedError } from "../../../../domains/errors";
import type { UserRecord } from "../../../../shared";
import type { IAuthRepository } from "../ports/auth.repository";
import { LoginUsecase } from "./login.usecase";

const PASSWORD = "secret1";
const passwordHash = bcrypt.hashSync(PASSWORD, 4);
const JWT_SECRET = "jwt-secret-".padEnd(32, "x");
const LOGIN_COMMAND = { command: { email: "a@x.ac.th", password: PASSWORD } };

function buildUser(overrides: Partial<UserRecord> = {}): UserRecord {
  return {
    id: "u-1",
    email: "a@x.ac.th",
    passwordHash,
    fullName: "บรรณารักษ์ทดสอบ",
    role: "librarian",
    memberType: "general",
    status: "active",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function createRepository(user: UserRecord | null): IAuthRepository {
  return {
    findByEmail: async (email) => (user && email === user.email ? user : null),
  };
}

describe("LoginUsecase", () => {
  it("คืน token + user ที่ไม่มี passwordHash เมื่อ email/password ถูกต้อง", async () => {
    const usecase = new LoginUsecase(createRepository(buildUser()), JWT_SECRET);

    const result = await usecase.execute(LOGIN_COMMAND);

    expect(result.token).toBeTruthy();
    expect(result.user.role).toBe("librarian");
    expect(result.user.email).toBe("a@x.ac.th");
    expect(result.user).not.toHaveProperty("passwordHash");
  });

  it("throw DomainUnauthorizedError เมื่อ password ผิด", async () => {
    const usecase = new LoginUsecase(createRepository(buildUser()), JWT_SECRET);

    await expect(
      usecase.execute({ command: { email: "a@x.ac.th", password: "wrong-password" } }),
    ).rejects.toBeInstanceOf(DomainUnauthorizedError);
  });

  it("throw DomainUnauthorizedError เมื่อ status เป็น suspended หรือ graduated", async () => {
    for (const status of ["suspended", "graduated"] as const) {
      const usecase = new LoginUsecase(createRepository(buildUser({ status })), JWT_SECRET);

      await expect(usecase.execute(LOGIN_COMMAND)).rejects.toBeInstanceOf(DomainUnauthorizedError);
    }
  });

  it("unknown email throws ข้อความเดียวกับ password ผิด (กันการเดา user)", async () => {
    const wrongPasswordError = await new LoginUsecase(createRepository(buildUser()), JWT_SECRET)
      .execute({ command: { email: "a@x.ac.th", password: "wrong-password" } })
      .catch((error: unknown) => error);
    const unknownEmailError = await new LoginUsecase(createRepository(null), JWT_SECRET)
      .execute({ command: { email: "ghost@x.ac.th", password: "whatever" } })
      .catch((error: unknown) => error);

    expect(wrongPasswordError).toBeInstanceOf(DomainUnauthorizedError);
    expect(unknownEmailError).toBeInstanceOf(DomainUnauthorizedError);
    expect((unknownEmailError as Error).message).toBe((wrongPasswordError as Error).message);
  });
});
