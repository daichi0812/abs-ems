"use client"

import Image from 'next/image';
import React, { useState } from 'react'

const EditPage = () => {
  const [equipmentName, setEquipmentName] = useState('');
  const [equipmentDetail, setEquipmentDetail] = useState('');
  const [equipmentImg, setEquipmentImg] = useState('');

  const fetchUserData = async () => {
    const equipmentData = await fetch(`https://logicode.fly.dev/lists/90`).then(res => res.json());
    console.log(equipmentData);
    setEquipmentName(equipmentData.name);
    setEquipmentDetail(equipmentData.detail);
    setEquipmentImg(equipmentData.image)
    // console.log(equipmentData.image)
  };

  return (
    <div>
      <Image
        width={280}
        height={280}
        src={equipmentImg}
        alt={equipmentName}
        className="w-[280px] h-[280px] rounded-lg my-0.5 mb-2"
      />
    </div>
  )
}

export default EditPage