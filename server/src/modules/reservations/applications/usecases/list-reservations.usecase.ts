import "reflect-metadata";

import { inject, injectable } from "tsyringe";

import { DEFAULT_PAGE, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from "../../../../shared";
import {
  reservationRepositoryToken,
  type IReservationRepository,
} from "../ports/reservation.repository";
import type {
  IListReservationsQuery,
  IListReservationsResult,
} from "../schemas/reservation-schemas";

function normalizePage(value: number | undefined): number {
  const page =
    typeof value === "number" && Number.isFinite(value) ? Math.trunc(value) : DEFAULT_PAGE;
  return Math.max(DEFAULT_PAGE, page);
}

function normalizeLimit(value: number | undefined): number {
  const limit =
    typeof value === "number" && Number.isFinite(value) ? Math.trunc(value) : DEFAULT_PAGE_SIZE;
  return Math.min(MAX_PAGE_SIZE, Math.max(1, limit));
}

@injectable()
export class ListReservationsUsecase {
  constructor(
    @inject(reservationRepositoryToken) private readonly reservations: IReservationRepository,
  ) {}

  async execute({ query }: { query: IListReservationsQuery }): Promise<IListReservationsResult> {
    const page = normalizePage(query.page);
    const limit = normalizeLimit(query.limit);

    const paginated = await this.reservations.listReservations({
      status: query.status,
      page,
      limit,
    });

    return { ...paginated, page, limit };
  }
}
