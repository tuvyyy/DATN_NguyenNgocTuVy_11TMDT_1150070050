import React from "react";
import { Pencil, Power, RotateCcw } from "lucide-react";

const formatMoney = (value) => Number.isFinite(Number(value)) ? Number(value).toLocaleString("vi-VN") + " đ" : "-";
const formatDate = (value) => value ? new Date(value).toLocaleDateString("vi-VN") : "-";

export default function ThuocGiaTable({ data = [], loading = false, onEdit, onToggle, columns = [] }) {
  const renderCell = (column, item, index) => {
    switch (column.id) {
      case "stt": return index + 1;
      case "donGia": return <span className="font-semibold text-slate-800">{formatMoney(item.donGia)}</span>;
      case "ngayApDung": return formatDate(item.ngayApDung);
      case "ngayHetHan": return formatDate(item.ngayHetHan);
      case "doiTuongApDung": return item.doiTuongApDung || "-";
      case "ghiChu": return item.ghiChu || "-";
      case "trangThai": return <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${item.hoatDong ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"}`}>{item.hoatDong ? "Hoạt động" : "Vô hiệu"}</span>;
      case "actions": return (
        <div className="inline-flex justify-end gap-1">
          <button type="button" onClick={() => onEdit(item)} className="rounded-md p-2 text-sky-700 hover:bg-sky-100" title="Sửa giá"><Pencil size={16} /></button>
          <button type="button" onClick={() => onToggle(item)} className={`rounded-md p-2 hover:bg-slate-100 ${item.hoatDong ? "text-rose-600" : "text-emerald-600"}`} title={item.hoatDong ? "Vô hiệu hóa" : "Kích hoạt lại"}>{item.hoatDong ? <Power size={16} /> : <RotateCcw size={16} />}</button>
        </div>
      );
      default: return "-";
    }
  };

  return (
    <div className="h-full min-h-0 overflow-auto">
      <table className="min-w-full text-sm">
        <thead className="sticky top-0 z-10 bg-slate-100 text-[11px] uppercase text-slate-600">
          <tr>{columns.map((column) => <th key={column.id} className={`border-b border-slate-200 px-3 py-2.5 ${column.id === "actions" ? "w-28 text-right" : "whitespace-nowrap text-left"}`}>{column.label}</th>)}</tr>
        </thead>
        <tbody>
          {loading ? Array.from({ length: 6 }).map((_, index) => (
            <tr key={`gia-skeleton-${index}`}>{columns.map((column) => <td key={column.id} className="border-b border-slate-100 px-3 py-2.5"><span className="app-skeleton-line block h-3.5 w-full" /></td>)}</tr>
          )) : data.length ? data.map((item, index) => (
            <tr key={item.id} className="hover:bg-sky-50">{columns.map((column) => <td key={column.id} className={`border-b border-slate-100 px-3 py-2 ${column.id === "actions" ? "text-right" : ""}`}>{renderCell(column, item, index)}</td>)}</tr>
          )) : <tr><td colSpan={columns.length} className="p-8 text-center text-slate-500">Chưa có giá cho thuốc này</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
