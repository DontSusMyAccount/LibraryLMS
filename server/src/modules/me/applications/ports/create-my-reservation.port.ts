import type {
  ICreateMyReservationCommand,
  ICreateMyReservationResult,
} from "../schemas/me-schemas";

export const createMyReservationPortToken = Symbol("CreateMyReservationPort").toString();

export interface ICreateMyReservationPort {
  execute(args: {
    command: ICreateMyReservationCommand;
    actorId?: string;
    now?: Date;
  }): Promise<ICreateMyReservationResult>;
}
