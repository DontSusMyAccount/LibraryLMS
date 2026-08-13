import "reflect-metadata";

import { inject, injectable } from "tsyringe";

import { CheckoutUsecase } from "../../../circulation/applications/usecases/checkout.usecase";
import type { ISelfCheckoutCommand, ISelfCheckoutResult } from "../schemas/me-schemas";

@injectable()
export class SelfCheckoutUsecase {
  constructor(@inject(CheckoutUsecase) private readonly checkoutUsecase: CheckoutUsecase) {}

  async execute({
    command,
    actorId,
    now = new Date(),
  }: {
    command: ISelfCheckoutCommand;
    actorId?: string;
    now?: Date;
  }): Promise<ISelfCheckoutResult> {
    return this.checkoutUsecase.execute({
      command: { copyCode: command.copyCode, userId: command.userId },
      actorId,
      now,
    });
  }
}
