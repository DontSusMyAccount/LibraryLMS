import "reflect-metadata";

import bcrypt from "bcryptjs";
import { inject, injectable } from "tsyringe";

import { DomainConflictError, DomainError, DomainNotFoundError } from "../../../../domains/errors";
import { toPublic, type MemberType, type UserRole } from "../../../../shared";
import { userRepositoryToken, type IUserRepository } from "../ports/user.repository";
import type { ICreateUserCommand, ICreateUserReturnType } from "../schemas/user-schemas";

const DUPLICATE_EMAIL_MESSAGE = "อีเมลนี้ถูกใช้งานแล้ว";
const DUPLICATE_ID_MESSAGE = "รหัสนักศึกษา/พนักงานนี้ถูกใช้งานแล้ว";
const BRANCH_NOT_FOUND_MESSAGE = "ไม่พบสาขาที่เลือก";
const PASSWORD_TOO_LONG_MESSAGE = "รหัสผ่านยาวเกินไป (สูงสุด 72 ไบต์)";

const BCRYPT_COST = 12;
const PASSWORD_MAX_BYTES = 72;

function defaultMemberType(role: UserRole): MemberType {
  return role === "student" ? "undergraduate" : "general";
}

@injectable()
export class CreateUserUsecase {
  constructor(@inject(userRepositoryToken) private readonly repository: IUserRepository) {}

  async execute({ command }: { command: ICreateUserCommand }): Promise<ICreateUserReturnType> {
    const email = command.email.trim().toLowerCase();

    const existingByEmail = await this.repository.findByEmail(email);
    if (existingByEmail) {
      throw new DomainConflictError(DUPLICATE_EMAIL_MESSAGE);
    }

    if (command.studentOrStaffId !== undefined) {
      const existingById = await this.repository.findByStudentOrStaffId(command.studentOrStaffId);
      if (existingById) {
        throw new DomainConflictError(DUPLICATE_ID_MESSAGE);
      }
    }

    if (command.branchId !== undefined) {
      const branchExists = await this.repository.branchExists(command.branchId);
      if (!branchExists) {
        throw new DomainNotFoundError(BRANCH_NOT_FOUND_MESSAGE);
      }
    }

    if (Buffer.byteLength(command.password, "utf8") > PASSWORD_MAX_BYTES) {
      throw new DomainError(PASSWORD_TOO_LONG_MESSAGE, 422);
    }

    const passwordHash = await bcrypt.hash(command.password, BCRYPT_COST);
    const memberType = command.memberType ?? defaultMemberType(command.role);

    const user = await this.repository.create({
      email,
      passwordHash,
      fullName: command.fullName,
      role: command.role,
      memberType,
      status: "active",
      studentOrStaffId: command.studentOrStaffId,
      phone: command.phone,
      branchId: command.branchId,
    });

    return { user: toPublic(user) };
  }
}
