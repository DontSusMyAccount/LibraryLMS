import { describe, it, expect } from "vitest";
import { createDatabaseClient } from "./db";

describe("createDatabaseClient", () => {
  it("สร้าง client/drizzle ได้โดยไม่เชื่อมต่อ DB จริงตอนสร้าง (lazy)", () => {
    const { client, db } = createDatabaseClient(
      "postgresql://user:pass@localhost:5432/not_running_db",
    );
    expect(typeof client).toBe("function");
    expect(typeof client.unsafe).toBe("function");
    expect(db).toBeDefined();
  });
});
