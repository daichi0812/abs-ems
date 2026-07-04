"use client";

import { useEffect, useState } from "react";

interface List {
  id: number;
  name: string;
  detail: string;
  image: string;
  usable: boolean;
}

interface Reserve {
  id: number;
  user_id: string;
  start: Date;
  end: Date;
  list_id: number;
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
    const equipmentData = await fetch(`/api/lists/${equipmentId}`).then((res) => res.json());
    console.log(equipmentData.detail);
    setEquipmentName(equipmentData.name);
    setEquipmentDetail(equipmentData.detail);
    setEquipmentImg(equipmentData.image);
  };

  const fetchReservesData = async () => {
    // NOTE: This fetch's result was previously stored in local state but never read.
    // We preserve the fetch (it still drives isFetching) but drop the unused state.
    await fetch("/api/reserves")
      .then((res) => res.json())
      .then((reservesData: Reserve[]) =>
        reservesData.filter((item) => item.list_id === Number(equipmentId)),
      );

    setIsFetching(false);
  };

  useEffect(() => {
    fetchEquipmentData();
    fetchReservesData();
  }, []);

  return {
    equipmentName,
    equipmentDetail,
    equipmentImg,
    isFetching,
  };
};
