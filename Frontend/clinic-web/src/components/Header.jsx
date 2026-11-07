import React, { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { FaBell, FaChevronDown, FaGlobe, FaKey, FaQuestionCircle, FaSearch, FaSignOutAlt, FaTimes, FaUserCircle, FaUserMd } from "react-icons/fa";
import { OperationsApi } from "../api/OperationsApi";
import { createOperationsConnection } from "../services/operationsRealtime";

const formatTime = (value, long = false) => new Intl.DateTimeFormat("vi-VN", long
  ? { dateStyle: "full", timeStyle: "short" }
  : { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" }).format(new Date(value));

export default function Header({ context }) {
  const navigate = useNavigate();
  const location = useLocation();
  const rootRef = useRef(null);
  const lastErrorRef = useRef(null);
  const [panel, setPanel] = useState("");
  const [userName, setUserName] = useState("Người dùng");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [notifications, setNotifications] = useState([]);
  const [selectedNotice, setSelectedNotice] = useState(null);
  const [supportOpen, setSupportOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [support, setSupport] = useState({ subject: "", description: "", category: "HO_TRO", priority: "NORMAL" });
  const [health, setHealth] = useState({ api: "checking", realtime: "connecting" });

  const syncUser = useCallback(() => {
    try {
      const user = JSON.parse(localStorage.getItem("userInfo") || "{}");
      setUserName(user.fullName || user.hoTen || user.tenDangNhap || "Người dùng");
      const raw = user.anhDaiDien || "";
      const base = localStorage.getItem("tiuv_auth_api_base") || "https://localhost:7007";
      setAvatarUrl(raw && !/^https?:\/\//i.test(raw) ? `${base}${raw}` : raw);
    } catch { setUserName("Người dùng"); setAvatarUrl(""); }
  }, []);

  const reloadNotifications = useCallback(() => OperationsApi.notifications().then(setNotifications).catch(() => {}), []);

  useEffect(() => {
    syncUser();
    window.addEventListener("userInfoUpdated", syncUser);
    window.addEventListener("storage", syncUser);
    return () => { window.removeEventListener("userInfoUpdated", syncUser); window.removeEventListener("storage", syncUser); };
  }, [syncUser]);

  useEffect(() => {
    const outside = (event) => rootRef.current && !rootRef.current.contains(event.target) && setPanel("");
    document.addEventListener("mousedown", outside);
    return () => document.removeEventListener("mousedown", outside);
  }, []);

  useEffect(() => {
    const onError = (event) => { lastErrorRef.current = { message: event.message || "Lỗi giao diện", source: event.filename, time: new Date().toISOString() }; };
    const onRejection = (event) => { lastErrorRef.current = { message: String(event.reason?.message || event.reason || "Tác vụ bị từ chối"), time: new Date().toISOString() }; };
    window.addEventListener("error", onError); window.addEventListener("unhandledrejection", onRejection);
    return () => { window.removeEventListener("error", onError); window.removeEventListener("unhandledrejection", onRejection); };
  }, []);

  useEffect(() => {
    reloadNotifications();
    OperationsApi.health().then(() => setHealth((x) => ({ ...x, api: "online" }))).catch(() => setHealth((x) => ({ ...x, api: "offline" })));
    const connection = createOperationsConnection();
    connection.on("NotificationCreated", (item) => {
      setNotifications((rows) => [item, ...rows.filter((x) => x.id !== item.id)]);
      const notify = item.severity === "URGENT" ? toast.error : item.severity === "WARNING" ? toast.warning : toast.info;
      notify(item.title, { containerId: "app-global" });
    });
    connection.on("NotificationChanged", reloadNotifications);
    connection.on("SupportUpdated", (item) => toast.info(`Yêu cầu #${item.id} đã được cập nhật.`, { containerId: "app-global" }));
    connection.onreconnecting(() => setHealth((x) => ({ ...x, realtime: "connecting" })));
    connection.onreconnected(() => setHealth((x) => ({ ...x, realtime: "online" })));
    connection.onclose(() => setHealth((x) => ({ ...x, realtime: "offline" })));
    connection.start().then(() => setHealth((x) => ({ ...x, realtime: "online" }))).catch(() => setHealth((x) => ({ ...x, realtime: "offline" })));
    return () => { connection.stop().catch(() => {}); };
  }, [reloadNotifications]);

  const unread = notifications.filter((x) => !x.isRead).length;
  const togglePanel = (name) => setPanel((current) => current === name ? "" : name);
  const openNotification = async (item) => {
    setPanel("");
    setNotifications((rows) => rows.map((x) => x.id === item.id ? { ...x, isRead: true } : x));
    OperationsApi.markRead(item.id).catch(() => {});
    try { setSelectedNotice(await OperationsApi.notificationDetail(item.id)); }
    catch { setSelectedNotice(item); }
  };

  const submitSupport = async (event) => {
    event.preventDefault(); setSending(true);
    try {
      const user = JSON.parse(localStorage.getItem("userInfo") || "{}");
      const result = await OperationsApi.createSupport({ ...support, pageUrl: window.location.href, route: location.pathname, userAgent: navigator.userAgent,
        context: { roles: user.roles || [], viewport: `${window.innerWidth}x${window.innerHeight}`, lastClientError: lastErrorRef.current } });
      toast.success(`Đã gửi yêu cầu hỗ trợ #${result.id}`, { containerId: "app-global" });
      setSupportOpen(false); setSupport({ subject: "", description: "", category: "HO_TRO", priority: "NORMAL" });
    } catch (error) { toast.error(error.response?.data?.message || "Chưa gửi được yêu cầu hỗ trợ.", { containerId: "app-global" }); }
    finally { setSending(false); }
  };

  const logout = () => { 
    localStorage.removeItem("userInfo"); 
    localStorage.removeItem("access_token"); 
    sessionStorage.removeItem("access_token"); 
    navigate("/login", { replace: true }); 
  };

  return <>
    <header ref={rootRef} className="relative z-40 flex h-14 w-full items-center justify-between bg-[#0077b6] px-5 text-white border-b border-white/10 shadow">
      <button onClick={() => navigate("/dashboard")} className="flex items-center gap-2 rounded px-1.5 py-1 hover:bg-white/10 transition-colors">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-[#0077b6] shadow-sm">
          <FaUserMd size={18} />
        </span>
        <span className="text-lg font-bold tracking-tight text-white">Bệnh viện Chợ Rẫy</span>
      </button>

      <div className="mx-6 flex min-w-[260px] max-w-xl flex-1 items-center rounded-lg border border-white/15 bg-white/10 px-3 py-1.5 transition-all duration-200 focus-within:bg-white focus-within:border-white focus-within:text-slate-900 text-white">
        <FaSearch className="mr-2 text-white/70 focus-within:text-[#0077b6]" />
        <input 
          placeholder="Tìm kiếm bệnh nhân, hồ sơ, mã khám..." 
          className="w-full bg-transparent text-sm outline-none placeholder-white/50 text-current" 
        />
      </div>

      <div className="flex items-center gap-1.5">
        <Tool label="Thông báo" active={panel === "notifications"} onClick={() => togglePanel("notifications")}>
          <FaBell />
          {unread > 0 && <Badge value={unread} />}
        </Tool>
        <Tool label="Yêu cầu hỗ trợ" onClick={() => { setPanel(""); setSupportOpen(true); }}>
          <FaQuestionCircle />
        </Tool>
        <Tool label="Trạng thái hệ thống" active={panel === "system"} onClick={() => togglePanel("system")}>
          <FaGlobe />
        </Tool>

        {panel === "notifications" && (
          <div className="absolute right-36 top-12 w-[390px] overflow-hidden rounded-xl border border-slate-200 bg-white text-slate-700 shadow-xl">
            <div className="flex items-center justify-between border-b px-4 py-3 bg-slate-50">
              <strong className="text-sm text-slate-900">Thông báo</strong>
              <span className="text-xs font-semibold text-sky-600 bg-sky-50 px-2 py-0.5 rounded-full">{unread} chưa đọc</span>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-slate-500">Chưa có thông báo.</p>
              ) : (
                notifications.map((item) => (
                  <button 
                    key={item.id} 
                    onClick={() => openNotification(item)} 
                    className={`block w-full border-b px-4 py-3 text-left hover:bg-slate-50 transition-colors ${item.isRead ? "bg-white" : "bg-sky-50/40"}`}
                  >
                    <span className="flex justify-between gap-3">
                      <strong className="truncate text-sm text-slate-800 font-bold">{item.title}</strong>
                      <small className="shrink-0 text-slate-400 font-medium">{formatTime(item.createdAt)}</small>
                    </span>
                    <span className="mt-1 line-clamp-2 block text-sm leading-5 text-slate-500 font-medium">{item.message}</span>
                    <span className="mt-2 block text-xs font-bold text-sky-600">Xem chi tiết →</span>
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        {panel === "system" && (
          <div className="absolute right-24 top-12 w-72 rounded-xl border border-slate-200 bg-white p-4 text-slate-700 shadow-xl">
            <strong className="text-sm text-slate-900 font-bold">Trạng thái hệ thống</strong>
            <StatusRow label="API máy chủ" ok={health.api === "online"} value={health.api === "online" ? "Hoạt động" : health.api === "checking" ? "Đang kiểm tra" : "Mất kết nối"} />
            <StatusRow label="Thông báo realtime" ok={health.realtime === "online"} value={health.realtime === "online" ? "Đã kết nối" : "Đang kết nối lại"} />
            <StatusRow label="Ngôn ngữ" ok value="Tiếng Việt" />
            <p className="mt-3 truncate border-t pt-3 text-[11px] font-semibold text-slate-400">Màn hình: {location.pathname}</p>
          </div>
        )}

        <div className="relative ml-2 border-l border-white/20 pl-3">
          <button onClick={() => togglePanel("profile")} className="flex items-center gap-2 rounded-md px-1.5 py-1 hover:bg-white/10 transition-colors">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Ảnh đại diện" className="h-8 w-8 rounded-full border border-white/20 object-cover" />
            ) : (
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-[#0077b6] shadow-sm">
                <FaUserMd />
              </span>
            )}
            <span className="max-w-[170px] truncate text-sm font-bold text-white">{context?.title || userName}</span>
            <FaChevronDown size={10} className={`text-white/60 transition-transform duration-200 ${panel === "profile" ? "rotate-180" : ""}`} />
          </button>
          {panel === "profile" && (
            <div className="absolute right-0 top-11 w-56 rounded-xl border border-slate-200 bg-white py-1 text-sm text-slate-700 shadow-xl">
              <Menu icon={<FaUserCircle className="text-slate-400" />} text="Tài khoản cá nhân" onClick={() => navigate("/dashboard/tai-khoan")} />
              <Menu icon={<FaKey className="text-slate-400" />} text="Đổi mật khẩu" onClick={() => navigate("/dashboard/tai-khoan?tab=doi-mat-khau")} />
              <Menu icon={<FaSignOutAlt />} text="Đăng xuất" danger onClick={logout} />
            </div>
          )}
        </div>
      </div>
    </header>

    {selectedNotice && <Modal onClose={() => setSelectedNotice(null)} title={selectedNotice.title} width="max-w-xl"><div className="flex items-center gap-2 text-xs font-semibold text-slate-500"><Severity value={selectedNotice.severity} /><span>{formatTime(selectedNotice.createdAt, true)}</span></div><p className="mt-4 whitespace-pre-wrap text-[15px] leading-7 text-slate-700">{selectedNotice.message}</p>{selectedNotice.expiresAt && <p className="mt-5 border-t pt-3 text-xs text-slate-500">Hiệu lực đến: {formatTime(selectedNotice.expiresAt, true)}</p>}</Modal>}

    {supportOpen && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"><form onSubmit={submitSupport} className="w-full max-w-lg overflow-hidden rounded-xl bg-white shadow-2xl"><ModalHeader title="Yêu cầu hỗ trợ" subtitle="Admin sẽ nhận màn hình hiện tại và ngữ cảnh kỹ thuật để kiểm tra nhanh." onClose={() => setSupportOpen(false)} /><div className="space-y-4 px-6 py-5"><div className="grid grid-cols-2 gap-3"><Select label="Loại yêu cầu" value={support.category} onChange={(category) => setSupport({ ...support, category })} options={[["HO_TRO","Cần hướng dẫn"],["LOI_HE_THONG","Lỗi hệ thống"],["DU_LIEU","Sai dữ liệu"]]} /><Select label="Mức độ" value={support.priority} onChange={(priority) => setSupport({ ...support, priority })} options={[["NORMAL","Bình thường"],["HIGH","Gấp"],["URGENT","Khẩn cấp"]]} /></div><Field label="Tiêu đề"><input value={support.subject} onChange={(e) => setSupport({ ...support, subject: e.target.value })} placeholder="Ví dụ: Không lưu được phiếu tiếp đón" className="form-control" /></Field><Field label="Mô tả tình huống *"><textarea required rows={5} value={support.description} onChange={(e) => setSupport({ ...support, description: e.target.value })} className="form-control resize-none" placeholder="Bạn đang thao tác gì, hệ thống phản hồi ra sao?" /></Field><div className="rounded-md bg-sky-50 px-3 py-2 text-xs text-sky-800">Tự động đính kèm màn hình hiện tại, trình duyệt và lỗi giao diện gần nhất nếu có.</div></div><div className="flex justify-end gap-2 border-t bg-slate-50 px-6 py-4"><button type="button" onClick={() => setSupportOpen(false)} className="rounded-md border px-4 py-2 text-sm">Hủy</button><button disabled={sending} className="rounded-md bg-[#0077B6] px-5 py-2 text-sm font-semibold text-white disabled:opacity-60">{sending ? "Đang gửi..." : "Gửi yêu cầu"}</button></div></form></div>}
  </>;
}

function Tool({ label, children, onClick, active }) { return <button title={label} aria-label={label} onClick={onClick} className={`relative flex h-9 w-9 items-center justify-center rounded-md text-lg transition-colors ${active ? "bg-white text-[#0077b6] shadow-sm" : "text-white/90 hover:bg-white/10 hover:text-white"}`}>{children}</button>; }
function Badge({ value }) { return <span className="absolute -right-1 -top-1 min-w-[17px] rounded-full bg-rose-500 px-1 text-[10px] font-bold leading-[17px] text-white">{value > 99 ? "99+" : value}</span>; }
function StatusRow({ label, value, ok }) { return <div className="mt-3 flex justify-between text-sm"><span>{label}</span><span className={ok ? "font-medium text-emerald-600" : "font-medium text-amber-600"}>{value}</span></div>; }
function Menu({ icon, text, onClick, danger }) { return <button onClick={onClick} className={`flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm font-semibold transition-colors hover:bg-slate-50 ${danger ? "border-t border-slate-100 text-rose-600 hover:bg-rose-50/50" : "text-slate-700 hover:text-sky-600"}`}>{icon}{text}</button>; }
function Severity({ value }) { const text = value === "URGENT" ? "Khẩn cấp" : value === "WARNING" ? "Cảnh báo" : "Thông tin"; const cls = value === "URGENT" ? "bg-rose-100 text-rose-700" : value === "WARNING" ? "bg-amber-100 text-amber-700" : "bg-sky-100 text-sky-700"; return <span className={`rounded-full px-2 py-1 ${cls}`}>{text}</span>; }
function ModalHeader({ title, subtitle, onClose }) { return <div className="flex items-start justify-between border-b px-6 py-4"><div><h2 className="text-lg font-bold text-slate-900">{title}</h2>{subtitle && <p className="mt-1 text-sm text-slate-600">{subtitle}</p>}</div><button onClick={onClose} type="button" className="rounded p-2 text-slate-500 hover:bg-slate-100"><FaTimes /></button></div>; }
function Modal({ title, children, onClose, width }) { return <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"><div className={`w-full ${width} overflow-hidden rounded-xl bg-white shadow-2xl`}><ModalHeader title={title} onClose={onClose} /><div className="px-6 py-5">{children}</div><div className="flex justify-end border-t bg-slate-50 px-6 py-4"><button onClick={onClose} className="rounded-md bg-sky-700 px-5 py-2 text-sm font-semibold text-white">Đóng</button></div></div></div>; }
function Field({ label, children }) { return <label className="block text-sm font-medium text-slate-700">{label}{children}</label>; }
function Select({ label, value, onChange, options }) { return <Field label={label}><select value={value} onChange={(e) => onChange(e.target.value)} className="form-control">{options.map(([key,text]) => <option key={key} value={key}>{text}</option>)}</select></Field>; }
