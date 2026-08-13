import "reflect-metadata";

import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { container } from "tsyringe";

import { TOKENS } from "../tokens";
import { DrizzleReservationRepository } from "./adapters/repository/reservation.drizzle.repository";
import { ReservationController } from "./adapters/controllers/reservation.controller";
import { reservationRepositoryToken } from "./applications/ports/reservation.repository";
import { CreateReservationUsecase } from "./applications/usecases/create-reservation.usecase";
import { ExpireOverdueUsecase } from "./applications/usecases/expire.usecase";
import { FulfillUsecase } from "./applications/usecases/fulfill.usecase";
import { ListReservationsUsecase } from "./applications/usecases/list-reservations.usecase";
import { MarkReadyUsecase } from "./applications/usecases/mark-ready.usecase";

export interface ReservationsModuleDeps {
  db: PostgresJsDatabase;
  jwtSecret: string;
  internalSecret: string;
}

export function registerReservationsModule(deps: ReservationsModuleDeps): void {
  container.register(TOKENS.Db, { useValue: deps.db });
  container.register(TOKENS.JwtSecret, { useValue: deps.jwtSecret });
  container.register(TOKENS.InternalSecret, { useValue: deps.internalSecret });

  container.register(reservationRepositoryToken, { useClass: DrizzleReservationRepository });

  container.register(CreateReservationUsecase, { useClass: CreateReservationUsecase });
  container.register(ListReservationsUsecase, { useClass: ListReservationsUsecase });
  container.register(MarkReadyUsecase, { useClass: MarkReadyUsecase });
  container.register(FulfillUsecase, { useClass: FulfillUsecase });
  container.register(ExpireOverdueUsecase, { useClass: ExpireOverdueUsecase });

  container.register(ReservationController, { useClass: ReservationController });
}

export function resolveReservationController(): ReservationController {
  return container.resolve(ReservationController);
}
