import "reflect-metadata";

import { Elysia } from "elysia";
import { inject, injectable } from "tsyringe";

import { authPlugin } from "../../../auth.plugin";
import { TOKENS } from "../../../tokens";
import type {
  ICreateMyReservationCommand,
  ISelfCheckoutCommand,
} from "../../applications/schemas/me-schemas";
import { CancelMyReservationUsecase } from "../../applications/usecases/cancel-my-reservation.usecase";
import { CreateMyReservationUsecase } from "../../applications/usecases/create-my-reservation.usecase";
import { GetMeUsecase } from "../../applications/usecases/get-me.usecase";
import { ListMyFinesUsecase } from "../../applications/usecases/list-my-fines.usecase";
import { ListMyLoansUsecase } from "../../applications/usecases/list-my-loans.usecase";
import { ListMyReservationsUsecase } from "../../applications/usecases/list-my-reservations.usecase";
import { RenewMyLoanUsecase } from "../../applications/usecases/renew-my-loan.usecase";
import { SelfCheckoutUsecase } from "../../applications/usecases/self-checkout.usecase";
import {
  cancelMyReservationResponseSchema,
  createMyReservationBodySchema,
  createMyReservationResponseSchema,
  listMyFinesResponseSchema,
  listMyLoansResponseSchema,
  listMyReservationsResponseSchema,
  loanIdParamsSchema,
  meErrorResponseSchema,
  meProfileResponseSchema,
  renewMyLoanResponseSchema,
  reservationIdParamsSchema,
  selfCheckoutBodySchema,
  selfCheckoutResponseSchema,
} from "./schemas/me.schema";

/** Role ที่ใช้ portal ฝั่งผู้ยืม (self-service) */
const BORROWER_ROLES = ["faculty", "staff", "student"] as const;

@injectable()
export class MeController {
  constructor(
    @inject(GetMeUsecase) private readonly getMeUsecase: GetMeUsecase,
    @inject(ListMyLoansUsecase) private readonly listMyLoansUsecase: ListMyLoansUsecase,
    @inject(RenewMyLoanUsecase) private readonly renewMyLoanUsecase: RenewMyLoanUsecase,
    @inject(ListMyReservationsUsecase)
    private readonly listMyReservationsUsecase: ListMyReservationsUsecase,
    @inject(CreateMyReservationUsecase)
    private readonly createMyReservationUsecase: CreateMyReservationUsecase,
    @inject(CancelMyReservationUsecase)
    private readonly cancelMyReservationUsecase: CancelMyReservationUsecase,
    @inject(ListMyFinesUsecase) private readonly listMyFinesUsecase: ListMyFinesUsecase,
    @inject(SelfCheckoutUsecase) private readonly selfCheckoutUsecase: SelfCheckoutUsecase,
    @inject(TOKENS.JwtSecret) private readonly jwtSecret: string,
    @inject(TOKENS.InternalSecret) private readonly internalSecret: string,
  ) {}

  getRoutes() {
    return new Elysia({ prefix: "/me" })
      .use(authPlugin({ jwtSecret: this.jwtSecret, internalSecret: this.internalSecret }))
      .guard({ role: [...BORROWER_ROLES] }, (app) =>
        app
          .get("/", ({ user }) => this.getMe(user.id), {
            response: {
              200: meProfileResponseSchema,
              404: meErrorResponseSchema,
            },
            detail: {
              tags: ["Me"],
              summary: "ข้อมูลโปรไฟล์ของตัวเอง + policy + ยอดค่าปรับ",
              description: "ฝั่งผู้ยืม (student/faculty/staff) — IDOR-safe: ใช้ user จาก session",
            },
          })
          .get("/loans", ({ user }) => this.listMyLoans(user.id), {
            response: {
              200: listMyLoansResponseSchema,
              404: meErrorResponseSchema,
            },
            detail: {
              tags: ["Me"],
              summary: "รายการยืมของตัวเอง (active + ประวัติ)",
              description: "พร้อมสถานะ overdue และสิทธิ์ต่ออายุ",
            },
          })
          .post("/loans/:id/renew", ({ params, user }) => this.renewMyLoan(params.id, user.id), {
            params: loanIdParamsSchema,
            response: {
              200: renewMyLoanResponseSchema,
              403: meErrorResponseSchema,
              404: meErrorResponseSchema,
            },
            detail: {
              tags: ["Me"],
              summary: "ต่ออายุการยืมของตัวเอง",
              description: "เช็คว่าเป็นของตัวเอง + จำนวนครั้ง/คิวจอง (domain เดิม)",
            },
          })
          .get("/reservations", ({ user }) => this.listMyReservations(user.id), {
            response: {
              200: listMyReservationsResponseSchema,
              404: meErrorResponseSchema,
            },
            detail: {
              tags: ["Me"],
              summary: "คิวจองของตัวเอง",
              description: "พร้อมชื่อหนังสือและสถานะคิว",
            },
          })
          .post("/reservations", ({ body, user }) => this.createMyReservation(body, user.id), {
            body: createMyReservationBodySchema,
            response: {
              200: createMyReservationResponseSchema,
              403: meErrorResponseSchema,
              404: meErrorResponseSchema,
              409: meErrorResponseSchema,
            },
            detail: {
              tags: ["Me"],
              summary: "จองหนังสือด้วยตัวเอง (เข้าคิว FIFO)",
              description: "จองซ้ำ → 409",
            },
          })
          .delete(
            "/reservations/:id",
            ({ params, user }) => this.cancelMyReservation(params.id, user.id),
            {
              params: reservationIdParamsSchema,
              response: {
                200: cancelMyReservationResponseSchema,
                403: meErrorResponseSchema,
                404: meErrorResponseSchema,
                409: meErrorResponseSchema,
              },
              detail: {
                tags: ["Me"],
                summary: "ยกเลิกคิวจองของตัวเอง (เฉพาะ waiting)",
                description: "ยกเลิกได้เฉพาะสถานะ waiting",
              },
            },
          )
          .get("/fines", ({ user }) => this.listMyFines(user.id), {
            response: {
              200: listMyFinesResponseSchema,
              404: meErrorResponseSchema,
            },
            detail: {
              tags: ["Me"],
              summary: "ค่าปรับของตัวเอง + ยอดค้างรวม",
              description: "แสดงเฉพาะรายการของตัวเอง",
            },
          })
          .post("/checkout", ({ body, user }) => this.selfCheckout(body, user.id), {
            body: selfCheckoutBodySchema,
            response: {
              200: selfCheckoutResponseSchema,
              403: meErrorResponseSchema,
              404: meErrorResponseSchema,
              409: meErrorResponseSchema,
            },
            detail: {
              tags: ["Me"],
              summary: "ยืมหนังสือด้วยตัวเอง (self-checkout)",
              description: "ใช้ policy ตาม role เดียวกับเคาน์เตอร์ — checked_out_by = ตัวเอง",
            },
          }),
      );
  }

  private async getMe(userId: string) {
    const result = await this.getMeUsecase.execute({ query: { userId } });
    return { success: true as const, data: result };
  }

  private async listMyLoans(userId: string) {
    const result = await this.listMyLoansUsecase.execute({ query: { userId } });
    return { success: true as const, data: result };
  }

  private async renewMyLoan(id: string, userId: string) {
    const result = await this.renewMyLoanUsecase.execute({
      command: { id, userId },
    });
    return { success: true as const, data: result };
  }

  private async listMyReservations(userId: string) {
    const result = await this.listMyReservationsUsecase.execute({ query: { userId } });
    return { success: true as const, data: result };
  }

  private async createMyReservation(body: { bookId: string }, userId: string) {
    const command: ICreateMyReservationCommand = { bookId: body.bookId, userId };
    const result = await this.createMyReservationUsecase.execute({ command });
    return { success: true as const, data: result };
  }

  private async cancelMyReservation(id: string, userId: string) {
    const result = await this.cancelMyReservationUsecase.execute({
      command: { id, userId },
      actorId: userId,
    });
    return { success: true as const, data: result };
  }

  private async listMyFines(userId: string) {
    const result = await this.listMyFinesUsecase.execute({ query: { userId } });
    return { success: true as const, data: result };
  }

  private async selfCheckout(body: { copyCode: string }, userId: string) {
    const command: ISelfCheckoutCommand = { copyCode: body.copyCode, userId };
    const result = await this.selfCheckoutUsecase.execute({
      command,
      actorId: userId,
    });
    return { success: true as const, data: result };
  }
}
