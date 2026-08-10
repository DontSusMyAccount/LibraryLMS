import "reflect-metadata";

import { randomUUID } from "node:crypto";

import { DeleteObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { inject, injectable } from "tsyringe";

import { validateCoverUpload } from "../../applications/lib/cover-upload.validation";
import type {
  IStorageRepository,
  IStoreCoverInput,
} from "../../applications/ports/storage.repository";
import { STORAGE_R2_CONFIG_TOKEN, STORAGE_S3_CLIENT_TOKEN } from "../../storage.tokens";

export interface R2StorageConfig {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  publicUrl?: string;
}

export interface IS3LikeClient {
  send(command: unknown): Promise<unknown>;
}

function joinUrl(baseUrl: string, key: string): string {
  return `${baseUrl.replace(/\/+$/, "")}/${key}`;
}

@injectable()
export class R2StorageRepository implements IStorageRepository {
  constructor(
    @inject(STORAGE_S3_CLIENT_TOKEN) private readonly s3: IS3LikeClient,
    @inject(STORAGE_R2_CONFIG_TOKEN) private readonly config: R2StorageConfig,
  ) {}

  async storeCover(input: IStoreCoverInput): Promise<string> {
    const validation = validateCoverUpload(input);
    const key = `covers/${validation.bookId}/${randomUUID()}.${validation.extension}`;

    const command = new PutObjectCommand({
      Bucket: this.config.bucket,
      Key: key,
      Body: input.body,
      ContentType: input.contentType.toLowerCase(),
    });
    await this.s3.send(command);

    return this.resolvePublicUrl(key);
  }

  async deleteCover(key: string): Promise<void> {
    const command = new DeleteObjectCommand({ Bucket: this.config.bucket, Key: key });
    await this.s3.send(command);
  }

  private resolvePublicUrl(key: string): string {
    if (this.config.publicUrl) {
      return joinUrl(this.config.publicUrl, key);
    }
    return `https://${this.config.bucket}.${this.config.accountId}.r2.cloudflarestorage.com/${key}`;
  }
}
