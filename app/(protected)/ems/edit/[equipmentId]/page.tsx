"use client";

import React, { useState, useEffect, useTransition } from 'react';
import { useParams, useRouter } from 'next/navigation';
import InputImage from "@/components/InputImage";

import { Button } from '@chakra-ui/react';
import Header from '@/app/(protected)/_components/Header';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { useEquipmentDetails } from './hooks/use-equipment-details';
import { useTagsList } from './hooks/use-tags-list';
import { useTagCreation } from './hooks/use-tag-creation';
import { useEquipmentUpdate } from './hooks/use-equipment-update';

const FIELD_SIZE = 210;

const EditPage = () => {
  const params = useParams();
  const router = useRouter();
  const equipmentId = params.equipmentId;

  const {
    equipmentName,
    setEquipmentName,
    equipmentDetail,
    setEquipmentDetail,
    equipmentImg,
    equipmentTag,
  } = useEquipmentDetails({ equipmentId });

  const { tags, refetch: refetchTags } = useTagsList();

  const [selectedTag, setSelectedTag] = useState("");

  const tagCreation = useTagCreation({ existingTags: tags, refetchTags });
  const update = useEquipmentUpdate({
    equipmentId,
    equipmentName,
    equipmentDetail,
    currentImageUrl: equipmentImg,
    selectedTagName: selectedTag,
    tags,
    onSuccess: () => router.push('/ems/manager'),
  });

  const [isPending_1, startTransition_1] = useTransition();
  const [isPending_2, startTransition_2] = useTransition();
  const [isPending_3, startTransition_3] = useTransition();
  const [isPending_4, startTransition_4] = useTransition();

  // tags がロードされた後に equipmentTag に紐づく tag 名を selectedTag に同期
  useEffect(() => {
    if (tags.length > 0 && equipmentTag) {
      const tag = tags.find(tag => tag.id === equipmentTag);
      if (tag) {
        setSelectedTag(tag.name);
      }
    }
  }, [tags, equipmentTag]);

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
          {(update.imageUrl && update.imageFile) ? (
            <img
              src={update.imageUrl}
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
            ref={update.inputFileRef}
            id="imageInput"
            onChange={update.onFileChange}
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
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {tags && tags.map((tag) => (
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
                    onChange={(e) => tagCreation.setEditTagColor(e.target.value)}
                    value={tagCreation.editTagColor} />
                </div>
                <input
                  className="rounded-md px-1"
                  type="text"
                  placeholder="カテゴリの追加"
                  style={{ border: "1px solid black", width: "180px" }}
                  onChange={(e) => tagCreation.setAddTagName(e.target.value)}
                  value={tagCreation.addTagName}
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
                      onClick={() => startTransition_3(() => {
                        tagCreation.submit().catch(console.error);
                      })}
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
                  onClick={() => startTransition_4(() => {
                    router.push("/ems/categories")
                  })}
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
              onClick={() => startTransition_1(() => {
                update.submit().catch(console.error);
              })}
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
