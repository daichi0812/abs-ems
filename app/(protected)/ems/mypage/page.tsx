"use client"
import React, { useState, useTransition } from 'react';
import MypageCalendar from '../../_components/calendar/MypageCalendar';
import { useRouter } from 'next/navigation';
import Header from '@/app/(protected)/_components/Header';
import { useCurrentUser } from '@/hooks/use-current-user';
import { Button } from '@chakra-ui/react';
import { useMyReserves } from './hooks/use-my-reserves';

const Mypage = () => {
    const [manager, setManager] = useState(false);
    const [password, setPassword] = useState('');

    const router = useRouter();
    const user = useCurrentUser();

    const { filteredData, idToNameMap, refetch: mypageFetchReservesData } = useMyReserves({
        userId: user?.id,
    });

    const [isPending_1, startTransition_1] = useTransition();
    const [isPending_2, startTransition_2] = useTransition();

    const [loadingId_1, setLoadingId_1] = useState<number | null>(null);
    const [loadingId_2, setLoadingId_2] = useState<number | null>(null);

    const handlePasswordSubmit = () => {
        if (password === process.env.NEXT_PUBLIC_MANAGER_KEY) {
            setManager(true);
            router.push('/ems/manager'); // Redirects to manager page
        } else {
            alert('Incorrect password');
        }
    };

    const handleBorrow = async (id: number, EquipId: number) => {
        setLoadingId_1(id);

        startTransition_1(() => {
            (async () => {
                // const equipState = await fetchEquipmentState(EquipId);
                // const response1 = await axios.post(`https://logicode.fly.dev/reserves/${id}/borrow`);
                // const response2 = await axios.patch(`/api/lists/${EquipId}`, {
                //     usable: false,
                // });

                // if (response1.status === 200 && response2.status === 200) {
                //     window.alert('貸し出し手続きが完了しました。');
                //     mypageFetchReservesData();
                // } else {
                //     window.alert('貸し出しに失敗しました。');
                // }
            })();
        });
    }

    const handleReturn = async (id: number, EquipId: number) => {
        setLoadingId_2(id);

        startTransition_2(() => {
            (async () => {
                // const response1 = await axios.post(`https://logicode.fly.dev/reserves/${id}/return`);
                // const response2 = await axios.patch(`/api/lists/${EquipId}`, {
                //     usable: true
                // });

                // if (response1.status === 200 && response2.status === 200) {
                //     window.alert('返却手続きが完了しました。');
                //     mypageFetchReservesData();
                // } else {
                //     window.alert('返却手続きに失敗しました。');
                // }
            })();
        });
    }

    return (
        <>
            <div className='bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-sky-400 to-blue-800 min-h-full pb-3'>
                <Header />
                <div className=" md:w-[80%] mx-2 md:mx-auto mb-3 shadow-md">
                    <MypageCalendar idToNameMap={idToNameMap} filteredData={filteredData} userId={user?.id} mypageFetchReservesData={mypageFetchReservesData} />
                </div>

                <div className='bg-[#F5F5F8] shadow-md rounded-lg p-3 mb-3 mx-2 md:w-[80%] md:mx-auto'>
                    {filteredData.filter(reserve => reserve.isRenting === 0 || reserve.isRenting === 1).length > 0 ? (
                        <>
                            <p>予約済</p>
                            {filteredData.filter(reserve => reserve.isRenting === 0 || reserve.isRenting === 1).map(reserve => (
                                <div key={reserve.id} className="bg-slate-200 rounded-md p-3 py-2 mt-3 flex justify-between shadow">
                                    <div className="">
                                        <p className='text-xl'>{idToNameMap[reserve.list_id]}</p>
                                        <p>{new Date(reserve.start).toLocaleDateString('ja-JP', { month: '2-digit', day: '2-digit' })}~{new Date(reserve.end).toLocaleDateString('ja-JP', { month: '2-digit', day: '2-digit' })}</p>
                                    </div>
                                    {reserve.isRenting === 1 && (
                                        <div className="flex justify-center items-center">
                                            {isPending_1 && loadingId_1 === reserve.id ? (
                                                <Button isLoading colorScheme='blue'>借りる</Button>
                                            ) : (
                                                <Button disabled={isPending_1 && loadingId_1 === reserve.id} onClick={() => handleBorrow(reserve.id, reserve.list_id)} colorScheme='blue'>
                                                    借りる
                                                </Button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </>
                    ) : (
                        <p>予約済の機材はありません</p>
                    )}
                </div>

                <div className='bg-[#F5F5F8] shadow-md rounded-lg p-3 mx-2 md:w-[80%] md:mx-auto'>
                    {filteredData.filter(reserve => reserve.isRenting === 2 || reserve.isRenting === 3).length > 0 ? (
                        <>
                            <p>貸出中</p>
                            {filteredData.filter(reserve => reserve.isRenting === 2 || reserve.isRenting === 3).map(reserve => (
                                <div key={reserve.id} className="bg-slate-200 rounded-md p-3 py-2 mt-3 flex justify-between shadow">
                                    <div className="">
                                        <p className='text-xl'>{idToNameMap[reserve.list_id]}</p>
                                        <p>返却期限：{new Date(reserve.end).toLocaleDateString('ja-JP', { month: '2-digit', day: '2-digit' })}</p>
                                        {reserve.isRenting === 3 && (
                                            <p>返却期限を過ぎています！</p>
                                        )}
                                    </div>
                                    <div className="flex justify-center items-center">
                                        {isPending_2 && loadingId_2 == reserve.id ? (
                                            <Button isLoading colorScheme='blue'>
                                                返却
                                            </Button>
                                        ) : (
                                            <Button disabled={isPending_2 && loadingId_2 === reserve.id} onClick={() => handleReturn(reserve.id, reserve.list_id)} colorScheme='blue'>
                                                返却
                                            </Button>
                                        )
                                        }
                                    </div>
                                </div>
                            ))}
                        </>
                    ) : (
                        <p>貸出中の機材はありません</p>
                    )}
                </div>
            </div>
        </>
    );
}

export default Mypage;
