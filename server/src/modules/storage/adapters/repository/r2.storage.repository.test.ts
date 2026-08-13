import { DeleteObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { describe, expect, it } from "vitest";

import { DomainError } from "../../../../domains/errors";
import {
  R2StorageRepository,
  type IS3LikeClient,
  type R2StorageConfig,
} from "./r2.storage.repository";

const DEFAULT_CONFIG: R2StorageConfig = {
  accountId: "acc123",
  accessKeyId: "access-key",
  secretAccessKey: "secret-key",
  bucket: "library-covers",
};

function createFakeS3(): IS3LikeClient & { sent: unknown[] } {
  const sent: unknown[] = [];
  return {
    sent,
    send: async (command) => {
      sent.push(command);
      return {};
    },
  };
}

function createRepo(
  fake: IS3LikeClient & { sent: unknown[] },
  overrides: Partial<R2StorageConfig> = {},
): R2StorageRepository {
  return new R2StorageRepository(fake, { ...DEFAULT_CONFIG, ...overrides });
}

describe("R2StorageRepository", () => {
  it("storeCover คืน public URL จาก R2_PUBLIC_URL (custom domain)", async () => {
    const fake = createFakeS3();
    const repo = createRepo(fake, { publicUrl: "https://covers.ac.th" });

    const url = await repo.storeCover({
      bookId: "book-1",
      filename: "a.jpg",
      body: new Uint8Array([1, 2, 3]),
      contentType: "image/jpeg",
    });

    expect(url).toMatch(/^https:\/\/covers\.ac\.th\/covers\/book-1\//);
    expect(url).toMatch(/\.jpg$/);
  });

  it("storeCover ไม่มี publicUrl → คืน URL รูปแบบ bucket.accountId.r2.cloudflarestorage.com", async () => {
    const fake = createFakeS3();
    const repo = createRepo(fake);

    const url = await repo.storeCover({
      bookId: "book-1",
      filename: "a.png",
      body: new Uint8Array([1]),
      contentType: "image/png",
    });

    expect(url).toMatch(
      /^https:\/\/library-covers\.acc123\.r2\.cloudflarestorage\.com\/covers\/book-1\/[0-9a-f-]{36}\.png$/,
    );
  });

  it("storeCover ส่ง PutObjectCommand พร้อม bucket/key(uuid)/contentType/body ที่ถูกต้อง", async () => {
    const fake = createFakeS3();
    const repo = createRepo(fake);
    const body = new Uint8Array([1, 2, 3, 4]);

    await repo.storeCover({
      bookId: "book-9",
      filename: "cover.webp",
      body,
      contentType: "image/webp",
    });

    expect(fake.sent).toHaveLength(1);
    const command = fake.sent[0];
    expect(command).toBeInstanceOf(PutObjectCommand);
    const input = (command as PutObjectCommand).input;
    expect(input.Bucket).toBe("library-covers");
    expect(input.Key).toMatch(/^covers\/book-9\/[0-9a-f-]{36}\.webp$/);
    expect(input.ContentType).toBe("image/webp");
    expect(input.Body).toBe(body);
  });

  it("content-type ไม่อนุญาต → throw 422 (ข้อความภาษาไทย)", async () => {
    const fake = createFakeS3();
    const repo = createRepo(fake);

    await expect(
      repo.storeCover({
        bookId: "book-1",
        filename: "a.gif",
        body: new Uint8Array([1]),
        contentType: "image/gif",
      }),
    ).rejects.toBeInstanceOf(DomainError);
    await expect(
      repo.storeCover({
        bookId: "book-1",
        filename: "a.gif",
        body: new Uint8Array([1]),
        contentType: "image/gif",
      }),
    ).rejects.toThrow(/รูปแบบไฟล์/);
    expect(fake.sent).toHaveLength(0);
  });

  it("ไฟล์ใหญ่เกิน 5MB → throw และไม่เรียก send", async () => {
    const fake = createFakeS3();
    const repo = createRepo(fake);
    const oversized = new Uint8Array(5 * 1024 * 1024 + 1);

    await expect(
      repo.storeCover({
        bookId: "book-1",
        filename: "big.jpg",
        body: oversized,
        contentType: "image/jpeg",
      }),
    ).rejects.toBeInstanceOf(DomainError);
    expect(fake.sent).toHaveLength(0);
  });

  it("filename ที่มี path traversal ถูก sanitize ไม่เข้า key", async () => {
    const fake = createFakeS3();
    const repo = createRepo(fake);

    await repo.storeCover({
      bookId: "book-1",
      filename: "../evil.jpg",
      body: new Uint8Array([1]),
      contentType: "image/jpeg",
    });

    const input = (fake.sent[0] as PutObjectCommand).input;
    expect(input.Key).not.toContain("..");
    expect(input.Key).toMatch(/^covers\/book-1\//);
  });

  it("deleteCover ส่ง DeleteObjectCommand พร้อม bucket/key", async () => {
    const fake = createFakeS3();
    const repo = createRepo(fake);

    await repo.deleteCover("covers/book-1/abc.jpg");

    expect(fake.sent).toHaveLength(1);
    expect(fake.sent[0]).toBeInstanceOf(DeleteObjectCommand);
    const input = (fake.sent[0] as DeleteObjectCommand).input;
    expect(input.Bucket).toBe("library-covers");
    expect(input.Key).toBe("covers/book-1/abc.jpg");
  });
});
