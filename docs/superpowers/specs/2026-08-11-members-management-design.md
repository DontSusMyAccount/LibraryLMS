# Library LMS — Manage Members Design Spec

> วันที่: 2026-08-11 · โปรเจค: `library-lms` · แพ็กเก็ก shared: `@libsys/shared`
> เอกสารนี้เป็นผลจาก brainstorming: เพิ่ม feature **จัดการสมาชิก** ให้ฝั่ง admin
> backoffice ของระบบยืม-คืนหนังสือห้องสมุดสถานศึกษา (Library LMS)
> ต่อจาก design รอบที่แล้ว (`2026-08-10-library-lms-admin-design.md` — 5 หน้าจอ)

---

## 1. บทสรุป (Summary)

เพิ่มหน้า **จัดการสมาชิก (Members)** ให้ admin/librarian:
- สร้างสมาชิกใหม่, แก้ไขข้อมูลสมาชิก, เปลี่ยนสถานะ (ระงับ/เปิดใช้งาน)
- **ไม่มี** การลบสมาชิก (ตัดออกโดยเจตนา — ข้อมูลยืม-คืนอ้างอิง user)
- เพิ่ม **route guard (middleware)** ครอบหน้าทั้งหมดที่ต้อง login
- UI ภาษาไทยล้วน ตาม pattern หน้า catalog ที่มีอยู่

---

## 2. ขอบเขต (Scope)

### 2.1 ในขอบเขต (In Scope)

- **Server API** (ต่อจาก module `users` ที่เป็น read-only อยู่):
  - `POST /users` — สร้างสมาชิก (guard: admin, librarian)
  - `PATCH /users/:id` — แก้ไขข้อมูล/เปลี่ยนสถานะ (guard: admin, librarian)
- **Web feature** `app/features/members/` — mirror pattern catalog:
  - ตาราง + search + filter (บทบาท/สถานะ) + dialog เพิ่ม/แก้ไข
- **Middleware** route guard (NextAuth v5) ครอบ 5 หน้าหลัก + /login
- **Tests**: server unit, web unit, e2e (Playwright)

### 2.2 นอกขอบเขต (Out of Scope)

- **ไม่เปลี่ยนรหัสผ่านจาก UI** — ผู้ใช้ลืมรหัสผ่านต้องแก้จาก DB โดยตรง (known limitation)
- **ไม่ลบสมาชิก** — แค่ระงับ (suspended)
- หน้าฝั่งผู้ยืม (student portal) — รอบถัดไป
- Reset password flow / email notification

---

## 3. Server API

### 3.1 Routes

| Method | Path | Guard | ความหมาย |
| ------ | ---- | ----- | -------- |
| GET | `/users/search` | admin, librarian | มีอยู่แล้ว (ขยายให้ค้น email + studentOrStaffId ด้วย) |
| GET | `/users/:id` | admin, librarian | มีอยู่แล้ว |
| **POST** | `/users` | admin, librarian | สร้างสมาชิก |
| **PATCH** | `/users/:id` | admin, librarian | แก้ไขข้อมูล / เปลี่ยนสถานะ |

### 3.2 POST /users

**Request body:**
```ts
{
  email: string,            // required, format email, unique
  fullName: string,         // required
  role: UserRole,           // required (admin|librarian|faculty|staff|student)
  password: string,         // required, min 8 chars, max 72 bytes (bcrypt limit)
  memberType: "general" | "undergraduate" | "graduate",  // optional, default: student→undergraduate, อื่น→general
  studentOrStaffId?: string, // optional, unique
  phone?: string,           // optional
  branchId?: string         // optional
}
```

**Responses:**
- `201` → `{ success: true, data: { id, email, fullName, role, status, ... } }`
- `409` — email หรือ studentOrStaffId ซ้ำ (message ภาษาไทย: "อีเมลนี้ถูกใช้งานแล้ว" / "รหัสนักศึกษา/พนักงานนี้ถูกใช้งานแล้ว")
- `404` — branchId ไม่มีในระบบ
- `400` — password เกิน 72 bytes (bcrypt limit: "รหัสผ่านยาวเกินไป (สูงสุด 72 ตัวอักษร)")
- `422` — validation ล้มเหลว (email format ผิด, password < 8 ตัว, ช่อง required ว่าง)

**Logic:** bcrypt hash (cost 10 — เท่า seed) + `status: "active"` เสมอตอนสร้าง

### 3.3 PATCH /users/:id

**Request body (ทั้งหมด optional แต่ต้องมีอย่างน้อย 1):**
```ts
{
  fullName?: string,
  role?: UserRole,
  status?: UserStatus,       // active|suspended|graduated|inactive
  memberType?: ...,
  studentOrStaffId?: string,
  phone?: string,
  branchId?: string
}
```
**ห้ามเปลี่ยน email และ password ใน PATCH** (email = identity, password = แก้ DB)

**Responses:**
- `200` → user ที่อัปเดตแล้ว
- `409` — studentOrStaffId ซ้ำ
- `404` — ไม่พบ user / branchId ไม่มี
- `403` — **admin เปลี่ยนสถานะ/บทบาทตัวเองไม่ได้** (กัน lockout) ใช้ `actorId` (จาก header `x-user-id`) เทียบ `:id`
- `422` — validation ล้มเหลว

### 3.4 Edge cases (รวมสอง route)

- **Email/studentOrStaffId ซ้ำ** → 409 ภาษาไทย (ใช้ `findByEmail` ที่มีอยู่ + เพิ่มเช็ค studentOrStaffId)
- **admin ระงับหรือเปลี่ยนบทบาทตัวเอง** → 403 ("ไม่สามารถเปลี่ยนสถานะของตัวเองได้")
- **password > 72 bytes** → 400 (bcrypt ตัด silently → ต้อง validate ก่อน hash)
- **status กลับเป็น active ได้** — เป็นแค่ฟิลด์ธรรมดา (ไม่อนุญาตเฉพาะตอน actorId == id)

### 3.5 ไฟล์ที่เกี่ยวข้อง (server)

```
server/src/modules/users/
├── adapters/controllers/user.controller.ts   # + POST / PATCH routes
├── adapters/controllers/schemas/user.schema.ts
├── adapters/repository/user.drizzle.repository.ts  # + create/update/findById
├── applications/ports/user.repository.ts     # + create/update/findById
├── applications/schemas/user-schemas.ts      # + create-user.schema / update-user.schema
├── applications/usecases/
│   ├── create-user.usecase.ts (+test)
│   ├── update-user.usecase.ts (+test)
│   └── list-users.usecase.ts                 # ขยาย search → email/studentOrStaffId
└── users.module.ts                           # register ใหม่
```

---

## 4. Web UI — หน้า /members

### 4.1 โครงสร้าง (mirror catalog)

```
app/(dashboard)/members/page.tsx        # server page → render client MembersPage
app/features/members/
├── members.page.tsx                    # ตาราง + toolbar + dialog (client)
├── members.types.ts                    # MemberListItem, CreateMemberInput, UpdateMemberInput
├── actions/members.action.ts           # eden treaty: fetchMembers / createMember / updateMember
├── hooks/use-members.ts
├── stores/members.store.ts (+test)     # zustand: list, search, filter, page, loading, error
└── components/
    ├── members-table.tsx               # ตาราง: ชื่อ, อีเมล, บทบาท, สถานะ(badge), รหัสนักศึกษา, เบอร์
    ├── member-form-dialog.tsx          # dialog ฟอร์ม — ใช้ร่วม create/edit
    └── member-status-badge.tsx         # สีตามสถานะ (active เขียว / suspended แดง / graduated เทา / inactive เทาเข้ม)
```

### 4.2 พฤติกรรม

- **Search**: ชื่อ / อีเมล / รหัสนักศึกษา (server-side — ต้องขยาย `searchByName` → `searchByKeyword`)
- **Filter**: dropdown บทบาท (5 แบบ) + dropdown สถานะ (4 แบบ)
- **ปุ่ม "เพิ่มสมาชิก"** → dialog:
  - **โหมดสร้าง**: อีเมล*, ชื่อ*, บทบาท*, รหัสผ่าน* + ยืนยันรหัสผ่าน*, memberType (default ตามบทบาท), รหัสนักศึกษา, เบอร์
  - **โหมดแก้ไข** (กดที่แถว): ฟอร์มเดียวกัน **ไม่มีช่องรหัสผ่าน** + เพิ่ม dropdown สถานะ
- **Validation ฝั่ง client**: email format, รหัสผ่าน ≥8 + ตรงกัน, ช่อง * ไม่ว่าง — ก่อนส่ง server
- **Error จาก server**: แสดงข้อความภาษาไทย (409 อีเมลซ้ำ ฯลฯ) แบบเดียวกับหน้า catalog
- **Sidebar**: เพิ่มเมนู "สมาชิก" (UsersIcon จาก lucide-react) ในกลุ่ม การจัดการ — ต่อจาก "คิวจอง"
- Loading skeleton / empty state ("ไม่พบสมาชิก")

---

## 5. Route Guard (middleware)

### 5.1 middleware.ts (root — มาตรฐาน NextAuth v5)

```ts
export default auth((req) => {
  // protected + ไม่มี session → redirect /login
  // /login + มี session → redirect /dashboard
});
export const config = {
  matcher: ["/dashboard/:path*", "/catalog/:path*",
            "/circulation/:path*", "/reservations/:path*", "/members/:path*", "/login"],
};
```

### 5.2 ไฟล์

```
middleware.ts                          # thin glue (3 บรรทัด)
app/_shared/lib/route-guard.ts         # isProtectedPath() + resolveRouteGuard() — unit test ได้
app/_shared/lib/route-guard.test.ts
```

### 5.3 เงื่อนไข

- `/api/*` **ไม่เข้า matcher** — proxy `/api/backend` ตรวจ session เอง (401), `/api/auth` เป็นของ NextAuth
- `auth.ts` เป็น edge-safe แล้ว (fetch-based, ไม่มี node-only import) → ใช้ middleware ได้เลย
- ไม่แตะ `auth.ts` / session logic เดิม

---

## 6. Tests

### 6.1 Server unit (Vitest)

| ไฟล์ | กรณี |
| ---- | ---- |
| `create-user.usecase.test.ts` | สำเร็จ (hash + active), email ซ้ำ → 409, studentOrStaffId ซ้ำ → 409, branchId ไม่มี → 404, password >72 bytes → 400 |
| `update-user.usecase.test.ts` | สำเร็จ, actorId==id เปลี่ยนบทบาท/สถานะ → 403, studentOrStaffId ซ้ำ → 409, not found → 404 |
| `user.schema.test.ts` | validation 422: email format ผิด, password <8 |
| `user.controller.test.ts` | routes รับ/ส่ง + guard role ถูกต้อง |

### 6.2 Web unit (Vitest)

- `members.store.test.ts`: fetch success/error, create → refresh, update → แทนที่ใน list, reset
- `route-guard.test.ts`: 3 กรณี — ไม่ login ไป protected → login URL, login ไป /login → dashboard, ที่เหลือ → null

### 6.3 E2E (Playwright)

- **members spec**: login admin → /members → เห็นตาราง → search → เพิ่มสมาชิก → เห็นในตาราง → แก้ไขสถานะ → badge เปลี่ยน
- **guard spec**: ไม่ login → เข้า /dashboard และ /members → redirect /login
- **fixtures cleanup**: user ที่สร้างใน spec ถูกลบ (ต่อท้าย cleanup เดิม: loans→reservations→copies→books→users)

---

## 7. Known Limitations (จดไว้เป็นข้อตกลง)

1. **ลืมรหัสผ่าน** → แก้ DB โดยตรง (ยังไม่มี reset password flow)
2. **ไม่มีลบสมาชิก** — ใช้ suspended แทน
3. **admin/librarian เท่านั้น** ที่ใช้หน้า members ได้ (guard role)

---

## 8. Verification

| รายการ | คำสั่ง |
| ------ | ------ |
| Server unit | `bun run test` (ใน `server/`) |
| Web unit | `bun run test` (ใน `app/` หรือ root) |
| Lint | `bun run lint` |
| E2E | `bun run e2e` (Playwright) — run spec ที่แก้ก่อน |
| Manual | dev server: login admin → ทดสอบ CRUD + guard |

---

## 9. สรุปการตัดสินใจ (จาก brainstorming)

| คำถาม | การตัดสินใจ |
| ----- | ----------- |
| ขอบเขต | เพิ่ม + แก้ไข + เปลี่ยนสถานะ, **ไม่มีลบ** |
| ใครสร้างได้บ้าง | ทุกบทบาทรวม admin (ยกเว้นจัดการตัวเอง) |
| รหัสผ่าน | admin ตั้งให้ในฟอร์ม (บังคับ ≥8), ไม่มีช่องแก้ตอน edit |
| ฟอร์มบังคับอะไร | email / fullName / role / password เท่านั้น |
| UI แบบไหน | แบบ catalog: ตาราง + search + filter + dialog |
| แก้ไขอะไรได้ | ข้อมูลทั่วไป + สถานะ (dropdown 4 แบบ) |
| Route guard | เพิ่ม middleware.ts ในงานนี้ด้วย |
| แนวทางรวม | **Mirror Catalog** — server เพิ่ม usecases/routes, web mirror feature folder catalog, + middleware |
