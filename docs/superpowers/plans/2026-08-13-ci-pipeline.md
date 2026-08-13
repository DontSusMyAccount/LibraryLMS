# GitHub Actions CI Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** สร้าง `.github/workflows/ci.yml` ให้ทุก PR และ push ไป main ผ่าน fast-checks (lint/format/typecheck/unit/security/web) + db-tests (integration/e2e กับ Postgres จริงใน service container)

**Estimated tasks:** 2 | **Estimated time:** ~30 min | **Touches:** Config (GitHub Actions) — ไม่แตะ production code

## Current Problem / Current Solution

ปัจจุบัน repo ไม่มี CI เลย (`no .github/workflows`) — ทุกอย่าง verify ด้วยมือตอน dev (รัน test:unit/security/web/integration/e2e ในเครื่อง) ไม่มีอะไรกันของพังเข้าสู่ branch/PR และไม่มีหลักฐานว่า merge แล้วไม่พัง

## Proposed Approach

สร้าง GitHub Actions workflow ไฟล์เดียว 2 jobs ทำงาน parallel:

1. **fast-checks** — `oxlint .` → `prettier --check .` → `tsc --noEmit` → `test:unit` → `test:security` → vitest web (ไม่ต้องใช้ DB)
2. **db-tests** — service container `postgres:16` → สร้าง `.env.e2e` ชั่วคราว → `db:push` (migrate) → `db:seed` → `test:integration` → `test:e2e` (Playwright chromium `--with-deps`) + upload artifact เมื่อ fail

Trigger: `pull_request` + `push` เฉพาะ `main`. ตาม spec `docs/superpowers/specs/2026-08-13-ci-pipeline-design.md`

## Side by Side

| Scenario | Before | After |
| -------- | ------ | ----- |
| เปิด PR | ไม่มีการตรวจสอบอัตโนมัติ | ทั้ง 2 jobs รันอัตโนมัติ ตัดสินผ่าน/ไม่ผ่าน |
| push ไป main | ต้อง dev verify เอง | CI ตรวจทุกชั้น ก่อน merge |
| e2e พังใน CI | — | upload screenshot/trace ไว้ debug |

## Assumptions & Risks

- **Assumed:** `bun run db:push` + `db:seed` รันสำเร็จบน Postgres 16 container ที่ว่าง (seed ใช้ `drizzle-kit push` ซึ่งสร้าง schema เต็ม — เหมือนที่ dev ใช้กับ Neon)
- **Assumed:** `bun run dev` (webServer ของ Playwright) boot ได้ใน CI ด้วย env ชุดเดียวกับที่ระบุ (DATABASE_URL + AUTH_SECRET + INTERNAL_SECRET hardcode) — `parseEnv` ผ่านแน่เพราะความยาวครบ
- **Assumed:** `oxlint`/`prettier`/`tsc` ผ่านทั้ง repo (verify ผ่าน local ก่อน push)
- **Risk:** Workflow ที่เขียนผิด syntax ไม่มีทางรู้จนกว่าจะ push ขึ้น GitHub — ลดด้วยการตรวจ YAML + ทวน spec ให้ตรงก่อน push
- **Risk:** e2e อาจ flake บน runner (เคยเจอ reservation flake) — มี retries: 0 ใน config; ถ้าพังซ้ำต้องดู artifact ไม่ใช่ทิ้ง workflow
- **Risk:** branch `dev-ohm` ยังไม่ถูก force-push (SHA เปลี่ยนหลัง rewrite commit titles) — workflow จะ "มีผล" เฉพาะเมื่อ push ขึ้น origin แล้ว

## Impact

- ทุก PR/main push ได้รับการตรวจ 6+ ชั้นอัตโนมัติ (lint, format, typecheck, unit 345, security 28, web 169)
- integration (4 suites) + e2e (26) รันบน Postgres จริงใน CI — ครอบ bug ที่ unit test จับไม่ได้
- ไม่มีไฟล์ production code เปลี่ยน — ไม่กระทบ runtime/dev
- เพิ่ม dependency: `actions/checkout@v4`, `oven-sh/setup-bun@v2`, `actions/upload-artifact@v4` (official actions เท่านั้น)

---

## Task Overview

> **For implementation tasks:** REQUIRED SUB-SKILL: Use superpowers:test-driven-development before editing production code. Each task is a RED -> GREEN -> REFACTOR slice.
> **Parallel-first:** Spawn separate sub-agents for independent lanes. Do not parallelize tasks that can race on the same files, migrations, generated artifacts, or shared state.

1. **[Write ci.yml workflow]** - Lane A | Can run together: none (ไฟล์เดียว, task ถัดไปต้องรอ) | Must wait for: none | TDD slice: N/A (config-only) -> เขียน workflow ตาม spec -> verify YAML + ทวนขั้นตอนตรง spec
2. **[Verify command set locally]** - Sequential | Can run together: none | Must wait for: Task 1 | TDD slice: N/A (config-only) -> รันชุดคำสั่ง fast-checks บน local -> ทุกคำสั่งผ่าน; db-tests พิสูจน์บน GitHub หลัง push

---

### Task 1: เขียน `.github/workflows/ci.yml`

**Files:**

- Create: `.github/workflows/ci.yml`

**Parallelization:**

- Can run with: `none` (งานชิ้นเดียวของ task นี้)
- Must wait for: `none`
- Race risk: `none` (ไฟล์ใหม่ ยังไม่มีใครแตะ)

- [ ] **Step 0: โหลด TDD discipline**

Task นี้เป็น **docs/config-only** — ไม่มี behavior test ที่เหมาะสม (workflow มีผลเมื่อ push ขึ้น GitHub เท่านั้น) การ verify ที่เล็กสุด: parse YAML ให้ผ่าน + ทวนโครงสร้างตรงกับ spec ทุกข้อ

- [ ] **Step 1: เขียน workflow**

สร้าง `.github/workflows/ci.yml` ตาม spec `2026-08-13-ci-pipeline-design.md` ครบทุกข้อ:

```yaml
name: CI

on:
  pull_request:
  push:
    branches: [main]

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

permissions:
  contents: read

jobs:
  fast-checks:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
        with:
          cache: true
      - run: bun install
      - run: bunx oxlint .
      - run: bunx prettier --check .
      - run: bunx tsc --noEmit
      - run: bun run test:unit
      - run: bun run test:security
      - run: bunx vitest run --config vitest.web.config.ts

  db-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: library_lms
        ports:
          - 5432:5432
        options: >-
          --health-cmd "pg_isready -U postgres"
          --health-interval 5s --health-timeout 5s --health-retries 10
    env:
      DATABASE_URL: postgresql://postgres:postgres@localhost:5432/library_lms
      AUTH_SECRET: ci-only-auth-secret-0123456789abcdef
      INTERNAL_SECRET: ci-internal-secret-0123456789
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
        with:
          cache: true
      - run: bun install
      - run: bunx playwright install chromium --with-deps
      - name: Create .env.e2e
        run: echo "DATABASE_URL=${{ env.DATABASE_URL }}" > .env.e2e
      - run: bun run db:push
      - run: bun run db:seed
      - run: bun run test:integration
      - run: bun run test:e2e
      - name: Upload Playwright artifacts
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: test-results/
          retention-days: 7
```

หมายเหตุ: AUTH_SECRET 40 chars (ผ่าน min 32), INTERNAL_SECRET 28 chars (ผ่าน min 16) — hardcode ตาม spec เพราะ CI DB สะอาดทุก run ค่าคงที่ไม่มีผล

- [ ] **Step 2: Verify YAML ผ่าน**

```powershell
python -c "import yaml,sys; yaml.safe_load(open('.github/workflows/ci.yml', encoding='utf-8')); print('YAML OK')"
```

Expected: `YAML OK` — ถ้าเครื่องไม่มี PyYAML ใช้ `bunx yaml-lint` หรือเปิดด้วย node ตรวจ syntax ก็ได้

- [ ] **Step 3: ทวนตรง spec**

ไล่ checklist เทียบ `docs/superpowers/specs/2026-08-13-ci-pipeline-design.md`:
- [ ] trigger = `pull_request` + `push: branches: [main]`
- [ ] fast-checks 8 steps ครบ (checkout, setup-bun, install, oxlint, prettier, tsc, unit, security, web)
- [ ] db-tests: postgres:16 service + health check ครบ
- [ ] env: DATABASE_URL/AUTH_SECRET/INTERNAL_SECRET ตรง spec
- [ ] ลำดับ db-tests = .env.e2e → db:push → db:seed → integration → e2e
- [ ] playwright `--with-deps` + upload artifact `if: failure()`
- [ ] concurrency + `permissions: contents: read`

Expected: tick ครบทุกข้อ

- [ ] **Step 4: ไม่ commit/push ใน task นี้**

แผนนี้ไม่สั่ง commit/push — worker สร้างแค่ไฟล์ workflow แล้วรายงานกลับ (ขั้นตอน commit/push เป็นของผู้ใช้ หรือ task แยกที่ user อนุมัติ)

---

### Task 2: Verify ชุดคำสั่ง fast-checks บน local

**Files:**

- ไม่มีไฟล์เปลี่ยน — รันคำสั่งเพื่อพิสูจน์ว่า command set ใน workflow ผ่านจริงก่อน push ขึ้น CI

**Parallelization:**

- Can run with: `none`
- Must wait for: `Task 1`
- Race risk: `none` (read-only)

- [ ] **Step 0: เหตุผลที่ไม่มี TDD**

config-only verification — เป้าหมายคือพิสูจน์ว่า command ที่ workflow รัน ผ่านบนเครื่อง dev (ลดความเสี่ยง CI แดงเพราะ env ต่าง)

- [ ] **Step 1: รัน lint/format/typecheck**

```powershell
bunx oxlint .
bunx prettier --check .
bunx tsc --noEmit
```

Expected: ทั้ง 3 ผ่าน (oxlint อาจมี warning เดิมที่ไม่ error — บันทึกไว้ในรายงาน)

- [ ] **Step 2: รัน unit/security/web**

```powershell
bun run test:unit
bun run test:security
bunx vitest run --config vitest.web.config.ts
```

Expected: unit 345 passed, security 28 passed, web 169 passed (จำนวนตรง local ปกติ)

- [ ] **Step 3: บันทึกผล**

รายงานจำนวน tests ผ่าน/จำนวน warning ของ oxlint ลงในผลลัพธ์ task — ใช้เป็น baseline เทียบกับ CI report หลัง push

หมายเหตุ: db-tests lane (integration/e2e) พิสูจน์ได้เต็มที่เฉพาะบน GitHub (ต้องมี postgres container + playwright deps) — ส่วนนี้คือ blocker ที่ต้องรอ push/PR จึงจะ confirm สมบูรณ์

---
