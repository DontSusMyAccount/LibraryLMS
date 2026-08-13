import { describe, expect, it, vi } from "vitest";

import { DomainError } from "../../../../domains/errors";
import type { IStorageRepository } from "../ports/storage.repository";
import { UploadCoverUsecase } from "./upload-cover.usecase";

describe("UploadCoverUsecase", () => {
  it("เรียก repo.storeCover แล้วคืน { url }", async () => {
    const storeCover = vi.fn(async () => "https://covers.ac.th/covers/book-1/uuid.jpg");
    const repo: IStorageRepository = { storeCover, deleteCover: async () => {} };
    const usecase = new UploadCoverUsecase(repo);

    const result = await usecase.execute({
      input: {
        bookId: "book-1",
        filename: "a.jpg",
        body: new Uint8Array([1, 2, 3]),
        contentType: "image/jpeg",
      },
    });

    expect(result.url).toBe("https://covers.ac.th/covers/book-1/uuid.jpg");
    expect(storeCover).toHaveBeenCalledTimes(1);
  });

  it("content-type ไม่อนุญาต → throw ก่อนเรียก repo (fast-fail)", async () => {
    const storeCover = vi.fn(async () => "url");
    const repo: IStorageRepository = { storeCover, deleteCover: async () => {} };
    const usecase = new UploadCoverUsecase(repo);

    await expect(
      usecase.execute({
        input: {
          bookId: "book-1",
          filename: "a.gif",
          body: new Uint8Array([1]),
          contentType: "image/gif",
        },
      }),
    ).rejects.toBeInstanceOf(DomainError);
    expect(storeCover).not.toHaveBeenCalled();
  });

  it("ไฟล์ใหญ่เกิน 5MB → throw ก่อนเรียก repo", async () => {
    const storeCover = vi.fn(async () => "url");
    const repo: IStorageRepository = { storeCover, deleteCover: async () => {} };
    const usecase = new UploadCoverUsecase(repo);

    await expect(
      usecase.execute({
        input: {
          bookId: "book-1",
          filename: "big.jpg",
          body: new Uint8Array(5 * 1024 * 1024 + 1),
          contentType: "image/jpeg",
        },
      }),
    ).rejects.toBeInstanceOf(DomainError);
    expect(storeCover).not.toHaveBeenCalled();
  });
});
