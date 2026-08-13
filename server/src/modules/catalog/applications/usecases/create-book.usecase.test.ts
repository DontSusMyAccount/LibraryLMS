import { describe, expect, it } from "vitest";

import { DomainConflictError, DomainError } from "../../../../domains/errors";
import type { AuditLog, BookTitle } from "../../../../shared";
import type { IAuditRepository } from "../../../shared/applications/ports/audit.repository";
import type { IBookRepository } from "../ports/book.repository";
import { CreateBookUsecase } from "./create-book.usecase";

function buildBook(overrides: Partial<BookTitle> = {}): BookTitle {
  return {
    id: "b-1",
    isbn: "9786161234567",
    title: "นิยายทดสอบ",
    author: "นักเขียนทดสอบ",
    publisher: "สำนักพิมพ์ทดสอบ",
    language: "th",
    categoryId: "cat-1",
    description: "คำอธิบาย",
    publishedYear: 2024,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function createBookRepository(existing: BookTitle[] = []): IBookRepository {
  return {
    create: async (input) => buildBook({ ...input, id: "b-new", title: input.title }),
    findById: async (id) => existing.find((book) => book.id === id) ?? null,
    findByIsbn: async (isbn) => existing.find((book) => book.isbn === isbn) ?? null,
    list: async () => ({ data: [], total: 0, page: 1, limit: 12, totalPages: 0 }),
    update: async () => null,
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

describe("CreateBookUsecase", () => {
  it("สร้างหนังสือได้ คืน BookTitle และเขียน audit log (entity_type=book)", async () => {
    const bookRepo = createBookRepository();
    const auditRepo = createAuditRepository();
    const usecase = new CreateBookUsecase(bookRepo, auditRepo);

    const result = await usecase.execute({
      command: { title: "นิยายทดสอบ", author: "นักเขียนทดสอบ" },
      actorId: "u-admin",
    });

    expect(result.book.title).toBe("นิยายทดสอบ");
    expect(result.book.author).toBe("นักเขียนทดสอบ");
    expect(result.book).not.toHaveProperty("passwordHash");
    expect(auditRepo.records).toHaveLength(1);
    expect(auditRepo.records[0]).toMatchObject({
      userId: "u-admin",
      action: "book.created",
      entityType: "book",
      entityId: result.book.id,
    });
  });

  it("ไม่มี title throw 422 (ข้อมูลไม่ครบ)", async () => {
    const usecase = new CreateBookUsecase(createBookRepository(), createAuditRepository());

    await expect(
      usecase.execute({ command: { title: "   ", author: "นักเขียนทดสอบ" } }),
    ).rejects.toThrow(DomainError);
  });

  it("ไม่มี author throw 422 (ข้อมูลไม่ครบ)", async () => {
    const usecase = new CreateBookUsecase(createBookRepository(), createAuditRepository());

    await expect(usecase.execute({ command: { title: "นิยายทดสอบ", author: "" } })).rejects.toThrow(
      DomainError,
    );
  });

  it("isbn รูปแบบไม่ถูกต้อง throw 422", async () => {
    const usecase = new CreateBookUsecase(createBookRepository(), createAuditRepository());

    await expect(
      usecase.execute({ command: { title: "นิยายทดสอบ", author: "นักเขียนทดสอบ", isbn: "abc" } }),
    ).rejects.toThrow(DomainError);
  });

  it("isbn ซ้ำ throw DomainConflictError และไม่เขียน audit log", async () => {
    const existing = buildBook({ id: "b-exist", isbn: "9786161234567" });
    const bookRepo = createBookRepository([existing]);
    const auditRepo = createAuditRepository();
    const usecase = new CreateBookUsecase(bookRepo, auditRepo);

    await expect(
      usecase.execute({
        command: { title: "อีกเล่ม", author: "นักเขียนทดสอบ", isbn: "978-616-1234-567" },
      }),
    ).rejects.toBeInstanceOf(DomainConflictError);
    expect(auditRepo.records).toHaveLength(0);
  });

  it("isbn ซ้ำจะตัดเครื่องหมายขีดออกก่อนเทียบ (normalize)", async () => {
    const bookRepo = createBookRepository([buildBook({ id: "b-exist", isbn: "9786161234567" })]);
    const usecase = new CreateBookUsecase(bookRepo, createAuditRepository());

    await expect(
      usecase.execute({
        command: { title: "อีกเล่ม", author: "นักเขียนทดสอบ", isbn: "978-616-123-4567" },
      }),
    ).rejects.toBeInstanceOf(DomainConflictError);
  });
});
