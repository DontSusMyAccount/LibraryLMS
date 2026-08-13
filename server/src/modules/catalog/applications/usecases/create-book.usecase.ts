import "reflect-metadata";

import { inject, injectable } from "tsyringe";

import { DomainConflictError, DomainError } from "../../../../domains/errors";
import { isValidIsbn, normalizeIsbn } from "../lib/isbn";
import {
  auditRepositoryToken,
  type IAuditRepository,
} from "../../../shared/applications/ports/audit.repository";
import { bookRepositoryToken, type IBookRepository } from "../ports/book.repository";
import type { ICreateBookCommand, ICreateBookReturnType } from "../schemas/catalog-schemas";

const TITLE_REQUIRED_MESSAGE = "ต้องระบุชื่อหนังสือ";
const AUTHOR_REQUIRED_MESSAGE = "ต้องระบุชื่อผู้แต่ง";
const INVALID_ISBN_MESSAGE = "รูปแบบ ISBN ไม่ถูกต้อง (ต้องเป็น ISBN-10 หรือ ISBN-13)";
const DUPLICATE_ISBN_MESSAGE = "มีหนังสือที่ใช้ ISBN นี้อยู่แล้ว";

@injectable()
export class CreateBookUsecase {
  constructor(
    @inject(bookRepositoryToken) private readonly books: IBookRepository,
    @inject(auditRepositoryToken) private readonly audit: IAuditRepository,
  ) {}

  async execute({
    command,
    actorId,
  }: {
    command: ICreateBookCommand;
    actorId?: string;
  }): Promise<ICreateBookReturnType> {
    if (!command.title.trim()) {
      throw new DomainError(TITLE_REQUIRED_MESSAGE, 422);
    }
    if (!command.author.trim()) {
      throw new DomainError(AUTHOR_REQUIRED_MESSAGE, 422);
    }

    const normalizedIsbn = command.isbn === undefined ? undefined : normalizeIsbn(command.isbn);
    if (normalizedIsbn !== undefined && !isValidIsbn(normalizedIsbn)) {
      throw new DomainError(INVALID_ISBN_MESSAGE, 422);
    }
    if (normalizedIsbn !== undefined) {
      const existing = await this.books.findByIsbn(normalizedIsbn);
      if (existing) {
        throw new DomainConflictError(DUPLICATE_ISBN_MESSAGE);
      }
    }

    const book = await this.books.create({
      ...command,
      isbn: normalizedIsbn,
    });

    await this.audit.record({
      userId: actorId,
      action: "book.created",
      entityType: "book",
      entityId: book.id,
      metadata: { title: book.title, author: book.author },
    });

    return { book };
  }
}
