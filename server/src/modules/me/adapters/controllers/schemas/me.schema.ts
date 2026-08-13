import { Type } from "@sinclair/typebox";

import {
  errorResponseSchema,
  successResponseSchema,
} from "../../../../shared/schemas/response.schema";
import { userPublicSchema } from "../../../../users/adapters/controllers/schemas/user.schema";

const loanStatusSchema = Type.Union([
  Type.Literal("active"),
  Type.Literal("returned"),
  Type.Literal("overdue"),
  Type.Literal("lost"),
]);

const reservationStatusSchema = Type.Union([
  Type.Literal("waiting"),
  Type.Literal("ready"),
  Type.Literal("fulfilled"),
  Type.Literal("expired"),
  Type.Literal("cancelled"),
  Type.Literal("suspended"),
]);

const fineReasonSchema = Type.Union([
  Type.Literal("overdue"),
  Type.Literal("lost"),
  Type.Literal("damaged"),
]);

const loanSchema = Type.Object({
  id: Type.String(),
  copyId: Type.String(),
  userId: Type.String(),
  courseReserveId: Type.Optional(Type.String()),
  borrowedAt: Type.String(),
  dueAt: Type.String(),
  returnedAt: Type.Optional(Type.String()),
  status: loanStatusSchema,
  renewedCount: Type.Number(),
  recalledAt: Type.Optional(Type.String()),
  loanPeriodDays: Type.Number(),
  dailyFineRate: Type.Number(),
  checkedOutBy: Type.Optional(Type.String()),
  checkedInBy: Type.Optional(Type.String()),
  createdAt: Type.String(),
});

const reservationSchema = Type.Object({
  id: Type.String(),
  bookId: Type.String(),
  userId: Type.String(),
  branchId: Type.Optional(Type.String()),
  status: reservationStatusSchema,
  reservedAt: Type.String(),
  readyAt: Type.Optional(Type.String()),
  pickupDeadline: Type.Optional(Type.String()),
  fulfilledLoanId: Type.Optional(Type.String()),
  createdAt: Type.String(),
});

const fineSchema = Type.Object({
  id: Type.String(),
  loanId: Type.Optional(Type.String()),
  userId: Type.String(),
  amount: Type.Number(),
  reason: fineReasonSchema,
  paid: Type.Boolean(),
  paidAt: Type.Optional(Type.String()),
  waived: Type.Boolean(),
  createdAt: Type.String(),
});

const policySchema = Type.Object({
  id: Type.String(),
  role: Type.Union([
    Type.Literal("admin"),
    Type.Literal("librarian"),
    Type.Literal("faculty"),
    Type.Literal("staff"),
    Type.Literal("student"),
  ]),
  memberType: Type.Union([
    Type.Literal("general"),
    Type.Literal("undergraduate"),
    Type.Literal("graduate"),
  ]),
  maxActiveLoans: Type.Number(),
  loanPeriodDays: Type.Number(),
  maxRenewals: Type.Number(),
  gracePeriodDays: Type.Number(),
  dailyFineRate: Type.Number(),
  maxUnpaidFine: Type.Number(),
  createdAt: Type.String(),
});

export const meProfileResponseSchema = successResponseSchema(
  Type.Object({
    user: userPublicSchema,
    policy: Type.Union([policySchema, Type.Null()]),
    unpaidFineTotal: Type.Number(),
    activeLoanCount: Type.Number(),
  }),
);

const myLoanItemSchema = Type.Object({
  loan: loanSchema,
  bookId: Type.String(),
  bookTitle: Type.String(),
  bookCoverUrl: Type.Optional(Type.String()),
  copyCode: Type.String(),
  overdue: Type.Boolean(),
  daysOverdue: Type.Number(),
  canRenew: Type.Boolean(),
});

export const listMyLoansResponseSchema = successResponseSchema(
  Type.Object({
    loans: Type.Array(myLoanItemSchema),
  }),
);

export const renewMyLoanResponseSchema = successResponseSchema(
  Type.Object({
    loan: loanSchema,
    dueDate: Type.String(),
  }),
);

const myReservationItemSchema = Type.Object({
  reservation: reservationSchema,
  bookTitle: Type.String(),
  bookCoverUrl: Type.Optional(Type.String()),
});

export const listMyReservationsResponseSchema = successResponseSchema(
  Type.Object({
    reservations: Type.Array(myReservationItemSchema),
  }),
);

export const createMyReservationResponseSchema = successResponseSchema(
  Type.Object({
    reservation: reservationSchema,
  }),
);

export const cancelMyReservationResponseSchema = createMyReservationResponseSchema;

export const listMyFinesResponseSchema = successResponseSchema(
  Type.Object({
    fines: Type.Array(fineSchema),
    unpaidTotal: Type.Number(),
  }),
);

export const selfCheckoutResponseSchema = renewMyLoanResponseSchema;

export const createMyReservationBodySchema = Type.Object({
  bookId: Type.String({ minLength: 1, description: "รหัสหนังสือ" }),
});

export const selfCheckoutBodySchema = Type.Object({
  copyCode: Type.String({ minLength: 1, description: "รหัสสำเนาหนังสือ" }),
});

export const loanIdParamsSchema = Type.Object({
  id: Type.String({ format: "uuid", minLength: 1 }),
});

export const reservationIdParamsSchema = Type.Object({
  id: Type.String({ format: "uuid", minLength: 1 }),
});

export const meErrorResponseSchema = errorResponseSchema;
