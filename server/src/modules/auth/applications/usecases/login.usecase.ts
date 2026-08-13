import "reflect-metadata";

import bcrypt from "bcryptjs";
import { inject, injectable } from "tsyringe";

import { DomainUnauthorizedError } from "../../../../domains/errors";
import { toPublic } from "../../../../shared";
import { TOKENS } from "../../../tokens";
import { signAuthToken } from "../../jwt";
import { authRepositoryToken, type IAuthRepository } from "../ports/auth.repository";
import type { ILoginCommand, ILoginReturnType } from "../schemas/auth-schemas";

const WRONG_CREDENTIALS_MESSAGE = "อีเมลหรือรหัสผ่านไม่ถูกต้อง";
const INACTIVE_ACCOUNT_MESSAGE = "บัญชีผู้ใช้ถูกระงับใช้งาน";

let dummyPasswordHash: string | undefined;

function getDummyPasswordHash(): string {
  if (!dummyPasswordHash) {
    dummyPasswordHash = bcrypt.hashSync("dummy-password-for-constant-time", 12);
  }
  return dummyPasswordHash;
}

@injectable()
export class LoginUsecase {
  constructor(
    @inject(authRepositoryToken) private readonly repository: IAuthRepository,
    @inject(TOKENS.JwtSecret) private readonly jwtSecret: string,
  ) {}

  async execute({ command }: { command: ILoginCommand }): Promise<ILoginReturnType> {
    const user = await this.repository.findByEmail(command.email);
    const hashToCompare = user?.passwordHash ?? getDummyPasswordHash();
    const passwordMatches = await bcrypt.compare(command.password, hashToCompare);

    if (!user || !passwordMatches) {
      throw new DomainUnauthorizedError(WRONG_CREDENTIALS_MESSAGE);
    }
    if (user.status !== "active") {
      throw new DomainUnauthorizedError(INACTIVE_ACCOUNT_MESSAGE);
    }

    const token = await signAuthToken(user, this.jwtSecret);
    return { token, user: toPublic(user) };
  }
}
