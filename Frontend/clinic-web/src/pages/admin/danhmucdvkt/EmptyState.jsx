import React from "react";
import { CircleDollarSign } from "lucide-react";

export default function EmptyState() {
  return (
    <div className="flex h-full min-h-0 flex-col items-center justify-center px-6 text-center text-slate-500">
      <CircleDollarSign size={34} className="mb-3 text-slate-300" />
      <p className="font-medium text-slate-700">Chưa chọn dịch vụ kỹ thuật</p>
      <p className="mt-1 text-sm">Chọn một DVKT trong danh sách để xem và thiết lập giá.</p>
    </div>
  );
}
