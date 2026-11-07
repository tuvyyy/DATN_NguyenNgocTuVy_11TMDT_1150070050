export default function ModalChiDinhDVKTTotals({ selected }) {
  const total = selected.reduce((sum, item) => {
    const gia = Number(item.donGia) || 0;
    const sl = Number(item.soLuong) || 1;
    return sum + gia * sl;
  }, 0);

  return (
    <div className="p-4 border-b border-slate-200 bg-gradient-to-r from-blue-50/70 to-sky-50/70 flex justify-between items-center shrink-0">
      <div className="font-bold text-slate-700 text-sm flex items-center gap-1.5">
        Đã chọn: 
        <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-[#0077B6] px-1.5 text-xs font-black text-white shadow-sm shadow-[#0077B6]/15">
          {selected.length}
        </span> 
        dịch vụ chỉ định
      </div>

      <div className="font-bold text-sm text-slate-600 flex items-center">
        Tổng tiền: 
        <span className="font-mono font-black text-2xl text-[#0077B6] ml-1.5 bg-[#0077B6]/10 px-3 py-1 rounded-lg border border-[#0077B6]/10 shadow-inner">
          {total.toLocaleString("vi-VN")} đ
        </span>
      </div>
    </div>
  );
}
