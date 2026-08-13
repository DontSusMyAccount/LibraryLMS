import "reflect-metadata";

import { inject, injectable } from "tsyringe";

import { advanceQueue, resolvePickupDays } from "../../../../domains/reservation.domain";
import {
  auditRepositoryToken,
  type IAuditRepository,
} from "../../../shared/applications/ports/audit.repository";
import {
  reservationRepositoryToken,
  type IReservationRepository,
} from "../ports/reservation.repository";
import type { IExpireOverdueResult } from "../schemas/reservation-schemas";

const PICKUP_DEADLINE_SETTING_KEY = "reservation_pickup_days";

@injectable()
export class ExpireOverdueUsecase {
  constructor(
    @inject(reservationRepositoryToken) private readonly reservations: IReservationRepository,
    @inject(auditRepositoryToken) private readonly audit: IAuditRepository,
  ) {}

  async execute({
    actorId,
    now = new Date(),
  }: {
    actorId?: string;
    now?: Date;
  }): Promise<IExpireOverdueResult> {
    const overdue = await this.reservations.findReadyOverdue(now);
    if (overdue.length === 0) {
      return { expiredCount: 0, promotedCount: 0 };
    }

    const setting = await this.reservations.getSystemSetting(PICKUP_DEADLINE_SETTING_KEY);
    const pickupDays = resolvePickupDays(setting);

    const affectedBookIds = [...new Set(overdue.map((item) => item.bookId))];

    let expiredCount = 0;
    let promotedCount = 0;

    for (const bookId of affectedBookIds) {
      const bookOverdue = overdue.filter((item) => item.bookId === bookId);
      for (const reservation of bookOverdue) {
        await this.reservations.updateStatus(reservation.id, { status: "expired" });
        expiredCount += 1;
        await this.audit.record({
          userId: actorId,
          action: "reservation.expired",
          entityType: "reservation",
          entityId: reservation.id,
          metadata: {
            bookId,
          },
        });
      }

      const queue = await this.reservations.findByBookQueue(bookId);
      const { promoted } = advanceQueue(queue, now, pickupDays);
      if (promoted) {
        await this.reservations.updateStatus(promoted.id, {
          status: "ready",
          readyAt: promoted.readyAt,
          pickupDeadline: promoted.pickupDeadline,
        });
        promotedCount += 1;
        await this.audit.record({
          userId: actorId,
          action: "reservation.ready",
          entityType: "reservation",
          entityId: promoted.id,
          metadata: {
            bookId,
            pickupDeadline: promoted.pickupDeadline,
          },
        });
      }
    }

    return { expiredCount, promotedCount };
  }
}
