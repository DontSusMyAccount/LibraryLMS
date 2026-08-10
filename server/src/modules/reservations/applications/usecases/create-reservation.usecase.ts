import "reflect-metadata";

import { inject, injectable } from "tsyringe";

import { assertNoActiveDuplicate } from "../../../../domains/reservation.domain";
import { DomainForbiddenError, DomainNotFoundError } from "../../../../domains/errors";
import {
  auditRepositoryToken,
  type IAuditRepository,
} from "../../../catalog/applications/ports/audit.repository";
import {
  reservationRepositoryToken,
  type IReservationRepository,
} from "../ports/reservation.repository";
import type {
  ICreateReservationCommand,
  ICreateReservationResult,
} from "../schemas/reservation-schemas";

const BOOK_NOT_FOUND_MESSAGE = "ไม่พบหนังสือที่ระบุ";
const MEMBER_NOT_FOUND_MESSAGE = "ไม่พบสมาชิกในระบบ";
const MEMBER_NOT_ACTIVE_MESSAGE = "ไม่สามารถจองได้ เนื่องจากสมาชิกถูกระงับสิทธิ์การใช้งาน";

@injectable()
export class CreateReservationUsecase {
  constructor(
    @inject(reservationRepositoryToken) private readonly reservations: IReservationRepository,
    @inject(auditRepositoryToken) private readonly audit: IAuditRepository,
  ) {}

  async execute({
    command,
    actorId,
    now = new Date(),
  }: {
    command: ICreateReservationCommand;
    actorId?: string;
    now?: Date;
  }): Promise<ICreateReservationResult> {
    const book = await this.reservations.findBookById(command.bookId);
    if (!book) {
      throw new DomainNotFoundError(BOOK_NOT_FOUND_MESSAGE);
    }

    const member = await this.reservations.findMemberById(command.userId);
    if (!member) {
      throw new DomainNotFoundError(MEMBER_NOT_FOUND_MESSAGE);
    }
    if (member.status !== "active") {
      throw new DomainForbiddenError(MEMBER_NOT_ACTIVE_MESSAGE);
    }

    const existing = await this.reservations.findActiveByUserAndBook(
      command.userId,
      command.bookId,
    );
    assertNoActiveDuplicate(existing);

    const reservation = await this.reservations.createReservation({
      bookId: command.bookId,
      userId: command.userId,
      branchId: command.branchId,
      reservedAt: now.toISOString(),
    });

    await this.audit.record({
      userId: actorId,
      action: "reservation.created",
      entityType: "reservation",
      entityId: reservation.id,
      metadata: {
        bookId: reservation.bookId,
        userId: reservation.userId,
      },
    });

    return { reservation };
  }
}
