import type { Paginated, UserPublic } from "../../../../shared";

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
