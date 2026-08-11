import type { MemberType, Paginated, UserPublic, UserRole, UserStatus } from "../../../../shared";

export interface ICreateUserCommand {
  email: string;
  fullName: string;
  role: UserRole;
  password: string;
  memberType?: MemberType;
  studentOrStaffId?: string;
  phone?: string;
  branchId?: string;
}

export interface ICreateUserReturnType {
  user: UserPublic;
}

export type IFindUserCommand = { email: string } | { studentOrStaffId: string };

export interface IFindUserReturnType {
  user: UserPublic;
}

export interface IListUsersQuery {
  q: string;
  page?: number;
  limit?: number;
}

export type IListUsersReturnType = Paginated<UserPublic>;

export interface IUpdateUserCommand {
  fullName?: string;
  role?: UserRole;
  status?: UserStatus;
  memberType?: MemberType;
  studentOrStaffId?: string;
  phone?: string;
  branchId?: string;
}

export interface IUpdateUserReturnType {
  user: UserPublic;
}
