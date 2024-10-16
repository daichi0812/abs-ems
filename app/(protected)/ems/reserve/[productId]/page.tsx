"use client"

import ReservationCalendar from "@/app/(protected)/_components/calendar/ReservationCalendar";
import Image from "next/image";
import { useEffect, useState } from "react";
import Header from "@/app/(protected)/_components/Header";
import { useParams } from "next/navigation";
import { SlArrowDown, SlArrowUp } from "react-icons/sl";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Center, Spinner } from "@chakra-ui/react";

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
    const [equipmentImg, setEquipmentImg] = useState('nai');
    const [reservesData, setReservesData] = useState('');

    const user = useCurrentUser();

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

    return (
        <div className="bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))]
            from-sky-400 to-blue-800 pb-3">
            <Header />
            <div id="listBox" className='rounded-lg shadow-md mx-2 p-3 mb-3 bg-[#F5F5F7]'>
                <p className="text-xl">{equipmentName}</p>
            </div>

            <div id="listBox" className='p-3 mx-2 shadow-md bg-[#F5F5F7] rounded-lg mb-3 flex-col flex justify-center items-center'>
                {equipmentImg === "nai"  ? (
                    <Image
                        width={280}
                        height={280}
                        src={equipmentImg}
                        alt={equipmentName}
                        className="w-[100%] h-[100%] rounded-lg my-0.5"
                    />
                )
                    :
                    (
                        <Center my={10}>
                            <Spinner thickness="4px" speed="0.65s" emptyColor="gray.200" color="blue.500" size="xl" />
                        </Center>
                    )}
            </div>

            <div className="rounded-md mb-3">
                <ReservationCalendar userId={user?.id} listId={Number(productId)} />
            </div>

            <div id="listBox" className='rounded-lg shadow-md mx-2 p-3 mb-3 bg-[#F5F5F7]'>
                <p className='text-xl mb-2'>機材の詳細</p>
                <p className="mr-1">{equipmentDetail}</p>
            </div>

        </div>
    )
}
export default ProductDetails