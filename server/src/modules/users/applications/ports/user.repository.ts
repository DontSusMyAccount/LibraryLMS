import type { Paginated, UserRecord } from "../../../../shared";

export const userRepositoryToken = Symbol("UserRepository").toString();

export interface IUserRepository {
  findByStudentOrStaffId(studentOrStaffId: string): Promise<UserRecord | null>;
  findByEmail(email: string): Promise<UserRecord | null>;
  searchByName(
    query: string,
    options: { page: number; limit: number },
  ): Promise<Paginated<UserRecord>>;
}
