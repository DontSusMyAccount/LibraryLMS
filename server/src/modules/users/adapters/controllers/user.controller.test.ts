import "reflect-metadata";

import { Elysia } from "elysia";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { toHttpError } from "../../../../libs/http-error.factory";
import type { UserPublic } from "../../../../shared";
import type { CreateUserUsecase } from "../../applications/usecases/create-user.usecase";
import type { FindUserUsecase } from "../../applications/usecases/find-user.usecase";
import type { ListUsersUsecase } from "../../applications/usecases/list-users.usecase";
import type { UpdateUserUsecase } from "../../applications/usecases/update-user.usecase";
import { UsersController } from "./user.controller";

const JWT_SECRET = "test-jwt-secret";
const INTERNAL_SECRET = "test-internal-secret";

const ADMIN_HEADERS = {
  "x-internal-secret": INTERNAL_SECRET,
  "x-user-id": "admin-1",
  "x-user-role": "admin",
  "x-user-status": "active",
  "x-fullname": encodeURIComponent("ผู้ดูแลระบบ"),
};

const STUDENT_HEADERS = {
  "x-internal-secret": INTERNAL_SECRET,
  "x-user-id": "student-1",
  "x-user-role": "student",
  "x-user-status": "active",
  "x-fullname": encodeURIComponent("นิสิตคนหนึ่ง"),
};

function buildPublicUser(overrides: Partial<UserPublic> = {}): UserPublic {
  return {
    id: "u-1",
    email: "a@x.ac.th",
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

function buildApp(
  createUserUsecase: CreateUserUsecase,
  updateUserUsecase: UpdateUserUsecase,
): Elysia {
  const controller = new UsersController(
    createUserUsecase,
    updateUserUsecase,
    { execute: vi.fn() } as unknown as FindUserUsecase,
    { execute: vi.fn() } as unknown as ListUsersUsecase,
    JWT_SECRET,
    INTERNAL_SECRET,
  );

  return new Elysia()
    .onError(({ code, error, set }) => {
      const httpError = toHttpError(error, code);
      set.status = httpError.statusCode;
      return httpError.body;
    })
    .use(controller.getRoutes() as unknown as Elysia) as unknown as Elysia;
}

function jsonRequest(path: string, init: RequestInit): Request {
  return new Request(`http://localhost${path}`, {
    ...init,
    headers: { "content-type": "application/json", ...(init.headers as Record<string, string>) },
  });
}

describe("UsersController routes", () => {
  let createUserUsecase: CreateUserUsecase;
  let updateUserUsecase: UpdateUserUsecase;
  let app: Elysia;

  beforeEach(() => {
    createUserUsecase = { execute: vi.fn() } as unknown as CreateUserUsecase;
    updateUserUsecase = { execute: vi.fn() } as unknown as UpdateUserUsecase;
    app = buildApp(createUserUsecase, updateUserUsecase);
  });

  it("POST /users เรียก CreateUserUsecase และคืน 200 พร้อม data", async () => {
    const execute = vi.fn(async () => ({ user: buildPublicUser() }));
    createUserUsecase.execute = execute;
    const body = {
      email: "new.student@x.ac.th",
      fullName: "นิสิตใหม่",
      role: "student",
      password: "secret123",
      memberType: "undergraduate",
      studentOrStaffId: "610012345",
    };

    const res = await app.handle(
      jsonRequest("/users", { method: "POST", headers: ADMIN_HEADERS, body: JSON.stringify(body) }),
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true, data: buildPublicUser() });
    expect(execute).toHaveBeenCalledWith({ command: body });
  });

  it("PATCH /users/:id ส่ง id + body + actorId (user.id) ให้ UpdateUserUsecase", async () => {
    const execute = vi.fn(async () => ({ user: buildPublicUser() }));
    updateUserUsecase.execute = execute;
    const body = { fullName: "ชื่อใหม่", status: "suspended" };

    const res = await app.handle(
      jsonRequest("/users/u-1", {
        method: "PATCH",
        headers: ADMIN_HEADERS,
        body: JSON.stringify(body),
      }),
    );

    expect(res.status).toBe(200);
    expect(execute).toHaveBeenCalledWith({ command: body, id: "u-1", actorId: "admin-1" });
  });

  it("POST /users ปฏิเสธ role ที่ไม่อนุญาต (student → 403) โดยไม่เรียก usecase", async () => {
    const res = await app.handle(
      jsonRequest("/users", {
        method: "POST",
        headers: STUDENT_HEADERS,
        body: JSON.stringify({
          email: "a@x.ac.th",
          fullName: "x",
          role: "student",
          password: "secret123",
        }),
      }),
    );

    expect(res.status).toBe(403);
    expect(createUserUsecase.execute).not.toHaveBeenCalled();
  });

  it("POST /users ปฏิเสธ body ไม่ครบ (missing email) → 422", async () => {
    const res = await app.handle(
      jsonRequest("/users", {
        method: "POST",
        headers: ADMIN_HEADERS,
        body: JSON.stringify({ fullName: "x", role: "student", password: "secret123" }),
      }),
    );

    expect(res.status).toBe(422);
    expect(createUserUsecase.execute).not.toHaveBeenCalled();
  });

  it("POST /users ปฏิเสธ email ผิดรูปแบบ → 422", async () => {
    const res = await app.handle(
      jsonRequest("/users", {
        method: "POST",
        headers: ADMIN_HEADERS,
        body: JSON.stringify({
          email: "ไม่ใช่อีเมล",
          fullName: "x",
          role: "student",
          password: "secret123",
        }),
      }),
    );

    expect(res.status).toBe(422);
    expect(createUserUsecase.execute).not.toHaveBeenCalled();
  });

  it("PATCH /users/:id ปฏิเสธ body ว่าง → 422", async () => {
    const res = await app.handle(
      jsonRequest("/users/u-1", {
        method: "PATCH",
        headers: ADMIN_HEADERS,
        body: "{}",
      }),
    );

    expect(res.status).toBe(422);
    expect(updateUserUsecase.execute).not.toHaveBeenCalled();
  });
});
