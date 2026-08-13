import { DomainError } from "./domain.error";

export class DomainForbiddenError extends DomainError {
  constructor(message = "ไม่มีสิทธิ์เข้าถึงข้อมูลนี้") {
    super(message, 403);
  }
}
