"use client";

import { useCallback, useEffect, useState } from "react";

import { fetchMyProfile } from "../actions/profile.action";
import type { ProfileSummary } from "../profile.types";

interface UseProfileResult {
  profile: ProfileSummary | null;
  isLoading: boolean;
  isError: boolean;
  load: () => Promise<void>;
}

/** โหลดโปรไฟล์ของ user ปัจจุบัน + รองรับ retry */
export function useProfile(): UseProfileResult {
  const [profile, setProfile] = useState<ProfileSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await fetchMyProfile();
      setProfile(data);
      setIsError(false);
    } catch {
      setProfile(null);
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return { profile, isLoading, isError, load };
}
