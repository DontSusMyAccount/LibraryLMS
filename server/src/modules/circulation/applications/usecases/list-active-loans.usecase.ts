import "reflect-metadata";

import { inject, injectable } from "tsyringe";

import { calculateOverdueDays, isOverdue } from "../../../../domains/loan.domain";
import { resolvePolicyByRole } from "../../../../domains/policy.domain";
import { loanRepositoryToken, type ILoanRepository } from "../ports/loan.repository";
import type {
  IActiveLoanItem,
  IListActiveLoansQuery,
  IListActiveLoansResult,
} from "../schemas/loan-schemas";

@injectable()
export class ListActiveLoansUsecase {
  constructor(@inject(loanRepositoryToken) private readonly loans: ILoanRepository) {}

  async execute({
    query,
    now = new Date(),
  }: {
    query: IListActiveLoansQuery;
    now?: Date;
  }): Promise<IListActiveLoansResult> {
    const member = await this.loans.findMemberById(query.userId);
    if (!member) {
      return { loans: [] };
    }

    const policies = await this.loans.findPoliciesByRole(member.role);
    const policy = resolvePolicyByRole(policies, member.role, member.memberType);
    const gracePeriodDays = policy?.gracePeriodDays ?? 0;

    const loans = await this.loans.listActiveLoansByUser(query.userId);
    const items: IActiveLoanItem[] = loans.map((loan) => {
      const dueAt = new Date(loan.dueAt);
      return {
        loan,
        overdue: isOverdue(now, dueAt, gracePeriodDays),
        daysOverdue: calculateOverdueDays(now, dueAt, gracePeriodDays),
      };
    });

    return { loans: items };
  }
}
