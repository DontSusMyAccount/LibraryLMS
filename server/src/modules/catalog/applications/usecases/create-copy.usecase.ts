import "reflect-metadata";

import { inject, injectable } from "tsyringe";

import { DomainConflictError, DomainNotFoundError } from "../../../../domains/errors";
import { bookRepositoryToken, type IBookRepository } from "../ports/book.repository";
import { copyRepositoryToken, type ICopyRepository } from "../ports/copy.repository";
import type { ICreateCopyCommand, ICreateCopyReturnType } from "../schemas/catalog-schemas";

const BOOK_NOT_FOUND_MESSAGE = "ไม่พบหนังสือที่ต้องการเพิ่มสำเนา";
const DUPLICATE_COPY_CODE_MESSAGE = "มีรหัสสำเนานี้อยู่แล้วในระบบ";

@injectable()
export class CreateCopyUsecase {
  constructor(
    @inject(bookRepositoryToken) private readonly books: IBookRepository,
    @inject(copyRepositoryToken) private readonly copies: ICopyRepository,
  ) {}

  async execute({ command }: { command: ICreateCopyCommand }): Promise<ICreateCopyReturnType> {
    const book = await this.books.findById(command.bookId);
    if (!book) {
      throw new DomainNotFoundError(BOOK_NOT_FOUND_MESSAGE);
    }

    const copyCode = command.copyCode.trim();
    const existing = await this.copies.findByCopyCode(copyCode);
    if (existing) {
      throw new DomainConflictError(DUPLICATE_COPY_CODE_MESSAGE);
    }

    const copy = await this.copies.create({
      bookId: command.bookId,
      copyCode,
      branchId: command.branchId,
      shelfLocation: command.shelfLocation,
      acquiredAt: command.acquiredAt,
    });

    return { copy };
  }
}
