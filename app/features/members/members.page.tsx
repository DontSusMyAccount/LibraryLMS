"use client";

import { useEffect, useRef, useState } from "react";
import {
  ChevronDownIcon,
  InboxIcon,
  RefreshCcwIcon,
  SearchIcon,
  TriangleAlertIcon,
  UserPlusIcon,
} from "lucide-react";

import { USER_ROLES, USER_STATUSES } from "@libsys/shared";
import type { UserRole, UserStatus } from "@libsys/shared";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";

import type { MemberListItem } from "./members.types";
import { MemberFormDialog } from "./components/member-form-dialog";
import { MembersTable, ROLE_LABELS } from "./components/members-table";
import { STATUS_LABELS } from "./components/member-status-badge";
import { useMembers } from "./hooks/use-members";

const SEARCH_DEBOUNCE_MS = 300;

const SEARCH_PLACEHOLDER = "ค้นหาชื่อ อีเมล หรือรหัสนักศึกษา...";
const SEARCH_ARIA_LABEL = "ค้นหาสมาชิก";
const ROLE_FILTER_ARIA_LABEL = "กรองบทบาท";
const STATUS_FILTER_ARIA_LABEL = "กรองสถานะ";
const ALL_ROLES_OPTION = "ทุกบทบาท";
const ALL_STATUSES_OPTION = "ทุกสถานะ";
const PAGE_TITLE = "จัดการสมาชิก";
const PAGE_SUBTITLE = "สร้าง แก้ไข และจัดการสถานะสมาชิกของห้องสมุด";
const ADD_MEMBER_LABEL = "เพิ่มสมาชิก";
const EMPTY_TITLE = "ไม่พบสมาชิก";
const EMPTY_HINT = "ลองปรับเงื่อนไขการค้นหา หรือเพิ่มสมาชิกแรกเข้าสู่ระบบ";
const LOAD_ERROR_TITLE = "โหลดรายการสมาชิกไม่สำเร็จ";
const RETRY_LABEL = "ลองใหม่อีกครั้ง";
const TOTAL_LABEL = "รายการ";

function toRoleFilter(value: string): UserRole | null {
  return value ? (value as UserRole) : null;
}

function toStatusFilter(value: string): UserStatus | null {
  return value ? (value as UserStatus) : null;
}

const SELECT_CLASS =
  "h-[42px] w-full min-w-0 appearance-none rounded-sm border border-input bg-card py-2 pr-9 pl-3.5 text-sm text-foreground transition-colors outline-none focus-visible:border-ring focus-visible:ring-4 focus-visible:ring-ring/20 dark:bg-input/30";

function MembersSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {[0, 1, 2, 3].map((item) => (
        <Skeleton key={item} className="h-14 rounded-lg" />
      ))}
    </div>
  );
}

export function MembersPage() {
  const {
    members,
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
  } = useMembers();

  const [searchInput, setSearchInput] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<MemberListItem | null>(null);
  const hasTyped = useRef(false);

  useEffect(() => {
    void loadMembers();
  }, [loadMembers]);

  useEffect(() => {
    if (!hasTyped.current) {
      return undefined;
    }
    const timer = setTimeout(() => {
      void setSearch(searchInput);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchInput, setSearch]);

  const handleSearchChange = (value: string) => {
    hasTyped.current = true;
    setSearchInput(value);
  };

  const handleRetry = () => {
    void loadMembers();
  };

  const handleOpenCreate = () => {
    setEditingMember(null);
    setDialogOpen(true);
  };

  const handleOpenEdit = (member: MemberListItem) => {
    setEditingMember(member);
    setDialogOpen(true);
  };

  const handleDialogOpenChange = (nextOpen: boolean) => {
    setDialogOpen(nextOpen);
    if (!nextOpen) {
      setEditingMember(null);
    }
  };

  const isEmpty = !isLoading && members.length === 0;

  return (
    <div data-slot="members-page" className="flex flex-col gap-6">
      <section
        data-slot="members-heading"
        className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <h1 className="text-title font-semibold text-foreground">{PAGE_TITLE}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{PAGE_SUBTITLE}</p>
        </div>
        <Button type="button" onClick={handleOpenCreate}>
          <UserPlusIcon />
          {ADD_MEMBER_LABEL}
        </Button>
      </section>

      <section
        data-slot="members-toolbar"
        className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="relative w-full sm:max-w-sm">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={searchInput}
            onChange={(event) => handleSearchChange(event.target.value)}
            placeholder={SEARCH_PLACEHOLDER}
            aria-label={SEARCH_ARIA_LABEL}
            className="pl-9"
          />
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative w-full sm:w-48">
            <select
              data-slot="member-role-filter"
              value={roleFilter ?? ""}
              onChange={(event) => void setRoleFilter(toRoleFilter(event.target.value))}
              aria-label={ROLE_FILTER_ARIA_LABEL}
              className={SELECT_CLASS}
            >
              <option value="">{ALL_ROLES_OPTION}</option>
              {USER_ROLES.map((role) => (
                <option key={role} value={role}>
                  {ROLE_LABELS[role]}
                </option>
              ))}
            </select>
            <ChevronDownIcon
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground"
            />
          </div>
          <div className="relative w-full sm:w-48">
            <select
              data-slot="member-status-filter"
              value={statusFilter ?? ""}
              onChange={(event) => void setStatusFilter(toStatusFilter(event.target.value))}
              aria-label={STATUS_FILTER_ARIA_LABEL}
              className={SELECT_CLASS}
            >
              <option value="">{ALL_STATUSES_OPTION}</option>
              {USER_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {STATUS_LABELS[status]}
                </option>
              ))}
            </select>
            <ChevronDownIcon
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground"
            />
          </div>
        </div>
      </section>

      {isError ? (
        <section
          data-slot="members-error"
          className="flex min-h-[50vh] flex-col items-center justify-center gap-3 rounded-lg bg-card text-center shadow-card"
        >
          <div className="flex size-14 items-center justify-center rounded-full bg-accent-coral/10 text-accent-coral">
            <TriangleAlertIcon className="size-7" />
          </div>
          <h2 className="text-title font-semibold text-foreground">{LOAD_ERROR_TITLE}</h2>
          <p className="max-w-sm text-sm text-muted-foreground">
            {errorMessage ?? "ไม่สามารถเชื่อมต่อกับระบบได้ กรุณาลองใหม่"}
          </p>
          <Button type="button" variant="outline" onClick={handleRetry}>
            <RefreshCcwIcon />
            {RETRY_LABEL}
          </Button>
        </section>
      ) : isLoading && members.length === 0 ? (
        <section data-slot="members-loading" className="rounded-lg bg-card p-5 shadow-card">
          <MembersSkeleton />
        </section>
      ) : isEmpty ? (
        <section
          data-slot="members-empty"
          className="flex min-h-[40vh] flex-col items-center justify-center gap-3 rounded-lg bg-card text-center shadow-card"
        >
          <div className="flex size-14 items-center justify-center rounded-full bg-brand-500/10 text-brand-500">
            <InboxIcon className="size-7" />
          </div>
          <h2 className="text-title font-semibold text-foreground">{EMPTY_TITLE}</h2>
          <p className="max-w-sm text-sm text-muted-foreground">{EMPTY_HINT}</p>
          <Button type="button" onClick={handleOpenCreate}>
            <UserPlusIcon />
            {ADD_MEMBER_LABEL}
          </Button>
        </section>
      ) : (
        <section data-slot="members-list" className="rounded-lg bg-card p-5 shadow-card">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              <span className="tabular-nums font-medium text-foreground">{total}</span>{" "}
              {TOTAL_LABEL}
            </p>
          </div>
          <MembersTable members={members} onEdit={handleOpenEdit} />
          {totalPages > 1 && (
            <div className="mt-4 flex justify-end">
              <Pagination
                page={page}
                totalPages={totalPages}
                onPageChange={(nextPage) => void setPage(nextPage)}
              />
            </div>
          )}
        </section>
      )}

      <MemberFormDialog
        open={dialogOpen}
        onOpenChange={handleDialogOpenChange}
        member={editingMember}
      />
    </div>
  );
}

export default MembersPage;
