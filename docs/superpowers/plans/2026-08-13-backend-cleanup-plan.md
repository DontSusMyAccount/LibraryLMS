# Backend Architecture and Clean Code Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ปรับ backend ให้สะอาดและสอดคล้อง Hexagonal/CQRS โดยคง API และ business behavior เดิม

**Estimated tasks:** 6 | **Estimated time:** ~180 min | **Touches:** Backend application ports, DI, usecases, schemas, tests

## Current Problem / Current Solution

`me` เรียก concrete usecase ของ `circulation` และ `reservations` โดยตรง ขณะที่หลาย usecase ใน `circulation`/`reservations` import audit port จาก `catalog` ทำให้ module dependency ไหลข้าม bounded context นอกจากนี้ read-side contracts บางตัวใช้ชื่อ `Command`, มี pass-through usecases และมี response schema ที่ไม่ได้ใช้ใน runtime

## Proposed Approach

ย้าย audit abstraction ไป shared application port, จัด boundary สำหรับ self-service ให้ไม่ผูกกับ concrete usecase ข้าม module, rename read contracts เป็น Query, cleanup เฉพาะ dead surface ที่ยืนยันได้ และลด nested validation โดยเพิ่ม tests ก่อนทุก production edit

## Side by Side

| Scenario | Before | After |
| -------- | ------ | ----- |
| Audit dependency | `reservations/circulation -> catalog audit port` | ทุก module -> shared `AuditPort` |
| Self-service command | `me -> concrete foreign usecase` | `me -> stable application boundary` |
| Read contract | `IGetBookCommand`, `IFindUserCommand` | `IGetBookQuery`, `IFindUserQuery` |
| User response schemas | Runtime ใช้ generic schema แต่มี named exports ซ้ำ | ใช้ named schema หรือเหลือ declaration เดียว |
| User update validation | nested conditional ใน usecase | named guard/helper พร้อม behavior เดิม |

## Assumptions & Risks

- **Assumed:** endpoint, request/response payload, status code และ domain behavior ต้องเหมือนเดิม
- **Assumed:** `DrizzleAuditRepository` เป็น adapter ที่ใช้ร่วมกันได้ทุก module
- **Risk:** DI token registration ซ้ำหรือ registration order เปลี่ยน behavior
- **Risk:** self-service ownership/actor context ถูกย้ายผิดชั้น
- **Risk:** rename types กระทบ test และ import ภายนอก server

## Impact

- ลด coupling ระหว่าง bounded contexts
- ทำให้ read/write naming สอดคล้อง CQRS
- ลด production dead surface และ middle-man code
- เพิ่มความชัดเจนของ usecase และคง compatibility ของ API

## Task Overview

> **For implementation tasks:** REQUIRED SUB-SKILL: Use superpowers:test-driven-development before editing production code. Each task is a RED -> GREEN -> REFACTOR slice.
> **Parallel-first:** Tasks 1 and 4 can be prepared independently, but implementation tasks touching shared module files must run sequentially.

1. **Extract shared AuditPort** - Lane A | Can run together: Task 4 | Must wait for: none | TDD slice: token/DI resolution test -> move port and registrations -> full module resolution
2. **Repair self-service application boundaries** - Lane B | Can run together: none | Must wait for: Task 1 | TDD slice: ownership/delegation tests -> replace concrete cross-module dependencies -> me security/integration tests
3. **Normalize CQRS read naming** - Lane C | Can run together: Task 4 | Must wait for: Task 2 only if shared files conflict | TDD slice: compile/import contract test -> rename query contracts and handlers -> unit/type checks
4. **Remove confirmed dead production schema surface** - Lane D | Can run together: Task 1 and Task 3 | Must wait for: none | TDD slice: response-schema usage test -> remove duplicate exports or wire named schemas -> schema tests
5. **Flatten nested user validation** - Lane E | Can run together: Task 4 | Must wait for: none | TDD slice: duplicate/self-update tests -> extract named guard -> targeted user tests
6. **Repository-wide verification and architecture audit** - Sequential | Can run together: none | Must wait for: Tasks 1-5 | TDD slice: regression baseline -> run full checks -> inspect dependency and API diff

---

### Task 1: Extract shared AuditPort

**Files:**

- Create: `server/src/modules/shared/applications/ports/audit.repository.ts`
- Modify: `server/src/modules/catalog/applications/ports/audit.repository.ts`
- Modify: `server/src/modules/catalog/adapters/repository/audit.drizzle.repository.ts`
- Modify: `server/src/modules/catalog/catalog.module.ts`
- Modify: `server/src/modules/circulation/circulation.module.ts`
- Modify: `server/src/modules/reservations/reservations.module.ts`
- Modify: audit-injecting usecases under `server/src/modules/circulation/applications/usecases/`
- Modify: audit-injecting usecases under `server/src/modules/reservations/applications/usecases/`
- Modify: `server/src/modules/me/applications/usecases/cancel-my-reservation.usecase.ts`
- Test: relevant module/usecase tests and a DI resolution test

**Parallelization:**

- Can run with: Task 4
- Must wait for: none
- Race risk: all audit imports and DI files are shared; do not run with Task 2

- [ ] **Step 0: Load the TDD discipline**

Use `superpowers:test-driven-development` before editing production code.

- [ ] **Step 1: Write the failing test**

Add a focused test proving circulation/reservations resolve an audit implementation through the shared token and existing audit behavior remains unchanged.

- [ ] **Step 2: Run the test and confirm it fails for the expected reason**

Run the new targeted test with `npx vitest run <test-file>`. Expected failure is missing shared token/import, not setup failure.

- [ ] **Step 3: Implement the minimal code**

Move the interface/token to shared, update imports, register one shared token, and remove catalog ownership of the abstraction while preserving adapter implementation.

- [ ] **Step 4: Run the test and confirm it passes**

Run the same test and affected module tests.

- [ ] **Step 5: Refactor only after green**

Remove obsolete re-exports only when `rg` confirms no production consumer; rerun targeted tests.

### Task 2: Repair self-service application boundaries

**Files:**

- Modify: `server/src/modules/me/applications/usecases/create-my-reservation.usecase.ts`
- Modify: `server/src/modules/me/applications/usecases/self-checkout.usecase.ts`
- Modify: `server/src/modules/me/applications/usecases/renew-my-loan.usecase.ts`
- Modify: `server/src/modules/me/applications/schemas/me-schemas.ts`
- Modify: relevant module ports/registrations
- Test: `server/src/modules/me/applications/usecases/*.test.ts`
- Test: `server/src/__tests__/security/me-idor.security.test.ts`

**Parallelization:**

- Can run with: none
- Must wait for: Task 1
- Race risk: self-service DI and shared ports; can change ownership semantics if done in parallel

- [ ] **Step 0: Load the TDD discipline**

Use `superpowers:test-driven-development` before editing production code.

- [ ] **Step 1: Write the failing test**

Add tests asserting self-service flows preserve owner checks, actor ID propagation, and existing results while no longer requiring concrete foreign usecase classes.

- [ ] **Step 2: Run the test and confirm it fails for the expected reason**

Run the affected me usecase tests. Expected failure should identify the new boundary/dependency contract.

- [ ] **Step 3: Implement the minimal code**

Replace pass-through concrete imports with stable ports or locally owned application handlers. Keep all current authorization checks and command payloads unchanged.

- [ ] **Step 4: Run the test and confirm it passes**

Run affected me tests and IDOR security tests.

- [ ] **Step 5: Refactor only after green**

Remove redundant wrapper logic and simplify constructor dependencies only after behavior is green.

### Task 3: Normalize CQRS read naming

**Files:**

- Modify: `server/src/modules/catalog/applications/schemas/catalog-schemas.ts`
- Modify: `server/src/modules/catalog/applications/usecases/get-book.usecase.ts`
- Modify: `server/src/modules/catalog/adapters/controllers/book.controller.ts`
- Modify: `server/src/modules/users/applications/schemas/user-schemas.ts`
- Modify: `server/src/modules/users/applications/usecases/find-user.usecase.ts`
- Modify: `server/src/modules/users/adapters/controllers/user.controller.ts`
- Modify: related unit tests

**Parallelization:**

- Can run with: Task 4
- Must wait for: none; if Task 2 changes me shared schema exports, run sequentially
- Race risk: type rename touches imports/tests across each module

- [ ] **Step 0: Load the TDD discipline**

Use `superpowers:test-driven-development` before editing production code.

- [ ] **Step 1: Write the failing test**

Update/add compile-level and handler tests that require `query` naming for read operations while preserving payload shape.

- [ ] **Step 2: Run the test and confirm it fails for the expected reason**

Run catalog/users usecase tests and TypeScript check; expected failure is old symbol/parameter naming.

- [ ] **Step 3: Implement the minimal code**

Rename interfaces and local variables only; do not alter repository queries, response shape, or route names.

- [ ] **Step 4: Run the test and confirm it passes**

Run targeted tests and `npx tsc --noEmit -p server/tsconfig.json --pretty false`.

- [ ] **Step 5: Refactor only after green**

Search for remaining read-side `Command` names and update only confirmed CQRS misnomers.

### Task 4: Remove confirmed dead production schema surface

**Files:**

- Modify: `server/src/modules/users/adapters/controllers/schemas/user.schema.ts`
- Modify: `server/src/modules/users/adapters/controllers/user.controller.ts` if named schemas are wired instead
- Test: `server/src/modules/users/adapters/controllers/schemas/user.schema.test.ts`

**Parallelization:**

- Can run with: Task 1, Task 3, Task 5
- Must wait for: none
- Race risk: low; avoid editing same user schema lines as Task 3 simultaneously

- [ ] **Step 0: Load the TDD discipline**

This is a small production cleanup; use TDD and preserve schema test coverage.

- [ ] **Step 1: Write the failing test**

Add/update a usage assertion so the runtime controller response is covered by one canonical schema.

- [ ] **Step 2: Run the test and confirm it fails for the expected reason**

Run the schema/controller test and confirm the canonical schema is not currently wired or the duplicate export is referenced only by tests.

- [ ] **Step 3: Implement the minimal code**

Either wire the named schemas into the controller or remove duplicate exports and obsolete test-only assertions. Prefer one canonical runtime declaration.

- [ ] **Step 4: Run the test and confirm it passes**

Run schema tests and the users controller test.

- [ ] **Step 5: Refactor only after green**

Run `rg` to ensure no production dead export remains.

### Task 5: Flatten nested user validation

**Files:**

- Modify: `server/src/modules/users/applications/usecases/update-user.usecase.ts`
- Test: `server/src/modules/users/applications/usecases/update-user.usecase.test.ts`

**Parallelization:**

- Can run with: Task 4
- Must wait for: none
- Race risk: same user test/schema area as Task 3; coordinate before editing shared files

- [ ] **Step 0: Load the TDD discipline**

Use `superpowers:test-driven-development` before editing production code.

- [ ] **Step 1: Write the failing test**

Ensure duplicate ID, self role/status update, empty update, and normal update cases are explicitly covered.

- [ ] **Step 2: Run the test and confirm it fails for the expected reason**

Run the targeted update-user test; expected failure should be from the new helper/contract if a test is added for it.

- [ ] **Step 3: Implement the minimal code**

Extract a named assertion/helper for student/staff ID uniqueness and keep the same error classes/messages and repository call order.

- [ ] **Step 4: Run the test and confirm it passes**

Run the same test file.

- [ ] **Step 5: Refactor only after green**

Keep the usecase as a readable guard sequence; do not introduce a generic validation framework.

### Task 6: Repository-wide verification and architecture audit

**Files:**

- Modify: none unless verification exposes a regression
- Test: existing backend unit, integration, and security suites

**Parallelization:**

- Can run with: none
- Must wait for: Tasks 1-5
- Race risk: shared test database/environment and generated artifacts

- [ ] **Step 0: Load the TDD discipline**

This is verification-only; no production edit should begin in this task without returning to the relevant task's TDD loop.

- [ ] **Step 1: Write the failing test**

Use the existing regression suites as the behavior baseline; add a regression test only if a changed path lacks coverage.

- [ ] **Step 2: Run the test and confirm it fails for the expected reason**

Run targeted suites first and record failures by task, not as unrelated cleanup.

- [ ] **Step 3: Implement the minimal code**

Only fix regressions caused by Tasks 1-5; do not expand scope.

- [ ] **Step 4: Run the test and confirm it passes**

Run:

```powershell
npx tsc --noEmit -p server/tsconfig.json --pretty false
npm run test:unit
npm run test:integration
npx oxlint server/src
```

- [ ] **Step 5: Refactor only after green**

Run final searches:

```powershell
rg -n 'from .*catalog/applications/ports/audit|I(GetBook|FindUser)Command|execute\(\{ command' server/src/modules
```

Confirm API/security tests and git diff show no behavior or endpoint changes.
