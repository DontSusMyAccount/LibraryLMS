import { Type } from "@sinclair/typebox";

import { DEFAULT_PAGE, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from "../../../../../shared";
import {
  errorResponseSchema,
  paginatedResponseSchema,
  successResponseSchema,
} from "../../../../shared/schemas/response.schema";

const reservationStatusSchema = Type.Union([
  Type.Literal("waiting"),
  Type.Literal("ready"),
  Type.Literal("fulfilled"),
  Type.Literal("expired"),
  Type.Literal("cancelled"),
  Type.Literal("suspended"),
]);

export const reservationRecordSchema = Type.Object(
  {
    id: Type.String({ description: "รหัสรายการจอง" }),
    bookId: Type.String({ description: "รหัสหนังสือ" }),
    userId: Type.String({ description: "รหัสสมาชิกผู้จอง" }),
    branchId: Type.Optional(Type.String({ description: "รหัสสาขา" })),
    status: reservationStatusSchema,
    reservedAt: Type.String({ description: "เวลาที่จอง (เข้าแถวคิว)" }),
    readyAt: Type.Optional(Type.String({ description: "เวลาที่หนังสือพร้อมให้ยืม" })),
    pickupDeadline: Type.Optional(Type.String({ description: "กำหนดมารับภายใน" })),
    fulfilledLoanId: Type.Optional(Type.String({ description: "รหัสรายการยืมที่รับไป" })),
    createdAt: Type.String({ description: "เวลาที่สร้างรายการ" }),
  },
  { description: "รายการจองหนังสือ" },
);

export const createReservationBodySchema = Type.Object(
  {
    bookId: Type.String({ minLength: 1, description: "รหัสหนังสือ (uuid)" }),
    userId: Type.String({ minLength: 1, description: "รหัสสมาชิก (uuid)" }),
    branchId: Type.Optional(Type.String({ description: "รหัสสาขา (uuid)" })),
  },
  { description: "ข้อมูลการจองหนังสือ" },
);

export const listReservationsQuerySchema = Type.Object({
  status: Type.Optional(reservationStatusSchema),
  page: Type.Optional(Type.Number({ minimum: 1, default: DEFAULT_PAGE, description: "เลขหน้า" })),
  limit: Type.Optional(
    Type.Number({
      minimum: 1,
      maximum: MAX_PAGE_SIZE,
      default: DEFAULT_PAGE_SIZE,
      description: "จำนวนต่อหน้า",
    }),
  ),
});

export const reservationIdParamsSchema = Type.Object({
  id: Type.String({ minLength: 1, description: "รหัสรายการจอง (uuid)" }),
});

export const fulfillBodySchema = Type.Object(
  {
    loanId: Type.String({ minLength: 1, description: "รหัสรายการยืม (uuid) ที่สร้างตอนยืม" }),
  },
  { description: "ข้อมูลการรับหนังสือที่จอง" },
);

export const createReservationSuccessResponseSchema = successResponseSchema(
  Type.Object({ reservation: reservationRecordSchema }),
);
export const listReservationsSuccessResponseSchema =
  paginatedResponseSchema(reservationRecordSchema);
export const markReadySuccessResponseSchema = successResponseSchema(
  Type.Object({ reservation: reservationRecordSchema }),
);
export const fulfillSuccessResponseSchema = successResponseSchema(
  Type.Object({ reservation: reservationRecordSchema }),
);
export const expireOverdueSuccessResponseSchema = successResponseSchema(
  Type.Object({
    expiredCount: Type.Number({ description: "จำนวนรายการจองที่หมดอายุ" }),
    promotedCount: Type.Number({ description: "จำนวนรายการถัดไปที่ถูกเลื่อนเป็น ready" }),
  }),
);

export const reservationErrorResponseSchema = errorResponseSchema;
