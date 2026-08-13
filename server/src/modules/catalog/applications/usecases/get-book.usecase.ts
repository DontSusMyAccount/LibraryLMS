import "reflect-metadata";

import { inject, injectable } from "tsyringe";

import { DomainNotFoundError } from "../../../../domains/errors";
import { bookRepositoryToken, type IBookRepository } from "../ports/book.repository";
import { copyRepositoryToken, type ICopyRepository } from "../ports/copy.repository";
import type { IGetBookQuery, IGetBookReturnType } from "../schemas/catalog-schemas";

const BOOK_NOT_FOUND_MESSAGE = "ไม่พบหนังสือที่ค้นหา";

@injectable()
export class GetBookUsecase {
  constructor(
    @inject(bookRepositoryToken) private readonly books: IBookRepository,
    @inject(copyRepositoryToken) private readonly copies: ICopyRepository,
  ) {}

  async execute({ query }: { query: IGetBookQuery }): Promise<IGetBookReturnType> {
    const book = await this.books.findById(query.id);
    if (!book) {
      throw new DomainNotFoundError(BOOK_NOT_FOUND_MESSAGE);
    }

    const copies = await this.copies.listByBookId(query.id);
    return { book: { ...book, copies } };
  }
}
