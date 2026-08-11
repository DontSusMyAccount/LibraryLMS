import type { MemberType, Paginated, UserRecord, UserRole, UserStatus } from "../../../../shared";

export const userRepositoryToken = Symbol("UserRepository").toString();

export interface CreateUserInput {
  email: string;
  passwordHash: string;
  fullName: string;
  role: UserRole;
  memberType: MemberType;
  status: UserStatus;
  studentOrStaffId?: string;
  phone?: string;
  branchId?: string;
}

export interface IUserRepository {
  findByStudentOrStaffId(studentOrStaffId: string): Promise<UserRecord | null>;
  findByEmail(email: string): Promise<UserRecord | null>;
  searchByName(
    query: string,
    options: { page: number; limit: number },
  ): Promise<Paginated<UserRecord>>;
  branchExists(id: string): Promise<boolean>;
  create(input: CreateUserInput): Promise<UserRecord>;
}
