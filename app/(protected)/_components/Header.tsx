import { MenuOutline, CloseOutline } from "react-ionicons";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@chakra-ui/react";
import axios from "axios";
import { UserButton } from "@/components/auth/user-button";
import { useCurrentUser } from "@/hooks/use-current-user";

type Response = {
  owner: boolean;
};

const Header = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [manager, setManager] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const user = useCurrentUser();

  /* 管理者になる登録ボタンを押した時の挙動 */
  const handlePasswordSubmit = async () => {
    setIsLoading(true);
    if (password === process.env.NEXT_PUBLIC_MANAGER_KEY) {
      putIsmanager();
      router.push('/ems/manager');
    } else {
      setIsLoading(false);
      alert('パスワードが間違っています');
    }
  };

  /* 管理者権限があるかどうかを確認する */
  const fetchIsmanager = async () => {
    try {
      const response = await fetch(`https://logicode.fly.dev/users/${user?.id}`);
      const data: Response = await response.json();
      setManager(data.owner);
    } catch (error) {
      // console.error("ユーザー情報が取得できません。", error);
    }
  };

  const putIsmanager = async () => {
    try {
      await axios.put(`https://logicode.fly.dev/users/${user?.id}`, {
        owner: true
      });
    } catch (error) {
      // console.error("管理者になることができません。", error);
    }
  };

  const handleToggleMenu = () => {
    setIsOpen(!isOpen);
  };

  //   useEffect(() => {
  //     const storedUserId = getUserIdFromCookie(); // クッキーからユーザーIDを取得
  //     const storedUserName = getUserNameFromCookie();
  //     if (storedUserId) {
  //       setUserId(storedUserId); // コンテキストにユーザーIDを設定
  //     }
  //     if (storedUserName) {
  //       setUserName(storedUserName);
  //     }
  //   }, []);

  useEffect(() => {
    if (user?.id) {
      fetchIsmanager();
    }
  }, [user?.id]);

  return (
    <>
      <div className="mb-3 shadow-md">
        <header className="bg-[#F5F5F8]">
          <nav className="flex justify-between items-center w-[92%] mx-auto h-[7.0vh]">
            <div>
              {isOpen ? "" : (
                <div className="wf-nicomoji text-2xl">
                  ABS EMS
                </div>
              )}
            </div>
            {isOpen ? (
              <div className="z-[49] duration-500 md:static absolute bg-[#F5F5F8] md:min-h-fit min-h-[60vh] left-0 top-[5.8%] md:w-auto w-full flex items-center px-5">
                <div>
                  <ul className="flex md:flex-row flex-col md:items-center md:gap-[4vw] gap-8 text-lg font-semibold">
                    <li className="flex items-center">
                      <UserButton />
                      <div className="wf-nicomoji mx-4">
                        <span className="font-bold">{user?.name}</span> <span className="text-sm">さん</span>
                      </div>
                    </li>
                    <li>
                      <a className="hover:text-gray-500 w-screen" href="/ems/mypage">マイページ</a>
                    </li>
                    <li>
                      <a className="hover:text-gray-500 w-screen" href="/ems/common">共通予約カレンダー</a>
                    </li>
                    <li>
                      <a className="hover:text-gray-500 w-screen" href="/ems/equipment-list">機材予約</a>
                    </li>
                    {manager ?
                      (
                        <li>
                          <a className="hover:text-gray-500 w-screen" href="/ems/manager">機材管理</a>
                        </li>
                      ) : (
                        <Dialog>
                          <DialogTrigger className="text-left">機材管理</DialogTrigger>
                          <DialogContent className="w-[90%] max-w-md p-6 bg-white rounded-lg shadow-lg">
                            <DialogHeader>
                              <DialogTitle className="text-xl font-bold text-center mb-4">パスワードを入力してください</DialogTitle>
                            </DialogHeader>
                            <div className="flex flex-col items-center">
                              <input
                                className="w-full mb-4 p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                type="password"
                                placeholder="パスワード"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                              />
                              {
                                isLoading ? (
                                  <Button
                                    colorScheme="blue"
                                    isLoading
                                    className="w-full"
                                    onClick={handlePasswordSubmit}
                                  >
                                    確定
                                  </Button>
                                ) : (
                                  <Button
                                    colorScheme="blue"
                                    className="w-full"
                                    onClick={handlePasswordSubmit}
                                  >
                                    確定
                                  </Button>
                                )
                              }
                            </div>
                          </DialogContent>
                        </Dialog>
                      )}
                  </ul>
                </div>
              </div>
            ) : (
              <div className="duration-500 md:static absolute md:min-h-fit min-h-[60vh] left-0 top-[-100%] md:w-auto w-full flex items-center px-5">
                <div>
                  <ul className="bg flex md:flex-row flex-col md:items-center md:gap-[4vw] gap-8 text-lg font-medium">
                    <li>
                      <a className="hover:text-gray-500" href={`/ems/mypage`}>マイページ</a>
                    </li>
                    <li>
                      <a className="hover:text-gray-500" href="/ems/common">共通予約カレンダー</a>
                    </li>
                    <li>
                      <a className="hover:text-gray-500" href="/ems/equipment-list">機材予約</a>
                    </li>
                    {manager ?
                      (
                        <li>
                          <a className="hover:text-gray-500" href="/ems/manager">機材管理</a>
                        </li>
                      ) : (
                        <Dialog>
                          <DialogTrigger className="text-left">機材管理</DialogTrigger>
                          <DialogContent className="w-full max-w-md p-6 bg-white rounded-lg shadow-lg">
                            <DialogHeader>
                              <DialogTitle className="text-xl font-bold text-center mb-4">パスワードを入力してください</DialogTitle>
                            </DialogHeader>
                            <div className="flex flex-col items-center">
                              <input
                                className="w-full mb-4 p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                type="password"
                                placeholder="パスワード"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                              />
                              {
                                isLoading ? (
                                  <Button
                                    colorScheme="blue"
                                    isLoading
                                    className="w-full"
                                    onClick={handlePasswordSubmit}
                                  >
                                    確定
                                  </Button>
                                ) : (
                                  <Button
                                    colorScheme="blue"
                                    className="w-full"
                                    onClick={handlePasswordSubmit}
                                  >
                                    確定
                                  </Button>
                                )
                              }
                            </div>
                          </DialogContent>
                        </Dialog>
                      )}
                    <li className="mt-1">
                      <UserButton />
                    </li>
                  </ul>
                </div>
              </div>
            )}
            <div className="flex items-center gap-6">
              <div className="text-3xl cursor-pointer md:hidden">
                {isOpen ? (
                  <CloseOutline
                    onClick={handleToggleMenu}
                    color={'#00000'}
                    title={""}
                    height="40px"
                    width="40px"
                  />
                ) : (
                  <div className="flex items-center gap-x-3">
                    <MenuOutline
                      onClick={handleToggleMenu}
                      color={'#00000'}
                      title={""}
                      height="40px"
                      width="40px"
                    />
                    <UserButton />
                  </div>
                )}
              </div>
            </div>
          </nav>
        </header>
      </div>
    </>
  );
}

export default Header;
