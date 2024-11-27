"use client"

import { FaUser } from "react-icons/fa";
import { ExitIcon } from "@radix-ui/react-icons"
import { IoSettingsOutline } from "react-icons/io5";
import { RiBillLine } from "react-icons/ri";

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    Avatar,
    AvatarImage,
    AvatarFallback,
} from "@/components/ui/avatar"
import { useCurrentUser } from "@/hooks/use-current-user";
import { LogoutButton } from "@/components/auth/logout-button";
import { SettingsButton } from "@/components/auth/settings-button";
import { BillButton } from "@/components/auth//bill-button";

interface UserButtonProps {
    isAdmin: boolean;
}

export const UserButton = ({ isAdmin }: UserButtonProps) => {
    const user = useCurrentUser();

    return (
        <DropdownMenu>
            <DropdownMenuTrigger>
                <Avatar>
                    <AvatarImage src={user?.image || ""} />
                    <AvatarFallback className="bg-sky-500">
                        <FaUser className="text-white" />
                    </AvatarFallback>
                </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-40" align="end">
                <SettingsButton>
                    <DropdownMenuItem>
                        <IoSettingsOutline className="h-4 w-4 mr-2" />
                        設定
                    </DropdownMenuItem>
                </SettingsButton>
                {isAdmin && (
                    <BillButton>
                        <DropdownMenuItem>
                            <RiBillLine className="h-4 w-4 mr-2" />
                            支払い
                        </DropdownMenuItem>
                    </BillButton>
                )}
                <LogoutButton>
                    <DropdownMenuItem>
                        <ExitIcon className="h-4 w-4 mr-2" />
                        ログアウト
                    </DropdownMenuItem>
                </LogoutButton>
            </DropdownMenuContent>
        </DropdownMenu>
    );
};