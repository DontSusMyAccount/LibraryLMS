import { describe, expect, it } from "vitest";

import {
  auditLogs,
  bookCopies,
  books,
  borrowingPolicies,
  branches,
  categories,
  courseReserves,
  fines,
  loans,
  notificationLogs,
  reservations,
  systemSettings,
  tables,
  users,
} from "./index";

const EXPECTED_TABLE_NAMES = [
  "branches",
  "categories",
  "users",
  "borrowingPolicies",
  "systemSettings",
  "books",
  "bookCopies",
  "courseReserves",
  "loans",
  "reservations",
  "fines",
  "notificationLogs",
  "auditLogs",
] as const;

const EXPECTED_TABLE_COUNT = 13;

const DB_TABLE_NAME = Symbol.for("drizzle:Name");
const PG_INLINE_FOREIGN_KEYS = Symbol.for("drizzle:PgInlineForeignKeys");

interface PgForeignKeyLike {
  onDelete: string;
  onUpdate: string;
  reference: () => { columns: (typeof users.id)[]; foreignTable: unknown };
}

function inlineFk(table: object, columnName: string): PgForeignKeyLike | undefined {
  const fks: PgForeignKeyLike[] =
    (table as Record<symbol, PgForeignKeyLike[]>)[PG_INLINE_FOREIGN_KEYS] ?? [];
  return fks.find((fk) => fk.reference().columns.some((column) => column.name === columnName));
}

function dbTableName(table: unknown): unknown {
  return (table as Record<symbol, unknown>)[DB_TABLE_NAME];
}

describe("database schema", () => {
  it("exports exactly 13 tables matching db/schema.sql", () => {
    const tableKeys = Object.keys(tables);
    expect(tableKeys).toHaveLength(EXPECTED_TABLE_COUNT);
    expect([...tableKeys].sort()).toEqual([...EXPECTED_TABLE_NAMES].sort());
  });

  it("maps each table to the snake_case name in db/schema.sql", () => {
    const expectedDbNames = {
      branches: "branches",
      categories: "categories",
      users: "users",
      borrowingPolicies: "borrowing_policies",
      systemSettings: "system_settings",
      books: "books",
      bookCopies: "book_copies",
      courseReserves: "course_reserves",
      loans: "loans",
      reservations: "reservations",
      fines: "fines",
      notificationLogs: "notification_logs",
      auditLogs: "audit_logs",
    };

    for (const [key, dbName] of Object.entries(expectedDbNames)) {
      expect(dbTableName(tables[key as keyof typeof tables])).toBe(dbName);
    }
  });

  it("users: role uses the user_role enum with all 5 values", () => {
    expect(users.role.enumValues).toEqual(["admin", "librarian", "faculty", "staff", "student"]);
  });

  it("users: status uses the user_status enum with all 4 values", () => {
    expect(users.status.enumValues).toEqual(["active", "suspended", "graduated", "inactive"]);
  });

  it("loans: exposes due_at, borrow/copy/user FKs and loan_status enum", () => {
    expect(loans.dueAt.name).toBe("due_at");
    expect(loans.copyId.name).toBe("copy_id");
    expect(loans.userId.name).toBe("user_id");
    expect(loans.checkedOutBy.name).toBe("checked_out_by");
    expect(loans.status.enumValues).toEqual(["active", "returned", "overdue", "lost"]);
  });

  it("book_copies: copy_code is unique", () => {
    expect(bookCopies.copyCode.name).toBe("copy_code");
    expect(bookCopies.copyCode.isUnique).toBe(true);
  });

  it("fines: amount is NUMERIC(10,2) and reason uses fine_reason enum", () => {
    const amountColumn = fines.amount as typeof fines.amount & {
      precision?: number;
      scale?: number;
    };
    expect(amountColumn.columnType).toBe("PgNumeric");
    expect(amountColumn.precision).toBe(10);
    expect(amountColumn.scale).toBe(2);
    expect(fines.reason.enumValues).toEqual(["overdue", "lost", "damaged"]);
  });

  it("audit_logs: metadata is jsonb", () => {
    expect(auditLogs.metadata.columnType).toBe("PgJsonb");
  });

  it("borrowing_policies: role and member_type columns for UNIQUE(role, member_type)", () => {
    expect(borrowingPolicies.role.enumValues).toEqual([
      "admin",
      "librarian",
      "faculty",
      "staff",
      "student",
    ]);
    expect(borrowingPolicies.memberType.name).toBe("member_type");
    expect(borrowingPolicies.memberType.default).toBe("general");
  });

  it("book_copies: book_id FK cascades", () => {
    expect(bookCopies.bookId.notNull).toBe(true);
    expect(inlineFk(bookCopies, "book_id")?.onDelete).toBe("cascade");
  });

  it("loans: copy_id FK restricts delete", () => {
    expect(inlineFk(loans, "copy_id")?.onDelete).toBe("restrict");
  });

  it("categories: parent_id self-references with set null", () => {
    const fk = inlineFk(categories, "parent_id");
    expect(fk?.onDelete).toBe("set null");
    expect(fk?.reference().foreignTable).toBe(categories);
  });

  it("tables expose the full schema type for the db client", () => {
    const allTables = {
      branches,
      categories,
      users,
      borrowingPolicies,
      systemSettings,
      books,
      bookCopies,
      courseReserves,
      loans,
      reservations,
      fines,
      notificationLogs,
      auditLogs,
    };
    expect(tables).toEqual(allTables);
  });
});
