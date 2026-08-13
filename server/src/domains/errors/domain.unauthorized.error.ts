import { DomainError } from "./domain.error";

export class DomainUnauthorizedError extends DomainError {
  constructor(message = "ยังไม่ได้เข้าสู่ระบบ หรือ session หมดอายุ") {
    super(message, 401);
  }
}
