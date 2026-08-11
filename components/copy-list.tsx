"use client";

import { useState } from "react";
import { CheckIcon, ChevronDownIcon, CopyPlusIcon, LoaderCircleIcon } from "lucide-react";

import { useCatalog } from "@/app/features/catalog/hooks/use-catalog";
import { COPY_STATUS_LABELS } from "@/app/features/catalog/catalog.copy-status";
import { ALLOWED_COPY_TRANSITIONS } from "@/app/features/catalog/catalog.copy-status";
import type { AddCopyInput } from "@/app/features/catalog/catalog.types";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { BookCopy, CopyStatus } from "@libsys/shared";

interface CopyStatusTone {
  badgeClass: string;
  dotClass: string;
}

const COPY_STATUS_TONES: Record<CopyStatus, CopyStatusTone> = {
  available: {
    badgeClass: "bg-accent-mint/15 text-brand-700 dark:text-brand-300",
    dotClass: "bg-accent-mint",
  },
  borrowed: {
    badgeClass: "bg-brand-500/10 text-brand-700 dark:text-brand-300",
    dotClass: "bg-brand-500",
  },
  reserved: {
    badgeClass: "bg-accent-amber/15 text-accent-amber dark:text-accent-amber",
    dotClass: "bg-accent-amber",
  },
  lost: {
    badgeClass: "bg-accent-coral/15 text-accent-coral dark:text-accent-coral",
    dotClass: "bg-accent-coral",
  },
  damaged: {
    badgeClass: "bg-accent-coral/15 text-accent-coral dark:text-accent-coral",
    dotClass: "bg-accent-coral",
  },
  withdrawn: {
    badgeClass: "bg-muted text-muted-foreground",
    dotClass: "bg-muted-foreground",
  },
};

interface CopyStatusBadgeProps {
  status: CopyStatus;
  className?: string;
}

function CopyStatusBadge({ status, className }: CopyStatusBadgeProps) {
  const tone = COPY_STATUS_TONES[status];
  return (
    <Badge variant="ghost" className={cn(tone.badgeClass, className)}>
      <span className={cn("size-1.5 shrink-0 rounded-full", tone.dotClass)} />
      {COPY_STATUS_LABELS[status]}
    </Badge>
  );
}

const TERMINAL_STATUS_MESSAGE = "สถานะสิ้นสุด ไม่สามารถเปลี่ยนได้";
const CHANGE_STATUS_LABEL = "เปลี่ยนสถานะ...";
const ADD_COPY_TITLE = "เพิ่มสำเนา";
const ADD_COPY_LABEL = "เพิ่มสำเนา";
const COPY_CODE_LABEL = "รหัสสำเนา";
const COPY_CODE_PLACEHOLDER = "เช่น C-003";
const SHELF_LABEL = "ตำแหน่งชั้นวาง";
const SHELF_PLACEHOLDER = "เช่น ชั้น 2 หิ้ง A";
const EMPTY_COPIES_MESSAGE = "ยังไม่มีสำเนาของหนังสือเล่มนี้";
const COPY_CODE_REQUIRED_MESSAGE = "กรุณากรอกรหัสสำเนา";

interface CopyListProps {
  bookId: string;
  copies: BookCopy[];
  isLoading: boolean;
}

function CopyList({ bookId, copies, isLoading }: CopyListProps) {
  const { addCopy, changeCopyStatus } = useCatalog();
  const [showAddForm, setShowAddForm] = useState(false);
  const [copyCode, setCopyCode] = useState("");
  const [shelfLocation, setShelfLocation] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);

  const handleAddCopy = async () => {
    const normalizedCode = copyCode.trim();
    if (!normalizedCode) {
      setCopyError(COPY_CODE_REQUIRED_MESSAGE);
      return;
    }
    setIsAdding(true);
    setCopyError(null);
    const input: AddCopyInput = { copyCode: normalizedCode };
    if (shelfLocation.trim()) {
      input.shelfLocation = shelfLocation.trim();
    }
    const ok = await addCopy(bookId, input);
    setIsAdding(false);
    if (ok) {
      setCopyCode("");
      setShelfLocation("");
      setShowAddForm(false);
    }
  };

  const handleStatusChange = async (copyId: string, nextStatus: CopyStatus) => {
    await changeCopyStatus(copyId, nextStatus);
  };

  return (
    <div data-slot="copy-list" className="flex flex-col gap-4 py-2">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h3 className="text-label font-semibold text-foreground">สำเนา</h3>
          <span className="tabular-nums rounded-full bg-muted px-2 py-0.5 text-caption text-muted-foreground">
            {copies.length}
          </span>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowAddForm((open) => !open)}
        >
          <CopyPlusIcon />
          {ADD_COPY_LABEL}
        </Button>
      </div>

      {showAddForm && (
        <div
          data-slot="copy-list-add-form"
          className="flex flex-col gap-3 rounded-lg border border-border/70 bg-muted/40 p-4"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor={`copy-code-${bookId}`}
                className="text-label font-medium text-foreground"
              >
                {COPY_CODE_LABEL}
              </label>
              <Input
                id={`copy-code-${bookId}`}
                value={copyCode}
                onChange={(event) => setCopyCode(event.target.value)}
                placeholder={COPY_CODE_PLACEHOLDER}
                aria-invalid={copyError ? true : undefined}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor={`copy-shelf-${bookId}`}
                className="text-label font-medium text-foreground"
              >
                {SHELF_LABEL}
              </label>
              <Input
                id={`copy-shelf-${bookId}`}
                value={shelfLocation}
                onChange={(event) => setShelfLocation(event.target.value)}
                placeholder={SHELF_PLACEHOLDER}
              />
            </div>
          </div>
          {copyError && (
            <p data-slot="copy-list-add-error" className="text-caption text-accent-coral">
              {copyError}
            </p>
          )}
          <div>
            <Button
              type="button"
              size="sm"
              disabled={isAdding}
              onClick={() => void handleAddCopy()}
            >
              {isAdding ? (
                <LoaderCircleIcon className="size-4 animate-spin" />
              ) : (
                <CheckIcon className="size-4" />
              )}
              {ADD_COPY_TITLE}
            </Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">กำลังโหลดสำเนา...</p>
      ) : copies.length === 0 ? (
        <p className="text-sm text-muted-foreground">{EMPTY_COPIES_MESSAGE}</p>
      ) : (
        <div className="overflow-x-auto">
          <table
            data-slot="copy-list-table"
            className="w-full border-separate border-spacing-0 text-body"
          >
            <thead>
              <tr className="bg-muted text-left text-caption font-medium text-muted-foreground">
                <th scope="col" className="h-9 px-3 font-medium">
                  รหัสสำเนา
                </th>
                <th scope="col" className="h-9 px-3 font-medium">
                  สถานะ
                </th>
                <th scope="col" className="hidden px-3 font-medium sm:table-cell">
                  ตำแหน่งชั้นวาง
                </th>
                <th scope="col" className="hidden px-3 font-medium md:table-cell">
                  วันที่รับเข้า
                </th>
                <th scope="col" className="px-3 font-medium">
                  เปลี่ยนสถานะ
                </th>
              </tr>
            </thead>
            <tbody>
              {copies.map((copy) => (
                <tr
                  key={copy.id}
                  className="border-b border-border/60 transition-colors hover:bg-muted/50"
                >
                  <td className="px-3 py-2.5 font-medium text-foreground tabular-nums">
                    {copy.copyCode}
                  </td>
                  <td className="px-3 py-2.5">
                    <CopyStatusBadge status={copy.status} />
                  </td>
                  <td className="hidden px-3 py-2.5 text-muted-foreground sm:table-cell">
                    {copy.shelfLocation ?? "—"}
                  </td>
                  <td className="hidden px-3 py-2.5 text-muted-foreground tabular-nums md:table-cell">
                    {copy.acquiredAt ?? "—"}
                  </td>
                  <td className="px-3 py-2.5">
                    <CopyStatusSelect copy={copy} onChange={handleStatusChange} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

interface CopyStatusSelectProps {
  copy: BookCopy;
  onChange: (copyId: string, status: CopyStatus) => void;
}

function CopyStatusSelect({ copy, onChange }: CopyStatusSelectProps) {
  const allowedStatuses = ALLOWED_COPY_TRANSITIONS[copy.status];

  if (allowedStatuses.length === 0) {
    return <span className="text-caption text-muted-foreground">{TERMINAL_STATUS_MESSAGE}</span>;
  }

  return (
    <div className="relative inline-block">
      <select
        data-slot="copy-status-select"
        value=""
        onChange={(event) => {
          const nextStatus = event.target.value as CopyStatus;
          onChange(copy.id, nextStatus);
        }}
        aria-label={`เปลี่ยนสถานะสำเนา ${copy.copyCode}`}
        className="h-8 min-w-[150px] appearance-none rounded-sm border border-input bg-card py-1 pr-8 pl-2.5 text-xs text-foreground transition-colors outline-none focus-visible:border-ring focus-visible:ring-4 focus-visible:ring-ring/20 dark:bg-input/30"
      >
        <option value="" disabled>
          {CHANGE_STATUS_LABEL}
        </option>
        {allowedStatuses.map((status) => (
          <option key={status} value={status}>
            {COPY_STATUS_LABELS[status]}
          </option>
        ))}
      </select>
      <ChevronDownIcon
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 right-2 size-3.5 -translate-y-1/2 text-muted-foreground"
      />
    </div>
  );
}

export { CopyList, CopyStatusBadge };

export type { CopyListProps, CopyStatusBadgeProps };
