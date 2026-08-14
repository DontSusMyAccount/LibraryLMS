import { auth } from "@/auth";
import type { NextRequest } from "next/server";

const PROXY_TIMEOUT_MS = 30_000;

// จำกัดขนาด body ที่ BFF ส่งต่อให้ backend — ป้องกัน DoS ผ่าน request ตัวใหญ่
// (เดิมอ่านทั้ง body เข้า memory โดยไม่มีขีดจำกัด)
const MAX_BODY_BYTES = 10 * 1024 * 1024; // 10MB
const BODY_TOO_LARGE_MESSAGE = "ข้อมูลที่ส่งมามีขนาดใหญ่เกินกำหนด";

const CATEGORY_CACHE_CONTROL = "public, max-age=300";
const DEFAULT_GET_CACHE_CONTROL = "no-store";

const UNAUTHORIZED_MESSAGE = "ยังไม่ได้เข้าสู่ระบบ หรือ session หมดอายุ";
const INACTIVE_ACCOUNT_MESSAGE = "บัญชีผู้ใช้ถูกระงับใช้งาน";
const BACKEND_UNAVAILABLE_MESSAGE = "ระบบไม่พร้อมใช้งาน กรุณาลองใหม่";
const PROXY_CONFIG_MISSING_MESSAGE = "ระบบไม่พร้อมใช้งาน กรุณาลองใหม่";

const INJECTED_PROXY_HEADERS = {
  internalSecret: "x-internal-secret",
  userId: "x-user-id",
  userRole: "x-user-role",
  userStatus: "x-user-status",
  fullName: "x-fullname",
  userEmail: "x-user-email",
} as const;

const STRIPPED_BROWSER_HEADERS = ["cookie", "authorization", "host"] as const;

const STRIPPED_SPOOFABLE_HEADERS = Object.values(INJECTED_PROXY_HEADERS);

export interface ProxyRequestInput {
  method: string;
  path: string[];
  headers: Headers;
  body?: BodyInit | null;
  search?: URLSearchParams;
}

function proxyError(status: number, message: string): Response {
  return new Response(JSON.stringify({ success: false as const, error: message }), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export async function handleProxyRequest(input: ProxyRequestInput): Promise<Response> {
  const session = await auth();
  const identity = session?.user;
  if (!identity) {
    return proxyError(401, UNAUTHORIZED_MESSAGE);
  }
  if (identity.status !== "active") {
    return proxyError(401, INACTIVE_ACCOUNT_MESSAGE);
  }

  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
  const internalSecret = process.env.INTERNAL_SECRET;
  if (!apiUrl || !internalSecret) {
    return proxyError(503, PROXY_CONFIG_MISSING_MESSAGE);
  }

  const headers = new Headers(input.headers);
  for (const name of [...STRIPPED_BROWSER_HEADERS, ...STRIPPED_SPOOFABLE_HEADERS]) {
    headers.delete(name);
  }
  headers.set(INJECTED_PROXY_HEADERS.userId, identity.id);
  headers.set(INJECTED_PROXY_HEADERS.userRole, identity.role);
  headers.set(INJECTED_PROXY_HEADERS.userStatus, identity.status);
  headers.set(INJECTED_PROXY_HEADERS.fullName, encodeURIComponent(identity.fullName));
  headers.set(INJECTED_PROXY_HEADERS.internalSecret, internalSecret);
  if (identity.email) {
    headers.set(INJECTED_PROXY_HEADERS.userEmail, identity.email);
  }

  const pathSegments = input.path.map((segment) => encodeURIComponent(segment)).join("/");
  let targetUrl = `${apiUrl.replace(/\/+$/, "")}/${pathSegments}`;
  const queryString = input.search?.toString();
  if (queryString) {
    targetUrl += `?${queryString}`;
  }

  let upstream: Response;
  try {
    upstream = await fetch(targetUrl, {
      method: input.method,
      headers,
      body: input.body,
      signal: AbortSignal.timeout(PROXY_TIMEOUT_MS),
      cache: "no-store",
    });
  } catch {
    return proxyError(503, BACKEND_UNAVAILABLE_MESSAGE);
  }

  const responseHeaders = new Headers(upstream.headers);
  if (input.method === "GET" && upstream.status < 400) {
    const isCategoryPath = input.path.join("/").includes("categories");
    responseHeaders.set(
      "cache-control",
      isCategoryPath ? CATEGORY_CACHE_CONTROL : DEFAULT_GET_CACHE_CONTROL,
    );
  }

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });
}

async function proxyRoute(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
): Promise<Response> {
  const { path } = await context.params;

  // content-length ที่ browser ประกาศมาเกิน limit → reject ทันที ไม่ต้องอ่าน body
  const declaredLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    return proxyError(413, BODY_TOO_LARGE_MESSAGE);
  }

  // chunked/ไม่ประกาศ content-length → อ่านแล้วตรวจ byteLength (browser ส่วนใหญ่
  // ตั้ง content-length ให้อัตโนมัติ แต่กันกรณีที่ส่งแบบ chunked)
  const body = await request.arrayBuffer();
  if (body.byteLength > MAX_BODY_BYTES) {
    return proxyError(413, BODY_TOO_LARGE_MESSAGE);
  }

  return handleProxyRequest({
    method: request.method,
    path,
    headers: new Headers(request.headers),
    search: request.nextUrl.searchParams,
    body: body.byteLength > 0 ? body : undefined,
  });
}

export const GET = proxyRoute;
export const POST = proxyRoute;
export const PUT = proxyRoute;
export const PATCH = proxyRoute;
export const DELETE = proxyRoute;
