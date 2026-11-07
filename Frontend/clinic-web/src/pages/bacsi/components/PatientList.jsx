import React, { useMemo, useState } from "react";
import { AlertTriangle, CalendarDays, CheckCircle2, Clock3, Search } from "lucide-react";

const tabs = [
  { id: "CHO_KHAM", label: "Chờ", icon: Clock3, active: "bg-sky-600 text-white shadow-sm" },
  { id: "HOM_NAY", label: "Hôm nay", icon: CalendarDays, active: "bg-amber-500 text-white shadow-sm" },
  { id: "DA_KHAM", label: "Đã khám", icon: CheckCircle2, active: "bg-emerald-600 text-white shadow-sm" },
];

function priorityClass(priority) {
  const text = (priority || "").toLowerCase();
  if (text.includes("cấp") || text.includes("cap") || text.includes("khẩn") || text.includes("khan")) {
    return "bg-red-50 text-red-700 border-red-200";
  }
  if (text.includes("ưu") || text.includes("uu") || text.includes("vip")) {
    return "bg-amber-50 text-amber-700 border-amber-200";
  }
  return "bg-slate-50 text-slate-600 border-slate-200";
}

function statusClass(status) {
  switch (status) {
    case "DANG_KHAM":
      return "bg-blue-50 text-blue-700 border-blue-200";
    case "DA_KHAM":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "DA_HUY":
      return "bg-slate-100 text-slate-500 border-slate-200";
    default:
      return "bg-sky-50 text-sky-700 border-sky-200";
  }
}

function statusLabel(status) {
  const map = {
    CHO_KHAM: "Chờ khám",
    DANG_KHAM: "Đang khám",
    DA_KHAM: "Đã khám",
    DA_HUY: "Đã hủy",
  };
  return map[status] || status || "Chờ khám";
}

export default function PatientList({
  list,
  filter,
  setFilter,
  selected,
  onSelect,
  counts = {},
  loadingId,
  refreshing,
  onRefresh,
}) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return list || [];
    return (list || []).filter((bn) =>
      `${bn.benhNhan || ""} ${bn.maBenhNhan || ""} ${bn.maHoSo || ""}`
        .toLowerCase()
        .includes(q)
    );
  }, [list, search]);

  const countFor = (tab) => {
    if (tab === "CHO_KHAM") return counts.choKham ?? 0;
    if (tab === "HOM_NAY") return counts.dangKham ?? 0;
    return counts.daKham ?? 0;
  };

  return (
    <aside className="w-[350px] shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 bg-gradient-to-br from-white via-sky-50/70 to-emerald-50/50 px-3 py-3">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Hàng đợi khám
            </div>
            <div className="whitespace-nowrap text-lg font-bold text-slate-900">
              Tổng danh sách: {filtered.length} lượt
            </div>
          </div>

          <button
            type="button"
            onClick={onRefresh}
            className="inline-flex h-8 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600 shadow-sm transition hover:border-sky-300 hover:text-sky-700"
            title="Làm mới danh sách"
          >
            {refreshing ? "Đang tải" : "Làm mới"}
          </button>
        </div>

        <div className="grid grid-cols-3 gap-1 rounded-md bg-slate-100 p-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = filter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilter(tab.id)}
                className={`flex min-w-0 items-center justify-center gap-1 rounded px-1.5 py-2 text-[11px] font-bold transition-all whitespace-nowrap ${
                  active ? tab.active : "text-slate-500 hover:bg-white hover:text-slate-800"
                }`}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate whitespace-nowrap">{tab.label}</span>
                <span className={`shrink-0 rounded-full px-1.5 text-[10px] ${active ? "bg-white/25 text-white" : "bg-slate-200 text-slate-600"}`}>
                  {countFor(tab.id)}
                </span>
              </button>
            );
          })}
        </div>

        <div className="relative mt-3">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-full rounded-md border border-slate-200 bg-white pl-8 pr-3 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
            placeholder="Tìm tên, mã BN, mã hồ sơ..."
          />
        </div>
      </div>

      <div className="h-[calc(100%-134px)] overflow-y-auto p-3">
        {filtered.length === 0 ? (
          <div className="mt-10 rounded-lg border border-dashed border-slate-200 p-5 text-center text-sm text-slate-400">
            Không có bệnh nhân phù hợp.
          </div>
        ) : (
          filtered.map((bn) => {
            const active = selected?.id === bn.id;
            const loading = loadingId === bn.id;
            return (
              <button
                key={bn.id}
                type="button"
                onClick={() => onSelect(bn)}
                className={`mb-2 w-full rounded-lg border p-3 text-left transition-all hover:-translate-y-0.5 hover:border-sky-300 hover:bg-sky-50/60 hover:shadow-sm ${
                  active ? "border-sky-600 bg-sky-100 shadow-md ring-2 ring-sky-300/70" : "border-slate-200 bg-white"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-bold text-slate-800">
                      {bn.benhNhan || "(Chưa có tên)"}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {bn.maBenhNhan || bn.maHoSo || "---"} ·{" "}
                      {bn.thoiGianBatDau
                        ? new Date(bn.thoiGianBatDau).toLocaleTimeString("vi-VN", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "chưa vào khám"}
                    </div>
                  </div>

                  <span className={`shrink-0 rounded-md border px-2 py-1 text-[11px] font-bold ${
                    active ? "border-sky-600 bg-sky-600 text-white" : "border-sky-200 bg-white text-sky-700"
                  }`}>
                    STT {bn.sttKham || "--"}
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${statusClass(bn.trangThai)}`}>
                    {statusLabel(bn.trangThai)}
                  </span>

                  {bn.mucUuTien && (
                    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${priorityClass(bn.mucUuTien)}`}>
                      <AlertTriangle className="h-3 w-3" />
                      {bn.mucUuTien}
                    </span>
                  )}

                  {loading && (
                    <span className="ml-auto inline-flex items-center gap-1 text-[11px] font-semibold text-sky-600">
                      <span className="h-2 w-2 animate-pulse rounded-full bg-sky-500" />
                      Đang mở
                    </span>
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>
    </aside>
  );
}
