import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ShieldCheck, UserCheck, Users, UserX } from "lucide-react";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import AdminAuthApi from "../../../api/AdminAuthApi";
import AdminAuthController from "../../../controllers/AdminAuthController";
import UserFilter from "./UserFilter";
import UserModal from "./UserModal";
import UserTable from "./UserTable";

const EMPTY_FORM = {
  hoTen: "",
  tenDangNhap: "",
  email: "",
  soDienThoai: "",
  chucDanh: "",
  khoaPhong: "",
  vaiTro: [],
  matKhau: "Abcd@1234",
};

export default function AdminUserPage() {
  const [rawUsers, setRawUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ keyword: "", role: "", active: "" });
  const [currentPage, setCurrentPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const pageSize = 20;

  const loadData = useCallback(async () => {
    await AdminAuthController.fetchUsers(setRawUsers, setLoading, {});
  }, []);

  useEffect(() => {
    loadData();
    AdminAuthApi.getRoles().then((list) => setRoles((Array.isArray(list) ? list : []).filter((role) => !String(role.ten || "").includes("_PRESET_"))));
  }, [loadData]);

  const users = useMemo(() => {
    const keyword = filters.keyword.trim().toLocaleLowerCase("vi");
    return rawUsers.filter((user) => {
      const matchesKeyword = !keyword || `${user.hoTen} ${user.tenDangNhap} ${user.email}`.toLocaleLowerCase("vi").includes(keyword);
      const matchesRole = !filters.role || (Array.isArray(user.vaiTro) && user.vaiTro.includes(filters.role));
      const matchesStatus = filters.active === "" || user.hoatDong === (filters.active === "true");
      return matchesKeyword && matchesRole && matchesStatus;
    });
  }, [rawUsers, filters]);

  useEffect(() => setCurrentPage(1), [filters]);

  const stats = useMemo(() => ({
    total: rawUsers.length,
    active: rawUsers.filter((user) => user.hoatDong).length,
    locked: rawUsers.filter((user) => !user.hoatDong).length,
  }), [rawUsers]);

  const totalPages = Math.max(1, Math.ceil(users.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const start = (safePage - 1) * pageSize;
  const paginatedUsers = users.slice(start, start + pageSize);

  const handleAdd = () => {
    setIsEdit(false);
    setFormData({ ...EMPTY_FORM });
    setShowModal(true);
  };

  const handleEdit = (user) => {
    setIsEdit(true);
    setFormData({
      id: user.id,
      hoTen: user.hoTen || "",
      tenDangNhap: user.tenDangNhap || "",
      email: user.email || "",
      soDienThoai: user.soDienThoai || "",
      chucDanh: user.chucDanh || "",
      khoaPhong: user.khoaPhong || "",
      vaiTro: Array.isArray(user.vaiTro) ? user.vaiTro : [],
      hoatDong: user.hoatDong,
      matKhau: "",
    });
    setShowModal(true);
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-slate-50">
      <header className="border-b border-slate-200 bg-white px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Quản lý người dùng</h1>
            <p className="mt-1 text-sm text-slate-600">Quản lý tài khoản, vai trò và trạng thái truy cập hệ thống.</p>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-semibold text-slate-700"><Users size={15} /> {stats.total} người dùng</span>
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 font-semibold text-emerald-700"><UserCheck size={15} /> {stats.active} hoạt động</span>
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 font-semibold text-rose-700"><UserX size={15} /> {stats.locked} đã khóa</span>
          </div>
        </div>
        <div className="mt-4">
          <UserFilter filters={filters} setFilters={setFilters} roles={roles} onAdd={handleAdd} />
        </div>
      </header>

      <main className="flex min-h-0 flex-1 flex-col px-5 py-4">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <div className="flex items-center gap-2">
              <ShieldCheck size={18} className="text-sky-600" />
              <h2 className="font-bold text-slate-900">Danh sách tài khoản</h2>
              <span className="text-sm text-slate-500">({users.length} kết quả)</span>
            </div>
            <p className="text-xs text-slate-500">Mỗi tài khoản có thể được gán nhiều vai trò</p>
          </div>

          <div className="min-h-0 flex-1 overflow-auto">
            <UserTable users={paginatedUsers} loading={loading} onEdit={handleEdit} loadData={loadData} startIndex={start} />
          </div>

          <footer className="flex h-14 shrink-0 items-center justify-between border-t border-slate-200 px-4 text-sm">
            <span className="text-slate-600">Trang {safePage}/{totalPages} · {users.length} người dùng</span>
            <div className="flex gap-2">
              <button type="button" onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} disabled={safePage === 1} className="rounded-lg border border-slate-200 px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">Trước</button>
              <button type="button" onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))} disabled={safePage === totalPages} className="rounded-lg border border-slate-200 px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">Sau</button>
            </div>
          </footer>
        </div>
      </main>

      {showModal && (
        <UserModal
          isEdit={isEdit}
          formData={formData}
          setFormData={setFormData}
          roles={roles}
          onClose={() => setShowModal(false)}
          loadData={loadData}
        />
      )}
      <ToastContainer position="bottom-right" autoClose={2500} newestOnTop />
    </div>
  );
}
