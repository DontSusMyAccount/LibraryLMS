"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BookOpenCheckIcon, CornerUpLeftIcon, SearchIcon, UsersIcon, XIcon } from "lucide-react";

import type { CirculationTab } from "./circulation.types";
import { useCirculation } from "./hooks/use-circulation";
import { CheckinPanel } from "@/components/checkin-panel";
import { CheckoutPanel } from "@/components/checkout-panel";
import { DueDateStamp } from "@/components/due-date-stamp";
import { LoanActions } from "@/components/loan-actions";
import { MemberCard } from "@/components/member-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const PAGE_TITLE = "เคาน์เตอร์ยืม-คืน";
const PAGE_SUBTITLE = "ยืม คืน ต่ออายุ และเรียกคืนหนังสือของสมาชิก";
const SEARCH_PLACEHOLDER = "ค้นหาสมาชิกด้วยชื่อหรือรหัสนักศึกษา...";
const SEARCH_LABEL = "ค้นหา";
const NO_MEMBER_HINT = "ค้นหาและเลือกสมาชิกเพื่อดูรายการยืมค้าง";
const CHECKOUT_TAB_LABEL = "ยืม";
const CHECKIN_TAB_LABEL = "คืน";
const OVERDUE_TAB_LABEL = "รายการยืมค้าง";
const NO_RESULTS_MESSAGE = "ไม่พบสมาชิกที่ค้นหา";

const TABS: { value: CirculationTab; label: string }[] = [
  { value: "checkout", label: CHECKOUT_TAB_LABEL },
  { value: "checkin", label: CHECKIN_TAB_LABEL },
  { value: "overdue", label: OVERDUE_TAB_LABEL },
];

function MemberSearch() {
  const { searchResults, isSearching, searchMember, selectMember, memberQuery } = useCirculation();
  const [input, setInput] = useState(memberQuery);

  const handleSearch = () => {
    const normalized = input.trim();
    if (normalized) {
      void searchMember(normalized);
    }
  };

  return (
    <div data-slot="member-search" className="rounded-lg bg-card p-5 shadow-card">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                handleSearch();
              }
            }}
            placeholder={SEARCH_PLACEHOLDER}
            aria-label="ค้นหาสมาชิก"
            className="pl-9"
          />
        </div>
        <Button type="button" variant="secondary" onClick={handleSearch} disabled={isSearching}>
          {SEARCH_LABEL}
        </Button>
      </div>

      {searchResults.length > 0 && (
        <ul data-slot="member-search-results" className="mt-3 flex flex-col gap-1.5">
          {searchResults.map((user) => (
            <li key={user.id}>
              <button
                type="button"
                onClick={() => void selectMember(user)}
                className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-muted"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-foreground">
                    {user.fullName}
                  </span>
                  <span className="block truncate text-caption text-muted-foreground">
                    {user.studentOrStaffId ?? user.email}
                  </span>
                </span>
                <span className="shrink-0 text-caption font-medium text-brand-600 dark:text-brand-300">
                  เลือก
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {searchResults.length === 0 && !isSearching && input.trim() !== "" && (
        <p className="mt-3 text-sm text-muted-foreground">{NO_RESULTS_MESSAGE}</p>
      )}
    </div>
  );
}

export function CirculationPage() {
  const [activeTab, setActiveTab] = useState<CirculationTab>("checkout");
  const {
    selectedMember,
    isMemberLoading,
    cart,
    checkoutError,
    dueDateStamp,
    toastMessage,
    activeLoans,
    isLoansLoading,
    isBusy,
    checkin,
    renew,
    recall,
    canRenew,
    dismissToast,
    clearMember,
    addCopyCode,
    removeCopyCode,
    clearCart,
    checkout,
  } = useCirculation();

  const maxRenewals = selectedMember?.maxRenewals ?? 0;

  return (
    <div data-slot="circulation-page" className="flex flex-col gap-6">
      <section
        data-slot="circulation-heading"
        className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <h1 className="text-title font-semibold text-foreground">{PAGE_TITLE}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{PAGE_SUBTITLE}</p>
        </div>
        {selectedMember != null && (
          <Button type="button" variant="outline" size="sm" onClick={clearMember}>
            <UsersIcon />
            ยกเลิกการเลือกสมาชิก
          </Button>
        )}
      </section>

      <AnimatePresence>
        {toastMessage != null && (
          <motion.div
            data-slot="circulation-toast"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex items-center justify-between gap-3 rounded-lg border border-accent-mint/30 bg-accent-mint/10 px-4 py-3 text-body text-ink-body"
          >
            <p>{toastMessage}</p>
            <button
              type="button"
              onClick={dismissToast}
              aria-label="ปิดข้อความแจ้งเตือน"
              className="shrink-0 rounded-full p-1 text-muted-foreground transition-colors hover:text-foreground"
            >
              <XIcon className="size-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div
        data-slot="circulation-tabs"
        className="flex w-fit items-center gap-1 rounded-full bg-muted p-1"
      >
        {TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setActiveTab(tab.value)}
            aria-pressed={activeTab === tab.value}
            className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              activeTab === tab.value
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.value === "checkout" && <BookOpenCheckIcon className="size-4" />}
            {tab.value === "checkin" && <CornerUpLeftIcon className="size-4" />}
            {tab.value === "overdue" && <UsersIcon className="size-4" />}
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "checkout" && (
        <section data-slot="circulation-checkout" className="grid items-start gap-4 lg:grid-cols-3">
          <div className="flex flex-col gap-4 lg:col-span-2">
            <MemberSearch />
            {isMemberLoading ? (
              <div className="rounded-lg bg-card p-5 text-center text-sm text-muted-foreground shadow-card">
                กำลังโหลดข้อมูลสมาชิก...
              </div>
            ) : selectedMember != null ? (
              <>
                <MemberCard member={selectedMember} />
                <CheckoutPanel
                  member={selectedMember}
                  cart={cart}
                  isBusy={isBusy}
                  errorMessage={checkoutError}
                  onAddCopyCode={addCopyCode}
                  onRemoveCopyCode={removeCopyCode}
                  onClearCart={clearCart}
                  onCheckout={() => void checkout()}
                />
              </>
            ) : (
              <div className="rounded-lg bg-card p-8 text-center text-sm text-muted-foreground shadow-card">
                ค้นหาและเลือกสมาชิกก่อนเริ่มยืม
              </div>
            )}
          </div>

          <div className="flex flex-col gap-4 lg:col-span-1">
            {dueDateStamp != null ? (
              <DueDateStamp stamp={dueDateStamp} />
            ) : (
              <div className="flex min-h-40 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border text-center text-muted-foreground">
                <BookOpenCheckIcon className="size-7 opacity-50" />
                <p className="max-w-[220px] text-sm">สแตมป์วันกำหนดคืนจะแสดงหลังยืมสำเร็จ</p>
              </div>
            )}
          </div>
        </section>
      )}

      {activeTab === "checkin" && (
        <section data-slot="circulation-checkin" className="grid items-start gap-4 lg:grid-cols-2">
          <CheckinPanel isBusy={isBusy} errorMessage={checkoutError} onCheckin={checkin} />
        </section>
      )}

      {activeTab === "overdue" && (
        <section data-slot="circulation-overdue">
          {selectedMember != null ? (
            <LoanActions
              loans={activeLoans}
              maxRenewals={maxRenewals}
              isLoansLoading={isLoansLoading}
              isBusy={isBusy}
              canRenew={canRenew}
              onRenew={renew}
              onRecall={recall}
              errorMessage={checkoutError}
            />
          ) : (
            <div className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-lg bg-card text-center shadow-card">
              <UsersIcon className="size-8 text-muted-foreground/50" />
              <p className="max-w-sm text-sm text-muted-foreground">{NO_MEMBER_HINT}</p>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

export default CirculationPage;
