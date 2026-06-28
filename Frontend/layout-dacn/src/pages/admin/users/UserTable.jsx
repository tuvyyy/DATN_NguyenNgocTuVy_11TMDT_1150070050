import React from "react";
import { KeyRound, Lock, Pencil, Unlock, Users } from "lucide-react";
import AdminAuthController from "../../../controllers/AdminAuthController";

const ROLE_NAMES = {
  ADMIN: "Quản trị viên",
  QUAN_TRI: "Quản trị viên",
  BAC_SI: "Bác sĩ",
  TIEP_DON: "Tiếp đón",
  THU_NGAN: "Thu ngân",
  KY_THUAT_VIEN: "Kỹ thuật viên CLS",
  TIEP_DON_PRESET_FULL: "Tiếp đón - toàn quyền",
};

const roleLabel = (role) => ROLE_NAMES[role] || role;

export default function UserTable({ users, loading, onEdit, loadData, startIndex = 0 }) {
  const skeletonRows = Array.from({ length: 8 });

  return (
    <table className="w-full border-collapse text-sm">
      <thead className="sticky top-0 z-10 bg-slate-100 text-xs uppercase text-slate-600">
        <tr>
          <th className="w-14 px-3 py-3 text-center">STT</th>
          <th className="px-3 py-3 text-left">Nhân viên</th>
          <th className="px-3 py-3 text-left">Liên hệ</th>
          <th className="px-3 py-3 text-left">Vai trò</th>
          <th className="w-32 px-3 py-3 text-center">Trạng thái</th>
          <th className="w-36 px-3 py-3 text-center">Thao tác</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-200 bg-white">
        {loading ? (
          skeletonRows.map((_, index) => (
            <tr key={index}>
              <td colSpan={6} className="px-4 py-3"><div className="h-5 animate-pulse rounded bg-slate-100" /></td>
            </tr>
          ))
        ) : users.length === 0 ? (
          <tr>
            <td colSpan={6} className="h-72 text-center">
              <Users size={30} className="mx-auto text-slate-300" />
              <p className="mt-3 font-semibold text-slate-700">Không có người dùng phù hợp</p>
              <p className="mt-1 text-xs text-slate-500">Thử thay đổi từ khóa hoặc bộ lọc.</p>
            </td>
          </tr>
        ) : (
          users.map((user, index) => (
            <tr key={user.id} className="hover:bg-sky-50/60">
              <td className="px-3 py-2.5 text-center text-slate-500">{startIndex + index + 1}</td>
              <td className="px-3 py-2.5">
                <p className="font-semibold text-slate-900">{user.hoTen || "Chưa cập nhật"}</p>
                <p className="mt-0.5 text-xs text-slate-500">{user.tenDangNhap}</p>
              </td>
              <td className="px-3 py-2.5">
                <p className="text-slate-700">{user.email || "Chưa có email"}</p>
                <p className="mt-0.5 text-xs text-slate-500">{user.soDienThoai || "Chưa có số điện thoại"}</p>
              </td>
              <td className="px-3 py-2.5">
                <div className="flex flex-wrap gap-1.5">
                  {(Array.isArray(user.vaiTro) ? user.vaiTro : []).length ? user.vaiTro.map((role) => (
                    <span key={role} className="rounded bg-sky-50 px-2 py-1 text-xs font-semibold text-sky-700">{roleLabel(role)}</span>
                  )) : <span className="text-xs text-slate-400">Chưa phân vai trò</span>}
                </div>
              </td>
              <td className="px-3 py-2.5 text-center">
                <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${user.hoatDong ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
                  {user.hoatDong ? "Hoạt động" : "Đã khóa"}
                </span>
              </td>
              <td className="px-3 py-2.5">
                <div className="flex items-center justify-center gap-1.5">
                  <button type="button" onClick={() => onEdit(user)} className="rounded-lg border border-slate-200 p-2 text-sky-700 hover:bg-sky-50" title="Sửa thông tin">
                    <Pencil size={15} />
                  </button>
                  <button type="button" onClick={() => AdminAuthController.resetPassword(user.id, user.tenDangNhap)} className="rounded-lg border border-slate-200 p-2 text-amber-700 hover:bg-amber-50" title="Đặt lại mật khẩu">
                    <KeyRound size={15} />
                  </button>
                  <button type="button" onClick={() => AdminAuthController.toggleLock(user.id, user.hoatDong, loadData)} className={`rounded-lg border border-slate-200 p-2 ${user.hoatDong ? "text-rose-700 hover:bg-rose-50" : "text-emerald-700 hover:bg-emerald-50"}`} title={user.hoatDong ? "Khóa tài khoản" : "Mở khóa tài khoản"}>
                    {user.hoatDong ? <Lock size={15} /> : <Unlock size={15} />}
                  </button>
                </div>
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
}
