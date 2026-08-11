import type { BookCopy, BookTitle, CopyStatus, PaginatedResponse } from "@libsys/shared";

import { eden } from "@/app/_shared/lib/eden-client";
import { edenRequest } from "@/app/_shared/lib/eden-helpers";

import type {
  AddCopyInput,
  BookListItem,
  BookWithCopies,
  CategoryNode,
  CreateBookInput,
  ListBooksParams,
  UpdateBookInput,
} from "../catalog.types";

export async function fetchBooks(
  params: ListBooksParams,
): Promise<PaginatedResponse<BookListItem>> {
  const query: { page: number; limit: number; search?: string; categoryId?: string } = {
    page: params.page,
    limit: params.limit,
  };
  if (params.search) {
    query.search = params.search;
  }
  if (params.categoryId) {
    query.categoryId = params.categoryId;
  }
  return edenRequest(await eden.catalog.books.get({ query }));
}

export async function fetchBookDetail(bookId: string): Promise<BookWithCopies> {
  return edenRequest(await eden.catalog.books({ id: bookId }).get());
}

export async function fetchCategories(): Promise<CategoryNode[]> {
  const categories = await edenRequest(await eden.catalog.categories.get());
  return categories as unknown as CategoryNode[];
}

export async function createBook(input: CreateBookInput): Promise<BookTitle> {
  return edenRequest(await eden.catalog.books.post(input));
}

export async function updateBook(bookId: string, patch: UpdateBookInput): Promise<BookTitle> {
  return edenRequest(await eden.catalog.books({ id: bookId }).put(patch));
}

export async function uploadCover(bookId: string, file: File): Promise<string> {
  const result = await edenRequest(await eden.storage.covers.post({ bookId, file }));
  return result.url;
}

export async function addCopy(bookId: string, input: AddCopyInput): Promise<BookCopy> {
  return edenRequest(await eden.catalog.books({ id: bookId }).copies.post(input));
}

export async function changeCopyStatus(copyId: string, status: CopyStatus): Promise<BookCopy> {
  return edenRequest(await eden.catalog.copies({ id: copyId }).status.put({ status }));
}
