import "reflect-metadata";

import { inject, injectable } from "tsyringe";

import {
  calcPickupDeadline,
  canTransitionReservation,
  resolvePickupDays,
} from "../../../../domains/reservation.domain";
import { DomainConflictError, DomainNotFoundError } from "../../../../domains/errors";
import {
  auditRepositoryToken,
  type IAuditRepository,
} from "../../../catalog/applications/ports/audit.repository";
import {
  reservationRepositoryToken,
  type IReservationRepository,
} from "../ports/reservation.repository";
import type { IMarkReadyCommand, IMarkReadyResult } from "../schemas/reservation-schemas";

const RESERVATION_NOT_FOUND_MESSAGE = "ไม่พบรายการจองที่ระบุ";
const NOT_WAITING_MESSAGE = "รายการจองนี้ไม่อยู่ในสถานะที่พร้อมให้ยืมได้";
const PICKUP_DEADLINE_SETTING_KEY = "reservation_pickup_days";

@injectable()
export class MarkReadyUsecase {
  constructor(
    @inject(reservationRepositoryToken) private readonly reservations: IReservationRepository,
    @inject(auditRepositoryToken) private readonly audit: IAuditRepository,
  ) {}

  async execute({
    command,
    actorId,
    now = new Date(),
  }: {
    command: IMarkReadyCommand;
    actorId?: string;
    now?: Date;
  }): Promise<IMarkReadyResult> {
    const reservation = await this.reservations.findById(command.id);
    if (!reservation) {
      throw new DomainNotFoundError(RESERVATION_NOT_FOUND_MESSAGE);
    }
    if (!canTransitionReservation(reservation.status, "ready")) {
      throw new DomainConflictError(NOT_WAITING_MESSAGE);
    }

    const setting = await this.reservations.getSystemSetting(PICKUP_DEADLINE_SETTING_KEY);
    const pickupDays = resolvePickupDays(setting);
    const pickupDeadline = calcPickupDeadline(now, pickupDays).toISOString();

    const updated = await this.reservations.updateStatus(reservation.id, {
      status: "ready",
      readyAt: now.toISOString(),
      pickupDeadline,
    });
    if (!updated) {
      throw new DomainNotFoundError(RESERVATION_NOT_FOUND_MESSAGE);
    }

    await this.audit.record({
      userId: actorId,
      action: "reservation.ready",
      entityType: "reservation",
      entityId: updated.id,
      metadata: {
        pickupDeadline: updated.pickupDeadline,
      },
    });

    return { reservation: updated };
  }
}
