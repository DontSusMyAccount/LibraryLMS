# Library LMS — Admin Backoffice Design Spec

> วันที่: 2026-08-10 · โปรเจค: `library-lms` · แพ็กเกจ shared: `@libsys/shared`
> เอกสารนี้เป็นผลจาก brainstorming: ออกแบบฝั่ง admin backoffice ของระบบยืม-คืนหนังสือ
> สถานศึกษา (Library LMS) โดยอ้างอิง `design.md` (design system) และ
> `library-system-requirements.md` (requirements + schema)

---

## 1. บทสรุป (Summary)

พัฒนา **ฝั่ง admin backoffice** ของระบบยืม-คืนหนังสือห้องสมุดสถานศึกษา จำนวน **5 หน้าจอ**:

1. **Login** — เข้าสู่ระบบ (HttpOnly cookie session)
2. **Dashboard** — ภาพรวม: KPI ยืม/คืน, ค้างส่ง, คิวจอง, ค่าปรับ + chart + ตาราง + mini calendar
3. **Catalog** — จัดการหนังสือ/สำเนา/หมวดหมู่ + อัปโหลดรูปปก (Cloudflare R2)
4. **Circulation desk** — หน้ายืม-คืน: สแกน/ค้นหา, ต่ออายุ, recall, สแตมป์ due-date
5. **Reservations** — จัดการคิวจอง (hold queue แบบ FIFO)

สร้างเป็น **monorepo เดียว** ตาม template CWIE (hexagonal + Drizzle) โดย frontend เรียก
backend ผ่าน proxy `/api/backend/*` เท่านั้น ใช้ **ภาษาไทยล้วน** ใน UI ทั้งหมด

---

## 2. ขอบเขต (Scope)

### 2.1 ในขอบเขต (In Scope)

- Monorepo `library-lms`: root `package.json` เดียว (ไม่ใช้ workspace ย่อย) ตาม template
- Backend ElysiaJS แบบ hexagonal เต็มรูปแบบ + Drizzle ORM (PostgreSQL)
- 5 หน้าจอข้างต้น + backend API ที่จำเป็น
- Auth: NextAuth v5 (Credentials) + session ใน **HttpOnly cookie** + proxy headers
- Storage: อัปโหลด/แสดงรูปปกหนังสือผ่าน **Cloudflare R2** (S3-compatible)
- ภาษาไทยล้วนใน UI ทุกจุด
- Design ตาม `design.md` ครบทุก tokens + signature **"Due-Date Card"**

### 2.2 นอกขอบเขต (Out of Scope — รอบถัดไป)

- หน้าฝั่งผู้ยืม (student/faculty portal: ค้นหา, ยืมเอง, จองเอง)
- หน้า Fines, Members, Reports, Settings, Audit log (แต่ backend มี logic ค่าปรับ
  เท่าที่ dashboard/KPI ใช้ + กันยืมเมื่อค้างเกินเพดาน)
- Course reserve (page + module) — schema มีตารางไว้ให้แล้ว
- Notification module (email/LINE) — schema มีตารางไว้ให้แล้ว
- RFID / self-checkout
- การรองรับหลายสาขาใน UI (backend สนับสนุนผ่าน `branches` แล้ว)

---

## 3. สถาปัตยกรรม (Architecture)

### 3.1 ภาพรวม

```
Browser (Next.js App Router)
   │
   ├── หน้า UI: app/features/*  (Zustand + react-hook-form)
   ├── Eden treaty typed client → /api/backend/* (proxy)
   └── NextAuth (HttpOnly cookie)
        │
        ▼
Next.js Proxy  app/api/backend/[...path]/route.ts
   │  1. auth() ตรวจ session
   │  2. เช็ค user.status === "active"
   │  3. strip headers ที่ browser ส่งมา (cookie, authorization, host)
   │  4. สอด X-User-Id, X-User-Role, X-User-Status, X-Fullname + X-Internal-Secret
   │  5. fetch ไป API_BASE_URL/<path> (timeout 30s)
        ▼
Elysia Backend (server/)
   │  auth.plugin.ts: มี X-Internal-Secret ถูก → trust proxy headers;
   │  ไม่มี → ตรวจ Authorization: Bearer <JWT> (mobile/direct)
   │  .guard({ role: "admin" | "librarian" })
   ▼
Controller → UseCase (domain rules) → Repository (Drizzle) → PostgreSQL
```

### 3.2 โครงสร้าง Monorepo (ตัดตาม template)

```text
library-lms/
├── app/                                    # ── FRONTEND: Next.js App Router ──
│   ├── layout.tsx                          # IBM Plex Sans Thai + ThemeProvider
│   ├── page.tsx                            # redirect("/dashboard")
│   ├── globals.css                         # Tailwind v4 + tokens จาก design.md §4
│   ├── (auth)/login/page.tsx               # thin re-export
│   ├── (dashboard)/                        # หลัง login
│   │   ├── layout.tsx                      # sidebar + floating header shell
│   │   ├── dashboard/page.tsx
│   │   ├── catalog/page.tsx
│   │   ├── circulation/page.tsx
│   │   └── reservations/page.tsx
│   ├── features/
│   │   ├── login/
│   │   ├── dashboard/
│   │   ├── catalog/
│   │   ├── circulation/
│   │   └── reservations/
│   │       └── แต่ละ feature: *.page.tsx + actions/ + components/ + hooks/ + stores/
│   ├── _shared/
│   │   ├── actions/ · components/ · constants/routes.ts · hooks/ · lib/ · types/
│   ├── api/
│   │   ├── auth/[...nextauth]/route.ts
│   │   └── backend/[...path]/route.ts      # ★ PROXY กลาง
│   └── wireframe/
├── auth.ts                                 # NextAuth v5 config (Credentials + JWT)
├── components/ui/                          # shadcn/ui (restyle ตาม design.md)
├── lib/utils.ts                            # cn()
├── public/
├── server/                                 # ── BACKEND: ElysiaJS ──
│   ├── src/
│   │   ├── worker.ts · app.ts · database.ts · shared.ts · seed.ts
│   │   ├── domains/                        # pure domain (no external deps)
│   │   │   ├── loan.domain.ts
│   │   │   ├── reservation.domain.ts
│   │   │   ├── copy.domain.ts
│   │   │   ├── policy.domain.ts
│   │   │   └── errors/
│   │   ├── infrastructure/database/schema/ # Drizzle 1 ตาราง = 1 ไฟล์
│   │   ├── libs/                           # env.ts, db.ts, date.helper.ts, http-error.factory.ts
│   │   ├── exports/shared/                 # @libsys/shared
│   │   └── modules/
│   │       ├── app.module.ts · di-registrations.ts · tokens.ts · auth.plugin.ts
│   │       ├── auth/ · users/ · catalog/ · circulation/ · reservations/ · storage/ · shared/
│   ├── tsconfig.json
├── drizzle/                                # migrations (pg)
├── scripts/ · e2e/ · .github/workflows/
├── .env.example · .env (gitignored)
├── package.json · bun.lock · bunfig.toml · turbo.json
├── tsconfig.json (aliases: @/*, @/app/*, @/server/*, @libsys/shared)
├── next.config.ts · tailwind.config.ts · postcss.config.mjs
├── eslint.config.mjs · components.json
├── drizzle.config.ts · vitest.config.ts · vitest.integration.config.ts
├── vitest.security.config.ts · playwright.config.ts
├── Dockerfile · Dockerfile.server · Dockerfile.web · docker-compose.yml
```

### 3.3 สิ่งที่ตัดออกจาก template CWIE

| หัวข้อ | Template | ของเรา |
|---|---|---|
| แพ็กเกจ shared | `@cwie/shared` | `@libsys/shared` |
| ฟอนต์ | Noto Sans Thai | IBM Plex Sans Thai (design.md) |
| Roles | admin / teacher | admin / librarian / faculty / staff / student |
| Features | companies, internship, reports, activities, admin/* | login, dashboard, catalog, circulation, reservations |
| ฐานข้อมูล | MSSQL + PG auto-detect | PostgreSQL อย่างเดียว (schema.sql) |
| CORS/OpenAPI | ตาม CWIE | ปรับชื่อ/ข้อมูลเป็น Library LMS |

---

## 4. Tech Stack

| ชั้น | เทคโนโลยี |
|---|---|
| Runtime | Bun 1.3.x |
| Frontend | Next.js 16 App Router, React 19, Tailwind CSS v4, shadcn/ui (Radix), lucide-react, Recharts, framer-motion, Zustand, react-hook-form |
| Backend | ElysiaJS, TypeBox, @elysiajs/cors + openapi, elysia-rate-limit, jose, tsyringe |
| Database | PostgreSQL + Drizzle ORM |
| Auth | NextAuth v5 (Credentials) + JWT ใน HttpOnly cookie + proxy headers |
| Storage | Cloudflare R2 ผ่าน `@aws-sdk/client-s3` (S3 API) |
| Testing | Vitest (unit/integration/security), Playwright (e2e) |
| Tooling | Turbo, ESLint/oxlint, Prettier, git-cz + commitlint + lefthook, Docker |

---

## 5. Backend Design

### 5.1 โครงสร้าง Module (hexagonal ตาม template)

```text
server/src/modules/<module>/
├── <module>.module.ts            # tsyringe DI registration
├── adapters/
│   ├── controllers/
│   │   ├── *.controller.ts       # Elysia routes + auth guard + schema binding
│   │   └── schemas/*.schema.ts   # TypeBox + OpenAPI detail
│   └── repository/
│       └── *.drizzle.repository.ts
└── applications/
    ├── ports/*.repository.ts     # interface + string token
    ├── schemas/*-schemas.ts      # DTO types
    └── usecases/*.usecase.ts     # 1 usecase = 1 ไฟล์ + *.test.ts
```

### 5.2 Modules

| Module | หน้าที่หลัก (5 หน้า) |
|---|---|
| `auth` | login, logout, session/me, role guard macro |
| `users` | ค้นหาสมาชิก (ID/ชื่อ) สำหรับ circulation + reservation — เท่าที่จำเป็นเท่านั้น |
| `catalog` | books + copies + categories: CRUD, ค้นหา (pg_trgm ILIKE), อัปโหลดปก |
| `circulation` | checkout, checkin, renew, recall, คำนวณ due date, overdue/fines (อ่านเพื่อ KPI + กันยืม) |
| `reservations` | hold queue FIFO: create, list, ready→fulfilled/expired |
| `storage` | StoragePort + R2Adapter: upload/delete/get URL รูปปก |
| `shared` | response wrapper + error mapping |

### 5.3 Domain (pure, ทดสอบได้โดยไม่พึ่ง DB)

- **loan.domain.ts** — คำนวณ due date จาก `borrowing_policies` (ตาม role), renew (จำกัดครั้ง,
  ต่อไม่ได้ถ้ามีจอง), recall (ย่น due date), grace period
- **reservation.domain.ts** — lifecycle `waiting → ready → fulfilled/expired/cancelled`,
  FIFO, pickup deadline, ส่งต่อคนถัดไป
- **copy.domain.ts** — state machine สถานะสำเนา
  `available/borrowed/reserved/lost/damaged/withdrawn`
- **policy.domain.ts** — resolve `borrowing_policies` (role → max_active_loans,
  loan_period_days, max_renewals, grace_period_days, daily_fine_rate, max_unpaid_fine)
- **errors/** — `DomainError`, `DomainUnauthorizedError`, `DomainForbiddenError`

### 5.4 Drizzle Schema

- ครบ **ทุกตารางตาม `db/schema.sql`** (13 ตาราง): branches, categories, users,
  borrowing_policies, system_settings, books, book_copies, loans, reservations,
  fines, course_reserves, notification_logs, audit_logs — เป็น single source of truth
  (รวม `system_settings` สำหรับค่าที่ปรับได้โดยไม่แก้โค้ด เช่น วันแจ้งเตือนล่วงหน้า)
- 1 ตาราง = 1 ไฟล์ ใน `server/src/infrastructure/database/schema/`
- Migration ไป `drizzle/pg` ผ่าน `drizzle.config.ts` (`bun run db:generate/migrate/push/seed`)

### 5.5 CQRS Type Naming (convention จาก template)

- `I{Action}{Entity}{Command|Query|ReturnType}` — repository port: `ICreate{Entity}Command`,
  `IFindBy{Field}Query`; usecase: `I{Action}{Entity}UsecaseCommand` / `UsecaseQuery`
- ทุก DTO interface ขึ้นต้นด้วย `I` · entity มี `toPublic()` ตัด field อ่อนไหว
- `execute({ command })` สำหรับ mutation, `execute({ query })` สำหรับ read

### 5.6 Auth Flow

```text
POST /api/auth/callback/credentials (NextAuth)
   → authorize() เรียก POST {API_BASE}/auth/login
   → Elysia ตรวจ bcrypt → คืน { token, user }
   → NextAuth เก็บ JWT session ใน HttpOnly cookie (maxAge 7d)
   → ทุก request ผ่าน proxy ได้ X-User-* อัตโนมัติ
   → logout → signOut()
```

- Roles ที่เข้า backoffice: **admin, librarian** (faculty/staff/student = ฝั่งผู้ยืม รอบหน้า)
- กัน user ที่ถูก suspend: proxy เช็ค `status === "active"` + backend เช็คซ้ำ
- `.guard({ role: "admin" })` / `.guard({ role: "librarian" })` ตามสิทธิ์ของ endpoint

### 5.7 Error Response Format (มาตรฐานทั้งระบบ)

```json
{ "success": true,  "data": { ... }, "message": "..." }
{ "success": false, "error": "ข้อความผิดพลาด" }
{ "success": true, "data": [...], "total": 100, "page": 1, "limit": 12, "totalPages": 9 }
```

- Pagination: server-side (`page` + `limit` → `total, page, limit, totalPages`)
- `app.ts` → `.onError()` ใช้ `http-error.factory.ts` + `DomainError` → 400/401/403/404/409
  พร้อมข้อความไทย

---

## 6. Frontend Design

### 6.1 โครงสร้าง Feature (ตาม template)

```text
app/features/<feature>/
├── <feature>.page.tsx        # "use client" page ประกอบ UI + hook
├── actions/<feature>.action.ts  # เรียก Eden client
├── components/               # UI เฉพาะ feature
├── hooks/use-<feature>.ts    # state + data fetching
└── stores/<feature>.store.ts # Zustand (ถ้ามี state ซับซ้อน)
```

- Route file เป็น thin re-export เท่านั้น
- Co-locate ก่อนเสมอ — ย้ายขึ้น `_shared/` เฉพาะเมื่อมี feature อื่น import
- ข้อมูลไหลทิศทางเดียว: Route → page → hooks → stores → actions → eden-client

### 6.2 Design System (จาก design.md — สรุป)

| หมวด | ค่า |
|---|---|
| Primary | teal `#0F766E` (brand-500) + amber `#F59E0B` accent |
| BG light | cream `#FAF9F6` / surface `#FFFFFF` / subtle `#F1EFE9` |
| BG dark | navy `#0B1220` / surface `#111A2C` / subtle `#1A2538` |
| ฟอนต์ | IBM Plex Sans Thai (display 30/38 700, title 20/28 600, body 14/22, caption 12/18, label 13/18 500) |
| Radius | sm 8 / md 12 / lg 16 (การ์ด) / xl 24 (modal) |
| Shadow | `--shadow-card`, `--shadow-pop`, `--shadow-float` (float แทน border) |
| ตัวเลข | `tabular-nums` เสมอ |

- shadcn/ui ถูก restyle ให้เหลือแค่โครงสร้าง Radix: ปุ่ม **pill**, การ์ดไม่มี border,
  badge มี status dot + ตัวพิมพ์เล็ก, focus-visible ring เพื่อ accessibility
- sidebar มืด 240px (collapse 72px) · header floating 64px blur 12px · dark/light toggle
- **ห้าม** ใช้ฟอนต์ Outfit, สี indigo `#465FFF`, ApexCharts, FullCalendar, asset จาก TailAdmin

### 6.3 Signature: "Due-Date Card" (จุดที่จำได้ 1 จุด)

แรงบันดาลใจจากบัตรกำหนดคืนของห้องสมุดเก่า (บัตรที่ตีสแตมป์วันกำหนดคืน):

- **หน้า Login:** การ์ด due-date เป็นองค์ประกอบหลัก (โลโก้/ฉากหลัง)
- **หน้า Circulation:** หลังยืมสำเร็จ → การ์ด due-date ปรากฏพร้อม **สแตมป์** วันกำหนดคืน
  (ช่วงไฮไลต์ของระบบ)
- **Dashboard mini calendar:** จุด brand บนวันที่มียอดครบกำหนด

### 6.4 ทั้ง 5 หน้า

**1) Login** — ไทยล้วน, การ์ด due-date เป็นจุดเด่น, ฟอร์ม email + password
(react-hook-form + Zod), error ไทยใต้ช่อง, redirect ตาม role หลัง login

**2) Dashboard** — heading "สวัสดีตอนเช้า, <ชื่อ> 👋" + ปุ่ม "+ ยืมหนังสือ" ·
KPI 4 การ์ด: **ยืมวันนี้ / ค้างส่ง / คิวจองพร้อมรับ / ค่าปรับค้าง** ·
Bar chart "การยืม 30 วันล่าสุด" (2/3) + ring "เป้าหมายรายเดือน" (1/3) ·
ตาราง "การยืมล่าสุด" (ค้นหา + filter สถานะ) · แถวล่าง: mini calendar + การ์ด
"สถิติยืมตามหมวด"

**3) Catalog** — ตารางหนังสือ (ปก thumbnail, ชื่อ, ผู้แต่ง, หมวด, สำเนาว่าง/ทั้งหมด,
สถานะ) + ค้นหา (pg_trgm) + filter หมวด · ปุ่ม "+ เพิ่มหนังสือ" เปิด dialog
(ข้อมูล title + อัปโหลดปก → R2) · แถวเลื่อนดูสำเนา (copy) แต่ละเล่ม + เพิ่ม/แก้สถานะ

**4) Circulation desk** — ช่องค้นหาสมาชิก (ID/ชื่อ) + สแกน/พิมพ์ copy code ของหนังสือ
ที่ยืม · แสดงรายการในตะกร้ายืม + ปุ่ม "ยืม" → สแตมป์ due date บนการ์ด due-date ·
แท็บคืนหนังสือ: สแกน copy code → checkin · การ์ดสมาชิกแสดง: ยืมอยู่, ค้างส่ง,
ยอดค่าปรับ, สิทธิ์ถูกระงับหรือไม่ · ปุ่มต่ออายุ / recall

**5) Reservations** — ตารางคิวจอง: สถานะ (Waiting/Ready/Expired), ผู้จอง, หนังสือ,
วันที่จอง, pickup deadline · ปุ่ม "พร้อมให้ยืม" (mark ready) · ตัวเลื่อนรายละเอียด
คิวของแต่ละ title

### 6.5 Conventions (บังคับ)

- UI icons ใช้ **lucide-react เท่านั้น** — ห้าม custom `<svg>`
- **ห้ามใช้ `any`** เด็ดขาด
- ห้าม render dialog/modal ภายใน `PageTransition` (stacking context) — วางเป็น
  sibling ที่ root (ใช้ `<>` fragment)
- ภาษาไทยล้วนใน UI: ปุ่ม/ป้าย/เมนู/ข้อความ error/empty state

---

## 7. Data Flow & API Client

- `app/_shared/lib/eden-client.ts`: `treaty<App>(origin + ROUTES.API_BACKEND)` —
  typed client จาก type ของ backend โดยตรง
- `app/_shared/lib/eden-helpers.ts`: `edenRequest()` จัดการ response wrapper
- `app/_shared/constants/routes.ts`: `ROUTES.API_BACKEND = "/api/backend"`
- Cache policy (proxy): GET ที่อ่านบ่อย เช่น หมวดหมู่ → `public, max-age=300` ;
  GET อื่น → `no-store` ; ใช้กับ response status < 400 เท่านั้น
- Mutation: server/client action → หลังสำเร็จ revalidate + toast ไทย
  (เช่น "ยืมสำเร็จ ✓ กำหนดคืน 24 ส.ค.")

---

## 8. Error Handling

- ทุก response ผ่าน wrapper มาตรฐาน (ดู §5.7)
- ฟอร์ม: error ใต้ช่อง + border coral (design.md §6.5)
- Empty state = ชวนลงมือ: "ยังไม่มีหนังสือในหมวดนี้ — เพิ่มเล่มแรก"
- 404/403/500: หน้าความผิดพลาดภาษาไทย, toast ไม่มีภาษาอังกฤษ
- Network error จาก proxy → 503 พร้อมข้อความ "ระบบไม่พร้อมใช้งาน กรุณาลองใหม่"

---

## 9. Testing

| ชั้น | เครื่องมือ | เป้าหมาย |
|---|---|---|
| Unit | Vitest (`vitest.config.ts`) | domain: due date + grace, renew/recall, FIFO คิวจอง, policy ตาม role, ค่าปรับ overdue; usecase ทั้งหมด (`server/src/**/*.test.ts`) |
| Integration | Vitest (`vitest.integration.config.ts`) | repository + API flow กับ PostgreSQL จริง (`.env.test`) |
| Security | Vitest (`vitest.security.config.ts`) | IDOR (ผู้ใช้ A แตะข้อมูลยืมของ B ไม่ได้), role guard, suspend check |
| E2E | Playwright | login → dashboard → catalog CRUD → ยืม/คืน → จอง/รับหนังสือ |

- คำสั่ง: `bun run test:unit`, `bun run test:integration`, `bun run test:security`,
  `bun run test:e2e` (รันไฟล์เดียว: `bun run test:unit -- path/to.test.ts`)

---

## 10. Environment Variables (`.env.example`)

```env
# --- Backend (Elysia) ---
DATABASE_URL=postgresql://user:pass@localhost:5432/library_lms
PORT=3001

# --- Auth ---
AUTH_SECRET=                                # min 32 chars (NextAuth)
INTERNAL_SECRET=                            # min 16 chars (proxy → backend)

# --- Frontend ---
NEXT_PUBLIC_API_URL=http://localhost:3001

# --- Cloudflare R2 (รูปปกหนังสือ) ---
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=library-covers
R2_PUBLIC_URL=                              # custom domain ของ bucket (ถ้ามี)
```

> สร้าง `.env` จาก `.env.example` — ห้าม commit `.env*` (ดู `.gitignore`)

---

## 11. Key Decisions (พร้อมเหตุผล)

| # | การตัดสินใจ | เหตุผล |
|---|---|---|
| 1 | ทำเฉพาะฝั่ง admin ก่อน | ฝั่งผู้ยืมมีบริบทต่าง (มือถือ/self-service) ควรเป็นโปรเจกต์แยก |
| 2 | 5 หน้าหลักก่อน (login/dashboard/catalog/circulation/reservations) | ครอบคลุม component เกือบทุกตัวใน design.md — หน้าที่เหลือประกอบซ้ำ |
| 3 | ใช้ template CWIE | ได้ proxy + hexagonal + DI + typed client ครบ, งานเหลือแค่เปลี่ยน domain |
| 4 | Auth = HttpOnly cookie (NextAuth v5) | Browser ไม่เห็น token, proxy เป็นผู้สอด headers — ปลอดภัยกว่า JWT ใน localStorage |
| 5 | ภาษาไทยล้วน | ผู้ใช้จริงคือบรรณารักษ์ไทย + requirement "ใช้งานได้โดยไม่ต้องฝึกอบรมมาก" |
| 6 | Storage = Cloudflare R2 (S3-compatible) | ตามที่ผู้ใช้กำหนด, ใช้ `@aws-sdk/client-s3`, สลับ MinIO/S3 ได้แค่เปลี่ยน env |
| 7 | Signature "Due-Date Card" | กำหนดคืนคือข้อมูลที่บรรณารักษ์ใช้ทุกวัน — ลายเซ็นใช้งานได้จริง ไม่ใช่แค่ตกแต่ง |
| 8 | Fines logic ใน backend แม้ยังไม่มีหน้า | KPI + กันยืมเมื่อค้างเกินเพดานต้องใช้ข้อมูลนี้ตั้งแต่รอบแรก |
| 9 | Drizzle schema = ครบทุกตารางตาม schema.sql | single source of truth — หน้าอื่นในรอบถัดไปไม่ต้องแก้ schema |

---

*อ้างอิง: `design.md` (design tokens §4), `library-system-requirements.md` (requirements §3–7),
`db/schema.sql` (DDL), template CWIE (โครงสร้าง monorepo ตาม §3.2 — อ้างอิงจาก template ของผู้ใช้)*
