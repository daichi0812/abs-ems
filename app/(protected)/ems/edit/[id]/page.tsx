"use client";

import React, { useState, useEffect, useRef, useTransition } from 'react';
import { useParams, useRouter } from 'next/navigation';
import axios from 'axios';
import InputImage from "@/components/InputImage";
import { useGetImageUrl } from "@/app/(protected)/ems/manager/useGetImageUrl";
import type { PutBlobResult } from '@vercel/blob';

import { Button } from '@chakra-ui/react';
import Header from '@/app/(protected)/_components/Header';

const FIELD_SIZE = 210;

const EditPage = () => {
  const params = useParams();
  const router = useRouter();
  const equipmentId = params.id;

  const [equipmentName, setEquipmentName] = useState('');
  const [equipmentDetail, setEquipmentDetail] = useState('');
  const [equipmentImg, setEquipmentImg] = useState(''); // 現在の画像URL
  const [imageFile, setImageFile] = useState<File | null>(null); // 新しい画像ファイル

  const [isPending_1, startTransition_1] = useTransition();
  const [isPending_2, startTransition_2] = useTransition();

  const inputFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchEquipmentData();
  }, []);

  const fetchEquipmentData = async () => {
    try {
      const equipmentData = await fetch(`https://logicode.fly.dev/lists/${equipmentId}`).then(res => res.json());
      setEquipmentName(equipmentData.name);
      setEquipmentDetail(equipmentData.detail);
      setEquipmentImg(equipmentData.image);
    } catch (err) {
      console.error('機材データの取得に失敗しました:', err);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.currentTarget?.files && e.currentTarget.files[0]) {
      const targetFile = e.currentTarget.files[0];
      setImageFile(targetFile);
    }
  };

  const { imageUrl } = useGetImageUrl({ file: imageFile });

  const handleUpdateEquipment = async () => {
    try {
      let blobUrl = equipmentImg; // デフォルトは現在の画像URL

      // 新しい画像が選択された場合
      if (imageFile) {
        try {
          const responseVaecel = await fetch(
            `/api/upload?filename=${imageFile.name}`,
            {
              method: 'POST',
              body: imageFile,
            },
          );
          const responseText = await responseVaecel.text();
          console.log('Image upload response:', responseText);

          const blob = JSON.parse(responseText) as PutBlobResult;
          blobUrl = blob.url;
        } catch (error) {
          console.error('Image upload failed:', error);
          alert('画像のアップロードに失敗しました');
          return;
        }
      }

      try {
        const response = await axios.put(
          `https://logicode.fly.dev/lists/${equipmentId}`,
          {
            name: equipmentName,
            detail: equipmentDetail,
            image: blobUrl,
          },
          {
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );
        console.log('Update response:', response.data);
        alert('機材情報が更新されました');
        router.push('/ems/manager');
      } catch (error) {
        console.error('Failed to update equipment:', error);
        if (axios.isAxiosError(error)) {
          console.error('Response data:', error.response?.data);
        }
        alert('機材情報の更新に失敗しました');
      }
    } catch (err) {
      console.error('Unexpected error:', err);
      alert('予期せぬエラーが発生しました');
    }
  };

  const handleClickCancelButton = () => {
    router.push('/ems/manager'); // キャンセル時にリダイレクト
  };

  return (
    <div className='bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))]
        from-sky-400 to-blue-800 h-full'>
      <Header />
      <div className="bg-[#F5F5F8] shadow rounded-md p-3 mt-3 mx-2">
        <p className='text-xl mb-1'>機材情報の編集</p>
        <label
          htmlFor="imageInput"
          className="mb-2"
          style={{
            border: "white 3px dotted",
            width: FIELD_SIZE,
            height: FIELD_SIZE,
            display: "flex",
            borderRadius: 12,
            justifyContent: "center",
            alignItems: "center",
            overflow: "hidden",
            cursor: "pointer",
          }}
        >
          {(imageUrl && imageFile) ? (
            <img
              src={imageUrl}
              alt="アップロード画像"
              style={{ objectFit: "cover", width: "100%", height: "100%" }}
            />
          ) : equipmentImg ? (
            <img
              src={equipmentImg}
              alt="現在の画像"
              style={{ objectFit: "cover", width: "100%", height: "100%" }}
            />
          ) : (
            "+ 画像をアップロード"
          )}
          <InputImage
            ref={inputFileRef}
            id="imageInput"
            onChange={handleFileChange}
          />
        </label>
        <input
          className='mb-1 rounded-md px-1'
          type="text"
          placeholder="機材名を入力してください"
          style={{ border: '1px solid black' }}
          value={equipmentName}
          onChange={(e) => setEquipmentName(e.target.value)}
        />
        <textarea
          className="rounded-md px-1"
          placeholder="説明文を入力してください"
          style={{ width: '100%', height: '100px', border: '1px solid black' }}
          value={equipmentDetail}
          onChange={(e) => setEquipmentDetail(e.target.value)}
        />
        <div className="flex gap-2">
          {isPending_1 ? (
            <Button
              isLoading
              colorScheme='blue'
            >
              更新
            </Button>
          ) : (
            <Button
              disabled={isPending_1}
              onClick={() => startTransition_1(() => handleUpdateEquipment())}
              colorScheme='blue'
            >
              更新
            </Button>
          )}
          {isPending_2 ? (
            <Button
              isLoading
              colorScheme='yellow'
            >
              キャンセル
            </Button>
          ) : (
            <Button
              disabled={isPending_2}
              onClick={() => startTransition_2(() => handleClickCancelButton())}
              colorScheme='yellow'
            >
              キャンセル
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default EditPage;
