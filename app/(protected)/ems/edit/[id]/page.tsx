"use client";

import React, { useState, useEffect, useRef, useTransition } from 'react';
import { useParams, useRouter } from 'next/navigation';
import axios from 'axios';
import InputImage from "@/components/InputImage";
import { useGetImageUrl } from "@/app/(protected)/ems/manager/useGetImageUrl";
import type { PutBlobResult } from '@vercel/blob';

import { Button } from '@chakra-ui/react';
import Header from '@/app/(protected)/_components/Header';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const FIELD_SIZE = 210;

interface Tags {
  id: number;
  name: string;
  color: string;
}

const EditPage = () => {
  const params = useParams();
  const router = useRouter();
  const equipmentId = params.id;

  const [equipmentName, setEquipmentName] = useState('');
  const [equipmentDetail, setEquipmentDetail] = useState('');
  const [equipmentImg, setEquipmentImg] = useState(''); // 現在の画像URL
  const [imageFile, setImageFile] = useState<File | null>(null); // 新しい画像ファイル

  const [tags, setTags] = useState<Tags[]>([]); // タグを保持する変数
  const [addTagName, setAddTagName] = useState<string>(''); // 追加するタグを保持する変数

  const [editTagColor, setEditTagColor] = useState<string>('');

  const [selectedTag, setSelectedTag] = useState("");

  const [isPending_1, startTransition_1] = useTransition();
  const [isPending_2, startTransition_2] = useTransition();
  const [isPending_3, startTransition_3] = useTransition();
  const [isPending_4, startTransition_4] = useTransition();

  const inputFileRef = useRef<HTMLInputElement>(null);

  const setTagsFunc = async () => {
    const response = await fetch("https://logicode.fly.dev/tags");
    const data: Tags[] = await response.json();
    setTags(data);
  }

  const handleAddTag = async () => {
    if (addTagName === "") {
      alert("カテゴリ名は1文字以上入力してください.")
      setAddTagName("");
      return;
    }

    const isDuplicate = tags.some((tag) => tag.name === addTagName.trim());
    if (isDuplicate) {
      alert("このカテゴリは既に存在しています.");
      setAddTagName("");
      return;
    }

    await axios.post("https://logicode.fly.dev/tags", {
      name: addTagName,
      color: editTagColor
    });
    setEditTagColor("");
    setAddTagName("");
    setTagsFunc();
  }

  useEffect(() => {
    fetchEquipmentData();
    setTagsFunc();
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
            tag_id: tags.find((tag) => tag.name === selectedTag)?.id
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
      <div className="bg-[#F5F5F8] shadow rounded-md p-3 mt-3 mx-2 md:w-[80%] md:mx-auto">
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
        <div className="mb-2 flex">
          <Select
            value={selectedTag}
            onValueChange={(value) => {
              setSelectedTag(value);
            }}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="カテゴリ" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {tags.map((tag) => (
                  <SelectItem
                    value={tag.name}
                    key={tag.id}
                  >
                    <div className='flex'>
                      <div className="flex justify-center items-center">
                        <div className="rounded-full flex h-3 w-3" style={{ backgroundColor: tag.color }}></div>
                      </div>
                      <div className="flex justify-center items-center">
                        <p className='rounded p-1'>{tag.name}</p>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectGroup>
              <div className="flex mt-1">
                <div className='flex justify-center items-center me-1'>
                  <input
                    className='w-8 h-8 border rounded-md'
                    type="color"
                    onChange={(e) => setEditTagColor(e.target.value)}
                    value={editTagColor} />
                </div>
                <input
                  className="rounded-md px-1"
                  type="text"
                  placeholder="カテゴリの追加"
                  style={{ border: "1px solid black", width: "180px" }}
                  onChange={(e) => setAddTagName(e.target.value)}
                  value={addTagName}
                  onKeyDown={(e) => {
                    e.stopPropagation();
                  }}
                  onFocus={(e) => e.stopPropagation()}
                />
                {isPending_3 ? (
                  <div className="flex justify-center items-center ml-1">
                    <Button isLoading size={"sm"} colorScheme="blue">
                      追加
                    </Button>
                  </div>
                ) : (
                  <div className="flex justify-center items-center ml-1">
                    <Button
                      size={"sm"}
                      colorScheme="blue"
                      onClick={() => startTransition_3(handleAddTag)}
                    >
                      追加
                    </Button>
                  </div>
                )}
              </div>
            </SelectContent>
          </Select>

          {tags.length > 0 && (
            <div className="flex justify-center items-center ml-2">
              {isPending_4 ? (
                <Button
                  size={'sm'}
                  colorScheme="yellow"
                  isLoading
                >
                  カテゴリ編集
                </Button>
              ) : (
                <Button
                  size={'sm'}
                  colorScheme="yellow"
                  onClick={() => startTransition_4(() => router.push("/ems/categories"))}
                >
                  カテゴリ編集
                </Button>
              )}
            </div>
          )}
        </div>
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
        <div className="flex gap-2 justify-between">
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
              colorScheme='blue'
              variant={'outline'}
            >
              戻る
            </Button>
          ) : (
            <Button
              disabled={isPending_2}
              onClick={() => startTransition_2(() => handleClickCancelButton())}
              colorScheme='blue'
              variant={'outline'}
            >
              戻る
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default EditPage;
