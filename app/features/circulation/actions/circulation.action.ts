import type {
  CheckinResult,
  CheckoutResult,
  MemberType,
  PaginatedResponse,
  ReservationStatus,
  UserPublic,
  UserRole,
} from "@libsys/shared";

import { eden } from "@/app/_shared/lib/eden-client";
import { edenRequest } from "@/app/_shared/lib/eden-helpers";

import { resolveMaxRenewals } from "../circulation.policy";
import type { ActiveLoanItem } from "../circulation.types";

const FETCH_LIMIT = 100;

const ACTIVE_RESERVATION_STATUSES: ReadonlySet<ReservationStatus> = new Set([
  "waiting",
  "ready",
  "suspended",
]);

export async function searchMembers(query: string): Promise<UserPublic[]> {
  const result = await edenRequest(await eden.users.search.get({ query: { q: query } }));
  return result.data;
}

export async function loadActiveLoans(userId: string): Promise<ActiveLoanItem[]> {
  const result = await edenRequest(await eden.circulation.loans.active.get({ query: { userId } }));
  const [copyBookIds, reservedBookIds] = await Promise.all([
    fetchCopyBookIdMap(),
    fetchActiveReservedBookIds(),
  ]);
  return result.loans.map((item) => {
    const bookId = copyBookIds.get(item.loan.copyId);
    const hasActiveReservation = bookId ? reservedBookIds.has(bookId) : false;
    return {
      loan: item.loan,
      overdue: item.overdue,
      daysOverdue: item.daysOverdue,
      hasActiveReservation,
    };
  });
}

export async function fetchMemberFinesTotal(): Promise<number | null> {
  return null;
}

export async function fetchMemberMaxRenewals(
  role: UserRole,
  memberType: MemberType,
): Promise<number> {
  return resolveMaxRenewals(role, memberType);
}

export async function checkout(userId: string, copyCode: string): Promise<CheckoutResult> {
  return edenRequest(await eden.circulation.checkout.post({ userId, copyCode }));
}

export async function checkin(copyCode: string): Promise<CheckinResult> {
  return edenRequest(await eden.circulation.checkin.post({ copyCode }));
}

export async function renew(loanId: string): Promise<CheckoutResult> {
  return edenRequest(await eden.circulation.loans({ id: loanId }).renew.post());
}

export async function recall(loanId: string): Promise<CheckoutResult> {
  return edenRequest(await eden.circulation.loans({ id: loanId }).recall.post());
}

async function fetchActiveReservedBookIds(): Promise<Set<string>> {
  try {
    const reservations = await fetchAllPages(async (page) =>
      edenRequest(await eden.reservations.get({ query: { page, limit: FETCH_LIMIT } })),
    );
    const reserved = new Set<string>();
    for (const reservation of reservations) {
      if (ACTIVE_RESERVATION_STATUSES.has(reservation.status)) {
        reserved.add(reservation.bookId);
      }
    }
    return reserved;
  } catch {
    return new Set<string>();
  }
}

async function fetchCopyBookIdMap(): Promise<Map<string, string>> {
  try {
    const books = await fetchAllPages(async (page) =>
      edenRequest(await eden.catalog.books.get({ query: { page, limit: FETCH_LIMIT } })),
    );
    const map = new Map<string, string>();
    for (const book of books) {
      for (const copy of book.copies) {
        map.set(copy.id, book.id);
      }
    }
    return map;
  } catch {
    return new Map<string, string>();
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
