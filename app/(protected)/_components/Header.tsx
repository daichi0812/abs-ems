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
import { Button } from "@/components/ui/button";
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
  const router = useRouter();
  const user = useCurrentUser();

  /* 管理者になる登録ボタンを押した時の挙動 */
  const handlePasswordSubmit = async () => {
    if (password === process.env.NEXT_PUBLIC_MANAGER_KEY) {
      putIsmanager();
      router.push('/ems/manager');
    } else {
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
      <div className="font-[Poppins] mb-3 shadow-md">
        <header className="bg-[#F5F5F8]">
          <nav className="flex justify-between items-center w-[92%] mx-auto h-[7.0vh]">
            <div>
              {isOpen ? "" : (
                <div className="wf-nicomoji">
                  <span className="font-bold">{user?.name}</span> <span className="text-sm">さん</span>
                </div>
              )}
            </div>
            {isOpen ? (
              <div className="z-[49] duration-500 md:static absolute bg-[#F5F5F8] md:min-h-fit min-h-[60vh] left-0 top-[5.8%] md:w-auto w-full flex items-center px-5">
                <div>
                  <ul className="flex md:flex-row flex-col md:items-center md:gap-[4vw] gap-8 text-lg font-semibold">
                    <li>
                      <UserButton />
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
                          <DialogContent className="w-auto">
                            <DialogHeader>
                              <DialogTitle>パスワードを入力してください</DialogTitle>
                              <div className="flex justify-center items-center">
                                <input
                                  className='me-1'
                                  type="text"
                                  placeholder="パスワード"
                                  value={password}
                                  onChange={e => setPassword(e.target.value)}
                                  style={{ border: '1px solid black' }}
                                />
                                <Button>ここに確定ボタンを配置</Button>
                                {/* <Button onClick={handlePasswordSubmit}>確定</Button> */}
                              </div>
                            </DialogHeader>
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
                          <DialogTrigger>機材管理</DialogTrigger>
                          <DialogContent className="w-auto">
                            <DialogHeader>
                              <DialogTitle>パスワードを入力してください</DialogTitle>
                              <div className='bg-slate-200 rounded-md p-3 mt-3'>
                                <div className="flex justify-center items-center">
                                  <input
                                    className='mb-1'
                                    type="text"
                                    placeholder="パスワード"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    style={{ border: '1px solid black' }}
                                  />
                                  <Button onClick={handlePasswordSubmit}>確定</Button>
                                </div>
                              </div>
                            </DialogHeader>
                          </DialogContent>
                        </Dialog>
                      )}
                    <li>
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
                  <MenuOutline
                    onClick={handleToggleMenu}
                    color={'#00000'}
                    title={""}
                    height="40px"
                    width="40px"
                  />
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
