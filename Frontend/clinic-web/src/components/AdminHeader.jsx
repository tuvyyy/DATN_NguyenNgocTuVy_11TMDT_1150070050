import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Crown, LogOut } from "lucide-react";

const menus = [
  ["/admin", "Bảng điều hành"], ["/admin/users", "Người dùng"], ["/admin/roles", "Vai trò"],
  ["/admin/danh-muc-dv", "Dịch vụ"], ["/admin/danh-muc-thuoc", "Thuốc"],
  ["/admin/danh-muc-dvkt", "DVKT"], ["/admin/logs", "Vận hành"], ["/admin/system", "Cấu hình"],
];

export default function AdminHeader() {
  const location = useLocation();
  const navigate = useNavigate();
  const logout = () => { localStorage.removeItem("userInfo"); localStorage.removeItem("access_token"); navigate("/login", { replace: true }); };
  return <header className="sticky top-0 z-50 shrink-0 border-b border-sky-100 bg-white/90 shadow-sm backdrop-blur-md"><div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-3">
    <div className="flex shrink-0 items-center gap-2 text-sky-700"><img src={`${process.env.PUBLIC_URL}/logo-clinic.svg`} alt="tiuv clinic" className="h-8 w-8" /><span className="text-lg font-semibold">tiuv admin</span><Crown size={18} className="text-cyan-500" /></div>
    <nav className="flex items-center gap-1 text-sm font-medium">{menus.map(([path, label]) => <Link key={path} to={path} className={`rounded-md px-3 py-2 transition ${location.pathname === path ? "bg-cyan-100 text-cyan-800" : "text-slate-600 hover:bg-sky-50 hover:text-sky-700"}`}>{label}</Link>)}</nav>
    <button onClick={logout} className="inline-flex shrink-0 items-center gap-1 rounded-md border border-rose-200 bg-rose-50 px-3 py-1.5 text-sm font-medium text-rose-600 hover:bg-rose-100"><LogOut size={15} /> Đăng xuất</button>
  </div></header>;
}
