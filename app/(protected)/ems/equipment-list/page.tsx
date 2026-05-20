"use client"
import React, { Fragment, useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/app/(protected)/_components/Header';
import { useCurrentUser } from '@/hooks/use-current-user';
import axios from 'axios';
import { Button, Center, Spinner } from '@chakra-ui/react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, Transition } from '@headlessui/react';
import { CheckIcon } from '@heroicons/react/20/solid';
import moment from 'moment-timezone';
import type { Equipment, Reserve } from "@/types/domain";

interface BulkReservation {
    start: string;
    end: string;
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

    // 一括予約モーダル関連
    const [showBulkModal, setShowBulkModal] = useState(false);
    const [bulkReservation, setBulkReservation] = useState<BulkReservation>({ start: '', end: '' });
    const [allReserves, setAllReserves] = useState<Reserve[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    /* ユーザの情報をバックエンドに送る */
    // const getIP = async () => {
    //     try {
    //         const res = await axios.get('https://api.ipify.org?format=json');
    //         setIP(res.data.ip);
    //     } catch (err) {
    //         console.error("Error fetching IP:", err);
    //     }
    // };

    // ユーザ情報をバックエンドに送信
    // const pushUserData = async () => {
    //     try {
    //         const getUser = await axios.get(`https://logicode.fly.dev/users/${user?.id}`);
    //         if (getUser.data) {
    //             await axios.put(`https://logicode.fly.dev/users/${user?.id}`, {
    //                 name: user?.name,
    //                 ip: ip
    //             });
    //         } else {
    //             await axios.post('https://logicode.fly.dev/users', {
    //                 user_id: user?.id,
    //                 name: user?.name,
    //                 ip: ip
    //             });
    //         }
    //     } catch (err) {
    //         alert("ユーザー情報の処理中にエラーが発生しました。");
    //     }
    // }

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
            const response = await fetch("/api/tags");
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

    // 全予約データを取得
    const fetchAllReserves = async () => {
        try {
            const response = await fetch('/api/reserves');
            const data: Reserve[] = await response.json();
            setAllReserves(data);
        } catch (error) {
            console.error('Error fetching reserves:', error);
        }
    };

    // 特定の機材の予約と新しい期間の重複をチェック
    const isOverlapping = (listId: number, start: string, end: string): boolean => {
        const newStart = new Date(start).getTime();
        const newEnd = new Date(end).getTime();

        const equipmentReserves = allReserves.filter(r => r.list_id === listId);

        return equipmentReserves.some(reserve => {
            const existingStart = new Date(reserve.start).getTime();
            const existingEnd = new Date(reserve.end).getTime();

            return (
                (newStart >= existingStart && newStart <= existingEnd) ||
                (newEnd >= existingStart && newEnd <= existingEnd) ||
                (newStart <= existingStart && newEnd >= existingEnd)
            );
        });
    };

    // 全ての選択された機材について重複をチェック
    const checkAllOverlaps = (start: string, end: string): { hasOverlap: boolean; conflictingEquipments: string[] } => {
        const conflictingEquipments: string[] = [];

        selectedEquipments.forEach(equipmentId => {
            if (isOverlapping(equipmentId, start, end)) {
                const equipment = equipments.find(e => e.id === equipmentId);
                if (equipment) {
                    conflictingEquipments.push(equipment.name);
                }
            }
        });

        return {
            hasOverlap: conflictingEquipments.length > 0,
            conflictingEquipments
        };
    };

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

    // まとめて予約モーダルを開く
    const handleOpenBulkModal = async () => {
        if (selectedEquipments.size === 0) {
            alert("少なくとも1つの機材を選択してください。");
            return;
        }
        // 最新の予約データを取得
        await fetchAllReserves();
        setShowBulkModal(true);
    };

    // 一括予約のサブミット処理
    const handleBulkSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        if (bulkReservation.start === '' || bulkReservation.end === '') {
            alert('開始日と終了日を選択してください。');
            return;
        }

        // 日付のバリデーション
        const today = moment().tz('Asia/Tokyo').format('YYYY-MM-DD');
        const start = moment(bulkReservation.start).tz('Asia/Tokyo').format('YYYY-MM-DD');
        const end = moment(bulkReservation.end).tz('Asia/Tokyo').format('YYYY-MM-DD');

        if (start < today || end < today || end < start) {
            alert('無効な予約日です。開始日は今日以降、終了日は開始日以降を選択してください。');
            return;
        }

        // 全ての機材について重複チェック
        const { hasOverlap, conflictingEquipments } = checkAllOverlaps(bulkReservation.start, bulkReservation.end);

        if (hasOverlap) {
            alert(`以下の機材は選択した期間に既に予約が入っています：\n${conflictingEquipments.join('\n')}\n\n別の期間を選択してください。`);
            return;
        }

        setIsSubmitting(true);

        try {
            // 選択された全ての機材に対して予約を作成
            const selectedIds = Array.from(selectedEquipments);

            // 日付文字列（'YYYY-MM-DD'形式）をそのままAPIに送信
            // APIで日本時間の日付として正しく処理される
            const promises = selectedIds.map(listId =>
                axios.post('/api/reserves', {
                    user_id: user?.id,
                    start: bulkReservation.start,
                    end: bulkReservation.end,
                    list_id: listId
                })
            );

            await Promise.all(promises);

            alert(`${selectedIds.length}件の予約が正常に完了しました。`);

            // 状態をリセット
            setShowBulkModal(false);
            setBulkReservation({ start: '', end: '' });
            setSelectedEquipments(new Set());
            setIsBulkReservation(false);
        } catch (error) {
            console.error('Error creating bulk reservations:', error);
            alert('予約の作成中にエラーが発生しました。');
        } finally {
            setIsSubmitting(false);
        }
    };

    // モーダルを閉じる
    const handleCloseBulkModal = () => {
        setShowBulkModal(false);
        setBulkReservation({ start: '', end: '' });
    };

    useEffect(() => {
        fetchEquipmentData();
        fetchCategories();
        fetchAllReserves();
    }, []);

    return (
        <div className='bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))]
            from-sky-400 to-blue-800 min-h-full pb-3'>
            <Header />

            <div className="bg-[#F5F5F8] mx-2 rounded-lg mb-2 py-2 px-2 shadow-md md:w-[80%] md:mx-auto">
                <div className='flex justify-between items-center flex-wrap gap-2'>
                    <p className='text-xl ml-1'>予約</p>
                    <div className='flex items-center gap-2 ml-auto'>
                        {isBulkReservation ? (
                            <div className='flex gap-2'>
                                <Button
                                    colorScheme='gray'
                                    size='sm'
                                    onClick={toggleBulkReservation}
                                >
                                    キャンセル
                                </Button>
                                <Button
                                    colorScheme='orange'
                                    size='sm'
                                    onClick={handleOpenBulkModal}
                                    isDisabled={selectedEquipments.size === 0}
                                >
                                    予約する ({selectedEquipments.size}件)
                                </Button>
                            </div>
                        ) : (
                            <Button
                                colorScheme='orange'
                                size='sm'
                                onClick={toggleBulkReservation}
                            >
                                まとめて予約
                            </Button>
                        )}
                        <Select
                            value={selectedCategory}
                            onValueChange={(value) => setSelectedCategory(value)}
                            disabled={categoriesLoading}
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
                                                        <Button
                                                            size='sm'
                                                            colorScheme={selectedEquipments.has(equipment.id) ? 'green' : 'gray'}
                                                            onClick={() => handleCheckboxChange(equipment.id, !selectedEquipments.has(equipment.id))}
                                                        >
                                                            {selectedEquipments.has(equipment.id) ? '選択中' : '選択'}
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

            {/* 一括予約モーダル */}
            <Transition.Root show={showBulkModal} as={Fragment}>
                <Dialog as="div" className="relative z-10" onClose={handleCloseBulkModal}>
                    <Transition.Child
                        as={Fragment}
                        enter="ease-out duration-300"
                        enterFrom="opacity-0"
                        enterTo="opacity-100"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
                    </Transition.Child>

                    <div className="fixed inset-0 z-10 overflow-y-auto">
                        <div className="flex min-h-full justify-center p-4 text-center items-center sm:p-0">
                            <Transition.Child
                                as={Fragment}
                                enter="ease-out duration-300"
                                enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                                enterTo="opacity-100 translate-y-0 sm:scale-100"
                                leave="ease-in duration-200"
                                leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                                leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                            >
                                <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
                                    <div>
                                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                                            <CheckIcon className="h-6 w-6 text-green-600" aria-hidden="true" />
                                        </div>
                                        <div className="mt-3 text-center sm:mt-5">
                                            <Dialog.Title as="h3" className="text-base font-semibold leading-6 text-gray-900">
                                                まとめて予約
                                            </Dialog.Title>
                                            <p className="mt-2 text-sm text-gray-500">
                                                選択した{selectedEquipments.size}件の機材を借りる期間を選択してください
                                            </p>
                                            <div className="mt-2 text-left">
                                                <p className="text-xs text-gray-400 mb-2">選択中の機材:</p>
                                                <div className="max-h-24 overflow-y-auto bg-gray-50 rounded p-2">
                                                    {Array.from(selectedEquipments).map(id => {
                                                        const equipment = equipments.find(e => e.id === id);
                                                        return equipment ? (
                                                            <span key={id} className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded mr-1 mb-1">
                                                                {equipment.name}
                                                            </span>
                                                        ) : null;
                                                    })}
                                                </div>
                                            </div>
                                            <form onSubmit={handleBulkSubmit}>
                                                <div className="mt-4">
                                                    <label className="block text-sm font-medium text-gray-700 text-left">開始日</label>
                                                    <input
                                                        type="date"
                                                        name="start"
                                                        value={bulkReservation.start}
                                                        onChange={(e) => setBulkReservation({ ...bulkReservation, start: e.target.value })}
                                                        className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-violet-600"
                                                    />
                                                </div>
                                                <div className="mt-2">
                                                    <label className="block text-sm font-medium text-gray-700 text-left">終了日</label>
                                                    <input
                                                        type="date"
                                                        name="end"
                                                        value={bulkReservation.end}
                                                        onChange={(e) => setBulkReservation({ ...bulkReservation, end: e.target.value })}
                                                        className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-violet-600"
                                                    />
                                                </div>
                                                <div className="mt-5 sm:mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3">
                                                    <button
                                                        type="submit"
                                                        disabled={isSubmitting || bulkReservation.start === '' || bulkReservation.end === ''}
                                                        className="inline-flex w-full justify-center rounded-md bg-violet-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-violet-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600 sm:col-start-2 disabled:opacity-25"
                                                    >
                                                        {isSubmitting ? '予約中...' : '予約確定'}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:col-start-1 sm:mt-0"
                                                        onClick={handleCloseBulkModal}
                                                    >
                                                        戻る
                                                    </button>
                                                </div>
                                            </form>
                                        </div>
                                    </div>
                                </Dialog.Panel>
                            </Transition.Child>
                        </div>
                    </div>
                </Dialog>
            </Transition.Root>
        </div >
    );
};

export default EquipmentList;
