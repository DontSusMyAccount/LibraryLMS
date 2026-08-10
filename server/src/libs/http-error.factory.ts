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

export function toHttpError(error: unknown): HttpErrorResult {
  if (error instanceof DomainError) {
    return { statusCode: error.statusCode, body: { success: false, error: error.message } };
  }
  return { statusCode: 500, body: { success: false, error: INTERNAL_ERROR_MESSAGE } };
}
