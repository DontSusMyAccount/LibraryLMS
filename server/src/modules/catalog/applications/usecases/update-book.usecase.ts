import "reflect-metadata";

import { inject, injectable } from "tsyringe";

import { DomainConflictError, DomainError, DomainNotFoundError } from "../../../../domains/errors";
import { isValidIsbn, normalizeIsbn } from "../lib/isbn";
import { auditRepositoryToken, type IAuditRepository } from "../ports/audit.repository";
import { bookRepositoryToken, type IBookRepository } from "../ports/book.repository";
import type { IUpdateBookCommand, IUpdateBookReturnType } from "../schemas/catalog-schemas";

const BOOK_NOT_FOUND_MESSAGE = "ไม่พบหนังสือที่ต้องการแก้ไข";
const INVALID_ISBN_MESSAGE = "รูปแบบ ISBN ไม่ถูกต้อง (ต้องเป็น ISBN-10 หรือ ISBN-13)";
const DUPLICATE_ISBN_MESSAGE = "มีหนังสือที่ใช้ ISBN นี้อยู่แล้ว";

@injectable()
export class UpdateBookUsecase {
  constructor(
    @inject(bookRepositoryToken) private readonly books: IBookRepository,
    @inject(auditRepositoryToken) private readonly audit: IAuditRepository,
  ) {}

  async execute({
    command,
    actorId,
  }: {
    command: IUpdateBookCommand;
    actorId?: string;
  }): Promise<IUpdateBookReturnType> {
    const existing = await this.books.findById(command.id);
    if (!existing) {
      throw new DomainNotFoundError(BOOK_NOT_FOUND_MESSAGE);
    }

    const { id, ...fields } = command;
    const normalizedIsbn = fields.isbn === undefined ? undefined : normalizeIsbn(fields.isbn);
    if (normalizedIsbn !== undefined && !isValidIsbn(normalizedIsbn)) {
      throw new DomainError(INVALID_ISBN_MESSAGE, 422);
    }
    if (normalizedIsbn !== undefined && normalizedIsbn !== existing.isbn) {
      const conflicting = await this.books.findByIsbn(normalizedIsbn);
      if (conflicting && conflicting.id !== id) {
        throw new DomainConflictError(DUPLICATE_ISBN_MESSAGE);
      }
    }

    const book = await this.books.update(id, { ...fields, isbn: normalizedIsbn });
    if (!book) {
      throw new DomainNotFoundError(BOOK_NOT_FOUND_MESSAGE);
    }

    await this.audit.record({
      userId: actorId,
      action: "book.updated",
      entityType: "book",
      entityId: id,
      metadata: { title: book.title },
    });

    return { book };
  }
}
