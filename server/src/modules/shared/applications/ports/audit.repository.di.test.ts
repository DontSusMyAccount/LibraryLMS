import "reflect-metadata";

import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { container } from "tsyringe";
import { beforeEach, describe, expect, it } from "vitest";

import { DrizzleAuditRepository } from "../../../catalog/adapters/repository/audit.drizzle.repository";
import { registerCatalogModule } from "../../../catalog/catalog.module";
import { CheckoutUsecase } from "../../../circulation/applications/usecases/checkout.usecase";
import { registerCirculationModule } from "../../../circulation/circulation.module";
import { CancelMyReservationUsecase } from "../../../me/applications/usecases/cancel-my-reservation.usecase";
import { registerMeModule } from "../../../me/me.module";
import { CreateReservationUsecase } from "../../../reservations/applications/usecases/create-reservation.usecase";
import { registerReservationsModule } from "../../../reservations/reservations.module";
import { auditRepositoryToken, type IAuditRepository } from "./audit.repository";

const fakeDb = {} as unknown as PostgresJsDatabase;

interface AuditInjected {
  audit: unknown;
}

function registerAuditConsumers(): void {
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

describe("shared AuditPort DI resolution (Task 1)", () => {
  beforeEach(() => {
    container.clearInstances();
    registerAuditConsumers();
  });

  it("resolves DrizzleAuditRepository ผ่าน shared auditRepositoryToken", () => {
    const audit = container.resolve<IAuditRepository>(auditRepositoryToken);
    expect(audit).toBeInstanceOf(DrizzleAuditRepository);
  });

  it("Circulation CheckoutUsecase ได้รับ audit ที่ฉีดผ่าน shared token", () => {
    const checkout = container.resolve(CheckoutUsecase) as unknown as AuditInjected;
    expect(checkout.audit).toBeInstanceOf(DrizzleAuditRepository);
  });

  it("Reservations CreateReservationUsecase ได้รับ audit ที่ฉีดผ่าน shared token", () => {
    const createReservation = container.resolve(
      CreateReservationUsecase,
    ) as unknown as AuditInjected;
    expect(createReservation.audit).toBeInstanceOf(DrizzleAuditRepository);
  });

  it("Me CancelMyReservationUsecase ได้รับ audit ที่ฉีดผ่าน shared token", () => {
    const cancel = container.resolve(CancelMyReservationUsecase) as unknown as AuditInjected;
    expect(cancel.audit).toBeInstanceOf(DrizzleAuditRepository);
  });
});
