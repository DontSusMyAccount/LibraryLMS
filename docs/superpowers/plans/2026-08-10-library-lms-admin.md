# Library LMS — Admin Backoffice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** สร้าง monorepo `library-lms` ฝั่ง admin backoffice ตาม spec — 5 หน้าจอ (Login, Dashboard, Catalog, Circulation, Reservations) บน Next.js + ElysiaJS (hexagonal) + Drizzle + Cloudflare R2

**Estimated tasks:** 24 | **Estimated time:** ~16-20 ชม. (ตาม wave) | **Touches:** DB / Backend API / Frontend / Auth / Storage

**Spec อ้างอิง:** `docs/superpowers/specs/2026-08-10-library-lms-admin-design.md`

---

## Current Problem / Current Solution

โปรเจกต์ `D:\Booking` ยังไม่มีโค้ดของระบบเลย — มีเพียงเอกสารออกแบบ:
- `design.md` — design system (tokens สี/ฟอนต์/รัศมี/เงา + กติกาไม่ลอก TailAdmin)
- `library-system-requirements.md` — requirements + ERD
- `db/schema.sql` — DDL PostgreSQL 13 ตาราง (source of truth)
- `_tailadmin_ref/` — template อ้างอิง **ห้ามลอกโค้ด** (ดู checklist design.md §7)
- `template_structure.md` — โครงสร้าง monorepo ต้นแบบ (external ref ของผู้ใช้)

ปัจจุบันมีเพียง `.env.example`, `.env`, `.gitignore`, spec และ git commit แรก — ต้องสร้างทุกอย่างจากศูนย์

## Proposed Approach

สร้าง monorepo เดียว (root `package.json`) ตาม template CWIE:
- **Frontend** `app/`: Next.js App Router + shadcn/ui (restyle ตาม design.md) + Lucide + Recharts + Zustand + react-hook-form — ภาษาไทยล้วน, signature "Due-Date Card"
- **Backend** `server/`: ElysiaJS แบบ hexagonal (adapters/applications/domains) + tsyringe DI + Drizzle ORM (PostgreSQL 13 ตารางตาม schema.sql) + TypeBox
- **Auth:** NextAuth v5 (HttpOnly cookie) + proxy `/api/backend/*` สอด headers `X-User-*` + `INTERNAL_SECRET`
- **API client:** Eden treaty typed จาก backend
- **Storage:** Cloudflare R2 (S3 API) สำหรับรูปปกหนังสือ
- เรียก API ผ่าน proxy เท่านั้น, error format มาตรฐาน, ทดสอบ 4 ชั้น (unit/integration/security/e2e)

## Side by Side

| Scenario | Before | After |
| -------- | ------ | ----- |
| เข้าสู่ระบบ admin | ไม่มีระบบ | Login ไทย + HttpOnly cookie + guard role (admin/librarian) |
| ดูภาพรวมงานห้องสมุด | ไม่มี | Dashboard: KPI ยืมวันนี้/ค้างส่ง/คิวจอง/ค่าปรับ + chart + ตาราง + mini calendar |
| จัดการหนังสือ | ไม่มี | Catalog: CRUD title/copy + ค้นหา pg_trgm + อัปโหลดปก R2 |
| ยืม-คืนที่เคาน์เตอร์ | ไม่มี | Circulation: checkout/checkin/renew/recall + สแตมป์ due-date |
| คิวจองหนังสือ | ไม่มี | Reservations: FIFO queue, ready/fulfilled/expired |

## Assumptions & Risks

- **Assumed:** bun 1.3.14 + node v24 พร้อมใช้งานบนเครื่อง (ตรวจแล้ว ✓)
- **Assumed:** PostgreSQL ภายนอกพร้อมเชื่อมต่อ — **docker ไม่มีในเครื่อง** ผู้ใช้ต้องเตรียม PG (local install หรือบริการอื่น) และเติม `DATABASE_URL` ใน `.env`
- **Assumed:** R2 credential ยังว่างใน `.env` — storage module เขียนได้ + ทดสอบ unit ด้วย mock; **upload integration/E2E จะ blocked จนกว่าผู้ใช้เติม R2_*** (เรียกว่าไว้ใน Task 10)
- **Assumed:** ใช้ Drizzle schema ครบ 13 ตารางจาก `db/schema.sql` (รวม `system_settings`)
- **Assumed:** version ตาม template: Next.js 16.x, React 19, Elysia 1.4.x, Tailwind v4 — ใช้ latest stable ที่เข้ากันได้
- **Risk:** Next.js 16 + NextAuth v5 + proxy config ซับซ้อน → แยกเป็น Task 14 เฉพาะ, ตรวจ e2e login ก่อน feature อื่น
- **Risk:** งานทุก task บน Windows PowerShell — คำสั่ง verify ใช้ bun/node (cross-platform) เท่านั้น, หลีกเลี่ยง bash-specific syntax
- **Risk:** การ run `bunx shadcn init` อาจ override `globals.css`/`package.json` → กำหนดให้เกิดใน Task 12 เท่านั้น (task อื่นห้ามแตะ 2 ไฟล์นี้จนกว่า Task 12 เสร็จ)
- **Risk:** `shared.ts` เป็น single source of truth → อนุญาตให้ Task 4 เขียนไฟล์นี้เท่านั้น (module อื่นเขียน DTO ใน local schemas)

## Impact

- สร้าง ~90-120 ไฟล์ใหม่ใน monorepo `library-lms` (app/ + server/ + configs)
- เพิ่มตารางทั้งหมดลง PostgreSQL ผ่าน Drizzle migration (13 ตาราง + seed borrowing_policies/หมวดหมู่/settings)
- เปิด 2 services: Next.js (:3000) + Elysia (:3001) — dev script รันพร้อมกัน
- ปรับ `.gitignore` ครอบคลุม (มีแล้ว), ไม่ commit `.env*`
- ฐานให้รอบถัดไป (Fines/Members/Reports/ฝั่งผู้ยืม) ต่อยอดจาก domain + modules เดิม

---

## Task Overview

> **For implementation tasks:** REQUIRED SUB-SKILL: Use superpowers:test-driven-development before editing production code. Each task is a RED -> GREEN -> REFACTOR slice.
> **Parallel-first:** Spawn separate sub-agents for independent lanes. Do not parallelize tasks that can race on the same files, migrations, generated artifacts, or shared state.
> **Wave 1:** Task 1-4 (โครงสร้าง) → **Wave 2:** Task 5-15 (backend modules ‖ frontend foundation) → **Wave 3:** Task 16-20 (features) → **Wave 4:** Task 21-24 (คุณภาพ)

1. **T1: Root monorepo scaffold** - Lane A | Can run together: none | Must wait for: none | TDD slice: n/a (config-only, verify = deps install + lint run)
2. **T2: Elysia server base** - Lane A | Can run together: T3, T4 | Must wait for: T1 | TDD slice: env validation test fails -> zod env.ts -> `bun run test:unit`
3. **T3: Drizzle schema + migration + seed** - Lane A | Can run together: T2, T4 | Must wait for: T1 | TDD slice: n/a (config/data, verify = db:generate + db:push + smoke query)
4. **T4: shared.ts + @libsys/shared** - Lane A | Can run together: T2, T3 | Must wait for: T1 | TDD slice: type test fails -> types -> `tsc --noEmit`
5. **T5: auth module (login + guard)** - Lane B | Can run together: T6-T10 | Must wait for: T2, T4 | TDD slice: login usecase test fails -> usecase -> test green
6. **T6: users module (lookup)** - Lane B | Can run together: T5, T7-T10 | Must wait for: T2, T4 | TDD slice: list/find usecase test fails -> usecase+repo -> green
7. **T7: catalog module** - Lane B | Can run together: T5-T6, T8-T10 | Must wait for: T2, T4 | TDD slice: create-book test fails -> usecase+repo -> green
8. **T8: circulation module** - Lane B | Can run together: T5-T7, T9-T10 | Must wait for: T2, T4 | TDD slice: due-date domain test fails -> domain -> green
9. **T9: reservations module** - Lane B | Can run together: T5-T8, T10 | Must wait for: T2, T4 | TDD slice: FIFO queue test fails -> usecase -> green
10. **T10: storage module (R2)** - Lane B | Can run together: T5-T9 | Must wait for: T2, T4 | TDD slice: adapter test (mock S3) fails -> adapter -> green
11. **T11: backend wiring (app.module + DI)** - Lane B | Can run together: none | Must wait for: T5-T10 | TDD slice: app boot test -> wire modules -> green
12. **T12: Next.js scaffold + tokens + shell** - Lane C | Can run together: T5-T10 | Must wait for: T1 | TDD slice: n/a (config/UI base, verify = `bun run dev:web` render shell + lint)
13. **T13: shadcn restyle base components** - Lane C | Can run together: T5-T11, T14-T15 | Must wait for: T12 | TDD slice: visual token test (optional) -> restyle -> build pass
14. **T14: proxy + NextAuth auth.ts** - Lane C | Can run together: T13, T15 | Must wait for: T5, T12 | TDD slice: proxy unit test fails -> route -> green
15. **T15: eden-client + helpers + routes** - Lane C | Can run together: T13, T14 | Must wait for: T4, T12 | TDD slice: edenRequest wrapper test fails -> helpers -> green
16. **T16: login feature** - Lane D | Can run together: T17-T20 | Must wait for: T13, T14, T15 | TDD slice: login store/action test fails -> feature -> green
17. **T17: dashboard feature** - Lane D | Can run together: T16, T18-T20 | Must wait for: T5, T7, T8, T13, T15 | TDD slice: kpi aggregation hook test fails -> feature -> green
18. **T18: catalog feature** - Lane D | Can run together: T16-T17, T19-T20 | Must wait for: T7, T13, T15 | TDD slice: catalog store test fails -> feature -> green
19. **T19: circulation feature** - Lane D | Can run together: T16-T18, T20 | Must wait for: T5, T6, T8, T13, T15 | TDD slice: checkout action test fails -> feature -> green
20. **T20: reservations feature** - Lane D | Can run together: T16-T19 | Must wait for: T5, T6, T9, T13, T15 | TDD slice: queue hook test fails -> feature -> green
21. **T21: integration tests** - Lane E | Can run together: T22 | Must wait for: T11, T16-T20 | TDD slice: repo/API integration tests against real PG
22. **T22: security tests** - Lane E | Can run together: T21 | Must wait for: T11 | TDD slice: IDOR + role guard + suspend tests
23. **T23: e2e Playwright** - Lane E | Can run together: none | Must wait for: T16-T20, T21 | TDD slice: login→dashboard→catalog→circulation→reservation flows
24. **T24: polish (empty/error/accessibility/responsive)** - Lane E | Can run together: none | Must wait for: T16-T20 | TDD slice: a11y/empty-state checks + build + lint

---

## Task Slices

### Task 1: Root monorepo scaffold

**Files:**
- Create: `package.json`, `tsconfig.json`, `bunfig.toml`, `turbo.json`, `next.config.ts`, `tailwind.config.ts`, `postcss.config.mjs`, `eslint.config.mjs`, `prettier.config.mjs`, `lefthook.yml`, `commitlint.config.mjs`, `Dockerfile*`, `docker-compose.yml`, `AGENTS.md`, `README.md`
- Modify: `.gitignore` (ต่อเติมถ้าจำเป็น)

**Parallelization:**
- Can run with: `none`
- Must wait for: `none`
- Race risk: `package.json` + `bun.lock` — task นี้เป็นเจ้าของแต่เพียงผู้เดียว

**Config-only (TDD exception):** ไม่มี behavior ที่จะ fail test ได้ — เป็นโครงสร้างโปรเจค
- [ ] **Step 0:** ประกาศว่าเป็น config task
- [ ] **Step 1:** สร้าง `package.json` ครบทุก deps (ครั้งเดียว — task ต่อ ๆ ไปห้ามเพิ่ม deps ยกเว้น T12):

```jsonc
{
  "name": "library-lms",
  "scripts": {
    "dev": "bun run scripts/dev.ts",
    "dev:web": "next dev -p 3000",
    "api:dev": "bun --watch server/src/worker.ts",
    "build": "next build",
    "api:build": "bun build server/src/worker.ts --target=bun --outdir=dist",
    "lint": "oxlint .",
    "format": "prettier --write .",
    "db:generate": "drizzle-kit generate --config drizzle.config.ts",
    "db:migrate": "drizzle-kit migrate --config drizzle.config.ts",
    "db:push": "drizzle-kit push --config drizzle.config.ts",
    "db:seed": "bun run server/src/seed.ts",
    "db:studio": "drizzle-kit studio --config drizzle.config.ts",
    "test:unit": "vitest run --config vitest.config.ts",
    "test:integration": "vitest run --config vitest.integration.config.ts",
    "test:security": "vitest run --config vitest.security.config.ts",
    "test:e2e": "playwright test"
  },
  "devDependencies": {
    "bun-types": "*", "typescript": "^5", "turbo": "^2",
    "@types/node": "*", "@types/react": "^19", "@types/react-dom": "^19",
    "oxlint": "*", "prettier": "*", "vitest": "^3", "@vitest/coverage-v8": "*",
    "playwright": "*", "@playwright/test": "*", "@testing-library/react": "*",
    "jsdom": "*", "drizzle-kit": "^0.30", "@types/bcryptjs": "*",
    "lefthook": "*", "@commitlint/cli": "*", "@commitlint/config-conventional": "*"
  },
  "dependencies": {
    "next": "^16", "react": "^19", "react-dom": "^19",
    "elysia": "^1.4", "@elysiajs/cors": "*", "@elysiajs/openapi": "*",
    "elysia-rate-limit": "*", "jose": "*", "tsyringe": "*", "reflect-metadata": "*",
    "typebox": "*", "zod": "*",
    "drizzle-orm": "^0.44", "postgres": "*",
    "next-auth": "^5.0.0-beta", "@auth/core": "*",
    "@aws-sdk/client-s3": "*",
    "@elysiajs/eden": "*",
    "lucide-react": "*", "recharts": "*", "framer-motion": "*", "zustand": "*",
    "react-hook-form": "*", "@hookform/resolvers": "*", "class-variance-authority": "*",
    "clsx": "*", "tailwind-merge": "*", "tailwindcss": "^4", "@tailwindcss/postcss": "*",
    "date-fns": "*", "bcryptjs": "*"
  }
}
```

- [ ] **Step 2:** `bun install` — สำเร็จ ไม่มี peer conflict
- [ ] **Step 3:** สร้าง configs: `tsconfig.json` (aliases: `@/*` → root, `@/app/*` → `./app/*`, `@/server/*` → `./server/*`, `@libsys/shared` → `./server/src/shared.ts`), `turbo.json` (tasks: build/dev/lint/test), `bunfig.toml`, `eslint.config.mjs`, `lefthook.yml` (pre-commit: lint+format; commit-msg: commitlint)
- [ ] **Step 4:** สร้าง `scripts/dev.ts` — spawn FE (port 3000) + BE (port 3001) พร้อม log prefix
- [ ] **Step 5:** ตั้ง git identity ระดับ repo ชั่วคราวถ้ายังไม่มี แล้ว verify:

```powershell
bun install
bun run lint
bun run format
```

- [ ] **Step 6:** ตรวจว่า `bun run dev` boot ขึ้นได้ (รอ task 2-15 จึงจะ render ครบ — ที่นี่แค่ไม่ crash)

---

### Task 2: Elysia server base

**Files:**
- Create: `server/tsconfig.json`, `server/src/worker.ts`, `server/src/app.ts`, `server/src/libs/env.ts`, `server/src/libs/db.ts`, `server/src/libs/date.helper.ts`, `server/src/libs/http-error.factory.ts`, `server/src/modules/shared/schemas/response.schema.ts`, `server/src/database.ts`
- Test: `server/src/libs/env.test.ts`, `server/src/libs/http-error.factory.test.ts`

**Parallelization:**
- Can run with: `T3`, `T4`
- Must wait for: `T1`
- Race risk: `server/src/shared.ts` (ห้ามแตะ — T4 เป็นเจ้าของ)

**TDD slice:** env validation test fails -> `libs/env.ts` (zod) -> green

- [ ] **Step 0: Load the TDD discipline** — `superpowers:test-driven-development`
- [ ] **Step 1: Write the failing test** — `server/src/libs/env.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { parseEnv } from "./env";

describe("parseEnv", () => {
  it("throws เมื่อ DATABASE_URL/AUTH_SECRET/INTERNAL_SECRET ขาด", () => {
    expect(() => parseEnv({})).toThrowError(/DATABASE_URL/);
  });
  it("parse ค่าครบแล้วคืน typed env", () => {
    const env = parseEnv({
      DATABASE_URL: "postgresql://u:p@localhost:5432/library_lms",
      PORT: "3001", AUTH_SECRET: "x".repeat(32),
      INTERNAL_SECRET: "y".repeat(16),
      NEXT_PUBLIC_API_URL: "http://localhost:3001",
    });
    expect(env.PORT).toBe(3001);
  });
});
```

- [ ] **Step 2:** `bun run test:unit -- server/src/libs/env.test.ts` → FAIL (ยังไม่มี `parseEnv`)
- [ ] **Step 3: Implement minimal:** `libs/env.ts` — zod schema บังคับ `DATABASE_URL`, `AUTH_SECRET` (min 32), `INTERNAL_SECRET` (min 16), `PORT` (default 3001), `NEXT_PUBLIC_API_URL`, `R2_*` (optional — เตือนถ้าใช้ storage)
- [ ] **Step 4:** rerun → PASS
- [ ] **Step 5: Refactor:** เพิ่ม `http-error.factory.ts` (map `DomainError` → 400/401/403/404/409 + `response.schema.ts` wrapper `{ success, data, message }` / paginated) พร้อม `http-error.factory.test.ts` → green; `db.ts` (drizzle client จาก postgres-js — PG อย่างเดียว); `worker.ts` (listen env.PORT); `app.ts` (cors + rate-limit + openapi(dev) + `.onError()`)

---

### Task 3: Drizzle schema + migration + seed

**Files:**
- Create: `drizzle.config.ts`, `server/src/infrastructure/database/schema/index.ts` + 13 files (`branches.ts`, `categories.ts`, `users.ts`, `borrowing-policies.ts`, `system-settings.ts`, `books.ts`, `book-copies.ts`, `course-reserves.ts`, `loans.ts`, `reservations.ts`, `fines.ts`, `notification-logs.ts`, `audit-logs.ts`), `server/src/seed.ts`, `drizzle/` (generated)
- Test: `server/src/infrastructure/database/schema/index.test.ts` (โหลด schema ไม่ error + relation ครบ)

**Parallelization:**
- Can run with: `T2`, `T4`
- Must wait for: `T1`
- Race risk: `drizzle/` + `server/src/infrastructure/database/schema/*` — task นี้เป็นเจ้าของเท่านั้น

**Config/data task (TDD ย่อ):** เป้าหมายคือ schema ตรงกับ `db/schema.sql` ทุกตาราง — verification หลักคือ generate + push + smoke query
- [ ] **Step 0:** เปิด `db/schema.sql` เป็น reference — แปลง 13 ตาราง + enums + indexes + unique constraints + `updated_at` trigger เป็น Drizzle (`pgEnum` + `pgTable`)
- [ ] **Step 1:** เขียน schema test: import ทุกตาราง + assert จำนวนตาราง = 13 + column หลัก (PK/FK) ครบ
- [ ] **Step 2:** `bun run test:unit -- schema/index.test.ts` → FAIL (ยังไม่มี schema)
- [ ] **Step 3:** สร้าง schema files ครบ ตาม schema.sql (enum: `user_role`, `user_status`, `copy_status`, `loan_status`, `reservation_status`, `fine_reason`, `notification_*`) — คอลัมน์/type/index ตรงเป๊ะ
- [ ] **Step 4:** `bun run test:unit -- schema/index.test.ts` → PASS; `bun run db:generate` + `bun run db:push` (ต้องมี PG — ถ้ายังไม่มีให้รอ flag; `bun run db:studio` ตรวจ visual)
- [ ] **Step 5:** `server/src/seed.ts` — seed `borrowing_policies` (5 roles), หมวดหมู่ตัวอย่าง, `system_settings` (วันแจ้งเตือนล่วงหน้า 3, pickup deadline 3 วัน ฯลฯ) — ตาม schema.sql seed block → `bun run db:seed`
- [ ] **Step 6:** Smoke query ผ่าน drizzle client: `SELECT count(*) FROM borrowing_policies` = 5

---

### Task 4: shared.ts + @libsys/shared

**Files:**
- Create: `server/src/shared.ts`, `server/src/exports/shared/package.json`, `server/src/exports/shared/index.ts`
- Test: `server/src/shared.test.ts` (type-level)

**Parallelization:**
- Can run with: `T2`, `T3`
- Must wait for: `T1`
- Race risk: `server/src/shared.ts` — **task นี้เป็นเจ้าของแต่เพียงผู้เดียว**; module อื่นเขียน DTO ใน local schemas

**TDD slice:** type test fails -> shared types -> green
- [ ] **Step 0: Load the TDD discipline**
- [ ] **Step 1:** `server/src/shared.test.ts` — `expectTypeOf` ตรวจว่า `UserRole` มี 5 ค่า, `LoanStatus`, `ReservationStatus`, `ApiResponse<T>`, `Paginated<T>`, `UserPublic` (จาก `toPublic()`) ถูก export
- [ ] **Step 2:** `bun run test:unit -- server/src/shared.test.ts` → FAIL
- [ ] **Step 3:** สร้าง `shared.ts` — enums ทั้งหมดจาก schema.sql + `UserRole` union (`"admin" | "librarian" | "faculty" | "staff" | "student"`), `ApiResponse<T>`, `Paginated<T>`, `SessionUser`, `ErrorMessage`
- [ ] **Step 4:** PASS; สร้าง `exports/shared/` (package name `@libsys/shared`) re-export จาก `shared.ts`
- [ ] **Step 5:** `tsc --noEmit` ผ่าน (alias `@libsys/shared` ใน root tsconfig)

---

### Task 5: auth module (login + guard)

**Files:**
- Create: `server/src/modules/auth/auth.module.ts`, `server/src/modules/auth/adapters/controllers/auth.controller.ts`, `server/src/modules/auth/adapters/controllers/schemas/auth.schema.ts`, `server/src/modules/auth/applications/ports/auth.repository.ts`, `server/src/modules/auth/applications/schemas/auth-schemas.ts`, `server/src/modules/auth/applications/usecases/login.usecase.ts`, `server/src/modules/auth/adapters/repository/auth.drizzle.repository.ts`, `server/src/modules/auth.plugin.ts`, `server/src/modules/tokens.ts`
- Test: `server/src/modules/auth/applications/usecases/login.usecase.test.ts`

**Parallelization:**
- Can run with: `T6`-`T10`
- Must wait for: `T2`, `T4`
- Race risk: `server/src/modules/auth.plugin.ts` — task นี้เป็นเจ้าของ (task อื่น import อย่างเดียว)

**TDD slice:** login usecase test fails -> usecase -> green
- [ ] **Step 0: Load the TDD discipline**
- [ ] **Step 1:** `login.usecase.test.ts` — mock repository:

```ts
it("คืน token+user เมื่อ email/password ถูก", async () => {
  const uc = new LoginUsecase(mockRepo, hashSecret);
  const res = await uc.execute({ command: { email: "a@x.ac.th", password: "secret1" } });
  expect(res.token).toBeTruthy();
  expect(res.user.role).toBe("librarian");
});
it("throw DomainUnauthorizedError เมื่อ password ผิด", async () => {
  await expect(uc.execute({ command: { email: "a@x.ac.th", password: "wrong" } }))
    .rejects.toThrowError(DomainUnauthorizedError);
});
```

- [ ] **Step 2:** `bun run test:unit -- login.usecase.test.ts` → FAIL
- [ ] **Step 3:** `login.usecase.ts` (bcrypt verify, status check — suspend/graduated → reject, sign JWT ด้วย jose), `auth.repository.ts` port + token
- [ ] **Step 4:** PASS
- [ ] **Step 5:** `auth.plugin.ts` — macro `role(...)`: อ่าน proxy headers (`X-User-Id/Role/Status` + `X-Internal-Secret`) หรือ Bearer JWT → resolve `user` → guard ตาม role + เช็ค `status === "active"`; `tokens.ts` (string DI tokens); `auth.controller.ts` (`POST /auth/login`, `POST /auth/logout`, `GET /auth/me` + `.guard()`)

---

### Task 6: users module (member lookup)

**Files:**
- Create: `server/src/modules/users/users.module.ts`, `applications/ports/user.repository.ts`, `applications/schemas/user-schemas.ts`, `applications/usecases/find-user.usecase.ts` + `list-users.usecase.ts`, `adapters/repository/user.drizzle.repository.ts`, `adapters/controllers/user.controller.ts` + `schemas/user.schema.ts`
- Test: `applications/usecases/find-user.usecase.test.ts`, `list-users.usecase.test.ts`

**Parallelization:**
- Can run with: `T5`, `T7`-`T10`
- Must wait for: `T2`, `T4`
- Race risk: `none` (ไฟล์ของ module ตัวเอง; schema files ของ T3 อ่านอย่างเดียว)

**TDD slice:** find-user test fails -> usecase+repo -> green
- [ ] **Step 0: Load the TDD discipline**
- [ ] **Step 1:** test: find by `studentOrStaffId` / email / partial name → คืน `IUserPublicReturnType` (ผ่าน `toPublic()` ตัด passwordHash); หาไม่เจอ → `DomainError` 404
- [ ] **Step 2:** FAIL → **Step 3:** usecases + `user.drizzle.repository.ts` (findByStudentId, findByEmail, searchByName — ILIKE) → **Step 4:** PASS
- [ ] **Step 5:** controller: `GET /users/search?q=` (guard librarian/admin) — ใช้สำหรับ circulation/reservations

---

### Task 7: catalog module

**Files:**
- Create: `server/src/modules/catalog/catalog.module.ts`, `applications/ports/{book.repository,copy.repository,category.repository}.ts`, `applications/schemas/catalog-schemas.ts`, `applications/usecases/{create-book,update-book,list-books,get-book,create-copy,update-copy-status,list-categories}.usecase.ts`, `adapters/repository/*.drizzle.repository.ts`, `adapters/controllers/{book.controller,copy.controller,category.controller}.ts` + schemas
- Test: `applications/usecases/create-book.usecase.test.ts`, `list-books.usecase.test.ts`

**Parallelization:**
- Can run with: `T5`-`T6`, `T8`-`T10`
- Must wait for: `T2`, `T4`
- Race risk: `none`

**TDD slice:** create-book test fails -> usecase -> green
- [ ] **Step 0: Load the TDD discipline**
- [ ] **Step 1:** tests: create book (validate ISBN/title/author → insert + audit log), list-books (filter หมวด + status + pagination), copy status transition ต้องผ่าน state machine ของ `copy.domain.ts` (`available→borrowed` ต้อง reject เมื่อ borrowed)
- [ ] **Step 2:** FAIL → **Step 3:** usecases + `book.drizzle.repository.ts` (ค้นหา `ILIKE '%q%'` + `pg_trgm` index — ไทย), `copy.domain.ts` (state machine) → **Step 4:** PASS
- [ ] **Step 5:** controllers: `GET/POST /catalog/books`, `GET /catalog/books/:id`, `PUT /catalog/books/:id`, `POST /catalog/books/:id/copies`, `PUT /catalog/copies/:id/status`, `GET /catalog/categories` — guard: librarian/admin

---

### Task 8: circulation module

**Files:**
- Create: `server/src/modules/circulation/circulation.module.ts`, `applications/ports/loan.repository.ts`, `applications/schemas/loan-schemas.ts`, `applications/usecases/{checkout,checkin,renew,recall,list-active-loans}.usecase.ts`, `adapters/repository/loan.drizzle.repository.ts`, `adapters/controllers/loan.controller.ts` + schemas, `server/src/domains/loan.domain.ts`, `server/src/domains/policy.domain.ts`
- Test: `server/src/domains/loan.domain.test.ts`, `policy.domain.test.ts`, `applications/usecases/checkout.usecase.test.ts`

**Parallelization:**
- Can run with: `T5`-`T7`, `T9`-`T10`
- Must wait for: `T2`, `T4`
- Race risk: `none`

**TDD slice:** due-date domain test fails -> domain -> green
- [ ] **Step 0: Load the TDD discipline**
- [ ] **Step 1:** `loan.domain.test.ts`:

```ts
it("due date = borrowed_at + loan_period_days ตาม policy role", () => {
  const d = calcDueDate(borrowed, { loanPeriodDays: 14 });
  expect(d).toBe(addDays(borrowed, 14));
});
it("ต่ออายุได้ไม่เกิน maxRenewals ครั้ง (ครั้งที่ max+1 → DomainForbiddenError)", () => {
  expect(() => renewLoan(loanWithRenews(1), policyMax2, hasReservation=false))
    .not.toThrow();
  expect(() => renewLoan(loanWithRenews(2), policyMax2, hasReservation=false))
    .toThrowError(DomainForbiddenError); // maxRenewals = จำกัดสูงสุดจริง (เข้มงวด)
  expect(() => renewLoan(loanWithRenews(2), policyMax2, hasReservation=true))
    .toThrowError(DomainForbiddenError);
});
it("overdue = เกิน due_at + grace_period_days", () => { /* ... */ });
it("recall ย่น due date เหลือ recall buffer", () => { /* ... */ });
```

- [ ] **Step 2:** FAIL → **Step 3:** `loan.domain.ts` (calcDueDate, renewLoan, recallLoan, isOverdue — ใช้ grace), `policy.domain.ts` (resolve จาก `borrowing_policies`) → **Step 4:** PASS
- [ ] **Step 5:** usecases: `checkout` (ตรวจสิทธิ์: active + max_active_loans + ยอดค่าปรับ ≤ max_unpaid_fine + copy ว่าง → ตั้ง loan + snapshot loan_period_days/daily_fine_rate + สถานะ copy=borrowed + audit), `checkin` (คืน → overdue? คำนวณ fine `daily_fine_rate × เกินวัน` ถ้าจำนวน > 0 — ยังไม่มีหน้า Fines แต่บันทึก row fines ไว้), `renew` (เช็คคิวจอง), `recall`; controller: `POST /circulation/checkout`, `POST /circulation/checkin`, `POST /circulation/loans/:id/renew`, `POST /circulation/loans/:id/recall`, `GET /circulation/loans/active`

---

### Task 9: reservations module

**Files:**
- Create: `server/src/modules/reservations/reservations.module.ts`, `applications/ports/reservation.repository.ts`, `applications/schemas/reservation-schemas.ts`, `applications/usecases/{create-reservation,list-reservations,mark-ready,fulfill,expire}.usecase.ts`, `adapters/repository/reservation.drizzle.repository.ts`, `adapters/controllers/reservation.controller.ts` + schemas, `server/src/domains/reservation.domain.ts`
- Test: `server/src/domains/reservation.domain.test.ts`, `applications/usecases/create-reservation.usecase.test.ts`

**Parallelization:**
- Can run with: `T5`-`T8`, `T10`
- Must wait for: `T2`, `T4`
- Race risk: `none`

**TDD slice:** FIFO queue test fails -> domain -> green
- [ ] **Step 0: Load the TDD discipline**
- [ ] **Step 1:** `reservation.domain.test.ts`: FIFO — จองคนที่ 2 ต่อท้ายคิวเสมอ; duplicate จองซ้ำ title เดียวกัน → reject; status flow `waiting → ready (ตั้ง pickup_deadline) → fulfilled`; expired เมื่อเลย pickup deadline → `expired`; freeze/pause ไม่เสียลำดับ
- [ ] **Step 2:** FAIL → **Step 3:** `reservation.domain.ts` + usecases (partial unique index จาก schema.sql กันจองซ้ำ) → **Step 4:** PASS
- [ ] **Step 5:** controller: `POST /reservations`, `GET /reservations?status=`, `PUT /reservations/:id/ready`, `POST /reservations/:id/fulfill`; hook กับ checkin (T8): เมื่อคืนหนังสือ → auto-ตรวจคิวคนแรก → mark ready

---

### Task 10: storage module (Cloudflare R2)

**Files:**
- Create: `server/src/modules/storage/storage.module.ts`, `applications/ports/storage.repository.ts`, `applications/usecases/upload-cover.usecase.ts`, `adapters/repository/r2.storage.repository.ts`, `adapters/controllers/storage.controller.ts` + schemas
- Test: `adapters/repository/r2.storage.repository.test.ts` (mock S3 client)

**Parallelization:**
- Can run with: `T5`-`T9`
- Must wait for: `T2`, `T4`
- Race risk: `none` — **แต่: upload integration test blocked จนกว่าผู้ใช้เติม `R2_*` ใน `.env`** (เรียกว่าเป็น blocker แบบชัดเจนใน plan นี้)

**TDD slice:** adapter test (mock) fails -> adapter -> green
- [ ] **Step 0: Load the TDD discipline**
- [ ] **Step 1:** `r2.storage.repository.test.ts` — mock `S3Client.prototype.send` (หรือ inject fake):

```ts
it("upload file → คืน public URL รูปแบบ R2 bucket/key", async () => {
  const repo = new R2StorageRepository(fakeS3, { bucket: "library-covers", publicUrl: "https://covers.ac.th" });
  const url = await repo.storeCover({ filename: "a.jpg", body: buffer });
  expect(url).toMatch(/^https:\/\/covers\.ac\.th\/covers\//);
});
it("key รองรับภาพเดียว ป้องกัน path traversal", async () => { /* ... */ });
```

- [ ] **Step 2:** FAIL → **Step 3:** `r2.storage.repository.ts` — `@aws-sdk/client-s3` `PutObjectCommand`, key = `covers/<bookId>/<uuid>.<ext>`, validate content-type (jpg/png/webp) + ขนาด ≤ 5MB, `publicUrl` fallback: `https://<bucket>.<accountId>.r2.cloudflarestorage.com` → **Step 4:** PASS
- [ ] **Step 5:** controller: `POST /storage/covers` (multipart, guard librarian) — เชื่อมกับ catalog: update `books.cover_url`; **หมายเหตุ:** จนกว่า env จริงมา — ใช้ fake/local adapter ใน dev ผ่าน env `STORAGE_DRIVER=r2|local` (local fallback `uploads/` ตาม .gitignore) ให้ UI พัฒนาต่อได้

---

### Task 11: backend wiring (app.module + DI)

**Files:**
- Modify: `server/src/modules/app.module.ts`, `server/src/modules/di-registrations.ts`, `server/src/app.ts`
- Test: `server/src/__tests__/integration/app-boot.test.ts`

**Parallelization:**
- Can run with: `none` — แตะไฟล์ wiring ที่ทุก module ใช้
- Must wait for: `T5`-`T10`
- Race risk: `app.module.ts` + `di-registrations.ts` — task นี้เป็นเจ้าของ

**TDD slice:** app boot test fails -> wire -> green
- [ ] **Step 0:** ทดสอบ boot: สร้าง `Elysia` app จาก `app.module.ts` → `app.handle` กับ `GET /health` → 200; `.onError` map `DomainError` → status ที่ถูก
- [ ] **Step 1:** `bun run test:integration -- app-boot.test.ts` → FAIL
- [ ] **Step 2:** register module ทั้งหมดใน `di-registrations.ts` (tsyringe) + resolve controllers ใน `app.module.ts` → `.use()` เข้า app; `app.ts` ต่อ rate-limit/cors/openapi
- [ ] **Step 3:** PASS; `bun run api:dev` boot ไม่ error

---

### Task 12: Next.js scaffold + tokens + shell

**Files:**
- Create: `app/layout.tsx`, `app/page.tsx` (redirect → /dashboard), `app/globals.css`, `app/(dashboard)/layout.tsx`, `app/(auth)/login/page.tsx` (thin re-export placeholder), `app/_shared/components/{sidebar.tsx,topbar.tsx,theme-toggle.tsx}`, `app/_shared/hooks/{use-sidebar.ts,use-theme.ts}`, `components.json`, `components/ui/*` (ผ่าน shadcn init)
- Modify: `package.json` (เฉพาะ task นี้ — `bunx shadcn@latest init` + add components)

**Parallelization:**
- Can run with: `T5`-`T10`
- Must wait for: `T1`
- Race risk: `package.json` + `globals.css` + `components.json` — **task นี้เป็นเจ้าของ**; T13 ต้องรอ

**Config/UI-base task:** verification = render + lint (behavior test มาทาง e2e ทีหลัง)
- [ ] **Step 0:** `bunx shadcn@latest init` (Tailwind v4, alias `@/`) — **REQUIRED SUB-SKILL: shadcn** (โหลด skill ก่อน)
- [ ] **Step 1:** `app/globals.css` — ใส่ tokens จาก design.md §4 ครบ (light/dark, brand 900→50, accent, shadow-card/pop/float, radius sm/md/lg/xl) + `font-variant-numeric: tabular-nums` สำหรับตัวเลข
- [ ] **Step 2:** `app/layout.tsx` — font IBM Plex Sans Thai (next/font), ThemeProvider, metadata ไทย
- [ ] **Step 3:** Shell: `(dashboard)/layout.tsx` — sidebar มืด 240px (collapse 72px, drawer บนจอเล็ก) + floating header (64px, blur 12px, search pill, dark toggle, bell, avatar) ตาม design.md §5; เมนูไทย: ภาพรวม · แคตตาล็อก · เคาน์เตอร์ยืม-คืน · คิวจอง — active = brand-500/15 fill + accent bar ซ้าย
- [ ] **Step 4:** `bun run lint` + `bun run build` ผ่าน; `bun run dev:web` → หน้า shell render (content placeholder)

---

### Task 13: shadcn restyle base components

**Files:**
- Modify (restyle จาก shadcn ตาม design.md §6): `components/ui/button.tsx` (pill `rounded-full`, primary brand-500), `card.tsx` (radius-lg, no border, `--shadow-card`), `input.tsx` (42px, radius-sm, border warm `#D8D5CC`), `badge.tsx` (status dot variant), `table.tsx` (header subtle, hover 50%), `dialog.tsx` (radius-xl, shadow-float, scale 0.96→1 150ms), `calendar.tsx` (dots วันที่มียืม, today = brand fill), `chart.tsx` (Recharts: brand-300→500 gradient, curved 2.5px, tooltip card), `skeleton.tsx`, `pagination.tsx` (32px circle, active brand)
- Create: `components/ui/status-badge.tsx` (6px dot + ไทย label)

**Parallelization:**
- Can run with: `T14`, `T15`
- Must wait for: `T12`
- Race risk: `components/ui/*` + `app/globals.css` (อ่านอย่างเดียว — เขียน T12 แล้ว)

**TDD slice:** token consistency test (optional) -> restyle -> build
- [ ] **Step 0: Load the TDD discipline** (ใช้กับ test ด้านล่าง)
- [ ] **Step 1:** `components/ui/status-badge.test.tsx` — render status `confirmed/pending/cancelled` → แสดง dot + ข้อความไทย ("ยืมอยู่", "ค้างส่ง", "พร้อมรับ")
- [ ] **Step 2:** FAIL → **Step 3:** restyle ตามรายการด้านบน (class ใช้ tokens: `bg-brand-500`, `rounded-full`, `shadow-card`...) + `status-badge.tsx` → **Step 4:** PASS
- [ ] **Step 5:** `bun run build` ผ่าน; ตรวจ dark mode + focus-visible ring บนปุ่ม

---

### Task 14: proxy + NextAuth auth.ts

**Files:**
- Create: `auth.ts` (NextAuth v5: Credentials, strategy JWT, maxAge 7d, pages.signIn=/login), `app/api/auth/[...nextauth]/route.ts`, `app/api/backend/[...path]/route.ts`, `app/_shared/constants/routes.ts`
- Test: `app/api/backend/[...path]/route.test.ts` (unit — mock auth session)

**Parallelization:**
- Can run with: `T13`, `T15`
- Must wait for: `T5` (login endpoint), `T12`
- Race risk: `app/api/backend/[...path]/route.ts` — task นี้เป็นเจ้าของ

**TDD slice:** proxy unit test fails -> route -> green
- [ ] **Step 0: Load the TDD discipline**
- [ ] **Step 1:** proxy test: มี session active → fetch ไป `NEXT_PUBLIC_API_URL` + header `X-User-Id/Role/Status` + `X-Internal-Secret`; browser headers (cookie/authorization/host) ถูก strip; session ไม่ active → 401; timeout → 503
- [ ] **Step 2:** FAIL → **Step 3:** `[...path]/route.ts` ตาม template §5 (auth() → check status active → strip → inject → fetch 30s + cache policy `CACHE_POLICY` สำหรับ GET หมวดหมู่) + `auth.ts` (authorize() เรียก `POST {API}/auth/login`) → **Step 4:** PASS
- [ ] **Step 5:** manual: login ผ่าน `/api/auth/callback/credentials` → cookie ถูกตั้ง → proxy เรียก `GET /health` ผ่าน

---

### Task 15: eden-client + helpers + routes

**Files:**
- Create: `app/_shared/lib/eden-client.ts`, `app/_shared/lib/eden-helpers.ts`, `app/_shared/constants/routes.ts` (ถ้ายังไม่มีใน T14)
- Test: `app/_shared/lib/eden-helpers.test.ts`

**Parallelization:**
- Can run with: `T13`, `T14`
- Must wait for: `T4`, `T12`
- Race risk: `app/_shared/constants/routes.ts` — ถ้า T14 สร้างแล้ว ให้ task นี้ modify ต่อ (ระวัง race → ระบุ: T14 สร้างค่า `ROUTES.API_BACKEND`; T15 อ่านอย่างเดียวหรือแยก file)

**TDD slice:** edenRequest wrapper test fails -> helpers -> green
- [ ] **Step 0: Load the TDD discipline**
- [ ] **Step 1:** test `edenRequest`: คืน `.data` เมื่อ `{success:true}`, throw typed error เมื่อ `{success:false}`, คืน pagination object เมื่อมี `total`
- [ ] **Step 2:** FAIL → **Step 3:** `eden-client.ts` (`treaty<App>(origin + ROUTES.API_BACKEND)` import `App` type จาก backend) + `eden-helpers.ts` → **Step 4:** PASS
- [ ] **Step 5:** `tsc --noEmit` — ตรวจ typed client ตรงกับ controller ที่สร้างแล้ว

---

### Task 16: login feature

**Files:**
- Create: `app/features/login/login.page.tsx`, `app/features/login/components/login-form.tsx`, `app/features/login/hooks/use-login.ts`, `app/features/login/stores/auth.store.ts`
- Test: `app/features/login/stores/auth.store.test.ts`

**Parallelization:**
- Can run with: `T17`-`T20`
- Must wait for: `T13`, `T14`, `T15`
- Race risk: `none` (ไฟล์ feature ตัวเอง)

**TDD slice:** auth store test fails -> feature -> green
- [ ] **Step 0: Load the TDD discipline**
- [ ] **Step 1:** test: `signIn()` สำเร็จ → ตั้ง session + redirect ตาม role (admin/librarian → /dashboard); error → ข้อความไทยใต้ช่อง ("อีเมลหรือรหัสผ่านไม่ถูกต้อง")
- [ ] **Step 2:** FAIL → **Step 3:** ใช้ NextAuth `signIn("credentials")` wrapper + `use-login` + form (react-hook-form + Zod) — **Signature due-date card** ประกอบหน้า (การ์ด + สแตมป์ motif) → **Step 4:** PASS
- [ ] **Step 5:** e2e manual: login admin → เข้าหน้า dashboard; login ผิด → error ไทย

---

### Task 17: dashboard feature

**Files:**
- Create: `app/features/dashboard/dashboard.page.tsx`, `components/{kpi-card.tsx,revenue-chart.tsx,target-ring.tsx,recent-loans-table.tsx,mini-calendar.tsx,category-stats-card.tsx}`, `hooks/use-dashboard.ts`, `actions/dashboard.action.ts`, `stores/dashboard.store.ts`
- Test: `app/features/dashboard/hooks/use-dashboard.test.ts` (aggregation + fallback)

**Parallelization:**
- Can run with: `T16`, `T18`-`T20`
- Must wait for: `T5` (me), `T7` (catalog stats), `T8` (loans), `T13`, `T15`
- Race risk: `none`

**TDD slice:** KPI aggregation test fails -> feature -> green
- [ ] **Step 0: Load the TDD discipline**
- [ ] **Step 1:** test: `buildKpis({ loans, reservations, fines })` → `{ checkedOutToday, overdue, readyQueue, unpaidFines }` — คำนวนถูก (ข้ามวัน, ค้างส่ง = loan overdue + grace ผ่าน, ready = reservation ready count)
- [ ] **Step 2:** FAIL → **Step 3:** `dashboard.store.ts` (Zustand: fetch ผ่าน `actions/dashboard.action.ts` — เรียก `api.circulation.loans.active`, `api.reservations.list`, `api.catalog...`), components ตาม design.md §5.3: heading "สวัสดีตอนเช้า, <ชื่อ> 👋" + KPI 4 การ์ด (icon circle ซ้าย + ตัวเลข tabular + % chip) + Bar chart "การยืม 30 วันล่าสุด" (2/3) + ring "เป้าหมายรายเดือน" (1/3) + ตาราง "การยืมล่าสุด" (search + filter สถานะ) + แถวล่าง: mini calendar (จุดวันครบกำหนด) + การ์ด "สถิติยืมตามหมวด" → **Step 4:** PASS
- [ ] **Step 5:** skeleton/loading + error/empty state ไทย; `bun run build`

---

### Task 18: catalog feature

**Files:**
- Create: `app/features/catalog/catalog.page.tsx`, `components/{book-table.tsx,book-dialog.tsx,cover-upload.tsx,copy-list.tsx,category-filter.tsx}`, `hooks/use-catalog.ts`, `actions/catalog.action.ts`, `stores/catalog.store.ts`
- Test: `app/features/catalog/stores/catalog.store.test.ts`

**Parallelization:**
- Can run with: `T16`-`T17`, `T19`-`T20`
- Must wait for: `T7`, `T13`, `T15`
- Race risk: `none`

**TDD slice:** catalog store test fails -> feature -> green
- [ ] **Step 0: Load the TDD discipline**
- [ ] **Step 1:** test: list + filter (หมวด/ค้นหา) → pagination state; `createBook()` → success → refetch list; cover upload → `cover_url` อัปเดต
- [ ] **Step 2:** FAIL → **Step 3:** page: ตาราง (ปก thumbnail, ชื่อ, ผู้แต่ง, หมวด, สำเนา x/y, สถานะ badge) + search + filter + "เพิ่มหนังสือ" dialog (form + `cover-upload.tsx` → `POST /storage/covers` → R2) + แถวขยายดู copy + เพิ่ม/แก้สถานะ copy (ตัวเลือกตาม `copy.domain` state machine) → **Step 4:** PASS
- [ ] **Step 5:** empty state "ยังไม่มีหนังสือในหมวดนี้ — เพิ่มเล่มแรก"; `bun run build`

---

### Task 19: circulation feature

**Files:**
- Create: `app/features/circulation/circulation.page.tsx`, `components/{member-card.tsx,checkout-panel.tsx,checkin-panel.tsx,due-date-stamp.tsx,loan-actions.tsx}`, `hooks/use-circulation.ts`, `actions/circulation.action.ts`, `stores/circulation.store.ts`
- Test: `app/features/circulation/stores/circulation.store.test.ts`

**Parallelization:**
- Can run with: `T16`-`T18`, `T20`
- Must wait for: `T5`, `T6`, `T8`, `T13`, `T15`
- Race risk: `none`

**TDD slice:** checkout store test fails -> feature -> green
- [ ] **Step 0: Load the TDD discipline**
- [ ] **Step 1:** test: ค้นหาสมาชิก → การ์ดสมาชิกแสดง (ยืมอยู่/ค้างส่ง/ยอดค่าปรับ/ถูกระงับ); เพิ่ม copy code → ตะกร้ายืม; checkout สำเร็จ → **สแตมป์ due-date** บนการ์ด + toast "ยืมสำเร็จ ✓ กำหนดคืน <date>"; checkin → คืนสำเร็จ; renew → ปุ่ม disabled เมื่อเกินครั้ง หรือมีจอง
- [ ] **Step 2:** FAIL → **Step 3:** page ตาม design.md §5.4 + signature due-date card: หลัง checkout แสดงการ์ด due-date ใหญ่พร้อมสแตมป์วันกำหนดคืน (framer-motion reveal) — tabs: ยืม (ค้นสมาชิก + สแกน/พิมพ์ copy code) / คืน (สแกน → checkin) / รายการยืมค้าง (ต่ออายุ/recall) → **Step 4:** PASS
- [ ] **Step 5:** ตรวจ flow error: copy ไม่ว่าง → badge/ข้อความ "สำเนานี้ถูกยืมอยู่", สมาชิกถูกระงับ → บล็อก checkout

---

### Task 20: reservations feature

**Files:**
- Create: `app/features/reservations/reservations.page.tsx`, `components/{reservation-table.tsx,queue-detail.tsx,status-filter.tsx}`, `hooks/use-reservations.ts`, `actions/reservation.action.ts`, `stores/reservation.store.ts`
- Test: `app/features/reservations/stores/reservation.store.test.ts`

**Parallelization:**
- Can run with: `T16`-`T19`
- Must wait for: `T5`, `T6`, `T9`, `T13`, `T15`
- Race risk: `none`

**TDD slice:** queue store test fails -> feature -> green
- [ ] **Step 0: Load the TDD discipline**
- [ ] **Step 1:** test: list ตาม status filter; `markReady()` → สถานะเปลี่ยน waiting→ready + ตั้ง pickup deadline; `fulfill()` → fulfilled
- [ ] **Step 2:** FAIL → **Step 3:** ตารางคิวจอง: สถานะ badge (รอคิว/พร้อมรับ/หมดอายุ/ยกเลิก), ผู้จอง, หนังสือ, วันที่จอง, pickup deadline + ปุ่ม "พร้อมให้ยืม" / ขยายดูคิวทั้ง title (FIFO ลำดับชัด) → **Step 4:** PASS
- [ ] **Step 5:** empty state + error ไทย; `bun run build`

---

### Task 21: integration tests

**Files:**
- Create: `server/src/__tests__/integration/{catalog.integration.test.ts,circulation.integration.test.ts,reservation.integration.test.ts,auth.integration.test.ts}`, `vitest.integration.config.ts`, `server/src/__tests__/integration/setup.ts`
- Modify: `.env.test.example` (สร้างจาก .env.example — `DATABASE_URL` ชี้ DB ทดสอบแยก)

**Parallelization:**
- Can run with: `T22`
- Must wait for: `T11`, `T16`-`T20` (ให้ feature ใช้ contract ที่ตรงกัน)
- Race risk: `none` — ใช้ DB ทดสอบแยก (`.env.test`)

**TDD slice (integration):** repository + API flow จริงกับ PostgreSQL
- [ ] **Step 0:** setup: สร้าง DB ทดสอบ, run migration, seed, reset ระหว่าง test
- [ ] **Step 1:** เขียน test: auth (login → proxy header), catalog (CRUD + search ไทย), circulation (checkout→checkin→fine), reservation (FIFO + ready)
- [ ] **Step 2:** `bun run test:integration` → เขียวทั้งหมด

---

### Task 22: security tests

**Files:**
- Create: `server/src/__tests__/security/{idor.security.test.ts,role-guard.security.test.ts,suspend.security.test.ts}`, `vitest.security.config.ts`

**Parallelization:**
- Can run with: `T21`
- Must wait for: `T11`
- Race risk: `none`

**TDD slice:** attack-path test fails -> fix guard -> green
- [ ] **Step 0:** เขียน test ตาม requirements §5: IDOR — ผู้ใช้ A เรียก `GET /circulation/loans/active` ของอีก user ผ่าน manipulated proxy header → 403; role guard — student/faculty เรียก endpoint admin → 403; suspend — user status=suspended แม้มี header ถูก → 403
- [ ] **Step 1:** `bun run test:security` → เริ่ม FAIL (จุดที่ยังรั่ว) → **Step 2:** แก้ใน auth.plugin/controller → green

---

### Task 23: e2e Playwright

**Files:**
- Create: `playwright.config.ts`, `e2e/{login.spec.ts,dashboard.spec.ts,catalog.spec.ts,circulation.spec.ts,reservation.spec.ts}`, `e2e/fixtures.ts` (seed user admin/librarian + หนังสือตัวอย่าง)

**Parallelization:**
- Can run with: `none`
- Must wait for: `T16`-`T20`, `T21`
- Race risk: `e2e/` + DB ทดสอบ (ใช้ seed เฉพาะ e2e)

**TDD slice:** end-to-end flows
- [ ] **Step 0:** seed data e2e + config (webServer: dev, baseURL :3000)
- [ ] **Step 1:** เขียน spec: login (success/fail ไทย), dashboard (KPI แสดง), catalog (เพิ่มหนังสือ + อัปโหลดปก), circulation (ยืม→สแตมป์ due-date→คืน), reservation (จอง→ready)
- [ ] **Step 2:** `bun run test:e2e` → green (R2 upload flow ข้ามถ้า env ยังว่าง — ใช้ fallback)

---

### Task 24: polish (empty/error/a11y/responsive)

**Files:**
- Modify: `app/features/*` (empty/error states, loading), `app/_shared/components/*` (focus styles), `app/globals.css` (prefers-reduced-motion, print)
- Test: audit ด้วย `bun run build` + `bun run lint` + manual checklist

**Parallelization:**
- Can run with: `none`
- Must wait for: `T16`-`T20`
- Race risk: `globals.css` — อนุญาต task สุดท้ายนี้เท่านั้น (นอกเหนือ T12)

**TDD slice (ตรวจสอบเชิงระบบ):**
- [ ] **Step 0:** checklist: ทุกหน้า responsive (≤375px, sidebar→drawer), keyboard focus visible ทุก interactive, reduced-motion ผ่าน (framer-motion รับ `useReducedMotion`), dark mode ไม่มี contrast ตก, empty state ทุกตารางเป็นภาษาไทยชวนลงมือ
- [ ] **Step 1:** แก้ที่พบ + `bun run lint` + `bun run build` ผ่าน + smoke `bun run test:e2e` อีกครั้ง

---

## Validation

- ทุก task มี TDD slice หรือชี้ชัดว่า config/data (T1, T3, T12) + เหตุผล
- ไม่มี task ใดให้ commit/push — ปล่อยให้มนุษย์จัดการ (ตาม AGENTS.md)
- Race risks ถูกระบุ: `package.json` (T1→T12), `globals.css` (T12→T24), `shared.ts` (T4 เท่านั้น), `drizzle/*` (T3 เท่านั้น), `app.module.ts`+`di-registrations.ts` (T11 เท่านั้น), `auth.plugin.ts` (T5 เท่านั้น), `routes.ts` (T14→T15)
- Blockers ที่ระบุชัด: R2 env ยังว่าง (T10 upload integration/e2e รอผู้ใช้เติม `.env`); PostgreSQL ต้องมี (T3, T21, T23 รอ)
- ขอบเขต: 24 task ครอบคลุม spec ทั้ง 11 sections — งานต่อยอด (Fines/Members/Reports/ฝั่งผู้ยืม) เป็นแผนแยกในรอบถัดไป
