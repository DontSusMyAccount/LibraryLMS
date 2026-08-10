import { DomainError } from "./domain.error";

export class DomainNotFoundError extends DomainError {
  constructor(message = "ไม่พบข้อมูลที่ต้องการ") {
    super(message, 404);
  }
}
