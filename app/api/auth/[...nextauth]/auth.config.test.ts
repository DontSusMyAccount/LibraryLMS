// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { authConstructorMock, credentialsFactoryMock, CredentialsSigninStub } = vi.hoisted(() => {
  class CredentialsSigninStub extends Error {}
  const authConstructorMock = vi.fn();
  const credentialsFactoryMock = vi.fn();
  authConstructorMock.mockReturnValue({
    handlers: {},
    auth: vi.fn(),
    signIn: vi.fn(),
    signOut: vi.fn(),
  });
  credentialsFactoryMock.mockImplementation((config: unknown) => config);
  return { authConstructorMock, credentialsFactoryMock, CredentialsSigninStub };
});

vi.mock("next-auth", () => ({
  default: authConstructorMock,
  CredentialsSignin: CredentialsSigninStub,
}));

vi.mock("next-auth/providers/credentials", () => ({ default: credentialsFactoryMock }));

import "@/auth";

const { fetchMock } = vi.hoisted(() => ({ fetchMock: vi.fn() }));

interface AuthorizeSignature {
  authorize: (credentials: { email?: string; password?: string }) => Promise<unknown>;
}

const providerConfig = credentialsFactoryMock.mock.calls[0][0] as AuthorizeSignature;
const authorize = providerConfig.authorize;

const LOGIN_PAYLOAD = (body: unknown, status: number): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

beforeEach(() => {
  process.env.NEXT_PUBLIC_API_URL = "https://api.example.test";
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("auth credentials provider authorize()", () => {
  it("maps backend 401 with inactive-account message to the inactive_account code", async () => {
    fetchMock.mockResolvedValue(
      LOGIN_PAYLOAD({ success: false, error: "บัญชีผู้ใช้ถูกระงับใช้งาน" }, 401),
    );

    await expect(
      authorize({ email: "suspended@lib.test", password: "secret" }),
    ).rejects.toMatchObject({ code: "inactive_account" });
  });

  it("maps backend 401 with wrong-credentials message to the invalid_credentials code", async () => {
    fetchMock.mockResolvedValue(
      LOGIN_PAYLOAD({ success: false, error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" }, 401),
    );

    await expect(authorize({ email: "admin@lib.test", password: "wrong" })).rejects.toMatchObject({
      code: "invalid_credentials",
    });
  });

  it("returns the session user when the backend login succeeds", async () => {
    fetchMock.mockResolvedValue(
      LOGIN_PAYLOAD(
        {
          success: true,
          data: {
            token: "jwt-token",
            user: {
              id: "usr_001",
              email: "admin@lib.test",
              fullName: "บรรณารักษ์ สมใจ",
              role: "admin",
              status: "active",
            },
          },
        },
        200,
      ),
    );

    const user = await authorize({ email: "admin@lib.test", password: "secret" });
    expect(user).toMatchObject({
      id: "usr_001",
      email: "admin@lib.test",
      name: "บรรณารักษ์ สมใจ",
      role: "admin",
      status: "active",
    });
  });
});
