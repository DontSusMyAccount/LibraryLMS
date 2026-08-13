"use client";

import { useEffect } from "react";
import {
  BadgeCheckIcon,
  BanknoteIcon,
  RefreshCcwIcon,
  TriangleAlertIcon,
  WalletIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatBath, formatThaiDate } from "@/app/features/circulation/circulation.format";
import { cn } from "@/lib/utils";

import { useMyFines } from "./hooks/use-my-fines";
import type { FineReason } from "@libsys/shared";

const PAGE_TITLE = "ค่าปรับของฉัน";
const PAGE_SUBTITLE = "ยอดค้างชำระและรายการค่าปรับทั้งหมดของคุณ";
const PAY_NOTE =
  "ชำระค่าปรับได้ที่เคาน์เตอร์ห้องสมุด (ยังไม่มีชำระออนไลน์) — ค้างชำระเกินเพดานจะไม่สามารถยืมหนังสือได้";
const EMPTY_TITLE = "ไม่มีค่าปรับค้างชำระ";
const EMPTY_HINT = "ยอดนี้รวมค่าปรับที่จ่ายแล้วและถูกยกเว้นแล้ว";

const REASON_LABELS: Record<FineReason, string> = {
  overdue: "ส่งคืนล่าช้า",
  lost: "หนังสือสูญหาย",
  damaged: "หนังสือชำรุด",
};

export function MyFinesPage() {
  const { fines, unpaidTotal, isLoading, isError, errorMessage, load } = useMyFines();

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div data-slot="my-fines-page" className="flex flex-col gap-5">
      <section data-slot="my-fines-heading">
        <h1 className="text-title font-semibold text-foreground">{PAGE_TITLE}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{PAGE_SUBTITLE}</p>
      </section>

      {isError ? (
        <section
          data-slot="my-fines-error"
          className="flex min-h-[40vh] flex-col items-center justify-center gap-3 rounded-lg bg-card text-center shadow-card"
        >
          <div className="flex size-14 items-center justify-center rounded-full bg-accent-coral/10 text-accent-coral">
            <TriangleAlertIcon className="size-7" />
          </div>
          <h2 className="text-title font-semibold text-foreground">โหลดค่าปรับไม่สำเร็จ</h2>
          <p className="max-w-sm text-sm text-muted-foreground">
            {errorMessage ?? "ไม่สามารถเชื่อมต่อกับระบบได้ กรุณาลองใหม่"}
          </p>
          <Button type="button" variant="outline" onClick={() => void load()}>
            <RefreshCcwIcon />
            ลองใหม่อีกครั้ง
          </Button>
        </section>
      ) : isLoading ? (
        <div data-slot="my-fines-loading" className="flex flex-col gap-3">
          <Skeleton className="h-28 rounded-lg" />
          <Skeleton className="h-24 rounded-lg" />
        </div>
      ) : (
        <>
          <Card
            data-slot="fines-total-card"
            className={cn("border-0", unpaidTotal > 0 ? "bg-accent-coral/10" : "bg-brand-500/10")}
          >
            <CardContent className="flex flex-col items-center gap-1 py-6 text-center">
              <WalletIcon
                className={cn(
                  "size-6",
                  unpaidTotal > 0 ? "text-accent-coral" : "text-brand-600 dark:text-brand-300",
                )}
                aria-hidden="true"
              />
              <p className="text-caption font-medium tracking-wide text-muted-foreground">
                ยอดค้างชำระรวม
              </p>
              <p
                className={cn(
                  "text-3xl font-bold tabular-nums",
                  unpaidTotal > 0 ? "text-accent-coral" : "text-foreground",
                )}
              >
                {formatBath(unpaidTotal)} บาท
              </p>
              {unpaidTotal > 0 && (
                <p className="mt-2 flex items-start gap-1.5 rounded-md bg-background/70 px-3 py-2 text-xs text-muted-foreground">
                  <BanknoteIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                  {PAY_NOTE}
                </p>
              )}
            </CardContent>
          </Card>

          {fines.length === 0 ? (
            <section
              data-slot="fines-empty"
              className="flex min-h-[30vh] flex-col items-center justify-center gap-3 rounded-lg bg-card text-center shadow-card"
            >
              <div className="flex size-14 items-center justify-center rounded-full bg-brand-500/10 text-brand-500">
                <BadgeCheckIcon className="size-7" />
              </div>
              <h2 className="text-title font-semibold text-foreground">{EMPTY_TITLE}</h2>
              <p className="max-w-sm text-sm text-muted-foreground">{EMPTY_HINT}</p>
            </section>
          ) : (
            <section data-slot="fines-list" className="flex flex-col gap-3">
              <h2 className="text-title font-semibold text-foreground">รายการค่าปรับ</h2>
              {fines.map((fine) => (
                <Card key={fine.id} data-slot="fine-item" size="sm" className="gap-3">
                  <CardContent className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        {REASON_LABELS[fine.reason] ?? fine.reason}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        วันที่บันทึก {formatThaiDate(fine.createdAt)}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span className="text-sm font-semibold tabular-nums text-foreground">
                        {formatBath(fine.amount)} บาท
                      </span>
                      <Badge
                        variant={fine.waived ? "secondary" : fine.paid ? "outline" : "destructive"}
                      >
                        {fine.waived ? "ยกเว้นแล้ว" : fine.paid ? "จ่ายแล้ว" : "ค้างชำระ"}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </section>
          )}
        </>
      )}
    </div>
  );
}

export default MyFinesPage;
