import React from "react";
import { Plus, Search } from "lucide-react";

const ROLE_NAMES = {
  ADMIN: "Quản trị viên",
  BAC_SI: "Bác sĩ",
  TIEP_DON: "Nhân viên tiếp đón",
  THU_NGAN: "Nhân viên thu ngân",
  KY_THUAT_VIEN: "Kỹ thuật viên cận lâm sàng",
};

export default function UserFilter({ filters, setFilters, roles, onAdd }) {
  return (
    <div className="grid grid-cols-[minmax(260px,1.5fr)_minmax(190px,0.8fr)_minmax(180px,0.7fr)_auto] gap-3">
      <label className="flex h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-100">
        <Search size={16} className="text-slate-400" />
        <input
          type="text"
          placeholder="Tìm tên, tài khoản hoặc email"
          className="min-w-0 flex-1 border-0 bg-transparent text-sm text-slate-800 outline-none"
          value={filters.keyword}
          onChange={(event) => setFilters({ ...filters, keyword: event.target.value })}
        />
      </label>

      <select
        className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
        value={filters.role}
        onChange={(event) => setFilters({ ...filters, role: event.target.value })}
      >
        <option value="">Tất cả vai trò</option>
        {roles.map((role) => (
          <option key={role.id} value={role.ten}>{ROLE_NAMES[role.ten] || role.ten}</option>
        ))}
      </select>

      <select
        className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
        value={filters.active}
        onChange={(event) => setFilters({ ...filters, active: event.target.value })}
      >
        <option value="">Tất cả trạng thái</option>
        <option value="true">Đang hoạt động</option>
        <option value="false">Đã khóa</option>
      </select>

      <button
        type="button"
        onClick={onAdd}
        className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-sky-600 px-4 text-sm font-semibold text-white hover:bg-sky-700"
      >
        <Plus size={16} /> Thêm người dùng
      </button>
    </div>
  );
}
