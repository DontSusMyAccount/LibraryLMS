import { DomainError } from "../../../../domains/errors";

export const MAX_COVER_BYTES = 5 * 1024 * 1024;

const ALLOWED_COVER_CONTENT_TYPES = new Map<string, string>([
  ["image/jpeg", "jpg"],
  ["image/jpg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

const INVALID_TYPE_MESSAGE = "รูปแบบไฟล์ไม่ถูกต้อง ต้องเป็น JPG, PNG หรือ WEBP เท่านั้น";
const OVERSIZED_MESSAGE = "ขนาดไฟล์ต้องไม่เกิน 5 MB";
const INVALID_FILENAME_MESSAGE = "ชื่อไฟล์ไม่ถูกต้อง";
const INVALID_BOOK_ID_MESSAGE = "รหัสหนังสือไม่ถูกต้อง";

export interface CoverUploadInput {
  bookId: string;
  filename: string;
  body: Uint8Array;
  contentType: string;
}

export interface CoverUploadValidation {
  bookId: string;
  filename: string;
  extension: string;
}

export function sanitizeFilename(filename: string): string {
  const normalized = filename.replace(/\\/g, "/");
  const base = normalized.split("/").pop() ?? "";
  if (base === "" || base === "." || base === ".." || base.startsWith(".")) {
    return "";
  }
  return base.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export function sanitizeKeySegment(segment: string): string {
  return segment.replace(/[/\\]/g, "").replace(/\.\./g, "");
}

export function validateCoverUpload(input: CoverUploadInput): CoverUploadValidation {
  const extension = ALLOWED_COVER_CONTENT_TYPES.get(input.contentType.toLowerCase());
  if (extension === undefined) {
    throw new DomainError(INVALID_TYPE_MESSAGE, 422);
  }
  if (input.body.byteLength > MAX_COVER_BYTES) {
    throw new DomainError(OVERSIZED_MESSAGE, 422);
  }

  const bookId = sanitizeKeySegment(input.bookId.trim());
  if (!bookId) {
    throw new DomainError(INVALID_BOOK_ID_MESSAGE, 422);
  }

  const filename = sanitizeFilename(input.filename.trim());
  if (!filename) {
    throw new DomainError(INVALID_FILENAME_MESSAGE, 422);
  }

  return { bookId, filename, extension };
}
