"use client";

import { useEffect, useState } from "react";

interface EquipmentResponse {
  name: string;
  detail: string;
  image: string;
  tag_id: number | undefined;
}

export interface UseEquipmentDetailsParams {
  equipmentId: string | string[] | undefined;
}

export const useEquipmentDetails = ({ equipmentId }: UseEquipmentDetailsParams) => {
  const [equipmentName, setEquipmentName] = useState<string>("");
  const [equipmentDetail, setEquipmentDetail] = useState<string>("");
  const [equipmentImg, setEquipmentImg] = useState<string>("");
  const [equipmentTag, setEquipmentTag] = useState<number | undefined>();
  // ロード状態が無いと空フォームが先に出て、遅い回線では入力し始めた文字が
  // フェッチ結果で上書きされる。取得完了までpage側でスケルトンを出すために持つ。
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  const fetchEquipmentData = async () => {
    setIsLoading(true);
    setIsError(false);
    try {
      const res = await fetch(`/api/lists/${equipmentId}`);
      if (!res.ok) {
        // 404/401/500 の {error} ボディをパースすると undefined が各フィールドに
        // 入り「無言の空フォーム」になるため、エラーとして扱う
        throw new Error(`HTTP ${res.status}`);
      }
      const equipmentData: EquipmentResponse = await res.json();
      setEquipmentName(equipmentData.name ?? "");
      setEquipmentDetail(equipmentData.detail ?? "");
      setEquipmentImg(equipmentData.image ?? "");
      setEquipmentTag(equipmentData.tag_id);
    } catch (err) {
      console.error("機材データの取得に失敗しました:", err);
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEquipmentData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    equipmentName,
    setEquipmentName,
    equipmentDetail,
    setEquipmentDetail,
    equipmentImg,
    equipmentTag,
    isLoading,
    isError,
    refetch: fetchEquipmentData,
  };
};
