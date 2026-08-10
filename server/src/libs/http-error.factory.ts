import { DomainError } from "../domains/errors";

export interface HttpErrorBody {
  success: false;
  error: string;
}

export interface HttpErrorResult {
  statusCode: number;
  body: HttpErrorBody;
}

const INTERNAL_ERROR_MESSAGE = "เกิดข้อผิดพลาดภายในระบบ กรุณาลองใหม่";
const VALIDATION_ERROR_MESSAGE = "ข้อมูลไม่ถูกต้อง โปรดตรวจสอบ";
const NOT_FOUND_ERROR_MESSAGE = "ไม่พบทรัพยากรที่ขอ";

export function toHttpError(error: unknown, code?: string | number): HttpErrorResult {
  if (code === "VALIDATION") {
    return { statusCode: 422, body: { success: false, error: VALIDATION_ERROR_MESSAGE } };
  }
  if (code === "NOT_FOUND") {
    return { statusCode: 404, body: { success: false, error: NOT_FOUND_ERROR_MESSAGE } };
  }
  if (error instanceof DomainError) {
    return { statusCode: error.statusCode, body: { success: false, error: error.message } };
  }
  return { statusCode: 500, body: { success: false, error: INTERNAL_ERROR_MESSAGE } };
}
