import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  CheckCircle2,
  ClipboardCheck,
  Eye,
  EyeOff,
  HeartPulse,
  Info,
  Loader2,
  Lock,
  Mail,
  Phone,
  Plus,
  ShieldCheck,
  User,
  UserPlus,
} from "lucide-react";

const AUTH_API_BASES = ["http://localhost:5006", "https://localhost:7007"];

const requestAuthApi = async (method, path, data, stopOnClientError = true) => {
  let lastErr;

  for (const baseUrl of AUTH_API_BASES) {
    try {
      return await axios({
        method,
        url: `${baseUrl}${path}`,
        data,
        timeout: 8000,
      });
    } catch (err) {
      // Với lỗi client (4xx), mặc định dừng để hiển thị đúng lỗi nghiệp vụ từ BE
      if (stopOnClientError && err?.response?.status >= 400 && err?.response?.status < 500) {
        throw err;
      }
      lastErr = err;
    }
  }

  throw lastErr;
};

const TEXT = {
  pageTitle: "Đăng ký tài khoản",
  subtitle: "Tạo tài khoản mới để tham gia hệ thống",
  fullName: "Họ và tên",
  accountCode: "Mã nhân viên",
  email: "Email",
  phone: "Số điện thoại",
  password: "Mật khẩu",
  confirmPassword: "Xác nhận mật khẩu",
  role: "Vai trò",
  rolePlaceholder: "-- Chọn vai trò --",
  roleLoading: "Đang tải vai trò...",
  register: "Đăng ký",
  registering: "Đang đăng ký...",
  hasAccount: "Đã có tài khoản? ",
  loginNow: "Đăng nhập ngay",
  required: "*",
  successTitle: "Đăng ký thành công",
  successMessage: "Tài khoản đã được tạo. Liên hệ quản trị viên để được cấp vai trò sử dụng.",
  failedTitle: "Đăng ký không thành công",
  emptyFields: "Vui lòng nhập đầy đủ thông tin.",
  passwordMismatch: "Mật khẩu xác nhận không khớp.",
  marketingLine1: "Bắt đầu hành trình",
  marketingLine2: "quản lý phòng khám thông minh",
  marketingDescription: "Tạo tài khoản để tiếp cận hệ thống quản lý bệnh nhân, lịch khám và quy trình điều trị hiện đại.",
  featureTeam: "Làm việc nhóm",
  featureTeamDesc: "Phối hợp tiếp đón, bác sĩ và thu ngân",
  featureSecure: "Bảo mật",
  featureSecureDesc: "Phân quyền và kiểm soát truy cập rõ ràng",
  footerBrand: "© 2026 TIUV Clinic",
  footerNote: "Hệ thống quản lý phòng khám",
};

const NOTICE_STYLE = {
  success: {
    icon: CheckCircle2,
    className: "border-emerald-200 bg-emerald-50 text-emerald-800",
    iconClassName: "text-emerald-600",
  },
  error: {
    icon: AlertCircle,
    className: "border-red-200 bg-red-50 text-red-800",
    iconClassName: "text-red-600",
  },
  info: {
    icon: Info,
    className: "border-sky-200 bg-sky-50 text-sky-800",
    iconClassName: "text-sky-600",
  },
};

function RegisterNotice({ notice }) {
  const meta = NOTICE_STYLE[notice.type] || NOTICE_STYLE.info;
  const Icon = meta.icon;

  return (
    <div className={`reg-notice flex items-start gap-3 rounded-xl border px-3.5 py-3 text-sm ${meta.className}`}>
      <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${meta.iconClassName}`} />
      <div>
        <p className="font-semibold">{notice.title}</p>
        <p className="mt-0.5 leading-relaxed">{notice.message}</p>
      </div>
    </div>
  );
}

const DangKy = ({ onSwitchPage }) => {
  const navigate = useNavigate();
  const [hoTen, setHoTen] = useState("");
  const [tenDangNhap, setTenDangNhap] = useState("");
  const [matKhau, setMatKhau] = useState("");
  const [xacNhan, setXacNhan] = useState("");
  const [email, setEmail] = useState("");
  const [soDienThoai, setSoDienThoai] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState({ type: "", title: "", message: "" });
  const logoSrc = `${process.env.PUBLIC_URL}/logo-clinic.svg`;

  // 🔄 Lấy danh sách vai trò từ API

  const handleSwitchLogin = () => {
    if (typeof onSwitchPage === "function") {
      onSwitchPage();
      return;
    }
    navigate("/login");
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setNotice({ type: "", title: "", message: "" });

    if (!tenDangNhap || !matKhau || !xacNhan) {
      setNotice({ type: "error", title: TEXT.failedTitle, message: TEXT.emptyFields });
      return;
    }
    if (matKhau !== xacNhan) {
      setNotice({ type: "error", title: TEXT.failedTitle, message: TEXT.passwordMismatch });
      return;
    }

    const body = {
      hoTen,
      tenDangNhap,
      matKhau,
      email,
      soDienThoai,
      vaiTroIds: [],
    };

    try {
      setLoading(true);
      const res = await requestAuthApi("post", "/api/Auth/register", body, true);
      console.log("✅ Đăng ký thành công:", res.data);

      setNotice({ type: "success", title: TEXT.successTitle, message: TEXT.successMessage });

      // Reset form
      setHoTen("");
      setTenDangNhap("");
      setMatKhau("");
      setXacNhan("");
      setEmail("");
      setSoDienThoai("");

      // ⏳ Sau 2 giây quay lại trang đăng nhập
      setTimeout(() => {
        handleSwitchLogin();
      }, 2000);
    } catch (err) {
      console.error("❌ Lỗi đăng ký:", err);
      const msg =
        err.response?.data?.message ||
        err.response?.data ||
        "Đăng ký thất bại, vui lòng thử lại!";
      setNotice({ type: "error", title: TEXT.failedTitle, message: typeof msg === "string" ? msg : TEXT.failedTitle });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="reg-page relative flex min-h-screen flex-col overflow-hidden lg:flex-row">
      {/* ==================== FORM SECTION (LEFT) ==================== */}
      <section className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-gradient-to-br from-[#eaf6fb] to-[#d7ecfb] px-6 py-8 lg:basis-[56%] xl:basis-[58%]">
        {/* Aurora background */}
        <div className="pointer-events-none absolute inset-[-15%] reg-aurora">
          <span className="reg-blob reg-blob-left-1" />
          <span className="reg-blob reg-blob-left-2" />
          <span className="reg-blob reg-blob-left-3" />
          <span className="reg-halo" />
          <span className="reg-bubble reg-bubble-1" />
          <span className="reg-bubble reg-bubble-2" />
          <span className="reg-bubble reg-bubble-3" />
          <span className="reg-bubble reg-bubble-4" />
          <span className="reg-bubble reg-bubble-5" />
          <Plus aria-hidden="true" className="reg-medical-icon reg-medical-icon-1" />
          <ShieldCheck aria-hidden="true" className="reg-medical-icon reg-medical-icon-2" />
          <HeartPulse aria-hidden="true" className="reg-medical-icon reg-medical-icon-3" />
        </div>

        {/* Form card */}
        <div className="reg-form-card relative z-10 w-full max-w-[600px] rounded-[20px] bg-white px-8 py-8 shadow-[0_20px_50px_rgba(15,40,70,0.08)] sm:px-11 sm:py-10">
          {/* Logo & Title */}
          <div className="mb-6 flex flex-col items-center text-center">
            <img
              src={logoSrc}
              alt="tiuv clinic"
              className="reg-logo h-[64px] w-[64px] rounded-[16px] border border-sky-100 bg-white p-2 shadow-sm"
            />
            <p className="mt-[14px] text-sm italic text-[#5b6b7c]">{TEXT.subtitle}</p>
            <h2 className="mt-1 text-[28px] font-extrabold tracking-tight text-[#163a5f]">
              {TEXT.pageTitle}
            </h2>
          </div>

          <form onSubmit={handleRegister}>
            {/* 2-column grid for compact layout */}
            <div className="grid grid-cols-1 gap-x-4 gap-y-0 sm:grid-cols-2">
              {/* Họ và tên */}
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-[#163a5f]">
                  {TEXT.fullName}
                </label>
                <div className="reg-input-group">
                  <User size={17} className="shrink-0 text-[#7b94ab]" />
                  <input
                    type="text"
                    placeholder="Nguyễn Văn A"
                    value={hoTen}
                    onChange={(e) => setHoTen(e.target.value)}
                    className="min-w-0 flex-1 border-none bg-transparent text-[14px] text-[#163a5f] outline-none placeholder:text-[#9aa9ba]"
                  />
                </div>
              </div>

              {/* Mã nhân viên */}
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-[#163a5f]">
                  {TEXT.accountCode} <span className="text-rose-500">{TEXT.required}</span>
                </label>
                <div className="reg-input-group">
                  <UserPlus size={17} className="shrink-0 text-[#7b94ab]" />
                  <input
                    type="text"
                    placeholder="VD: NV001"
                    value={tenDangNhap}
                    onChange={(e) => setTenDangNhap(e.target.value)}
                    className="min-w-0 flex-1 border-none bg-transparent text-[14px] text-[#163a5f] outline-none placeholder:text-[#9aa9ba]"
                    required
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-[#163a5f]">
                  {TEXT.email}
                </label>
                <div className="reg-input-group">
                  <Mail size={17} className="shrink-0 text-[#7b94ab]" />
                  <input
                    type="email"
                    placeholder="example@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="min-w-0 flex-1 border-none bg-transparent text-[14px] text-[#163a5f] outline-none placeholder:text-[#9aa9ba]"
                  />
                </div>
              </div>

              {/* SĐT */}
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-[#163a5f]">
                  {TEXT.phone}
                </label>
                <div className="reg-input-group">
                  <Phone size={17} className="shrink-0 text-[#7b94ab]" />
                  <input
                    type="text"
                    placeholder="090xxxxxxx"
                    value={soDienThoai}
                    onChange={(e) => setSoDienThoai(e.target.value)}
                    className="min-w-0 flex-1 border-none bg-transparent text-[14px] text-[#163a5f] outline-none placeholder:text-[#9aa9ba]"
                  />
                </div>
              </div>

              {/* Mật khẩu */}
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-[#163a5f]">
                  {TEXT.password} <span className="text-rose-500">{TEXT.required}</span>
                </label>
                <div className="reg-input-group">
                  <Lock size={17} className="shrink-0 text-[#7b94ab]" />
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Nhập mật khẩu"
                    value={matKhau}
                    onChange={(e) => setMatKhau(e.target.value)}
                    className="min-w-0 flex-1 border-none bg-transparent text-[14px] text-[#163a5f] outline-none placeholder:text-[#9aa9ba]"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="flex shrink-0 rounded-md bg-transparent p-0.5 text-[#7b94ab] hover:text-[#1f6fd6]"
                    aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Xác nhận mật khẩu */}
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-[#163a5f]">
                  {TEXT.confirmPassword} <span className="text-rose-500">{TEXT.required}</span>
                </label>
                <div className="reg-input-group">
                  <Lock size={17} className="shrink-0 text-[#7b94ab]" />
                  <input
                    type={showConfirm ? "text" : "password"}
                    placeholder="Nhập lại mật khẩu"
                    value={xacNhan}
                    onChange={(e) => setXacNhan(e.target.value)}
                    className="min-w-0 flex-1 border-none bg-transparent text-[14px] text-[#163a5f] outline-none placeholder:text-[#9aa9ba]"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((prev) => !prev)}
                    className="flex shrink-0 rounded-md bg-transparent p-0.5 text-[#7b94ab] hover:text-[#1f6fd6]"
                    aria-label={showConfirm ? "Ẩn xác nhận" : "Hiện xác nhận"}
                  >
                    {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            </div>

            {/* Vai trò — full width */}
          <p className="mt-2 text-sm text-slate-600">Tài khoản đăng ký mới cần được quản trị viên cấp vai trò trước khi sử dụng các phân hệ.</p>

            {/* Notice */}
            {notice.message && (
              <div className="mt-3">
                <RegisterNotice notice={notice} />
              </div>
            )}

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading}
              className="reg-submit mt-5 flex w-full items-center justify-center gap-2 rounded-[10px] border-none px-4 py-3.5 text-base font-bold text-white disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading && <Loader2 className="h-5 w-5 animate-spin" />}
              {loading ? TEXT.registering : TEXT.register}
            </button>

            {/* Switch to login */}
            <div className="mt-4 text-center text-sm text-[#5b6b7c]">
              <span>{TEXT.hasAccount}</span>
              <button
                type="button"
                onClick={handleSwitchLogin}
                className="reg-link bg-transparent font-bold text-[#1f6fd6] hover:underline"
              >
                {TEXT.loginNow}
              </button>
            </div>
          </form>

          {/* Footer */}
          <div className="reg-mini-footer mt-6 flex flex-col items-center gap-1 border-t border-sky-100 pt-3 text-center text-xs text-[#6b7c8f] sm:flex-row sm:justify-center sm:gap-2">
            <span>{TEXT.footerBrand}</span>
            <span className="hidden text-sky-300 sm:inline">|</span>
            <span>{TEXT.footerNote}</span>
          </div>
        </div>
      </section>

      {/* ==================== MARKETING SECTION (RIGHT) ==================== */}
      <section className="relative hidden min-h-screen flex-1 items-center overflow-hidden bg-gradient-to-br from-[#dceefc] to-[#bfe0f7] px-8 xl:px-12 lg:flex">
        <span className="reg-blob reg-blob-right-1" />
        <span className="reg-blob reg-blob-right-2" />

        <div className="relative z-10 flex h-full min-h-screen w-full max-w-[520px] flex-col items-start justify-center">
          <div className="reg-badge mb-7 inline-flex w-fit items-center gap-2.5 overflow-hidden rounded-full bg-white px-5 py-2.5 text-sm font-bold tracking-wide text-[#163a5f] shadow-sm">
            <img src={logoSrc} alt="tiuv clinic" className="h-[26px] w-[26px] rounded-lg" />
            <span>TIUV CLINIC</span>
          </div>

          <h3 className="mb-[22px] text-[32px] font-extrabold leading-tight text-[#163a5f] xl:text-[34px]">
            <span className="reg-heading-line block whitespace-nowrap">{TEXT.marketingLine1}</span>
            <span className="reg-heading-line block whitespace-nowrap">{TEXT.marketingLine2}</span>
          </h3>
          <p className="reg-desc mb-9 max-w-[480px] text-base leading-relaxed text-[#5b6b7c]">
            {TEXT.marketingDescription}
          </p>

          <div className="flex flex-wrap gap-[18px]">
            <div className="reg-info-card flex min-w-[220px] items-start gap-3 rounded-[14px] border border-white/70 bg-white px-5 py-[18px] shadow-[0_10px_24px_rgba(15,40,70,0.06)]">
              <ClipboardCheck className="mt-0.5 h-[22px] w-[22px] shrink-0 text-[#1f6fd6]" />
              <div>
                <p className="mb-1 text-[17px] font-bold text-[#163a5f]">{TEXT.featureTeam}</p>
                <p className="text-[13px] leading-snug text-[#5b6b7c]">{TEXT.featureTeamDesc}</p>
              </div>
            </div>
            <div className="reg-info-card flex min-w-[220px] items-start gap-3 rounded-[14px] border border-white/70 bg-white px-5 py-[18px] shadow-[0_10px_24px_rgba(15,40,70,0.06)]">
              <ShieldCheck className="mt-0.5 h-[22px] w-[22px] shrink-0 text-[#1f6fd6]" />
              <div>
                <p className="mb-1 text-[17px] font-bold text-[#163a5f]">{TEXT.featureSecure}</p>
                <p className="text-[13px] leading-snug text-[#5b6b7c]">{TEXT.featureSecureDesc}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== STYLES ==================== */}
      <style>{`
        .reg-page {
          color: #163a5f;
          font-family: "Be Vietnam Pro", "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        }

        /* ── Aurora background ── */
        .reg-aurora {
          animation: regHueShift 22s ease-in-out infinite;
        }
        @keyframes regHueShift {
          0%, 100% { filter: hue-rotate(0deg); }
          50% { filter: hue-rotate(16deg); }
        }

        /* ── Blobs ── */
        .reg-blob {
          position: absolute;
          pointer-events: none;
          border-radius: 9999px;
          filter: blur(45px);
          opacity: 0.55;
        }
        .reg-blob-left-1 {
          width: 300px; height: 300px;
          top: 6%; left: 4%;
          background: radial-gradient(circle at 30% 30%, #a7e0f2, #5fb6e0 70%);
          animation: regMorph1 19s ease-in-out infinite;
        }
        .reg-blob-left-2 {
          width: 240px; height: 240px;
          bottom: 10%; left: 14%;
          background: radial-gradient(circle at 60% 40%, #cdeefb, #8fcdec 70%);
          animation: regMorph2 24s ease-in-out infinite;
        }
        .reg-blob-left-3 {
          width: 200px; height: 200px;
          top: 36%; left: 56%;
          background: radial-gradient(circle at 50% 50%, #bfe6f5, #73c2e6 70%);
          animation: regMorph3 17s ease-in-out infinite;
        }
        .reg-blob-right-1 {
          width: 300px; height: 300px;
          top: -80px; right: -60px;
          background: #a9d6ee;
          opacity: 0.35;
          animation: regFloat2 20s ease-in-out infinite;
        }
        .reg-blob-right-2 {
          width: 220px; height: 220px;
          right: 20%; bottom: -50px;
          background: #c7e6f8;
          opacity: 0.35;
          animation: regFloat1 17s ease-in-out infinite;
        }

        /* ── Halo ── */
        .reg-halo {
          position: absolute;
          top: 50%; left: 50%;
          width: 420px; height: 420px;
          margin: -210px 0 0 -210px;
          border-radius: 9999px;
          background: conic-gradient(from 0deg, rgba(31,111,214,.16), rgba(20,184,196,.1), rgba(31,111,214,.16));
          filter: blur(55px);
          animation: regSpinHalo 32s linear infinite;
        }

        /* ── Bubbles ── */
        .reg-bubble {
          position: absolute;
          border-radius: 9999px;
          border: 1px solid rgba(255,255,255,.78);
          background: radial-gradient(circle at 35% 30%, rgba(255,255,255,.82), rgba(255,255,255,.22) 55%, rgba(31,111,214,.08));
          box-shadow: inset -8px -10px 18px rgba(31,111,214,.08), 0 12px 34px rgba(31,111,214,.08);
          opacity: .52;
          animation: regBubbleDrift 15s ease-in-out infinite;
        }
        .reg-bubble-1 { width: 54px; height: 54px; left: 12%; top: 18%; animation-duration: 16s; }
        .reg-bubble-2 { width: 28px; height: 28px; left: 22%; bottom: 22%; animation-duration: 19s; animation-delay: -5s; }
        .reg-bubble-3 { width: 42px; height: 42px; right: 26%; top: 26%; animation-duration: 17s; animation-delay: -7s; }
        .reg-bubble-4 { width: 34px; height: 34px; right: 14%; bottom: 16%; animation-duration: 21s; animation-delay: -10s; }
        .reg-bubble-5 { width: 22px; height: 22px; left: 46%; bottom: 10%; animation-duration: 14s; animation-delay: -3s; }

        /* ── Medical icons ── */
        .reg-medical-icon {
          position: absolute;
          width: 52px; height: 52px;
          color: rgba(31,111,214,.14);
          filter: drop-shadow(0 10px 22px rgba(31,111,214,.08));
          animation: regIconFloat 14s ease-in-out infinite;
        }
        .reg-medical-icon-1 { left: 8%; bottom: 30%; --icon-rotate: -12deg; }
        .reg-medical-icon-2 { right: 17%; top: 18%; animation-delay: -4s; --icon-rotate: 10deg; }
        .reg-medical-icon-3 { right: 11%; bottom: 32%; animation-delay: -8s; --icon-rotate: -8deg; }

        /* ── Form card ── */
        .reg-form-card {
          opacity: 0;
          transform: translateY(24px);
          animation: regCardIn .7s cubic-bezier(.16,1,.3,1) .1s forwards;
        }

        /* ── Logo pulse ── */
        .reg-logo {
          animation: regLogoPulse 2.6s ease-out infinite;
        }

        /* ── Input groups ── */
        .reg-input-group {
          display: flex;
          align-items: center;
          gap: 10px;
          border: 1px solid #d7e3ee;
          border-radius: 10px;
          background: #fff;
          padding: 10px 13px;
          margin-bottom: 14px;
          transition: border-color .2s ease, box-shadow .2s ease;
        }
        .reg-input-group:focus-within {
          border-color: #3b82c4;
          box-shadow: 0 0 0 3px rgba(31,111,214,.15);
        }

        /* ── Link underline ── */
        .reg-link {
          position: relative;
          text-decoration: none;
        }
        .reg-link::after {
          content: "";
          position: absolute;
          left: 0; bottom: -2px;
          width: 0; height: 1px;
          background: #1f6fd6;
          transition: width .25s ease;
        }
        .reg-link:hover::after { width: 100%; }

        /* ── Submit button ── */
        .reg-submit {
          position: relative;
          overflow: hidden;
          background: linear-gradient(90deg, #14b8c4, #1f6fd6);
          background-size: 200% 100%;
          background-position: 0% 0%;
          transition: background-position .4s ease, transform .15s ease, box-shadow .25s ease;
        }
        .reg-submit:hover:not(:disabled) {
          background-position: 100% 0%;
          box-shadow: 0 10px 24px rgba(31,111,214,.32);
          transform: translateY(-1px);
        }
        .reg-submit:active:not(:disabled) { transform: scale(.98); }

        /* ── Notice ── */
        .reg-notice {
          transform-origin: top center;
          animation: regNoticeIn .28s ease-out both;
        }

        /* ── Footer ── */
        .reg-mini-footer {
          opacity: 0;
          animation: regFadeUp .45s ease .65s forwards;
        }

        /* ── Marketing badge ── */
        .reg-badge {
          position: relative;
          opacity: 0;
          animation: regFadeUp .6s ease .15s forwards;
        }
        .reg-badge::after {
          content: "";
          position: absolute;
          top: 0; left: -100%;
          width: 60%; height: 100%;
          background: linear-gradient(120deg, transparent, rgba(31,111,214,.18), transparent);
          animation: regShimmer 3.2s ease-in-out infinite;
        }

        /* ── Headings ── */
        .reg-heading-line {
          opacity: 0;
          transform: translateY(14px);
          animation: regFadeUp .6s ease forwards;
        }
        .reg-heading-line:nth-child(1) { animation-delay: .25s; }
        .reg-heading-line:nth-child(2) { animation-delay: .4s; }

        .reg-desc {
          opacity: 0;
          animation: regFadeUp .6s ease .55s forwards;
        }

        /* ── Info cards ── */
        .reg-info-card {
          position: relative;
          isolation: isolate;
          overflow: hidden;
          opacity: 0;
          animation: regFadeUp .6s ease forwards;
          transition: transform .25s ease, box-shadow .25s ease, border-color .25s ease;
        }
        .reg-info-card::before {
          content: "";
          position: absolute;
          inset: -60% auto auto -45%;
          width: 72%; height: 220%;
          background: linear-gradient(110deg, transparent, rgba(31,111,214,.12), transparent);
          transform: rotate(18deg) translateX(-120%);
          transition: transform .55s ease;
          z-index: 0;
        }
        .reg-info-card::after {
          content: "";
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at 18% 15%, rgba(31,111,214,.11), transparent 38%);
          opacity: .55;
          z-index: 0;
          pointer-events: none;
        }
        .reg-info-card > * { position: relative; z-index: 1; }
        .reg-info-card:nth-child(1) { animation-delay: .7s; }
        .reg-info-card:nth-child(2) { animation-delay: .85s; }
        .reg-info-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 14px 30px rgba(15,40,70,.12);
          border-color: rgba(31,111,214,.18);
        }
        .reg-info-card:hover::before { transform: rotate(18deg) translateX(250%); }

        /* ── Keyframes ── */
        @keyframes regCardIn { to { opacity: 1; transform: translateY(0); } }
        @keyframes regFadeUp { to { opacity: 1; transform: translateY(0); } }
        @keyframes regLogoPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(31,111,214,.35); }
          50% { box-shadow: 0 0 0 10px rgba(31,111,214,0); }
        }
        @keyframes regBubbleDrift {
          0%, 100% { transform: translate3d(0,0,0) scale(1); }
          35% { transform: translate3d(20px,-26px,0) scale(1.06); }
          70% { transform: translate3d(-18px,18px,0) scale(.95); }
        }
        @keyframes regIconFloat {
          0%, 100% { opacity: .12; transform: translate3d(0,0,0) rotate(var(--icon-rotate, 0deg)); }
          50% { opacity: .22; transform: translate3d(0,-18px,0) rotate(var(--icon-rotate, 0deg)); }
        }
        @keyframes regNoticeIn {
          from { opacity: 0; transform: translateY(-8px) scale(.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes regShimmer { 0% { left: -100%; } 100% { left: 140%; } }
        @keyframes regMorph1 {
          0%,100% { transform: translate(0,0) scale(1) rotate(0deg); border-radius: 60% 40% 30% 70%/50% 60% 40% 50%; }
          33% { transform: translate(50px,40px) scale(1.15) rotate(18deg); border-radius: 40% 60% 70% 30%/60% 30% 70% 40%; }
          66% { transform: translate(-25px,30px) scale(.9) rotate(-12deg); border-radius: 50% 50% 40% 60%/40% 60% 50% 50%; }
        }
        @keyframes regMorph2 {
          0%,100% { transform: translate(0,0) scale(1) rotate(0deg); border-radius: 50% 50% 60% 40%/60% 40% 50% 50%; }
          50% { transform: translate(-35px,-28px) scale(1.18) rotate(-16deg); border-radius: 60% 40% 30% 70%/50% 60% 40% 50%; }
        }
        @keyframes regMorph3 {
          0%,100% { transform: translate(0,0) scale(1) rotate(0deg); border-radius: 55% 45% 50% 50%/45% 55% 45% 55%; }
          50% { transform: translate(30px,-32px) scale(1.1) rotate(14deg); border-radius: 40% 60% 60% 40%/60% 40% 60% 40%; }
        }
        @keyframes regFloat1 { 0%,100% { transform: translate(0,0); } 50% { transform: translate(-28px,-20px); } }
        @keyframes regFloat2 { 0%,100% { transform: translate(0,0); } 50% { transform: translate(22px,26px); } }
        @keyframes regSpinHalo { to { transform: rotate(360deg); } }

        /* ── Reduced motion ── */
        @media (prefers-reduced-motion: reduce) {
          .reg-page *, .reg-page *::before, .reg-page *::after {
            animation-duration: .01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: .01ms !important;
          }
        }
      `}</style>
    </div>
  );
};

export default DangKy;
