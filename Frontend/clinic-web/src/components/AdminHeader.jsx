import React, { useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ChevronDown, LogOut } from "lucide-react";
import "./AdminHeader.css";

const catalog = [["/admin/danh-muc-dv", "Dịch vụ khám"], ["/admin/danh-muc-thuoc", "Thuốc"], ["/admin/danh-muc-dvkt", "Kỹ thuật cận lâm sàng"]];
const people = [["/admin/users", "Người dùng"], ["/admin/roles", "Vai trò và quyền"]];

function NavGroup({ label, items, pathname }) {
  const ref = useRef(null);
  const active = items.some(([path]) => pathname === path);
  useEffect(() => {
    const close = event => { if (!ref.current?.contains(event.target)) ref.current?.removeAttribute("open"); };
    document.addEventListener("pointerdown", close);
    document.addEventListener("focusin", close);
    return () => { document.removeEventListener("pointerdown", close); document.removeEventListener("focusin", close); };
  }, []);
  useEffect(() => { ref.current?.removeAttribute("open"); }, [pathname]);
  return <details ref={ref} className={`admin-nav-group${active ? " is-active" : ""}`} onKeyDown={event => {
    if (event.key === "Escape") { ref.current?.removeAttribute("open"); ref.current?.querySelector("summary")?.focus(); }
  }}>
    <summary>{label}<ChevronDown size={13} aria-hidden="true" /></summary>
    <div className="admin-nav-popup">{items.map(([path, title]) => <Link key={path} to={path} aria-current={pathname === path ? "page" : undefined} onClick={() => ref.current?.removeAttribute("open")}>{title}</Link>)}</div>
  </details>;
}

export default function AdminHeader() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const logout = () => { localStorage.removeItem("userInfo"); localStorage.removeItem("access_token"); navigate("/login", { replace: true }); };
  const item = (path, label) => <Link to={path} aria-current={pathname === path ? "page" : undefined} className={`admin-nav-link${pathname === path ? " is-active" : ""}`}>{label}</Link>;
  return <header className="admin-header">
    <Link className="admin-brand" to="/admin" aria-label="tiuv admin"><img src={`${process.env.PUBLIC_URL}/logo-clinic.svg`} alt="" /><span>tiuv admin</span></Link>
    <nav className="admin-navigation" aria-label="Điều hướng quản trị">
      {item("/admin", "Tổng quan")}
      {item("/admin/bao-cao", "Báo cáo")}
      <NavGroup label="Danh mục" items={catalog} pathname={pathname} />
      <NavGroup label="Nhân sự" items={people} pathname={pathname} />
      {item("/admin/logs", "Vận hành")}
    </nav>
    <button type="button" className="admin-logout" onClick={logout} aria-label="Đăng xuất"><LogOut size={15} aria-hidden="true" /><span>Đăng xuất</span></button>
  </header>;
}
