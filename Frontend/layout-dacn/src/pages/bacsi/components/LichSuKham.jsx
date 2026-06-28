import React, { useState } from "react";
import { ChevronLeft, ChevronRight, History } from "lucide-react";

function statusLabel(status) {
  const map = {
    CHO_KHAM: "Chờ khám",
    DANG_KHAM: "Đang khám",
    DA_KHAM: "Đã khám",
    DA_HUY: "Đã hủy",
    CHO_THANH_TOAN: "Chờ thanh toán",
    DA_THANH_TOAN: "Đã thanh toán",
  };
  return map[status] || status || "---";
}

function statusClass(status) {
  if (status === "DA_KHAM") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "DANG_KHAM") return "border-blue-200 bg-blue-50 text-blue-700";
  if (status === "DA_HUY") return "border-slate-200 bg-slate-100 text-slate-500";
  return "border-amber-200 bg-amber-50 text-amber-700";
}

function valueOf(obj, ...keys) {
  for (const key of keys) {
    if (obj && obj[key] !== undefined && obj[key] !== null) return obj[key];
  }
  return undefined;
}

function formatExamTime(row) {
  const raw = valueOf(row, "thoiGianKetThuc", "ThoiGianKetThuc") ||
    valueOf(row, "thoiGianBatDau", "ThoiGianBatDau") ||
    valueOf(row, "createdAt", "CreatedAt");
  if (!raw) return "Chưa có thời gian";

  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return "Chưa có thời gian";

  return date.toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default function LichSuKham({ list, selectedId, onSelect }) {
  const [collapsed, setCollapsed] = useState(false);

  if (collapsed) {
    return (
      <button
        type="button"
        className="flex w-11 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-sky-700 shadow-sm hover:border-sky-300"
        onClick={() => setCollapsed(false)}
        title="Mở lịch sử khám"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
    );
  }

  return (
    <aside className="w-[330px] shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 bg-gradient-to-br from-white via-violet-50/70 to-amber-50/50 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-violet-100 text-violet-700">
            <History className="h-4 w-4" />
          </div>
          <div>
            <div className="text-sm font-bold text-slate-800">Lịch sử khám</div>
            <div className="text-xs text-slate-500">{list?.length || 0} lượt trước</div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setCollapsed(true)}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          title="Thu gọn"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="h-[calc(100%-57px)] overflow-y-auto p-3">
        {!list || list.length === 0 ? (
          <div className="mt-10 rounded-lg border border-dashed border-slate-200 p-5 text-center text-sm text-slate-400">
            Chưa có lịch sử khám.
          </div>
        ) : (
          list.map((ls) => {
            const active = String(selectedId || "") === String(ls.id || "");
            return (
              <button
                key={ls.id}
                type="button"
                onClick={() => onSelect?.(ls)}
                className={`mb-2 w-full rounded-lg border p-3 text-left transition-all hover:-translate-y-0.5 hover:border-violet-300 hover:bg-violet-50/70 hover:shadow-sm ${
                  active ? "border-violet-400 bg-violet-50 shadow-sm ring-2 ring-violet-100" : "border-slate-200 bg-slate-50"
                }`}
              >
                <div className="line-clamp-2 text-sm font-bold text-slate-800">
                  {ls.chanDoanCuoi || "(Chưa có chẩn đoán)"}
                </div>
                <div className="mt-2 flex items-center justify-between gap-2 text-xs text-slate-500">
                  <span className="truncate">{ls.phongKham || "---"}</span>
                  <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${statusClass(ls.trangThai)}`}>
                    {statusLabel(ls.trangThai)}
                  </span>
                </div>
                <div className="mt-1 text-xs text-slate-400">
                  {formatExamTime(ls)}
                </div>
              </button>
            );
          })
        )}
      </div>
    </aside>
  );
}
