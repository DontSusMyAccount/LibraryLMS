import "reflect-metadata";

import { inject, injectable } from "tsyringe";

import {
  DomainConflictError,
  DomainError,
  DomainForbiddenError,
  DomainNotFoundError,
} from "../../../../domains/errors";
import { toPublic } from "../../../../shared";
import {
  userRepositoryToken,
  type IUserRepository,
  type UpdateUserInput,
} from "../ports/user.repository";
import type { IUpdateUserCommand, IUpdateUserReturnType } from "../schemas/user-schemas";

const USER_NOT_FOUND_MESSAGE = "ไม่พบสมาชิกที่ค้นหา";
const DUPLICATE_ID_MESSAGE = "รหัสนักศึกษา/พนักงานนี้ถูกใช้งานแล้ว";
const SELF_CHANGE_MESSAGE = "ไม่สามารถเปลี่ยนสถานะ/บทบาทของตัวเองได้";
const EMPTY_UPDATE_MESSAGE = "ไม่พบข้อมูลที่ต้องการแก้ไข";

@injectable()
export class UpdateUserUsecase {
  constructor(@inject(userRepositoryToken) private readonly repository: IUserRepository) {}

  async execute({
    command,
    id,
    actorId,
  }: {
    command: IUpdateUserCommand;
    id: string;
    actorId: string;
  }): Promise<IUpdateUserReturnType> {
    if (Object.keys(command).length === 0) {
      throw new DomainError(EMPTY_UPDATE_MESSAGE, 422);
    }

    const user = await this.repository.findById(id);
    if (!user) {
      throw new DomainNotFoundError(USER_NOT_FOUND_MESSAGE);
    }

    const isSelfChangingOwnRoleOrStatus =
      actorId === id &&
      ((command.role !== undefined && command.role !== user.role) ||
        (command.status !== undefined && command.status !== user.status));
    if (isSelfChangingOwnRoleOrStatus) {
      throw new DomainForbiddenError(SELF_CHANGE_MESSAGE);
    }

    if (command.studentOrStaffId !== undefined) {
      const existingById = await this.repository.findByStudentOrStaffId(command.studentOrStaffId);
      if (existingById && existingById.id !== id) {
        throw new DomainConflictError(DUPLICATE_ID_MESSAGE);
      }
    }

    const updateInput: UpdateUserInput = command;
    const updated = await this.repository.update(id, updateInput);

    return { user: toPublic(updated) };
  }
}
