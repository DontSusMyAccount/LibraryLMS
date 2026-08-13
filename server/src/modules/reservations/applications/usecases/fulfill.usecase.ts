import "reflect-metadata";

import { inject, injectable } from "tsyringe";

import { canTransitionReservation } from "../../../../domains/reservation.domain";
import { DomainConflictError, DomainNotFoundError } from "../../../../domains/errors";
import {
  auditRepositoryToken,
  type IAuditRepository,
} from "../../../shared/applications/ports/audit.repository";
import {
  reservationRepositoryToken,
  type IReservationRepository,
} from "../ports/reservation.repository";
import type { IFulfillCommand, IFulfillResult } from "../schemas/reservation-schemas";

const RESERVATION_NOT_FOUND_MESSAGE = "ไม่พบรายการจองที่ระบุ";
const NOT_READY_MESSAGE = "รายการจองนี้ยังไม่พร้อมให้ยืม";
const LOAN_NOT_FOUND_MESSAGE = "ไม่พบรายการยืมที่ยังค้างอยู่สำหรับการรับหนังสือ";
const LOAN_USER_MISMATCH_MESSAGE = "รายการยืมไม่ตรงกับสมาชิกที่จองหนังสือนี้";
const LOAN_BOOK_MISMATCH_MESSAGE = "รายการยืมไม่ตรงกับหนังสือที่จองเล่มนี้";

@injectable()
export class FulfillUsecase {
  constructor(
    @inject(reservationRepositoryToken) private readonly reservations: IReservationRepository,
    @inject(auditRepositoryToken) private readonly audit: IAuditRepository,
  ) {}

  async execute({
    command,
    actorId,
  }: {
    command: IFulfillCommand;
    actorId?: string;
  }): Promise<IFulfillResult> {
    const reservation = await this.reservations.findById(command.id);
    if (!reservation) {
      throw new DomainNotFoundError(RESERVATION_NOT_FOUND_MESSAGE);
    }
    if (!canTransitionReservation(reservation.status, "fulfilled")) {
      throw new DomainConflictError(NOT_READY_MESSAGE);
    }

    const loanWithBook = await this.reservations.findActiveLoanWithBook(command.loanId);
    if (!loanWithBook) {
      throw new DomainConflictError(LOAN_NOT_FOUND_MESSAGE);
    }
    const { loan, bookId } = loanWithBook;
    if (loan.userId !== reservation.userId) {
      throw new DomainConflictError(LOAN_USER_MISMATCH_MESSAGE);
    }
    if (bookId !== reservation.bookId) {
      throw new DomainConflictError(LOAN_BOOK_MISMATCH_MESSAGE);
    }

    const updated = await this.reservations.updateStatus(reservation.id, {
      status: "fulfilled",
      fulfilledLoanId: loan.id,
    });
    if (!updated) {
      throw new DomainNotFoundError(RESERVATION_NOT_FOUND_MESSAGE);
    }

    await this.audit.record({
      userId: actorId,
      action: "reservation.fulfilled",
      entityType: "reservation",
      entityId: updated.id,
      metadata: {
        loanId: loan.id,
      },
    });

    return { reservation: updated };
  }
}
