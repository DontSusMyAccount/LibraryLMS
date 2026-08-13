"use client";

import { ROLE_LABELS } from "@/app/features/members/components/members-table";
import { STATUS_LABELS } from "@/app/features/members/components/member-status-badge";

import type { ProfileSummary } from "../profile.types";

/** การ์ดแสดงข้อมูลโปรไฟล์ (ชื่อ, อีเมล, บทบาท, สถานะ) */
export function ProfileCard({ fullName, email, role, status }: ProfileSummary) {
  return (
    <section data-slot="profile-card" className="rounded-lg border border-border p-6">
      <dl className="flex flex-col gap-4">
        <div>
          <dt className="text-caption text-muted-foreground">ชื่อ-นามสกุล</dt>
          <dd data-slot="profile-fullname" className="mt-0.5 text-body font-medium text-foreground">
            {fullName}
          </dd>
        </div>
        <div>
          <dt className="text-caption text-muted-foreground">อีเมล</dt>
          <dd data-slot="profile-email" className="mt-0.5 text-body text-foreground">
            {email}
          </dd>
        </div>
        <div>
          <dt className="text-caption text-muted-foreground">บทบาท</dt>
          <dd data-slot="profile-role" className="mt-0.5 text-body text-foreground">
            {ROLE_LABELS[role]}
          </dd>
        </div>
        <div>
          <dt className="text-caption text-muted-foreground">สถานะ</dt>
          <dd data-slot="profile-status" className="mt-0.5 text-body text-foreground">
            {STATUS_LABELS[status]}
          </dd>
        </div>
      </dl>
    </section>
  );
}
