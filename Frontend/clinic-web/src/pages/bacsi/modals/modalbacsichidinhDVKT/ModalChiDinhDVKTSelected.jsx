import React from "react";

export default function ModalChiDinhDVKTSelected({
  selected,
  updateSoLuong,
  toggleSelect,
}) {
  return (
    <div className="flex-1 overflow-auto border border-slate-200 rounded-xl mx-4 mb-2 shadow-sm min-h-0">
      <table className="min-w-full text-sm divide-y divide-slate-100">
        <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-200 sticky top-0 z-10 shadow-sm">
          <tr>
            <th className="px-4 py-3 text-center w-10"></th>
            <th className="px-4 py-3 text-center w-12">STT</th>
            <th className="px-4 py-3 text-left">Mã dịch vụ</th>
            <th className="px-4 py-3 text-left">Tên dịch vụ</th>
            <th className="px-4 py-3 text-left">Phòng</th>
            <th className="px-4 py-3 text-center">Tầng</th>
            <th className="px-4 py-3 text-center w-20">SL</th>
            <th className="px-4 py-3 text-right">Đơn giá</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-100 bg-white">
          {selected.map((item, i) => (
            <tr
              key={item.id}
              className="group hover:bg-rose-50/30 border-l-4 border-l-[#0077B6] transition-all duration-150 cursor-pointer"
              onClick={(e) => {
                if (e.target.tagName.toLowerCase() !== "input") {
                  toggleSelect(item);
                }
              }}
            >
              <td className="px-4 py-3 text-center w-10">
                <input
                  type="checkbox"
                  checked={true}
                  onChange={() => toggleSelect(item)}
                  className="rounded border-slate-300 text-[#0077B6] focus:ring-[#0077B6]/20 h-4 w-4 cursor-pointer transition-all"
                />
              </td>

              <td className="px-4 py-3 text-center text-slate-500 font-bold">{i + 1}</td>

              <td className="px-4 py-3 font-semibold text-slate-500">{item.maDvkt}</td>
              <td className="px-4 py-3 font-bold text-slate-900">{item.tenDvkt}</td>

              <td className="px-4 py-3 font-semibold text-slate-700">{item.phong?.tenPhong || "-"}</td>
              <td className="px-4 py-3 text-center text-slate-500 font-bold">{item.phong?.tang || "-"}</td>

              <td className="px-4 py-2 text-center w-20">
                <input
                  type="number"
                  min={1}
                  value={item.soLuong}
                  onChange={(e) => updateSoLuong(item.id, Number(e.target.value))}
                  className="h-8 w-14 rounded-lg border border-slate-200 text-center font-mono font-bold text-slate-800 outline-none transition-all duration-150 focus:border-[#0077B6] focus:ring-4 focus:ring-[#0077B6]/10 hover:border-slate-350"
                />
              </td>

              <td className="px-4 py-3 text-right font-mono font-black text-[#0077B6] text-sm">
                {item.donGia?.toLocaleString("vi-VN")} đ
              </td>
            </tr>
          ))}

          {selected.length === 0 && (
            <tr>
              <td colSpan="8" className="py-12 text-center text-slate-400 font-semibold italic">
                Chưa chọn dịch vụ nào.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
