"use client"
import React, { use, useContext, useEffect, useRef, useState } from 'react'
import MypageCalendar from '../../_components/calendar/MypageCalendar';
import { useParams, useRouter } from 'next/navigation';
import axios from 'axios';
import Header from '@/app/(protected)/_components/Header';
import { Button } from '@/components/ui/button';
import { useCurrentUser } from '@/hooks/use-current-user';

type Reserves = {
    id: number,
    user_id: string,
    start: Date,
    end: Date,
    list_id: number
    isRenting: number // 貸し出し状態の管理変数（0:貸し出し前（予約中）,1:貸し出し中,2:返却済み,3:滞納）
}

type Lists = {
    id: number,
    name: string,
    detail: string,
    image: string,
    usable: boolean
}

type Response = {
    name: string
    ip: string
}

const Mypage = () => {
    const [manager, setManager] = useState(false);
    const [password, setPassword] = useState('');
    const [filteredData, setFilteredData] = useState<Reserves[]>([]); // ログイン中のユーザーの予約を保存
    const [idToNameMap, setIdToNameMap] = useState<{ [key: number]: string }>({});

    const router = useRouter();
    const user = useCurrentUser();

    // const [ip, setIP] = useState(null);

    // const [isCorrectIp, setIsCorrectIp] = useState(false);

    const params = useParams();
    // const { userId, userName, setUserId, setUserName } = useAppContext();

    const handlePasswordSubmit = () => {

        if (password === process.env.NEXT_PUBLIC_MANAGER_KEY) {
            setManager(true);
            router.push('/ems/manager'); // Redirects to manager page
        } else {
            alert('Incorrect password');
        }
    };

    const mypageFetchReservesData = async () => {
        const responseLists = await fetch('https://logicode.fly.dev/lists');
        const reservesListsData: Lists[] = await responseLists.json();

        // filteredDataに含まれるすべての機材idに対応する機材名を取得
        const idToNameMap: { [key: number]: string } = reservesListsData.reduce((map, item) => {
            map[item.id] = item.name; // idをキーにして機材名をマッピング
            return map;
        }, {} as { [key: number]: string });

        // Update state with the new idToNameMap
        setIdToNameMap(idToNameMap);

        const response = await fetch('https://logicode.fly.dev/reserves');
        const reservesData: Reserves[] = await response.json();
        setFilteredData(reservesData.filter((item: Reserves) => item.user_id == user?.id));
    }

    const fetchEquipmentState = async (listId: number) => {
        const response = await fetch(`https://logicode.fly.dev/lists/${listId}`);
        const equipmentData: Lists = await response.json();

        return equipmentData.usable
    }

    useEffect(() => {
        mypageFetchReservesData();
    },[])


    /* プロジェクト統一するなら必要ないかも */

    // const fetchUserName = async () => {
    //     try {
    //         const response = await fetch(`https://logicode.fly.dev/users/${user?.id}`);
    //         // console.log(response)
    //         const data: Response = await response.json();
    //         // setUserName(data.name);
    //         // console.log("Data" + data.ip);
    //         // console.log("get" + ip);
    //         if (data.ip != ip && ip != null) {
    //             // console.log("data.ip != ip");
    //             router.push("/");
    //             return;
    //         }
    //         if (ip != null) {
    //             setIsCorrectIp(true);
    //         }
    //         // console.log("data.ip == ip");
    //     } catch (error) {
    //         // console.error("ユーザー名が取得できません。", error);
    //     }
    // }

    // // ip取得関数
    // const getIP = async () => {
    //     try {
    //         const res = await axios.get('https://api.ipify.org?format=json');
    //         setIP(res.data.ip);
    //         // console.log("GetIP" + res.data.ip);
    //     } catch (err) {
    //         // console.error("Error fetching IP:", err);
    //     }
    // };


    // useEffect(() => {
    //     // setUserId(params.userId.toString());
    // }, []);

    // useEffect(() => {
    //     if (ip == null) {
    //         getIP();
    //     }

    //     // console.log("UseEffect" + ip);
    //     if (user?.id) {
    //         mypageFetchReservesData();
    //         fetchUserName();
    //     }
    // }, [user?.id, ip]);

    const handleBorrow = async (id: number, EquipId: number) => {
        const equipState = await fetchEquipmentState(EquipId);

        if (!equipState) {
            window.alert('機材が他のメンバーから返却されていないため、借りることができません。');
            return;
        }

        const response1 = await axios.post(`https://logicode.fly.dev/reserves/${id}/borrow`);
        const response2 = await axios.patch(`https://logicode.fly.dev/lists/${EquipId}`, {
            usable: false
        });
        if (response1.status === 200 && response2.status === 200) {
            window.alert('貸し出し手続きが完了しました。');
            mypageFetchReservesData()
        } else {
            window.alert('貸し出しに失敗しました。');
        }
    }

    const handleReturn = async (id: number, EquipId: number) => {
        const response1 = await axios.post(`https://logicode.fly.dev/reserves/${id}/return`);
        const response2 = await axios.patch(`https://logicode.fly.dev/lists/${EquipId}`, {
            usable: true
        });
        if (response1.status === 200 && response2.status === 200) {
            window.alert('返却手続きが完了しました。');
            mypageFetchReservesData()
        } else {
            window.alert('返却手続きに失敗しました。');
        }
    }

    return (
        <>
            <div className=''>
                <Header />

                <div className="mb-3 shadow-md">
                    <MypageCalendar idToNameMap={idToNameMap} filteredData={filteredData} userId={user?.id} mypageFetchReservesData={mypageFetchReservesData} />
                </div>

                <div className='bg-[#F5F5F8] shadow-md rounded-md p-3 mb-3 mx-2'>
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
                                            <Button
                                                onClick={() => handleBorrow(reserve.id, reserve.list_id)}
                                                className='px-4 py-2 ms-2'
                                                style={{ backgroundColor: '#00bfff', color: 'white', fontSize: '16px', borderRadius: '5px', cursor: 'pointer' }}>
                                                借りる
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </>
                    ) : (
                        <p>予約済の機材はありません。</p>
                    )}
                </div>
                <div className='bg-[#F5F5F8] shadow-md rounded-md p-3 mb-3 mx-2'>
                    {filteredData.filter(reserve => reserve.isRenting === 2 || reserve.isRenting === 3).length > 0 ? (
                        <>
                            <p>貸し出し中</p>
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
                                        <Button
                                            onClick={() => handleReturn(reserve.id, reserve.list_id)}
                                            className='px-4 py-2 ms-2'
                                            style={{ backgroundColor: '#00bfff', color: 'white', fontSize: '16px', borderRadius: '5px', cursor: 'pointer' }}>
                                            返却
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </>
                    ) : (
                        <p>貸し出し中の機材はありません。</p>
                    )}
                </div>
            </div>
        </>
    )
}

export default Mypage