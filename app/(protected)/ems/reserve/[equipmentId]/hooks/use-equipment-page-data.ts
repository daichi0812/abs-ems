"use client";

import { useEffect, useState } from "react";

interface List {
  id: number;
  name: string;
  detail: string;
  image: string;
  usable: boolean;
}

export interface UseEquipmentPageDataParams {
  equipmentId: string | string[] | undefined;
}

export const useEquipmentPageData = ({ equipmentId }: UseEquipmentPageDataParams) => {
  const [equipmentName, setEquipmentName] = useState<string>("");
  const [equipmentDetail, setEquipmentDetail] = useState<string>("");
  const [equipmentImg, setEquipmentImg] = useState<string>("");
  const [isFetching, setIsFetching] = useState<boolean>(true);

  const fetchEquipmentData = async () => {
    try {
      const equipmentData = await fetch(`/api/lists/${equipmentId}`).then((res) => res.json());
      setEquipmentName(equipmentData.name);
      setEquipmentDetail(equipmentData.detail);
      setEquipmentImg(equipmentData.image);
    } finally {
      // 以前はここで /api/reserves を全件取得して filter していたが、その結果は未使用だった。
      // 無駄な全件取得を廃止し、isFetching は機材データ取得の完了に紐付ける。
      setIsFetching(false);
    }
  };

  useEffect(() => {
    fetchEquipmentData();
  }, []);

  return {
    equipmentName,
    equipmentDetail,
    equipmentImg,
    isFetching,
  };
};
