"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { updateUserSettings } from "@/actions/user-settings";
import { DEFAULT_USER_SETTINGS as DEFAULTS, type UserSettingsValues } from "@/lib/user-settings";

// 設定を GET で読み、変更は即 upsert（楽観的更新・失敗で巻き戻し）。
export const useUserSettings = () => {
  const [settings, setSettings] = useState<UserSettingsValues>(DEFAULTS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/user-settings");
        if (res.ok) {
          const data = (await res.json()) as UserSettingsValues;
          if (active) setSettings(data);
        }
      } catch (err) {
        console.error("設定の取得に失敗しました", err);
      } finally {
        if (active) setIsLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // 部分更新して即保存。失敗時は前の値へ戻す。
  const patch = async (partial: Partial<UserSettingsValues>) => {
    const prev = settings;
    const next = { ...settings, ...partial };
    setSettings(next); // 楽観的
    setIsSaving(true);
    try {
      const result = await updateUserSettings(next);
      if (result.error) {
        setSettings(prev);
        toast.error(result.error);
      }
    } catch (err) {
      console.error("設定の保存に失敗しました", err);
      setSettings(prev);
      toast.error("設定の保存に失敗しました");
    } finally {
      setIsSaving(false);
    }
  };

  return { settings, isLoading, isSaving, patch };
};
