# Manage Members Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** เพิ่มหน้า "จัดการสมาชิก" ให้ admin/librarian (สร้าง/แก้ไข/เปลี่ยนสถานะ) + route guard middleware — ตาม design spec `docs/superpowers/specs/2026-08-11-members-management-design.md`

**Estimated tasks:** 10 | **Estimated time:** ~150 min | **Touches:** Server API / Web UI / Middleware / E2E

## Current Problem / Current Solution

- Users module ฝั่ง server มีแค่ read-only (`GET /users/search`, `GET /users/:id`) — สร้าง/แก้ไขสมาชิกต้อง insert ผ่าน DB โดยตรง
- ไม่มีหน้า UI จัดการสมาชิก — admin ไม่มีทางสร้าง user ใหม่จากระบบ
- **ไม่มี route guard เลย** — ทุกหน้า (dashboard/catalog/circulation/reservations) render ได้โดยไม่ต้อง login (ข้อมูลไม่รั่วจริงเพราะ proxy `/api/backend/*` ตอบ 401, แต่ UX แย่ + หน้าเปล่าๆ)
- Web feature pattern ที่ใช้ได้ = `app/features/catalog/` (page + store + actions + types + hooks flat structure)

## Proposed Approach

Mirror **catalog feature** ทั้งฝั่ง server (module users) และฝั่ง web (`app/features/members/`):

1. **Server**: เพิ่ม `POST /users` + `PATCH /users/:id` (guard `["admin","librarian"]`) ผ่าน usecases ใหม่ 2 ตัว + ขยาย repository port/implementation (create/update/findById/branchExists + ค้น email ด้วย)
2. **Web**: หน้า `/members` — ตาราง + search + filter บทบาท/สถานะ + dialog เพิ่ม/แก้ไข (ไม่มีช่องรหัสผ่านตอนแก้, ไม่ลบ)
3. **Middleware**: `middleware.ts` (NextAuth v5 wrapper) — redirect ไม่ login → `/login`, login แล้วไป `/login` → `/dashboard`
4. **Tests**: server unit, web unit, e2e 2 specs

## Side by Side

| Scenario | Before | After |
| -------- | ------ | ----- |
| admin อยากเพิ่มสมาชิก | แก้ DB โดยตรง (manual SQL) | หน้า `/members` → ปุ่มเพิ่มสมาชิก → dialog → สร้างสำเร็จ |
| admin อยากระงับบัญชี | แก้ DB โดยตรง | แก้ไขที่แถว → dropdown สถานะ → suspended |
| ไม่ login แล้วเปิด `/dashboard` | เห็นหน้า (layout ว่าง, sidebar แสดงแอดมินหลอก) | redirect ไป `/login` ทันที |
| ค้นหาสมาชิก | ค้นได้แค่ชื่อ + รหัสนักศึกษา | ค้นชื่อ + อีเมล + รหัสนักศึกษา |

## Assumptions & Risks

- **Assumed:** bcrypt cost 12 (เท่า seed — verify แล้ว: `seed.ts:162` ใช้ 12)
- **Assumed:** `role` macro ของ authPlugin คืน `{ user }` เข้า handler context (verify แล้ว: `auth.plugin.ts` resolve คืน `{ user }`) → ใช้ `user.id` เป็น actorId
- **Assumed:** `vitest.config.ts` = server unit, `vitest.web.config.ts` = web unit (verify แล้ว) — รันแยก config
- **Assumed:** e2e ต้องมี dev servers วิ่งอยู่ (web 3000 + api 3001) ก่อนรัน `playwright test` — ตาม convention เดิม
- **Risk:** TypeBox `maxLength` นับตัวอักษรไม่ใช่ bytes → password 72 bytes ต้องเช็คด้วย `Buffer.byteLength` ใน usecase (ไม่ไว้ใจ schema)
- **Risk:** Task 1/2 แตะไฟล์ port + schemas เดียวกัน → ต้อง sequential (ระบุใน race risk แล้ว)
- **Risk:** e2e members spec สร้าง user ผ่าน UI แล้ว**ไม่ cleanup** — ตาม pattern เดิมของ catalog spec (ใช้ข้อมูล unique ต่อ run; fixtures cleanup ลบแค่ seed data) — เบี่ยงเบนจาก spec §6.3 เล็กน้อย (จดไว้ให้ผู้ใช้รับทราบ)
- **Risk:** middleware ใหม่ต้องไม่ครอบ `/api/*` (proxy ตรวจ auth เอง, NextAuth route ต้องปล่อยผ่าน) — matcher ระบุ path แน่นอนแล้ว

## Impact

- Server: +2 routes, +2 usecases, +4 method ใน repository, module register +2
- Web: +1 route หน้า (1 folder feature + components), sidebar +1 เมนู
- Infra: +`middleware.ts` (root) + `app/_shared/lib/route-guard.ts`
- Tests: server unit +~15 cases, web unit +~10 cases, e2e +2 specs
- ไม่มี migration (users schema มีครบอยู่แล้ว), ไม่มี dep ใหม่

---

## Task Overview

> **For implementation tasks:** REQUIRED SUB-SKILL: Use superpowers:test-driven-development before editing production code. Each task is a RED -> GREEN -> REFACTOR slice.
> **Parallel-first:** Spawn separate sub-agents for independent lanes. Do not parallelize tasks that can race on the same files, migrations, generated artifacts, or shared state.

1. **CreateUserUsecase + port/schemas** — Lane A | Can run together: Task 6, 9 | Must wait for: none | TDD slice: test 409/404/400/success (fake repo) -> usecase + port + schema types -> vitest targeted
2. **UpdateUserUsecase + port/schemas** — Lane A | Can run together: none | Must wait for: Task 1 (port/schemas ไฟล์เดียวกัน) | TDD slice: test 403 self/404/409/success -> usecase -> vitest targeted
3. **Controller routes + schema TypeBox + tests** — Lane A | Can run together: none | Must wait for: Task 1, 2 | TDD slice: test 422 validation + wiring -> routes + schemas -> vitest targeted
4. **DrizzleUserRepository ใหม่** — Lane A | Can run together: none | Must wait for: Task 1, 2 (port signatures) | TDD slice: (ไม่มี repo test แยก — โครงสร้างการทดสอบเดิมใช้ fake repo) -> implement + email search -> typecheck + full server suite
5. **users.module.ts register** — Lane A | Can run together: none | Must wait for: Task 1-3 | Config-only: lint + typecheck + app boot test
6. **Web types + actions** — Lane B | Can run together: Task 1, 9 | Must wait for: none (contracts อยู่ใน spec แล้ว) | Thin wrappers (ไม่มี test แยก — ตาม catalog.action) -> typecheck + lint
7. **members.store.ts + test** — Lane B | Can run together: none | Must wait for: Task 6 | TDD slice: fetch/create/update/reset (vi.mock actions) -> store -> vitest.web targeted
8. **Members page UI + sidebar + route** — Lane B | Can run together: none | Must wait for: Task 7 | UI (test ผ่าน store test + lint + manual) -> components -> lint + web suite
9. **route-guard + middleware.ts** — Lane C | Can run together: Task 1, 6 | Must wait for: none | TDD slice: 3 กรณี redirect (pure function) -> route-guard.ts + middleware -> vitest.web targeted
10. **E2E members + guard specs** — Lane D | Can run together: none | Must wait for: Task 5, 8, 9 (ต้องมี server API + หน้า + middleware) | TDD slice: e2e เป็น verification — เขียน spec ตาม behavior -> playwright run

---

### Task 1: CreateUserUsecase + port/schemas

**Files:**

- Modify: `server/src/modules/users/applications/ports/user.repository.ts` — เพิ่ม `create(input)` + `branchExists(id)`
- Modify: `server/src/modules/users/applications/schemas/user-schemas.ts` — เพิ่ม `ICreateUserCommand`, `ICreateUserReturnType`
- Create: `server/src/modules/users/applications/usecases/create-user.usecase.ts`
- Test: `server/src/modules/users/applications/usecases/create-user.usecase.test.ts`

**Parallelization:**

- Can run with: `Task 6`, `Task 9`, or `none`
- Must wait for: `none`
- Race risk: port + user-schemas ไฟล์เดียวกับ Task 2 → **Task 2 ห้ามรันคู่**

- [ ] **Step 0: Load the TDD discipline**
  Use `superpowers:test-driven-development` before editing production code.

- [ ] **Step 1: Write the failing test**
  Fake repo (extends port stub ใหม่): test 5 กรณี —
  1. สำเร็จ: hash password (bcrypt cost 12), status = `"active"`, memberType default (student→`undergraduate`, อื่น→`general`), คืน `UserPublic` (ไม่มี passwordHash)
  2. email ซ้ำ (`findByEmail` คืน user) → `DomainConflictError` 409 (message: "อีเมลนี้ถูกใช้งานแล้ว")
  3. studentOrStaffId ซ้ำ → 409 ("รหัสนักศึกษา/พนักงานนี้ถูกใช้งานแล้ว")
  4. branchId ให้มาแต่ `branchExists` = false → `DomainNotFoundError` 404 ("ไม่พบสาขาที่เลือก")
  5. password เกิน 72 bytes (`Buffer.byteLength("ก".repeat(25), "utf8")` = 75) → **422** ("รหัสผ่านยาวเกินไป (สูงสุด 72 ตัวอักษร)") — ก่อน hash

- [ ] **Step 2: Run the test and confirm it fails for the expected reason**
  `bunx vitest run --config vitest.config.ts server/src/modules/users/applications/usecases/create-user.usecase.test.ts`
  Expected: FAIL (use case/port ไม่มี) — ไม่ใช่ error syntax/import

- [ ] **Step 3: Implement the minimal code**
  - port: `create(input: CreateUserInput): Promise<UserRecord>` + `branchExists(id: string): Promise<boolean>`
  - schemas: `ICreateUserCommand` (email/fullName/role/password + optional memberType/studentOrStaffId/phone/branchId)
  - usecase: normalize email (trim/lowercase) → เช็ค duplicate email + studentOrStaffId → เช็ค branch → byte-length check → `bcrypt.hash(password, 12)` → `repository.create(...)` → `toPublic`
  - **Error classes (verify แล้ว):** ซ้ำ → `DomainConflictError` (409), branch/not found → `DomainNotFoundError` (404), validation (password ยาวเกิน) → `new DomainError(message, 422)` — ตาม convention catalog/storage (ดู `create-book.usecase.ts:31`)

- [ ] **Step 4: Run the test and confirm it passes**
  รันคำสั่งเดิม → PASS ไม่มี new warnings

- [ ] **Step 5: Refactor only after green**
  เช็ค pattern ซ้ำกับ `catalog` usecases (naming, error factory) — rerun test

---

### Task 2: UpdateUserUsecase + port/schemas

**Files:**

- Modify: `server/src/modules/users/applications/ports/user.repository.ts` — เพิ่ม `update(id, input)` + `findById(id)`
- Modify: `server/src/modules/users/applications/schemas/user-schemas.ts` — เพิ่ม `IUpdateUserCommand`
- Create: `server/src/modules/users/applications/usecases/update-user.usecase.ts`
- Test: `server/src/modules/users/applications/usecases/update-user.usecase.test.ts`

**Parallelization:**

- Can run with: `none`
- Must wait for: `Task 1` (port + user-schemas ไฟล์เดียวกัน)
- Race risk: port + user-schemas (Task 1), `user.drizzle.repository.ts` (Task 4)

- [ ] **Step 0: Load the TDD discipline**
  Use `superpowers:test-driven-development` before editing production code.

- [ ] **Step 1: Write the failing test**
  Fake repo: test 5 กรณี —
  1. สำเร็จ: update fullName/status → คืน user ที่แก้แล้ว (updatedAt เปลี่ยน), **ห้ามรับ email/password ใน command** (type-level — ถ้าไม่มี field เหล่านี้ compile error)
  2. **actorId == id และมีการเปลี่ยน role หรือ status → 403** ("ไม่สามารถเปลี่ยนสถานะ/บทบาทของตัวเองได้") — ก่อนเรียก repo
  3. user ไม่มี (`findById` null) → 404 ("ไม่พบสมาชิกที่ค้นหา")
  4. studentOrStaffId ซ้ำกับคนอื่น → 409
  5. body ว่าง (ไม่มี field อะไรเลย) → **422** ("ไม่พบข้อมูลที่ต้องการแก้ไข") — `new DomainError(message, 422)`

- [ ] **Step 2: Run the test and confirm it fails for the expected reason**
  `bunx vitest run --config vitest.config.ts server/src/modules/users/applications/usecases/update-user.usecase.test.ts`
  Expected: FAIL (missing) — ไม่ใช่ syntax/import error

- [ ] **Step 3: Implement the minimal code**
  - port: `findById(id)` + `update(id, input: UpdateUserInput)` — input type = partial ของ field ที่แก้ได้ (fullName/role/status/memberType/studentOrStaffId/phone/branchId)
  - usecase: empty-body check → self-change check (actorId vs id — ดูด้วยว่า "เปลี่ยน" หมายถึง field role/status ถูกส่งมา) → findById → duplicate studentOrStaffId (ถ้าส่งมา) → `repository.update` → `toPublic`
  - update ต้อง set `updatedAt: new Date()`

- [ ] **Step 4: Run the test and confirm it passes**
  รันคำสั่งเดิม → PASS

- [ ] **Step 5: Refactor only after green**
  rerun test

---

### Task 3: Controller routes + schema TypeBox + tests

**Files:**

- Modify: `server/src/modules/users/adapters/controllers/schemas/user.schema.ts` — เพิ่ม `createUserBodySchema`, `updateUserBodySchema`
- Modify: `server/src/modules/users/adapters/controllers/user.controller.ts` — เพิ่ม `.post("/")` + `.patch("/:id")`
- Test: `server/src/modules/users/adapters/controllers/schemas/user.schema.test.ts` (หรือไฟล์ test เดิมของ schema — เช็คชื่อไฟล์จริงตอน implement), `server/src/modules/users/adapters/controllers/user.controller.test.ts`

**Parallelization:**

- Can run with: `none`
- Must wait for: `Task 1`, `Task 2` (inject usecases)
- Race risk: `user.controller.ts` — Task 8/10 ไม่แตะไฟล์นี้; `user.schema.ts` เฉพาะ Task นี้

- [ ] **Step 0: Load the TDD discipline**
  Use `superpowers:test-driven-development` before editing production code.

- [ ] **Step 1: Write the failing test**
  - Schema test (validate ผ่าน schema โดยตรง): create body — email format ผิด → fail, password <8 → fail, role ไม่ในลิสต์ → fail, ไม่มี email/fullName/role/password → fail; update body — body ว่าง → fail, field ไม่รู้จัก (เช่น email) → fail (unevaluatedProperties/ปิด strict)
  - Controller test (mirror pattern เดิม — mock usecases ผ่าน tsyringe container): POST เรียก createUserUsecase + คืน 201; PATCH ส่ง `user.id` เป็น actorId (mock role guard หรือเช็ค call args); guard role `["admin","librarian"]` ยังอยู่

- [ ] **Step 2: Run the test and confirm it fails for the expected reason**
  `bunx vitest run --config vitest.config.ts server/src/modules/users`
  Expected: FAIL (routes/schemas ยังไม่มี)

- [ ] **Step 3: Implement the minimal code**
  - Schema: `createUserBodySchema` = email (Format email), fullName min 1, role union, password minLength 8, memberType optional, studentOrStaffId/phone/branchId optional; `updateUserBodySchema` = ทุก field optional แต่ `Type.Object` ต้องมีอย่างน้อย 1 (เช็คใน usecase แล้ว — schema แค่ Type.Optional ทุก field)
  - Controller: `.post("/", ({ body, user }) => this.create(body, user.id), { body: createUserBodySchema, response: {201: successResponseSchema(userPublicSchema), ...} })` + `.patch("/:id", ...)` — `user` มาจาก role macro resolve (มีใน context อยู่แล้ว)
  - Error mapping: 409/404/403/400 → Elysia status + message ไทย (ดู pattern controller catalog ว่าจัด error ยังไง — catch domain error → status)

- [ ] **Step 4: Run the test and confirm it passes**
  รัน `bunx vitest run --config vitest.config.ts server/src/modules/users` → ทั้งหมด PASS

- [ ] **Step 5: Refactor only after green**
  rerun

---

### Task 3.5: Fix app.ts onError ordering (discovered — pre-existing bug)

**Files:**

- Create: `server/src/app.factory.ts` — `buildApp(appModule: Elysia): Elysia` = composition เดียว (cors + rateLimit + openapi + **onError ก่อน use(appModule)** + use(appModule) + uploads route)
- Modify: `server/src/app.ts` — ใช้ `buildApp(appModule)` (ลบ composition inline)
- Modify: `server/src/__tests__/integration/app-boot.test.ts` — ใช้ `buildApp(createAppModule(deps))` แทน buildApp ในไฟล์ (single source of truth) + เพิ่ม regression test: เรียก route ที่ throw DomainError ผ่าน module จริง → ได้ status ที่ mapping (เช่น GET /users/search ไม่มี header → 401 envelope; 404 ไม่พบ route)
- Test: regression ต้อง FAIL กับลำดับเก่า (onError หลัง use) และ PASS กับใหม่

**Parallelization:**

- Can run with: `none`
- Must wait for: `none` (pre-existing; กระทบ Task 8/10 ถ้าไม่แก้)
- Race risk: `app.ts` / `app.factory.ts` / `app-boot.test.ts` — ไฟล์นี้ไม่มี task อื่นแตะ

**Fix:** ย้าย `.onError(({ code, error, set }) => toHttpError(...))` ให้ลงทะเบียน **ก่อน** `.use(appModule)` — repro ยืนยันแล้วว่า Elysia lifecycle hook ใช้กับ route ที่ลงทะเบียน *หลัง* hook เท่านั้น (bug: module routes ทั้งหมดคืน 500 แทน 409/404/403/422 + error message leak)

- [ ] **Step 1: Write the failing regression test** — สร้าง app ผ่าน factory เดียว (บนสุดของไฟล์) → เรียก route ที่ throw DomainError (เช่น `/users/search` ไม่มี auth header → 401 envelope) → expect 401 (ตอนนี้ได้ 500 → RED)
- [ ] **Step 2: Confirm fail** — `bunx vitest run --config vitest.config.ts server/src/__tests__/integration/app-boot.test.ts`
- [ ] **Step 3: Implement** — extract buildApp + reorder onError
- [ ] **Step 4: Confirm pass** — รัน test เดิม + full server suite ยังเขียว
- [ ] **Step 5: Refactor** — `bun run lint` + `bunx tsc --noEmit` (error เหลือแค่ drizzle repo + setup.ts)

Commit: `git-cz --non-interactive --type=fix --scope=server --subject="แก้ onError ordering ใน app.ts ให้ domain errors map เป็น HTTP status ที่ถูกต้อง"`

---

### Task 4: DrizzleUserRepository ใหม่

**Files:**

- Modify: `server/src/modules/users/adapters/repository/user.drizzle.repository.ts`

**Parallelization:**

- Can run with: `none`
- Must wait for: `Task 1`, `Task 2` (port signatures)
- Race risk: ไฟล์นี้ไฟล์เดียว; usecase tests ใช้ fake repo → ไม่กระทบ

- [ ] **Step 0: Load the TDD discipline**
  Repository มี**ไม่มี unit test แยก** (โครงสร้างเดิมทดสอบผ่าน fake repo ใน usecase test + controller test) → เป็น exception ที่ documented ไว้ — verification = typecheck + full suite + integration ที่มี

- [ ] **Step 1: Implement**
  - `create(input)`: `.insert(users).values({...input, passwordHash}).returning()` → toUserRecord — **ต้องเช็ค email duplicate race** → postgres unique violation → throw 409 (จับ `PgUniqueViolationError` — ดูว่ามี handler pattern ที่ไหนใน repo)
  - `findById(id)`: select by pk
  - `update(id, input)`: `.update(users).set({...input, updatedAt: new Date()}).where(eq(users.id, id)).returning()` — คืน `null` ถ้าไม่เจอ
  - `branchExists(id)`: `.select({id: users.branchId}).from(branches).where(eq(branches.id, id)).limit(1)` → boolean (import `branches` จาก schema)
  - `searchByName`: เพิ่ม `ilike(users.email, pattern)` ใน whereCondition (search ชื่อ+email+รหัสนักศึกษา) — เปลี่ยนชื่อ method เป็น `searchByKeyword` + อัปเดต port + usecase `list-users.usecase.ts:34` ให้ใช้ชื่อใหม่? **Decision: เปลี่ยนชื่อเป็น `searchByKeyword` ทั่วทั้ง 3 ไฟล์ (port/repo/usecase) เพื่อให้ชื่อตรงความจริง** — อัปเดต `list-users.usecase.test.ts` ถ้าอ้าง method นี้
  - **Filter role/status + q optional (ตัดสินใจเพิ่มตอน Task 4 — UX หน้า members ต้องโหลดตารางว่างไม่ได้):** `searchUsersQuerySchema` (Task 3 เพิ่ม role/status แล้ว) ต้องทำให้ `q` เป็น optional (`Type.Optional(Type.String())`) + `IListUsersQuery.q` optional + usecase: ถ้าไม่มี q และไม่มี filter → คืน **ผู้ใช้ทั้งหมดแบบ paginated** (ตาม fullName); มี q → keyword search; filter role/status ใช้เสมอเมื่อส่งมา — backward-compatible (e2e circulation ใช้ q เสมอ)

- [ ] **Step 2: Verify**
  `bunx vitest run --config vitest.config.ts server/src/modules/users` (usecase tests + controller tests ที่เหลือต้องยังเขียว) + `bun run lint`

---

### Task 5: users.module.ts register

**Files:**

- Modify: `server/src/modules/users/users.module.ts`

**Parallelization:**

- Can run with: `none`
- Must wait for: `Task 1`, `Task 2`, `Task 3`
- Race risk: none (ไฟล์เล็ก ใครๆ ก็ไม่แตะ)

**Config-only** — register `CreateUserUsecase` + `UpdateUserUsecase` ใน container (pattern เดิมบรรทัด 24-25)

- [ ] **Verify:** `bunx vitest run --config vitest.config.ts server/src/modules/users` + `bun run lint` + boot app (มี test/app boot test ใน suite มั้ย — ถ้ามีรันด้วย)

---

### Task 6: Web types + actions

**Files:**

- Create: `app/features/members/members.types.ts` — `MemberListItem`, `CreateMemberInput`, `UpdateMemberInput`, `ListMembersParams`
- Create: `app/features/members/actions/members.action.ts` — `fetchMembers(params)` (GET `/users/search`), `createMember(input)` (POST `/users`), `updateMember(id, patch)` (PATCH `/users/:id`) — ผ่าน `eden.users.search.get(...)` / `eden.users.post(...)` / `eden.users({id}).patch(...)` + `edenRequest` (pattern catalog.action)

**Parallelization:**

- Can run with: `Task 1`, `Task 9`
- Must wait for: `none` (contracts อยู่ใน spec แล้ว — type อ้างอิง `@libsys/shared` ที่มีอยู่)
- Race risk: none

**Thin wrappers — ไม่มี unit test แยก** (ตาม convention `catalog.action.ts` ไม่มี test)

- [ ] **Verify:** `bun run lint` + typecheck (`bunx tsc --noEmit` — เช็คว่า repo มี script นี้มั้ย; ถ้าไม่มีใช้ `bun run build` หรือ vitest ที่ import ผ่าน)

---

### Task 7: members.store.ts + test

**Files:**

- Create: `app/features/members/stores/members.store.ts` — zustand: `members`, `search`, `roleFilter`, `statusFilter`, `page`, `limit`, `total`, `totalPages`, `isLoading`, `isError`, `errorMessage` + `loadMembers()`, `setSearch()`, `setRoleFilter()`, `setStatusFilter()`, `setPage()`, `createMember()`, `updateMember()`, `reset()` — mirror `catalog.store.ts`
- Test: `app/features/members/stores/members.store.test.ts` — vi.mock actions module (pattern `catalog.store.test.ts`)

**Parallelization:**

- Can run with: `none`
- Must wait for: `Task 6`
- Race risk: none (ไฟล์ใหม่ทั้งหมด)

- [ ] **Step 0: Load the TDD discipline**
  Use `superpowers:test-driven-development` before editing production code.

- [ ] **Step 1: Write the failing test**
  1. `loadMembers` สำเร็จ → set list/total/pages; error → isError + errorMessage ไทย
  2. `setSearch` → page reset + reload (search param ส่งไป)
  3. `setRoleFilter`/`setStatusFilter` → reload พร้อม filter param
  4. `createMember` สำเร็จ → reload list; error → errorMessage
  5. `updateMember` → แทนที่ใน list (mirror `mergeBookIntoList`); error → errorMessage
  6. `reset` → กลับ initialState

- [ ] **Step 2: Run and confirm fail**
  `bunx vitest run --config vitest.web.config.ts app/features/members`
  Expected: FAIL (store ยังไม่มี)

- [ ] **Step 3: Implement the minimal code**
  store + `toListParams` (เพิ่ม role/status filter ใน query — **เช็ค**: server `searchUsersQuerySchema` ยังไม่มี role/status param → **เพิ่มตอน Task 3 schema?** — สั่ง: ถ้า schema ยังไม่มี filter param ให้ต่อยอดใน Task 3 (เพิ่ม `role`/`status` optional ใน `searchUsersQuerySchema` + usecase filter) — หมายเหตุ: จะเพิ่มไว้ใน Task 3 แล้ว)

- [ ] **Step 4: Run and confirm pass** — รันคำสั่งเดิม → PASS
- [ ] **Step 5: Refactor only after green** — rerun

---

### Task 8: Members page UI + sidebar + route

**Files:**

- Create: `app/(dashboard)/members/page.tsx` — server page (metadata ไทย) re-export `MembersPage` (pattern catalog page)
- Create: `app/features/members/members.page.tsx` — client page: toolbar (search input + role/status select + ปุ่ม "เพิ่มสมาชิก") + `MembersTable` + `MemberFormDialog` + loading/error/empty states — **add `data-slot` attributes** ตาม convention e2e (`data-slot="members-page"`, `data-slot="members-table"`, `data-slot="dialog"`, `data-slot="dialog-title"`, id: `#member-email`, `#member-fullname`, `#member-role`, `#member-password`, `#member-confirm-password`, `#member-status`)
- Create: `app/features/members/components/members-table.tsx` — ตาราง (ชื่อ, อีเมล, บทบาท, สถานะ badge, รหัสนักศึกษา, เบอร์) — คลิกแถว → เปิด dialog แก้ไข
- Create: `app/features/members/components/member-form-dialog.tsx` — create/edit shared (edit mode: ไม่มี password fields + มี status dropdown), validation client (email format, password ≥8 + ตรงกัน, required)
- Create: `app/features/members/components/member-status-badge.tsx` — badge สีตามสถานะ (active เขียว / suspended แดง / graduated เทา / inactive เทาเข้ม) — ดู pattern badge ของ catalog (มี status badge อยู่แล้ว copy)
- Modify: `app/_shared/components/sidebar.tsx` — เพิ่ม `{ label: "สมาชิก", href: "/members", icon: UsersIcon }` ใน group "การจัดการ" หลัง "คิวจอง" (บรรทัด ~41, import `UsersIcon` จาก lucide-react)

**Parallelization:**

- Can run with: `none`
- Must wait for: `Task 7`
- Race risk: `sidebar.tsx` — เช็คว่าไม่มี task อื่นแตะ (Task 9 ไม่แตะ sidebar)

**UI task — behavior test ผ่าน store test + e2e (Task 10); verification ระดับ task นี้:**

- [ ] **Verify:** `bunx vitest run --config vitest.web.config.ts` (ทั้ง web suite ยังเขียว) + `bun run lint` + dev manual: login admin → `/members` → เพิ่ม/แก้ไข/เปลี่ยนสถานะ
- [ ] **UX เขียน UI ไทยล้วน** — ปุ่ม/placeholder/error message ภาษาไทย

---

### Task 9: route-guard + middleware.ts

**Files:**

- Create: `app/_shared/lib/route-guard.ts` — `isProtectedPath(pathname)` + `resolveRouteGuard(pathname, isLoggedIn): string | null`
- Test: `app/_shared/lib/route-guard.test.ts`
- Create: `middleware.ts` (root) — `export default auth((req) => { const redirect = resolveRouteGuard(...); if (redirect) return NextResponse.redirect(new URL(redirect, req.nextUrl)); })` + `config.matcher`

**Parallelization:**

- Can run with: `Task 1`, `Task 6`
- Must wait for: `none`
- Race risk: none

- [ ] **Step 0: Load the TDD discipline**
  Use `superpowers:test-driven-development` before editing production code.

- [ ] **Step 1: Write the failing test** (`route-guard.test.ts`)
  1. `isProtectedPath("/dashboard")` = true, `isProtectedPath("/members/123")` = true, `isProtectedPath("/login")` = false, `isProtectedPath("/api/backend/books")` = false, `isProtectedPath("/")` = false
  2. `resolveRouteGuard("/catalog", false)` → `/login`; `resolveRouteGuard("/login", true)` → `/dashboard`; `resolveRouteGuard("/catalog", true)` → null; `resolveRouteGuard("/login", false)` → null
  3. matcher array (export จาก route-guard สำหรับ test) ครอบ protected path ทั้ง 5 + /login, ไม่ครอบ /api

- [ ] **Step 2: Run and confirm fail**
  `bunx vitest run --config vitest.web.config.ts app/_shared/lib/route-guard.test.ts`
  Expected: FAIL (ไฟล์ไม่มี)

- [ ] **Step 3: Implement the minimal code**
  - `PROTECTED_PATHS = ["/dashboard","/catalog","/circulation","/reservations","/members"]`
  - `isProtectedPath`: exact match หรือ prefix `${p}/`
  - `resolveRouteGuard`: protected && !loggedIn → `ROUTES.AUTH_SIGNIN`; pathname === signin && loggedIn → `ROUTES.DASHBOARD`; else null (ดู `app/_shared/constants/routes` — มี ROUTES.AUTH_SIGNIN/DASHBOARD อยู่แล้ว)
  - middleware.ts: import `{ auth }` จาก `@/auth`, matcher ใช้ array ตรงจาก route-guard

- [ ] **Step 4: Run and confirm pass**
  รันคำสั่งเดิม → PASS
- [ ] **Step 5: Refactor only after green** — rerun + `bun run lint`

---

### Task 10: E2E members + guard specs

**Files:**

- Create: `e2e/members.spec.ts`
- Create: `e2e/guard.spec.ts`

**Parallelization:**

- Can run with: `none`
- Must wait for: `Task 5`, `Task 8`, `Task 9` (server API + หน้า + middleware)
- Race risk: dev servers (web 3000 + api 3001) ต้องวิ่งอยู่; ไม่รันคู่กับ task อื่นที่แก้ pages เหล่านี้

**E2E เป็น verification ระดับ feature — เขียน spec ตาม behavior ที่ approve:**

- [ ] **Step 1: guard.spec.ts**
  1. ไม่ login → `goto("/dashboard")` → `toHaveURL(/\/login/)`
  2. ไม่ login → `goto("/members")` → `toHaveURL(/\/login/)`
  3. login แล้ว → `goto("/dashboard")` → เห็นหน้า (ไม่ redirect)

- [ ] **Step 2: members.spec.ts** (mirror catalog.spec — unique email ต่อ run, **ไม่ cleanup** ตาม convention เดิม)
  1. login admin → `goto("/members")` → เห็น `data-slot="members-page"` + ตาราง
  2. search โดยใช้ชื่อ/email ที่ seed มา → ตารางกรอง
  3. เพิ่มสมาชิก: กด "เพิ่มสมาชิก" → fill `#member-email` (unique `e2e-${Date.now()}@test.local`), `#member-fullname`, `#member-role`, `#member-password` → submit → dialog ปิด → ค้นหาชื่อเจอในตาราง
  4. validation: submit เปล่า → เห็น error ไทย (`#member-email-error` ฯลฯ — ตาม convention catalog `book-title-error`)
  5. แก้ไขสถานะ: คลิกแถว user ที่สร้าง → เปลี่ยน `#member-status` → badge เปลี่ยน

- [ ] **Step 3: Run & fix**
  `bunx playwright test members.spec.ts guard.spec.ts` → ทั้งคู่เขียว
  แล้วรัน full: `bunx playwright test` → **spec เดิม 10 ตัวต้องไม่แตก** (โดยเฉพาะ login.spec ที่ใช้ `/login` — middleware ต้องไม่บล็อก flow ปกติ)

---

## Post-Plan Verification (รวมทุก task)

| คำสั่ง | ครอบ |
| ------ | ---- |
| `bunx vitest run --config vitest.config.ts` | server unit ทั้งหมด (ต้อง 259+ ผ่าน) |
| `bunx vitest run --config vitest.web.config.ts` | web unit ทั้งหมด (ต้อง 94+ ผ่าน) |
| `bun run lint` | lint ทั้ง repo |
| `bunx playwright test` | e2e ทั้งหมด (10 เดิม + 2 ใหม่) — ต้องมี dev servers วิ่งอยู่ |

## หมายเหตุ/Decision Log

- **bcrypt cost = 12** (แก้จาก spec draft ที่เขียน 10 — seed.ts ใช้ 12)
- **searchByName → searchByKeyword**: เปลี่ยนชื่อ method + เพิ่ม email search (Task 4) — spec กล่าวไว้เป็น "ขยาย"
- **Filter role/status บน server**: เพิ่ม optional param ใน `searchUsersQuerySchema` + usecase (ทำใน Task 3) — store ส่ง filter param ผ่าน (Task 7)
- **e2e ไม่ cleanup user ที่สร้าง** — ตาม convention catalog spec (unique email ต่อ run); เบี่ยงเบนจาก spec §6.3 โดยเจตนา
- **Repository ไม่มี unit test แยก** — exception documented (ทดสอบผ่าน fake repo + controller tests + integration)
- **400 → 422 สำหรับ usecase validation** (password >72 bytes, body ว่าง) — spec เขียน 400 แต่ repo convention ใช้ `DomainError(message, 422)` (create-book.usecase/storage) — ใช้ 422
