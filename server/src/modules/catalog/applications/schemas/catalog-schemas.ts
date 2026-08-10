import type {
  BookCopy,
  BookTitle,
  BookWithCopies,
  Category,
  CopyStatus,
  Paginated,
} from "../../../../shared";

export interface ICreateBookCommand {
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

export interface ICreateBookReturnType {
  book: BookTitle;
}

export interface IUpdateBookCommand extends Partial<ICreateBookCommand> {
  id: string;
}

export type IUpdateBookBody = Partial<ICreateBookCommand>;

export interface IUpdateBookReturnType {
  book: BookTitle;
}

export interface IListBooksQuery {
  categoryId?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface IBookListItem extends BookWithCopies {
  totalCopies: number;
  availableCopies: number;
}

export type IListBooksReturnType = Paginated<IBookListItem>;

export interface IGetBookCommand {
  id: string;
}

export interface IGetBookReturnType {
  book: BookWithCopies;
}

export interface ICreateCopyCommand {
  bookId: string;
  copyCode: string;
  branchId?: string;
  shelfLocation?: string;
  acquiredAt?: string;
}

export type ICreateCopyBody = Omit<ICreateCopyCommand, "bookId">;

export interface ICreateCopyReturnType {
  copy: BookCopy;
}

export interface IUpdateCopyStatusCommand {
  id: string;
  status: CopyStatus;
}

export type IUpdateCopyStatusBody = Omit<IUpdateCopyStatusCommand, "id">;

export interface IUpdateCopyStatusReturnType {
  copy: BookCopy;
}

export interface ICategoryNode extends Category {
  children: ICategoryNode[];
}

export type IListCategoriesReturnType = ICategoryNode[];
