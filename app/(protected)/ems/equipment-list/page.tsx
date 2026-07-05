"use client";

import { BookingWizard } from "./_components/BookingWizard";

const EquipmentListPage = () => {
  return (
    <div>
      <h1 className="mb-3 text-lg font-black text-ink">予約する</h1>
      <BookingWizard />
    </div>
  );
};

export default EquipmentListPage;
