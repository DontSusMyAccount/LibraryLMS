import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it, beforeEach, afterEach } from "vitest";

import { DomainError } from "../../../../domains/errors";
import { LocalStorageRepository } from "./local.storage.repository";

describe("LocalStorageRepository", () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), "storage-local-"));
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it("storeCover เขียนไฟล์ใต้ uploadRoot/covers/<bookId> และคืน URL path /uploads/...", async () => {
    const repo = new LocalStorageRepository(root);

    const url = await repo.storeCover({
      bookId: "book-1",
      filename: "a.jpg",
      body: new Uint8Array([1, 2, 3]),
      contentType: "image/jpeg",
    });

    expect(url).toMatch(/^\/uploads\/covers\/book-1\/[0-9a-f-]{36}\.jpg$/);
    const relative = url.replace("/uploads/", "");
    const file = await readFile(join(root, relative));
    expect(file).toEqual(Buffer.from([1, 2, 3]));
  });

  it("content-type ไม่อนุญาต → throw 422 เหมือน R2 driver", async () => {
    const repo = new LocalStorageRepository(root);

    await expect(
      repo.storeCover({
        bookId: "book-1",
        filename: "a.gif",
        body: new Uint8Array([1]),
        contentType: "image/gif",
      }),
    ).rejects.toBeInstanceOf(DomainError);
  });

  it("ไฟล์ใหญ่เกิน 5MB → throw เหมือน R2 driver", async () => {
    const repo = new LocalStorageRepository(root);

    await expect(
      repo.storeCover({
        bookId: "book-1",
        filename: "big.jpg",
        body: new Uint8Array(5 * 1024 * 1024 + 1),
        contentType: "image/jpeg",
      }),
    ).rejects.toBeInstanceOf(DomainError);
  });

  it("filename ที่มี path traversal ถูก sanitize ไม่เข้าสู่ path บนดิสก์", async () => {
    const repo = new LocalStorageRepository(root);

    const url = await repo.storeCover({
      bookId: "book-1",
      filename: "../evil.jpg",
      body: new Uint8Array([1]),
      contentType: "image/jpeg",
    });

    expect(url).not.toContain("..");
    const relative = url.replace("/uploads/", "");
    const resolvedPath = join(root, relative);
    expect(resolvedPath.startsWith(root)).toBe(true);
    const file = await readFile(resolvedPath);
    expect(file).toEqual(Buffer.from([1]));
  });

  it("deleteCover ลบไฟล์ที่ storeCover สร้างไว้", async () => {
    const repo = new LocalStorageRepository(root);
    const url = await repo.storeCover({
      bookId: "book-1",
      filename: "a.jpg",
      body: new Uint8Array([1]),
      contentType: "image/jpeg",
    });
    const relative = url.replace("/uploads/", "");

    await repo.deleteCover(relative);

    await expect(readFile(join(root, relative))).rejects.toThrow();
  });

  it("deleteCover ป้องกัน path traversal ไม่ให้ลบไฟล์นอก uploadRoot", async () => {
    const repo = new LocalStorageRepository(root);
    const outsideFile = join(root, "..", "storage-local-outside.txt");
    await writeFile(outsideFile, "secret");

    await expect(repo.deleteCover("../../storage-local-outside.txt")).rejects.toBeInstanceOf(
      DomainError,
    );
    await expect(readFile(outsideFile)).resolves.toEqual(Buffer.from("secret"));
  });
});
