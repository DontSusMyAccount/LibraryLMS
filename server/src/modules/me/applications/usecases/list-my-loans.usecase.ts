import "reflect-metadata";

import { inject, injectable } from "tsyringe";

import { calculateOverdueDays, isOverdue } from "../../../../domains/loan.domain";
import { resolvePolicyByRole } from "../../../../domains/policy.domain";
import {
  loanRepositoryToken,
  type ILoanRepository,
} from "../../../circulation/applications/ports/loan.repository";
import { meRepositoryToken, type IMeRepository } from "../ports/me.repository";
import type { IListMyLoansQuery, IListMyLoansResult, IMyLoanItem } from "../schemas/me-schemas";

@injectable()
export class ListMyLoansUsecase {
  constructor(
    @inject(meRepositoryToken) private readonly me: IMeRepository,
    @inject(loanRepositoryToken) private readonly loans: ILoanRepository,
  ) {}

  async execute({
    query,
    now = new Date(),
  }: {
    query: IListMyLoansQuery;
    now?: Date;
  }): Promise<IListMyLoansResult> {
    const member = await this.loans.findMemberById(query.userId);
    const policies = member ? await this.loans.findPoliciesByRole(member.role) : [];
    const policy = member ? resolvePolicyByRole(policies, member.role, member.memberType) : null;
    const gracePeriodDays = policy?.gracePeriodDays ?? 0;
    const maxRenewals = policy?.maxRenewals ?? 0;

    const items = await this.me.listLoansByUser(query.userId);
    const loans: IMyLoanItem[] = await Promise.all(
      items.map(async (item) => {
        const dueAt = new Date(item.loan.dueAt);
        const hasReservation = await this.loans.hasActiveReservation(item.bookId);
        const canRenew =
          item.loan.status === "active" && item.loan.renewedCount < maxRenewals && !hasReservation;
        return {
          ...item,
          overdue: isOverdue(now, dueAt, gracePeriodDays),
          daysOverdue: calculateOverdueDays(now, dueAt, gracePeriodDays),
          canRenew,
        };
      }),
    );

    return { loans };
  }
}
