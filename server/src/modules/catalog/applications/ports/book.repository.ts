import type { BookTitle, Paginated } from "../../../../shared";

export const bookRepositoryToken = Symbol("BookRepository").toString();

export interface ICreateBookRecord {
  isbn?: string;
  title: string;
  author: string;
  publisher?: string;
  language?: string;
  categoryId?: string;
  description?: string;
  coverUrl?: string;
  publishedYear?: number;
}

export interface IUpdateBookRecord {
  isbn?: string;
  title?: string;
  author?: string;
  publisher?: string;
  language?: string;
  categoryId?: string;
  description?: string;
  coverUrl?: string;
  publishedYear?: number;
}

export interface IBookListFilter {
  categoryId?: string;
  search?: string;
  page: number;
  limit: number;
}

export interface IBookRepository {
  create(input: ICreateBookRecord): Promise<BookTitle>;
  findById(id: string): Promise<BookTitle | null>;
  findByIsbn(isbn: string): Promise<BookTitle | null>;
  list(filter: IBookListFilter): Promise<Paginated<BookTitle>>;
  update(id: string, input: IUpdateBookRecord): Promise<BookTitle | null>;
}
