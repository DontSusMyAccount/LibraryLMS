"use client";

import { useMembersStore } from "../stores/members.store";

export function useMembers() {
  const members = useMembersStore((state) => state.members);
  const search = useMembersStore((state) => state.search);
  const roleFilter = useMembersStore((state) => state.roleFilter);
  const statusFilter = useMembersStore((state) => state.statusFilter);
  const page = useMembersStore((state) => state.page);
  const totalPages = useMembersStore((state) => state.totalPages);
  const total = useMembersStore((state) => state.total);
  const isLoading = useMembersStore((state) => state.isLoading);
  const isError = useMembersStore((state) => state.isError);
  const errorMessage = useMembersStore((state) => state.errorMessage);

  const loadMembers = useMembersStore((state) => state.loadMembers);
  const setSearch = useMembersStore((state) => state.setSearch);
  const setRoleFilter = useMembersStore((state) => state.setRoleFilter);
  const setStatusFilter = useMembersStore((state) => state.setStatusFilter);
  const setPage = useMembersStore((state) => state.setPage);
  const createMember = useMembersStore((state) => state.createMember);
  const updateMember = useMembersStore((state) => state.updateMember);

  return {
    members,
    search,
    roleFilter,
    statusFilter,
    page,
    totalPages,
    total,
    isLoading,
    isError,
    errorMessage,
    loadMembers,
    setSearch,
    setRoleFilter,
    setStatusFilter,
    setPage,
    createMember,
    updateMember,
  };
}
