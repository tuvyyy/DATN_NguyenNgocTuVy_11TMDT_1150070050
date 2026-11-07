import React, { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, Download, Loader2, TrendingUp } from "lucide-react";
import { exportVisitAnalytics, getVisitAnalytics } from "../../api/BaoCaoApi";

const number = (value, digits = 2) => value == null ? "—" : Number(value).toLocaleString("vi-VN", { maximumFractionDigits: digits });
const inputClass = "mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 focus:border-sky-600 focus:outline-none focus:ring-2 focus:ring-sky-100 disabled:bg-slate-100";
const dateText = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const initialFilters = () => {
  const now = new Date();
  return { fromDate: dateText(new Date(now.getFullYear(), now.getMonth() - 36, 1)),
    toDate: dateText(new Date(now.getFullYear(), now.getMonth(), 0)), horizon: 6, testMonths: 6, demo: false };
};

export function SeriesChart({ labels, series, title }) {
  if (!labels.length) return <p className="py-10 text-center text-sm text-slate-500">Chưa có tháng đầy đủ để vẽ biểu đồ.</p>;
  const values = series.flatMap((s) => s.values.filter((x) => x != null && Number.isFinite(x)));
  const min = Math.min(0, ...values);
  const max = Math.max(1, ...values);
  const span = max - min || 1;
  const x = (i) => 65 + i * 820 / Math.max(1, labels.length - 1);
  const y = (v) => 265 - (v - min) / span * 230;
  const path = (items) => {
    let connected = false;
    return items.map((v, i) => {
      if (v == null || !Number.isFinite(v)) { connected = false; return ""; }
      const segment = `${connected ? "L" : "M"}${x(i)},${y(v)}`;
      connected = true;
      return segment;
    }).join(" ");
  };
  return <div>
    <div className="mb-2 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-600">
      {series.map((s) => <span key={s.name} className="inline-flex items-center gap-2"><span className="inline-block h-1 w-5 rounded" style={{ backgroundColor: s.color }} />{s.name}</span>)}
    </div>
    <div className="overflow-x-auto">
      <svg viewBox="0 0 930 315" className="w-full min-w-[560px]" role="img" aria-label={title}>
        <title>{title}</title>
        {Array.from({ length: 5 }, (_, i) => min + span * i / 4).map((v, i) => <g key={i}>
          <line x1="65" x2="885" y1={y(v)} y2={y(v)} stroke="#e2e8f0" />
          <text x="55" y={y(v) + 4} textAnchor="end" fontSize="11" fill="#64748b">{number(v, 0)}</text>
        </g>)}
        {labels.map((label, i) => i % Math.max(1, Math.ceil(labels.length / 8)) === 0 || i === labels.length - 1
          ? <text key={label} x={x(i)} y="291" textAnchor="middle" fontSize="11" fill="#64748b">{label}</text> : null)}
        {series.map((s) => <g key={s.name}>
          <path d={path(s.values)} fill="none" stroke={s.color} strokeWidth="2.5" strokeDasharray={s.dashed ? "7 5" : undefined} />
          {s.values.map((v, i) => v == null ? null : <circle key={i} cx={x(i)} cy={y(v)} r="3" fill={s.color}>
            <title>{`${labels[i]} · ${s.name}: ${number(v)} lượt`}</title>
          </circle>)}
        </g>)}
      </svg>
    </div>
  </div>;
}

function CountTable({ title, rows }) {
  return <article className="rounded-xl border border-slate-200 bg-white p-5">
    <h3 className="mb-3 font-semibold text-slate-800">{title}</h3>
    <div className="max-h-72 overflow-auto">
      <table className="w-full text-sm"><thead className="sticky top-0 bg-white text-left text-xs text-slate-500"><tr>
        <th className="py-2 font-medium">Nhóm</th><th className="py-2 text-right font-medium">Lượt khám</th>
      </tr></thead><tbody>{rows.map((r) => <tr key={r.label} className="border-t border-slate-100">
        <td className="py-2 pr-3">{r.label}</td><td className="py-2 text-right tabular-nums">{number(r.count, 0)}</td>
      </tr>)}</tbody></table>
      {!rows.length && <p className="py-5 text-sm text-slate-500">Không có dữ liệu.</p>}
    </div>
  </article>;
}

export default function VisitAnalytics({ canExport }) {
  const [initial] = useState(initialFilters);
  const [filters, setFilters] = useState(initial);
  const [usedFilters, setUsedFilters] = useState(null);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");
  const requestVersion = useRef(0);
  const cancelPending = useCallback(() => { requestVersion.current++; }, []);
  const load = useCallback(async (params) => {
    const version = ++requestVersion.current;
    setLoading(true); setError(""); setReport(null);
    try {
      const data = await getVisitAnalytics(params);
      if (version === requestVersion.current) { setReport(data); setUsedFilters(params); }
    } catch (e) {
      if (version === requestVersion.current) setError(e.message || "Không tải được phân tích.");
    } finally { if (version === requestVersion.current) setLoading(false); }
  }, []);
  useEffect(() => { load(initial); return cancelPending; }, [initial, load, cancelPending]);
  const update = (key, value) => setFilters((p) => ({ ...p, [key]: value }));
  const download = async (format) => {
    if (!usedFilters || !canExport) return;
    setExporting(true); setError("");
    try {
      const response = await exportVisitAnalytics({ ...usedFilters, format });
      const url = URL.createObjectURL(new Blob([response.data], { type: format === "json" ? "application/json" : "text/csv;charset=utf-8" }));
      const link = document.createElement("a");
      link.href = url; link.download = `phan-tich-luot-kham-${usedFilters.demo ? "MO-PHONG-" : ""}${usedFilters.fromDate}-${usedFilters.toDate}.${format}`;
      document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url);
    } catch (e) { setError(e.message || "Không xuất được phân tích."); }
    finally { setExporting(false); }
  };
  const forecast = report?.forecast;
  const labels = [...(report?.monthly || []).map((m) => m.month), ...(forecast?.future || []).map((m) => m.month)];
  const actualByMonth = new Map((report?.monthly || []).map((m) => [m.month, m.count]));
  const trendByMonth = new Map((report?.trend?.points || []).map((m) => [m.month, m.value]));
  const validationByMonth = new Map((forecast?.validation || []).map((m) => [m.month, m.predicted]));
  const futureByMonth = new Map((forecast?.future || []).map((m) => [m.month, m.predicted]));
  const peak = (report?.hourly || []).reduce((best, row) => row.count > (best?.count || 0) ? row : best, null);
  return <div className="space-y-5">
    <form onSubmit={(e) => { e.preventDefault(); load({ ...filters }); }} className="rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="flex items-center gap-2 text-lg font-semibold"><TrendingUp size={20} className="text-sky-700" />Phân tích và dự báo lượt khám</h2>
      <p className="mt-1 text-sm text-slate-500">Theo dõi hoạt động khám ngoại trú, xu hướng và nhu cầu khám trong các tháng tiếp theo.</p>
      <label className="mt-4 block max-w-md text-xs font-medium text-slate-600">Nguồn dữ liệu
        <select aria-label="Nguồn dữ liệu phân tích" value={String(filters.demo)} disabled={loading} onChange={(e) => update("demo", e.target.value === "true")} className={inputClass}>
          <option value="false">Dữ liệu phòng khám</option><option value="true">Dữ liệu mô phỏng để minh họa thuật toán</option>
        </select>
      </label>
      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <label className="text-xs font-medium text-slate-600">Từ ngày<input aria-label="Phân tích từ ngày" required type="date" value={filters.fromDate} max={filters.toDate} disabled={loading} onChange={(e) => update("fromDate", e.target.value)} className={inputClass} /></label>
        <label className="text-xs font-medium text-slate-600">Đến ngày<input aria-label="Phân tích đến ngày" required type="date" value={filters.toDate} min={filters.fromDate} max={dateText(new Date())} disabled={loading} onChange={(e) => update("toDate", e.target.value)} className={inputClass} /></label>
        <label className="text-xs font-medium text-slate-600">Dự báo tiếp theo (tháng)<input required type="number" min="1" max="12" value={filters.horizon} disabled={loading} onChange={(e) => update("horizon", Number(e.target.value))} className={inputClass} /></label>
        <label className="text-xs font-medium text-slate-600">Số tháng cuối để kiểm tra<input required type="number" min="1" max="12" value={filters.testMonths} disabled={loading} onChange={(e) => update("testMonths", Number(e.target.value))} className={inputClass} /></label>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <button disabled={loading || exporting} className="inline-flex h-10 items-center gap-2 rounded-lg bg-sky-700 px-4 text-sm font-semibold text-white hover:bg-sky-800 disabled:opacity-50">{loading && <Loader2 size={16} className="animate-spin" />}Phân tích dữ liệu</button>
        {["csv", "json"].map((format) => <button key={format} type="button" disabled={!report || !canExport || exporting || loading} onClick={() => download(format)} className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-300 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"><Download size={15} />Xuất {format.toUpperCase()}</button>)}
      </div>
    </form>
    {error && <div role="alert" className="flex gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"><AlertCircle size={18} className="shrink-0" />{error}</div>}
    {loading && <p role="status" className="flex items-center gap-2 py-8 text-sm text-slate-600"><Loader2 size={18} className="animate-spin" />Đang tổng hợp dữ liệu lượt khám…</p>}
    {report && <>
      {report.dataKind === "synthetic" && <p role="status" className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm font-medium text-amber-900">ĐANG XEM DỮ LIỆU MÔ PHỎNG. Số lượt và sai số chỉ minh họa thuật toán, không phản ánh hoạt động thật. Dữ liệu này không được ghi vào cơ sở dữ liệu phòng khám.</p>}
      <p className="text-xs text-slate-500">Kết quả từ {report.from} đến {report.to}. Các thay đổi bộ lọc được áp dụng khi bấm “Phân tích dữ liệu”.</p>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[["Lượt khám hợp lệ", number(report.validCount, 0)], ["Lượt hủy đã loại", number(report.excludedCancelled, 0)], ["Tháng dùng phân tích", report.monthly.length], ["Khung giờ nhiều lượt nhất", peak ? `${peak.label} (${peak.count} lượt)` : "Chưa có dữ liệu"]].map(([label, value]) => <div key={label} className="rounded-xl border border-slate-200 bg-white p-5"><p className="text-xs text-slate-500">{label}</p><p className="mt-2 text-xl font-semibold text-slate-900">{value}</p></div>)}
      </div>
      {!report.validCount && <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Không có lượt khám hợp lệ trong khoảng đã chọn. Hãy kiểm tra khoảng thời gian và dữ liệu nguồn.</p>}
      <article className="rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="mb-4 font-semibold">Lượt khám thực tế, xu hướng và dự báo theo tháng</h3>
        <SeriesChart labels={labels} title="Lượt khám thực tế, đường hồi quy, dự báo kiểm tra và dự báo tiếp theo" series={[
          { name: "Thực tế", color: "#0369a1", values: labels.map((m) => actualByMonth.get(m) ?? null) },
          { name: "Hồi quy tuyến tính", color: "#7c3aed", dashed: true, values: labels.map((m) => trendByMonth.get(m) ?? null) },
          { name: "Dự báo tập kiểm tra", color: "#d97706", values: labels.map((m) => validationByMonth.get(m) ?? null) },
          { name: "Dự báo tiếp theo", color: "#059669", dashed: true, values: labels.map((m) => futureByMonth.get(m) ?? null) }
        ]} />
        {report.trend ? <p className="mt-3 text-sm text-slate-600">Xu hướng: <strong>{report.trend.direction}</strong> · Thay đổi trung bình {number(report.trend.slope)} lượt/tháng · R² = {number(report.trend.rSquared, 4)}. Đường hồi quy mô tả toàn bộ chuỗi, không dùng để tính sai số Holt-Winters.</p> : <p className="text-sm text-slate-500">Cần ít nhất 2 tháng đầy đủ để tính hồi quy tuyến tính.</p>}
      </article>
      <article className="rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="font-semibold">Dự báo Holt-Winters và đánh giá</h3>
        <p className={`mt-2 text-sm ${forecast.available ? "text-slate-600" : "text-amber-800"}`}>{forecast.message}</p>
        {forecast.available && <>
          <p className="mt-3 text-sm text-slate-600">Huấn luyện: {forecast.trainFrom} → {forecast.trainTo} ({forecast.trainCount} tháng). Kiểm tra: {forecast.testFrom} → {forecast.testTo} ({forecast.testCount} tháng).</p>
          <p className="mt-1 text-xs text-slate-500">Mùa vụ: {forecast.seasonLength} tháng · α = {forecast.parameters.alpha} · β = {forecast.parameters.beta} · γ = {forecast.parameters.gamma} · Mô hình cộng; dự báo âm được giới hạn về 0.</p>
          <div className="mt-4 overflow-x-auto"><table className="w-full text-sm"><thead className="bg-slate-50 text-left text-xs text-slate-500"><tr><th className="p-3">Mô hình</th><th className="p-3 text-right">MAE (lượt)</th><th className="p-3 text-right">RMSE (lượt)</th><th className="p-3 text-right">MAPE (%)</th></tr></thead><tbody>
            {[["Holt-Winters", forecast.metrics], ["Mốc so sánh: cùng tháng năm trước", forecast.baselineMetrics]].map(([name, metrics]) => <tr key={name} className="border-t border-slate-100"><td className="p-3">{name}</td><td className="p-3 text-right tabular-nums">{number(metrics.mae)}</td><td className="p-3 text-right tabular-nums">{number(metrics.rmse)}</td><td className="p-3 text-right tabular-nums">{number(metrics.mape)}</td></tr>)}
          </tbody></table></div>
          <p className="mt-2 text-xs text-slate-500">Sai số càng nhỏ càng tốt. MAPE dùng {forecast.metrics.mapeCount}/{forecast.testCount} tháng có lượt khám khác 0; {forecast.metrics.zeroActualCount} tháng bằng 0 được loại riêng khỏi MAPE, vẫn tính MAE và RMSE.</p>
          {forecast.metrics.rmse > forecast.baselineMetrics.rmse && <p className="mt-2 text-sm text-amber-800">Holt-Winters có RMSE cao hơn mốc so sánh trong lần kiểm tra này. Cần xem lại chất lượng dữ liệu và tính phù hợp của mùa vụ.</p>}
          <div className="mt-5 grid gap-5 xl:grid-cols-2">
            <div className="overflow-x-auto"><h4 className="mb-2 text-sm font-semibold">Đối chiếu tập kiểm tra</h4><table className="w-full text-sm"><thead className="text-xs text-slate-500"><tr><th className="p-2 text-left">Tháng</th><th className="p-2 text-right">Thực tế</th><th className="p-2 text-right">Dự báo</th><th className="p-2 text-right">Sai lệch</th></tr></thead><tbody>{forecast.validation.map((r) => <tr key={r.month} className="border-t border-slate-100"><td className="p-2">{r.month}</td><td className="p-2 text-right">{number(r.actual, 0)}</td><td className="p-2 text-right">{number(r.predicted)}</td><td className="p-2 text-right">{number(r.predicted - r.actual)}</td></tr>)}</tbody></table></div>
            <div><h4 className="mb-2 text-sm font-semibold">Các tháng tiếp theo</h4><table className="w-full text-sm"><thead className="text-xs text-slate-500"><tr><th className="p-2 text-left">Tháng</th><th className="p-2 text-right">Lượt khám dự kiến</th></tr></thead><tbody>{forecast.future.map((r) => <tr key={r.month} className="border-t border-slate-100"><td className="p-2">{r.month}</td><td className="p-2 text-right">{number(r.predicted)}</td></tr>)}</tbody></table><p className="mt-2 text-xs text-slate-500">Các tháng tiếp theo tính từ cuối khoảng dữ liệu đã chọn; khi chọn khoảng cũ, đây có thể là các tháng đã qua.</p></div>
          </div>
        </>}
      </article>
      <div className="grid gap-5 xl:grid-cols-2">
        <CountTable title="Phân bố theo khung giờ" rows={report.hourly} />
        <CountTable title="Lượt khám theo bác sĩ" rows={report.doctors} />
        <CountTable title="Lượt khám theo chuyên khoa" rows={report.specialties} />
        <CountTable title="Nhóm bệnh theo mã ICD (3 ký tự)" rows={report.diseaseGroups} />
      </div>
      <details className="rounded-xl border border-slate-200 bg-white p-5"><summary className="cursor-pointer text-sm font-semibold">Dữ liệu lượt khám theo ngày và tháng</summary>
        <div className="mt-4 grid gap-5 md:grid-cols-2"><CountTable title="Theo ngày" rows={report.daily.map((x) => ({ label: x.date, count: x.count }))} /><CountTable title="Tháng đầy đủ dùng phân tích" rows={report.monthly.map((x) => ({ label: x.month, count: x.count }))} /></div>
      </details>
      <details className="rounded-xl border border-slate-200 bg-white p-5" open={report.demoCount > 0}><summary className="cursor-pointer text-sm font-semibold">Nguồn dữ liệu và cách tính</summary>
        <p className="mt-3 text-sm text-slate-600">Đọc {number(report.rawCount, 0)} lượt trong khoảng chọn; loại {number(report.excludedInvalid, 0)} lượt không hợp lệ ngoài các lượt hủy. Có {number(report.demoCount, 0)} lượt được nhận diện là dữ liệu demo.</p>
        {report.excludedReceptionOnly > 0 && <p className="mt-2 text-sm text-slate-600">Trong số lượt đã loại có {number(report.excludedReceptionOnly, 0)} lượt nền tiếp đón chưa phân phòng hoặc bác sĩ; các lượt này không được đếm thêm vào lượt khám.</p>}
        {report.undatedCount > 0 && <p className="mt-2 text-sm text-amber-800">Toàn bộ cơ sở dữ liệu còn {number(report.undatedCount, 0)} lượt thiếu cả thời gian khám và thời điểm tạo, chưa thể đưa vào khoảng thống kê.</p>}
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-600">{report.notes.map((note) => <li key={note}>{note}</li>)}</ul>
      </details>
    </>}
  </div>;
}
