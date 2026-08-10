import "reflect-metadata";

import { inject, injectable } from "tsyringe";

import { calculateFine } from "../../../../domains/loan.domain";
import { resolvePolicyByRole } from "../../../../domains/policy.domain";
import { DomainConflictError, DomainNotFoundError } from "../../../../domains/errors";
import {
  auditRepositoryToken,
  type IAuditRepository,
} from "../../../catalog/applications/ports/audit.repository";
import { loanRepositoryToken, type ILoanRepository } from "../ports/loan.repository";
import type { ICheckinCommand, ICheckinResult } from "../schemas/loan-schemas";

const COPY_NOT_FOUND_MESSAGE = "ไม่พบสำเนาหนังสือที่ระบุ";
const NO_ACTIVE_LOAN_MESSAGE = "ไม่พบรายการยืมที่ยังไม่คืนสำหรับสำเนานี้";

@injectable()
export class CheckinUsecase {
  constructor(
    @inject(loanRepositoryToken) private readonly loans: ILoanRepository,
    @inject(auditRepositoryToken) private readonly audit: IAuditRepository,
  ) {}

  async execute({
    command,
    actorId,
    now = new Date(),
  }: {
    command: ICheckinCommand;
    actorId?: string;
    now?: Date;
  }): Promise<ICheckinResult> {
    const copy = await this.loans.findCopyByCode(command.copyCode);
    if (!copy) {
      throw new DomainNotFoundError(COPY_NOT_FOUND_MESSAGE);
    }

    const loan = await this.loans.findActiveLoanByCopy(copy.id);
    if (!loan) {
      throw new DomainConflictError(NO_ACTIVE_LOAN_MESSAGE);
    }

    const member = await this.loans.findMemberById(loan.userId);
    const policies = member ? await this.loans.findPoliciesByRole(member.role) : [];
    const policy = member ? resolvePolicyByRole(policies, member.role, member.memberType) : null;
    const gracePeriodDays = policy?.gracePeriodDays ?? 0;

    const returnedAt = now.toISOString();
    const returned = await this.loans.returnLoan(loan.id, {
      status: "returned",
      returnedAt,
      checkedInBy: actorId,
    });
    if (!returned) {
      throw new DomainConflictError(NO_ACTIVE_LOAN_MESSAGE);
    }

    await this.loans.updateCopyStatus(copy.id, "available");

    const fineAmount = calculateFine({
      now,
      dueAt: new Date(loan.dueAt),
      gracePeriodDays,
      dailyFineRate: loan.dailyFineRate,
    });
    let fine: ICheckinResult["fine"];
    if (fineAmount > 0) {
      fine = await this.loans.insertFine({
        loanId: loan.id,
        userId: loan.userId,
        amount: fineAmount,
        reason: "overdue",
      });
    }

    await this.audit.record({
      userId: actorId,
      action: "loan.returned",
      entityType: "loan",
      entityId: loan.id,
      metadata: {
        copyCode: copy.copyCode,
        fineAmount,
      },
    });

    return { loan: returned, fine };
  }
}
