"use client"
import React, { Fragment, useState } from 'react';
import { useCurrentUser } from '@/hooks/use-current-user';
import { Button, Center, Spinner } from '@chakra-ui/react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, Transition } from '@headlessui/react';
import { CheckIcon } from '@heroicons/react/20/solid';
import { useEquipments } from '../_hooks/use-equipments';
import { useCategories } from './hooks/use-categories';
import { useReserves } from './hooks/use-reserves';
import { useReservationNavigation } from './hooks/use-reservation-navigation';
import { useBulkReservation } from './hooks/use-bulk-reservation';

const EquipmentList = () => {
    const user = useCurrentUser();
    const { equipments, isLoading } = useEquipments();
    const { categories, isLoading: categoriesLoading } = useCategories();
    const { reserves, refetch: refetchReserves } = useReserves();
    const { loadingId, isPending, navigateToReserve } = useReservationNavigation();

    // 選択されたカテゴリーを管理する状態
    const [selectedCategory, setSelectedCategory] = useState<string>('all');

    const bulk = useBulkReservation({
        userId: user?.id,
        equipments,
        reserves,
        refetchReserves,
    });

    // 選択されたカテゴリーに基づいて機材をフィルタリング
    const filteredEquipments = selectedCategory === 'all'
        ? equipments
        : equipments.filter(equipment => equipment.tag_id === selectedCategory);

    return (
        <div className='bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))]
            from-sky-400 to-blue-800 min-h-full pb-3'>

            <div className="bg-[#F5F5F8] mx-2 rounded-lg mb-2 py-2 px-2 shadow-md md:w-[80%] md:mx-auto">
                <div className='flex justify-between items-center flex-wrap gap-2'>
                    <p className='text-xl ml-1'>予約</p>
                    <div className='flex items-center gap-2 ml-auto'>
                        {bulk.isBulkMode ? (
                            <div className='flex gap-2'>
                                <Button
                                    colorScheme='gray'
                                    size='sm'
                                    onClick={bulk.toggleBulkMode}
                                >
                                    キャンセル
                                </Button>
                                <Button
                                    colorScheme='orange'
                                    size='sm'
                                    onClick={bulk.openModal}
                                    isDisabled={bulk.selectedIds.size === 0}
                                >
                                    予約する ({bulk.selectedIds.size}件)
                                </Button>
                            </div>
                        ) : (
                            <Button
                                colorScheme='orange'
                                size='sm'
                                onClick={bulk.toggleBulkMode}
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
                                            {isPending && loadingId === equipment.id ? (
                                                <Button
                                                    isLoading
                                                    disabled={isPending && loadingId === equipment.id}
                                                    onClick={() => navigateToReserve(equipment.id)}
                                                    colorScheme='blue'
                                                >
                                                    選択
                                                </Button>
                                            ) : (
                                                <>
                                                    {bulk.isBulkMode ? (
                                                        <Button
                                                            size='sm'
                                                            colorScheme={bulk.selectedIds.has(equipment.id) ? 'green' : 'gray'}
                                                            onClick={() => bulk.toggleEquipment(equipment.id, !bulk.selectedIds.has(equipment.id))}
                                                        >
                                                            {bulk.selectedIds.has(equipment.id) ? '選択中' : '選択'}
                                                        </Button>
                                                    ) : (
                                                        <Button
                                                            disabled={isPending && loadingId === equipment.id}
                                                            onClick={() => navigateToReserve(equipment.id)}
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
            <Transition.Root show={bulk.showModal} as={Fragment}>
                <Dialog as="div" className="relative z-10" onClose={bulk.closeModal}>
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
                                                選択した{bulk.selectedIds.size}件の機材を借りる期間を選択してください
                                            </p>
                                            <div className="mt-2 text-left">
                                                <p className="text-xs text-gray-400 mb-2">選択中の機材:</p>
                                                <div className="max-h-24 overflow-y-auto bg-gray-50 rounded p-2">
                                                    {Array.from(bulk.selectedIds).map(id => {
                                                        const equipment = equipments.find(e => e.id === id);
                                                        return equipment ? (
                                                            <span key={id} className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded mr-1 mb-1">
                                                                {equipment.name}
                                                            </span>
                                                        ) : null;
                                                    })}
                                                </div>
                                            </div>
                                            <form onSubmit={bulk.submit}>
                                                <div className="mt-4">
                                                    <label className="block text-sm font-medium text-gray-700 text-left">開始日</label>
                                                    <input
                                                        type="date"
                                                        name="start"
                                                        value={bulk.bulkForm.start}
                                                        onChange={(e) => bulk.updateForm({ start: e.target.value })}
                                                        className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-violet-600"
                                                    />
                                                </div>
                                                <div className="mt-2">
                                                    <label className="block text-sm font-medium text-gray-700 text-left">終了日</label>
                                                    <input
                                                        type="date"
                                                        name="end"
                                                        value={bulk.bulkForm.end}
                                                        onChange={(e) => bulk.updateForm({ end: e.target.value })}
                                                        className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-violet-600"
                                                    />
                                                </div>
                                                <div className="mt-5 sm:mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3">
                                                    <button
                                                        type="submit"
                                                        disabled={bulk.isSubmitting || bulk.bulkForm.start === '' || bulk.bulkForm.end === ''}
                                                        className="inline-flex w-full justify-center rounded-md bg-violet-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-violet-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600 sm:col-start-2 disabled:opacity-25"
                                                    >
                                                        {bulk.isSubmitting ? '予約中...' : '予約確定'}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:col-start-1 sm:mt-0"
                                                        onClick={bulk.closeModal}
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
