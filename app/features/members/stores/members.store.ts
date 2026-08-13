"use client";

import { create } from "zustand";

import type { UserRole, UserStatus } from "@libsys/shared";

import {
  createMember as createMemberAction,
  fetchMembers as fetchMembersAction,
  updateMember as updateMemberAction,
} from "../actions/members.action";
import type {
  CreateMemberInput,
  ListMembersParams,
  MemberListItem,
  UpdateMemberInput,
} from "../members.types";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 12;

const FALLBACK_ERROR_MESSAGE = "เกิดข้อผิดพลาด กรุณาลองใหม่";

interface MembersStoreState {
  members: MemberListItem[];
  search: string;
  roleFilter: UserRole | null;
  statusFilter: UserStatus | null;
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  isLoading: boolean;
  isError: boolean;
  errorMessage: string | null;
  loadMembers: () => Promise<void>;
  setSearch: (search: string) => Promise<void>;
  setRoleFilter: (role: UserRole | null) => Promise<void>;
  setStatusFilter: (status: UserStatus | null) => Promise<void>;
  setPage: (page: number) => Promise<void>;
  createMember: (input: CreateMemberInput) => Promise<MemberListItem | null>;
  updateMember: (id: string, patch: UpdateMemberInput) => Promise<MemberListItem | null>;
  reset: () => void;
}

const initialState = {
  members: [],
  search: "",
  roleFilter: null,
  statusFilter: null,
  page: DEFAULT_PAGE,
  limit: DEFAULT_LIMIT,
  total: 0,
  totalPages: 1,
  isLoading: false,
  isError: false,
  errorMessage: null,
};

function toErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return FALLBACK_ERROR_MESSAGE;
}

function toListParams(
  state: Pick<MembersStoreState, "page" | "limit" | "search" | "roleFilter" | "statusFilter">,
) {
  const params: ListMembersParams = {
    page: state.page,
    limit: state.limit,
  };
  const search = state.search.trim();
  if (search) {
    params.search = search;
  }
  if (state.roleFilter) {
    params.role = state.roleFilter;
  }
  if (state.statusFilter) {
    params.status = state.statusFilter;
  }
  return params;
}

function mergeMemberIntoList(members: MemberListItem[], updated: MemberListItem): MemberListItem[] {
  return members.map((member) => (member.id === updated.id ? { ...member, ...updated } : member));
}

export const useMembersStore = create<MembersStoreState>((set, get) => ({
  ...initialState,

  loadMembers: async () => {
    set({ isLoading: true, isError: false, errorMessage: null });
    try {
      const result = await fetchMembersAction(toListParams(get()));
      set({
        members: result.data,
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
        isLoading: false,
      });
    } catch (error) {
      set({ isLoading: false, isError: true, errorMessage: toErrorMessage(error) });
    }
  },

  setSearch: async (search) => {
    set({ search, page: DEFAULT_PAGE });
    await get().loadMembers();
  },

  setRoleFilter: async (role) => {
    set({ roleFilter: role, page: DEFAULT_PAGE });
    await get().loadMembers();
  },

  setStatusFilter: async (status) => {
    set({ statusFilter: status, page: DEFAULT_PAGE });
    await get().loadMembers();
  },

  setPage: async (page) => {
    set({ page });
    await get().loadMembers();
  },

  createMember: async (input) => {
    try {
      const member = await createMemberAction(input);
      await get().loadMembers();
      return member;
    } catch (error) {
      set({ errorMessage: toErrorMessage(error) });
      return null;
    }
  },

  updateMember: async (id, patch) => {
    try {
      const updated = await updateMemberAction(id, patch);
      set({ members: mergeMemberIntoList(get().members, updated) });
      return updated;
    } catch (error) {
      set({ errorMessage: toErrorMessage(error) });
      return null;
    }
  },

  reset: () => set({ ...initialState }),
}));
