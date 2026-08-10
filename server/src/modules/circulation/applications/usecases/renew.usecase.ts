import "reflect-metadata";

import { inject, injectable } from "tsyringe";

import { renewLoan } from "../../../../domains/loan.domain";
import { resolvePolicyByRole } from "../../../../domains/policy.domain";
import { DomainForbiddenError, DomainNotFoundError } from "../../../../domains/errors";
import {
  auditRepositoryToken,
  type IAuditRepository,
} from "../../../catalog/applications/ports/audit.repository";
import { loanRepositoryToken, type ILoanRepository } from "../ports/loan.repository";
import type { IRenewCommand, IRenewResult } from "../schemas/loan-schemas";

const LOAN_NOT_FOUND_MESSAGE = "ไม่พบรายการยืมที่กำลังดำเนินอยู่";
const POLICY_NOT_FOUND_MESSAGE = "ยังไม่มีการกำหนดสิทธิ์การยืมสำหรับสมาชิกกลุ่มนี้";

@injectable()
export class RenewUsecase {
  constructor(
    @inject(loanRepositoryToken) private readonly loans: ILoanRepository,
    @inject(auditRepositoryToken) private readonly audit: IAuditRepository,
  ) {}

  async execute({
    command,
    actorId,
  }: {
    command: IRenewCommand;
    actorId?: string;
  }): Promise<IRenewResult> {
    const loan = await this.loans.findActiveLoanById(command.id);
    if (!loan) {
      throw new DomainNotFoundError(LOAN_NOT_FOUND_MESSAGE);
    }

    const member = await this.loans.findMemberById(loan.userId);
    if (!member) {
      throw new DomainNotFoundError(LOAN_NOT_FOUND_MESSAGE);
    }
    const policies = await this.loans.findPoliciesByRole(member.role);
    const policy = resolvePolicyByRole(policies, member.role, member.memberType);
    if (!policy) {
      throw new DomainForbiddenError(POLICY_NOT_FOUND_MESSAGE);
    }

    const copy = await this.loans.findCopyById(loan.copyId);
    const hasActiveReservation = copy ? await this.loans.hasActiveReservation(copy.bookId) : false;

    const renewed = renewLoan(
      { dueAt: new Date(loan.dueAt), renewedCount: loan.renewedCount },
      { loanPeriodDays: policy.loanPeriodDays, maxRenewals: policy.maxRenewals },
      hasActiveReservation,
    );

    const updated = await this.loans.updateRenewal(loan.id, {
      renewedCount: renewed.renewedCount,
      dueAt: renewed.dueAt.toISOString(),
    });
    if (!updated) {
      throw new DomainNotFoundError(LOAN_NOT_FOUND_MESSAGE);
    }

    await this.audit.record({
      userId: actorId,
      action: "loan.renewed",
      entityType: "loan",
      entityId: loan.id,
      metadata: {
        renewedCount: updated.renewedCount,
        dueDate: updated.dueAt,
      },
    });

    return { loan: updated, dueDate: updated.dueAt };
  }
}
