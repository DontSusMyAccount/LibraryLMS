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
import { formatBath, formatThaiDate } from "@/app/_shared/lib/format-thai";
import { cn } from "@/lib/utils";

import { useMyFines } from "./hooks/use-my-fines";
import type { FineReason } from "@libsys/shared";

const PAGE_TITLE = "à¸„à¹ˆà¸²à¸›à¸£à¸±à¸šà¸‚à¸­à¸‡à¸‰à¸±à¸™";
const PAGE_SUBTITLE =
  "à¸¢à¸­à¸”à¸„à¹‰à¸²à¸‡à¸Šà¸³à¸£à¸°à¹à¸¥à¸°à¸£à¸²à¸¢à¸à¸²à¸£à¸„à¹ˆà¸²à¸›à¸£à¸±à¸šà¸—à¸±à¹‰à¸‡à¸«à¸¡à¸”à¸‚à¸­à¸‡à¸„à¸¸à¸“";
const PAY_NOTE =
  "à¸Šà¸³à¸£à¸°à¸„à¹ˆà¸²à¸›à¸£à¸±à¸šà¹„à¸”à¹‰à¸—à¸µà¹ˆà¹€à¸„à¸²à¸™à¹Œà¹€à¸•à¸­à¸£à¹Œà¸«à¹‰à¸­à¸‡à¸ªà¸¡à¸¸à¸” (à¸¢à¸±à¸‡à¹„à¸¡à¹ˆà¸¡à¸µà¸Šà¸³à¸£à¸°à¸­à¸­à¸™à¹„à¸¥à¸™à¹Œ) â€” à¸„à¹‰à¸²à¸‡à¸Šà¸³à¸£à¸°à¹€à¸à¸´à¸™à¹€à¸žà¸”à¸²à¸™à¸ˆà¸°à¹„à¸¡à¹ˆà¸ªà¸²à¸¡à¸²à¸£à¸–à¸¢à¸·à¸¡à¸«à¸™à¸±à¸‡à¸ªà¸·à¸­à¹„à¸”à¹‰";
const EMPTY_TITLE = "à¹„à¸¡à¹ˆà¸¡à¸µà¸„à¹ˆà¸²à¸›à¸£à¸±à¸šà¸„à¹‰à¸²à¸‡à¸Šà¸³à¸£à¸°";
const EMPTY_HINT =
  "à¸¢à¸­à¸”à¸™à¸µà¹‰à¸£à¸§à¸¡à¸„à¹ˆà¸²à¸›à¸£à¸±à¸šà¸—à¸µà¹ˆà¸ˆà¹ˆà¸²à¸¢à¹à¸¥à¹‰à¸§à¹à¸¥à¸°à¸–à¸¹à¸à¸¢à¸à¹€à¸§à¹‰à¸™à¹à¸¥à¹‰à¸§";

const REASON_LABELS: Record<FineReason, string> = {
  overdue: "à¸ªà¹ˆà¸‡à¸„à¸·à¸™à¸¥à¹ˆà¸²à¸Šà¹‰à¸²",
  lost: "à¸«à¸™à¸±à¸‡à¸ªà¸·à¸­à¸ªà¸¹à¸à¸«à¸²à¸¢",
  damaged: "à¸«à¸™à¸±à¸‡à¸ªà¸·à¸­à¸Šà¸³à¸£à¸¸à¸”",
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
          <h2 className="text-title font-semibold text-foreground">
            à¹‚à¸«à¸¥à¸”à¸„à¹ˆà¸²à¸›à¸£à¸±à¸šà¹„à¸¡à¹ˆà¸ªà¸³à¹€à¸£à¹‡à¸ˆ
          </h2>
          <p className="max-w-sm text-sm text-muted-foreground">
            {errorMessage ??
              "à¹„à¸¡à¹ˆà¸ªà¸²à¸¡à¸²à¸£à¸–à¹€à¸Šà¸·à¹ˆà¸­à¸¡à¸•à¹ˆà¸­à¸à¸±à¸šà¸£à¸°à¸šà¸šà¹„à¸”à¹‰ à¸à¸£à¸¸à¸“à¸²à¸¥à¸­à¸‡à¹ƒà¸«à¸¡à¹ˆ"}
          </p>
          <Button type="button" variant="outline" onClick={() => void load()}>
            <RefreshCcwIcon />
            à¸¥à¸­à¸‡à¹ƒà¸«à¸¡à¹ˆà¸­à¸µà¸à¸„à¸£à¸±à¹‰à¸‡
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
                à¸¢à¸­à¸”à¸„à¹‰à¸²à¸‡à¸Šà¸³à¸£à¸°à¸£à¸§à¸¡
              </p>
              <p
                className={cn(
                  "text-3xl font-bold tabular-nums",
                  unpaidTotal > 0 ? "text-accent-coral" : "text-foreground",
                )}
              >
                {formatBath(unpaidTotal)} à¸šà¸²à¸—
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
              <h2 className="text-title font-semibold text-foreground">
                à¸£à¸²à¸¢à¸à¸²à¸£à¸„à¹ˆà¸²à¸›à¸£à¸±à¸š
              </h2>
              {fines.map((fine) => (
                <Card key={fine.id} data-slot="fine-item" size="sm" className="gap-3">
                  <CardContent className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        {REASON_LABELS[fine.reason] ?? fine.reason}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        à¸§à¸±à¸™à¸—à¸µà¹ˆà¸šà¸±à¸™à¸—à¸¶à¸ {formatThaiDate(fine.createdAt)}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span className="text-sm font-semibold tabular-nums text-foreground">
                        {formatBath(fine.amount)} à¸šà¸²à¸—
                      </span>
                      <Badge
                        variant={fine.waived ? "secondary" : fine.paid ? "outline" : "destructive"}
                      >
                        {fine.waived
                          ? "à¸¢à¸à¹€à¸§à¹‰à¸™à¹à¸¥à¹‰à¸§"
                          : fine.paid
                            ? "à¸ˆà¹ˆà¸²à¸¢à¹à¸¥à¹‰à¸§"
                            : "à¸„à¹‰à¸²à¸‡à¸Šà¸³à¸£à¸°"}
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
