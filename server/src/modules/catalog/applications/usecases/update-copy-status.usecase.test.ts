import { describe, expect, it } from "vitest";

import { DomainConflictError, DomainNotFoundError } from "../../../../domains/errors";
import type { BookCopy, CopyStatus } from "../../../../shared";
import type { ICopyRepository } from "../ports/copy.repository";
import { UpdateCopyStatusUsecase } from "./update-copy-status.usecase";

function buildCopy(overrides: Partial<BookCopy> = {}): BookCopy {
  return {
    id: "c-1",
    bookId: "b-1",
    copyCode: "BK-001",
    status: "available",
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function createCopyRepository(copy: BookCopy | null): ICopyRepository {
  return {
    findById: async (id) => (copy && copy.id === id ? copy : null),
    findByCopyCode: async () => null,
    create: async () => buildCopy(),
    updateStatus: async (id, status) => {
      if (!copy || copy.id !== id) return null;
      const updated: BookCopy = { ...copy, status };
      return updated;
    },
    listByBookId: async () => [],
    listByBookIds: async () => [],
  };
}

describe("UpdateCopyStatusUsecase", () => {
  it("available → borrowed ผ่าน state machine", async () => {
    const copyRepo = createCopyRepository(buildCopy({ status: "available" }));
    const usecase = new UpdateCopyStatusUsecase(copyRepo);

    const result = await usecase.execute({
      command: { id: "c-1", status: "borrowed" },
    });

    expect(result.copy.status).toBe("borrowed");
  });

  it("borrowed → borrowed ถูก reject ด้วย DomainConflictError", async () => {
    const copyRepo = createCopyRepository(buildCopy({ status: "borrowed" }));
    const usecase = new UpdateCopyStatusUsecase(copyRepo);

    await expect(
      usecase.execute({ command: { id: "c-1", status: "borrowed" } }),
    ).rejects.toBeInstanceOf(DomainConflictError);
  });

  it("available → lost / damaged ได้", async () => {
    const usecase = new UpdateCopyStatusUsecase(
      createCopyRepository(buildCopy({ status: "available" })),
    );

    const lost = await usecase.execute({ command: { id: "c-1", status: "lost" } });
    expect(lost.copy.status).toBe("lost");
  });

  it("lost → damaged เป็น transition ผิดกฎ throw DomainConflictError", async () => {
    const copyRepo = createCopyRepository(buildCopy({ status: "lost" }));
    const usecase = new UpdateCopyStatusUsecase(copyRepo);

    await expect(
      usecase.execute({ command: { id: "c-1", status: "damaged" } }),
    ).rejects.toBeInstanceOf(DomainConflictError);
  });

  it("borrowed → available (คืน) ผ่านได้", async () => {
    const usecase = new UpdateCopyStatusUsecase(
      createCopyRepository(buildCopy({ status: "borrowed" })),
    );

    const result = await usecase.execute({ command: { id: "c-1", status: "available" } });

    expect(result.copy.status).toBe("available");
  });

  it("copy ไม่เจอ throw DomainNotFoundError", async () => {
    const usecase = new UpdateCopyStatusUsecase(createCopyRepository(null));

    await expect(
      usecase.execute({ command: { id: "c-missing", status: "borrowed" } }),
    ).rejects.toBeInstanceOf(DomainNotFoundError);
  });

  it("status ไม่อยู่ใน enum ถูกรีเจกต์ (no transition)", async () => {
    const copyRepo = createCopyRepository(buildCopy({ status: "available" }));
    const usecase = new UpdateCopyStatusUsecase(copyRepo);

    await expect(
      usecase.execute({ command: { id: "c-1", status: "unknown" as CopyStatus } }),
    ).rejects.toBeInstanceOf(DomainConflictError);
  });
});
