import "reflect-metadata";

import { inject, injectable } from "tsyringe";

import { DomainNotFoundError } from "../../../../domains/errors";
import { toPublic } from "../../../../shared";
import { userRepositoryToken, type IUserRepository } from "../ports/user.repository";
import type { IFindUserCommand, IFindUserReturnType } from "../schemas/user-schemas";

const USER_NOT_FOUND_MESSAGE = "ไม่พบสมาชิกที่ค้นหา";

@injectable()
export class FindUserUsecase {
  constructor(@inject(userRepositoryToken) private readonly repository: IUserRepository) {}

  async execute({ command }: { command: IFindUserCommand }): Promise<IFindUserReturnType> {
    const user =
      "email" in command
        ? await this.repository.findByEmail(command.email)
        : await this.repository.findByStudentOrStaffId(command.studentOrStaffId);

    if (!user) {
      throw new DomainNotFoundError(USER_NOT_FOUND_MESSAGE);
    }

    return { user: toPublic(user) };
  }
}
