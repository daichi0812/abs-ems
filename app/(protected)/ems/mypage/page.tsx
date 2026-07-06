"use client";

import { MyReservations } from "./_components/MyReservations";

const Mypage = () => {
  return (
    <div>
      <h1 className="mb-3 text-lg font-black text-ink">マイ予約</h1>
      <MyReservations />
    </div>
  );
};

export default Mypage;
