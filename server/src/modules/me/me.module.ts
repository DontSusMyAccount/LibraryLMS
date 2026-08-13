import "reflect-metadata";

import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { container } from "tsyringe";

import { TOKENS } from "../tokens";
import { DrizzleMeRepository } from "./adapters/repository/me.drizzle.repository";
import { meRepositoryToken } from "./applications/ports/me.repository";
import { CancelMyReservationUsecase } from "./applications/usecases/cancel-my-reservation.usecase";
import { CreateMyReservationUsecase } from "./applications/usecases/create-my-reservation.usecase";
import { GetMeUsecase } from "./applications/usecases/get-me.usecase";
import { ListMyFinesUsecase } from "./applications/usecases/list-my-fines.usecase";
import { ListMyLoansUsecase } from "./applications/usecases/list-my-loans.usecase";
import { ListMyReservationsUsecase } from "./applications/usecases/list-my-reservations.usecase";
import { RenewMyLoanUsecase } from "./applications/usecases/renew-my-loan.usecase";
import { SelfCheckoutUsecase } from "./applications/usecases/self-checkout.usecase";
import { MeController } from "./adapters/controllers/me.controller";

export interface MeModuleDeps {
  db: PostgresJsDatabase;
  jwtSecret: string;
  internalSecret: string;
}

export function registerMeModule(deps: MeModuleDeps): void {
  container.register(TOKENS.Db, { useValue: deps.db });
  container.register(TOKENS.JwtSecret, { useValue: deps.jwtSecret });
  container.register(TOKENS.InternalSecret, { useValue: deps.internalSecret });

  container.register(meRepositoryToken, { useClass: DrizzleMeRepository });

  container.register(GetMeUsecase, { useClass: GetMeUsecase });
  container.register(ListMyLoansUsecase, { useClass: ListMyLoansUsecase });
  container.register(RenewMyLoanUsecase, { useClass: RenewMyLoanUsecase });
  container.register(ListMyReservationsUsecase, { useClass: ListMyReservationsUsecase });
  container.register(CreateMyReservationUsecase, { useClass: CreateMyReservationUsecase });
  container.register(CancelMyReservationUsecase, { useClass: CancelMyReservationUsecase });
  container.register(ListMyFinesUsecase, { useClass: ListMyFinesUsecase });
  container.register(SelfCheckoutUsecase, { useClass: SelfCheckoutUsecase });

  container.register(MeController, { useClass: MeController });
}

export function resolveMeController(): MeController {
  return container.resolve(MeController);
}
