# Design Spec — Architecture Boundary Enforcement (dependency-cruiser)

วันที่: 2026-08-13
สถานะ: approved (ผ่าน brainstorming: ขอบเขต A+B, เครื่องมือ B, ตำแหน่ง A, ความเข้ม A)

## เป้าหมาย

บังคับขอบเขตสถาปัตยกรรม (architecture boundaries) ของ monorepo LibraryLMS ด้วย
dependency-cruiser — กั้น import ผิดทิศทางทั้งฝั่ง server (hexagonal) และ app (frontend/backend
แยก) ก่อนเข้าสู่โค้ดเบส ผ่าน pre-commit hook + CI

## การตัดสินใจที่ผ่านมา (จาก brainstorming)

| คำถาม | คำตอบ |
|---|---|
| ขอบเขต | enforce ทั้ง server (hexagonal) + app/ (ห้าม import ตรงจาก server internals) |
| เครื่องมือ | `dependency-cruiser` เป็นหลัก (standalone — ไม่ลาก eslint เข้ามาแข่งกับ oxlint) |
| ตำแหน่งรัน | ทั้ง pre-commit (lefthook) + CI (fast-checks job) |
| ความเข้ม | hard fail ทั้งสองที่ (severity: error) |
| eslint-plugin-boundaries | ถอดออกจาก deps (ไม่ได้ใช้ — เลือก depcruise อย่างเดียว) |
| package-lock.json | ลบ (npm artifact — repo ใช้ bun.lock) |
| ตำแหน่ง deps | ย้าย dependency-cruiser ไป devDependencies (ติดตั้งผิดไว้ใน dependencies) |

## สถาปัตยกรรมปัจจุบัน (ที่กฎต้องยึด)

```
server/src/
├── domains/          # core logic (copy/loan/policy/reservation) + errors — pure
├── infrastructure/   # database/schema — ต้องไม่แตะ application layer
├── libs/             # helpers (db, env, http-error, date) — utility กลาง
├── modules/          # 8 modules (auth, catalog, circulation, me, reservations, shared, storage, users) — composition root
├── exports/shared/   # package @libsys/shared → re-export ../../shared.ts
└── shared.ts         # shared types/constants (resolve ผ่าน tsconfig paths)

app/                  # Next.js frontend — features/, _shared/, api/ (proxy)
```

- `@libsys/shared` resolve ผ่าน `tsconfig.json` paths → `server/src/shared.ts` (ไม่ใช่ node_modules symlink)
- tsconfig เปิด alias `@/server/*` → `server/*` ไว้ด้วย — **ต้องปิดช่องโหว่นี้ในกฎ**

## กฎ boundaries (หัวใจของงาน)

ไฟล์: `.dependency-cruiser.js` (root) — 5 กฎ forbidden, severity: error

| # | จาก (from) | ห้าม import ไป (to) | เหตุผล |
|---|---|---|---|
| 1 | `server/src/domains/**` | `server/src/modules/**`, `server/src/infrastructure/**`, `server/src/libs/**` | core ต้อง pure — import ได้แค่ shared.ts + errors + relative ใน domains |
| 2 | `server/src/infrastructure/**` | `server/src/modules/**` | schema ต้องไม่เห็น application layer |
| 3 | `app/**` | `server/src/**` (ทุกอย่าง ยกเว้น shared.ts) | frontend ผ่าน API/proxy เท่านั้น — ไม่เห็น backend internals |
| 4 | `app/**` | `@/server/*` alias (resolve เป็น `server/*`) | ตัดช่องโหว่ alias ที่ tsconfig เปิดไว้ |
| 5 | `app/features/<x>/**` | `app/features/<y>/**` (x ≠ y) | features ต้องไม่ import ข้ามกัน — แชร์ผ่าน `app/_shared/**` เท่านั้น |

**NOT in scope (อนุญาต):**
- `modules/**` → import อะไรก็ได้ใน server (composition root)
- `libs/**` → import อะไรก็ได้ (utility กลาง)
- test files (`*.test.ts`, `*.spec.ts`) → ผ่อนปรน ยกเว้นจากการตรวจ
- e2e (`server/src/e2e/`, `app/e2e/`) → ยกเว้น
- `server/src/exports/**` → re-export เท่านั้น (import อะไรก็ได้ ตาม modules)

**ตัวอย่างกรณีที่กฎจับ:**
- `domains/loan.domain.ts` import จาก `modules/circulation/...` → กฎ #1 fail
- `infrastructure/schema/loans.ts` import จาก `modules/catalog/...` → กฎ #2 fail
- `app/features/catalog/...` import `../circulation/...` หรือ `@/server/src/...` → กฎ #3/#4/#5 fail

## Config — `.dependency-cruiser.js`

- `options.tsConfig.fileName: "tsconfig.json"` — ให้ depcruise resolve alias `@/`, `@libsys/shared`
- `options.doNotFollow: node_modules`
- `options.exclude: ["**/*.test.ts", "**/*.spec.ts", ".next/**", "dist/**", "coverage/**", "_tailadmin_ref/**", ".superpowers/**"]`
- `forbidden`: 5 กฎข้างต้น (`from.path` + `to.pathNot`/`to.path` + `severity: "error"`)
- `allowedSeverity: "error"` — มี violation = exit code 1

## Integration

### package.json

- เพิ่ม script: `"depcruise:check": "depcruise app server/src --config .dependency-cruiser.js"`
- ย้าย `dependency-cruiser@^18.2.0` ไป devDependencies
- ถอด `eslint-plugin-boundaries@^7.2.0` ออกจาก dependencies
- ลบ `package-lock.json` (npm artifact)

### lefthook.yml — เพิ่ม pre-commit command

```yaml
pre-commit:
  commands:
    depcruise:
      run: bunx depcruise app server/src --config .dependency-cruiser.js
```

(ไม่ใช้ glob — ตรวจทั้งโปรเจกต์ทุก commit, ~2-3s)

### CI — `.github/workflows/ci.yml` fast-checks job

เพิ่ม step หลัง `bunx oxlint .`:

```yaml
- run: bunx depcruise app server/src --config .dependency-cruiser.js
```

## ขั้นตอน implementation (config-first, TDD-shaped)

1. เขียน `.dependency-cruiser.js` ตามกฎทั้ง 5 ข้อ
2. รัน `bunx depcruise app server/src --config .dependency-cruiser.js` → **RED**: เจอ violation จริง
   ของโค้ดปัจจุบัน (ถ้ามี) + ตรวจว่าเป็นกฎที่ถูกต้อง
3. แก้โค้ดที่ฝ่ากฎ (ถ้ามี) หรือปรับกฎให้ตรงความจริงของสถาปัตยกรรม (กรณีกฎเกินจริง) → **GREEN**
4. เพิ่ม script + lefthook + CI step
5. verify: `bun run depcruise:check` exit 0

## ไม่อยู่ในขอบเขต (YAGNI)

- ไม่ใช้ `eslint-plugin-boundaries` (ถอดทิ้ง) — ไม่ลาก eslint เข้ามา
- ไม่ตั้งกฎ `allowed` บังคับทิศทางที่อนุญาตทั้งหมด (เช่น modules ห้าม import libs) — กฎ
  forbidden เท่าที่จำเป็น ป้องกันกฎเกินจริงที่ต้องมาแก้ทีหลัง
- ไม่เพิ่ม visual report / HTML output ใน CI (ใช้ text reporter แค่บอก fail/pass)
- ไม่แยก config ต่อ workspace (root config ครอบทั้ง app + server)

## การ verify

- `bun run depcruise:check` → exit 0 (โค้ดปัจจุบันผ่าน หรือแก้จนผ่าน)
- ทดสอบกฎจับจริง: สร้าง import ผิดทิศทางชั่วคราว → depcruise fail → เอาออก → ผ่าน
  (พิสูจน์ว่ากฎทำงาน ไม่ใช่ config เปล่า)
- lefthook pre-commit ทำงาน (commit ผ่าน/โดน block ตามกฎ)
- CI fast-checks มี step depcruise