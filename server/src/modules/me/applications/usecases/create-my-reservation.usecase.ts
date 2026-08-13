import "reflect-metadata";

import { inject, injectable } from "tsyringe";

import { CreateReservationUsecase } from "../../../reservations/applications/usecases/create-reservation.usecase";
import type {
  ICreateMyReservationCommand,
  ICreateMyReservationResult,
} from "../schemas/me-schemas";

@injectable()
export class CreateMyReservationUsecase {
  constructor(
    @inject(CreateReservationUsecase)
    private readonly createReservationUsecase: CreateReservationUsecase,
  ) {}

  async execute({
    command,
    actorId,
  }: {
    command: ICreateMyReservationCommand;
    actorId?: string;
  }): Promise<ICreateMyReservationResult> {
    return this.createReservationUsecase.execute({
      command: { bookId: command.bookId, userId: command.userId },
      actorId,
    });
  }
}
