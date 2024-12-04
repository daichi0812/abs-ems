"use client"
import React, { useEffect, useState, useTransition } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Header from '@/app/(protected)/_components/Header';
import { SlArrowRight } from "react-icons/sl";
import { useCurrentUser } from '@/hooks/use-current-user';
import axios from 'axios';
import { Box, Button, Center, Spinner } from '@chakra-ui/react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';

interface Equipment {
    id: number;
    name: string;
    detail: string;
    image: string;
    tag_id: string;
}

const EquipmentList = () => {
    const router = useRouter();
    const user = useCurrentUser();
    const [ip, setIP] = useState<string | null>(null);
    const [loading, startTransition] = useTransition();
    const [loadingId, setLoadingId] = useState<number | null>(null);
    const [equipments, setEquipments] = useState<Equipment[]>([]);
    const [isBulkReservation, setIsBulkReservation] = useState(false); // まとめて予約モードの状態
    const [selectedEquipments, setSelectedEquipments] = useState<Set<number>>(new Set()); // 選択された機材ID
    const [isLoading, setIsLoading] = useState<boolean>(true);

    // 選択されたカテゴリーを管理する状態
    const [selectedCategory, setSelectedCategory] = useState<string>('all');

    // 取得したカテゴリーを保存する状態変数
    const [categories, setCategories] = useState<{ id: string; name: string; color: string }[]>([]);
    const [categoriesLoading, setCategoriesLoading] = useState<boolean>(true);

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
        const response = await fetch('/api/lists');
        const data: Equipment[] = await response.json();

        // 名前順（昇順）にソート
        const sortedData = data.sort((a, b) => a.name.localeCompare(b.name));

        setEquipments(sortedData);
        setIsLoading(false);
    };

    // カテゴリデータを取得
    const fetchCategories = async () => {
        setCategoriesLoading(true);
        try {
            const response = await fetch("https://logicode.fly.dev/tags");
            const data = await response.json();
            setCategories(data);
        } catch (error) {
            console.error("Error fetching categories: ", error);
        } finally {
            setCategoriesLoading(false);
        }
    }

    // 選択されたカテゴリーに基づいて機材をフィルタリング
    const filteredEquipments = selectedCategory === 'all'
        ? equipments
        : equipments.filter(equipment => equipment.tag_id === selectedCategory);

    const toggleBulkReservation = () => {
        setIsBulkReservation(!isBulkReservation);
        setSelectedEquipments(new Set()); // 初期化
    };

    const handleCheckboxChange = (equipmentId: number, checked: boolean) => {
        setSelectedEquipments((prevSelected) => {
            const newSelected = new Set(prevSelected);
            if (checked) {
                newSelected.add(equipmentId);
            } else {
                newSelected.delete(equipmentId);
            }
            return newSelected;
        });
    };

    const handleBulkReserve = () => {
        if (selectedEquipments.size === 0) {
            alert("少なくとも1つの機材を選択してください。");
            return;
        }
        const selectedIds = Array.from(selectedEquipments);
        // 選択された機材IDを次のコンポーネントに渡すロジック
        router.push(
            `/ems/bulk-reserve?equipmentIds=${encodeURIComponent(JSON.stringify(selectedIds))}`
        );
    };

    useEffect(() => {
        getIP();
        pushUserData();
        fetchEquipmentData();
        fetchCategories();
    }, []);

    return (
        <div className='bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))]
            from-sky-400 to-blue-800 min-h-full pb-3'>
            <Header />

            <div className="bg-[#F5F5F8] mx-2 rounded-lg mb-2 py-2 px-2 shadow-md md:w-[80%] md:mx-auto">
                <div className='flex justify-between items-center'>
                    <p className='text-xl'>予約</p>
                    {isBulkReservation ? (
                        <Button
                            colorScheme='orange'
                            className='ml-auto mr-2 opacity-90 md:text-xs'
                            onClick={handleBulkReserve}
                        >
                            予約する(未実装)
                        </Button>
                    ) : (
                        <Button
                            colorScheme='orange'
                            className='ml-auto mr-2 opacity-90 md:text-xs'
                            onClick={toggleBulkReservation}
                        >
                            まとめて予約(未実装)
                        </Button>
                    )}
                    <Select
                        value={selectedCategory}
                        onValueChange={(value) => setSelectedCategory(value)}
                        disabled={categoriesLoading}    // カテゴリー取得中はSelectを無効化
                    >
                        <SelectTrigger className="w-[100px] md:w-[180px] shadow-none border-black text-black bg-slate-50 hover:bg-slate-150">
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
                {
                    !isLoading && equipments ? (
                        <>
                            {filteredEquipments.length > 0 ? (
                                filteredEquipments.map((equipment) => (
                                    <div key={equipment.id} className="bg-slate-200 rounded-md p-3 mt-3 flex justify-between shadow">
                                        <div className="flex justify-center items-center">
                                            <p>{equipment.name}</p>
                                        </div>

                                        <div className="flex items-center ml-auto">
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
                                                <>
                                                    {isBulkReservation ? (
                                                        <Input
                                                            type="checkbox"
                                                            onChange={(e) => handleCheckboxChange(equipment.id, e.target.checked)}
                                                            className='mr-4 text-3xl'
                                                        />
                                                    ) : (
                                                        <Button
                                                            disabled={loading && loadingId === equipment.id}
                                                            onClick={() => handleReserveSubmit(equipment.id)}
                                                            colorScheme='blue'
                                                        >
                                                            選択
                                                        </Button>
                                                    )}
                                                </>
                                            )}
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
                    )
                }
            </div >
        </div >
    );
};

export default EquipmentList;
