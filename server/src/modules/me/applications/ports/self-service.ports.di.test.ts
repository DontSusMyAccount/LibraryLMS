import "reflect-metadata";

import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { container } from "tsyringe";
import { beforeEach, describe, expect, it } from "vitest";

import { CheckoutUsecase } from "../../../circulation/applications/usecases/checkout.usecase";
import { RenewUsecase } from "../../../circulation/applications/usecases/renew.usecase";
import { registerCatalogModule } from "../../../catalog/catalog.module";
import { registerCirculationModule } from "../../../circulation/circulation.module";
import { registerReservationsModule } from "../../../reservations/reservations.module";
import { CreateReservationUsecase } from "../../../reservations/applications/usecases/create-reservation.usecase";
import { registerMeModule } from "../../me.module";
import { CreateMyReservationUsecase } from "../usecases/create-my-reservation.usecase";
import { RenewMyLoanUsecase } from "../usecases/renew-my-loan.usecase";
import { SelfCheckoutUsecase } from "../usecases/self-checkout.usecase";
import {
  createMyReservationPortToken,
  type ICreateMyReservationPort,
} from "./create-my-reservation.port";
import { renewLoanPortToken, type IRenewLoanPort } from "./renew-my-loan.port";
import { selfCheckoutPortToken, type ISelfCheckoutPort } from "./self-checkout.port";

const fakeDb = {} as unknown as PostgresJsDatabase;

interface SelfCheckoutInjected {
  checkout: unknown;
}

interface CreateMyReservationInjected {
  createReservation: unknown;
}

interface RenewMyLoanInjected {
  renew: unknown;
}

function registerConsumers(): void {
  const deps = {
    db: fakeDb,
    jwtSecret: "test-jwt-secret",
    internalSecret: "test-internal-secret",
  };
  registerCatalogModule(deps);
  registerCirculationModule(deps);
  registerReservationsModule(deps);
  registerMeModule(deps);
}

describe("me self-service DI boundary (Task 2)", () => {
  beforeEach(() => {
    container.clearInstances();
    registerConsumers();
  });

  it("selfCheckoutPortToken ผูกกับ CheckoutUsecase (concrete ต่างโมดูล)", () => {
    const port = container.resolve<ISelfCheckoutPort>(selfCheckoutPortToken);
    expect(port).toBeInstanceOf(CheckoutUsecase);
  });

  it("createMyReservationPortToken ผูกกับ CreateReservationUsecase", () => {
    const port = container.resolve<ICreateMyReservationPort>(createMyReservationPortToken);
    expect(port).toBeInstanceOf(CreateReservationUsecase);
  });

  it("renewLoanPortToken ผูกกับ RenewUsecase", () => {
    const port = container.resolve<IRenewLoanPort>(renewLoanPortToken);
    expect(port).toBeInstanceOf(RenewUsecase);
  });

  it("SelfCheckoutUsecase ได้รับ concrete ต่างโมดูลผ่าน port เท่านั้น", () => {
    const usecase = container.resolve(SelfCheckoutUsecase) as unknown as SelfCheckoutInjected;
    expect(usecase.checkout).toBeInstanceOf(CheckoutUsecase);
  });

  it("CreateMyReservationUsecase ได้รับ concrete ต่างโมดูลผ่าน port เท่านั้น", () => {
    const usecase = container.resolve(
      CreateMyReservationUsecase,
    ) as unknown as CreateMyReservationInjected;
    expect(usecase.createReservation).toBeInstanceOf(CreateReservationUsecase);
  });

  it("RenewMyLoanUsecase ได้รับ concrete ต่างโมดูลผ่าน port เท่านั้น", () => {
    const usecase = container.resolve(RenewMyLoanUsecase) as unknown as RenewMyLoanInjected;
    expect(usecase.renew).toBeInstanceOf(RenewUsecase);
  });
});
