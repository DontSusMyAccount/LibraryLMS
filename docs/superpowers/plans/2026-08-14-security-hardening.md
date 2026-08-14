# Security Hardening — LibraryLMS

**Date:** 2026-08-14
**Branch:** dev-ohm
**Status:** Active

## Objective

ปิดช่องโหว่ที่พบใน security audit ของ production (attpon.online):

1. **M3+N3** Web ไม่มี security headers + `/login` cache 1 ปี
2. **M2** CORS เปิดกว้าง (reflect ทุก origin + credentials)
3. **M4** JWT_SECRET fallback เป็น AUTH_SECRET ตัวเดียว
4. **M5** Seed credential demo  hardcode (`Admin@1234`) + sidebar แสดงอีเมลแข็ง
5. **N1** BFF proxy body ไม่มี size limit
6. **B1** Rate limit พังบน Workers (elysia-rate-limit ใช้ server object ไม่มีบน CF)
7. **B2** Production DB schema drift / ไม่ migrate → login 500 (ค้างจาก audit รอบก่อน)

## Global Constraints

- UI text เป็นภาษาไทย (user-facing strings)
- ไม่ใช้ `any` — strict TypeScript
- Icons: lucide-react เท่านั้น
- Deploy ไม่ทำเอง — แก้ใน repo + config แล้วให้ user deploy / Workers Builds
- ทุก task ต้องมีวิธี verify (test หรือ curl จริง)
- Query ที่ mock ใน test ต้องไม่เปลี่ยน behavior ที่ทดสอบอยู่แล้ว

## Tasks

### Task 1: Security headers + cache policy
**Files:** `next.config.ts`, `public/_headers`
- เพิ่ม `headers()` ใน next.config.ts: CSP (default-src 'self' + style unsafe-inline + img data: https:), X-Frame-Options DENY, X-Content-Type-Options nosniff, Strict-Transport-Security (max-age=31536000; includeSubDomains), Referrer-Policy strict-origin-when-cross-origin, Permissions-Policy (camera=(), microphone=(), geolocation=())
- `public/_headers`: คง rule `/_next/static/*` immutable ไว้, เพิ่ม `/login` → `no-store`, เพิ่ม security headers สำหรับ static pages ทั้งหมด
- **Verify:** `bun run build:cf` ผ่าน + curl header บน dev server/static output

### Task 2: CORS จำกัด origin
**Files:** `server/src/app.factory.ts`
- `cors({ origin: isDev ? true : "https://attpon.online", credentials: false })`
- ตรวจ test ที่มีอยู่ไม่พัง (security/integration/e2e ใช้ localhost — dev mode origin true ครอบ)
- **Verify:** `bun run test:security` + `test:unit` ผ่าน

### Task 3: JWT_SECRET แยกจาก AUTH_SECRET (ops)
**Files:** ไม่แก้โค้ด (env.ts รองรับแล้ว) — ตั้ง secret บน worker
- สร้าง JWT_SECRET แบบ random ≥32 chars
- `bunx wrangler secret put JWT_SECRET` บน librarylms-api (ผ่าน API/CLI)
- **Verify:** `bunx wrangler secret list` เห็น JWT_SECRET; API login ยัง 200 หลัง deploy (ต้องรอ redeploy)

### Task 4: Seed credential hardening
**Files:** `server/src/seed.ts`, `e2e/helpers.ts` (+ test setups ที่ใช้ Admin@1234)
- seed: ถ้า env `SEED_ADMIN_PASSWORD` ไม่ตั้ง → สร้าง random + log ครั้งเดียว; ถ้าตั้ง → ใช้ค่านั้น (CI/test/e2e ตั้งให้)
- `.env.example` เพิ่มหมายเหตุ SEED_ADMIN_PASSWORD
- e2e/CI ตั้ง SEED_ADMIN_PASSWORD=Admin@1234 ยังใช้ได้
- **Verify:** `bun run db:seed` ไม่มี env → ได้ random (ไม่ print 555); test ที่เกี่ยวข้องผ่าน

### Task 5: BFF proxy body size limit
**Files:** `app/api/backend/[...path]/route.ts`, `app/api/backend/[...path]/route.test.ts`
- จำกัด body ≤ 10MB (ใช้ content-length + ป้องกัน chunked) → 413 พร้อมข้อความไทย
- เพิ่ม test: body เกิน → 413, body ปกติยังผ่าน
- **Verify:** `bunx vitest run app/api/backend` ผ่าน

### Task 6: Rate limit via Cloudflare (ops)
**Files:** ไม่แก้โค้ด — ตั้ง rule บน Cloudflare
- WAF custom rule / rate limiting rule บน zone attpon.online: `/api-backend/auth/login` → 20 req/min/IP → BLOCK
- ใช้ API (token อ่าน zone ได้แล้ว) หรือให้ user ตั้ง dashboard
- **Verify:** API ruleset มี rule; (optional) ยิง 21 ครั้งเร็ว → 429/block

### Task 7: Production DB reconciliation (blocked-on-info)
**Files:** ไม่แก้โค้ด — สอบ .env + migrate
- หาว่า .env DATABASE_URL ชี้ที่ไหน (เทียบกับ Hyperdrive host `ep-plain-pine-az6motnu-pooler.c-3.ap-southeast-1.aws.neon.tech` / db `neondb`)
- ถ้าเป็นตัวเดียวกัน → schema drift (db:push ล้ม "column id is in a primary key") → reconcile schema ให้ตรง drizzle
- ถ้าคนละตัว → migrate+seed ไป DB ที่ Hyperdrive ชี้
- **Verify:** `curl login admin@library.local` → 401 (ไม่ใช่ 500)

## Out of Scope (defer)
- middleware.ts → proxy.ts migration (Next 16 deprecation warning) — เป็น deprecation ไม่ใช่ vulnerability
- ปิด API workers.dev subdomain — ทำหลัง custom domain แน่นอน