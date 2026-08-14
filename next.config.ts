import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

// CSP: script-src ต้องมี 'unsafe-inline' เพราะ Next App Router inject
// inline flight-data scripts (`self.__next_f.push(...)`) ตอน prerender ที่ build time
// — nonce CSP ใช้ไม่ได้กับ static prerendered pages (nonce ต้อง generate ตอน
// request; static pages ถูกสร้างก่อนมี request) และการบังคับ dynamic rendering
// จะฆ่า static generation/CDN caching ของทุกหน้า → ยอมรับ trade-off นี้
// ถ้าต้องการ strict CSP จริงต้องใช้ experimental.sri (webpack-only, ยังไม่ stable)
const securityHeaders: Record<string, string> = {
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  "Content-Security-Policy":
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
};

const nextConfig: NextConfig = {
  headers: async () => [
    {
      source: "/(.*)",
      headers: Object.entries(securityHeaders).map(([key, value]) => ({
        key,
        value,
      })),
    },
    {
      // หน้า login เป็นหน้า prerender static → ถ้า edge cache ไว้จะเก็บ HTML
      // หน้า login (รวม flight data ใน JS) นานเกินความจำเป็น
      source: "/login",
      headers: [{ key: "Cache-Control", value: "no-store" }],
    },
    {
      // root redirect ไป /login หรือ /dashboard ตาม session → cache ที่ edge
      // จะทำให้ user ที่ login แล้วเห็น redirect เก่า
      source: "/",
      headers: [{ key: "Cache-Control", value: "no-store" }],
    },
  ],
};

export default nextConfig;

// เรียกเฉพาะตอน `next dev` — ตอน build (`next build`) การ init นี้จะพยายาม
// emulate Hyperdrive ผ่าน getPlatformProxy แล้ว crash เพราะไม่มี local Postgres
if (process.env.NEXT_PHASE === "phase-development-server") {
  initOpenNextCloudflareForDev();
}
