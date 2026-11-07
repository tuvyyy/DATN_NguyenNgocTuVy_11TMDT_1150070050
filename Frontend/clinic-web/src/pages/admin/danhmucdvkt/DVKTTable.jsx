import React, { useEffect, useMemo, useState } from "react";
import { Pencil, Power, RotateCcw } from "lucide-react";

export default function DVKTTable({ data = [], loading = false, onSelect, selectedId, onEdit, onToggle }) {
  const pageSize = 12;
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(data.length / pageSize));
  const pageData = useMemo(() => data.slice((page - 1) * pageSize, page * pageSize), [data, page]);

  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [page, totalPages]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 overflow-auto">
        <table className="min-w-full text-sm">
          <thead className="sticky top-0 z-10 bg-slate-100 text-[11px] uppercase text-slate-600">
            <tr>
              <th className="border-b border-slate-200 px-3 py-2.5 text-left">Mã DVKT</th>
              <th className="border-b border-slate-200 px-3 py-2.5 text-left">Tên DVKT</th>
              <th className="border-b border-slate-200 px-3 py-2.5 text-left">Nhóm</th>
              <th className="border-b border-slate-200 px-3 py-2.5 text-left">Đơn vị</th>
              <th className="border-b border-slate-200 px-3 py-2.5 text-left">Trạng thái</th>
              <th className="w-28 border-b border-slate-200 px-3 py-2.5 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {loading ? Array.from({ length: 8 }).map((_, index) => (
              <tr key={`dvkt-skeleton-${index}`}>{Array.from({ length: 6 }).map((__, cell) => <td key={cell} className="border-b border-slate-100 px-3 py-2.5"><span className="app-skeleton-line block h-3.5 w-full" /></td>)}</tr>
            )) : pageData.length ? pageData.map((item) => (
              <tr key={item.id} onClick={() => onSelect(item)} className={`cursor-pointer transition hover:bg-sky-50 ${item.id === selectedId ? "bg-sky-100" : ""}`}>
                <td className="border-b border-slate-100 px-3 py-2 font-medium text-sky-700">{item.maDvkt}</td>
                <td className="border-b border-slate-100 px-3 py-2 font-medium text-slate-800">{item.tenDvkt}</td>
                <td className="border-b border-slate-100 px-3 py-2">{item.nhom || "-"}</td>
                <td className="border-b border-slate-100 px-3 py-2">{item.donVi || "-"}</td>
                <td className="border-b border-slate-100 px-3 py-2"><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${item.hoatDong ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"}`}>{item.hoatDong ? "Hoạt động" : "Đã khóa"}</span></td>
                <td className="border-b border-slate-100 px-3 py-2 text-right">
                  <div className="inline-flex gap-1">
                    <button type="button" onClick={(event) => { event.stopPropagation(); onEdit(item); }} className="rounded-md p-2 text-sky-700 hover:bg-sky-100" title="Sửa DVKT"><Pencil size={16} /></button>
                    <button type="button" onClick={(event) => { event.stopPropagation(); onToggle(item); }} className={`rounded-md p-2 hover:bg-slate-100 ${item.hoatDong ? "text-rose-600" : "text-emerald-600"}`} title={item.hoatDong ? "Khóa DVKT" : "Mở khóa DVKT"}>{item.hoatDong ? <Power size={16} /> : <RotateCcw size={16} />}</button>
                  </div>
                </td>
              </tr>
            )) : <tr><td colSpan={6} className="p-8 text-center text-slate-500">Không có dữ liệu phù hợp</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="flex h-12 shrink-0 items-center justify-between border-t border-slate-200 px-3 text-sm text-slate-600">
        <span>Trang {page}/{totalPages} · {data.length} DVKT</span>
        <div className="flex gap-2">
          <button type="button" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={page === 1 || loading} className="rounded-md border border-slate-300 px-3 py-1.5 hover:bg-slate-50 disabled:opacity-40">Trước</button>
          <button type="button" onClick={() => setPage((value) => Math.min(totalPages, value + 1))} disabled={page === totalPages || loading} className="rounded-md border border-slate-300 px-3 py-1.5 hover:bg-slate-50 disabled:opacity-40">Sau</button>
        </div>
      </div>
    </div>
  );
}
