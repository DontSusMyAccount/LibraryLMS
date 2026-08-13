"use client";

import { useState } from "react";
import { ClipboardListIcon, PlusIcon, ScanLineIcon, Trash2Icon } from "lucide-react";

import type { MemberCardData } from "@/app/features/circulation/circulation.types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface CheckoutPanelProps {
  member: MemberCardData;
  cart: { copyCode: string; error: string | null }[];
  isBusy: boolean;
  errorMessage: string | null;
  onAddCopyCode: (copyCode: string) => void;
  onRemoveCopyCode: (copyCode: string) => void;
  onClearCart: () => void;
  onCheckout: () => void;
  className?: string;
}

const COPY_CODE_PLACEHOLDER = "สแกนหรือพิมพ์รหัสสำเนา...";
const ADD_LABEL = "เพิ่ม";
const CHECKOUT_LABEL = "ยืมหนังสือ";
const CART_TITLE = "ตะกร้ายืม";
const EMPTY_CART_MESSAGE = "ยังไม่มีการเพิ่มสำเนา";
const SUSPENDED_TOOLTIP = "สมาชิกถูกระงับสิทธิ์ ไม่สามารถยืมได้";

export function CheckoutPanel({
  member,
  cart,
  isBusy,
  errorMessage,
  onAddCopyCode,
  onRemoveCopyCode,
  onClearCart,
  onCheckout,
  className,
}: CheckoutPanelProps) {
  const [copyCode, setCopyCode] = useState("");

  const handleAdd = () => {
    const normalized = copyCode.trim();
    if (!normalized) {
      return;
    }
    onAddCopyCode(normalized);
    setCopyCode("");
  };

  const isCheckoutDisabled = isBusy || cart.length === 0 || member.isSuspended;

  return (
    <section
      data-slot="checkout-panel"
      className={`rounded-lg bg-card p-5 shadow-card ${className ?? ""}`}
    >
      <header className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-full bg-brand-500/10 text-brand-600 dark:text-brand-300">
            <ScanLineIcon className="size-5" />
          </div>
          <div>
            <h2 className="text-title font-semibold text-foreground">ยืมหนังสือ</h2>
            <p className="text-sm text-muted-foreground">เพิ่มรหัสสำเนาแล้วกดยืม</p>
          </div>
        </div>
      </header>

      <div className="flex gap-2">
        <Input
          type="text"
          value={copyCode}
          onChange={(event) => setCopyCode(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              handleAdd();
            }
          }}
          placeholder={COPY_CODE_PLACEHOLDER}
          aria-label="รหัสสำเนาหนังสือ"
        />
        <Button type="button" variant="secondary" onClick={handleAdd} disabled={isBusy}>
          <PlusIcon />
          {ADD_LABEL}
        </Button>
      </div>

      <div data-slot="checkout-cart" className="mt-4">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-label font-medium text-foreground">
            {CART_TITLE}
            <span className="ml-1.5 rounded-full bg-brand-500/10 px-2 py-0.5 text-xs tabular-nums font-medium text-brand-700 dark:text-brand-300">
              {cart.length}
            </span>
          </p>
          {cart.length > 0 && (
            <button
              type="button"
              onClick={onClearCart}
              className="text-caption text-muted-foreground transition-colors hover:text-foreground"
            >
              ล้างทั้งหมด
            </button>
          )}
        </div>

        {cart.length === 0 ? (
          <div className="flex min-h-20 flex-col items-center justify-center gap-1 rounded-lg bg-muted/50 text-center text-muted-foreground">
            <ClipboardListIcon className="size-5 opacity-60" />
            <p className="text-sm">{EMPTY_CART_MESSAGE}</p>
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {cart.map((item) => (
              <li
                key={item.copyCode}
                className="flex items-center justify-between gap-2 rounded-lg bg-muted/50 px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium tabular-nums text-foreground">
                    {item.copyCode}
                  </p>
                  {item.error != null && (
                    <Badge variant="destructive" dot className="mt-1">
                      {item.error}
                    </Badge>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => onRemoveCopyCode(item.copyCode)}
                  aria-label={`ลบสำเนา ${item.copyCode}`}
                  className="shrink-0 rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-card hover:text-accent-coral"
                >
                  <Trash2Icon className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {errorMessage != null && (
        <p role="status" className="mt-3 text-sm font-medium text-accent-coral">
          {errorMessage}
        </p>
      )}

      <Button
        type="button"
        className="mt-5 w-full"
        onClick={onCheckout}
        disabled={isCheckoutDisabled}
        title={member.isSuspended ? SUSPENDED_TOOLTIP : undefined}
      >
        {CHECKOUT_LABEL}
      </Button>
      {member.isSuspended && (
        <p className="mt-2 text-center text-caption text-accent-coral">{SUSPENDED_TOOLTIP}</p>
      )}
    </section>
  );
}

export type { CheckoutPanelProps };
