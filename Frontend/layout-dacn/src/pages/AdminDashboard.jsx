import React from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Activity, Settings, Shield, Users } from "lucide-react";

export default function AdminDashboard() {
  const navigate = useNavigate();

  const cards = [
    {
      title: "Quản lý người dùng",
      icon: <Users size={40} className="text-sky-600" />,
      desc: "Tạo, sửa, khóa, mở khóa và phân quyền người dùng hệ thống.",
      path: "/admin/users",
      glow: "hover:shadow-[0_0_25px_3px_rgba(56,189,248,0.3)]",
    },
    {
      title: "Vai trò & phân quyền",
      icon: <Shield size={40} className="text-pink-500" />,
      desc: "Quản lý vai trò, quyền hạn và kiểm soát truy cập chức năng.",
      path: "/admin/roles",
      glow: "hover:shadow-[0_0_25px_3px_rgba(244,114,182,0.3)]",
    },
    {
      title: "Danh mục dịch vụ",
      icon: <Activity size={40} className="text-emerald-500" />,
      desc: "Quản lý nhóm dịch vụ, dịch vụ và bảng giá khám.",
      path: "/admin/danh-muc-dv",
      glow: "hover:shadow-[0_0_25px_3px_rgba(16,185,129,0.25)]",
    },
    {
      title: "Danh mục thuốc",
      icon: <Settings size={40} className="text-indigo-500" />,
      desc: "Quản lý nhóm thuốc, thuốc và bảng giá thuốc.",
      path: "/admin/danh-muc-thuoc",
      glow: "hover:shadow-[0_0_25px_3px_rgba(99,102,241,0.25)]",
    },
    {
      title: "Danh mục DVKT",
      icon: <Settings size={40} className="text-violet-500" />,
      desc: "Quản lý nhóm DVKT, kỹ thuật và bảng giá kỹ thuật.",
      path: "/admin/danh-muc-dvkt",
      glow: "hover:shadow-[0_0_25px_3px_rgba(139,92,246,0.28)]",
    },
  ];

  return (
    <div className="min-h-[80vh] flex flex-col items-center px-4 pb-16 pt-14">
      <div className="mb-8 text-center">
        <h1 className="app-heading text-3xl">Admin Dashboard</h1>
        <p className="app-subtext mt-2">
          Điều hành người dùng, phân quyền và toàn bộ danh mục trong hệ thống tiuv clinic.
        </p>
      </div>

      <div className="grid w-full max-w-6xl grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <motion.div
            key={card.path}
            className={`app-card app-card-hover relative cursor-pointer rounded-2xl p-6 transition-all duration-300 ${card.glow}`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate(card.path)}
          >
            <div className="flex flex-col items-start gap-3">
              {card.icon}
              <h2 className="text-lg font-semibold text-sky-800">{card.title}</h2>
              <p className="text-sm leading-snug text-slate-600">{card.desc}</p>
            </div>

            <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-t from-white/40 to-transparent opacity-0 transition-opacity duration-300 hover:opacity-100" />
          </motion.div>
        ))}
      </div>
    </div>
  );
}
