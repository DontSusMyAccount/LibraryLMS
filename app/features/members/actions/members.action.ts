import type { PaginatedResponse, UserRole, UserStatus } from "@libsys/shared";

import { eden } from "@/app/_shared/lib/eden-client";
import { edenRequest } from "@/app/_shared/lib/eden-helpers";

import type {
  CreateMemberInput,
  ListMembersParams,
  MemberListItem,
  UpdateMemberInput,
} from "../members.types";

export async function fetchMembers(
  params: ListMembersParams,
): Promise<PaginatedResponse<MemberListItem>> {
  const query: { q?: string; page: number; limit: number; role?: UserRole; status?: UserStatus } = {
    page: params.page,
    limit: params.limit,
  };
  if (params.search) {
    query.q = params.search;
  }
  if (params.role) {
    query.role = params.role;
  }
  if (params.status) {
    query.status = params.status;
  }
  return edenRequest(await eden.users.search.get({ query }));
}

export async function createMember(input: CreateMemberInput): Promise<MemberListItem> {
  return edenRequest(await eden.users.post(input));
}

export async function updateMember(id: string, patch: UpdateMemberInput): Promise<MemberListItem> {
  return edenRequest(await eden.users({ id }).patch(patch));
}
