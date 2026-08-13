import "reflect-metadata";

import { inject, injectable } from "tsyringe";

import { recallLoan } from "../../../../domains/loan.domain";
import { DomainNotFoundError } from "../../../../domains/errors";
import {
  auditRepositoryToken,
  type IAuditRepository,
} from "../../../shared/applications/ports/audit.repository";
import { loanRepositoryToken, type ILoanRepository } from "../ports/loan.repository";
import type { IRecallCommand, IRecallResult } from "../schemas/loan-schemas";

const LOAN_NOT_FOUND_MESSAGE = "ไม่พบรายการยืมที่กำลังดำเนินอยู่";
const RECALL_BUFFER_SETTING_KEY = "recall_due_shorten_days";
const DEFAULT_RECALL_BUFFER_DAYS = 7;

@injectable()
export class RecallUsecase {
  constructor(
    @inject(loanRepositoryToken) private readonly loans: ILoanRepository,
    @inject(auditRepositoryToken) private readonly audit: IAuditRepository,
  ) {}

  async execute({
    command,
    actorId,
    now = new Date(),
  }: {
    command: IRecallCommand;
    actorId?: string;
    now?: Date;
  }): Promise<IRecallResult> {
    const loan = await this.loans.findActiveLoanById(command.id);
    if (!loan) {
      throw new DomainNotFoundError(LOAN_NOT_FOUND_MESSAGE);
    }

    const setting = await this.loans.getSystemSetting(RECALL_BUFFER_SETTING_KEY);
    const recallBufferDays = typeof setting === "number" ? setting : DEFAULT_RECALL_BUFFER_DAYS;

    const dueAt = recallLoan({
      loan: { dueAt: new Date(loan.dueAt) },
      now,
      recallBufferDays,
    });

    const updated = await this.loans.recallLoan(loan.id, {
      recalledAt: now.toISOString(),
      dueAt: dueAt.toISOString(),
    });
    if (!updated) {
      throw new DomainNotFoundError(LOAN_NOT_FOUND_MESSAGE);
    }

    await this.audit.record({
      userId: actorId,
      action: "loan.recalled",
      entityType: "loan",
      entityId: loan.id,
      metadata: {
        dueDate: updated.dueAt,
        recallBufferDays,
      },
    });

    return { loan: updated, dueDate: updated.dueAt };
  }
}
