// src/App.js
import React, { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  Outlet,
} from "react-router-dom";

// ===== Pages =====
import AuthPage from "./pages/AuthPage.jsx";
import StaffDashboard from "./pages/StaffDashboard.jsx";
import TaiKhoanCaNhan from "./pages/TaiKhoanCaNhan.jsx";
import BaoCao from "./pages/BaoCao.jsx";

// ===== Bác sĩ =====
import BacSi from "./pages/bacsi/BacSi.jsx";

// =====Thực hiện Cận lâm sàng =====
import ThucHienDVKT from "./pages/thuchiendvkt/ThucHienDVKT.jsx";

// ===== Tiếp đón =====
import TiepDon from "./pages/TiepDon.jsx";
import ChiDinhKham from "./pages/ChiDinhKham.jsx";
import TiepDonDanhSach from "./pages/TiepDonDanhSach.jsx";

// ===== Thu ngân =====
import ThuNgan from "./pages/ThuNgan.jsx";
import ThuNganDetail from "./pages/ThuNganDetail.jsx";

// ===== Admin =====
import AdminLayout from "./layouts/AdminLayout.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";
import { AdminUserPage } from "./pages/admin/users";
import AdminPermissionPage from "./pages/admin/permission/AdminPermissionPage";
import DanhMucDichVu from "./pages/admin/dvkt/DanhMucDichVu.jsx";
import ThuocPage from "./pages/admin/thuoc/index.jsx";
import DanhMucDVKT from "./pages/admin/danhmucdvkt/index.jsx";
import OperationsCenterPage from "./pages/admin/OperationsCenterPage.jsx";
import { usePermission } from "./hooks/UsePermission";



// =======================================================
// 🧩 APP CHÍNH
// =======================================================
export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionExpired, setSessionExpired] = useState({ open: false, message: "" });

  // ✅ Đọc userInfo từ localStorage
  useEffect(() => {
    const stored = localStorage.getItem("userInfo");
    if (stored) {
      try {
        const user = JSON.parse(stored);
        setCurrentUser(user);
      } catch {
        localStorage.removeItem("userInfo");
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const handleSessionExpired = (event) => {
      if (window.location.pathname === "/login") return;
      setSessionExpired({
        open: true,
        message:
          event?.detail?.message ||
          "Phiên làm việc của bạn đã hết hạn. Vui lòng đăng nhập lại để tiếp tục.",
      });
    };

    window.addEventListener("tiuv:session-expired", handleSessionExpired);
    return () => window.removeEventListener("tiuv:session-expired", handleSessionExpired);
  }, []);

  const returnToLogin = () => {
    [localStorage, sessionStorage].forEach((storage) => {
      storage.removeItem("access_token");
      storage.removeItem("token");
      storage.removeItem("jwt");
      storage.removeItem("userInfo");
    });
    setCurrentUser(null);
    setSessionExpired({ open: false, message: "" });
    window.location.assign("/login");
  };

  if (loading) return <div className="p-8 text-center">Đang tải...</div>;

  return (
    <Router>
      <ToastContainer
        containerId="app-global"
        position="top-right"
        autoClose={2600}
        newestOnTop
        closeOnClick
        pauseOnHover
      />
      <Routes>
        {/* ===================== ĐĂNG NHẬP + ĐĂNG KÝ ===================== */}
        <Route path="/login" element={<AuthPage onLoginSuccess={setCurrentUser} />} />
        <Route path="/register" element={<AuthPage onLoginSuccess={setCurrentUser} />} />

        {/* ===================== DASHBOARD NHÂN VIÊN ===================== */}
        <Route path="/dashboard" element={<RequireLogin user={currentUser} />}>
          <Route index element={<StaffDashboard />} />
          <Route path="tai-khoan" element={<TaiKhoanCaNhan />} />
        </Route>

        <Route
          path="/bao-cao"
          element={<RequireFeatureView user={currentUser} feature="BAO_CAO" />}
        >
          <Route index element={<BaoCao />} />
        </Route>

        {/* ===================== BÁC SĨ ===================== */}
        <Route
          path="/bac-si"
          element={<RequireFeatureView user={currentUser} feature="KHAM_BENH" />}
        >
        <Route index element={<BacSi />} />
        </Route>

        <Route
  path="/can-lam-sang"
  element={<RequireFeatureView user={currentUser} feature="DVKT" />}
>
  <Route index element={<ThucHienDVKT />} />
</Route>

        {/* ===================== TIẾP ĐÓN ===================== */}
        <Route
          path="/tiep-don"
          element={<RequireFeatureView user={currentUser} feature="TIEP_DON" />}
        >
          <Route index element={<Navigate to="/tiep-don/nhap" replace />} />
          <Route path="nhap" element={<TiepDon viewMode="form" />} />
          <Route path="danh-sach" element={<TiepDonDanhSach initialTab="today" />} />
          <Route path="huy" element={<TiepDonDanhSach initialTab="cancelled" />} />
          <Route path="chi-dinh" element={<ChiDinhKham />} />
        </Route>

        {/* ===================== THU NGÂN ===================== */}
        <Route
          path="/thu-ngan"
          element={<RequireFeatureView user={currentUser} feature="THANH_TOAN" />}
        >
          <Route index element={<ThuNgan />} />
          <Route path="detail/:maHoaDon" element={<ThuNganDetail />} />
        </Route>

        {/* ===================== ADMIN ===================== */}
        <Route
          path="/admin"
          element={<RequireRole user={currentUser} role="ADMIN" />}
        >
          <Route element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="users" element={<AdminUserPage />} />
            <Route path="roles" element={<AdminPermissionPage />} />
            <Route path="logs" element={<OperationsCenterPage />} />
            <Route path="system" element={<div>Trang cấu hình hệ thống</div>} />

            {/* ✅ Danh mục DVKT */}
            <Route path="danh-muc-dv" element={<DanhMucDichVu />} />
            {/* ✅ Danh mục Thuốc */}
            <Route path="danh-muc-thuoc" element={<ThuocPage />} />
             {/* ✅ Danh mục Thuốc */}
            <Route path="danh-muc-dvkt" element={<DanhMucDVKT />} />
          </Route>
        </Route>

        {/* ===================== REDIRECT MẶC ĐỊNH ===================== */}
        <Route
          path="*"
          element={
            currentUser ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
      </Routes>
      {sessionExpired.open && (
        <SessionExpiredModal message={sessionExpired.message} onConfirm={returnToLogin} />
      )}
    </Router>
  );
}

function SessionExpiredModal({ message, onConfirm }) {
  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/55 px-4 backdrop-blur-sm"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="session-expired-title"
    >
      <div className="w-full max-w-lg rounded-xl border border-amber-200 bg-white p-7 shadow-2xl">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
            <AlertTriangle size={25} />
          </div>
          <div className="min-w-0">
            <h2 id="session-expired-title" className="text-xl font-bold text-slate-900">
              Phiên đăng nhập đã hết hạn
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-700">{message}</p>
            <p className="mt-2 text-sm text-slate-500">
              Dữ liệu chưa lưu trên màn hình có thể cần nhập lại sau khi đăng nhập.
            </p>
          </div>
        </div>
        <div className="mt-6 flex justify-end border-t border-slate-200 pt-5">
          <button
            type="button"
            onClick={onConfirm}
            autoFocus
            className="rounded-lg bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-2"
          >
            Đăng nhập lại
          </button>
        </div>
      </div>
    </div>
  );
}

const hasAccessToken = () =>
  !!(
    localStorage.getItem("access_token") ||
    localStorage.getItem("token") ||
    localStorage.getItem("jwt") ||
    sessionStorage.getItem("access_token") ||
    sessionStorage.getItem("token")
  );

// =======================================================
// 🧩 Component bảo vệ route (RequireLogin)
// =======================================================
function RequireLogin({ user }) {
  if (!user || !hasAccessToken()) return <Navigate to="/login" replace />;
  return <Outlet />;
}

// =======================================================
// 🧩 Component bảo vệ route theo vai trò
// =======================================================
function RequireRole({ user, role }) {
  if (!user || !hasAccessToken()) return <Navigate to="/login" replace />;
  const hasRole = user.roles?.includes(role);
  if (!hasRole) {
    return (
      <div className="p-8 text-center text-red-500 font-semibold">
        ⚠️ Bạn không có quyền truy cập vào trang này.
      </div>
    );
  }
  return <Outlet />;
}

function RequireFeatureView({ user, feature }) {
  const permission = usePermission(feature);

  if (!user || !hasAccessToken()) return <Navigate to="/login" replace />;
  if (permission.loading) return <div className="p-8 text-center">Đang kiểm tra quyền...</div>;
  if (!permission.canView) {
    return (
      <div className="p-8 text-center text-red-500 font-semibold">
        ⚠️ Bạn không có quyền truy cập vào trang này.
      </div>
    );
  }

  return <Outlet />;
}
