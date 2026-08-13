# Architecture Boundary Enforcement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** บังคับขอบเขตสถาปัตยกรรมด้วย dependency-cruiser (5 กฎ forbidden) ทั้ง pre-commit + CI + ทำโค้ดปัจจุบันให้ผ่านกฎ

**Estimated tasks:** 4 | **Estimated time:** ~60 min | **Touches:** Config (`dependency-cruiser.js`, package.json, lefthook.yml, ci.yml) + app/ code fix (ย้าย shared utils/types)

## Current Problem / Current Solution

Repo ยังไม่มี enforcement ด้านสถาปัตยกรรม — import ผิดทิศทางไม่มีใครจับ ปัจจุบันมี cross-feature imports อยู่ใน `app/features/` จริง (เจอแล้ว 5+ จุด) และไม่มี config กัน `app/` import ตรงจาก server internals (มี alias `@/server/*` เปิดไว้ใน tsconfig)

## Proposed Approach

สร้าง `.dependency-cruiser.js` 5 กฎ forbidden (ตาม spec `2026-08-13-boundary-enforcement-design.md`):
1. `domains/**` ห้าม import → modules/infrastructure/libs
2. `infrastructure/**` ห้าม import → modules
3. `app/**` ห้าม import → server/src (ยกเว้น shared.ts)
4. `app/**` ห้าม import → `@/server/*` alias
5. `app/features/x/**` ห้าม import → `app/features/y/**` (x≠y) — แชร์ผ่าน `_shared` เท่านั้น

แล้วแก้โค้ดปัจจุบันที่ฝ่ากฎ #5 ให้ผ่าน (RED → GREEN) ก่อน integrate เข้า lefthook + CI

## Side by Side

| Scenario | Before | After |
| -------- | ------ | ----- |
| `book-detail.store.ts` import จาก `my-reservations` | ผ่าน (ไม่มีใครจับ) | depcruise fail — ต้องย้าย shared code ไป `_shared` |
| `app/features/x` import `@/server/...` | ผ่าน | fail (กฎ #3/#4) |
| commit ที่ฝ่ากฎ | เข้า repo ได้ | pre-commit block |

## Assumptions & Risks

- **Assumed:** violations #5 ทั้งหมดแก้ได้โดยย้าย shared types/helpers ไป `app/_shared/` โดยไม่เปลี่ยน behavior (type-only + pure function — เห็นจากโค้ดตรง)
- **Assumed:** `search → catalog` เป็น business dependency ธรรมชาติ (search ต้องเห็นหนังสือของ catalog) — ใช้ allowlist ในกฎ 5 แทนการย้ายโค้ด
- **Assumed:** depcruise resolve alias `@/` + `@libsys/shared` ผ่าน `options.tsConfig.fileName` ได้ (documented behavior ของ depcruise)
- **Risk:** depcruise บน Windows อ่าน path ต่างจาก Linux (CI) — verify ทั้งบน local + CI ใช้ path pattern เดียวกัน (`server/src/**` ไม่ใช่ `**`)
- **Risk:** กฎ #5 เขียนถูกต้องยาก (ต้อง exclude `_shared`) — ใช้ `pathNot` ให้ชัด + ทดสอบด้วย import ผิดทิศทางชั่วคราวก่อนสรุป
- **Risk:** ถอด `eslint-plugin-boundaries` จาก dependencies ต้องแก้ `bun.lock` พร้อมกัน (รัน `bun install`) — อย่าใช้ npm (จะสร้าง package-lock.json ใหม่)

## Impact

- ทุก commit และทุก PR/main push ตรวจ architectural boundaries อัตโนมัติ
- โค้ดปัจจุบันสะอาด: shared types (MyReservationItem) + date formatter ย้ายไป `_shared`, search ใช้ allowlist
- ไม่กระทบ runtime/dev flow (config-only + type/pure-function moves)
- package.json สะอาด: depcruise ใน devDependencies, ไม่มี eslint-plugin-boundaries ตาย, ไม่มี package-lock.json

---

## Task Overview

> **For implementation tasks:** REQUIRED SUB-SKILL: Use superpowers:test-driven-development before editing production code. Each task is a RED -> GREEN -> REFACTOR slice.
> **Parallel-first:** Spawn separate sub-agents for independent lanes. Do not parallelize tasks that can race on the same files, migrations, generated artifacts, or shared state.

1. **[Write .dependency-cruiser.js]** - Lane A | Can run together: [Task 4 (deps cleanup — คนละไฟล์)] | Must wait for: none | TDD slice: N/A (config-only) -> เขียน config 5 กฎ -> `bunx depcruise` รายงาน RED จริง
2. **[Fix app/ boundary violations]** - Lane B | Can run together: none (แตะไฟล์เดียวกับ verify ของ Task 1) | Must wait for: Task 1 | TDD slice: depcruise fail (RED) -> ย้าย shared code ไป `_shared` + allowlist -> depcruise pass (GREEN)
3. **[Integrate lefthook + CI + script]** - Lane C | Can run together: [Task 4] | Must wait for: Task 2 (ต้อง GREEN ก่อนใส่ hook) | TDD slice: N/A (config-only) -> เพิ่ม script/hook/CI step -> รัน `bun run depcruise:check` exit 0
4. **[Cleanup deps]** - Lane D | Can run together: [Task 1, Task 3] | Must wait for: none | TDD slice: N/A (config-only) -> ย้าย devDep + ถอด plugin + ลบ package-lock.json -> `bun install` + lock ผ่าน

---
**หมายเหตุ:** Task 1 กับ Task 2 มี race บนไฟล์ app/ ระหว่าง depcruise report (read-only) กับ code fix — ปลอดภัยเพราะ task 2 รอ task 1 finish ก่อน ลำดับบังคับให้ทำตามนี้

### Task 1: เขียน `.dependency-cruiser.js` + พิสูจน์ RED

**Files:**

- Create: `.dependency-cruiser.js`

**Parallelization:**

- Can run with: `Task 4` (คนละไฟล์ — .dependency-cruiser.js vs package.json/bun.lock)
- Must wait for: `none`
- Race risk: `none`

- [ ] **Step 0: เหตุผลที่ไม่มี TDD**

config-only — ไม่มี behavior test ที่เหมาะสม; verification คือ depcruise รายงาน violation ของโค้ดจริง (RED) แล้ว → ผ่าน (GREEN) ใน Task 2

- [ ] **Step 1: เขียน config**

สร้าง `.dependency-cruiser.js` ตาม spec ครบ 5 กฎ forbidden:

```js
/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: "domains-must-stay-pure",
      severity: "error",
      comment: "domains ต้องไม่ import modules/infrastructure/libs — core ต้อง pure",
      from: { path: "^server/src/domains" },
      to: { path: "^(server/src/modules|server/src/infrastructure|server/src/libs)" },
    },
    {
      name: "infra-not-touch-app-layer",
      severity: "error",
      comment: "infrastructure ต้องไม่ import modules (application layer)",
      from: { path: "^server/src/infrastructure" },
      to: { path: "^server/src/modules" },
    },
    {
      name: "app-not-import-server",
      severity: "error",
      comment: "frontend ผ่าน API/proxy เท่านั้น — ห้าม import server internals (ยกเว้น shared.ts)",
      from: { path: "^app" },
      to: { path: "^server/src", pathNot: "^server/src/shared\\.ts$" },
    },
    {
      name: "app-not-import-server-alias",
      severity: "error",
      comment: "ปิดช่องโหว่ alias @/server/* (resolve เป็น server/*)",
      from: { path: "^app" },
      to: { path: "^server" },
    },
    {
      name: "features-not-cross-import",
      severity: "error",
      comment: "features ต้องไม่ import ข้ามกัน — แชร์ผ่าน app/_shared เท่านั้น (ยกเว้น allowlist)",
      from: { path: "^app/features/([^/]+)" },
      to: {
        path: "^app/features/([^/]+)",
        pathNot: "^app/_shared",
      },
    },
  ],
  options: {
    tsConfig: { fileName: "tsconfig.json" },
    doNotFollow: { path: "node_modules" },
    exclude: {
      path: "(\\.test\\.ts$|\\.spec\\.ts$|_tailadmin_ref|\.superpowers|\\.next|dist|coverage|e2e)",
    },
    reporterOptions: {
      text: { highlightFocused: true },
    },
  },
};
```

หมายเหตุ: allowlist สำหรับ `search → catalog` และ `book-detail → my-reservations` จะเพิ่มใน Task 2 หลังเห็น RED report จริง (pathNot แบบเจาะจง)

- [ ] **Step 2: รัน depcruise และบันทึก RED**

```powershell
bunx depcruise app server/src --config .dependency-cruiser.js
```

Expected: exit ≠ 0 + รายงาน violation — คาดว่าจะเจอ (จากที่ grep ไว้):
- `book-detail/*` → `my-reservations` (MyReservationItem, 4 จุด)
- `book-detail/store.ts` → `circulation/circulation.format` (formatThaiDate)
- `search/store.ts*` → `catalog` (fetchBooks/fetchCategories/types, 3 จุด)

**บันทึกรายการ violation ครบลงในผลลัพธ์ task** — เป็น input ของ Task 2

- [ ] **Step 3: ตรวจว่าไม่มีกฎเกินจริง (false positive)**

ไล่รายการ RED: ทุกกฎที่ fail ต้องเป็นทิศทางที่ spec ตั้งใจจะกันจริง ไม่ใช่เพราะ path pattern ผิด — ถ้าเจอ false positive ให้ปรับ regex แล้ว rerun

- [ ] **Step 4: ไม่ commit/push ใน task นี้** (แผนเป็นผู้จัดการขั้น commit)

---

### Task 2: แก้ app/ boundary violations → GREEN

**Files:**

- Modify: `app/features/book-detail/book-detail.types.ts` (import path)
- Modify: `app/features/book-detail/actions/book-detail.action.ts`
- Modify: `app/features/book-detail/stores/book-detail.store.ts` (2 import)
- Modify: `app/features/book-detail/stores/book-detail.store.test.ts`
- Modify: `app/features/search/stores/search.store.ts` + `search.store.test.ts` (ถ้า allowlist ไม่ครอบ)
- Create: `app/_shared/types/reservation-item.ts` (ย้าย `MyReservationItem`)
- Create: `app/_shared/lib/format-thai.ts` (ย้าย formatThaiDate และพี่น้อง)
- Create / Modify: `app/_shared/index.ts` (ถ้ามี pattern อยู่แล้ว — เช็คก่อน)
- Modify: `.dependency-cruiser.js` (เพิ่ม allowlist ถ้าจำเป็น)

**Parallelization:**

- Can run with: `none` (ต้องดู RED report ของ Task 1 ครบก่อน)
- Must wait for: `Task 1`
- Race risk: `app/_shared/` อาจมีไฟล์แชร์กับ task อื่น — ไม่มี task อื่นแตะ (low)

- [ ] **Step 0: โหลด TDD discipline**

Task นี้มี RED → GREEN ที่วัดได้จริง: depcruise fail (RED) → แก้ → depcruise pass (GREEN)

- [ ] **Step 1: RED — ยืนยัน depcruise fail**

```powershell
bunx depcruise app server/src --config .dependency-cruiser.js
```

Expected: fail (ตาม Task 1) — นี่คือ failing "test"

- [ ] **Step 2: ย้าย shared types ไป `_shared`**

- สร้าง `app/_shared/types/reservation-item.ts`: `export interface MyReservationItem {...}` (คัดลอกจาก `my-reservations/my-reservations.types.ts`)
- `my-reservations.types.ts`: re-export จาก `_shared` (เก็บ API เดิมไว้ กัน import อื่นพัง)
- อัปเดต import ใน `book-detail/*` ทั้ง 4 จุด → `@/app/_shared/types/reservation-item`

เช็คก่อน: `app/_shared/` มีโครงสร้าง types/lib แยกอยู่แล้วหรือยัง (เดี๋ยวทำตาม pattern ที่มี)

- [ ] **Step 3: ย้าย date formatter ไป `_shared`**

- สร้าง `app/_shared/lib/format-thai.ts`: formatThaiDate + formatThaiShortDate + formatBath (คัดลอกจาก `circulation/circulation.format.ts`)
- `circulation/circulation.format.ts`: re-export (กันตัวอื่นพัง — grep หา consumer ก่อน)
- อัปเดต import ใน `book-detail/store.ts` → `_shared`

- [ ] **Step 4: ตัดสินใจ allowlist สำหรับ business dependencies**

- `search` ← `catalog`: dependency ธรรมชาติ (search ต้องเห็นหนังสือ) → **allowlist** ในกฎ #5:
  ```js
  pathNot: "^app/_shared|^app/features/(catalog|my-reservations)" // ขยายตาม RED report
  ```
  (ย้ายเฉพาะ type/helper ที่ reuse ได้ ไม่ย้าย business logic ของคนอื่น)
- อันไหนที่ย้ายได้เป็น shared code → ย้าย (Step 2/3)
- อันไหนเป็น business coupling จริง → allowlist เจาะจงคู่

- [ ] **Step 5: GREEN — depcruise ผ่าน**

```powershell
bunx depcruise app server/src --config .dependency-cruiser.js; echo "exit: $LASTEXITCODE"
```

Expected: exit 0 — ทุก violation หาย

- [ ] **Step 6: verify behavior ไม่เปลี่ยน**

```powershell
bun run test:unit
bunx vitest run --config vitest.web.config.ts
```

Expected: ผ่านครบ (345 + 169) — proof ว่าการย้ายเป็น pure move (type + helper) ไม่พัง behavior

- [ ] **Step 7: Refactor — ทวนว่า re-export ไม่ทิ้งขยะ**

`my-reservations.types.ts` / `circulation.format.ts` เก็บ re-export ไว้เฉพาะถ้ายังมี consumer อยู่ (grep) — ถ้าไม่มี consumer เหลือ ให้แก้ import ตรงๆ แล้วลบไฟล์เดิม (ถามผู้ใช้ถ้าไม่ชัวร์)

---

### Task 3: Integrate script + lefthook + CI

**Files:**

- Modify: `package.json` (script `depcruise:check`)
- Modify: `lefthook.yml` (pre-commit command)
- Modify: `.github/workflows/ci.yml` (fast-checks job step)

**Parallelization:**

- Can run with: `Task 4` (package.json แตะร่วม — race! → ทำ sequential กับ Task 4 หลัง Task 4 เสร็จ เพื่อเลี่ยง merge conflict ใน package.json)
- Must wait for: `Task 2`
- Race risk: `package.json` แตะร่วมกับ Task 4 — **ต้องรอ Task 4 เสร็จก่อน** (หรือรวม script เข้ากับ Task 4)

> ปรับ: ถ้า Task 4 (cleanup deps) ยังไม่จบ — ทำ Task 3 ต่อจาก Task 4 ทันทีในลำดับเดียวกัน

- [ ] **Step 0: เหตุผลที่ไม่มี TDD**

config-only — verification คือคำสั่งที่รันผ่านจริง

- [ ] **Step 1: เพิ่ม script ใน package.json**

```json
"depcruise:check": "depcruise app server/src --config .dependency-cruiser.js"
```

- [ ] **Step 2: เพิ่ม pre-commit ใน lefthook.yml**

```yaml
pre-commit:
  parallel: true
  commands:
    lint: ...
    format: ...
    depcruise:  # ← เพิ่ม
      run: bunx depcruise app server/src --config .dependency-cruiser.js
```

- [ ] **Step 3: เพิ่ม step ใน CI (fast-checks job)**

```yaml
- run: bunx oxlint .
- run: bunx depcruise app server/src --config .dependency-cruiser.js   # ← เพิ่มหลัง oxlint
```

- [ ] **Step 4: Verify**

```powershell
bun run depcruise:check
```

Expected: exit 0

---

### Task 4: Cleanup deps (devDependencies + ถอด plugin + ลบ npm artifact)

**Files:**

- Modify: `package.json` (ย้าย dependency-cruiser → devDependencies, ถอด eslint-plugin-boundaries)
- Modify: `bun.lock` (ผ่าน `bun install`)
- Delete: `package-lock.json`

**Parallelization:**

- Can run with: `Task 1`
- Must wait for: `none`
- Race risk: `package.json` แตะร่วมกับ Task 3 — ทำก่อน/หลัง Task 3 อย่างมีลำดับ

- [ ] **Step 0: เหตุผลที่ไม่มี TDD**

config-only (deps management).

- [ ] **Step 1: แก้ package.json**

- ย้าย `"dependency-cruiser": "^18.2.0"` จาก dependencies → devDependencies
- ลบ `"eslint-plugin-boundaries": "^7.2.0"` ออกจาก dependencies
- (สังเกต: dependencies ปัจจุบันถูกเรียง alphabetically อยู่แล้ว หลัง npm install — ใส่ให้ตรงตำแหน่ง)

- [ ] **Step 2: ลบ package-lock.json**

```powershell
Remove-Item package-lock.json
```

- [ ] **Step 3: รัน bun install เพื่อ sync lock**

```powershell
bun install
```

Expected: `bun.lock` อัปเดต ไม่มี warning เกี่ยวกับ package-lock.json

- [ ] **Step 4: Verify**

```powershell
git status --short
```

Expected: `package-lock.json` ไม่โผล่, มีแค่ package.json + bun.lock ที่เปลี่ยน — ตรวจว่าไฟล์ทั้งสองผ่าน prettier (rerun `bunx prettier --check package.json` ถ้าจำเป็น)

---