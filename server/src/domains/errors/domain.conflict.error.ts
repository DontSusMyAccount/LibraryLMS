import { DomainError } from "./domain.error";

export class DomainConflictError extends DomainError {
  constructor(message = "ข้อมูลขัดแย้งกับสถานะปัจจุบัน") {
    super(message, 409);
  }
}
