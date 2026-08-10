import "reflect-metadata";

import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { registerAuthModule } from "./auth/auth.module";
import { registerCatalogModule } from "./catalog/catalog.module";
import { registerCirculationModule } from "./circulation/circulation.module";
import { registerReservationsModule } from "./reservations/reservations.module";
import { registerStorageModule } from "./storage/storage.module";
import type { StorageDriver } from "./storage/storage.module";
import type { R2StorageConfig } from "./storage/adapters/repository/r2.storage.repository";
import { registerUsersModule } from "./users/users.module";

export interface DiRegistrationDeps {
  db: PostgresJsDatabase;
  jwtSecret: string;
  internalSecret: string;
  storageDriver: StorageDriver;
  r2Config?: R2StorageConfig;
  uploadRoot?: string;
}

export function registerAllModules(deps: DiRegistrationDeps): void {
  const moduleDeps = {
    db: deps.db,
    jwtSecret: deps.jwtSecret,
    internalSecret: deps.internalSecret,
  };
  const storageDeps = {
    storageDriver: deps.storageDriver,
    r2Config: deps.r2Config,
    uploadRoot: deps.uploadRoot,
    jwtSecret: deps.jwtSecret,
    internalSecret: deps.internalSecret,
  };

  registerAuthModule(moduleDeps);
  registerUsersModule(moduleDeps);
  registerCatalogModule(moduleDeps);
  registerCirculationModule(moduleDeps);
  registerReservationsModule(moduleDeps);
  registerStorageModule(storageDeps);
}
