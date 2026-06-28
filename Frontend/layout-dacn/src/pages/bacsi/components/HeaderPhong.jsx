import React from "react";
import { Activity, CheckCircle2, Clock3, Stethoscope } from "lucide-react";

function Stat({ icon: Icon, label, value, tone }) {
  const tones = {
    sky: "bg-sky-50 text-sky-700 border-sky-200",
    blue: "bg-indigo-50 text-indigo-700 border-indigo-200",
    green: "bg-emerald-50 text-emerald-700 border-emerald-200",
  };

  return (
    <div className={`flex min-w-[114px] items-center gap-2 rounded-lg border px-3 py-2 shadow-sm ${tones[tone]}`}>
      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-white/70">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-wide opacity-70">{label}</div>
        <div className="text-lg font-black leading-5">{value}</div>
      </div>
    </div>
  );
}

export default function HeaderPhong({ phong, counts = {} }) {
  return (
    <div className="overflow-hidden rounded-xl border border-sky-100 bg-white shadow-sm">
      <div className="h-1 bg-gradient-to-r from-sky-500 via-indigo-500 to-emerald-500" />
      <div className="px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-sky-600 to-indigo-600 text-white shadow-sm">
            <Stethoscope className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Bảng điều phối phòng khám
            </div>
            <div className="text-xl font-black text-slate-950">
              {phong?.tenPhong || "Đang tải phòng khám..."}
            </div>
            <div className="text-xs font-medium text-slate-500">
              Khu vực bác sĩ · {phong?.idKhoa ? `Khoa/phòng: ${phong.idKhoa}` : "Sẵn sàng tiếp nhận lượt khám"}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Stat icon={Clock3} label="Chờ khám" value={counts.choKham || 0} tone="sky" />
          <Stat icon={Activity} label="Đang khám" value={counts.dangKham || 0} tone="blue" />
          <Stat icon={CheckCircle2} label="Đã khám" value={counts.daKham || 0} tone="green" />
        </div>
      </div>
      </div>
    </div>
  );
}
