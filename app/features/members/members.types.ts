import type { MemberType, UserPublic, UserRole, UserStatus } from "@libsys/shared";

export type MemberListItem = UserPublic;

export interface CreateMemberInput {
  email: string;
  fullName: string;
  role: UserRole;
  password: string;
  memberType?: MemberType;
  studentOrStaffId?: string;
  phone?: string;
  branchId?: string;
}

export type UpdateMemberInput = Partial<
  Pick<
    MemberListItem,
    "fullName" | "role" | "status" | "memberType" | "studentOrStaffId" | "phone" | "branchId"
  >
>;

export interface ListMembersParams {
  page: number;
  limit: number;
  search?: string;
  role?: UserRole;
  status?: UserStatus;
}
