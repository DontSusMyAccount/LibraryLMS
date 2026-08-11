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

export interface UpdateUserInput {
  fullName?: string;
  role?: UserRole;
  status?: UserStatus;
  memberType?: MemberType;
  studentOrStaffId?: string;
  phone?: string;
  branchId?: string;
}

export interface SearchUsersOptions {
  page: number;
  limit: number;
  role?: UserRole;
  status?: UserStatus;
}

export interface IUserRepository {
  findByStudentOrStaffId(studentOrStaffId: string): Promise<UserRecord | null>;
  findByEmail(email: string): Promise<UserRecord | null>;
  searchByKeyword(query: string, options: SearchUsersOptions): Promise<Paginated<UserRecord>>;
  branchExists(id: string): Promise<boolean>;
  create(input: CreateUserInput): Promise<UserRecord>;
  findById(id: string): Promise<UserRecord | null>;
  update(id: string, input: UpdateUserInput): Promise<UserRecord>;
}
