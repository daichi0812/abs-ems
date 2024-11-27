"use client"

import { useRouter } from "next/navigation";

interface SettingsButtonProps{
    children?: React.ReactNode;
};

export const BillButton = ({
    children
}: SettingsButtonProps) => { 
    const router = useRouter();
    
    const onClick = () => {
       
        router.push("/ems/store");
    };

    return (
        <span onClick={onClick} className="cursor-pointer">
            {children}
        </span>
    );
};