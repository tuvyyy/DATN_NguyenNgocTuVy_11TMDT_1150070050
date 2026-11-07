import React from "react";
import { Plus, Search } from "lucide-react";

const controlClass = "h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100";

export default function DVKTFilter({ nhomList = [], filters = {}, onChange = () => {}, onAdd = () => {} }) {
  return (
    <div className="grid grid-cols-12 items-end gap-3">
      <div className="col-span-12 md:col-span-4">
        <label className="mb-1 block text-xs font-semibold text-slate-600">Nhóm DVKT</label>
        <select className={controlClass} value={filters.idNhom || ""} onChange={(event) => onChange({ idNhom: event.target.value })}>
          <option value="">Tất cả nhóm DVKT</option>
          {nhomList.map((item) => <option key={item.id} value={item.id}>{item.tenNhom}</option>)}
        </select>
      </div>
      <div className="col-span-12 md:col-span-5">
        <label className="mb-1 block text-xs font-semibold text-slate-600">Tìm kiếm</label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input type="text" placeholder="Mã hoặc tên DVKT..." className={`${controlClass} pl-9`} value={filters.keyword || ""} onChange={(event) => onChange({ keyword: event.target.value })} />
        </div>
      </div>
      <div className="col-span-12 md:col-span-3">
        <button type="button" onClick={onAdd} className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-emerald-700">
          <Plus size={16} /> Thêm DVKT
        </button>
      </div>
    </div>
  );
}
