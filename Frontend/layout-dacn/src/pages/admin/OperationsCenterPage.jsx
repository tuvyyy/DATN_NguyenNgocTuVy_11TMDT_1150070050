import React, { useCallback, useEffect, useMemo, useState } from "react";
import { BellRing, CheckCircle2, Headphones, Pencil, RefreshCw, Send, Trash2, X } from "lucide-react";
import { toast } from "react-toastify";
import { OperationsApi } from "../../api/OperationsApi";
import { createOperationsConnection } from "../../services/operationsRealtime";

const STATUS = { NEW: "Mới", IN_PROGRESS: "Đang xử lý", RESOLVED: "Đã xử lý" };
const PRIORITY = { NORMAL: "Bình thường", HIGH: "Gấp", URGENT: "Khẩn cấp" };
const CATEGORY = { HO_TRO: "Cần hướng dẫn", LOI_HE_THONG: "Lỗi hệ thống", DU_LIEU: "Sai dữ liệu" };
const emptyForm = { title: "", message: "", severity: "INFO", targetType: "ALL", targetRole: "", targetUserId: "" };
const formatTime = (value) => value ? new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" }).format(new Date(value)) : "";

export default function OperationsCenterPage() {
  const [tab, setTab] = useState("support");
  const [tickets, setTickets] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [sent, setSent] = useState([]);
  const [targets, setTargets] = useState({ users: [], roles: [] });
  const [diagnostics, setDiagnostics] = useState([]);
  const [note, setNote] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [deleteItem, setDeleteItem] = useState(null);

  const load = useCallback(async () => {
    try {
      const [supportRows, sentRows, targetRows] = await Promise.all([OperationsApi.supportRequests(), OperationsApi.sentNotifications(), OperationsApi.targets()]);
      setTickets(supportRows); setSent(sentRows); setTargets(targetRows);
      setSelectedId((id) => supportRows.some((x) => x.id === id) ? id : supportRows[0]?.id || null);
    } catch { toast.error("Không tải được dữ liệu vận hành.", { containerId: "app-global" }); }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const connection = createOperationsConnection();
    connection.on("SupportCreated", (item) => { toast.info(`Có yêu cầu hỗ trợ mới #${item.id}.`, { containerId: "app-global" }); load(); });
    connection.on("NotificationChanged", load);
    connection.start().catch(() => {});
    return () => { connection.stop().catch(() => {}); };
  }, [load]);

  const selected = useMemo(() => tickets.find((x) => x.id === selectedId), [tickets, selectedId]);
  useEffect(() => {
    setNote(selected?.adminNote || "");
    if (selected?.id) OperationsApi.diagnostics(selected.id).then(setDiagnostics).catch(() => setDiagnostics([]));
  }, [selected?.id, selected?.adminNote]);

  const updateTicket = async (status) => {
    if (!selected) return;
    try { await OperationsApi.updateSupport(selected.id, { status, adminNote: note }); await load(); toast.success("Đã cập nhật yêu cầu hỗ trợ.", { containerId: "app-global" }); }
    catch { toast.error("Không cập nhật được yêu cầu.", { containerId: "app-global" }); }
  };

  const saveNotification = async (event) => {
    event.preventDefault();
    const payload = { title: form.title, message: form.message, severity: form.severity,
      targetRole: form.targetType === "ROLE" ? form.targetRole : null,
      targetUserId: form.targetType === "USER" ? Number(form.targetUserId) : null };
    try {
      if (editingId) await OperationsApi.updateNotification(editingId, payload); else await OperationsApi.sendNotification(payload);
      toast.success(editingId ? "Đã cập nhật thông báo." : "Đã gửi thông báo realtime.", { containerId: "app-global" });
      setEditingId(null); setForm(emptyForm); await load();
    } catch (error) { toast.error(error.response?.data?.message || "Không lưu được thông báo.", { containerId: "app-global" }); }
  };

  const startEdit = (item) => {
    setEditingId(item.id);
    setForm({ title: item.title, message: item.message, severity: item.severity || "INFO",
      targetType: item.targetUserId ? "USER" : item.targetRole ? "ROLE" : "ALL",
      targetRole: item.targetRole || "", targetUserId: item.targetUserId ? String(item.targetUserId) : "" });
  };

  const confirmDelete = async () => {
    try { await OperationsApi.deleteNotification(deleteItem.id); setDeleteItem(null); await load(); toast.success("Đã xóa thông báo.", { containerId: "app-global" }); }
    catch { toast.error("Không xóa được thông báo.", { containerId: "app-global" }); }
  };

  return <section className="flex h-full min-h-0 flex-col overflow-hidden py-3">
    <header className="flex shrink-0 items-end justify-between border-b border-slate-200 pb-3"><div><h1 className="text-2xl font-bold text-slate-900">Trung tâm vận hành</h1><p className="mt-1 text-sm text-slate-600">Theo dõi hỗ trợ và quản lý thông báo nội bộ.</p></div><button onClick={load} className="inline-flex items-center gap-2 rounded-md border bg-white px-3 py-2 text-sm font-medium"><RefreshCw size={15} /> Làm mới</button></header>
    <nav className="mt-3 flex shrink-0 border-b"><Tab active={tab === "support"} onClick={() => setTab("support")} icon={<Headphones size={17} />} label="Yêu cầu hỗ trợ" count={tickets.filter((x) => x.status !== "RESOLVED").length} /><Tab active={tab === "notice"} onClick={() => setTab("notice")} icon={<BellRing size={17} />} label="Thông báo" count={sent.length} /></nav>

    {tab === "support" ? <div className="grid min-h-0 flex-1 grid-cols-[48%_52%] overflow-hidden border-x border-b bg-white">
      <div className="min-h-0 overflow-auto border-r"><table className="w-full table-fixed text-sm"><thead className="sticky top-0 z-10 bg-slate-100 text-[11px] uppercase text-slate-600"><tr><th className="w-[28%] px-3 py-2 text-left">Người yêu cầu</th><th className="w-[25%] px-2 py-2 text-left">Loại hỗ trợ</th><th className="w-[20%] px-2 py-2 text-left">Mức độ</th><th className="w-[27%] px-2 py-2 text-left">Tình trạng</th></tr></thead><tbody>{tickets.map((ticket) => <tr key={ticket.id} onClick={() => setSelectedId(ticket.id)} className={`cursor-pointer border-b align-top hover:bg-sky-50 ${selectedId === ticket.id ? "bg-sky-50 ring-1 ring-inset ring-sky-300" : ""}`}><td className="px-3 py-3"><strong className="block truncate text-slate-900">{ticket.requesterName || ticket.requesterUsername}</strong><span className="text-xs text-slate-500">#{ticket.id} · {formatTime(ticket.createdAt)}</span></td><td className="px-2 py-3"><Category value={ticket.category} /></td><td className="px-2 py-3"><Priority value={ticket.priority} /></td><td className="px-2 py-3"><Status value={ticket.status} /></td></tr>)}{tickets.length === 0 && <tr><td colSpan={4} className="p-10 text-center text-slate-500">Chưa có yêu cầu hỗ trợ.</td></tr>}</tbody></table></div>
      <div className="min-h-0 overflow-y-auto">{!selected ? <Empty text="Chọn một yêu cầu để xem chi tiết." /> : <div className="p-6"><div className="flex items-start justify-between gap-4 border-b pb-5"><div><div className="flex gap-2"><Category value={selected.category} /><Priority value={selected.priority} /><Status value={selected.status} /></div><h2 className="mt-3 text-xl font-bold text-slate-900">{selected.subject}</h2><p className="mt-1 text-sm text-slate-600">{selected.requesterName} ({selected.requesterUsername})</p></div><div className="flex gap-2"><button onClick={() => updateTicket("IN_PROGRESS")} className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">Tiếp nhận</button><button onClick={() => updateTicket("RESOLVED")} className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white"><CheckCircle2 size={15} /> Hoàn tất</button></div></div>
        <div className="grid grid-cols-2 gap-5 py-5"><Info label="Mô tả" value={selected.description} wide /><Info label="Màn hình" value={selected.route || "Không xác định"} /><Info label="Thời gian" value={formatTime(selected.createdAt)} /><Info label="Trình duyệt" value={selected.userAgent || "Không có"} wide small /></div>
        <label className="block border-t pt-5 text-sm font-semibold text-slate-700">Phản hồi / ghi chú xử lý<textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} className="mt-2 w-full resize-none rounded-md border border-slate-300 px-3 py-2 font-normal" /><button onClick={() => updateTicket(selected.status)} className="mt-2 rounded-md bg-sky-700 px-4 py-2 text-sm font-semibold text-white">Lưu ghi chú</button></label>
        <div className="mt-6 border-t pt-5"><h3 className="font-bold text-slate-900">Audit gần đây</h3><div className="mt-3 overflow-hidden rounded-md border">{diagnostics.length === 0 ? <p className="p-4 text-sm text-slate-500">Không có audit liên quan.</p> : diagnostics.map((row, i) => <div key={i} className="grid grid-cols-[120px_1fr_145px] border-b px-3 py-2 text-sm last:border-0"><span className="font-medium text-sky-700">{row.source}</span><span>{row.action} · {row.target}</span><span className="text-right text-slate-500">{formatTime(row.time)}</span></div>)}</div></div>
      </div>}</div>
    </div> : <div className="grid min-h-0 flex-1 grid-cols-[40%_60%] overflow-hidden border-x border-b bg-white">
      <form onSubmit={saveNotification} className="min-h-0 overflow-y-auto border-r p-6"><div className="flex items-center justify-between"><div><h2 className="text-lg font-bold text-slate-900">{editingId ? `Sửa thông báo #${editingId}` : "Soạn thông báo"}</h2><p className="mt-1 text-sm text-slate-500">Nội dung sẽ được đẩy realtime tới người nhận.</p></div>{editingId && <button type="button" onClick={() => { setEditingId(null); setForm(emptyForm); }} className="rounded p-2 text-slate-500 hover:bg-slate-100"><X size={18} /></button>}</div><div className="mt-6 space-y-4"><Field label="Tiêu đề"><input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="control" /></Field><Field label="Nội dung"><textarea required rows={6} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} className="control resize-none" /></Field><div className="grid grid-cols-2 gap-3"><Field label="Mức độ"><select value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })} className="control"><option value="INFO">Thông tin</option><option value="WARNING">Cảnh báo</option><option value="URGENT">Khẩn cấp</option></select></Field><Field label="Đối tượng"><select value={form.targetType} onChange={(e) => setForm({ ...form, targetType: e.target.value })} className="control"><option value="ALL">Tất cả</option><option value="ROLE">Theo vai trò</option><option value="USER">Một người</option></select></Field></div>{form.targetType === "ROLE" && <Field label="Vai trò"><select required value={form.targetRole} onChange={(e) => setForm({ ...form, targetRole: e.target.value })} className="control"><option value="">Chọn vai trò</option>{targets.roles.map((x) => <option key={x}>{x}</option>)}</select></Field>}{form.targetType === "USER" && <Field label="Người nhận"><select required value={form.targetUserId} onChange={(e) => setForm({ ...form, targetUserId: e.target.value })} className="control"><option value="">Chọn người dùng</option>{targets.users.map((x) => <option key={x.id} value={x.id}>{x.hoTen} ({x.tenDangNhap})</option>)}</select></Field>}<button className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-sky-700 px-4 py-2.5 font-semibold text-white hover:bg-sky-800"><Send size={17} /> {editingId ? "Lưu thay đổi" : "Gửi thông báo"}</button></div></form>
      <div className="min-h-0 overflow-y-auto p-6"><h2 className="text-lg font-bold text-slate-900">Thông báo đã gửi</h2><div className="mt-4 divide-y border-y">{sent.map((item) => <article key={item.id} className="py-4"><div className="flex items-start justify-between gap-4"><div className="min-w-0"><div className="flex items-center gap-2"><strong className="truncate text-slate-900">{item.title}</strong><Priority value={item.severity === "URGENT" ? "URGENT" : item.severity === "WARNING" ? "HIGH" : "NORMAL"} /></div><p className="mt-1 line-clamp-2 text-sm leading-5 text-slate-600">{item.message}</p><p className="mt-2 text-xs font-semibold text-sky-700">{item.targetUserId ? `Người dùng #${item.targetUserId}` : item.targetRole ? `Vai trò: ${item.targetRole}` : "Tất cả người dùng"} · {formatTime(item.createdAt)}</p></div><div className="flex shrink-0 gap-1"><button title="Sửa" onClick={() => startEdit(item)} className="rounded-md border p-2 text-sky-700 hover:bg-sky-50"><Pencil size={15} /></button><button title="Xóa" onClick={() => setDeleteItem(item)} className="rounded-md border p-2 text-rose-600 hover:bg-rose-50"><Trash2 size={15} /></button></div></div></article>)}{sent.length === 0 && <Empty text="Chưa gửi thông báo nào." />}</div></div>
    </div>}

    {deleteItem && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4"><div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl"><h3 className="text-lg font-bold text-slate-900">Xóa thông báo?</h3><p className="mt-2 text-sm leading-6 text-slate-600">Thông báo “{deleteItem.title}” sẽ biến mất khỏi danh sách của người dùng. Thao tác này không thể hoàn tác.</p><div className="mt-6 flex justify-end gap-2"><button onClick={() => setDeleteItem(null)} className="rounded-md border px-4 py-2 text-sm">Hủy</button><button onClick={confirmDelete} className="rounded-md bg-rose-600 px-4 py-2 text-sm font-semibold text-white">Xóa thông báo</button></div></div></div>}
  </section>;
}

function Tab({ active, onClick, icon, label, count }) { return <button onClick={onClick} className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold ${active ? "border-sky-600 text-sky-700" : "border-transparent text-slate-500"}`}>{icon}{label}<span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs">{count}</span></button>; }
function Status({ value }) { const cls = value === "RESOLVED" ? "bg-emerald-100 text-emerald-700" : value === "IN_PROGRESS" ? "bg-amber-100 text-amber-700" : "bg-sky-100 text-sky-700"; return <span className={`inline-block rounded-full px-2 py-1 text-[11px] font-bold ${cls}`}>{STATUS[value] || value}</span>; }
function Priority({ value }) { const cls = value === "URGENT" ? "bg-rose-100 text-rose-700" : value === "HIGH" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"; return <span className={`inline-block rounded-full px-2 py-1 text-[11px] font-bold ${cls}`}>{PRIORITY[value] || value}</span>; }
function Category({ value }) { const cls = value === "LOI_HE_THONG" ? "bg-rose-50 text-rose-700" : value === "DU_LIEU" ? "bg-violet-50 text-violet-700" : "bg-cyan-50 text-cyan-700"; return <span className={`inline-block rounded px-2 py-1 text-[11px] font-semibold ${cls}`}>{CATEGORY[value] || value}</span>; }
function Info({ label, value, wide, small }) { return <div className={wide ? "col-span-2" : ""}><p className="text-xs font-bold uppercase text-slate-500">{label}</p><p className={`mt-1 whitespace-pre-wrap text-slate-800 ${small ? "break-all text-xs" : "text-sm leading-6"}`}>{value}</p></div>; }
function Empty({ text }) { return <div className="flex h-40 items-center justify-center text-sm text-slate-500">{text}</div>; }
function Field({ label, children }) { return <label className="block text-sm font-semibold text-slate-700">{label}{children}</label>; }
