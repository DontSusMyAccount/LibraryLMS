"use client";

import { RefreshCw } from "lucide-react";

import { ProfileCard } from "@/app/features/profile/components/profile-card";
import { useProfile } from "@/app/features/profile/hooks/use-profile";

export default function ProfilePage() {
  const { profile, isLoading, isError, load } = useProfile();

  return (
    <div data-slot="profile-page" className="flex flex-col gap-6">
      <h1 className="text-heading2 font-bold text-foreground">โปรไฟล์ของฉัน</h1>

      {isLoading && <p className="text-body text-muted-foreground">กำลังโหลด...</p>}

      {isError && (
        <div className="flex flex-col gap-3">
          <p className="text-body text-error">ไม่สามารถโหลดข้อมูลโปรไฟล์ได้</p>
          <button
            type="button"
            data-slot="profile-retry"
            className="inline-flex w-fit items-center gap-2 rounded-md px-3 py-1.5 text-caption font-medium text-primary"
            onClick={() => void load()}
          >
            <RefreshCw className="size-4" aria-hidden />
            ลองอีกครั้ง
          </button>
        </div>
      )}

      {profile && <ProfileCard {...profile} />}
    </div>
  );
}
