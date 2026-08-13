"use client";

import { ROLE_LABELS } from "@/app/_shared/constants/member.labels";
import { STATUS_LABELS } from "@/app/_shared/constants/member.labels";

import type { ProfileSummary } from "../profile.types";

/** à¸à¸²à¸£à¹Œà¸”à¹à¸ªà¸”à¸‡à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¹‚à¸›à¸£à¹„à¸Ÿà¸¥à¹Œ (à¸Šà¸·à¹ˆà¸­, à¸­à¸µà¹€à¸¡à¸¥, à¸šà¸—à¸šà¸²à¸—, à¸ªà¸–à¸²à¸™à¸°) */
export function ProfileCard({ fullName, email, role, status }: ProfileSummary) {
  return (
    <section data-slot="profile-card" className="rounded-lg border border-border p-6">
      <dl className="flex flex-col gap-4">
        <div>
          <dt className="text-caption text-muted-foreground">à¸Šà¸·à¹ˆà¸­-à¸™à¸²à¸¡à¸ªà¸à¸¸à¸¥</dt>
          <dd data-slot="profile-fullname" className="mt-0.5 text-body font-medium text-foreground">
            {fullName}
          </dd>
        </div>
        <div>
          <dt className="text-caption text-muted-foreground">à¸­à¸µà¹€à¸¡à¸¥</dt>
          <dd data-slot="profile-email" className="mt-0.5 text-body text-foreground">
            {email}
          </dd>
        </div>
        <div>
          <dt className="text-caption text-muted-foreground">à¸šà¸—à¸šà¸²à¸—</dt>
          <dd data-slot="profile-role" className="mt-0.5 text-body text-foreground">
            {ROLE_LABELS[role]}
          </dd>
        </div>
        <div>
          <dt className="text-caption text-muted-foreground">à¸ªà¸–à¸²à¸™à¸°</dt>
          <dd data-slot="profile-status" className="mt-0.5 text-body text-foreground">
            {STATUS_LABELS[status]}
          </dd>
        </div>
      </dl>
    </section>
  );
}
