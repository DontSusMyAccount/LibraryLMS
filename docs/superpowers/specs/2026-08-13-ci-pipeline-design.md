# Design Spec — GitHub Actions CI Pipeline

วันที่: 2026-08-13
สถานะ: approved (ผ่าน brainstorming: การตัดสินใจ B/A/B, แนวทาง 1, Q1–Q4)

## เป้าหมาย

ตั้ง CI pipeline บน GitHub Actions สำหรับ monorepo LibraryLMS เพื่อให้ทุก PR และ push ไป main
ผ่านการตรวจสอบอัตโนมัติครบทุกชั้น ก่อน merge

## การตัดสินใจที่ผ่านมา (จาก brainstorming)

| คำถาม | คำตอบ |
|---|---|
| ขอบเขต CI | ทั้ง 3 ชั้น — lint/typecheck + unit/security/web + integration/e2e กับ Postgres จริง |
| Postgres ใน CI | service container `postgres:16` (ไม่ใช้ Neon — ไม่ต้องตั้ง secrets, DB สะอาดทุก run) |
| Trigger | `pull_request` + `push` เฉพาะ branch `main` |
| โครงสร้าง | 2 jobs parallel — `fast-checks` (ไม่ต้อง DB) + `db-tests` (ต้อง DB) |
| Playwright browser | `bunx playwright install chromium --with-deps` |
| AUTH_SECRET / INTERNAL_SECRET | hardcode ค่าคงที่ใน workflow (CI DB แยกทุกครั้ง — ค่าคงที่ไม่มีผล) |
| e2e artifact | เก็บ `test-results/` เมื่อ job fail (action `actions/upload-artifact`, `if: failure`) |
| typecheck | `bunx tsc --noEmit` ตัว root เพียงตัวเดียว |

## สถาปัตยกรรม

ไฟล์เดียว: `.github/workflows/ci.yml` (สร้างใหม่)

### Trigger

```yaml
on:
  pull_request:
  push:
    branches: [main]
```

### ข้อจำกัดที่พบจากโค้ด (เหตุผลของแต่ละขั้นตอน)

1. `server/src/e2e/fixtures.ts` **require `.env.e2e`** — throw ถ้าไม่มีไฟล์
   → job db-tests ต้องสร้าง `.env.e2e` ก่อนรัน e2e
2. `parseEnv()` (server/src/libs/env.ts) **throw ถ้าขาด** `DATABASE_URL`, `AUTH_SECRET` (≥32),
   `INTERNAL_SECRET` (≥16) — job ต้องส่ง env ครบตอน boot server/worker
3. Integration tests (`server/src/__tests__/integration/setup.ts`) **ไม่ migrate เอง** และ
   ต้องการ admin user `admin@library.local` (จาก `server/src/seed.ts`)
   → ลำดับต้องเป็น **migrate → seed → test**
4. `parseEnv` รับ `STORAGE_DRIVER`/`R2_*` เป็น optional — ไม่ตั้ง R2 จะ fallback เป็น
   storage driver `local` (เขียน uploads/ ที่ gitignore) → CI ไม่ต้องตั้ง R2 ใดๆ

## Job: fast-checks (ไม่ต้องใช้ Postgres)

Steps (เรียงลำดับ):

1. `actions/checkout@v4`
2. `oven-sh/setup-bun@v2` — `cache: true` (cache deps ผ่าน `~/.bun/install/cache`),
   ตามด้วย `bun install`
3. `bunx oxlint .` — lint ทั้ง repo (ตรงกับ lefthook แต่ไม่จำกัดแค่ staged)
4. `bunx prettier --check .` — format check ทั้ง repo
5. `bunx tsc --noEmit` — typecheck (root tsconfig ตัวเดียว)
6. `bun run test:unit` — vitest server unit (`vitest.config.ts`), 345 tests
7. `bun run test:security` — vitest security, 28 tests
8. `bunx vitest run --config vitest.web.config.ts` — vitest web, 169 tests

## Job: db-tests (ต้องใช้ Postgres)

### Service container

```yaml
services:
  postgres:
    image: postgres:16
    env:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: library_lms
    ports: ["5432:5432"]
    options: >-
      --health-cmd "pg_isready -U postgres"
      --health-interval 5s --health-timeout 5s --health-retries 10
```

### Job-level env

```yaml
env:
  DATABASE_URL: postgresql://postgres:postgres@localhost:5432/library_lms
  AUTH_SECRET: ci-only-auth-secret-0123456789abcdef   # 40 chars (ผ่าน min 32)
  INTERNAL_SECRET: ci-internal-secret-0123456789       # 28 chars (ผ่าน min 16)
```

### Steps (เรียงลำดับ — migrate ก่อน seed ก่อน test)

1. `actions/checkout@v4`
2. `oven-sh/setup-bun@v2` (`cache: true`) + `bun install`
3. `bunx playwright install chromium --with-deps` — browser + OS deps
4. สร้าง `.env.e2e` สำหรับ e2e fixture:
   ```yaml
   - name: Create .env.e2e
     run: echo "DATABASE_URL=${{ env.DATABASE_URL }}" > .env.e2e
   ```
5. `bun run db:push` — migrate schema ลง Postgres (สร้างตารางทั้งหมด)
6. `bun run db:seed` — seed admin@library.local + policies (ต้องรันก่อน integration tests)
7. `bun run test:integration` — vitest integration (`vitest.integration.config.ts`,
   fileParallelism: false — ข้อมูลแชร์ DB จริง)
8. `bun run test:e2e` — Playwright (webServer: `bun run dev` ครอบ web + api,
   globalSetup seed fixtures ผ่าน `.env.e2e` ที่สร้างไว้)

### Artifact เมื่อ fail

```yaml
- name: Upload Playwright artifacts
  if: failure()
  uses: actions/upload-artifact@v4
  with:
    name: playwright-report
    path: test-results/
    retention-days: 7
```

(`playwright.config.ts` ตั้ง screenshot + trace `retain-on-failure` อยู่แล้ว — artifact นี้
ช่วย debug เฉพาะกรณี e2e พัง)

## รายละเอียดย่อยร่วมทั้ง 2 jobs

- `concurrency`: `ci-${{ github.ref }}` + `cancel-in-progress: true` — push ใหม่ตัดการรันเก่า
- `permissions: contents: read` — งานนี้ไม่ต้องเขียน repo
- ไม่ pin version ของ bun/runner เฉพาะ — ใช้ default ของ `setup-bun` และ runner ล่าสุด

## ไม่อยู่ในขอบเขต (YAGNI)

- ไม่มี deploy step (ยังไม่มี production env)
- ไม่มี cache ของ Playwright browser แยก (ใช้ `--with-deps` ธรรมดา)
- ไม่ test บน matrix ของ OS/browser (Windows/Linux, firefox/webkit) — ใช้ chromium บน
  ubuntu-latest เท่านั้น ตามการใช้งาน dev จริง
- ไม่มี badge ใน README
- ยังไม่มี secrets ที่ต้องตั้งบน GitHub (ค่าทั้งหมด hardcode/จาก service container)

## การ verify

- Push workflow → รันบน GitHub → ทั้ง 2 jobs ต้องผ่าน (fast-checks + db-tests พร้อมกัน)
- ยืนยันจำนวน test ที่รายงานตรงกับ local (unit 345, security 28, web 169, e2e 26)