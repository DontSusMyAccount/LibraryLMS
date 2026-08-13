import "reflect-metadata";

import { Elysia } from "elysia";
import { inject, injectable } from "tsyringe";

import { authPlugin } from "../../../auth.plugin";
import { TOKENS } from "../../../tokens";
import type { ICheckinCommand, ICheckoutCommand } from "../../applications/schemas/loan-schemas";
import { CheckinUsecase } from "../../applications/usecases/checkin.usecase";
import { CheckoutUsecase } from "../../applications/usecases/checkout.usecase";
import { ListActiveLoansUsecase } from "../../applications/usecases/list-active-loans.usecase";
import { RecallUsecase } from "../../applications/usecases/recall.usecase";
import { RenewUsecase } from "../../applications/usecases/renew.usecase";
import {
  checkinBodySchema,
  checkinSuccessResponseSchema,
  checkoutBodySchema,
  checkoutSuccessResponseSchema,
  listActiveLoansQuerySchema,
  listActiveLoansSuccessResponseSchema,
  loanErrorResponseSchema,
  loanIdParamsSchema,
  recallSuccessResponseSchema,
  renewSuccessResponseSchema,
} from "./schemas/loan.schema";

@injectable()
export class LoanController {
  constructor(
    @inject(CheckoutUsecase) private readonly checkoutUsecase: CheckoutUsecase,
    @inject(CheckinUsecase) private readonly checkinUsecase: CheckinUsecase,
    @inject(RenewUsecase) private readonly renewUsecase: RenewUsecase,
    @inject(RecallUsecase) private readonly recallUsecase: RecallUsecase,
    @inject(ListActiveLoansUsecase)
    private readonly listActiveLoansUsecase: ListActiveLoansUsecase,
    @inject(TOKENS.JwtSecret) private readonly jwtSecret: string,
    @inject(TOKENS.InternalSecret) private readonly internalSecret: string,
  ) {}

  getRoutes() {
    return new Elysia({ prefix: "/circulation" })
      .use(authPlugin({ jwtSecret: this.jwtSecret, internalSecret: this.internalSecret }))
      .guard({ role: ["admin", "librarian"] }, (app) =>
        app
          .post("/checkout", ({ body, user }) => this.checkout(body, user), {
            body: checkoutBodySchema,
            response: {
              200: checkoutSuccessResponseSchema,
              404: loanErrorResponseSchema,
              403: loanErrorResponseSchema,
              409: loanErrorResponseSchema,
            },
            detail: {
              tags: ["Circulation"],
              summary: "ยืมหนังสือ (checkout)",
              description: "ตรวจสิทธิ์สมาชิก + นโยบายการยืม แล้วสร้างรายการยืมพร้อม snapshot",
            },
          })
          .post("/checkin", ({ body, user }) => this.checkin(body, user), {
            body: checkinBodySchema,
            response: {
              200: checkinSuccessResponseSchema,
              404: loanErrorResponseSchema,
              409: loanErrorResponseSchema,
            },
            detail: {
              tags: ["Circulation"],
              summary: "คืนหนังสือ (checkin)",
              description: "คืนแล้วคำนวณค่าปรับ overdue หลัง grace (ถ้ามี)",
            },
          })
          .post("/loans/:id/renew", ({ params, user }) => this.renew(params, user), {
            params: loanIdParamsSchema,
            response: {
              200: renewSuccessResponseSchema,
              403: loanErrorResponseSchema,
              404: loanErrorResponseSchema,
            },
            detail: {
              tags: ["Circulation"],
              summary: "ต่ออายุการยืม",
              description: "ต่อไม่ได้ถ้าเกินจำนวนครั้ง หรือมีคิวจองหนังสือเล่มนี้อยู่",
            },
          })
          .post("/loans/:id/recall", ({ params, user }) => this.recall(params, user), {
            params: loanIdParamsSchema,
            response: {
              200: recallSuccessResponseSchema,
              404: loanErrorResponseSchema,
            },
            detail: {
              tags: ["Circulation"],
              summary: "เรียกคืนหนังสือก่อนกำหนด (recall)",
              description: "ย่นวันกำหนดคืนเหลือ now + recall buffer days",
            },
          })
          .get("/loans/active", ({ query }) => this.listActive(query), {
            query: listActiveLoansQuerySchema,
            response: {
              200: listActiveLoansSuccessResponseSchema,
              404: loanErrorResponseSchema,
            },
            detail: {
              tags: ["Circulation"],
              summary: "รายการยืมที่ยังค้างของสมาชิก",
              description: "สำหรับ dashboard / การ์ดสมาชิก พร้อมสถานะ overdue",
            },
          }),
      );
  }

  private async checkout(body: ICheckoutCommand, user: { id: string }) {
    const result = await this.checkoutUsecase.execute({
      command: body,
      actorId: user.id,
    });
    return { success: true as const, data: result };
  }

  private async checkin(body: ICheckinCommand, user: { id: string }) {
    const result = await this.checkinUsecase.execute({
      command: body,
      actorId: user.id,
    });
    return { success: true as const, data: result };
  }

  private async renew(params: { id: string }, user: { id: string }) {
    const result = await this.renewUsecase.execute({
      command: params,
      actorId: user.id,
    });
    return { success: true as const, data: result };
  }

  private async recall(params: { id: string }, user: { id: string }) {
    const result = await this.recallUsecase.execute({
      command: params,
      actorId: user.id,
    });
    return { success: true as const, data: result };
  }

  private async listActive(query: { userId: string }) {
    const result = await this.listActiveLoansUsecase.execute({ query });
    return { success: true as const, data: result };
  }
}
