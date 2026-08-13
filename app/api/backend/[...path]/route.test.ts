// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { UserRole, UserStatus } from "@libsys/shared";

const { authMock } = vi.hoisted(() => ({ authMock: vi.fn() }));
const { fetchMock } = vi.hoisted(() => ({ fetchMock: vi.fn() }));

vi.mock("@/auth", () => ({ auth: authMock }));

import { handleProxyRequest } from "./route";

const API_URL = "https://api.example.test";
const INTERNAL_SECRET = "test-internal-secret-value";

interface ActiveSessionUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  status: UserStatus;
}

const ACTIVE_USER: ActiveSessionUser = {
  id: "usr_001",
  email: "admin@lib.test",
  fullName: "บรรณารักษ์ สมใจ",
  role: "admin",
  status: "active",
};

function buildSession(user: ActiveSessionUser | null) {
  if (user === null) {
    return null;
  }
  return { user: { ...user }, expires: new Date(Date.now() + 60_000).toISOString() };
}

function okResponse(body = '{"success":true,"data":[]}', status = 200): Response {
  return new Response(body, { status, headers: { "content-type": "application/json" } });
}

function requestHeaders(extra: Record<string, string> = {}): Headers {
  return new Headers({
    accept: "application/json",
    cookie: "next-auth.session-token=stale",
    authorization: "Bearer spoofed-token",
    host: "client.example.test",
    ...extra,
  });
}

function proxyInput(path: string[], method = "GET", headers?: Headers, search?: URLSearchParams) {
  return { method, path, headers: headers ?? requestHeaders(), search };
}

beforeEach(() => {
  process.env.NEXT_PUBLIC_API_URL = API_URL;
  process.env.INTERNAL_SECRET = INTERNAL_SECRET;
  authMock.mockReset();
  fetchMock.mockReset();
  fetchMock.mockResolvedValue(okResponse());
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("app/api/backend/[...path] proxy route", () => {
  it("injects X-User-* headers and X-Internal-Secret for an active session", async () => {
    authMock.mockResolvedValue(buildSession(ACTIVE_USER));

    const response = await handleProxyRequest(proxyInput(["categories"]));
    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${API_URL}/categories`);
    const forwarded = new Headers(init.headers);
    expect(forwarded.get("x-user-id")).toBe(ACTIVE_USER.id);
    expect(forwarded.get("x-user-role")).toBe(ACTIVE_USER.role);
    expect(forwarded.get("x-user-status")).toBe(ACTIVE_USER.status);
    expect(forwarded.get("x-fullname")).toBe(encodeURIComponent(ACTIVE_USER.fullName));
    expect(forwarded.get("x-user-email")).toBe(ACTIVE_USER.email);
    expect(forwarded.get("x-internal-secret")).toBe(INTERNAL_SECRET);
  });

  it("strips browser-controlled and spoofable headers before forwarding", async () => {
    authMock.mockResolvedValue(buildSession(ACTIVE_USER));
    const headers = requestHeaders({
      "x-user-id": "spoofed",
      "x-internal-secret": "spoofed-secret",
    });

    await handleProxyRequest(proxyInput(["books"], "GET", headers));

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const forwarded = new Headers(init.headers);
    expect(forwarded.get("cookie")).toBeNull();
    expect(forwarded.get("authorization")).toBeNull();
    expect(forwarded.get("host")).toBeNull();
    expect(forwarded.get("x-user-id")).toBe(ACTIVE_USER.id);
    expect(forwarded.get("x-internal-secret")).toBe(INTERNAL_SECRET);
    expect(forwarded.get("accept")).toBe("application/json");
  });

  it("returns 401 when there is no session and does not call the backend", async () => {
    authMock.mockResolvedValue(null);

    const response = await handleProxyRequest(proxyInput(["health"]));
    expect(response.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns 401 when the session user is not active", async () => {
    authMock.mockResolvedValue(buildSession({ ...ACTIVE_USER, status: "suspended" }));

    const response = await handleProxyRequest(proxyInput(["health"]));
    expect(response.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns 503 with a Thai message when the backend fetch fails or times out", async () => {
    authMock.mockResolvedValue(buildSession(ACTIVE_USER));
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));

    const response = await handleProxyRequest(proxyInput(["health"]));
    expect(response.status).toBe(503);
    const body = (await response.json()) as { success?: boolean; error?: string };
    expect(body.error).toContain("ระบบไม่พร้อมใช้งาน");
  });

  it("sets public max-age=300 cache policy for category GETs with status < 400", async () => {
    authMock.mockResolvedValue(buildSession(ACTIVE_USER));

    const response = await handleProxyRequest(proxyInput(["catalog", "categories"]));
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("public, max-age=300");
  });

  it("sets no-store for non-category GETs with status < 400", async () => {
    authMock.mockResolvedValue(buildSession(ACTIVE_USER));

    const response = await handleProxyRequest(proxyInput(["books"]));
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("forwards query params to the backend with correct encoding", async () => {
    authMock.mockResolvedValue(buildSession(ACTIVE_USER));
    const search = new URLSearchParams({
      page: "2",
      limit: "12",
      search: "คณิต",
      categoryId: "cat-1",
    });

    await handleProxyRequest(proxyInput(["books"], "GET", undefined, search));

    const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(
      `${API_URL}/books?page=2&limit=12&search=%E0%B8%84%E0%B8%93%E0%B8%B4%E0%B8%95&categoryId=cat-1`,
    );
  });

  it("does not apply cache policy to non-GET methods or failed upstream responses", async () => {
    authMock.mockResolvedValue(buildSession(ACTIVE_USER));

    fetchMock.mockResolvedValue(new Response("boom", { status: 500 }));
    const failed = await handleProxyRequest(proxyInput(["categories"]));
    expect(failed.headers.get("cache-control")).toBeNull();

    fetchMock.mockResolvedValue(okResponse());
    const posted = await handleProxyRequest(proxyInput(["loans"], "POST"));
    expect(posted.headers.get("cache-control")).toBeNull();
  });
});
