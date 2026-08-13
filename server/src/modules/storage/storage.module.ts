import "reflect-metadata";

import { S3Client } from "@aws-sdk/client-s3";
import { container } from "tsyringe";

import { TOKENS } from "../tokens";
import { StorageController } from "./adapters/controllers/storage.controller";
import { LocalStorageRepository } from "./adapters/repository/local.storage.repository";
import {
  R2StorageRepository,
  type R2StorageConfig,
} from "./adapters/repository/r2.storage.repository";
import { storageRepositoryToken } from "./applications/ports/storage.repository";
import { UploadCoverUsecase } from "./applications/usecases/upload-cover.usecase";
import {
  STORAGE_R2_CONFIG_TOKEN,
  STORAGE_S3_CLIENT_TOKEN,
  STORAGE_UPLOAD_ROOT_TOKEN,
} from "./storage.tokens";

export type StorageDriver = "r2" | "local";

export interface StorageModuleDeps {
  storageDriver: StorageDriver;
  r2Config?: R2StorageConfig;
  uploadRoot?: string;
  jwtSecret: string;
  internalSecret: string;
}

export function registerStorageModule(deps: StorageModuleDeps): void {
  container.register(TOKENS.JwtSecret, { useValue: deps.jwtSecret });
  container.register(TOKENS.InternalSecret, { useValue: deps.internalSecret });

  if (deps.storageDriver === "r2") {
    if (!deps.r2Config) {
      throw new Error(
        "storage module: driver=r2 ต้องระบุ r2Config — ตรวจสอบว่า R2_* ครบใน .env (หรือใช้ STORAGE_DRIVER=local)",
      );
    }
    const s3Client = new S3Client({
      region: "auto",
      endpoint: `https://${deps.r2Config.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: deps.r2Config.accessKeyId,
        secretAccessKey: deps.r2Config.secretAccessKey,
      },
    });
    container.register(STORAGE_R2_CONFIG_TOKEN, { useValue: deps.r2Config });
    container.register(STORAGE_S3_CLIENT_TOKEN, { useValue: s3Client });
    container.register(storageRepositoryToken, { useClass: R2StorageRepository });
  } else {
    container.register(STORAGE_UPLOAD_ROOT_TOKEN, { useValue: deps.uploadRoot ?? "uploads" });
    container.register(storageRepositoryToken, { useClass: LocalStorageRepository });
  }

  container.register(UploadCoverUsecase, { useClass: UploadCoverUsecase });
  container.register(StorageController, { useClass: StorageController });
}

export function resolveStorageController(): StorageController {
  return container.resolve(StorageController);
}
