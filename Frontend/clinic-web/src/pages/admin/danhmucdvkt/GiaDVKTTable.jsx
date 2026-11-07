import React, { useEffect, useState } from "react";
import { Pencil, Plus } from "lucide-react";

export default function GiaDVKTTable({ data = [], loading = false, dvkt, onAdd, onEdit }) {
  const pageSize = 8;
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(data.length / pageSize));
  const start = (page - 1) * pageSize;
  const pageData = data.slice(start, start + pageSize);

  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [page, totalPages]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex min-h-12 shrink-0 items-center justify-between gap-2 border-b border-slate-200 px-3 py-2">
        <div className="min-w-0"><p className="text-xs text-slate-500">Bảng giá DVKT</p><h2 className="truncate font-semibold text-slate-800" title={`${dvkt.tenDvkt} (${dvkt.maDvkt})`}>{dvkt.tenDvkt} ({dvkt.maDvkt})</h2></div>
        <button type="button" onClick={onAdd} className="inline-flex shrink-0 items-center gap-1 rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700"><Plus size={15} /> Thêm giá</button>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        <table className="min-w-full text-sm">
          <thead className="sticky top-0 z-10 bg-slate-100 text-[11px] uppercase text-slate-600"><tr><th className="border-b border-slate-200 px-3 py-2.5 text-left">STT</th><th className="border-b border-slate-200 px-3 py-2.5 text-left">Đơn giá</th><th className="border-b border-slate-200 px-3 py-2.5 text-left">Ngày áp dụng</th><th className="border-b border-slate-200 px-3 py-2.5 text-right">Thao tác</th></tr></thead>
          <tbody>
            {loading ? Array.from({ length: 7 }).map((_, index) => <tr key={index}>{Array.from({ length: 4 }).map((__, cell) => <td key={cell} className="border-b border-slate-100 px-3 py-2.5"><span className="app-skeleton-line block h-3.5 w-full" /></td>)}</tr>)
              : pageData.length ? pageData.map((item, index) => <tr key={item.id} className="hover:bg-sky-50"><td className="border-b border-slate-100 px-3 py-2">{start + index + 1}</td><td className="border-b border-slate-100 px-3 py-2 font-semibold text-slate-800">{Number(item.donGia || 0).toLocaleString("vi-VN")} đ</td><td className="border-b border-slate-100 px-3 py-2">{item.tuNgay ? new Date(item.tuNgay).toLocaleDateString("vi-VN") : "-"}</td><td className="border-b border-slate-100 px-3 py-2 text-right"><button type="button" className="rounded-md p-2 text-sky-700 hover:bg-sky-100" onClick={() => onEdit(item)} title="Sửa giá"><Pencil size={16} /></button></td></tr>)
              : <tr><td colSpan={4} className="p-8 text-center text-slate-500">Chưa có giá cho DVKT này</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="flex h-12 shrink-0 items-center justify-between border-t border-slate-200 px-3 text-sm text-slate-600"><span>Trang {page}/{totalPages}</span><div className="flex gap-2"><button type="button" disabled={page === 1 || loading} onClick={() => setPage((value) => value - 1)} className="rounded-md border border-slate-300 px-3 py-1.5 hover:bg-slate-50 disabled:opacity-40">Trước</button><button type="button" disabled={page === totalPages || loading} onClick={() => setPage((value) => value + 1)} className="rounded-md border border-slate-300 px-3 py-1.5 hover:bg-slate-50 disabled:opacity-40">Sau</button></div></div>
    </div>
  );
}
