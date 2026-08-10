import type { BookCopy, CopyStatus } from "../../../../shared";

export const copyRepositoryToken = Symbol("CopyRepository").toString();

export interface ICreateCopyRecord {
  bookId: string;
  copyCode: string;
  branchId?: string;
  shelfLocation?: string;
  acquiredAt?: string;
}

export interface ICopyRepository {
  findById(id: string): Promise<BookCopy | null>;
  findByCopyCode(copyCode: string): Promise<BookCopy | null>;
  create(input: ICreateCopyRecord): Promise<BookCopy>;
  updateStatus(id: string, status: CopyStatus): Promise<BookCopy | null>;
  listByBookId(bookId: string): Promise<BookCopy[]>;
  listByBookIds(bookIds: string[]): Promise<BookCopy[]>;
}
