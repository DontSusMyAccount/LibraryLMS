import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  authHeaders,
  bootstrapTestContext,
  cleanupTestRows,
  createBookViaApi,
  createCopyViaApi,
  uniqueIsbn,
  type TestContext,
} from "./setup";

describe("Catalog — real DB", () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await bootstrapTestContext();
  });

  afterAll(async () => {
    await cleanupTestRows(ctx);
    await ctx.client.end();
  });

  it("สร้างหนังสือ + สำเนา → search ภาษาไทยเจอ → detail มี copies", async () => {
    const title = `ทดสอบภาษาไทย ${ctx.unique("book")}`;
    const created = await createBookViaApi(ctx, title);

    const copyCode = ctx.unique("copy");
    await createCopyViaApi(ctx, created.id, copyCode);

    const searchResponse = await ctx.request(`/catalog/books?search=${encodeURIComponent(title)}`, {
      headers: authHeaders(ctx.adminToken),
    });
    expect(searchResponse.status).toBe(200);
    const searchData = searchResponse.body?.data as { items: unknown[] } | unknown[];
    const searchItems = Array.isArray(searchData)
      ? searchData
      : (searchData as { items: unknown[] }).items;
    expect(searchItems.length).toBeGreaterThanOrEqual(1);

    const detailResponse = await ctx.request(`/catalog/books/${created.id}`, {
      headers: authHeaders(ctx.adminToken),
    });
    expect(detailResponse.status).toBe(200);
    const detail = detailResponse.body?.data as {
      id: string;
      title: string;
      copies: { copyCode: string; status: string }[];
    };
    expect(detail.id).toBe(created.id);
    expect(detail.title).toBe(title);
    expect(detail.copies).toHaveLength(1);
    expect(detail.copies[0].copyCode).toBe(copyCode);
    expect(detail.copies[0].status).toBe("available");
  });

  it("สร้างหนังสือ ISBN ซ้ำ → 409", async () => {
    const isbn = uniqueIsbn(ctx);
    const bookBody = () =>
      JSON.stringify({ isbn, title: ctx.unique("dup"), author: "ผู้แต่งทดสอบ" });

    const first = await ctx.request("/catalog/books", {
      method: "POST",
      headers: authHeaders(ctx.adminToken),
      body: bookBody(),
    });
    expect(first.status).toBe(200);
    const id = (first.body?.data as { id: string }).id;
    ctx.rows.bookIds.push(id);

    const second = await ctx.request("/catalog/books", {
      method: "POST",
      headers: authHeaders(ctx.adminToken),
      body: bookBody(),
    });
    expect(second.status).toBe(409);
    expect(second.body?.success).toBe(false);
  });

  it("สร้างสำเนาโดยไม่มีสิทธิ์ (ไม่มี token) → 401", async () => {
    const created = await createBookViaApi(ctx, ctx.unique("auth"));

    const response = await ctx.request(`/catalog/books/${created.id}/copies`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ copyCode: ctx.unique("copy") }),
    });
    expect(response.status).toBe(401);
  });

  it("เปลี่ยนสถานะสำเนา available → damaged → withdrawn (ผ่าน state machine)", async () => {
    const created = await createBookViaApi(ctx, ctx.unique("sm"));
    const copy = await createCopyViaApi(ctx, created.id, ctx.unique("copy"));

    const damaged = await ctx.request(`/catalog/copies/${copy.id}/status`, {
      method: "PUT",
      headers: authHeaders(ctx.adminToken),
      body: JSON.stringify({ status: "damaged" }),
    });
    expect(damaged.status).toBe(200);
    expect((damaged.body?.data as { status: string }).status).toBe("damaged");

    const withdrawn = await ctx.request(`/catalog/copies/${copy.id}/status`, {
      method: "PUT",
      headers: authHeaders(ctx.adminToken),
      body: JSON.stringify({ status: "withdrawn" }),
    });
    expect(withdrawn.status).toBe(200);
    expect((withdrawn.body?.data as { status: string }).status).toBe("withdrawn");
  });

  it("เปลี่ยนสถานะสำเนาผิดกฎ (damaged → available) → 409", async () => {
    const created = await createBookViaApi(ctx, ctx.unique("illegal"));
    const copy = await createCopyViaApi(ctx, created.id, ctx.unique("copy"));

    await ctx.request(`/catalog/copies/${copy.id}/status`, {
      method: "PUT",
      headers: authHeaders(ctx.adminToken),
      body: JSON.stringify({ status: "damaged" }),
    });

    const illegal = await ctx.request(`/catalog/copies/${copy.id}/status`, {
      method: "PUT",
      headers: authHeaders(ctx.adminToken),
      body: JSON.stringify({ status: "available" }),
    });
    expect(illegal.status).toBe(409);
    expect(illegal.body?.success).toBe(false);
  });
});
