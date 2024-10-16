"use client"
import React, { useEffect, useState, useTransition } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Header from '@/app/(protected)/_components/Header';
import { SlArrowRight } from "react-icons/sl";
import { useCurrentUser } from '@/hooks/use-current-user';
import axios from 'axios';
import { Box, Button, Center, Spinner } from '@chakra-ui/react';

interface Equipment {
    id: number;
    name: string;
    detail: string;
    image: string;
}

const EquipmentList = () => {
    const router = useRouter();
    const user = useCurrentUser();
    const [ip, setIP] = useState<string | null>(null);
    const [loading, startTransition] = useTransition();
    const [loadingId, setLoadingId] = useState<number | null>(null);

    const handlePasswordSubmit = (id: number) => {
        setLoadingId(id);
        startTransition(() => {
            router.push('/ems/reserve/' + id);
        });
    };

    const [equipments, setEquipments] = useState<Equipment[]>([]);

    const [isLoading, setIsLoading] = useState<boolean>(true);

    /* ユーザの情報をバックエンドに送る */
    const getIP = async () => {
        try {
            const res = await axios.get('https://api.ipify.org?format=json');
            setIP(res.data.ip);
        } catch (err) {
            console.error("Error fetching IP:", err);
        }
    };

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

    const fetchEquipmentData = async () => {
        const response = await fetch('https://logicode.fly.dev/lists');
        const data: Equipment[] = await response.json();
        setEquipments(data);
        setIsLoading(false);
    };

    useEffect(() => {
        getIP();
        pushUserData();
        fetchEquipmentData();
    }, []);

    return (
        <div className='bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))]
            from-sky-400 to-blue-800 h-full'>
            <Header />

            <div className="bg-[#F5F5F8] mx-2 rounded-lg mb-2 py-2 px-2 shadow-md">
                <p className='text-xl'>機材一覧</p>
            </div>
            {!isLoading && equipments ? (
                <div className="bg-[#F5F5F8] rounded-md p-3 my-3 mx-2 shadow">

                    {equipments.map((equipment) => (
                        <div key={equipment.id} className="bg-slate-200 rounded-md p-3 mt-3 flex justify-between shadow">
                            <div className="flex justify-center items-center">
                                <p>{equipment.name}</p>
                            </div>

                            {loading && loadingId === equipment.id ? (
                                <Button
                                    isLoading
                                    disabled={loading && loadingId === equipment.id}
                                    onClick={() => handlePasswordSubmit(equipment.id)}
                                    colorScheme='blue'
                                >
                                    予約
                                </Button>
                            ) : (
                                <Button
                                    disabled={loading && loadingId === equipment.id}
                                    onClick={() => handlePasswordSubmit(equipment.id)}
                                    colorScheme='blue'
                                >
                                    予約
                                </Button>
                            )
                            }


                        </div>
                    ))}
                </div>
            ) : (
                <Box
                    position="absolute"
                    top="50%"
                    left="50%"
                    transform="translate(-50%, -50%)"
                >
                    <Spinner
                        thickness="4px"
                        speed="0.65s"
                        emptyColor="gray.200"
                        color="blue.500"
                        size="xl"
                    />
                </Box>
            )
            }
        </div>
    );
};

export default EquipmentList;
