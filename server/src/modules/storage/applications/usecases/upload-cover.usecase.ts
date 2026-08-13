import "reflect-metadata";

import { inject, injectable } from "tsyringe";

import { validateCoverUpload } from "../lib/cover-upload.validation";
import {
  storageRepositoryToken,
  type IStorageRepository,
  type IStoreCoverInput,
} from "../ports/storage.repository";

@injectable()
export class UploadCoverUsecase {
  constructor(@inject(storageRepositoryToken) private readonly storage: IStorageRepository) {}

  async execute({ input }: { input: IStoreCoverInput }): Promise<{ url: string }> {
    validateCoverUpload(input);
    const url = await this.storage.storeCover(input);
    return { url };
  }
}
