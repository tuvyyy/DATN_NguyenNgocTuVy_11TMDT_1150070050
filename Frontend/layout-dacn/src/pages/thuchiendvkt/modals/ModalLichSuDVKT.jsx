import React, { useEffect, useMemo, useState } from "react";
import { History, Loader2, X } from "lucide-react";
import { getLogsDVKT } from "../../../api/ThucHienDVKTApi";

const ACTION_META = {
  nhan: ["Tiếp nhận chỉ định", "bg-sky-50 border-sky-200 text-sky-700"],
  huy_nhan: ["Hủy tiếp nhận", "bg-rose-50 border-rose-200 text-rose-700"],
  ket_qua_tong: ["Lưu kết quả tổng", "bg-indigo-50 border-indigo-200 text-indigo-700"],
  ket_qua_chi_tiet: ["Cập nhật chỉ tiêu", "bg-violet-50 border-violet-200 text-violet-700"],
  hoan_thanh: ["Hoàn thành DVKT", "bg-emerald-50 border-emerald-200 text-emerald-700"],
  duyet_ket_qua: ["Duyệt kết quả", "bg-teal-50 border-teal-200 text-teal-700"],
  huy_duyet: ["Hủy duyệt", "bg-amber-50 border-amber-200 text-amber-700"],
  gui_ket_qua: ["Gửi kết quả", "bg-cyan-50 border-cyan-200 text-cyan-700"],
};

const getValue = (row, key) => row?.[key] ?? row?.[key.charAt(0).toUpperCase() + key.slice(1)];

function normalizeLog(row) {
  const action = String(getValue(row, "action") || "").toLowerCase();
  const [label, tone] = ACTION_META[action] || [action || "Thao tác", "bg-slate-50 border-slate-200 text-slate-700"];
  return {
    id: getValue(row, "id"),
    action,
    label,
    tone,
    note: getValue(row, "note"),
    createdAt: getValue(row, "createdAt"),
    userName: getValue(row, "nguoiThucHien"),
    username: getValue(row, "tenDangNhap"),
    userId: getValue(row, "idNguoiThucHien"),
  };
}

export default function ModalLichSuDVKT({ open, order, onClose }) {
  const orderId = order?.id;
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open || !orderId) return;

    let alive = true;
    setLoading(true);
    setError("");

    getLogsDVKT(orderId)
      .then((data) => {
        if (!alive) return;
        setLogs(Array.isArray(data) ? data.map(normalizeLog) : []);
      })
      .catch((err) => {
        if (!alive) return;
        setError(err?.response?.data?.message || err?.response?.data || err?.message || "Không tải được lịch sử xử lý.");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [open, orderId]);

  const title = useMemo(() => order?.tenDvkt || order?.TenDvkt || "Chỉ định cận lâm sàng", [order]);
  const patient = order?.benhNhan || order?.BenhNhan || "-";

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <div className="flex h-[78vh] w-full max-w-3xl min-h-0 flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xl">
        <header className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-200 bg-slate-50 px-5 py-4">
          <div className="min-w-0">
            <p className="mb-1 flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-wider text-[#0077B6]">
              <History size={15} />
              Lịch sử xử lý CLS
            </p>
            <h2 className="truncate text-lg font-bold text-slate-900">{title}</h2>
            <p className="mt-0.5 truncate text-sm font-semibold text-slate-500">{patient}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-100"
            title="Đóng"
          >
            <X size={17} />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-auto px-5 py-4">
          {loading ? (
            <div className="flex h-full min-h-[220px] items-center justify-center gap-2 text-sm font-semibold text-slate-500">
              <Loader2 size={18} className="animate-spin" />
              Đang tải lịch sử...
            </div>
          ) : error ? (
            <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
              {error}
            </div>
          ) : logs.length ? (
            <ol className="relative space-y-4 border-l border-slate-200 pl-5">
              {logs.map((log) => (
                <li key={log.id || `${log.action}-${log.createdAt}`} className="relative">
                  <span className="absolute -left-[29px] top-1.5 h-3 w-3 rounded-full border-2 border-white bg-[#0077B6] shadow" />
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-bold ${log.tone}`}>
                        {log.label}
                      </span>
                      <p className="mt-2 text-sm font-semibold text-slate-800">
                        {log.userName || log.username || `Người dùng #${log.userId || "-"}`}
                      </p>
                      {log.note && <p className="mt-1 text-sm text-slate-600">{log.note}</p>}
                    </div>
                    <time className="whitespace-nowrap text-xs font-semibold text-slate-400">
                      {log.createdAt ? new Date(log.createdAt).toLocaleString("vi-VN") : "-"}
                    </time>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <div className="flex h-full min-h-[220px] items-center justify-center rounded-md border border-dashed border-slate-200 text-sm font-semibold text-slate-400">
              Chưa có lịch sử xử lý.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
