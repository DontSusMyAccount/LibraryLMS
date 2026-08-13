import "reflect-metadata";

import { inject, injectable } from "tsyringe";

import { selfCheckoutPortToken, type ISelfCheckoutPort } from "../ports/self-checkout.port";
import type { ISelfCheckoutCommand, ISelfCheckoutResult } from "../schemas/me-schemas";

@injectable()
export class SelfCheckoutUsecase {
  constructor(@inject(selfCheckoutPortToken) private readonly checkout: ISelfCheckoutPort) {}

  async execute({
    command,
    actorId,
    now = new Date(),
  }: {
    command: ISelfCheckoutCommand;
    actorId?: string;
    now?: Date;
  }): Promise<ISelfCheckoutResult> {
    return this.checkout.execute({
      command: { copyCode: command.copyCode, userId: command.userId },
      actorId,
      now,
    });
  }
}
