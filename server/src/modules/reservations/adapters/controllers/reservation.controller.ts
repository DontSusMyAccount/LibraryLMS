import "reflect-metadata";

import { Elysia } from "elysia";
import { inject, injectable } from "tsyringe";

import { authPlugin } from "../../../auth.plugin";
import { TOKENS } from "../../../tokens";
import type {
  ICreateReservationCommand,
  IFulfillCommand,
  IListReservationsQuery,
  IMarkReadyCommand,
} from "../../applications/schemas/reservation-schemas";
import { CreateReservationUsecase } from "../../applications/usecases/create-reservation.usecase";
import { ExpireOverdueUsecase } from "../../applications/usecases/expire.usecase";
import { FulfillUsecase } from "../../applications/usecases/fulfill.usecase";
import { ListReservationsUsecase } from "../../applications/usecases/list-reservations.usecase";
import { MarkReadyUsecase } from "../../applications/usecases/mark-ready.usecase";
import {
  createReservationBodySchema,
  createReservationSuccessResponseSchema,
  expireOverdueSuccessResponseSchema,
  fulfillBodySchema,
  fulfillSuccessResponseSchema,
  listReservationsQuerySchema,
  listReservationsSuccessResponseSchema,
  markReadySuccessResponseSchema,
  reservationErrorResponseSchema,
  reservationIdParamsSchema,
} from "./schemas/reservation.schema";

@injectable()
export class ReservationController {
  constructor(
    @inject(CreateReservationUsecase)
    private readonly createReservationUsecase: CreateReservationUsecase,
    @inject(ListReservationsUsecase)
    private readonly listReservationsUsecase: ListReservationsUsecase,
    @inject(MarkReadyUsecase) private readonly markReadyUsecase: MarkReadyUsecase,
    @inject(FulfillUsecase) private readonly fulfillUsecase: FulfillUsecase,
    @inject(ExpireOverdueUsecase) private readonly expireOverdueUsecase: ExpireOverdueUsecase,
    @inject(TOKENS.JwtSecret) private readonly jwtSecret: string,
    @inject(TOKENS.InternalSecret) private readonly internalSecret: string,
  ) {}

  getRoutes() {
    return new Elysia({ prefix: "/reservations" })
      .use(authPlugin({ jwtSecret: this.jwtSecret, internalSecret: this.internalSecret }))
      .guard({ role: ["admin", "librarian"] }, (app) =>
        app
          .post("/", ({ body, user }) => this.create(body, user), {
            body: createReservationBodySchema,
            response: {
              200: createReservationSuccessResponseSchema,
              404: reservationErrorResponseSchema,
              403: reservationErrorResponseSchema,
              409: reservationErrorResponseSchema,
            },
            detail: {
              tags: ["Reservations"],
              summary: "จองหนังสือ (เข้าคิว FIFO)",
              description: "สมาชิกจองหนังสือเล่มที่ถูกยืมอยู่ เข้าคิวตามลำดับการจอง",
            },
          })
          .get("/", ({ query }) => this.list(query), {
            query: listReservationsQuerySchema,
            response: {
              200: listReservationsSuccessResponseSchema,
            },
            detail: {
              tags: ["Reservations"],
              summary: "รายการจองทั้งหมด (กรองตามสถานะ/แบ่งหน้า)",
              description: "รายการจองหนังสือสำหรับการจัดการคิว",
            },
          })
          .put("/:id/ready", ({ params, user }) => this.markReady(params, user), {
            params: reservationIdParamsSchema,
            response: {
              200: markReadySuccessResponseSchema,
              404: reservationErrorResponseSchema,
              409: reservationErrorResponseSchema,
            },
            detail: {
              tags: ["Reservations"],
              summary: "กำหนดรายการจองพร้อมให้ยืม (mark ready)",
              description: "เปลี่ยนสถานะเป็น ready พร้อมตั้ง pickup deadline ตาม system settings",
            },
          })
          .post("/:id/fulfill", ({ params, body, user }) => this.fulfill(params, body, user), {
            params: reservationIdParamsSchema,
            body: fulfillBodySchema,
            response: {
              200: fulfillSuccessResponseSchema,
              404: reservationErrorResponseSchema,
              409: reservationErrorResponseSchema,
            },
            detail: {
              tags: ["Reservations"],
              summary: "รับหนังสือที่จอง (fulfill)",
              description: "ผูกกับการยืมจริงที่สร้างแล้ว (fulfilledLoanId) แล้วปิดรายการจอง",
            },
          })
          .post("/expire-overdue", ({ user }) => this.expireOverdue(user), {
            response: {
              200: expireOverdueSuccessResponseSchema,
            },
            detail: {
              tags: ["Reservations"],
              summary: "หมดอายุกำหนดมารับ (sweep)",
              description: "รายการ ready ที่เลย pickup deadline → expired และเลื่อนคนถัดไปในคิว",
            },
          }),
      );
  }

  private async create(body: ICreateReservationCommand, user: { id: string }) {
    const result = await this.createReservationUsecase.execute({
      command: body,
      actorId: user.id,
    });
    return { success: true as const, data: result };
  }

  private async list(query: IListReservationsQuery) {
    const result = await this.listReservationsUsecase.execute({ query });
    return { success: true as const, ...result };
  }

  private async markReady(params: IMarkReadyCommand, user: { id: string }) {
    const result = await this.markReadyUsecase.execute({
      command: params,
      actorId: user.id,
    });
    return { success: true as const, data: result };
  }

  private async fulfill(params: { id: string }, body: { loanId: string }, user: { id: string }) {
    const command: IFulfillCommand = { id: params.id, loanId: body.loanId };
    const result = await this.fulfillUsecase.execute({
      command,
      actorId: user.id,
    });
    return { success: true as const, data: result };
  }

  private async expireOverdue(user: { id: string }) {
    const result = await this.expireOverdueUsecase.execute({ actorId: user.id });
    return { success: true as const, data: result };
  }
}
