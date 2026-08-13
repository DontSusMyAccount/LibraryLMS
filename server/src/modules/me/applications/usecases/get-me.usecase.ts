import "reflect-metadata";

import { inject, injectable } from "tsyringe";

import { DomainNotFoundError } from "../../../../domains/errors";
import { resolvePolicyByRole } from "../../../../domains/policy.domain";
import { toPublic } from "../../../../shared";
import {
  loanRepositoryToken,
  type ILoanRepository,
} from "../../../circulation/applications/ports/loan.repository";
import {
  userRepositoryToken,
  type IUserRepository,
} from "../../../users/applications/ports/user.repository";
import type { IGetMeQuery, IGetMeResult } from "../schemas/me-schemas";

const USER_NOT_FOUND_MESSAGE = "ไม่พบผู้ใช้ในระบบ";

@injectable()
export class GetMeUsecase {
  constructor(
    @inject(userRepositoryToken) private readonly users: IUserRepository,
    @inject(loanRepositoryToken) private readonly loans: ILoanRepository,
  ) {}

  async execute({ query }: { query: IGetMeQuery }): Promise<IGetMeResult> {
    const user = await this.users.findById(query.userId);
    if (!user) {
      throw new DomainNotFoundError(USER_NOT_FOUND_MESSAGE);
    }

    const member = await this.loans.findMemberById(user.id);
    const policies = await this.loans.findPoliciesByRole(user.role);
    const policy = member ? resolvePolicyByRole(policies, member.role, member.memberType) : null;

    const [unpaidFineTotal, activeLoanCount] = await Promise.all([
      this.loans.sumUnpaidFinesByUser(user.id),
      this.loans.countActiveLoansByUser(user.id),
    ]);

    return {
      user: toPublic(user),
      policy,
      unpaidFineTotal,
      activeLoanCount,
    };
  }
}
