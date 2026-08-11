import type { PaginatedResponse, ReservationRecord, ReservationStatus } from "@libsys/shared";

import { eden } from "@/app/_shared/lib/eden-client";
import { edenRequest } from "@/app/_shared/lib/eden-helpers";

import { buildBookNameMap, type BookNameMapValue } from "../reservation.status";
import type {
  ListReservationsParams,
  ReservationListItem,
  ReservationListPage,
} from "../reservation.types";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 12;
const BOOKS_FETCH_LIMIT = 100;

export async function fetchReservations(
  params: ListReservationsParams,
): Promise<ReservationListPage> {
  const page = params.page || DEFAULT_PAGE;
  const limit = params.limit || DEFAULT_LIMIT;
  const query: { status?: ReservationStatus; page: number; limit: number } = { page, limit };
  if (params.status) {
    query.status = params.status;
  }

  const result = (await edenRequest(
    await eden.reservations.get({ query }),
  )) as PaginatedResponse<ReservationRecord>;

  const bookNameMap = await fetchBookNameMap();

  return {
    ...result,
    data: result.data.map((reservation) => enrichReservation(reservation, bookNameMap)),
  };
}

function enrichReservation(
  reservation: ReservationRecord,
  bookNameMap: Map<string, BookNameMapValue>,
): ReservationListItem {
  const book = bookNameMap.get(reservation.bookId);
  return {
    ...reservation,
    bookTitle: book?.title,
    bookAuthor: book?.author,
  };
}

async function fetchBookNameMap(): Promise<Map<string, BookNameMapValue>> {
  try {
    const books = await fetchAllPages(async (page) =>
      edenRequest(await eden.catalog.books.get({ query: { page, limit: BOOKS_FETCH_LIMIT } })),
    );
    return buildBookNameMap(books);
  } catch {
    return new Map<string, BookNameMapValue>();
  }
}

async function fetchAllPages<T>(
  requestPage: (page: number) => Promise<PaginatedResponse<T>>,
): Promise<T[]> {
  const collected: T[] = [];
  let page = 1;
  let totalPages = 1;
  do {
    const result = await requestPage(page);
    collected.push(...result.data);
    totalPages = result.totalPages;
    page += 1;
  } while (page <= totalPages);
  return collected;
}

export async function markReady(id: string): Promise<ReservationRecord> {
  const result = await edenRequest(await eden.reservations({ id }).ready.put());
  return result.reservation;
}

export async function fulfill(id: string, loanId: string): Promise<ReservationRecord> {
  const result = await edenRequest(await eden.reservations({ id }).fulfill.post({ loanId }));
  return result.reservation;
}
