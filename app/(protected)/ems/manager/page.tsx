"use client";
import { useState, useTransition } from "react";
import React from "react";
import InputImage from "@/components/InputImage";
import Header from "@/app/(protected)/_components/Header";
import { useRouter } from "next/navigation";
import { Button, Center, Spinner } from "@chakra-ui/react";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEquipments } from "../_hooks/use-equipments";
import { useTags } from "./hooks/use-tags";
import { useImageUpload } from "./hooks/use-image-upload";
import { useTagCreation } from "./hooks/use-tag-creation";
import { useEquipmentRegistration } from "./hooks/use-equipment-registration";
import { useEquipmentActions } from "./hooks/use-equipment-actions";

const IMAGE_ID = "imageId";
const FIELD_SIZE = 210;

function App() {
    const router = useRouter();
    const [isPending_3, startTransition_3] = useTransition();
    const [isPending_4, startTransition_4] = useTransition();

    const { equipments, isLoading, refetch: refetchEquipments } = useEquipments();
    const { tags, categories, isLoading: categoriesLoading, refetch: refetchTags } = useTags();
    const imageUpload = useImageUpload();
    const tagCreation = useTagCreation({ existingTags: tags, refetchTags });
    const registration = useEquipmentRegistration({
        tags,
        inputFileRef: imageUpload.inputFileRef,
        resetImage: imageUpload.reset,
        refetchEquipments,
    });
    const actions = useEquipmentActions({ refetchEquipments });

    // 編集・削除リストのカテゴリフィルタ
    const [selectedCategory, setSelectedCategory] = useState<string>("all");

    // 選択されたカテゴリーに基づいて機材をフィルタリング
    const filteredEquipments = selectedCategory === "all"
        ? equipments
        : equipments.filter(equipment => equipment.tag_id === selectedCategory);

    return (
        <div
            className="bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))]
            from-sky-400 to-blue-800 pb-2 min-h-full"
        >
            <Header />
            <div className="bg-[#F5F5F8] shadow-md rounded-md p-3 mt-3 mx-2 md:w-[80%] md:mx-auto">
                <p className="text-xl mb-1">機材登録</p>
                <label
                    htmlFor={IMAGE_ID}
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
                    {imageUpload.imageUrl && imageUpload.imageFile ? (
                        <img
                            src={imageUpload.imageUrl}
                            alt="アップロード画像"
                            style={{ objectFit: "cover", width: "100%", height: "100%" }}
                        />
                    ) : (
                        "+ 画像をアップロード"
                    )}
                    <InputImage ref={imageUpload.inputFileRef} id={IMAGE_ID} onChange={imageUpload.onFileChange} />
                </label>
                <div className="mb-2 flex">
                    <Select
                        value={registration.selectedTag}
                        onValueChange={(value) => {
                            registration.setSelectedTag(value);
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
                                        {/* FIXME: existing bug — submit is referenced but not invoked, so this click does nothing. Preserved during refactor. */}
                                        <Button
                                            size={"sm"}
                                            colorScheme="blue"
                                            onClick={() => startTransition_3(() => {tagCreation.submit})}
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
                    className="mb-1 rounded-md px-1"
                    type="text"
                    placeholder="機材名を入力してください"
                    style={{ border: "1px solid black" }}
                    value={registration.equipmentName}
                    onChange={(e) => registration.setEquipmentName(e.target.value)}
                />
                <textarea
                    className="rounded-md px-1"
                    placeholder="説明文を入力してください"
                    style={{ width: "100%", height: "100px", border: "1px solid black" }}
                    value={registration.equipmentDetail}
                    onChange={(e) => registration.setEquipmentDetail(e.target.value)}
                />
                <div className="flex gap-2">
                    <RegistrationSubmitButton submit={registration.submit} />

                    {(imageUpload.imageFile || registration.equipmentName || registration.equipmentDetail) && (
                        <Button onClick={registration.cancel} colorScheme="yellow">
                            キャンセル
                        </Button>
                    )}
                </div>
            </div>
            <div className="bg-[#F5F5F8] shadow-md rounded-md p-3 my-3 mx-2 md:w-[80%] md:mx-auto">
                <div className='flex justify-between items-center'>
                    <p className='text-xl'>編集・削除</p>
                    <Select
                        value={selectedCategory}
                        onValueChange={(value) => setSelectedCategory(value)}
                        disabled={categoriesLoading}    // カテゴリー取得中はSelectを無効化
                    >
                        <SelectTrigger className="w-[180px] shadow-none border-black text-black bg-slate-50 hover:bg-slate-150">
                            <SelectValue placeholder="All" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All</SelectItem>
                            {categories.map((category) => (
                                <SelectItem key={category.id} value={category.id}>
                                    {category.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {!isLoading && equipments ? (
                    <>
                        {filteredEquipments.length > 0 ? (
                            filteredEquipments.map((equipment) => (
                                <div
                                    key={equipment.id}
                                    className="bg-slate-200 rounded-md p-2 mt-3 flex shadow gap-x-1"
                                >
                                    <div className="flex justify-center items-center">
                                        <p>{equipment.name}</p>
                                    </div>
                                    <div className="ml-auto items-center flex gap-x-1">
                                        {actions.isPending && actions.loadingId === equipment.id ? (
                                            <Button
                                                isLoading
                                                disabled={actions.isPending && actions.loadingId === equipment.id}
                                                size={'md'}
                                                me={1}
                                                colorScheme="yellow"
                                            >
                                                編集
                                            </Button>
                                        ) : (
                                            <Button
                                                disabled={actions.isPending && actions.loadingId === equipment.id}
                                                onClick={() => actions.editEquipment(equipment.id)}
                                                size={'md'}
                                                me={1}
                                                colorScheme="yellow"
                                            >
                                                編集
                                            </Button>
                                        )}
                                        <Button
                                            onClick={() => actions.deleteEquipment(equipment.id)}
                                            size={'md'}
                                            colorScheme="red">
                                            削除
                                        </Button>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <Center my={4}>
                                <p>該当する機材が見つかりませんでした。</p>
                            </Center>
                        )}
                    </>
                ) : (
                    <Center my={4}>
                        <Spinner thickness="4px" speed="0.65s" emptyColor="gray.200" color="blue.500" size="xl" />
                    </Center>
                )}
            </div>
        </div >
    );
}

// 「登録」ボタン: 元コードと挙動を揃えるため startTransition を内蔵
const RegistrationSubmitButton = ({ submit }: { submit: () => Promise<void> }) => {
    const [isPending, startTransition] = useTransition();
    return isPending ? (
        <Button isLoading colorScheme="blue">
            登録
        </Button>
    ) : (
        <Button
            disabled={isPending}
            onClick={() => startTransition(() => { submit().catch(console.error); })}
            colorScheme="blue"
        >
            登録
        </Button>
    );
};

export default App;
