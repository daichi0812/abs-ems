"use client"

import ReservationCalendar from "@/app/(protected)/_components/calendar/ReservationCalendar";
import Image from "next/image";
import { useEffect, useState } from "react";
import Header from "@/app/(protected)/_components/Header";
import { useParams } from "next/navigation";
import { SlArrowDown, SlArrowUp } from "react-icons/sl";
import { useCurrentUser } from "@/hooks/use-current-user";

type Reserves = {
    id: number,
    user_id: string,
    start: Date,
    end: Date,
    list_id: number
}

const ProductDetails = () => {
    const [equipmentName, setEquipmentName] = useState('');
    const [equipmentDetail, setEquipmentDetail] = useState('');
    const [equipmentImg, setEquipmentImg] = useState('');
    const [reservesData, setReservesData] = useState('');

    const [isOpen, setIsOpen] = useState(false);

    const user = useCurrentUser();

    const handleToggleMenu = () => {
        setIsOpen(!isOpen);
    };

    const params = useParams();
    const { productId } = params;
    console.log(productId);

    // const { userId, setUserId } = useAppContext();

    const fetchEquipmentData = async () => {
        const equipmentData = await fetch(`https://logicode.fly.dev/lists/${params.productId}`).then(res => res.json());
        console.log(equipmentData);
        setEquipmentName(equipmentData.name);
        setEquipmentDetail(equipmentData.detail);
        setEquipmentImg(equipmentData.image)
        console.log(equipmentData.image)
    };

    const fetchReservesData = async () => {
        const reservesData = await fetch(`https://logicode.fly.dev/reserves`).then(res => res.json());
        const filteredData = reservesData.filter((item: Reserves) => item.list_id === Number(productId));
        setReservesData(filteredData);
    };

    useEffect(() => {
        fetchEquipmentData();
        fetchReservesData();
    }, []);

    // useEffect(() => {
    //     const storedUserId = getUserIdFromCookie(); // クッキーからユーザーIDを取得
    //     if (storedUserId) {
    //         setUserId(storedUserId); // コンテキストにユーザーIDを設定
    //     }
    // }, []);

    // useEffect(() => {
    //     if (userId) {
    //         setUserIdCookie(userId); // クッキーにユーザーIDを設定
    //     }
    // }, [userId]);

    return (
        <div className="bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))]
            from-sky-400 to-blue-800 pb-3">
            <Header />
            <div id="listBox" className='rounded-lg shadow-md mx-2 p-3 mb-3 bg-[#F5F5F7]'>
                <p className="text-xl">{equipmentName}</p>
            </div>

            <div id="listBox" className='p-3 mx-2 shadow-md bg-[#F5F5F7] rounded-lg mb-3 flex-col flex justify-center items-center'>
                {equipmentImg && (
                    <Image
                        width={280}
                        height={280}
                        src={equipmentImg}
                        alt={equipmentName}
                        className="w-[280px] h-[280px] rounded-lg my-0.5 mb-2"
                    />
                )}

                {!isOpen ? (
                    <div className="flex justify-center items-center cursor-pointer" onClick={handleToggleMenu}>
                        <p className="mr-1">この機材の詳細</p>
                        <SlArrowDown />
                    </div>
                ) : (
                    <>
                        <div className="flex justify-center items-center cursor-pointer" onClick={handleToggleMenu}>
                            <SlArrowUp />
                        </div>
                        <p className="break-words overflow-hidden text-ellipsis max-w-full">{equipmentDetail}</p>
                    </>
                )}
            </div>
            <div className="rounded-md">
                <ReservationCalendar userId={user?.id} listId={Number(productId)} />
            </div>

        </div>
    )
}
export default ProductDetails