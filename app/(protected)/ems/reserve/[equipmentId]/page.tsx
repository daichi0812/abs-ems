"use client"

import ReservationCalendar from "@/app/(protected)/_components/calendar/ReservationCalendar";
import Image from "next/image";
import Header from "@/app/(protected)/_components/Header";
import { useParams } from "next/navigation";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Center, Spinner } from "@chakra-ui/react";
import { useEquipmentPageData } from "./hooks/use-equipment-page-data";

const ProductDetails = () => {
    const user = useCurrentUser();

    const params = useParams();
    const { equipmentId } = params;

    const { equipmentName, equipmentDetail, equipmentImg, isFetching } = useEquipmentPageData({
        equipmentId,
    });

    return (
        <div className="bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))]
            from-sky-400 to-blue-800 pb-3">
            <Header />
            <div id="listBox" className='rounded-lg shadow-md mx-2 p-3 mb-3 bg-[#F5F5F7] md:w-[80%] md:mx-auto'>
                <p className="text-xl">{equipmentName}</p>
            </div>

            <div id="listBox" className='p-3 mx-2 shadow-md bg-[#F5F5F7] rounded-lg mb-3 flex-col flex justify-center items-center md:w-[80%] md:mx-auto'>
                {isFetching ? (
                    <Center my={10}>
                        <Spinner thickness="4px" speed="0.65s" emptyColor="gray.200" color="blue.500" size="xl" />
                    </Center>
                )
                    :
                    (
                        equipmentImg !== "" && (
                            <Image
                                width={280}
                                height={280}
                                src={equipmentImg}
                                alt={equipmentName}
                                className="w-[auto] h-[100%] max-h-[500px] rounded-lg my-0.5"
                            />
                        )
                    )}
            </div>

            <div className="rounded-md mb-3 md:w-[80%] md:mx-auto mx-2">
                <ReservationCalendar userId={user?.id} listId={Number(equipmentId)} />
            </div>

            <div id="listBox" className='rounded-lg shadow-md mx-2 p-3 mb-3 bg-[#F5F5F7] md:w-[80%] md:mx-auto'>
                <p className='text-xl mb-2'>機材の詳細</p>
                <p className="mr-1" dangerouslySetInnerHTML={{ __html: equipmentDetail?.replace(/\n/g, "<br>") }} />
            </div>

        </div>
    )
}
export default ProductDetails
