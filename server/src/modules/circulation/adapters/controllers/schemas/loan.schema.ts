import { Type } from "@sinclair/typebox";

import {
  errorResponseSchema,
  successResponseSchema,
} from "../../../../shared/schemas/response.schema";

const loanStatusSchema = Type.Union([
  Type.Literal("active"),
  Type.Literal("returned"),
  Type.Literal("overdue"),
  Type.Literal("lost"),
]);

const fineReasonSchema = Type.Union([
  Type.Literal("overdue"),
  Type.Literal("lost"),
  Type.Literal("damaged"),
]);

export const loanRecordSchema = Type.Object(
  {
    id: Type.String({ description: "รหัสรายการยืม" }),
    copyId: Type.String({ description: "รหัสสำเนาหนังสือ" }),
    userId: Type.String({ description: "รหัสสมาชิกผู้ยืม" }),
    courseReserveId: Type.Optional(Type.String({ description: "รหัสหนังสือสำรองวิชา" })),
    borrowedAt: Type.String({ description: "เวลาที่ยืม" }),
    dueAt: Type.String({ description: "เวลากำหนดคืน" }),
    returnedAt: Type.Optional(Type.String({ description: "เวลาที่คืนจริง" })),
    status: loanStatusSchema,
    renewedCount: Type.Number({ description: "จำนวนครั้งที่ต่ออายุ" }),
    recalledAt: Type.Optional(Type.String({ description: "เวลาที่ถูกเรียกคืนก่อนกำหนด" })),
    loanPeriodDays: Type.Number({ description: "จำนวนวันที่ให้ยืม (snapshot ตอนยืม)" }),
    dailyFineRate: Type.Number({ description: "อัตราค่าปรับรายวัน (snapshot ตอนยืม)" }),
    checkedOutBy: Type.Optional(Type.String({ description: "รหัสผู้ดำเนินการยืม" })),
    checkedInBy: Type.Optional(Type.String({ description: "รหัสผู้ดำเนินการคืน" })),
    createdAt: Type.String({ description: "เวลาที่สร้างรายการ" }),
  },
  { description: "รายการยืม-คืน" },
);

export const fineRecordSchema = Type.Object(
  {
    id: Type.String({ description: "รหัสค่าปรับ" }),
    loanId: Type.Optional(Type.String({ description: "รหัสรายการยืมที่เกี่ยวข้อง" })),
    userId: Type.String({ description: "รหัสสมาชิกที่ถูกปรับ" }),
    amount: Type.Number({ description: "จำนวนค่าปรับ" }),
    reason: fineReasonSchema,
    paid: Type.Boolean({ description: "ชำระแล้วหรือยัง" }),
    paidAt: Type.Optional(Type.String({ description: "เวลาที่ชำระ" })),
    waived: Type.Boolean({ description: "ยกเว้นค่าปรับแล้วหรือยัง" }),
    createdAt: Type.String({ description: "เวลาที่สร้างรายการ" }),
  },
  { description: "รายการค่าปรับ" },
);

const loanWithDueDateSchema = Type.Object({
  loan: loanRecordSchema,
  dueDate: Type.String({ description: "วันกำหนดคืน (อาจถูก recall/ต่ออายุปรับแล้ว)" }),
});

const checkinResultSchema = Type.Object({
  loan: loanRecordSchema,
  fine: Type.Optional(fineRecordSchema),
});

const activeLoanItemSchema = Type.Object({
  loan: loanRecordSchema,
  overdue: Type.Boolean({ description: "เกินกำหนด (เลย grace) หรือไม่" }),
  daysOverdue: Type.Number({ description: "จำนวนวันที่เกินกำหนด (หลัง grace)" }),
});

const activeLoanListSchema = Type.Object({
  loans: Type.Array(activeLoanItemSchema),
});

export const checkoutBodySchema = Type.Object(
  {
    userId: Type.String({ minLength: 1, description: "รหัสสมาชิก (uuid)" }),
    copyCode: Type.String({ minLength: 1, description: "รหัสสำเนาหนังสือ (สแกน/พิมพ์)" }),
  },
  { description: "ข้อมูลการยืมหนังสือ" },
);

export const checkinBodySchema = Type.Object(
  {
    copyCode: Type.String({ minLength: 1, description: "รหัสสำเนาหนังสือ (สแกน/พิมพ์)" }),
  },
  { description: "ข้อมูลการคืนหนังสือ" },
);

export const loanIdParamsSchema = Type.Object({
  id: Type.String({ minLength: 1, description: "รหัสรายการยืม (uuid)" }),
});

export const listActiveLoansQuerySchema = Type.Object({
  userId: Type.String({ minLength: 1, description: "รหัสสมาชิก (uuid)" }),
});

export const checkoutSuccessResponseSchema = successResponseSchema(loanWithDueDateSchema);
export const checkinSuccessResponseSchema = successResponseSchema(checkinResultSchema);
export const renewSuccessResponseSchema = successResponseSchema(loanWithDueDateSchema);
export const recallSuccessResponseSchema = successResponseSchema(loanWithDueDateSchema);
export const listActiveLoansSuccessResponseSchema = successResponseSchema(activeLoanListSchema);

export const loanErrorResponseSchema = errorResponseSchema;
