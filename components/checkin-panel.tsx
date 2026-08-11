"use client";

import { useState } from "react";
import { CornerUpLeftIcon, ScanLineIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface CheckinPanelProps {
  isBusy: boolean;
  errorMessage: string | null;
  onCheckin: (copyCode: string) => Promise<boolean>;
  className?: string;
}

const COPY_CODE_PLACEHOLDER = "สแกนหรือพิมพ์รหัสสำเนาที่ส่งคืน...";
const CHECKIN_LABEL = "คืนหนังสือ";
const CHECKIN_TITLE = "คืนหนังสือ";
const CHECKIN_HINT = "สแกนรหัสสำเนาเพื่อปิดรายการยืม พร้อมคำนวณค่าปรับ";

export function CheckinPanel({ isBusy, errorMessage, onCheckin, className }: CheckinPanelProps) {
  const [copyCode, setCopyCode] = useState("");

  const handleCheckin = async () => {
    const normalized = copyCode.trim();
    if (!normalized || isBusy) {
      return;
    }
    const ok = await onCheckin(normalized);
    if (ok) {
      setCopyCode("");
    }
  };

  return (
    <section
      data-slot="checkin-panel"
      className={`rounded-lg bg-card p-5 shadow-card ${className ?? ""}`}
    >
      <header className="mb-4 flex items-center gap-3">
        <div className="flex size-11 items-center justify-center rounded-full bg-accent-mint/15 text-brand-600 dark:text-brand-300">
          <CornerUpLeftIcon className="size-5" />
        </div>
        <div>
          <h2 className="text-title font-semibold text-foreground">{CHECKIN_TITLE}</h2>
          <p className="text-sm text-muted-foreground">{CHECKIN_HINT}</p>
        </div>
      </header>

      <div className="flex gap-2">
        <Input
          type="text"
          value={copyCode}
          onChange={(event) => setCopyCode(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              void handleCheckin();
            }
          }}
          placeholder={COPY_CODE_PLACEHOLDER}
          aria-label="รหัสสำเนาหนังสือที่คืน"
        />
        <Button
          type="button"
          variant="secondary"
          onClick={() => void handleCheckin()}
          disabled={isBusy || copyCode.trim().length === 0}
        >
          <ScanLineIcon />
          {CHECKIN_LABEL}
        </Button>
      </div>

      {errorMessage != null && (
        <div className="mt-3">
          <Badge variant="destructive" dot>
            {errorMessage}
          </Badge>
        </div>
      )}
    </section>
  );
}

export type { CheckinPanelProps };
