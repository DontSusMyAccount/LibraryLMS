import "reflect-metadata";

import { inject, injectable } from "tsyringe";

import { DomainConflictError, DomainNotFoundError } from "../../../../domains/errors";
import { canTransitionCopy } from "../../../../domains/copy.domain";
import { copyRepositoryToken, type ICopyRepository } from "../ports/copy.repository";
import type {
  IUpdateCopyStatusCommand,
  IUpdateCopyStatusReturnType,
} from "../schemas/catalog-schemas";

const COPY_NOT_FOUND_MESSAGE = "ไม่พบสำเนาหนังสือที่ต้องการเปลี่ยนสถานะ";
const INVALID_TRANSITION_MESSAGE = "ไม่สามารถเปลี่ยนสถานะของสำเนาได้ในสถานะปัจจุบัน";

@injectable()
export class UpdateCopyStatusUsecase {
  constructor(@inject(copyRepositoryToken) private readonly copies: ICopyRepository) {}

  async execute({
    command,
  }: {
    command: IUpdateCopyStatusCommand;
  }): Promise<IUpdateCopyStatusReturnType> {
    const copy = await this.copies.findById(command.id);
    if (!copy) {
      throw new DomainNotFoundError(COPY_NOT_FOUND_MESSAGE);
    }

    if (!canTransitionCopy(copy.status, command.status)) {
      throw new DomainConflictError(INVALID_TRANSITION_MESSAGE);
    }

    const updated = await this.copies.updateStatus(command.id, command.status);
    if (!updated) {
      throw new DomainNotFoundError(COPY_NOT_FOUND_MESSAGE);
    }
    return { copy: updated };
  }
}
