# Borrower Portal (ฝั่งผู้ยืม) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** เพิ่มฝั่งผู้ยืม (student/faculty/staff portal) — ค้นหา/ยืมเอง/จองเอง/ดูการยืม-ค่าปรับของตัวเอง — บน mobile-first layout แยกจาก backoffice + แก้ login redirect ตาม role — ตาม design spec `docs/superpowers/specs/2026-08-12-borrower-portal-design.md`

**Estimated tasks:** 14 | **Estimated time:** ~180-220 min | **Touches:** Server API / Web UI / Middleware / E2E

## Current Problem / Current Solution

- ทุก controller guard เฉพาะ admin/librarian → student/faculty/staff login ได้แต่ใช้ไม่ได้ (403 ทุก endpoint)
- Login redirect ทุก role ไป `/dashboard` → ผู้ยืมเห็นหน้า 403 แตก (แก้แล้วบางส่วน — redirect ตาม role + หน้า `/my-loans` placeholder ทำในงานเตรียมการนี้)
- ไม่มี UI ฝั่งผู้ยืม — ค้นหา/ยืม/จองต้องผ่านบรรณารักษ์เท่านั้น
- ของเหลือที่ใช้ต่อยอดได้: domain `loan.domain.ts`/`policy.domain.ts`/`reservation.domain.ts` + `CheckoutUsecase`/`CreateReservationUsecase`/`RenewUsecase` + proxy/NextAuth session เดิม (มี role ใน JWT อยู่แล้ว)

## Proposed Approach

1. **Server**: module ใหม่ `me` — self-service endpoints (IDOR-proof: ใช้ user จาก context เสมอ) + เปิด catalog GET ให้ทุก role
2. **Web**: `app/(portal)/` route group ใหม่ mobile-first (layout แยกจาก backoffice) — pages: search, books/[id], my-loans, my-reservations, my-fines
3. **Middleware**: role-aware guard (ทำแล้วในงานเตรียมการ — redirect ผู้ยืมจากหน้า backoffice กลับ /my-loans)
4. **Tests**: server unit (IDOR/guard), web unit, security, e2e portal spec

## Side by Side

| Scenario | Before | After |
| -------- | ------ | ----- |
| student login | ไป /dashboard → 403 ทุกอย่าง | redirect ไป /my-loans (ทำแล้ว) |
| ค้นหาหนังสือ | ต้องให้บรรณารักษ์ค้นให้ | ค้นหาเองบน /search |
| ยืมหนังสือที่ว่าง | ต้องไปเคาน์เตอร์ | ยืมเองได้ (self-checkout) ตาม policy role |
| หนังสือถูกยืมหมด | ต้องแจ้งบรรณารักษ์จองให้ | จองเองได้ + ยกเลิกคิวเอง |
| ดูการยืม/ค่าปรับตัวเอง | ไม่มีทางเห็น | หน้า /my-loans + /my-fines |

## Assumptions & Risks

- **Assumed:** `authPlugin` macro `role` รองรับ `true` (ทุก role active) อยู่แล้ว — verify: `RoleGuardValue = true | UserRole | UserRole[]` ✓
- **Assumed:** `AuthenticatedState.user` มี `{ id, email, fullName, role, status }` — ใช้เป็น source ของ userId ในทุก usecase `/me/*` (ห้ามรับจาก client)
- **Assumed:** `CheckoutUsecase` รับ `{ command: { userId, copyCode }, now }` — self-checkout wrap เรียกซ้ำได้โดยส่ง `userId = user.id` เอง (verify แล้วจาก test)
- **Risk:** เปิด catalog GET ให้ทุก role → ตาราง `fines`/`loans` ต้องไม่ถูก leak ใน response (ใช้ `toPublic`/schema ตัด field) — ตรวจ response schema ทุกรายการ
- **Risk:** หน้า `/search` ชื่อชนกับ feature? — ไม่มี (มีแค่ `/catalog` ฝั่ง backoffice) — portal ใช้ `/search` แยก
- **Risk:** e2e ต้องมี dev servers (web 3000 + api 3001) + fixtures — ตาม convention เดิม
- **Risk:** `me` module ใหม่แตะเฉพาะไฟล์ตัวเอง + catalog guard — ไม่ชน race กับ task อื่น

## Impact

- Server: +1 module (`me`, ~8 usecases), catalog guard เปิด GET, DI +1 module
- Web: +1 route group (`(portal)`) + 4 features (search, my-loans, my-reservations, my-fines)
- Infra: ไม่มี migration ใหม่ (schema มีครบ), ไม่มี dep ใหม่
- Tests: server unit +~30 cases, security +~6, web unit +~20, e2e +1 spec

---

## Task Overview

> **For implementation tasks:** REQUIRED SUB-SKILL: Use superpowers:test-driven-development before editing production code.
> **Parallel-first:** Spawn separate sub-agents for independent lanes. Do not parallelize tasks that can race on the same files.
> **Wave 1:** T1-T3 (server module me) → **Wave 2:** T4-T8 (server เสร็จ) → **Wave 3:** T9-T12 (web portal) → **Wave 4:** T13-T14 (คุณภาพ)

1. **T1: me module scaffold + ports/schemas** — Lane A | Can run together: T6 | Must wait for: none | TDD slice: port/schema type test
2. **T2: get-me + list-my-loans usecases** — Lane A | Can run together: none | Must wait for: T1 | TDD slice: usecase test fails → impl → green
3. **T3: renew-my-loan + cancel-my-reservation usecases** — Lane A | Can run together: none | Must wait for: T1 | TDD slice: owner-check test fails → impl → green
4. **T4: create-my-reservation + list-my-reservations usecases** — Lane A | Can run together: T5 | Must wait for: T1 | TDD slice: duplicate-reservation test fails → impl → green
5. **T5: list-my-fines + self-checkout usecases** — Lane A | Can run together: T4 | Must wait for: T1 | TDD slice: self-checkout policy test fails → impl → green
6. **T6: catalog GET เปิดทุก role** — Lane B | Can run together: T1 | Must wait for: none | TDD slice: guard test fails (student 403) → เปิด guard → green
7. **T7: me controller + routes + DI** — Lane A | Can run together: none | Must wait for: T2-T5 | TDD slice: controller test (user จาก context) → green
8. **T8: security tests (IDOR + role guard + suspend)** — Lane E | Can run together: none | Must wait for: T7 | TDD slice: attack test fails → fix → green
9. **T9: portal shell + search feature** — Lane C | Can run together: T10-T12 | Must wait for: T6, T7 | TDD slice: search store test fails → feature → green
10. **T10: my-loans feature (due-date card + renew)** — Lane C | Can run together: T9, T11-T12 | Must wait for: T3, T7 | TDD slice: my-loans store test → feature → green
11. **T11: book detail + self-checkout/reserve actions** — Lane C | Can run together: T9-T10, T12 | Must wait for: T4, T5, T7 | TDD slice: book-detail store test → feature → green
12. **T12: my-reservations + my-fines features** — Lane C | Can run together: T9-T11 | Must wait for: T4, T5, T7 | TDD slice: store test → feature → green
13. **T13: e2e portal spec + guard spec เพิ่ม** — Lane D | Can run together: none | Must wait for: T9-T12, T8 | verification: playwright run
14. **T14: polish (empty/error/a11y/responsive ≤375px)** — Lane E | Can run together: none | Must wait for: T9-T12 | audit: build + lint + e2e smoke

---

## Task Slices

### Task 1: me module scaffold + ports/schemas

**Files:**
- Create: `server/src/modules/me/me.module.ts` (ร่าง — register ทีหลัง T7), `server/src/modules/me/applications/ports/me.repository.ts`, `server/src/modules/me/applications/schemas/me-schemas.ts`

**Parallelization:** Can run with: T6 | Must wait for: none | Race risk: none (ไฟล์ใหม่)

- [ ] **Step 0: Load the TDD discipline**
- [ ] **Step 1:** เขียน type test: `IMyLoan`, `IMyReservation`, `IMyFine`, `IMeProfile` (มี policy + unpaidFineTotal) — ทดสอบผ่าน `expectTypeOf`
- [ ] **Step 2:** FAIL → **Step 3:** สร้าง port: `listLoansByUser(userId)`, `listReservationsByUser(userId)`, `listFinesByUser(userId)`, `getProfile(userId)` + schemas → **Step 4:** PASS
- [ ] **Step 5:** เช็ค naming convention (`I{Action}{Entity}{Command|Query|ReturnType}`) + `toPublic()` ของ users reuse

---

### Task 2: get-me + list-my-loans usecases

**Files:**
- Create: `server/src/modules/me/applications/usecases/get-me.usecase.ts`, `list-my-loans.usecase.ts` (+ tests)

**Parallelization:** Can run with: none | Must wait for: T1 | Race risk: none

- [ ] **Step 0: Load the TDD discipline**
- [ ] **Step 1:** test: `getMe({ userId })` → profile + policy (resolve ผ่าน `policy.domain`) + unpaidFineTotal; `listMyLoans({ userId })` → เฉพาะ loans ของ user (รวม dueDate คำนวณ overdue/grace)
- [ ] **Step 2:** FAIL → **Step 3:** implement — reuse `policy.domain.ts` + repository port → **Step 4:** PASS
- [ ] **Step 5:** refactor — ตัด field อ่อนไหวผ่าน schema

---

### Task 3: renew-my-loan + cancel-my-reservation usecases

**Files:**
- Create: `server/src/modules/me/applications/usecases/renew-my-loan.usecase.ts`, `cancel-my-reservation.usecase.ts` (+ tests)

**Parallelization:** Can run with: none | Must wait for: T1 | Race risk: none

- [ ] **Step 0: Load the TDD discipline**
- [ ] **Step 1:** test — renew: เรียบร้อย / loan ของคนอื่น → 403 / เกินครั้งหรือมีจอง → 403 (domain เดิม); cancel: waiting → สำเร็จ / คนอื่น → 403 / ไม่ใช่ waiting → 409
- [ ] **Step 2:** FAIL → **Step 3:** implement — **owner check ก่อนเสมอ** (`loan.userId !== user.id → DomainForbiddenError`) + reuse `renewLoan()` domain / update status → **Step 4:** PASS
- [ ] **Step 5:** refactor — ใช้ repository method เดิมของ circulation/reservations ถ้าใช้ได้

---

### Task 4: create-my-reservation + list-my-reservations usecases

**Files:**
- Create: `server/src/modules/me/applications/usecases/create-my-reservation.usecase.ts`, `list-my-reservations.usecase.ts` (+ tests)

**Parallelization:** Can run with: T5 | Must wait for: T1 | Race risk: none

- [ ] **Step 0: Load the TDD discipline**
- [ ] **Step 1:** test — create: จองหนังสือที่ถูกยืมหมด → waiting + ลำดับ FIFO ถูก; จองซ้ำ title → 409; หนังสือมีสำเนาว่าง → อนุญาต (ยืมได้เลย — ให้การตัดสินใจเป็น domain) — ดู `CreateReservationUsecase` เดิม (`execute({ command: { bookId, userId }, now })`) ว่าตรวจอะไรแล้ว
- [ ] **Step 2:** FAIL → **Step 3:** implement — wrap `CreateReservationUsecase` เดิมส่ง `userId = user.id` (ถ้า signature ใช้ได้) หรือ replicate → **Step 4:** PASS
- [ ] **Step 5:** refactor

---

### Task 5: list-my-fines + self-checkout usecases

**Files:**
- Create: `server/src/modules/me/applications/usecases/list-my-fines.usecase.ts`, `self-checkout.usecase.ts` (+ tests)

**Parallelization:** Can run with: T4 | Must wait for: T1 | Race risk: none

- [ ] **Step 0: Load the TDD discipline**
- [ ] **Step 1:** test — fines: เฉพาะของตัวเอง + sum ยอดค้าง (paid=false); self-checkout: สำเร็จ (due date ตาม policy role + checked_out_by = ตัวเอง) / copy ไม่ว่าง → 409 / สมาชิก suspend หรือค่าปรับเกินเพดาน → 403 / ยืมเกิน max_active_loans → 403
- [ ] **Step 2:** FAIL → **Step 3:** implement — self-checkout **wrap `CheckoutUsecase` เดิม** (`execute({ command: { userId, copyCode }, now })`) — verify แล้วว่า accept userId เป็น command ได้ → **Step 4:** PASS
- [ ] **Step 5:** refactor

---

### Task 6: catalog GET เปิดทุก role

**Files:**
- Modify: `server/src/modules/catalog/adapters/controllers/book.controller.ts`, `category.controller.ts`
- Test: `book.controller.test.ts` / `category.controller.test.ts` (มีอยู่) — เพิ่มกรณี student เข้า GET ได้ / student เข้า POST ไม่ได้

**Parallelization:** Can run with: T1 | Must wait for: none | Race risk: `book.controller.ts` — task อื่นห้ามแตะ

- [ ] **Step 0: Load the TDD discipline**
- [ ] **Step 1:** test: `role: true` บน GET `/catalog/books` (student → 200), POST ยัง 403 สำหรับ student
- [ ] **Step 2:** FAIL (student โดน 403) → **Step 3:** แยก GET routes ออก `.guard({ role: true })` (หรือ `public` guard ที่เช็คแค่ login) → **Step 4:** PASS
- [ ] **Step 5:** ตรวจ response ไม่ leak fines/loans field

---

### Task 7: me controller + routes + DI

**Files:**
- Create: `server/src/modules/me/adapters/controllers/me.controller.ts` + `schemas/me.schema.ts`
- Modify: `server/src/modules/me/me.module.ts`, `server/src/modules/di-registrations.ts`, `server/src/modules/app.module.ts`
- Test: `me.controller.test.ts`

**Parallelization:** Can run with: none | Must wait for: T2-T5 | Race risk: `di-registrations.ts` + `app.module.ts` — task นี้เป็นเจ้าของ

- [ ] **Step 0: Load the TDD discipline**
- [ ] **Step 1:** test: ทุก route `.guard({ role: ["faculty","staff","student"] })`; handler ใช้ `user` จาก context (mock resolve) — ไม่มี path ไหนรับ userId จาก client; response schema ครบ
- [ ] **Step 2:** FAIL → **Step 3:** controller + register DI (tsyringe) + `.use()` ใน app.module → **Step 4:** PASS
- [ ] **Step 5:** `bun run api:dev` boot ไม่ error

---

### Task 8: security tests (IDOR + role guard + suspend)

**Files:**
- Create: `server/src/__tests__/security/me-idor.security.test.ts`
- Modify: `server/src/__tests__/security/role-guard.security.test.ts` (เพิ่มกรณี student → `/me/*` ผ่าน, student → POST catalog 403)

**Parallelization:** Can run with: none | Must wait for: T7 | Race risk: none

- [ ] **Step 0:** เขียน attack path — user A ต่ออายุ loan ของ B → 403; ยกเลิก reservation ของ B → 403; student เรียก POST `/catalog/books` → 403; suspend user เรียก `/me/loans` → 401
- [ ] **Step 1:** `bun run test:security` → เริ่ม FAIL จุดที่รั่ว → **Step 2:** แก้ใน usecase/controller → green

---

### Task 9: portal shell + search feature

**Files:**
- Create: `app/(portal)/layout.tsx` (มีแล้วจากงานเตรียมการ — ปรับให้ครบ), `app/(portal)/search/page.tsx`, `app/features/search/{search.page.tsx, stores/search.store.ts(+test), actions/search.action.ts, hooks/use-search.ts, components/*}`
- Test: `app/features/search/stores/search.store.test.ts`

**Parallelization:** Can run with: T10-T12 | Must wait for: T6, T7 | Race risk: `app/(portal)/layout.tsx` — งานนี้เป็นเจ้าของ

- [ ] **Step 0: Load the TDD discipline**
- [ ] **Step 1:** test: fetch list, ค้นหา/กรอง → refetch + pagination, error ไทย
- [ ] **Step 2:** FAIL → **Step 3:** หน้า /search (grid การ์ดหนังสือ + search + filter หมวด + status badge ว่าง/ถูกยืม) → **Step 4:** PASS
- [ ] **Step 5:** skeleton/empty state ไทย

---

### Task 10: my-loans feature (due-date card + renew)

**Files:**
- Create: `app/features/my-loans/{my-loans.page.tsx, stores/my-loans.store.ts(+test), actions/my-loans.action.ts, hooks/use-my-loans.ts, components/due-date-card.tsx, components/loan-item.tsx}`
- Modify: `app/(portal)/my-loans/page.tsx` — render feature แทน placeholder
- Test: `app/features/my-loans/stores/my-loans.store.test.ts`

**Parallelization:** Can run with: T9, T11-T12 | Must wait for: T3, T7 | Race risk: `app/(portal)/my-loans/page.tsx` — งานนี้เป็นเจ้าของ

- [ ] **Step 0: Load the TDD discipline**
- [ ] **Step 1:** test: fetch my loans, renew → อัปเดต due date/สถานะ, renew error (มีจอง/เกินครั้ง) → error ไทย
- [ ] **Step 2:** FAIL → **Step 3:** หน้า my-loans — การ์ด active loan + **due-date card** (สแตมป์วันคืน — signature design.md) + ปุ่มต่ออายุ (disabled ตามเงื่อนไข) + ประวัติ → **Step 4:** PASS
- [ ] **Step 5:** build + empty state

---

### Task 11: book detail + self-checkout/reserve actions

**Files:**
- Create: `app/(portal)/books/[id]/page.tsx`, `app/features/search/components/book-detail.tsx`, `actions/book.actions.ts` (+ tests สำหรับ logic checkout/reserve button state)
- Test: `app/features/search/stores/book-detail.store.test.ts` (หรือ colocate)

**Parallelization:** Can run with: T9-T10, T12 | Must wait for: T4, T5, T7 | Race risk: none

- [ ] **Step 0: Load the TDD discipline**
- [ ] **Step 1:** test: มีสำเนาว่าง → ปุ่ม "ยืม"; ทั้งหมดถูกยืม → ปุ่ม "จอง"; จองอยู่แล้ว → badge ลำดับคิว
- [ ] **Step 2:** FAIL → **Step 3:** book detail + actions (self-checkout / create reservation) + toast ไทย ("ยืมสำเร็จ ✓ กำหนดคืน <date>") → **Step 4:** PASS
- [ ] **Step 5:** build

---

### Task 12: my-reservations + my-fines features

**Files:**
- Create: `app/features/my-reservations/{...}` , `app/features/my-fines/{...}` (+ tests)
- Test: store tests ทั้งคู่

**Parallelization:** Can run with: T9-T11 | Must wait for: T4, T5, T7 | Race risk: none

- [ ] **Step 0: Load the TDD discipline**
- [ ] **Step 1:** test: reservations — list + ยกเลิก (waiting เท่านั้น); fines — list + ยอดค้างรวม
- [ ] **Step 2:** FAIL → **Step 3:** หน้า my-reservations (badge สถานะ + pickup deadline + ปุ่มยกเลิก) + หน้า my-fines (ยอดรวม + รายการ + หมายเหตุชำระที่เคาน์เตอร์) → **Step 4:** PASS
- [ ] **Step 5:** build

---

### Task 13: e2e portal spec + guard spec เพิ่ม

**Files:**
- Create: `e2e/portal.spec.ts`
- Modify: `e2e/guard.spec.ts` (student flow — เพิ่มไว้แล้วบางส่วนในงานเตรียมการ, ตรวจให้ครบ)

**Parallelization:** Can run with: none | Must wait for: T9-T12, T8 | Race risk: dev servers ต้องวิ่ง

- [ ] **Step 1:** portal.spec: student login → `/my-loans` → ไป /search → เปิดหนังสือ → ยืม (ถ้าสำเนาว่าง) หรือจอง → เห็นใน my-loans/my-reservations
- [ ] **Step 2:** guard.spec: student เข้า /dashboard → redirect /my-loans
- [ ] **Step 3:** `bunx playwright test portal.spec.ts guard.spec.ts` → เขียว; แล้วรัน full suite — spec เดิมไม่แตก

---

### Task 14: polish (empty/error/a11y/responsive)

**Files:**
- Modify: `app/features/*` (portal) — empty/error states, focus styles, reduced-motion

**Parallelization:** Can run with: none | Must wait for: T9-T12 | Race risk: หน้า portal เท่านั้น

- [ ] **Step 0:** checklist: responsive ≤375px (mobile-first), keyboard focus, empty state ไทยชวนลงมือ, dark mode contrast
- [ ] **Step 1:** แก้ที่พบ + `bun run lint` + `bun run build` + smoke e2e

---

## Validation

- ทุก task มี TDD slice หรือชี้ชัดว่า config/UI-base
- ไม่มี task ใดให้ commit/push — มนุษย์จัดการ (AGENTS.md)
- Race risks: `di-registrations.ts`/`app.module.ts` (T7 เท่านั้น), `book.controller.ts` (T6 เท่านั้น), `(portal)/layout.tsx` (T9), `my-loans/page.tsx` (T10)
- Blockers: ไม่มีใหม่ — schema/domain พร้อมใช้หมดแล้ว
- ขอบเขต: ฝั่งผู้ยืม MVP (ค้นหา/ยืมเอง/จองเอง/ดูการยืม-ค่าปรับ) — Course reserve/Notification/Payment เป็นรอบถัดไป

## หมายเหตุ/Decision Log

- **Login redirect ตาม role**: ทำในงานเตรียมการแล้ว (route-guard + auth.store + middleware + หน้า /my-loans placeholder) — e2e guard เพิ่มใน T13
- **`/me/*` อนุญาตเฉพาะ faculty/staff/student**: admin/librarian ไม่ใช้ portal (มี backoffice อยู่แล้ว) — ถ้า tester ต้องการให้ admin ทดสอบ portal ได้ ให้ขยาย guard เป็น `role: true` + owner check ยังกัน IDOR อยู่
- **Self-checkout**: ใช้ `CheckoutUsecase` เดิม (verify signature แล้ว) — เก็บประวัติ `checked_out_by = user.id` เพื่อ audit
- **Catalog GET เปิดทุก role** แต่ POST/PUT/status คงเดิม admin/librarian
