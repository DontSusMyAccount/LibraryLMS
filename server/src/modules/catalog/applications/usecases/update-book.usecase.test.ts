import { describe, expect, it } from "vitest";

import { DomainConflictError, DomainError, DomainNotFoundError } from "../../../../domains/errors";
import type { AuditLog, BookTitle } from "../../../../shared";
import type { IAuditRepository } from "../../../shared/applications/ports/audit.repository";
import type { IBookRepository } from "../ports/book.repository";
import { UpdateBookUsecase } from "./update-book.usecase";

function buildBook(overrides: Partial<BookTitle> = {}): BookTitle {
  return {
    id: "b-1",
    isbn: "9786161234567",
    title: "นิยายทดสอบ",
    author: "นักเขียนทดสอบ",
    language: "th",
    categoryId: "cat-1",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function createBookRepository(records: BookTitle[]): IBookRepository {
  return {
    create: async () => buildBook(),
    findById: async (id) => records.find((book) => book.id === id) ?? null,
    findByIsbn: async (isbn) => records.find((book) => book.isbn === isbn) ?? null,
    list: async () => ({ data: [], total: 0, page: 1, limit: 12, totalPages: 0 }),
    update: async (id, input) => {
      const existing = records.find((book) => book.id === id);
      if (!existing) return null;
      return buildBook({ ...existing, ...input });
    },
  };
}

function createAuditRepository(): IAuditRepository & { records: AuditLog[] } {
  const records: AuditLog[] = [];
  return {
    records,
    record: async (input) => {
      const log: AuditLog = {
        id: `log-${records.length + 1}`,
        userId: input.userId,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        metadata: input.metadata,
        createdAt: "2026-01-01T00:00:00.000Z",
      };
      records.push(log);
      return log;
    },
  };
}

describe("UpdateBookUsecase", () => {
  it("อัปเดตฟิลด์ที่อนุญาตและเขียน audit log", async () => {
    const repo = createBookRepository([buildBook()]);
    const auditRepo = createAuditRepository();
    const usecase = new UpdateBookUsecase(repo, auditRepo);

    const result = await usecase.execute({
      command: { id: "b-1", title: "ชื่อใหม่", description: "รายละเอียดใหม่", publishedYear: 2025 },
      actorId: "u-admin",
    });

    expect(result.book.title).toBe("ชื่อใหม่");
    expect(result.book.description).toBe("รายละเอียดใหม่");
    expect(result.book.publishedYear).toBe(2025);
    expect(result.book.author).toBe("นักเขียนทดสอบ");
    expect(auditRepo.records).toHaveLength(1);
    expect(auditRepo.records[0]).toMatchObject({
      userId: "u-admin",
      action: "book.updated",
      entityType: "book",
      entityId: "b-1",
    });
  });

  it("หนังสือไม่เจอ throw DomainNotFoundError", async () => {
    const repo = createBookRepository([]);
    const usecase = new UpdateBookUsecase(repo, createAuditRepository());

    await expect(
      usecase.execute({ command: { id: "b-missing", title: "ชื่อใหม่" } }),
    ).rejects.toBeInstanceOf(DomainNotFoundError);
  });

  it("isbn รูปแบบไม่ถูกต้อง throw 422 และไม่เขียน audit", async () => {
    const repo = createBookRepository([buildBook()]);
    const auditRepo = createAuditRepository();
    const usecase = new UpdateBookUsecase(repo, auditRepo);

    await expect(usecase.execute({ command: { id: "b-1", isbn: "invalid-isbn" } })).rejects.toThrow(
      DomainError,
    );
    expect(auditRepo.records).toHaveLength(0);
  });

  it("isbn ไปชนกับเล่มอื่น throw DomainConflictError", async () => {
    const repo = createBookRepository([
      buildBook({ id: "b-1", isbn: "9786161234567" }),
      buildBook({ id: "b-2", isbn: "9786167654321" }),
    ]);
    const usecase = new UpdateBookUsecase(repo, createAuditRepository());

    await expect(
      usecase.execute({ command: { id: "b-1", isbn: "9786167654321" } }),
    ).rejects.toBeInstanceOf(DomainConflictError);
  });

  it("อัปเดตเป็น isbn เดิมของตัวเองไม่ถูกตีเป็น conflict", async () => {
    const repo = createBookRepository([buildBook({ id: "b-1", isbn: "9786161234567" })]);
    const usecase = new UpdateBookUsecase(repo, createAuditRepository());

    const result = await usecase.execute({
      command: { id: "b-1", isbn: "978-616-1234-567" },
    });

    expect(result.book.isbn).toBe("9786161234567");
  });

  it("command ว่างไม่เปลี่ยนอะไร แต่ยังเขียน audit", async () => {
    const repo = createBookRepository([buildBook()]);
    const auditRepo = createAuditRepository();
    const usecase = new UpdateBookUsecase(repo, auditRepo);

    const result = await usecase.execute({ command: { id: "b-1" }, actorId: "u-admin" });

    expect(result.book.title).toBe("นิยายทดสอบ");
    expect(auditRepo.records).toHaveLength(1);
  });
});
