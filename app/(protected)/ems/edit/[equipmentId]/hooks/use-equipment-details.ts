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

  const fetchEquipmentData = async () => {
    try {
      const equipmentData: EquipmentResponse = await fetch(`/api/lists/${equipmentId}`).then(
        (res) => res.json(),
      );
      setEquipmentName(equipmentData.name);
      setEquipmentDetail(equipmentData.detail);
      setEquipmentImg(equipmentData.image);
      setEquipmentTag(equipmentData.tag_id);
    } catch (err) {
      console.error("機材データの取得に失敗しました:", err);
    }
  };

  useEffect(() => {
    fetchEquipmentData();
  }, []);

  return {
    equipmentName,
    setEquipmentName,
    equipmentDetail,
    setEquipmentDetail,
    equipmentImg,
    equipmentTag,
  };
};
