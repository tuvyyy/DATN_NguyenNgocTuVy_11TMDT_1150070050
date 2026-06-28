import React, { useEffect, useState } from "react";
import { Filter, Plus, Search } from "lucide-react";

const controlClass =
  "h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100";

export default function ThuocFilter({ nhomList, filters, onChange, onAdd }) {
  const [local, setLocal] = useState(filters);

  useEffect(() => setLocal(filters), [filters]);

  return (
    <div className="grid grid-cols-12 items-end gap-3">
      <div className="col-span-12 md:col-span-3">
        <label className="mb-1 block text-xs font-semibold text-slate-600">Nhóm thuốc</label>
        <select
          value={local.idNhom || ""}
          onChange={(event) => setLocal((state) => ({ ...state, idNhom: event.target.value || "" }))}
          className={controlClass}
        >
          <option value="">Tất cả nhóm thuốc</option>
          {nhomList.map((item) => (
            <option key={item.id} value={item.id}>{item.ten}</option>
          ))}
        </select>
      </div>

      <div className="col-span-12 md:col-span-2">
        <label className="mb-1 block text-xs font-semibold text-slate-600">Trạng thái</label>
        <select
          value={local.hoatDong}
          onChange={(event) => setLocal((state) => ({ ...state, hoatDong: event.target.value }))}
          className={controlClass}
        >
          <option value="">Tất cả trạng thái</option>
          <option value="true">Đang hoạt động</option>
          <option value="false">Đã vô hiệu</option>
        </select>
      </div>

      <div className="col-span-12 md:col-span-4">
        <label className="mb-1 block text-xs font-semibold text-slate-600">Tìm kiếm</label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            value={local.keyword}
            onChange={(event) => setLocal((state) => ({ ...state, keyword: event.target.value }))}
            onKeyDown={(event) => event.key === "Enter" && onChange(local)}
            placeholder="Mã hoặc tên thuốc..."
            className={`${controlClass} pl-9`}
          />
        </div>
      </div>

      <div className="col-span-12 flex gap-2 md:col-span-3">
        <button
          type="button"
          onClick={() => onChange(local)}
          className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-md bg-sky-600 px-4 text-sm font-semibold text-white transition hover:bg-sky-700"
        >
          <Filter size={16} /> Lọc
        </button>
        <button
          type="button"
          onClick={onAdd}
          className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-md bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-emerald-700"
        >
          <Plus size={16} /> Thêm thuốc
        </button>
      </div>
    </div>
  );
}
