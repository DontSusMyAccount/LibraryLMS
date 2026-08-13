import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const nextConfig: NextConfig = {};

export default nextConfig;

// เรียกเฉพาะตอน `next dev` — ตอน build (`next build`) การ init นี้จะพยายาม
// emulate Hyperdrive ผ่าน getPlatformProxy แล้ว crash เพราะไม่มี local Postgres
if (process.env.NEXT_PHASE === "phase-development-server") {
  initOpenNextCloudflareForDev();
}
