import React, { useState, useEffect } from "react";
import { Settings } from "lucide-react";

export default function ModalChiDinhDVKTList({
  ds,
  filterLoai,
  search,
  selected,
  toggleSelect,
}) {
  // ======================================================
  // 1) PAGINATION
  // ======================================================
  const pageSize = 12;
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [filterLoai, search, ds]);

  // ======================================================
  // 2) COLUMN TOGGLE (ẩn/hiện cột)
  // ======================================================
  const [columns, setColumns] = useState({
    ma: true,
    ten: true,
    phong: true,
    tang: true,
    donGia: true,
  });

  const [openCols, setOpenCols] = useState(false);

  // ======================================================
  // 3) FILTER DVKT
  // ======================================================
  const filtered = ds.filter((item) => {
    const matchLoai =
      filterLoai === "all" || String(item.loai) === String(filterLoai);

    const str = search.toLowerCase();
    const matchSearch =
      item.tenDvkt.toLowerCase().includes(str) ||
      item.maDvkt.toLowerCase().includes(str);

    return matchLoai && matchSearch;
  });

  // ======================================================
  // 4) PAGED DATA
  // ======================================================
  const totalPages = Math.ceil(filtered.length / pageSize);
  const pagedData = filtered.slice((page - 1) * pageSize, page * pageSize);

  // ======================================================
  // 5) RENDER
  // ======================================================
  return (
    <div className="flex flex-col flex-1 max-h-[64vh] relative min-h-0">
      {/* BUTTON: Điều chỉnh cột */}
      <div className="flex justify-end p-2.5 shrink-0">
        <button
          onClick={() => setOpenCols(!openCols)}
          className="inline-flex items-center gap-1.5 h-8 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:border-slate-350 transition-all duration-150 hover:shadow-sm"
        >
          <Settings size={13} className="text-slate-400" />
          Điều chỉnh cột
        </button>
      </div>

      {/* POPUP CHỌN CỘT */}
      {openCols && (
        <div className="absolute right-3 top-11 bg-white border border-[#0077B6]/15 rounded-xl shadow-[0_12px_36px_-6px_rgba(0,119,182,0.25)] p-4.5 z-50 w-48 space-y-2.5 animate-fadeIn">
          <p className="text-[10px] font-extrabold uppercase text-[#0077B6] tracking-wider mb-2">Hiển thị cột</p>
          <div className="space-y-2 text-xs font-semibold text-slate-600">
            {Object.keys(columns).map((key) => (
              <label key={key} className="flex items-center gap-2 cursor-pointer hover:text-slate-900 transition-colors">
                <input
                  type="checkbox"
                  checked={columns[key]}
                  onChange={() => setColumns({ ...columns, [key]: !columns[key] })}
                  className="rounded border-slate-300 text-[#0077B6] focus:ring-[#0077B6]/20 h-4 w-4 transition-all"
                />
                {{
                  ma: "Mã DVKT",
                  ten: "Tên DVKT",
                  phong: "Phòng",
                  tang: "Tầng",
                  donGia: "Đơn giá",
                }[key]}
              </label>
            ))}
          </div>
        </div>
      )}

      {/* TABLE */}
      <div className="flex-1 overflow-auto border border-slate-200 rounded-xl mx-4 mb-2 shadow-sm min-h-0 bg-white">
        <table className="min-w-full text-sm divide-y divide-slate-100">
          <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-200 sticky top-0 z-10 shadow-sm">
            <tr>
              <th className="px-4 py-3 text-center w-10"></th>
              {columns.ma && <th className="px-4 py-3 text-left">Mã dịch vụ</th>}
              {columns.ten && <th className="px-4 py-3 text-left">Tên dịch vụ</th>}
              {columns.phong && <th className="px-4 py-3 text-left">Phòng</th>}
              {columns.tang && <th className="px-4 py-3 text-center">Tầng</th>}
              {columns.donGia && <th className="px-4 py-3 text-right">Giá</th>}
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {pagedData.map((item) => {
              const isSel = selected.some((s) => s.id === item.id);

              return (
                <tr
                  key={`${item.id}-${item.maDvkt}-${item.tenPhong || ""}`}
                  onClick={() => toggleSelect(item)}
                  className={`cursor-pointer transition-all duration-150 border-l-4 hover:bg-slate-50/70 ${
                    isSel ? "bg-blue-50/50 border-l-[#0077B6] font-semibold" : "border-l-transparent"
                  }`}
                >
                  <td className="px-4 py-3 text-center w-10">
                    <input
                      type="checkbox"
                      checked={isSel}
                      readOnly
                      className="rounded border-slate-300 text-[#0077B6] focus:ring-[#0077B6]/20 h-4 w-4 cursor-pointer transition-all"
                    />
                  </td>

                  {columns.ma && <td className="px-4 py-3 font-semibold text-slate-500">{item.maDvkt}</td>}
                  {columns.ten && <td className="px-4 py-3 font-bold text-slate-900">{item.tenDvkt}</td>}
                  {columns.phong && (
                    <td className="px-4 py-3 font-semibold text-slate-700">{item.phong?.tenPhong || "-"}</td>
                  )}
                  {columns.tang && (
                    <td className="px-4 py-3 text-center text-slate-500 font-bold">{item.phong?.tang || "-"}</td>
                  )}
                  {columns.donGia && (
                    <td className="px-4 py-3 text-right font-mono font-bold text-slate-800">
                      {item.donGia?.toLocaleString("vi-VN")} đ
                    </td>
                  )}
                </tr>
              );
            })}

            {pagedData.length === 0 && (
              <tr>
                <td colSpan="6" className="py-12 text-center text-slate-450 font-semibold italic">
                  Không có dịch vụ phù hợp.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* PAGINATION */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between shrink-0 px-4 py-2 border-t border-slate-100 text-xs font-semibold text-slate-500 bg-slate-50/30">
          <button
            type="button"
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 hover:bg-slate-50 disabled:opacity-40 font-bold transition-all duration-150"
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
          >
            ← Trước
          </button>

          <span className="font-bold">
            Trang {page}/{totalPages} · {filtered.length} dịch vụ
          </span>

          <button
            type="button"
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 hover:bg-slate-50 disabled:opacity-40 font-bold transition-all duration-150"
            disabled={page === totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Sau →
          </button>
        </div>
      )}
    </div>
  );
}
