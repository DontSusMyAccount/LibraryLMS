import type { UserRecord } from "../../../../shared";
import { TOKENS } from "../../../tokens";

export const authRepositoryToken = TOKENS.AuthRepository;

export interface IAuthRepository {
  findByEmail(email: string): Promise<UserRecord | null>;
}
