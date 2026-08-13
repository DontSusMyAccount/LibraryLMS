import { describe, expect, it } from "vitest";

import { DomainError } from "../../../../domains/errors";
import {
  MAX_COVER_BYTES,
  sanitizeFilename,
  sanitizeKeySegment,
  validateCoverUpload,
} from "./cover-upload.validation";

describe("cover-upload.validation", () => {
  it("accept JPG/PNG/WEBP และคืน extension ที่ถูกต้อง", () => {
    expect(
      validateCoverUpload({
        bookId: "b",
        filename: "a.jpg",
        body: new Uint8Array([1]),
        contentType: "image/jpeg",
      }).extension,
    ).toBe("jpg");
    expect(
      validateCoverUpload({
        bookId: "b",
        filename: "a.png",
        body: new Uint8Array([1]),
        contentType: "image/png",
      }).extension,
    ).toBe("png");
    expect(
      validateCoverUpload({
        bookId: "b",
        filename: "a.webp",
        body: new Uint8Array([1]),
        contentType: "image/webp",
      }).extension,
    ).toBe("webp");
  });

  it("content-type นอก whitelist → throw 422", () => {
    expect(() =>
      validateCoverUpload({
        bookId: "b",
        filename: "a.gif",
        body: new Uint8Array([1]),
        contentType: "image/gif",
      }),
    ).toThrow(DomainError);
  });

  it(`ใหญ่กว่า ${MAX_COVER_BYTES} ไบต์ → throw 422`, () => {
    expect(() =>
      validateCoverUpload({
        bookId: "b",
        filename: "a.jpg",
        body: new Uint8Array(MAX_COVER_BYTES + 1),
        contentType: "image/jpeg",
      }),
    ).toThrow(DomainError);
  });

  it("sanitizeFilename ตัด directory/.. ออก", () => {
    expect(sanitizeFilename("../../evil.jpg")).toBe("evil.jpg");
    expect(sanitizeFilename("a b.jpg")).toBe("a_b.jpg");
    expect(sanitizeFilename("..")).toBe("");
    expect(sanitizeFilename(".hidden")).toBe("");
  });

  it("sanitizeKeySegment ตัด / \\ .. ออก", () => {
    expect(sanitizeKeySegment("../../etc")).toBe("etc");
    expect(sanitizeKeySegment("a\\b")).toBe("ab");
  });
});
