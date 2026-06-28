import React from "react";
import { Pencil, Power, RotateCcw } from "lucide-react";

export default function ThuocTable({
  data = [], loading = false, page, pageSize, total, onPageChange,
  onSelect, selectedId, onEdit, onToggle, columns = [],
}) {
  const totalPages = Math.max(1, Math.ceil((total || 0) / (pageSize || 1)));

  const renderCell = (column, item, index) => {
    switch (column.id) {
      case "stt": return (page - 1) * pageSize + index + 1;
      case "ma": return item.ma;
      case "ten": return <span className="font-medium text-slate-800">{item.ten}</span>;
      case "donViTinh": return item.donViTinh;
      case "nhom": return item.tenNhom || "-";
      case "trangThai":
        return (
          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${item.hoatDong ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"}`}>
            {item.hoatDong ? "Hoạt động" : "Vô hiệu"}
          </span>
        );
      case "actions":
        return (
          <div className="inline-flex justify-end gap-1">
            <button type="button" onClick={(event) => { event.stopPropagation(); onEdit(item); }} className="rounded-md p-2 text-sky-700 hover:bg-sky-100" title="Sửa thuốc">
              <Pencil size={16} />
            </button>
            <button type="button" onClick={async (event) => { event.stopPropagation(); await onToggle(item); }} className={`rounded-md p-2 hover:bg-slate-100 ${item.hoatDong ? "text-rose-600" : "text-emerald-600"}`} title={item.hoatDong ? "Vô hiệu hóa" : "Kích hoạt lại"}>
              {item.hoatDong ? <Power size={16} /> : <RotateCcw size={16} />}
            </button>
          </div>
        );
      default: return "-";
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 overflow-auto">
        <table className="min-w-full text-sm">
          <thead className="sticky top-0 z-10 bg-slate-100 text-[11px] uppercase text-slate-600">
            <tr>
              {columns.map((column) => (
                <th key={column.id} className={`border-b border-slate-200 px-3 py-2.5 ${column.id === "actions" ? "w-28 text-right" : "whitespace-nowrap text-left"}`}>
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? Array.from({ length: 7 }).map((_, index) => (
              <tr key={`thuoc-skeleton-${index}`}>
                {columns.map((column) => (
                  <td key={`${column.id}-${index}`} className="border-b border-slate-100 px-3 py-2.5">
                    <span className="app-skeleton-line block h-3.5 w-full" />
                  </td>
                ))}
              </tr>
            )) : data.length ? data.map((item, index) => (
              <tr key={item.id} onClick={() => onSelect(item)} className={`cursor-pointer transition hover:bg-sky-50 ${selectedId === item.id ? "bg-sky-100" : ""}`}>
                {columns.map((column) => (
                  <td key={column.id} className={`border-b border-slate-100 px-3 py-2 ${column.id === "actions" ? "text-right" : ""}`}>
                    {renderCell(column, item, index)}
                  </td>
                ))}
              </tr>
            )) : (
              <tr><td colSpan={columns.length} className="p-8 text-center text-slate-500">Không có dữ liệu phù hợp</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex h-12 shrink-0 items-center justify-between border-t border-slate-200 px-3 text-sm text-slate-600">
        <span>Trang {page}/{totalPages} · {total || 0} thuốc</span>
        <div className="flex gap-2">
          <button type="button" onClick={() => onPageChange(Math.max(1, page - 1))} className="rounded-md border border-slate-300 px-3 py-1.5 hover:bg-slate-50 disabled:opacity-40" disabled={page <= 1 || loading}>Trước</button>
          <button type="button" onClick={() => onPageChange(Math.min(totalPages, page + 1))} className="rounded-md border border-slate-300 px-3 py-1.5 hover:bg-slate-50 disabled:opacity-40" disabled={page >= totalPages || loading}>Sau</button>
        </div>
      </div>
    </div>
  );
}
