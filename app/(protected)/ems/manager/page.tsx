"use client"
import { useEffect, useRef, useState, useTransition } from "react";
import React from "react";
import axios from 'axios'
import InputImage from "@/components/InputImage";
import Header from "@/app/(protected)/_components/Header";

import type { PutBlobResult } from '@vercel/blob';
import { useGetImageUrl } from "./useGetImageUrl";
import { useRouter } from "next/navigation";
import { Box, Button, Center, Spinner } from "@chakra-ui/react";


const IMAGE_ID = "imageId";
const FIELD_SIZE = 210;

interface Equipment {
    id: number;
    name: string;
    detail: string;
    image: string;
}

function App() {
    const inputFileRef = useRef<HTMLInputElement>(null);

    const [isPending_1, startTransition_1] = useTransition();
    const [isPending_2, startTransition_2] = useTransition();
    const [isLoading, setIsLoading] = useState<boolean>(true);

    const router = useRouter();

    const fileInputRef = useRef<HTMLInputElement>(null);
    const [imageFile, setImageFile] = useState<File | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.currentTarget?.files && e.currentTarget.files[0]) {
            const targetFile = e.currentTarget.files[0];
            setImageFile(targetFile);
        }
    };

    const handleClickCancelButton = () => {
        setImageFile(null);
        setEquipmentName('');
        setEquipmentDetail('');
        if (inputFileRef.current) {
            inputFileRef.current.value = "";
        }
    };

    const { imageUrl } = useGetImageUrl({ file: imageFile });

    const [equipmentName, setEquipmentName] = useState('');
    const [equipmentDetail, setEquipmentDetail] = useState('');

    const sendEquipmentData = async () => {
        try {

            let blob = null

            if (inputFileRef.current?.files && inputFileRef.current.files.length > 0) {
                const file = inputFileRef.current.files[0];
                const responseVaecel = await fetch(
                    `/api/upload?filename=${file.name}`,
                    {
                        method: 'POST',
                        body: file,
                    },
                );
                blob = await responseVaecel.json() as PutBlobResult;
            }

            const response = await axios.post('https://logicode.fly.dev/lists', {
                name: equipmentName,
                detail: equipmentDetail,
                image: blob?.url || ''
            });

            alert('機材登録が完了しました');
            fetchEquipmentData();
            setImageFile(null);
            setEquipmentName('');
            setEquipmentDetail('');
            if (inputFileRef.current) {
                inputFileRef.current.value = "";
            }

        } catch (err) {
            alert('機材登録ができません');
        }
    }

    const [equipments, setEquipments] = useState<Equipment[]>([]);

    const fetchEquipmentData = async () => {
        const response = await fetch('https://logicode.fly.dev/lists');
        const data: Equipment[] = await response.json();
        setEquipments(data);
        // console.log(data);
        setIsLoading(false);
    };

    const deleteEquipmentData = async (equipmentId: number) => {
        const response = await fetch(`https://logicode.fly.dev/lists/${equipmentId}`, {
            method: 'DELETE'
        });
    };

    useEffect(() => {
        fetchEquipmentData();
    }, []);

    const handleEditEquipment = async (equipmentId: number) => {
        router.push(`/ems/edit/${equipmentId}`);
    };

    const handleDeleteEquipment = async (equipmentId: number) => {
        const confirmed = window.confirm("本当に削除しますか？");
        if (confirmed) {
            deleteEquipmentData(equipmentId);
            alert("機材を削除しました");
            fetchEquipmentData();
        }
    };

    return (
        <>
            <Header />
            <div className="bg-[#F5F5F8] shadow-md rounded-md p-3 mt-3 mx-2">
                <p className='text-xl mb-1'>機材登録</p>
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
                    <InputImage
                        ref={inputFileRef}
                        id={IMAGE_ID}
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
                            登録
                        </Button>
                    ) : (
                        <Button
                            disabled={isPending_1}
                            onClick={() => startTransition_1(() => sendEquipmentData())}
                            colorScheme='blue'
                        >
                            登録
                        </Button>
                    )
                    }

                    {(imageFile || equipmentName || equipmentDetail) && (
                        <Button
                            onClick={handleClickCancelButton}
                            colorScheme='yellow'
                        >
                            キャンセル
                        </Button>
                    )}
                </div>
            </div>
            <div className="bg-[#F5F5F8] shadow-md rounded-md p-3 my-3 mx-2">
                <p className='text-xl mb-1'>編集・削除</p>

                {!isLoading && equipments ? (
                    <>
                        {equipments.map((equipment, index) => (
                            <div key={index} className="bg-slate-200 rounded-md p-3 mt-3 flex justify-between shadow">
                                <div className="flex justify-center items-center">
                                    <p>{equipment.name}</p>
                                </div>
                                <div>

                                    {isPending_2 ? (
                                        <Button
                                            isLoading
                                            me={1}
                                            colorScheme='yellow'
                                        >
                                            編集
                                        </Button>
                                    ) : (
                                        <Button
                                            disabled={isPending_2}
                                            onClick={() => startTransition_2(() => handleEditEquipment(equipment.id))}
                                            me={1}
                                            colorScheme='yellow'
                                        >
                                            編集
                                        </Button>
                                    )
                                    }
                                    <Button
                                        onClick={() => handleDeleteEquipment(equipment.id)}
                                        colorScheme='red'
                                    >
                                        削除
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </>
                ) : (
                    <Center my={2}>
                        <Spinner
                            thickness="4px"
                            speed="0.65s"
                            emptyColor="gray.200"
                            color="blue.500"
                            size="xl"
                        />
                    </Center>
                )
                }
            </div >
        </>
    );
}

export default App;