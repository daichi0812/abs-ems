"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import React from "react";
import axios from "axios";
import InputImage from "@/components/InputImage";
import Header from "@/app/(protected)/_components/Header";
import { useGetImageUrl } from "./useGetImageUrl";
import { useRouter } from "next/navigation";
import { Button, Center, Spinner } from "@chakra-ui/react";
import type { PutBlobResult } from "@vercel/blob";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const IMAGE_ID = "imageId";
const FIELD_SIZE = 210;

interface Equipment {
    id: number;
    name: string;
    detail: string;
    image: string;
    tag_id: string;
}

interface Tags {
    id: string;
    name: string;
    color: string;
}

function App() {
    const inputFileRef = useRef<HTMLInputElement>(null);
    const [isPending_1, startTransition_1] = useTransition();
    const [isPending_2, startTransition_2] = useTransition();
    const [isPending_3, startTransition_3] = useTransition();
    const [isPending_4, startTransition_4] = useTransition();
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const { imageUrl } = useGetImageUrl({ file: imageFile });
    const [equipmentName, setEquipmentName] = useState("");
    const [equipmentDetail, setEquipmentDetail] = useState("");
    const [equipments, setEquipments] = useState<Equipment[]>([]);

    const [tags, setTags] = useState<Tags[]>([]); // タグを保持する変数
    const [addTagName, setAddTagName] = useState<string>(''); // 追加するタグを保持する変数

    const [editTagColor, setEditTagColor] = useState<string>('');

    // 選択されたカテゴリーを管理する状態
    const [selectedTag, setSelectedTag] = useState("all"); // 機材登録用
    const [selectedCategory, setSelectedCategory] = useState<string>('all'); // 編集・削除のソート用

    // 取得したカテゴリーを保存する状態変数
    const [categories, setCategories] = useState<Tags[]>([]);
    const [categoriesLoading, setCategoriesLoading] = useState<boolean>(true);

    const [loadingId, setLoadingId] = useState<number | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.currentTarget?.files && e.currentTarget.files[0]) {
            setImageFile(e.currentTarget.files[0]);
        }
    };

    const handleClickCancelButton = () => {
        setImageFile(null);
        setEquipmentName("");
        setEquipmentDetail("");
        setSelectedTag("");
        if (inputFileRef.current) {
            inputFileRef.current.value = "";
        }
    };

    const sendEquipmentData = async () => {
        try {
            let blob = null;

            if (inputFileRef.current?.files && inputFileRef.current.files.length > 0) {
                const file = inputFileRef.current.files[0];
                const responseVaecel = await fetch(`/api/upload?filename=${file.name}`, {
                    method: "POST",
                    body: file,
                });
                blob = (await responseVaecel.json()) as PutBlobResult;
            }

            await axios.post("/api/lists", {
                name: equipmentName,
                detail: equipmentDetail,
                image: blob?.url || "",
                tag_id: tags.find((tag) => tag.name === selectedTag)?.id
            });
            alert("機材登録が完了しました");
            setSelectedTag("");
            fetchEquipmentData();
            handleClickCancelButton(); // Reset inputs after successful registration
        } catch (err) {
            alert("機材登録ができません");
        }
    };

    // カテゴリデータを取得
    const fetchTags = async () => {
        setCategoriesLoading(true)
        try {
            const response = await fetch("/api/tags");
            const data = await response.json();
            setTags(data);
            setCategories(data);
        } catch (error) {
            console.error("Error fetching categories: ", error);
        } finally {
            setCategoriesLoading(false)
        }
    }

    // 機材データを取得する
    const fetchEquipmentData = async () => {
        const response = await fetch("/api/lists");
        const data: Equipment[] = await response.json();

        // 名前順（昇順）にソート
        const sortedData = data.sort((a, b) => a.name.localeCompare(b.name));
        setEquipments(sortedData);
        setIsLoading(false);
    };

    // 選択されたカテゴリーに基づいて機材をフィルタリング
    const filteredEquipments = selectedCategory === 'all'
        ? equipments
        : equipments.filter(equipment => equipment.tag_id === selectedCategory);

    const deleteEquipmentData = async (equipmentId: number) => {
        await fetch(`/api/lists/${equipmentId}`, {
            method: "DELETE",
        });
    };

    const handleEditEquipment = (equipmentId: number) => {
        setLoadingId(equipmentId);
        startTransition_2(() => {
            router.push(`/ems/edit/${equipmentId}`);
        });
    };

    const handleDeleteEquipment = async (equipmentId: number) => {
        const confirmed = window.confirm("本当に削除しますか？");
        if (confirmed) {
            await deleteEquipmentData(equipmentId);
            fetchEquipmentData();
        }
    };

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

        await axios.post("/api/tags", {
            name: addTagName,
            color: editTagColor
        });
        setAddTagName("");
        setEditTagColor("");
        fetchTags();
    }

    useEffect(() => {
        fetchTags();
        fetchEquipmentData();
    }, []);

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
                    {imageUrl && imageFile ? (
                        <img
                            src={imageUrl}
                            alt="アップロード画像"
                            style={{ objectFit: "cover", width: "100%", height: "100%" }}
                        />
                    ) : (
                        "+ 画像をアップロード"
                    )}
                    <InputImage ref={inputFileRef} id={IMAGE_ID} onChange={handleFileChange} />
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
                                            onClick={() => startTransition_3(() => {handleAddTag})}
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
                    value={equipmentName}
                    onChange={(e) => setEquipmentName(e.target.value)}
                />
                <textarea
                    className="rounded-md px-1"
                    placeholder="説明文を入力してください"
                    style={{ width: "100%", height: "100px", border: "1px solid black" }}
                    value={equipmentDetail}
                    onChange={(e) => setEquipmentDetail(e.target.value)}
                />
                <div className="flex gap-2">
                    {isPending_1 ? (
                        <Button isLoading colorScheme="blue">
                            登録
                        </Button>
                    ) : (
                        <Button
                            disabled={isPending_1}
                            onClick={() => startTransition_1(() => {sendEquipmentData().catch(console.error)})}
                            colorScheme="blue"
                        >
                            登録
                        </Button>
                    )}

                    {(imageFile || equipmentName || equipmentDetail) && (
                        <Button onClick={handleClickCancelButton} colorScheme="yellow">
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
                                        {isPending_2 && loadingId === equipment.id ? (
                                            <Button
                                                isLoading
                                                disabled={isPending_2 && loadingId === equipment.id}
                                                size={'md'}
                                                me={1}
                                                colorScheme="yellow"
                                            >
                                                編集
                                            </Button>
                                        ) : (
                                            <Button
                                                disabled={isPending_2 && loadingId === equipment.id}
                                                onClick={() => handleEditEquipment(equipment.id)}
                                                size={'md'}
                                                me={1}
                                                colorScheme="yellow"
                                            >
                                                編集
                                            </Button>
                                        )}
                                        <Button
                                            onClick={() => handleDeleteEquipment(equipment.id)}
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

export default App;
