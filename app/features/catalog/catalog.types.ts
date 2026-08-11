import type { BookCopy, BookTitle, PaginatedResponse } from "@libsys/shared";

export interface BookListItem extends BookTitle {
  copies: BookCopy[];
  totalCopies: number;
  availableCopies: number;
}

export interface BookWithCopies extends BookTitle {
  copies: BookCopy[];
}

export interface CategoryNode {
  id: string;
  name: string;
  parentId?: string;
  children?: CategoryNode[];
}

export interface ListBooksParams {
  page: number;
  limit: number;
  search?: string;
  categoryId?: string;
}

export interface CreateBookInput {
  title: string;
  author: string;
  isbn?: string;
  publisher?: string;
  language?: string;
  categoryId?: string;
  description?: string;
  coverUrl?: string;
  publishedYear?: number;
}

export interface UpdateBookInput {
  coverUrl?: string;
  title?: string;
  author?: string;
  isbn?: string;
  publisher?: string;
  language?: string;
  categoryId?: string;
  description?: string;
  publishedYear?: number;
}

export interface AddCopyInput {
  copyCode: string;
  shelfLocation?: string;
}

export type BookListPage = PaginatedResponse<BookListItem>;
