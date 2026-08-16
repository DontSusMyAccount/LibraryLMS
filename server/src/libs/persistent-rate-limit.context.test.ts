import { defaultOptions, type Options } from "elysia-rate-limit";
import { describe, expect, it } from "vitest";

import { PersistentDefaultContext } from "./persistent-rate-limit.context";

function makeInitOptions(): Omit<Options, "context"> {
  return { ...defaultOptions, duration: 60_000, max: 1000 };
}

describe("PersistentDefaultContext", () => {
  it("init ซ้ำ (จำลองการ build app ทุก request) ไม่ล้าง store", async () => {
    const context = new PersistentDefaultContext();

    // build app ครั้งที่ 1 (plugin เรียก init + increment)
    context.init(makeInitOptions());
    const first = await context.increment("ip-1", 60_000, 1_000_000);
    expect(first.count).toBe(1);

    // build app ครั้งที่ 2 — init ต้องไม่ล้าง store
    context.init(makeInitOptions());
    const second = await context.increment("ip-1", 60_000, 1_000_001);
    expect(second.count).toBe(2);
  });

  it("key ต่างกันนับแยกกัน", async () => {
    const context = new PersistentDefaultContext();
    context.init(makeInitOptions());

    const a = await context.increment("ip-a", 60_000, 1_000_000);
    expect(a.count).toBe(1);

    const b = await context.increment("ip-b", 60_000, 1_000_000);
    expect(b.count).toBe(1);

    const a2 = await context.increment("ip-a", 60_000, 1_000_001);
    expect(a2.count).toBe(2);
  });

  it("reset แบบระบุ key ลบเฉพาะ key นั้น", async () => {
    const context = new PersistentDefaultContext();
    context.init(makeInitOptions());

    await context.increment("ip-a", 60_000, 1_000_000);
    await context.increment("ip-b", 60_000, 1_000_000);
    await context.reset("ip-a");

    const a = await context.increment("ip-a", 60_000, 1_000_001);
    expect(a.count).toBe(1);

    const b = await context.increment("ip-b", 60_000, 1_000_001);
    expect(b.count).toBe(2);
  });
});
