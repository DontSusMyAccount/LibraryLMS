import "reflect-metadata";

import { Elysia } from "elysia";

import { resolveAuthController } from "./auth/auth.module";
import { resolveCatalogControllers } from "./catalog/catalog.module";
import { resolveLoanController } from "./circulation/circulation.module";
import { registerAllModules } from "./di-registrations";
import type { DiRegistrationDeps } from "./di-registrations";
import { resolveMeController } from "./me/me.module";
import { resolveReservationController } from "./reservations/reservations.module";
import { resolveStorageController } from "./storage/storage.module";
import { resolveUsersController } from "./users/users.module";

export type AppModuleDeps = DiRegistrationDeps;

export function createAppModule(deps: AppModuleDeps) {
  registerAllModules(deps);

  const authController = resolveAuthController();
  const usersController = resolveUsersController();
  const catalogControllers = resolveCatalogControllers();
  const loanController = resolveLoanController();
  const reservationController = resolveReservationController();
  const storageController = resolveStorageController();
  const meController = resolveMeController();

  return new Elysia()
    .get("/health", () => ({ success: true as const, data: { status: "ok" as const } }))
    .use(authController.getRoutes())
    .use(usersController.getRoutes())
    .use(catalogControllers.book.getRoutes())
    .use(catalogControllers.copy.getRoutes())
    .use(catalogControllers.category.getRoutes())
    .use(loanController.getRoutes())
    .use(reservationController.getRoutes())
    .use(storageController.getRoutes())
    .use(meController.getRoutes());
}
