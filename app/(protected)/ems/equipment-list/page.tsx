"use client"
import React, { useEffect, useState, useTransition } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Header from '@/app/(protected)/_components/Header';
import { SlArrowRight } from "react-icons/sl";
import { useCurrentUser } from '@/hooks/use-current-user';
import axios from 'axios';
import { Box, Button, Center, Spinner } from '@chakra-ui/react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Equipment {
    id: number;
    name: string;
    detail: string;
    image: string;
    tag_id: string;
}

// テスト用のカテゴリーデータを作成
const categories = [
    {
        id: 'all',
        name: 'All',
        description: 'すべてのカテゴリを表示',
    },
    {
        id: 'usb',
        name: 'USB',
        description: 'USBデバイスやケーブルに関連するカテゴリ',
    },
    {
        id: 'sentury',
        name: 'Sentry',
        description: 'セントリー機器や監視装置に関連するカテゴリ',
    },
    {
        id: 'audio',
        name: 'Audio',
        description: 'オーディオ関連機器 (マイク、スピーカー)',
    },
    {
        id: 'video',
        name: 'Video',
        description: 'ビデオ機器 (カメラ、ディスプレイ)',
    },
    {
        id: 'network',
        name: 'Network',
        description: 'ネットワーク機器 (ルーター、スイッチ)',
    },
];

const EquipmentList = () => {
    const router = useRouter();
    const user = useCurrentUser();
    const [ip, setIP] = useState<string | null>(null);
    const [loading, startTransition] = useTransition();
    const [loadingId, setLoadingId] = useState<number | null>(null);

    const [equipments, setEquipments] = useState<Equipment[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    
    // 選択されたカテゴリーを管理する状態
    const [selectedCategory, setSelectedCategory] = useState<string>('all');

    // 取得したカテゴリーを保存する状態変数
    const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
    const [categoriesLoading, setCategoriesLoading] =useState<boolean>(true);

    /* ユーザの情報をバックエンドに送る */
    const getIP = async () => {
        try {
            const res = await axios.get('https://api.ipify.org?format=json');
            setIP(res.data.ip);
        } catch (err) {
            console.error("Error fetching IP:", err);
        }
    };

    // ユーザ情報をバックエンドに送信
    const pushUserData = async () => {
        try {
            const getUser = await axios.get(`https://logicode.fly.dev/users/${user?.id}`);
            if (getUser.data) {
                await axios.put(`https://logicode.fly.dev/users/${user?.id}`, {
                    name: user?.name,
                    ip: ip
                });
            } else {
                await axios.post('https://logicode.fly.dev/users', {
                    user_id: user?.id,
                    name: user?.name,
                    ip: ip
                });
            }
        } catch (err) {
            alert("ユーザー情報の処理中にエラーが発生しました。");
        }
    }

    // 各機材の予約ページに遷移
    const handleReserveSubmit = (id: number) => {
        setLoadingId(id);
        startTransition(() => {
            router.push('/ems/reserve/' + id);
        });
    };

    // 機材データを取得する
    const fetchEquipmentData = async () => {
        const response = await fetch('https://logicode.fly.dev/lists');
        const data: Equipment[] = await response.json();
        setEquipments(data);
        setIsLoading(false);
    };

    // カテゴリデータを取得
    const fetchCategories = async () => {
        setCategoriesLoading(true);
        try {
            const response = await fetch("https://logicode.fly.dev/tags");
            const data = await response.json();
            setCategories(data);
        } catch (error){
            console.error("Error fetching categories: ", error);
        } finally{
            setCategoriesLoading(false);
        }
    }

    useEffect(() => {
        getIP();
        pushUserData();
        fetchEquipmentData();
        fetchCategories();
    }, []);

    // 選択されたカテゴリーに基づいて機材をフィルタリング
    const filteredEquipments = selectedCategory === 'all'
        ? equipments
        : equipments.filter(equipment => equipment.tag_id === selectedCategory);

    return (
        <div className='bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))]
            from-sky-400 to-blue-800 min-h-full pb-3'>
            <Header />

            <div className="bg-[#F5F5F8] mx-2 rounded-lg mb-2 py-2 px-2 shadow-md md:w-[80%] md:mx-auto">
                <div className='flex justify-between items-center'>
                    <p className='text-xl'>予約</p>
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
                        { filteredEquipments.length > 0 ? (
                            filteredEquipments.map((equipment) => (
                                <div key={equipment.id} className="bg-slate-200 rounded-md p-3 mt-3 flex justify-between shadow">
                                    <div className="flex justify-center items-center">
                                        <p>{equipment.name}</p>
                                    </div>

                                    {loading && loadingId === equipment.id ? (
                                        <Button
                                            isLoading
                                            disabled={loading && loadingId === equipment.id}
                                            onClick={() => handleReserveSubmit(equipment.id)}
                                            colorScheme='blue'
                                        >
                                            選択
                                        </Button>
                                    ) : (
                                        <Button
                                            disabled={loading && loadingId === equipment.id}
                                            onClick={() => handleReserveSubmit(equipment.id)}
                                            colorScheme='blue'
                                        >
                                            選択
                                        </Button>
                                    )}
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
                )
                }
            </div>
        </div>
    );
};

export default EquipmentList;
