import "reflect-metadata";

import { inject, injectable } from "tsyringe";

import { meRepositoryToken, type IMeRepository } from "../ports/me.repository";
import type { IListMyReservationsQuery, IListMyReservationsResult } from "../schemas/me-schemas";

@injectable()
export class ListMyReservationsUsecase {
  constructor(@inject(meRepositoryToken) private readonly me: IMeRepository) {}

  async execute({
    query,
  }: {
    query: IListMyReservationsQuery;
  }): Promise<IListMyReservationsResult> {
    const reservations = await this.me.listReservationsByUser(query.userId);
    return { reservations };
  }
}
