# Backend Architecture and Clean Code Cleanup Design

## Goal

ปรับปรุง backend ให้สอดคล้องกับ Hexagonal Architecture, CQRS และ Clean Code โดยคง endpoint, response, error behavior และ business behavior เดิมทั้งหมด

## Scope

- แยก audit application port ออกจาก `catalog` เพื่อไม่ให้ module อื่นพึ่งพา catalog โดยตรง
- ลด usecase แบบ pass-through ของ `me` และแทนการเรียก concrete usecase ข้าม module ด้วย application boundary ที่ชัดเจน
- ปรับชื่อ read-side contract จาก `Command` เป็น `Query` และทำ naming ให้สม่ำเสมอ
- ลบ production schema export ที่ไม่มี consumer จริง
- ลด nested conditional ที่ไม่จำเป็นโดยแยก helper ที่สื่อ business rule
- ตรวจสอบ dependency graph และ behavior เดิมด้วย unit/integration/type checks

## Architecture

`AuditPort` จะอยู่ที่ `modules/shared/applications/ports` ส่วน `DrizzleAuditRepository` ยังคงอยู่ใน adapter/infrastructure และถูก register ผ่าน DI กลาง การย้ายนี้เป็นการย้าย abstraction เท่านั้น ไม่เปลี่ยน storage implementation

Self-service flows จะยังตรวจ ownership และ actor context ที่ `me` boundary แต่จะไม่ import concrete usecase จาก `circulation` หรือ `reservations` โดยตรง การ reuse business behavior จะผ่าน port/handler boundary ที่ทดสอบได้และไม่สร้าง dependency กลับไปยัง presentation layer

## CQRS Naming

- Read contracts ใช้ `I*Query` และ parameter ชื่อ `query`
- Write contracts ใช้ `I*Command` และ parameter ชื่อ `command`
- เปลี่ยนเฉพาะชื่อและ type references ไม่เปลี่ยน payload shape หรือ route contract

## Cleanup Rules

- ลบเฉพาะ export ที่ไม่มี production consumer และไม่ใช่ shared public contract
- ไม่ลบ domain helper ที่ใช้โดย test หรือ shared package
- แยก nested validation เป็น helper เมื่อช่วยให้ business flow อ่านเป็น guard sequence ชัดขึ้น
- ไม่รวม controller เพียงเพราะมีหลาย route หากแต่ละ method ยังเป็น adapter mapping ที่ชัดเจน

## Verification

- Targeted unit tests ต้องผ่านก่อนและหลัง refactor แต่ละ slice
- `npx tsc --noEmit -p server/tsconfig.json --pretty false`
- `npm run test:unit`
- `npm run test:integration` เมื่อ environment พร้อม
- `npx oxlint server/src`
- ตรวจ API route และ response schema เดิมด้วย integration/security tests

## Risks

- tsyringe registrations อาจ resolve ซ้ำหรือ resolve token ผิดหลังย้าย audit token
- การแยก self-service boundary อาจทำให้ actor/ownership check ถูกข้าม หากย้ายผิดชั้น
- การ rename CQRS contracts อาจกระทบ test imports และ shared type consumers
