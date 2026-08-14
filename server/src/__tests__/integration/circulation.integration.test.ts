import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { and, eq } from "drizzle-orm";

import { auditLogs, bookCopies, loans } from "../../infrastructure/database/schema";
import { DrizzleLoanRepository } from "../../modules/circulation/adapters/repository/loan.drizzle.repository";
import {
  authHeaders,
  bootstrapTestContext,
  cleanupTestRows,
  createBookViaApi,
  createCopyViaApi,
  getCopyCode,
  type TestContext,
} from "./setup";

describe("Circulation — real DB", () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await bootstrapTestContext();
  });

  afterAll(async () => {
    await cleanupTestRows(ctx);
    await ctx.client.end();
  });

  it("body ไม่ครบ (copyCode ว่าง) → 422", async () => {
    const member = await ctx.createMember("member");

    const response = await ctx.request("/circulation/checkout", {
      method: "POST",
      headers: authHeaders(ctx.adminToken),
      body: JSON.stringify({ userId: member.id, copyCode: "" }),
    });
    expect(response.status).toBe(422);
    expect(response.body?.success).toBe(false);
  });

  it("checkout → active loans → renew → checkin ครบวงจร", async () => {
    const book = await createBookViaApi(ctx, ctx.unique("co2"));
    const copy = await createCopyViaApi(ctx, book.id, ctx.unique("copy2"));
    const member = await ctx.createMember("member2");
    const copyCode = await getCopyCode(ctx, copy.id);

    const checkoutResponse = await ctx.request("/circulation/checkout", {
      method: "POST",
      headers: authHeaders(ctx.adminToken),
      body: JSON.stringify({ userId: member.id, copyCode }),
    });
    expect(checkoutResponse.status).toBe(200);
    const checkoutData = checkoutResponse.body?.data as {
      loan: { id: string; status: string; dueAt: string };
      dueDate: string;
    };
    expect(checkoutData.loan.status).toBe("active");
    expect(new Date(checkoutData.dueDate).getTime()).toBeGreaterThan(Date.now());
    ctx.rows.loanIds.push(checkoutData.loan.id);

    // audit trail ถูกเขียนใน transaction เดียวกับ loan + copy status
    const auditRows = await ctx.db
      .select({ id: auditLogs.id })
      .from(auditLogs)
      .where(
        and(eq(auditLogs.action, "loan.created"), eq(auditLogs.entityId, checkoutData.loan.id)),
      );
    expect(auditRows).toHaveLength(1);

    // active loans
    const activeResponse = await ctx.request(`/circulation/loans/active?userId=${member.id}`, {
      headers: authHeaders(ctx.adminToken),
    });
    expect(activeResponse.status).toBe(200);
    const activeData = activeResponse.body?.data as {
      loans: { loan: { id: string; status: string } }[];
    };
    expect(activeData.loans.some((item) => item.loan.id === checkoutData.loan.id)).toBe(true);

    // renew
    const renewResponse = await ctx.request(`/circulation/loans/${checkoutData.loan.id}/renew`, {
      method: "POST",
      headers: authHeaders(ctx.adminToken),
    });
    expect(renewResponse.status).toBe(200);
    const renewData = renewResponse.body?.data as {
      loan: { id: string; renewedCount: number };
    };
    expect(renewData.loan.renewedCount).toBe(1);

    // checkin
    const checkinResponse = await ctx.request("/circulation/checkin", {
      method: "POST",
      headers: authHeaders(ctx.adminToken),
      body: JSON.stringify({ copyCode }),
    });
    expect(checkinResponse.status).toBe(200);
    const checkinData = checkinResponse.body?.data as {
      loan: { id: string; status: string; returnedAt: string };
      fine: unknown;
    };
    expect(checkinData.loan.status).toBe("returned");
    expect(checkinData.loan.returnedAt).toBeTruthy();
  });

  it("checkout สำเนาที่ถูกยืมไปแล้ว → 409", async () => {
    const book = await createBookViaApi(ctx, ctx.unique("co3"));
    const copy = await createCopyViaApi(ctx, book.id, ctx.unique("copy3"));
    const member = await ctx.createMember("member3");
    const copyCode = await getCopyCode(ctx, copy.id);

    const first = await ctx.request("/circulation/checkout", {
      method: "POST",
      headers: authHeaders(ctx.adminToken),
      body: JSON.stringify({ userId: member.id, copyCode }),
    });
    expect(first.status).toBe(200);
    ctx.rows.loanIds.push((first.body?.data as { loan: { id: string } }).loan.id);

    const second = await ctx.request("/circulation/checkout", {
      method: "POST",
      headers: authHeaders(ctx.adminToken),
      body: JSON.stringify({ userId: member.id, copyCode }),
    });
    expect(second.status).toBe(409);
    expect(second.body?.success).toBe(false);
  });

  it("transaction: fn throw → rollback ทั้ง loan + copy status (ไม่เหลือครึ่งๆ)", async () => {
    const book = await createBookViaApi(ctx, ctx.unique("co4"));
    const copy = await createCopyViaApi(ctx, book.id, ctx.unique("copy4"));
    const member = await ctx.createMember("member4");

    const repo = new DrizzleLoanRepository(ctx.db);
    await expect(
      repo.runTransaction(async (unit) => {
        await unit.loans.createLoan({
          copyId: copy.id,
          userId: member.id,
          dueAt: new Date(Date.now() + 14 * 86_400_000).toISOString(),
          loanPeriodDays: 14,
          dailyFineRate: 5,
        });
        await unit.loans.updateCopyStatus(copy.id, "borrowed");
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");

    // ไม่มี loan ค้างอยู่ → rollback ทำงาน
    const loansAfter = await ctx.db
      .select({ id: loans.id })
      .from(loans)
      .where(eq(loans.userId, member.id));
    expect(loansAfter).toHaveLength(0);

    // copy status ไม่เปลี่ยน → rollback ทำงาน
    const [copyAfter] = await ctx.db
      .select({ status: bookCopies.status })
      .from(bookCopies)
      .where(eq(bookCopies.id, copy.id))
      .limit(1);
    expect(copyAfter?.status ?? null).toBe("available");
  });
});
