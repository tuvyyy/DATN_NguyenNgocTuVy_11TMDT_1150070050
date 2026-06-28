import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "react-toastify";
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  Eye,
  EyeOff,
  HeartPulse,
  Info,
  Loader2,
  Lock,
  Plus,
  ShieldCheck,
  User,
  Mail,
  Phone,
  Users,
  ChevronDown,
  UserPlus,
  ClipboardCheck,
} from "lucide-react";

// =========================================================================
// API Helpers & Global Configs
// =========================================================================
const AUTH_API_BASES = ["https://localhost:7007", "http://localhost:5006"];

const loginWithFallback = async (payload) => {
  let lastError;
  for (const apiBase of AUTH_API_BASES) {
    try {
      const res = await axios.post(`${apiBase}/api/Auth/login`, payload);
      return { res, apiBase };
    } catch (err) {
      lastError = err;
      if (err.response) throw err;
    }
  }
  throw lastError;
};

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
      if (stopOnClientError && err?.response?.status >= 400 && err?.response?.status < 500) {
        throw err;
      }
      lastErr = err;
    }
  }
  throw lastErr;
};

// =========================================================================
// 🔑 LOGIN FORM (Form view only, styled exactly like Claude's UI)
// =========================================================================
const LOGIN_TEXT = {
  welcome: "Chào mừng bạn quay lại",
  loginTitle: "Đăng nhập",
  employeeCode: "Mã nhân viên",
  password: "Mật khẩu",
  passwordPlaceholder: "Nhập mật khẩu",
  forgotPassword: "Quên mật khẩu?",
  forgotMessage: "Tính năng quên mật khẩu đang được cập nhật.",
  rememberMe: "Ghi nhớ đăng nhập",
  loading: "Đang đăng nhập...",
  success: "Đăng nhập thành công",
  invalid: "Sai tên đăng nhập hoặc mật khẩu.",
  successTitle: "Đăng nhập thành công",
  failedTitle: "Đăng nhập không thành công",
  failedMessage: "Mã nhân viên hoặc mật khẩu chưa đúng. Vui lòng kiểm tra lại.",
  systemTitle: "Hệ thống đang gặp sự cố",
  systemMessage: "Chúng tôi chưa kết nối được máy chủ đăng nhập. Vui lòng chờ một lúc rồi thử lại.",
  loginError: "Lỗi đăng nhập:",
  hidePassword: "Ẩn mật khẩu",
  showPassword: "Hiện mật khẩu",
};

const NOTICE_STYLE = {
  success: { icon: CheckCircle2, className: "border-emerald-200 bg-emerald-50 text-emerald-800", iconClassName: "text-emerald-600" },
  error: { icon: AlertCircle, className: "border-red-200 bg-red-50 text-red-800", iconClassName: "text-red-600" },
  warning: { icon: AlertCircle, className: "border-amber-200 bg-amber-50 text-amber-900", iconClassName: "text-amber-600" },
  info: { icon: Info, className: "border-sky-200 bg-sky-50 text-sky-800", iconClassName: "text-sky-600" },
};

function LoginNotice({ notice }) {
  const meta = NOTICE_STYLE[notice.type] || NOTICE_STYLE.info;
  const Icon = meta.icon;
  return (
    <div className={`auth-notice flex items-start gap-3 rounded-xl border px-3.5 py-3 text-sm ${meta.className}`}>
      <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${meta.iconClassName}`} />
      <div>
        <p className="font-semibold">{notice.title}</p>
        <p className="mt-0.5 leading-relaxed">{notice.message}</p>
      </div>
    </div>
  );
}

function LoginForm({ onLoginSuccess, onSwitch }) {
  const navigate = useNavigate();
  const [tenDangNhap, setTenDangNhap] = useState("");
  const [matKhau, setMatKhau] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState({ type: "", title: "", message: "" });
  const logoSrc = `${process.env.PUBLIC_URL}/logo-clinic.svg`;

  const showNotice = (type, title, message) => {
    setNotice({ type, title, message });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setNotice({ type: "", title: "", message: "" });

    try {
      const { res, apiBase } = await loginWithFallback({
        TenDangNhap: tenDangNhap,
        MatKhau: matKhau,
      });

      const data = res.data;

      if (res.status === 200 && data.message === LOGIN_TEXT.success) {
        const user = {
          userId: data.userId,
          tenDangNhap: data.tenDangNhap,
          roles: data.roles || [],
          accessToken: data.token || "",
        };

        localStorage.setItem("userInfo", JSON.stringify(user));
        localStorage.setItem("access_token", data.token);
        localStorage.setItem("tiuv_auth_api_base", apiBase);
        window.dispatchEvent(new Event("userInfoUpdated"));
        if (typeof onLoginSuccess === "function") onLoginSuccess(user);

        toast.success(LOGIN_TEXT.successTitle, { containerId: "app-global" });

        window.setTimeout(() => {
          if (user.roles.includes("ADMIN")) {
            navigate("/admin");
          } else {
            navigate("/dashboard");
          }
        }, 350);
      } else {
        showNotice("error", LOGIN_TEXT.failedTitle, LOGIN_TEXT.failedMessage);
      }
    } catch (err) {
      console.error(LOGIN_TEXT.loginError, err);
      if (err.response) {
        const message =
          typeof err.response?.data === "string"
            ? err.response.data
            : err.response?.data?.message || LOGIN_TEXT.failedMessage;
        showNotice("error", LOGIN_TEXT.failedTitle, message || LOGIN_TEXT.invalid);
      } else {
        showNotice("warning", LOGIN_TEXT.systemTitle, LOGIN_TEXT.systemMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full h-full flex items-center justify-center p-8 sm:p-12">
      <div className="w-full max-w-[420px]">
        <div className="mb-7 flex flex-col items-center text-center">
          <img
            src={logoSrc}
            alt="tiuv clinic"
            className="auth-logo h-[72px] w-[72px] rounded-[18px] border border-sky-100 bg-white p-2 shadow-sm"
          />
          <p className="mt-[18px] text-sm italic text-[#5b6b7c]">{LOGIN_TEXT.welcome}</p>
          <h2 className="mt-1 text-[30px] font-extrabold tracking-tight text-[#163a5f]">
            {LOGIN_TEXT.loginTitle}
          </h2>
        </div>

        <form onSubmit={handleLogin}>
          <div>
            <label className="mb-2 block text-sm font-semibold text-[#163a5f]">
              {LOGIN_TEXT.employeeCode}
            </label>
            <div className="auth-input-group">
              <User size={18} className="shrink-0 text-[#7b94ab]" />
              <input
                type="text"
                placeholder="VD: NV001"
                value={tenDangNhap}
                onChange={(e) => setTenDangNhap(e.target.value)}
                className="min-w-0 flex-1 border-none bg-transparent text-[15px] text-[#163a5f] outline-none placeholder:text-[#9aa9ba]"
                required
              />
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-baseline justify-between gap-3">
              <label className="block text-sm font-semibold text-[#163a5f]">{LOGIN_TEXT.password}</label>
            </div>
            <div className="auth-input-group">
              <Lock size={18} className="shrink-0 text-[#7b94ab]" />
              <input
                type={showPassword ? "text" : "password"}
                placeholder={LOGIN_TEXT.passwordPlaceholder}
                value={matKhau}
                onChange={(e) => setMatKhau(e.target.value)}
                className="min-w-0 flex-1 border-none bg-transparent text-[15px] text-[#163a5f] outline-none placeholder:text-[#9aa9ba]"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="flex shrink-0 rounded-md bg-transparent p-1 text-[#7b94ab] hover:text-[#1f6fd6]"
                aria-label={showPassword ? LOGIN_TEXT.hidePassword : LOGIN_TEXT.showPassword}
              >
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </div>

          <label className="mb-4 mt-0.5 flex cursor-pointer items-center gap-2 text-sm font-medium text-[#163a5f]">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-4 w-4 cursor-pointer rounded border-[#d7e3ee] text-[#1f6fd6] accent-[#1f6fd6] focus:ring-2 focus:ring-[#3b82c4]"
            />
            {LOGIN_TEXT.rememberMe}
          </label>

          {notice.message && (
            <div className="mb-4">
              <LoginNotice notice={notice} />
            </div>
          )}

          <div className="mb-[22px] flex items-center justify-between text-sm">
            <button
              type="button"
              onClick={onSwitch}
              className="bg-transparent border-none text-[#1f6fd6] font-bold hover:underline cursor-pointer p-0"
            >
              Đăng ký tài khoản
            </button>
            <button
              type="button"
              onClick={() => showNotice("info", LOGIN_TEXT.forgotPassword, LOGIN_TEXT.forgotMessage)}
              className="bg-transparent border-none text-[#1f6fd6] font-bold hover:underline cursor-pointer p-0"
            >
              {LOGIN_TEXT.forgotPassword}
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="auth-submit flex w-full items-center justify-center gap-2 rounded-[10px] border-none px-4 py-3.5 text-base font-bold text-white disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading && <Loader2 className="h-5 w-5 animate-spin" />}
            {loading ? LOGIN_TEXT.loading : LOGIN_TEXT.loginTitle}
          </button>
        </form>
      </div>
    </div>
  );
}

// =========================================================================
// 📝 REGISTER FORM (Form view only, styled exactly like Claude's UI)
// =========================================================================
const REG_TEXT = {
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
  successMessage: "Tài khoản đã được tạo! Đang chuyển hướng đến trang đăng nhập...",
  failedTitle: "Đăng ký không thành công",
  emptyFields: "Vui lòng nhập đầy đủ thông tin.",
  passwordMismatch: "Mật khẩu xác nhận không khớp.",
  hidePassword: "Ẩn mật khẩu",
};

function RegisterNotice({ notice }) {
  const meta = NOTICE_STYLE[notice.type] || NOTICE_STYLE.info;
  const Icon = meta.icon;
  return (
    <div className={`auth-notice flex items-start gap-3 rounded-xl border px-3.5 py-3 text-sm ${meta.className}`}>
      <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${meta.iconClassName}`} />
      <div>
        <p className="font-semibold">{notice.title}</p>
        <p className="mt-0.5 leading-relaxed">{notice.message}</p>
      </div>
    </div>
  );
}

function RegisterForm({ onSwitch }) {
  const [hoTen, setHoTen] = useState("");
  const [tenDangNhap, setTenDangNhap] = useState("");
  const [matKhau, setMatKhau] = useState("");
  const [xacNhan, setXacNhan] = useState("");
  const [email, setEmail] = useState("");
  const [soDienThoai, setSoDienThoai] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);
  const [roleOpen, setRoleOpen] = useState(false);
  const [roles, setRoles] = useState([]);
  const [roleLoading, setRoleLoading] = useState(false);
  const [roleError, setRoleError] = useState("");
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState({ type: "", title: "", message: "" });
  const logoSrc = `${process.env.PUBLIC_URL}/logo-clinic.svg`;

  useEffect(() => {
    const fetchRoles = async () => {
      try {
        setRoleLoading(true);
        setRoleError("");
        const res = await requestAuthApi("get", "/api/Auth/roles", undefined, false);
        const raw = Array.isArray(res.data)
          ? res.data
          : Array.isArray(res.data?.data)
          ? res.data.data
          : [];

        const normalized = raw
          .map((r) => ({
            id: r.id ?? r.Id,
            ten: r.ten ?? r.Ten ?? "",
            moTa: r.moTa ?? r.MoTa ?? "",
          }))
          .filter((r) => r.id !== undefined && r.id !== null);

        setRoles(normalized);
        if (!normalized.length) {
          setRoleError("Không tải được danh sách vai trò.");
        }
      } catch (err) {
        console.error("⚠️ Lỗi tải danh sách vai trò:", err);
        setRoles([]);
        const status = err?.response?.status;
        const beMsg =
          err?.response?.data?.message ||
          (typeof err?.response?.data === "string" ? err.response.data : "");
        if (status) {
          setRoleError(`API vai trò lỗi (${status})${beMsg ? `: ${beMsg}` : ""}`);
        } else {
          setRoleError("Không kết nối được API vai trò (5006/7007).");
        }
      } finally {
        setRoleLoading(false);
      }
    };
    fetchRoles();
  }, []);

  const handleRegister = async (e) => {
    e.preventDefault();
    setNotice({ type: "", title: "", message: "" });

    if (!tenDangNhap || !matKhau || !xacNhan || !selectedRole) {
      setNotice({ type: "error", title: REG_TEXT.failedTitle, message: REG_TEXT.emptyFields });
      return;
    }
    if (matKhau !== xacNhan) {
      setNotice({ type: "error", title: REG_TEXT.failedTitle, message: REG_TEXT.passwordMismatch });
      return;
    }

    const body = {
      hoTen,
      tenDangNhap,
      matKhau,
      email,
      soDienThoai,
      vaiTroIds: [Number(selectedRole.id)],
    };

    try {
      setLoading(true);
      const res = await requestAuthApi("post", "/api/Auth/register", body, true);
      console.log("✅ Đăng ký thành công:", res.data);

      setNotice({ type: "success", title: REG_TEXT.successTitle, message: REG_TEXT.successMessage });

      setHoTen("");
      setTenDangNhap("");
      setMatKhau("");
      setXacNhan("");
      setEmail("");
      setSoDienThoai("");
      setSelectedRole(null);

      setTimeout(() => {
        onSwitch();
      }, 2000);
    } catch (err) {
      console.error("❌ Lỗi đăng ký:", err);
      const msg =
        err.response?.data?.message ||
        err.response?.data ||
        "Đăng ký thất bại, vui lòng thử lại!";
      setNotice({ type: "error", title: REG_TEXT.failedTitle, message: typeof msg === "string" ? msg : REG_TEXT.failedTitle });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full h-full flex items-center justify-center p-8 sm:p-10 overflow-y-auto">
      <div className="w-full max-w-[500px]">
        <div className="mb-6 flex flex-col items-center text-center">
          <img
            src={logoSrc}
            alt="tiuv clinic"
            className="auth-logo h-[64px] w-[64px] rounded-[16px] border border-sky-100 bg-white p-2 shadow-sm"
          />
          <p className="mt-[14px] text-sm italic text-[#5b6b7c]">{REG_TEXT.subtitle}</p>
          <h2 className="mt-1 text-[28px] font-extrabold tracking-tight text-[#163a5f]">
            {REG_TEXT.pageTitle}
          </h2>
        </div>

        <form onSubmit={handleRegister}>
          <div className="grid grid-cols-1 gap-x-4 gap-y-0 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-[#163a5f]">
                {REG_TEXT.fullName}
              </label>
              <div className="auth-input-group">
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

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-[#163a5f]">
                {REG_TEXT.accountCode} <span className="text-rose-500">{REG_TEXT.required}</span>
              </label>
              <div className="auth-input-group">
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

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-[#163a5f]">
                {REG_TEXT.email}
              </label>
              <div className="auth-input-group">
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

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-[#163a5f]">
                {REG_TEXT.phone}
              </label>
              <div className="auth-input-group">
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

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-[#163a5f]">
                {REG_TEXT.password} <span className="text-rose-500">{REG_TEXT.required}</span>
              </label>
              <div className="auth-input-group">
                <Lock size={17} className="shrink-0 text-[#7b94ab]" />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Mật khẩu"
                  value={matKhau}
                  onChange={(e) => setMatKhau(e.target.value)}
                  className="min-w-0 flex-1 border-none bg-transparent text-[14px] text-[#163a5f] outline-none placeholder:text-[#9aa9ba]"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="flex shrink-0 rounded-md bg-transparent p-0.5 text-[#7b94ab] hover:text-[#1f6fd6]"
                  aria-label={showPassword ? REG_TEXT.hidePassword : "Hiện mật khẩu"}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-[#163a5f]">
                {REG_TEXT.confirmPassword} <span className="text-rose-500">{REG_TEXT.required}</span>
              </label>
              <div className="auth-input-group">
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
                  aria-label={showConfirm ? REG_TEXT.hidePassword : "Hiện xác nhận"}
                >
                  {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          </div>

          <div className="relative mt-0">
            <label className="mb-1.5 block text-sm font-semibold text-[#163a5f]">
              {REG_TEXT.role} <span className="text-rose-500">{REG_TEXT.required}</span>
            </label>
            <div
              className="relative"
              onClick={() => setRoleOpen(!roleOpen)}
              onBlur={() => setRoleOpen(false)}
              tabIndex={0}
            >
              <div className="auth-input-group cursor-pointer">
                <Users size={17} className="shrink-0 text-[#7b94ab]" />
                <span className={`flex-1 text-[14px] ${!selectedRole ? "text-[#9aa9ba]" : "text-[#163a5f]"}`}>
                  {selectedRole ? (selectedRole.moTa || selectedRole.ten) : REG_TEXT.rolePlaceholder}
                </span>
                <ChevronDown
                  size={16}
                  className={`shrink-0 text-[#7b94ab] transition-transform duration-200 ${roleOpen ? "rotate-180" : ""}`}
                />
              </div>

              <ul
                className={`auth-dropdown absolute left-0 right-0 top-[calc(100%+4px)] z-50 max-h-52 overflow-auto rounded-xl border border-sky-100 bg-white shadow-[0_16px_36px_-20px_rgba(15,40,70,0.2)] transition-all duration-200 ${
                  roleOpen
                    ? "visible translate-y-0 opacity-100"
                    : "pointer-events-none invisible -translate-y-1 opacity-0"
                }`}
              >
                {roleLoading && (
                  <li className="flex items-center gap-2 px-4 py-3 text-sm text-[#7b94ab]">
                    <Loader2 className="h-4 w-4 animate-spin" /> {REG_TEXT.roleLoading}
                  </li>
                )}

                {!roleLoading && roleError && (
                  <li className="px-4 py-3 text-sm text-red-500">{roleError}</li>
                )}

                {!roleLoading &&
                  !roleError &&
                  roles.map((role) => (
                    <li
                      key={role.id}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setSelectedRole(role);
                        setRoleOpen(false);
                      }}
                      className="cursor-pointer px-4 py-2.5 text-sm text-[#163a5f] transition-colors hover:bg-sky-50 hover:text-[#1f6fd6]"
                    >
                      {role.moTa || role.ten}
                    </li>
                  ))}
              </ul>
            </div>
          </div>

          {notice.message && (
            <div className="mt-3">
              <RegisterNotice notice={notice} />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="auth-submit mt-5 flex w-full items-center justify-center gap-2 rounded-[10px] border-none px-4 py-3.5 text-base font-bold text-white disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading && <Loader2 className="h-5 w-5 animate-spin" />}
            {loading ? REG_TEXT.registering : REG_TEXT.register}
          </button>

          {/* Switch link */}
          <div className="mt-4 text-center text-sm text-[#5b6b7c]">
            <span>{REG_TEXT.hasAccount}</span>
            <button
              type="button"
              onClick={onSwitch}
              className="bg-transparent font-bold text-[#1f6fd6] hover:underline cursor-pointer"
            >
              {REG_TEXT.loginNow}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// =========================================================================
// 🚀 MAIN AUTH PAGE WITH CLASSIC SLIDING OVERLAY CONTAINER
// =========================================================================
const AuthPage = ({ onLoginSuccess }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isRegister, setIsRegister] = useState(location.pathname === "/register");
  const logoSrc = `${process.env.PUBLIC_URL}/logo-clinic.svg`;

  useEffect(() => {
    setIsRegister(location.pathname === "/register");
  }, [location.pathname]);

  const switchToRegister = useCallback(() => {
    setIsRegister(true);
    navigate("/register", { replace: true });
  }, [navigate]);

  const switchToLogin = useCallback(() => {
    setIsRegister(false);
    navigate("/login", { replace: true });
  }, [navigate]);

  return (
    <div className="auth-page-container min-h-screen w-full flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-[#eaf6fb] to-[#d7ecfb] px-4 py-10">
      
      {/* 🌌 Background Floating Particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        {[...Array(15)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-sky-200 opacity-40 animate-particle"
            style={{
              width: `${10 + Math.random() * 25}px`,
              height: `${10 + Math.random() * 25}px`,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${8 + Math.random() * 8}s`,
            }}
          ></div>
        ))}
      </div>

      {/* 🏥 Background decorative Blobs & Halo */}
      <div className="pointer-events-none absolute inset-[-15%] login-aurora z-0">
        <span className="login-blob login-blob-left-1" />
        <span className="login-blob login-blob-left-2" />
        <span className="login-blob login-blob-left-3" />
        <span className="login-halo" />
      </div>

      {/* 🌿 Main Sliding Auth Card Container */}
      <div className={`auth-wrapper relative overflow-hidden bg-white rounded-[24px] shadow-2xl z-10 border border-sky-100/50 ${isRegister ? "right-panel-active" : ""}`} data-mode={isRegister ? "register" : "login"}>
        
        {/* Left Side: LoginForm (Always at left:0, occupies 50%) */}
        <div className="auth-form-container sign-in-container">
          <LoginForm onLoginSuccess={onLoginSuccess} onSwitch={switchToRegister} />
        </div>

        {/* Right Side: RegisterForm (Always at left:0, occupies 50%, shown when right-panel-active is set) */}
        <div className="auth-form-container sign-up-container">
          <RegisterForm onSwitch={switchToLogin} />
        </div>

        {/* Sliding Overlay Container (occupies 50%, slides left/right) */}
        <div className="overlay-container">
          <div className="overlay">
            {/* 🌌 Background floating decorative elements inside overlay */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-45">
              <span className="absolute rounded-full bg-white/20 blur-2xl w-64 h-64 -top-16 -left-16 animate-pulse" />
              <span className="absolute rounded-full bg-white/10 blur-xl w-48 h-48 -bottom-12 -right-12" />
              <Plus className="absolute text-white/10 w-12 h-12 top-10 left-1/4 overlay-float-1" />
              <HeartPulse className="absolute text-white/10 w-10 h-10 bottom-16 left-1/3 overlay-float-2" />
              <ShieldCheck className="absolute text-white/10 w-12 h-12 top-1/3 right-1/4 overlay-float-3" />
            </div>

            {/* Left Overlay panel (displays when Register is active; overlay is on the Left) */}
            <div className="overlay-panel overlay-left">
              <div className="login-badge mb-6 inline-flex items-center gap-2.5 overflow-hidden rounded-full bg-white/95 px-5 py-2 shadow-md text-sm font-bold text-[#163a5f] border border-white">
                <img src={logoSrc} alt="tiuv clinic" className="h-[26px] w-[26px] rounded-lg" />
                <span>TIUV CLINIC</span>
              </div>

              <h3 className="mb-4 text-2xl lg:text-[28px] font-extrabold leading-tight text-white max-w-sm">
                Bắt đầu hành trình quản lý phòng khám thông minh
              </h3>
              <p className="mb-6 max-w-xs text-sm leading-relaxed text-sky-100/90">
                Tạo tài khoản để tiếp cận hệ thống quản lý bệnh nhân, lịch khám và quy trình điều trị hiện đại.
              </p>

              {/* Info Cards inside overlay */}
              <div className="flex flex-col gap-3 w-full max-w-[280px] mb-8">
                <div className="login-info-card flex items-start gap-2.5 rounded-[14px] border border-white/20 bg-white/10 backdrop-blur-md px-4 py-3 shadow-lg text-left text-white">
                  <ClipboardCheck className="mt-0.5 h-[20px] w-[20px] shrink-0 text-cyan-300" />
                  <div>
                    <p className="mb-0.5 text-sm font-bold text-white">Làm việc nhóm</p>
                    <p className="text-[11px] leading-snug text-sky-100/80">Phối hợp tiếp đón, bác sĩ và thu ngân</p>
                  </div>
                </div>
                <div className="login-info-card flex items-start gap-2.5 rounded-[14px] border border-white/20 bg-white/10 backdrop-blur-md px-4 py-3 shadow-lg text-left text-white">
                  <ShieldCheck className="mt-0.5 h-[20px] w-[20px] shrink-0 text-cyan-300" />
                  <div>
                    <p className="mb-0.5 text-sm font-bold text-white">Bảo mật</p>
                    <p className="text-[11px] leading-snug text-sky-100/80">Phân quyền và kiểm soát truy cập rõ ràng</p>
                  </div>
                </div>
              </div>


            </div>

            {/* Right Overlay panel (displays when Login is active; overlay is on the Right) */}
            <div className="overlay-panel overlay-right">
              <div className="login-badge mb-6 inline-flex items-center gap-2.5 overflow-hidden rounded-full bg-white/95 px-5 py-2 shadow-md text-sm font-bold text-[#163a5f] border border-white">
                <img src={logoSrc} alt="tiuv clinic" className="h-[26px] w-[26px] rounded-lg" />
                <span>TIUV CLINIC</span>
              </div>

              <h3 className="mb-4 text-2xl lg:text-[28px] font-extrabold leading-tight text-white max-w-sm">
                Quản lý phòng khám hiện đại, nhanh và trực quan
              </h3>
              <p className="mb-6 max-w-xs text-sm leading-relaxed text-sky-100/90">
                Đồng bộ luồng công việc cho tiếp đón, bác sĩ, thu ngân và quản trị trong một giao diện thống nhất.
              </p>

              {/* Info Cards inside overlay */}
              <div className="flex flex-col gap-3 w-full max-w-[280px] mb-8">
                <div className="login-info-card flex items-start gap-2.5 rounded-[14px] border border-white/20 bg-white/10 backdrop-blur-md px-4 py-3 shadow-lg text-left text-white">
                  <Clock3 className="mt-0.5 h-[20px] w-[20px] shrink-0 text-cyan-300" />
                  <div>
                    <p className="mb-0.5 text-sm font-bold text-white">24/7</p>
                    <p className="text-[11px] leading-snug text-sky-100/80">Theo dõi và xử lý bệnh nhân liên tục</p>
                  </div>
                </div>
                <div className="login-info-card flex items-start gap-2.5 rounded-[14px] border border-white/20 bg-white/10 backdrop-blur-md px-4 py-3 shadow-lg text-left text-white">
                  <ShieldCheck className="mt-0.5 h-[20px] w-[20px] shrink-0 text-cyan-300" />
                  <div>
                    <p className="mb-0.5 text-sm font-bold text-white">An toàn</p>
                    <p className="text-[11px] leading-snug text-sky-100/80">Phân quyền và quản lý truy cập rõ ràng</p>
                  </div>
                </div>
              </div>


            </div>

          </div>
        </div>

      </div>

      {/* Styles for Sliding Transition */}
      <style>{`
        /* Card Wrapper */
        .auth-wrapper {
          width: 1100px;
          max-width: 100%;
          min-height: 740px;
          display: flex;
        }

        /* Form container placement */
        .auth-form-container {
          position: absolute;
          top: 0;
          height: 100%;
          transition: all 0.65s cubic-bezier(0.77, 0, 0.175, 1);
        }

        .sign-in-container {
          left: 0;
          width: 50%;
          z-index: 2;
          opacity: 1;
          pointer-events: auto;
        }

        .sign-up-container {
          left: 0;
          width: 50%;
          opacity: 0;
          z-index: 1;
          pointer-events: none;
        }

        /* Sliding classes */
        .auth-wrapper.right-panel-active .sign-in-container {
          transform: translateX(100%);
          opacity: 0;
          z-index: 1;
          pointer-events: none;
        }

        .auth-wrapper.right-panel-active .sign-up-container {
          transform: translateX(100%);
          opacity: 1;
          z-index: 5;
          pointer-events: auto;
          animation: showForm 0.65s;
        }

        @keyframes showForm {
          0%, 49.99% {
            opacity: 0;
            z-index: 1;
          }
          50%, 100% {
            opacity: 1;
            z-index: 5;
          }
        }

        /* Overlay Container */
        .overlay-container {
          position: absolute;
          top: 0;
          left: 50%;
          width: 50%;
          height: 100%;
          overflow: hidden;
          transition: transform 0.65s cubic-bezier(0.77, 0, 0.175, 1);
          z-index: 10;
        }

        .auth-wrapper.right-panel-active .overlay-container {
          transform: translateX(-100%);
        }

        .overlay {
          background: linear-gradient(135deg, #163a5f 0%, #1f6fd6 50%, #14b8c4 100%);
          background-repeat: no-repeat;
          background-size: cover;
          position: relative;
          left: -100%;
          height: 100%;
          width: 200%;
          transform: translateX(0);
          transition: transform 0.65s cubic-bezier(0.77, 0, 0.175, 1);
        }

        .auth-wrapper.right-panel-active .overlay {
          transform: translateX(50%);
        }

        .overlay-panel {
          position: absolute;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          padding: 0 40px;
          text-align: center;
          top: 0;
          height: 100%;
          width: 50%;
          transform: translateX(0);
          transition: transform 0.65s cubic-bezier(0.77, 0, 0.175, 1);
        }

        .overlay-left {
          transform: translateX(-15%);
          opacity: 0;
          pointer-events: none;
          transition: transform 0.65s cubic-bezier(0.77, 0, 0.175, 1), opacity 0.65s cubic-bezier(0.77, 0, 0.175, 1);
        }

        .auth-wrapper.right-panel-active .overlay-left {
          transform: translateX(0);
          opacity: 1;
          pointer-events: auto;
        }

        .overlay-right {
          right: 0;
          transform: translateX(0);
          opacity: 1;
          pointer-events: auto;
          transition: transform 0.65s cubic-bezier(0.77, 0, 0.175, 1), opacity 0.65s cubic-bezier(0.77, 0, 0.175, 1);
        }

        .auth-wrapper.right-panel-active .overlay-right {
          transform: translateX(15%);
          opacity: 0;
          pointer-events: none;
        }

        /* ── Aurora background ── */
        .login-aurora {
          position: absolute;
          inset: -15%;
          animation: loginHueShift 22s ease-in-out infinite;
        }
        @keyframes loginHueShift {
          0%, 100% { filter: hue-rotate(0deg); }
          50% { filter: hue-rotate(16deg); }
        }

        /* ── Blobs ── */
        .login-blob {
          position: absolute;
          pointer-events: none;
          border-radius: 9999px;
          filter: blur(45px);
          opacity: 0.55;
        }
        .login-blob-left-1 {
          width: 300px; height: 300px;
          top: 6%; left: 4%;
          background: radial-gradient(circle at 30% 30%, #a7e0f2, #5fb6e0 70%);
          animation: loginMorph1 19s ease-in-out infinite;
        }
        .login-blob-left-2 {
          width: 240px; height: 240px;
          bottom: 10%; left: 14%;
          background: radial-gradient(circle at 60% 40%, #cdeefb, #8fcdec 70%);
          animation: loginMorph2 24s ease-in-out infinite;
        }
        .login-blob-left-3 {
          width: 200px; height: 200px;
          top: 36%; left: 56%;
          background: radial-gradient(circle at 50% 50%, #bfe6f5, #73c2e6 70%);
          animation: loginMorph3 17s ease-in-out infinite;
        }

        /* ── Halo ── */
        .login-halo {
          position: absolute;
          top: 50%; left: 50%;
          width: 420px; height: 420px;
          margin: -210px 0 0 -210px;
          border-radius: 9999px;
          background: conic-gradient(from 0deg, rgba(31,111,214,.16), rgba(20,184,196,.1), rgba(31,111,214,.16));
          filter: blur(55px);
          animation: loginSpinHalo 32s linear infinite;
        }

        @keyframes loginMorph1 {
          0%,100% { transform: translate(0,0) scale(1) rotate(0deg); border-radius: 60% 40% 30% 70%/50% 60% 40% 50%; }
          33% { transform: translate(50px,40px) scale(1.15) rotate(18deg); border-radius: 40% 60% 70% 30%/60% 30% 70% 40%; }
          66% { transform: translate(-25px,30px) scale(.9) rotate(-12deg); border-radius: 50% 50% 40% 60%/40% 60% 50% 50%; }
        }
        @keyframes loginMorph2 {
          0%,100% { transform: translate(0,0) scale(1) rotate(0deg); border-radius: 50% 50% 60% 40%/60% 40% 50% 50%; }
          50% { transform: translate(-35px,-28px) scale(1.18) rotate(-16deg); border-radius: 60% 40% 30% 70%/50% 60% 40% 50%; }
        }
        @keyframes loginMorph3 {
          0%,100% { transform: translate(0,0) scale(1) rotate(0deg); border-radius: 55% 45% 50% 50%/45% 55% 45% 55%; }
          50% { transform: translate(30px,-32px) scale(1.1) rotate(14deg); border-radius: 40% 60% 60% 40%/60% 40% 60% 40%; }
        }
        @keyframes loginSpinHalo { to { transform: rotate(360deg); } }

        /* Input styling with icons inside */
        .auth-input-group {
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
        .auth-input-group svg {
          transition: color 0.2s ease, transform 0.2s ease;
        }
        .auth-input-group:focus-within {
          border-color: #3b82c4;
          box-shadow: 0 0 0 3px rgba(31,111,214,.15);
        }
        .auth-input-group:focus-within svg {
          color: #1f6fd6 !important;
          transform: scale(1.08);
        }

        /* Dropdown custom */
        .auth-dropdown {
          position: absolute;
          left: 0; right: 0;
          top: calc(100% + 4px);
          z-index: 50;
          max-h-52;
          overflow: auto;
          border-radius: 12px;
          border: 1px solid #e0ecf5;
          background: white;
          box-shadow: 0 16px 36px -20px rgba(15,40,70,0.2);
        }

        /* Buttons and links */
        .auth-submit {
          position: relative;
          overflow: hidden;
          background: linear-gradient(90deg, #14b8c4, #1f6fd6);
          background-size: 200% 100%;
          background-position: 0% 0%;
          transition: background-position .4s ease, transform .15s ease, box-shadow .25s ease;
        }
        .auth-submit:hover:not(:disabled) {
          background-position: 100% 0%;
          box-shadow: 0 10px 24px rgba(31,111,214,.32);
          transform: translateY(-1px);
        }
        .auth-submit:active:not(:disabled) {
          transform: scale(.98);
        }
        
        .auth-link {
          position: relative;
          text-decoration: none;
        }
        .auth-link::after {
          content: "";
          position: absolute;
          left: 0;
          bottom: -2px;
          width: 0;
          height: 1px;
          background: #1f6fd6;
          transition: width .25s ease;
        }
        .auth-link:hover::after {
          width: 100%;
        }

        .auth-notice {
          animation: authNoticeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) both;
          transform-origin: top center;
        }
        @keyframes authNoticeIn {
          from { opacity: 0; transform: translateY(-8px) scale(.98); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* Floating particles (seamless loop transition) */
        @keyframes particle {
          0% { transform: translateY(0) scale(0.8); opacity: 0; }
          50% { transform: translateY(-80px) translateX(15px) scale(1.1); opacity: 0.7; }
          100% { transform: translateY(-160px) translateX(-10px) scale(0.9); opacity: 0; }
        }
        .animate-particle {
          animation: particle linear infinite;
        }

        /* Overlay floating medical icons */
        @keyframes overlayFloat {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-15px) rotate(8deg); }
        }
        .overlay-float-1 { animation: overlayFloat 6s ease-in-out infinite; }
        .overlay-float-2 { animation: overlayFloat 8s ease-in-out infinite -2s; }
        .overlay-float-3 { animation: overlayFloat 7s ease-in-out infinite -4s; }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(18px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.8s ease forwards;
        }

        /* Mobile responsive adjustments */
        @media (max-width: 768px) {
          .auth-wrapper {
            flex-direction: column;
            min-height: auto;
            height: auto;
            width: 100%;
            max-width: 450px;
          }
          .auth-form-container {
            position: relative;
            width: 100% !important;
            height: auto;
            transform: none !important;
            opacity: 1 !important;
            transition: none;
          }
          .sign-in-container, .sign-up-container {
            display: block;
          }
          .overlay-container {
            display: none;
          }
          .auth-wrapper[data-mode="login"] .sign-up-container {
            display: none;
          }
          .auth-wrapper[data-mode="register"] .sign-in-container {
            display: none;
          }
        }
      `}</style>
    </div>
  );
};

export default AuthPage;
