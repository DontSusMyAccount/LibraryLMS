import type { IRenewMyLoanResult } from "../schemas/me-schemas";

export const renewLoanPortToken = Symbol("RenewLoanPort").toString();

export interface IRenewLoanCommand {
  id: string;
}

export interface IRenewLoanPort {
  execute(args: { command: IRenewLoanCommand; actorId?: string }): Promise<IRenewMyLoanResult>;
}
