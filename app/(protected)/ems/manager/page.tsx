"use client"
import { useEffect, useRef, useState, useTransition } from "react";
import React from "react";
import axios from 'axios'
import InputImage from "@/components/InputImage";
import Header from "@/app/(protected)/_components/Header";

import type { PutBlobResult } from '@vercel/blob';
import { useGetImageUrl } from "./useGetImageUrl";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";


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

    const [isPending, startTransition] = useTransition();

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
            <div className="bg-[#F5F5F8] shadow rounded-md p-3 mt-3 mx-2">
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
                    <Button
                        disabled={isPending}
                        onClick={() => startTransition(() => sendEquipmentData())}
                        style={{
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                            backgroundColor: '#00bfff',
                            color: 'white',
                            fontSize: '16px',
                            borderRadius: '5px',
                            cursor: 'pointer',
                            width: '80px',
                            height: '40px'
                        }}
                    >
                        {isPending ? "ロード中" : "登録"}
                    </Button>
                    {(imageFile || equipmentName || equipmentDetail) && (
                        <Button
                            onClick={handleClickCancelButton}
                            style={{ backgroundColor: '#f5b942', color: 'white', fontSize: '16px', borderRadius: '5px', cursor: 'pointer', width: '95px', height: '40px' }}>
                            キャンセル
                        </Button>
                    )}
                </div>
            </div>
            <div className="bg-[#F5F5F8] shadow rounded-md p-3 my-3 mx-2">
                <p className='text-xl mb-1'>編集・削除</p>
                {equipments.map((equipment, index) => (
                    <div key={index} className="bg-slate-200 rounded-md p-3 mt-3 flex justify-between shadow">
                        <div className="flex justify-center items-center">
                            <p>{equipment.name}</p>
                        </div>
                        <div>
                            <Button
                                onClick={() => handleEditEquipment(equipment.id)}
                                className='px-4 mr-2 py-2 ms-2'
                                style={{ backgroundColor: '#4499EE', color: 'white', fontSize: '16px', borderRadius: '5px', cursor: 'pointer' }}>
                                編集
                            </Button>
                            <Button
                                onClick={() => handleDeleteEquipment(equipment.id)}
                                className='px-4 py-2 ms-2'
                                style={{ backgroundColor: '#F33F23', color: 'white', fontSize: '16px', borderRadius: '5px', cursor: 'pointer' }}>
                                削除
                            </Button>
                        </div>
                    </div>
                ))}
            </div>
        </>
    );
}

export default App;