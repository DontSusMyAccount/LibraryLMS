import "reflect-metadata";

import { randomUUID } from "node:crypto";

import { mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, resolve, sep } from "node:path";

import { inject, injectable } from "tsyringe";

import { DomainError } from "../../../../domains/errors";
import { validateCoverUpload } from "../../applications/lib/cover-upload.validation";
import type {
  IStorageRepository,
  IStoreCoverInput,
} from "../../applications/ports/storage.repository";
import { STORAGE_UPLOAD_ROOT_TOKEN } from "../../storage.tokens";

export const LOCAL_URL_PREFIX = "/uploads";

const INVALID_KEY_MESSAGE = "คีย์ไฟล์ไม่ถูกต้อง";

function resolveWithinRoot(root: string, relative: string): string {
  const rootResolved = resolve(root);
  const resolved = resolve(root, relative);
  if (resolved !== rootResolved && !resolved.startsWith(`${rootResolved}${sep}`)) {
    throw new DomainError(INVALID_KEY_MESSAGE, 422);
  }
  return resolved;
}

@injectable()
export class LocalStorageRepository implements IStorageRepository {
  constructor(@inject(STORAGE_UPLOAD_ROOT_TOKEN) private readonly uploadRoot: string) {}

  async storeCover(input: IStoreCoverInput): Promise<string> {
    const validation = validateCoverUpload(input);
    const key = `covers/${validation.bookId}/${randomUUID()}.${validation.extension}`;

    const absolutePath = resolveWithinRoot(this.uploadRoot, key);
    await mkdir(dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, Buffer.from(input.body));

    return `${LOCAL_URL_PREFIX}/${key}`;
  }

  async deleteCover(key: string): Promise<void> {
    const absolutePath = resolveWithinRoot(this.uploadRoot, key);
    await rm(absolutePath, { force: true });
  }
}
