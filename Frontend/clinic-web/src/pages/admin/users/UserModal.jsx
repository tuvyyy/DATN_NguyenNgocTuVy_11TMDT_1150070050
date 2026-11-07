import React from "react";
import { Save, X } from "lucide-react";
import AdminAuthController from "../../../controllers/AdminAuthController";

const ROLE_NAMES = {
  ADMIN: "Quản trị viên",
  BAC_SI: "Bác sĩ",
  TIEP_DON: "Nhân viên tiếp đón",
  THU_NGAN: "Nhân viên thu ngân",
  KY_THUAT_VIEN: "Kỹ thuật viên cận lâm sàng",
};

export default function UserModal({ isEdit, formData, setFormData, roles, onClose, loadData }) {
  const toggleRole = (roleName) => {
    setFormData((current) => ({
      ...current,
      vaiTro: current.vaiTro.includes(roleName)
        ? current.vaiTro.filter((role) => role !== roleName)
        : [...current.vaiTro, roleName],
    }));
  };

  const handleSave = async () => {
    const roleIds = formData.vaiTro
      .map((roleName) => roles.find((role) => role.ten === roleName)?.id)
      .filter(Boolean);
    const dto = {
      hoTen: formData.hoTen,
      tenDangNhap: formData.tenDangNhap,
      matKhau: formData.matKhau || "Abcd@1234",
      email: formData.email,
      soDienThoai: formData.soDienThoai,
      chucDanh: formData.chucDanh,
      khoaPhong: formData.khoaPhong,
      vaiTroIds: roleIds,
      hoatDong: formData.hoatDong ?? true,
    };

    if (isEdit) await AdminAuthController.editUser(formData.id, dto, loadData);
    else await AdminAuthController.addUser(dto, loadData);
    onClose();
  };

  const fieldClass = "h-10 w-full rounded-lg border border-slate-300 px-3 text-sm text-slate-800 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 px-4">
      <div className="w-full max-w-2xl rounded-lg bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900">{isEdit ? "Cập nhật người dùng" : "Thêm người dùng"}</h3>
            <p className="mt-1 text-sm text-slate-500">Thông tin tài khoản và vai trò nghiệp vụ.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Đóng"><X size={19} /></button>
        </header>

        <div className="grid grid-cols-2 gap-4 p-5">
          <label className="text-sm font-medium text-slate-700">Họ và tên
            <input className={`${fieldClass} mt-1.5`} value={formData.hoTen} onChange={(event) => setFormData({ ...formData, hoTen: event.target.value })} />
          </label>
          <label className="text-sm font-medium text-slate-700">Tên đăng nhập
            <input disabled={isEdit} className={`${fieldClass} mt-1.5 disabled:bg-slate-100 disabled:text-slate-500`} value={formData.tenDangNhap} onChange={(event) => setFormData({ ...formData, tenDangNhap: event.target.value })} />
          </label>
          <label className="text-sm font-medium text-slate-700">Email
            <input type="email" className={`${fieldClass} mt-1.5`} value={formData.email} onChange={(event) => setFormData({ ...formData, email: event.target.value })} />
          </label>
          <label className="text-sm font-medium text-slate-700">Số điện thoại
            <input className={`${fieldClass} mt-1.5`} value={formData.soDienThoai} onChange={(event) => setFormData({ ...formData, soDienThoai: event.target.value })} />
          </label>
          <label className="text-sm font-medium text-slate-700">Chức danh
            <input className={`${fieldClass} mt-1.5`} value={formData.chucDanh || ""} onChange={(event) => setFormData({ ...formData, chucDanh: event.target.value })} />
          </label>
          <label className="text-sm font-medium text-slate-700">Khoa/Phòng
            <input className={`${fieldClass} mt-1.5`} value={formData.khoaPhong || ""} onChange={(event) => setFormData({ ...formData, khoaPhong: event.target.value })} />
          </label>

          <div className="col-span-2 border-t border-slate-200 pt-4">
            <p className="text-sm font-bold text-slate-900">Vai trò được cấp</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {roles.map((role) => {
                const active = formData.vaiTro.includes(role.ten);
                return (
                  <label key={role.id} className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 ${active ? "border-sky-400 bg-sky-50" : "border-slate-200 hover:border-sky-200"}`}>
                    <input type="checkbox" checked={active} onChange={() => toggleRole(role.ten)} className="h-4 w-4 accent-sky-600" />
                    <span className="text-sm font-semibold text-slate-800">{ROLE_NAMES[role.ten] || role.ten}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        <footer className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4">
          <button type="button" onClick={onClose} className="h-10 rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50">Hủy</button>
          <button type="button" onClick={handleSave} className="inline-flex h-10 items-center gap-2 rounded-lg bg-sky-600 px-4 text-sm font-semibold text-white hover:bg-sky-700"><Save size={16} /> Lưu người dùng</button>
        </footer>
      </div>
    </div>
  );
}
