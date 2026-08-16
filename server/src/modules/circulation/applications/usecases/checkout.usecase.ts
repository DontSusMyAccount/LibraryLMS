import "reflect-metadata";

import { inject, injectable } from "tsyringe";

import { calcDueDate } from "../../../../domains/loan.domain";
import { resolvePolicyByRole, snapshotPolicy } from "../../../../domains/policy.domain";
import {
  DomainConflictError,
  DomainForbiddenError,
  DomainNotFoundError,
} from "../../../../domains/errors";
import {
  transactionalLoanRepositoryToken,
  type ITransactionalLoanRepository,
} from "../ports/loan.repository";
import type { ICheckoutCommand, ICheckoutResult } from "../schemas/loan-schemas";

const COPY_NOT_FOUND_MESSAGE = "ไม่พบสำเนาหนังสือที่ระบุ";
const MEMBER_NOT_FOUND_MESSAGE = "ไม่พบสมาชิกในระบบ";
const MEMBER_NOT_ACTIVE_MESSAGE = "ไม่สามารถยืมได้ เนื่องจากสมาชิกถูกระงับสิทธิ์การใช้งาน";
const POLICY_NOT_FOUND_MESSAGE = "ยังไม่มีการกำหนดสิทธิ์การยืมสำหรับสมาชิกกลุ่มนี้";
const MAX_ACTIVE_LOANS_MESSAGE = "สมาชิกรายนี้ยืมได้ครบจำนวนสูงสุดแล้ว";
const UNPAID_FINE_EXCEEDED_MESSAGE = "มียอดค่าปรับค้างชำระเกินกำหนด ไม่สามารถยืมได้";
const COPY_UNAVAILABLE_MESSAGE = "สำเนาหนังสือนี้ไม่พร้อมให้ยืม";
const COPY_ALREADY_LOANED_MESSAGE = "สำเนาหนังสือนี้ถูกยืมอยู่แล้ว";

@injectable()
export class CheckoutUsecase {
  constructor(
    @inject(transactionalLoanRepositoryToken)
    private readonly loans: ITransactionalLoanRepository,
  ) {}

  async execute({
    command,
    actorId,
    now = new Date(),
  }: {
    command: ICheckoutCommand;
    actorId?: string;
    now?: Date;
  }): Promise<ICheckoutResult> {
    // Reads ที่ไม่พึ่งพากัน → parallel เพื่อลด round-trip ผ่าน Hyperdrive
    const [copy, member] = await Promise.all([
      this.loans.findCopyByCode(command.copyCode),
      this.loans.findMemberById(command.userId),
    ]);
    if (!copy) {
      throw new DomainNotFoundError(COPY_NOT_FOUND_MESSAGE);
    }
    if (!member) {
      throw new DomainNotFoundError(MEMBER_NOT_FOUND_MESSAGE);
    }
    if (member.status !== "active") {
      throw new DomainForbiddenError(MEMBER_NOT_ACTIVE_MESSAGE);
    }

    const policies = await this.loans.findPoliciesByRole(member.role);
    const policy = resolvePolicyByRole(policies, member.role, member.memberType);
    if (!policy) {
      throw new DomainForbiddenError(POLICY_NOT_FOUND_MESSAGE);
    }

    // ตรวจเงื่อนไขที่อิสระกัน → parallel
    const [activeCount, unpaidFine, existingLoan] = await Promise.all([
      this.loans.countActiveLoansByUser(member.id),
      this.loans.sumUnpaidFinesByUser(member.id),
      this.loans.findActiveLoanByCopy(copy.id),
    ]);
    if (activeCount >= policy.maxActiveLoans) {
      throw new DomainForbiddenError(MAX_ACTIVE_LOANS_MESSAGE);
    }
    if (unpaidFine > policy.maxUnpaidFine) {
      throw new DomainForbiddenError(UNPAID_FINE_EXCEEDED_MESSAGE);
    }
    if (copy.status !== "available") {
      throw new DomainConflictError(COPY_UNAVAILABLE_MESSAGE);
    }
    if (existingLoan) {
      throw new DomainConflictError(COPY_ALREADY_LOANED_MESSAGE);
    }

    const snapshot = snapshotPolicy(policy);
    const dueDate = calcDueDate(now, policy);

    // เขียน 3 จุด atomic ใน transaction เดียว — ถ้าตัวใดตัวหนึ่ง fail → rollback ทั้งหมด
    // (loan + copy status + audit trail ไม่มีทางเหลือครึ่งๆ)
    const { loan } = await this.loans.runTransaction(async (unit) => {
      const created = await unit.loans.createLoan({
        copyId: copy.id,
        userId: member.id,
        dueAt: dueDate.toISOString(),
        loanPeriodDays: snapshot.loanPeriodDays,
        dailyFineRate: snapshot.dailyFineRate,
        checkedOutBy: actorId,
      });

      await unit.loans.updateCopyStatus(copy.id, "borrowed");

      await unit.audit.record({
        userId: actorId,
        action: "loan.created",
        entityType: "loan",
        entityId: created.id,
        metadata: {
          copyCode: copy.copyCode,
          userId: member.id,
          dueDate: created.dueAt,
        },
      });

      return { loan: created };
    });

    return { loan, dueDate: loan.dueAt };
  }
}
