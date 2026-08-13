import "reflect-metadata";

import { inject, injectable } from "tsyringe";

import {
  createMyReservationPortToken,
  type ICreateMyReservationPort,
} from "../ports/create-my-reservation.port";
import type {
  ICreateMyReservationCommand,
  ICreateMyReservationResult,
} from "../schemas/me-schemas";

@injectable()
export class CreateMyReservationUsecase {
  constructor(
    @inject(createMyReservationPortToken)
    private readonly createReservation: ICreateMyReservationPort,
  ) {}

  async execute({
    command,
    actorId,
  }: {
    command: ICreateMyReservationCommand;
    actorId?: string;
  }): Promise<ICreateMyReservationResult> {
    return this.createReservation.execute({
      command: { bookId: command.bookId, userId: command.userId },
      actorId,
    });
  }
}
