import type { ISelfCheckoutCommand, ISelfCheckoutResult } from "../schemas/me-schemas";

export const selfCheckoutPortToken = Symbol("SelfCheckoutPort").toString();

export interface ISelfCheckoutPort {
  execute(args: {
    command: ISelfCheckoutCommand;
    actorId?: string;
    now?: Date;
  }): Promise<ISelfCheckoutResult>;
}
