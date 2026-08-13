import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  authHeaders,
  bootstrapTestContext,
  cleanupTestRows,
  createBookViaApi,
  type TestContext,
} from "./setup";

describe("Reservations — real DB", () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await bootstrapTestContext();
  });

  afterAll(async () => {
    await cleanupTestRows(ctx);
    await ctx.client.end();
  });

  it("จอง 2 คน → คิว FIFO (คนก่อนมาก่อน) → mark ready ได้", async () => {
    const book = await createBookViaApi(ctx, ctx.unique("reserve"));
    const memberA = await ctx.createMember("memberA");
    const memberB = await ctx.createMember("memberB");

    // A จองก่อน
    const firstRes = await ctx.request("/reservations/", {
      method: "POST",
      headers: authHeaders(ctx.adminToken),
      body: JSON.stringify({ bookId: book.id, userId: memberA.id }),
    });
    expect(firstRes.status).toBe(200);
    const firstReservation = (
      firstRes.body?.data as { reservation: { id: string; status: string; reservedAt: string } }
    ).reservation;
    expect(firstReservation.status).toBe("waiting");
    ctx.rows.reservationIds.push(firstReservation.id);

    // B จองทีหลัง
    const secondRes = await ctx.request("/reservations/", {
      method: "POST",
      headers: authHeaders(ctx.adminToken),
      body: JSON.stringify({ bookId: book.id, userId: memberB.id }),
    });
    expect(secondRes.status).toBe(200);
    const secondReservation = (secondRes.body?.data as { reservation: { id: string } }).reservation;
    ctx.rows.reservationIds.push(secondReservation.id);

    // mark ready คนแรก → เลื่อนคนถัดไปในคิวเป็น ready
    const markReadyResponse = await ctx.request(`/reservations/${firstReservation.id}/ready`, {
      method: "PUT",
      headers: authHeaders(ctx.adminToken),
    });
    expect(markReadyResponse.status).toBe(200);
    const readyReservation = (
      markReadyResponse.body?.data as {
        reservation: { status: string; readyAt: string; pickupDeadline: string };
      }
    ).reservation;
    expect(readyReservation.status).toBe("ready");
    expect(readyReservation.readyAt).toBeTruthy();
    expect(readyReservation.pickupDeadline).toBeTruthy();
  });

  it("จองซ้ำ user + book เดิมที่ยัง active → 409", async () => {
    const book = await createBookViaApi(ctx, ctx.unique("dup"));
    const member = await ctx.createMember("dupMember");

    const first = await ctx.request("/reservations/", {
      method: "POST",
      headers: authHeaders(ctx.adminToken),
      body: JSON.stringify({ bookId: book.id, userId: member.id }),
    });
    expect(first.status).toBe(200);
    ctx.rows.reservationIds.push(
      (first.body?.data as { reservation: { id: string } }).reservation.id,
    );

    const second = await ctx.request("/reservations/", {
      method: "POST",
      headers: authHeaders(ctx.adminToken),
      body: JSON.stringify({ bookId: book.id, userId: member.id }),
    });
    expect(second.status).toBe(409);
    expect(second.body?.success).toBe(false);
  });
});
