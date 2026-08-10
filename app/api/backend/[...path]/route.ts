import { auth } from "@/auth";
import type { NextRequest } from "next/server";

const PROXY_TIMEOUT_MS = 30_000;

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
  const targetUrl = `${apiUrl.replace(/\/+$/, "")}/${pathSegments}`;

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
  const body = await request.arrayBuffer();
  return handleProxyRequest({
    method: request.method,
    path,
    headers: new Headers(request.headers),
    body: body.byteLength > 0 ? body : undefined,
  });
}

export const GET = proxyRoute;
export const POST = proxyRoute;
export const PUT = proxyRoute;
export const PATCH = proxyRoute;
export const DELETE = proxyRoute;
