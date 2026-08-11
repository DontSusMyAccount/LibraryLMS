import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AuthUser } from "./auth.store";

const mocks = vi.hoisted(() => ({
  nextAuthSignIn: vi.fn(),
  nextAuthSignOut: vi.fn(),
  getSession: vi.fn(),
  routerPush: vi.fn(),
}));

vi.mock("next-auth/react", () => ({
  signIn: mocks.nextAuthSignIn,
  signOut: mocks.nextAuthSignOut,
  getSession: mocks.getSession,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mocks.routerPush,
    replace: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
  }),
}));

import { useAuthStore } from "./auth.store";

const CREDENTIALS = { email: "admin@library.ac.th", password: "secret-1234" };

function makeUser(overrides: Partial<AuthUser> = {}): AuthUser {
  return {
    id: "user-1",
    email: "admin@library.ac.th",
    fullName: "ผู้ดูแลระบบ",
    role: "admin",
    status: "active",
    ...overrides,
  };
}

function mockSignInSuccess(user: AuthUser): void {
  mocks.nextAuthSignIn.mockResolvedValue({ ok: true, url: "/dashboard", user });
}

beforeEach(() => {
  useAuthStore.setState({ session: null, isSubmitting: false, errorMessage: null });
  mocks.nextAuthSignIn.mockReset();
  mocks.nextAuthSignOut.mockReset();
  mocks.getSession.mockReset();
  mocks.routerPush.mockReset();
});

describe("auth.store signIn", () => {
  it("signIn สำเร็จ → ตั้ง session จาก user payload ของ signIn และ redirect ไป /dashboard", async () => {
    const admin = makeUser();
    mockSignInSuccess(admin);
    const router = { push: mocks.routerPush };

    const ok = await useAuthStore.getState().signIn(CREDENTIALS, router);

    expect(ok).toBe(true);
    expect(useAuthStore.getState().session).toEqual(admin);
    expect(useAuthStore.getState().errorMessage).toBeNull();
    expect(mocks.nextAuthSignIn).toHaveBeenCalledWith("credentials", {
      email: CREDENTIALS.email,
      password: CREDENTIALS.password,
      redirect: false,
    });
    expect(mocks.routerPush).toHaveBeenCalledWith("/dashboard");
  });

  it("librarian ก็ redirect ไป /dashboard เช่นกัน", async () => {
    const librarian = makeUser({
      id: "user-2",
      email: "librarian@library.ac.th",
      fullName: "บรรณารักษ์",
      role: "librarian",
    });
    mockSignInSuccess(librarian);
    const router = { push: mocks.routerPush };

    await useAuthStore.getState().signIn(CREDENTIALS, router);

    expect(useAuthStore.getState().session?.role).toBe("librarian");
    expect(mocks.routerPush).toHaveBeenCalledWith("/dashboard");
  });

  it("signIn ผิด → เก็บข้อความไทย 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' ใต้ช่อง และไม่ redirect", async () => {
    mocks.nextAuthSignIn.mockResolvedValue({
      ok: false,
      error: "CredentialsSignin",
      code: "invalid_credentials",
      status: 401,
      url: null,
    });
    const router = { push: mocks.routerPush };

    const ok = await useAuthStore.getState().signIn(CREDENTIALS, router);

    expect(ok).toBe(false);
    expect(useAuthStore.getState().errorMessage).toBe("อีเมลหรือรหัสผ่านไม่ถูกต้อง");
    expect(useAuthStore.getState().session).toBeNull();
    expect(mocks.routerPush).not.toHaveBeenCalled();
  });

  it("บัญชีถูกระงับ → ข้อความไทย 'บัญชีผู้ใช้ถูกระงับใช้งาน'", async () => {
    mocks.nextAuthSignIn.mockResolvedValue({
      ok: false,
      error: "CredentialsSignin",
      code: "inactive_account",
      status: 401,
      url: null,
    });

    await useAuthStore.getState().signIn(CREDENTIALS, { push: mocks.routerPush });

    expect(useAuthStore.getState().errorMessage).toBe("บัญชีผู้ใช้ถูกระงับใช้งาน");
  });

  it("next-auth v5 beta ตอบ HTTP 200 พร้อม error (CredentialsSignin) → ยังถือว่า signIn ผิด ไม่ redirect", async () => {
    mocks.nextAuthSignIn.mockResolvedValue({
      ok: true,
      error: "CredentialsSignin",
      code: "invalid_credentials",
      status: 200,
      url: "http://localhost:3000/login?error=CredentialsSignin&code=invalid_credentials",
    });
    const router = { push: mocks.routerPush };

    const ok = await useAuthStore.getState().signIn(CREDENTIALS, router);

    expect(ok).toBe(false);
    expect(useAuthStore.getState().errorMessage).toBe("อีเมลหรือรหัสผ่านไม่ถูกต้อง");
    expect(useAuthStore.getState().session).toBeNull();
    expect(mocks.routerPush).not.toHaveBeenCalled();
  });

  it("network error → fallback ข้อความไทย", async () => {
    mocks.nextAuthSignIn.mockRejectedValue(new Error("network down"));
    const router = { push: mocks.routerPush };

    const ok = await useAuthStore.getState().signIn(CREDENTIALS, router);

    expect(ok).toBe(false);
    expect(useAuthStore.getState().errorMessage).toBe("เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
    expect(useAuthStore.getState().session).toBeNull();
  });
});

describe("auth.store signOut", () => {
  it("signOut → เคลียร์ session และเรียก signOut ของ next-auth แบบไม่ redirect", async () => {
    mockSignInSuccess(makeUser());
    await useAuthStore.getState().signIn(CREDENTIALS, { push: mocks.routerPush });
    mocks.nextAuthSignOut.mockResolvedValue({ url: "/login" });

    await useAuthStore.getState().signOut();

    expect(useAuthStore.getState().session).toBeNull();
    expect(mocks.nextAuthSignOut).toHaveBeenCalledWith({ redirect: false });
  });
});
