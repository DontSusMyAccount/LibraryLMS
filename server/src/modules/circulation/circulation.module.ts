import "reflect-metadata";

import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { container } from "tsyringe";

import { TOKENS } from "../tokens";
import { LoanController } from "./adapters/controllers/loan.controller";
import { DrizzleLoanRepository } from "./adapters/repository/loan.drizzle.repository";
import {
  loanRepositoryToken,
  transactionalLoanRepositoryToken,
} from "./applications/ports/loan.repository";
import { CheckinUsecase } from "./applications/usecases/checkin.usecase";
import { CheckoutUsecase } from "./applications/usecases/checkout.usecase";
import { ListActiveLoansUsecase } from "./applications/usecases/list-active-loans.usecase";
import { RecallUsecase } from "./applications/usecases/recall.usecase";
import { RenewUsecase } from "./applications/usecases/renew.usecase";

export interface CirculationModuleDeps {
  db: PostgresJsDatabase;
  jwtSecret: string;
  internalSecret: string;
}

export function registerCirculationModule(deps: CirculationModuleDeps): void {
  container.register(TOKENS.Db, { useValue: deps.db });
  container.register(TOKENS.JwtSecret, { useValue: deps.jwtSecret });
  container.register(TOKENS.InternalSecret, { useValue: deps.internalSecret });

  container.register(loanRepositoryToken, { useClass: DrizzleLoanRepository });
  container.register(transactionalLoanRepositoryToken, { useClass: DrizzleLoanRepository });

  container.register(CheckoutUsecase, { useClass: CheckoutUsecase });
  container.register(CheckinUsecase, { useClass: CheckinUsecase });
  container.register(RenewUsecase, { useClass: RenewUsecase });
  container.register(RecallUsecase, { useClass: RecallUsecase });
  container.register(ListActiveLoansUsecase, { useClass: ListActiveLoansUsecase });

  container.register(LoanController, { useClass: LoanController });
}

export function resolveLoanController(): LoanController {
  return container.resolve(LoanController);
}
