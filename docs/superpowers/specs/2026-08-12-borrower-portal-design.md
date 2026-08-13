# Library LMS — ฝั่งผู้ยืม (Borrower Portal) Design Spec

> วันที่: 2026-08-12 · โปรเจค: `library-lms` · แพ็กเกจ shared: `@libsys/shared`
> เอกสารนี้เป็นผลจาก brainstorming: ออกแบบ **ฝั่งผู้ยืม (student/faculty/staff portal)**
> ต่อจาก admin backoffice (`2026-08-10-library-lms-admin-design.md`) และ
> members management (`2026-08-11-members-management-design.md`)

---

## 1. บทสรุป (Summary)

พัฒนา **ฝั่งผู้ยืม (Borrower Portal)** ให้ student/faculty/staff ใช้งานด้วยตัวเองแบบ
**mobile-first / self-service** — ต่างจาก admin backoffice ที่ desktop-first:

1. **ค้นหาหนังสือ** — ค้นหา/กรองแคตตาล็อก (อ่านได้ทุก role ที่ active)
2. **ยืมเอง (self-checkout)** — ยืมสำเนาที่ว่างด้วยตัวเอง (policy เดียวกับเคาน์เตอร์)
3. **จองเอง (self-reserve)** — จองหนังสือที่ถูกยืม + ยกเลิกคิวของตัวเอง
4. **การยืมของฉัน** — รายการยืมที่ active + ประวัติ + ต่ออายุเอง + due-date card
5. **ค่าปรับของฉัน** — ยอดค้าง + รายการ fines ของตัวเอง

ร่วมกับการแก้ **login redirect ตาม role** (admin/librarian → `/dashboard`,
faculty/staff/student → `/my-loans`) ที่ทำเป็นส่วนหนึ่งของงานนี้

---

## 2. ขอบเขต (Scope)

### 2.1 ในขอบเขต (In Scope)

- **Server API** ฝั่ง self-service (module ใหม่ `me`):
  - `GET /me` — โปรไฟล์ + policy ของตัวเอง
  - `GET /me/loans` — รายการยืมของตัวเอง (active + history)
  - `POST /me/loans/:id/renew` — ต่ออายุของตัวเอง
  - `GET /me/reservations` — คิวจองของตัวเอง
  - `POST /me/reservations` — จองหนังสือ (bookId)
  - `DELETE /me/reservations/:id` — ยกเลิกจอง (เฉพาะ waiting)
  - `GET /me/fines` — ค่าปรับของตัวเอง
  - `POST /me/checkout` — self-checkout (copyCode)
- **Catalog อ่าน**: เปิด `GET /catalog/books`, `GET /catalog/books/:id`,
  `GET /catalog/categories` ให้ทุก role ที่ active (เดิม guard admin/librarian)
- **Web portal** `app/(portal)/`:
  - `/my-loans` — การยืมของฉัน (+ due-date card + ปุ่มต่ออายุ)
  - `/search` — ค้นหาหนังสือ (grid + filter หมวด/สถานะ)
  - `/books/[id]` — รายละเอียดหนังสือ + ปุ่ม ยืม/จอง
  - `/my-reservations` — คิวจองของฉัน + ยกเลิก
  - `/my-fines` — ค่าปรับของฉัน
- **Login redirect ตาม role** + middleware กันผู้ยืมเข้าหน้า backoffice
- **Tests**: server unit (IDOR/guard), web unit, e2e

### 2.2 นอกขอบเขต (Out of Scope — รอบถัดไป)

- Course reserve (module + UI)
- Notification (email/LINE) — ส่งแจ้งเตือนเมื่อจองพร้อมให้ยืม
- Payment/ชำระค่าปรับออนไลน์ (จ่ายที่เคาน์เตอร์ก่อน)
- SIS sync / ลงทะเบียนเอง (self-registration)
- รองรับหลายสาขาใน UI

---

## 3. สถาปัตยกรรม (Architecture)

### 3.1 Flow

```
Browser (mobile-first) → /search, /my-loans, ...
   │  Eden treaty typed client → /api/backend/* (proxy เดิม)
   │  NextAuth session เดิม (HttpOnly cookie) — role faculty/staff/student
   ▼
Next.js Proxy (เดิม) — สอด X-User-* headers
   ▼
Elysia Backend
   │  auth.plugin.ts: `.guard({ role: ["faculty","staff","student"] })` หรือ `role: true`
   ▼
Usecase (self-service — ใช้ user จาก context เสมอ, ห้ามรับ userId จาก client)
   → Repository (Drizzle) → PostgreSQL
```

- **Key point — IDOR:** ทุก endpoint `/me/*` อ่าน `user.id` จาก `AuthenticatedState`
  (มาจาก proxy headers) **เท่านั้น** — client ส่ง userId ใน path/body ไม่ได้
- Catalog อ่าน: `role: true` (ทุก role ที่ active) — แยกเป็น controller ใหม่
  `public` หรือปรับ guard ของ route GET เท่านั้น (POST/PUT ยังเป็น admin/librarian)

### 3.2 โครงสร้างเพิ่มเติม

```text
app/(portal)/                        # ── PORTAL (mobile-first, layout แยกจาก backoffice) ──
├── layout.tsx                       # header บาง + max-w-2xl (mobile)
├── my-loans/page.tsx
├── search/page.tsx
├── books/[id]/page.tsx
├── my-reservations/page.tsx
└── my-fines/page.tsx

app/features/
├── search/                          # ค้นหาแคตตาล็อก (หน้าแรกของ portal)
├── my-loans/                        # การยืมของฉัน + due-date card
├── my-reservations/
└── my-fines/

server/src/modules/
├── me/                              # ── MODULE ใหม่: self-service ──
│   ├── me.module.ts
│   ├── adapters/controllers/me.controller.ts + schemas/
│   └── applications/
│       ├── ports/me.repository.ts
│       ├── schemas/me-schemas.ts
│       └── usecases/
│           ├── get-me.usecase.ts
│           ├── list-my-loans.usecase.ts
│           ├── renew-my-loan.usecase.ts
│           ├── list-my-reservations.usecase.ts
│           ├── create-my-reservation.usecase.ts
│           ├── cancel-my-reservation.usecase.ts
│           ├── list-my-fines.usecase.ts
│           └── self-checkout.usecase.ts
└── catalog/                         # แก้: เปิด GET ให้ทุก role
    └── adapters/controllers/book.controller.ts  # guard role: true เฉพาะ GET
```

---

## 4. Server API — Self-Service (module `me`)

### 4.1 Routes

| Method | Path | Guard | ความหมาย |
| ------ | ---- | ----- | -------- |
| GET | `/me` | faculty/staff/student | โปรไฟล์ + policy + ยอดค้าง |
| GET | `/me/loans` | faculty/staff/student | รายการยืม active + history (ของตัวเองเท่านั้น) |
| POST | `/me/loans/:id/renew` | faculty/staff/student | ต่ออายุ (เช็คคิวจอง + จำนวนครั้ง — domain เดิม) |
| GET | `/me/reservations` | faculty/staff/student | คิวจองของตัวเอง |
| POST | `/me/reservations` | faculty/staff/student | จองหนังสือ (body: `{ bookId }`) |
| DELETE | `/me/reservations/:id` | faculty/staff/student | ยกเลิกจอง (เฉพาะ waiting) |
| GET | `/me/fines` | faculty/staff/student | ค่าปรับค้างชำระของตัวเอง |
| POST | `/me/checkout` | faculty/staff/student | self-checkout (body: `{ copyCode }`) |

### 4.2 กติกาหลัก

- **IDOR-proof:** `user` มาจาก `resolve` ของ `authPlugin` (`AuthenticatedState.user`) —
  ห้ามรับ `userId` จาก body/query/path
- **owner check:** `POST /me/loans/:id/renew` และ `DELETE /me/reservations/:id`
  ต้องเช็ค `loan.userId === user.id` / `reservation.userId === user.id` ก่อน →
  ไม่ใช่ของตัวเอง = `DomainForbiddenError` 403
- **self-checkout ใช้ domain เดิม:** `CheckoutUsecase` ของ circulation — แต่ role รับ
  จาก context ไม่ใช่ librarian ตรวจ policy: active, max_active_loans, ค่าปรับ ≤ เพดาน,
  copy ว่าง → ตั้ง due date ตาม policy role + `checked_out_by = user.id` (ตัวเอง)
- **จองซ้ำ:** partial unique index เดิมกันจองซ้ำ title → 409
- **Renew:** domain `renewLoan()` เดิม (max_renewals + มีจอง → 403)

### 4.3 เปิด Catalog อ่าน

| Method | Path | ก่อน | หลัง |
| ------ | ---- | ---- | ---- |
| GET | `/catalog/books` | admin/librarian | ทุก role active (`role: true`) |
| GET | `/catalog/books/:id` | admin/librarian | ทุก role active |
| GET | `/catalog/categories` | admin/librarian | ทุก role active |
| POST/PUT | `/catalog/*` | admin/librarian | คงเดิม |

> **หมายเหตุ:** `role: true` หมายถึงผ่านการ login + status active ทุก role —
> ตรวจว่ามี macro รองรับ `true` อยู่แล้ว (`RoleGuardValue = true | UserRole | UserRole[]`)

---

## 5. Web UI — Portal (mobile-first)

### 5.1 Design

- ตาม `design.md` tokens เดิม (brand teal + amber, IBM Plex Sans Thai) —
  แต่เลย์เอาต์ **mobile-first**: header บาง + `max-w-2xl` (ไม่ใช้ sidebar ของ backoffice)
- Signature **Due-Date Card** ใช้ต่อ: หลังยืมสำเร็จ / หน้า /my-loans แสดงการ์ดสแตมป์วันคืน
- ภาษาไทยล้วน · lucide-react เท่านั้น · ไม่มี `any`

### 5.2 หน้า

**1) `/search`** — หน้าแรกของ portal (หลัง login ของผู้ยืม ไป `/my-loans`
หรือ `/search` ตามที่ตกลง — spec นี้เลือก `/my-loans` เป็น home ตามงานแก้ login)
- ช่องค้นหา (ชื่อ/ผู้แต่ง/ISBN) + filter หมวด + สถานะพร้อมยืม
- grid การ์ดหนังสือ (ปก, ชื่อ, ผู้แต่ง, badge ว่าง/ถูกยืม) → คลิกไป `/books/[id]`

**2) `/books/[id]`** — รายละเอียด: ปก, ข้อมูล title, สำเนาว่าง x/y
- ถ้ามีสำเนาว่าง → ปุ่ม **"ยืม"** (self-checkout)
- ถ้าทั้งหมดถูกยืม → ปุ่ม **"จอง"** (เข้ารอคิว)
- ถ้าจองอยู่แล้ว → badge "อยู่ในคิวลำดับที่ N"

**3) `/my-loans`** — การยืมของฉัน (home ของผู้ยืม)
- การ์ด active loan: ชื่อหนังสือ, due date, ปุ่มต่ออายุ (disabled ถ้าเกินครั้ง/มีจอง)
- **Due-date card** สำหรับรายการที่ใกล้ครบกำหนด
- Tab/ส่วนประวัติยืมที่คืนแล้ว

**4) `/my-reservations`** — คิวจองของฉัน: สถานะ (รอคิว/พร้อมรับ/หมดอายุ/ยกเลิก),
วันที่จอง, pickup deadline, ปุ่มยกเลิก (เฉพาะ waiting)

**5) `/my-fines`** — ยอดค้างชำระรวม + รายการ fines (เหตุผล, จำนวน, จ่ายแล้ว/ยัง)
+ ข้อความ "ชำระที่เคาน์เตอร์ห้องสมุด"

### 5.3 Redirect ตาม role (งานนี้ — เสร็จแล้วในโค้ด)

| Role | หลัง login | เข้า /login (login แล้ว) |
| ---- | ---------- | ----------------------- |
| admin / librarian | `/dashboard` | `/dashboard` |
| faculty / staff / student | `/my-loans` | `/my-loans` |
| student พยายามเข้า `/dashboard` | → redirect `/my-loans` | — |

---

## 6. Tests

### 6.1 Server unit

| ไฟล์ | กรณี |
| ---- | ---- |
| `self-checkout.usecase.test.ts` | สำเร็จ (due date ตาม policy role), copy ไม่ว่าง → 409, สมาชิกถูกระงับ/ค้างเกินเพดาน → 403, ยืมเกิน max → 403 |
| `renew-my-loan.usecase.test.ts` | สำเร็จ, loan ไม่ใช่ของตัวเอง → 403, เกินครั้ง/มีจอง → 403 |
| `create-my-reservation.usecase.test.ts` | สำเร็จ, จองซ้ำ → 409, หนังสือมีสำเนาว่าง → ยืมได้เลย (ไม่ต้องจอง) |
| `cancel-my-reservation.usecase.test.ts` | สำเร็จ (waiting), ไม่ใช่ของตัวเอง → 403, สถานะไม่ใช่ waiting → 409 |
| `me.controller.test.ts` | guard role + ใช้ user จาก context (ไม่รับจาก client) |
| `list-my-fines.usecase.test.ts` | คืนเฉพาะของตัวเอง + ยอดค้างรวม |

### 6.2 Security tests

- IDOR: user A เรียก `/me/loans` → เห็นเฉพาะของ A; ต่ออายุ loan ของ B → 403
- role guard: admin/librarian เรียก `/me/*` → 403 (หรืออนุญาต ตามที่ตกลง — กำหนดเป็น
  ไม่อนุญาต: `/me/*` สำหรับ 3 role ผู้ยืมเท่านั้น); student เรียก POST `/catalog/books` → 403
- suspend: user status=suspended → 401 (auth plugin เดิมจับอยู่แล้ว)

### 6.3 Web unit

- `my-loans.store.test.ts`: fetch list, renew → อัปเดต, error ไทย
- `search.store.test.ts`: fetch/filter/ค้นหา + pagination
- `route-guard.test.ts` (มีแล้ว): เพิ่มกรณี role-aware (ทำแล้วในงานนี้)

### 6.4 E2E (Playwright)

- `portal.spec.ts`: student login → `/my-loans` → ค้นหา → ดูหนังสือ → ยืม (ถ้าสำเนาว่าง)
  หรือจอง → ดูใน my-loans / my-reservations
- `guard.spec.ts` (มีแล้ว): เพิ่ม student → /my-loans, student เข้า /dashboard → redirect

---

## 7. Known Limitations (จดไว้)

1. **Self-checkout ใช้ได้เฉพาะสำเนาที่สถานะ `available`** — สำเนา reserved/lost/damaged
   ต้องติดต่อเคาน์เตอร์
2. **ค่าปรับจ่ายที่เคาน์เตอร์เท่านั้น** (ไม่มีชำระออนไลน์) — UI แจ้งให้ชัดเจน
3. **ไม่มี self-registration** — สมาชิกสร้างโดย admin/librarian (หน้า /members ที่มี)
4. **ระบบแจ้งเตือนยังไม่มี** — ผู้ใช้ต้องเช็คสถานะจองด้วยตัวเอง

---

## 8. สรุปการตัดสินใจ (จาก brainstorming)

| คำถาม | การตัดสินใจ |
| ----- | ----------- |
| Login redirect ตาม role | admin/librarian → /dashboard, ผู้ยืม → /my-loans (ทำในงานนี้) |
| Home ของผู้ยืม | `/my-loans` |
| Backend module ใหม่ | `me` — self-service, IDOR-proof (user จาก context) |
| ยืมเองได้ไหม | ได้ (self-checkout) — ใช้ domain CheckoutUsecase เดิม |
| Catalog อ่านเปิดไหม | เปิด GET ให้ทุก role active (POST/PUT คงเดิม) |
| แนวทางรวม | ต่อยอด domain/usecase เดิม ไม่สร้างของใหม่ซ้ำ — portal เป็น UI mobile-first แยก layout |
| e2e | เพิ่ม portal spec + guard role-aware |
