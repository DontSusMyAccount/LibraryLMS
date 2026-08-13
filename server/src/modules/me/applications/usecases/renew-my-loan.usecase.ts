import "reflect-metadata";

import { inject, injectable } from "tsyringe";

import { DomainForbiddenError, DomainNotFoundError } from "../../../../domains/errors";
import {
  loanRepositoryToken,
  type ILoanRepository,
} from "../../../circulation/applications/ports/loan.repository";
import { RenewUsecase } from "../../../circulation/applications/usecases/renew.usecase";
import type { IRenewMyLoanCommand, IRenewMyLoanResult } from "../schemas/me-schemas";

const LOAN_NOT_FOUND_MESSAGE = "ไม่พบรายการยืมที่กำลังดำเนินอยู่";
const NOT_OWNER_MESSAGE = "ไม่มีสิทธิ์ดำเนินการกับรายการยืมนี้";

@injectable()
export class RenewMyLoanUsecase {
  constructor(
    @inject(loanRepositoryToken) private readonly loans: ILoanRepository,
    @inject(RenewUsecase) private readonly renewUsecase: RenewUsecase,
  ) {}

  async execute({ command }: { command: IRenewMyLoanCommand }): Promise<IRenewMyLoanResult> {
    const loan = await this.loans.findActiveLoanById(command.id);
    if (!loan) {
      throw new DomainNotFoundError(LOAN_NOT_FOUND_MESSAGE);
    }
    if (loan.userId !== command.userId) {
      throw new DomainForbiddenError(NOT_OWNER_MESSAGE);
    }

    return this.renewUsecase.execute({
      command: { id: command.id },
      actorId: command.userId,
    });
  }
}
