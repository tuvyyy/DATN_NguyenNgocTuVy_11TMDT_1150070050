import React from "react";
import { Link } from "react-router-dom";
import { Activity, ArrowRight, BarChart3, ClipboardList, Pill, ShieldCheck, Stethoscope, Users } from "lucide-react";
import "./AdminDashboard.css";

const people = [
  { path: "/admin/users", title: "Người dùng", text: "Tài khoản và thông tin nhân viên", icon: Users },
  { path: "/admin/roles", title: "Vai trò & phân quyền", text: "Quyền truy cập theo công việc", icon: ShieldCheck },
];
const catalogs = [
  { path: "/admin/danh-muc-dv", title: "Dịch vụ khám", text: "Nhóm dịch vụ và bảng giá", icon: Stethoscope },
  { path: "/admin/danh-muc-thuoc", title: "Thuốc", text: "Danh mục thuốc và giá bán", icon: Pill },
  { path: "/admin/danh-muc-dvkt", title: "Kỹ thuật cận lâm sàng", text: "Kỹ thuật, nhóm và bảng giá", icon: ClipboardList },
];

function WorkGroup({ title, description, items }) {
  return <section className="ao-group">
    <header><h2>{title}</h2><p>{description}</p></header>
    <div className="ao-work-list">{items.map(({ path, title: label, text, icon: Icon }) =>
      <Link className="ao-work-item" key={path} to={path}>
        <span className="ao-work-icon"><Icon size={20} aria-hidden="true" /></span>
        <span><strong>{label}</strong><small>{text}</small></span>
        <ArrowRight size={16} className="ao-item-arrow" aria-hidden="true" />
      </Link>)}
    </div>
  </section>;
}

export default function AdminDashboard() {
  return <div className="admin-overview">
    <header className="ao-heading"><span>TIUV CLINIC / QUẢN TRỊ</span><h1>Tổng quan</h1><p>Chọn nhóm công việc để bắt đầu.</p></header>
    <section className="ao-priority" aria-label="Báo cáo và vận hành">
      <Link className="ao-report-card" to="/admin/bao-cao">
        <span className="ao-feature-icon"><BarChart3 size={27} aria-hidden="true" /></span>
        <div><span className="ao-category">BÁO CÁO & PHÂN TÍCH</span><h2>Lượt khám & dự báo</h2><p>Theo dõi lượt khám và dự kiến nhu cầu sắp tới.</p></div>
        <span className="ao-card-action">Xem báo cáo<ArrowRight size={16} aria-hidden="true" /></span>
      </Link>
      <Link className="ao-operations-card" to="/admin/logs">
        <span className="ao-feature-icon"><Activity size={24} aria-hidden="true" /></span>
        <div><span className="ao-category">VẬN HÀNH</span><h2>Theo dõi hệ thống</h2><p>Thông báo, yêu cầu hỗ trợ và nhật ký thao tác.</p></div>
        <ArrowRight size={19} className="ao-operations-arrow" aria-hidden="true" />
      </Link>
    </section>
    <div className="ao-work-groups">
      <WorkGroup title="Nhân sự & quyền truy cập" description="Quản lý ai được sử dụng hệ thống." items={people} />
      <WorkGroup title="Danh mục phòng khám" description="Cập nhật dữ liệu dùng trong các nghiệp vụ." items={catalogs} />
    </div>
  </div>;
}
