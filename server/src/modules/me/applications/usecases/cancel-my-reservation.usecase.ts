import "reflect-metadata";

import { inject, injectable } from "tsyringe";

import {
  DomainConflictError,
  DomainForbiddenError,
  DomainNotFoundError,
} from "../../../../domains/errors";
import {
  auditRepositoryToken,
  type IAuditRepository,
} from "../../../shared/applications/ports/audit.repository";
import {
  reservationRepositoryToken,
  type IReservationRepository,
} from "../../../reservations/applications/ports/reservation.repository";
import type {
  ICancelMyReservationCommand,
  ICancelMyReservationResult,
} from "../schemas/me-schemas";

const RESERVATION_NOT_FOUND_MESSAGE = "ไม่พบรายการจอง";
const NOT_OWNER_MESSAGE = "ไม่มีสิทธิ์ดำเนินการกับรายการจองนี้";
const NOT_WAITING_MESSAGE = "ยกเลิกได้เฉพาะรายการจองที่ยังรอคิวอยู่";

@injectable()
export class CancelMyReservationUsecase {
  constructor(
    @inject(reservationRepositoryToken)
    private readonly reservations: IReservationRepository,
    @inject(auditRepositoryToken) private readonly audit: IAuditRepository,
  ) {}

  async execute({
    command,
    actorId,
  }: {
    command: ICancelMyReservationCommand;
    actorId?: string;
  }): Promise<ICancelMyReservationResult> {
    const reservation = await this.reservations.findById(command.id);
    if (!reservation) {
      throw new DomainNotFoundError(RESERVATION_NOT_FOUND_MESSAGE);
    }
    if (reservation.userId !== command.userId) {
      throw new DomainForbiddenError(NOT_OWNER_MESSAGE);
    }
    if (reservation.status !== "waiting") {
      throw new DomainConflictError(NOT_WAITING_MESSAGE);
    }

    const updated = await this.reservations.updateStatus(command.id, { status: "cancelled" });
    if (!updated) {
      throw new DomainNotFoundError(RESERVATION_NOT_FOUND_MESSAGE);
    }

    await this.audit.record({
      userId: actorId,
      action: "reservation.cancelled",
      entityType: "reservation",
      entityId: updated.id,
      metadata: { bookId: updated.bookId },
    });

    return { reservation: updated };
  }
}
