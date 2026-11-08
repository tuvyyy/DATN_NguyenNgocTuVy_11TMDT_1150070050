import React, { useCallback, useEffect, useId, useRef, useState } from "react";
import { exportVisitAnalytics, getVisitAnalytics } from "../../api/BaoCaoApi";
import "./VisitAnalytics.css";

const count = (value, digits = 0) => value == null || !Number.isFinite(Number(value)) ? "—" : Number(value).toLocaleString("vi-VN", { maximumFractionDigits: digits });
const monthName = (value) => /^\d{4}-\d{2}$/.test(value || "") ? `${value.slice(5)}/${value.slice(0, 4)}` : value || "—";
const dateText = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const initialFilters = () => {
  const now = new Date();
  return { fromDate: dateText(new Date(now.getFullYear(), now.getMonth() - 36, 1)), toDate: dateText(new Date(now.getFullYear(), now.getMonth(), 0)), horizon: 6, testMonths: 6, demo: false };
};
const filterProblem = (params) => {
  const validDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value) && value.slice(0, 4) >= "1900" && Number.isFinite(Date.parse(value));
  if (!validDate(params.fromDate) || !validDate(params.toDate)) return "Chọn đủ ngày bắt đầu và ngày kết thúc.";
  if (params.fromDate > params.toDate) return "Ngày bắt đầu cần trước hoặc trùng ngày kết thúc.";
  if (params.toDate > dateText(new Date())) return "Ngày kết thúc không được vượt quá hôm nay.";
  if ((Date.parse(params.toDate) - Date.parse(params.fromDate)) / 86400000 > 3660) return "Chọn khoảng thời gian trong vòng 10 năm.";
  if (!Number.isInteger(params.horizon) || params.horizon < 1 || params.horizon > 12
    || !Number.isInteger(params.testMonths) || params.testMonths < 1 || params.testMonths > 12) return "Số tháng cần nằm trong khoảng từ 1 đến 12.";
  return "";
};

function Disclosure({ title, children }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return <section className={`vr-disclosure${open ? " vr-disclosure-open" : ""}`}>
    <button type="button" aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)}>
      <span>{title}</span><span aria-hidden="true">{open ? "−" : "+"}</span>
    </button>
    {open && <div id={id} className="vr-disclosure-body">{children}</div>}
  </section>;
}

export function SeriesChart({ labels, series, title, zeroLine = false, valueDigits = 0, futureStart }) {
  const [selected, setSelected] = useState(null);
  const signature = labels.join(",");
  useEffect(() => setSelected(null), [signature]);
  if (!labels.length) return <p className="vr-empty">Chưa có số liệu theo tháng.</p>;
  const values = series.flatMap((item) => item.values.filter(Number.isFinite));
  const low = Math.min(0, ...values);
  const high = Math.max(1, ...values);
  const span = high - low || 1;
  const x = (i) => 65 + i * 820 / Math.max(1, labels.length - 1);
  const y = (v) => 270 - (v - low) / span * 225;
  const active = selected != null && selected < labels.length ? selected : Math.max(0, (futureStart ?? labels.length) - 1);
  const path = (items, connectFrom) => {
    let connected = false;
    return items.map((v, i) => {
      if (!Number.isFinite(v)) { connected = false; return ""; }
      const start = !connected && connectFrom && i === connectFrom.index + 1
        ? `M${x(connectFrom.index)},${y(connectFrom.value)}L` : connected ? "L" : "M";
      const point = `${start}${x(i)},${y(v)}`;
      connected = true;
      return point;
    }).join(" ");
  };
  return <div className="vr-chart">
    <div className="vr-chart-legend">{series.map((item) => <span key={item.name}>
      <i style={{ borderColor: item.color, borderTopStyle: item.dashed ? "dashed" : "solid" }} />{item.name}
    </span>)}</div>
    <div className="vr-chart-scroll">
      <svg viewBox="0 0 930 320" role="img" aria-label={title}>
        <title>{title}</title>
        <text x="65" y="20" fontSize="13" fill="#64748b">Lượt khám</text>
        {futureStart != null && futureStart < labels.length && <g>
          <rect x={x(futureStart) - 10} y="32" width={895 - x(futureStart)} height="238" fill="#f0fdfa" />
          <text x={x(futureStart)} y="25" fontSize="13" fill="#0f766e">Dự kiến</text>
        </g>}
        {Array.from({ length: 5 }, (_, i) => low + span * i / 4).map((v, i) => <g key={i}>
          <line x1="65" x2="885" y1={y(v)} y2={y(v)} stroke="#e2e8f0" />
          <text x="54" y={y(v) + 5} textAnchor="end" fontSize="13" fill="#64748b">{count(v, valueDigits)}</text>
        </g>)}
        {zeroLine && <line x1="65" x2="885" y1={y(0)} y2={y(0)} stroke="#64748b" strokeDasharray="5 4"><title>Không chênh lệch</title></line>}
        {labels.map((label, i) => i % Math.max(1, Math.ceil(labels.length / 7)) === 0 || i === labels.length - 1
          ? <text key={label} x={x(i)} y="301" textAnchor="middle" fontSize="13" fill="#64748b">{monthName(label)}</text> : null)}
        {selected != null && selected < labels.length && <line x1={x(selected)} x2={x(selected)} y1="35" y2="270" stroke="#94a3b8" strokeDasharray="4 4" />}
        {series.map((item) => <g key={item.name}>
          <path d={path(item.values, item.connectFrom)} fill="none" stroke={item.color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" strokeDasharray={item.dashed ? "7 5" : undefined} />
          {item.values.map((value, i) => !Number.isFinite(value) ? null : <circle key={i} cx={x(i)} cy={y(value)} r={selected === i ? 6 : 4}
            fill={item.color} stroke="white" strokeWidth="2" tabIndex="0" aria-label={`${monthName(labels[i])}, ${item.name}: ${count(value, valueDigits)} lượt`}
            onMouseEnter={() => setSelected(i)} onFocus={() => setSelected(i)} onClick={() => setSelected(i)}>
            <title>{`${monthName(labels[i])} · ${item.name}: ${count(value, valueDigits)} lượt`}</title>
          </circle>)}
        </g>)}
      </svg>
    </div>
    <div className="vr-chart-readout" aria-live="polite"><strong>{monthName(labels[active])}</strong>
      {series.filter((item) => Number.isFinite(item.values[active])).map((item) => <span key={item.name}>{item.name}: <strong>{count(item.values[active], valueDigits)} lượt</strong></span>)}
    </div>
  </div>;
}

function CountList({ rows, empty = "Chưa có số liệu." }) {
  const [showAll, setShowAll] = useState(false);
  const maximum = Math.max(1, ...rows.map((row) => row.count));
  const visible = showAll ? rows : rows.slice(0, 5);
  return <>
    {!rows.length && <p className="vr-empty">{empty}</p>}
    <ol className="vr-count-list">{visible.map((row) => <li key={row.label}>
      <div><span>{row.label.replace(/\s*\(#\d+\)$/, "")}</span><strong>{count(row.count)} <small>lượt</small></strong></div>
      <div className="vr-bar" aria-hidden="true"><span style={{ width: `${row.count / maximum * 100}%` }} /></div>
    </li>)}</ol>
    {rows.length > 5 && <button className="vr-text-button" type="button" onClick={() => setShowAll(!showAll)}>{showAll ? "Thu gọn" : `Xem đủ ${rows.length} mục`}</button>}
  </>;
}

export default function VisitAnalytics({ canExport }) {
  const [initial] = useState(initialFilters);
  const [filters, setFilters] = useState(initial);
  const [usedFilters, setUsedFilters] = useState(null);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");
  const [allMonths, setAllMonths] = useState(false);
  const [view, setView] = useState("monthly");
  const requestVersion = useRef(0);
  const inFlight = useRef(null);
  const previousFilters = useRef(filters);
  const pendingLoad = useRef(null);
  const load = useCallback(async (params) => {
    inFlight.current?.abort();
    const controller = new AbortController();
    inFlight.current = controller;
    const version = ++requestVersion.current;
    setLoading(true); setError("");
    try {
      const data = await getVisitAnalytics(params, { signal: controller.signal });
      if (version === requestVersion.current) { setReport(data); setUsedFilters(params); }
    } catch (failure) {
      if (version === requestVersion.current) { setError(failure.message || "Chưa tải được báo cáo. Vui lòng thử lại."); setReport(null); }
    } finally { if (version === requestVersion.current) { setLoading(false); inFlight.current = null; } }
  }, []);
  const cancelPending = useCallback(() => { requestVersion.current++; inFlight.current?.abort(); inFlight.current = null; }, []);
  useEffect(() => {
    const before = previousFilters.current;
    previousFilters.current = filters;
    const problem = filterProblem(filters);
    if (problem) { setError(problem); setLoading(false); return cancelPending; }
    const waitForTyping = before.fromDate !== filters.fromDate || before.toDate !== filters.toDate || before.testMonths !== filters.testMonths;
    setLoading(true); setError("");
    const timer = waitForTyping ? setTimeout(() => { pendingLoad.current = null; load({ ...filters }); }, 400) : null;
    pendingLoad.current = timer;
    if (!waitForTyping) load({ ...filters });
    return () => { clearTimeout(timer); cancelPending(); };
  }, [filters, load, cancelPending]);
  const update = (key, value) => { cancelPending(); setFilters((previous) => ({ ...previous, [key]: value })); };
  const loadExample = () => { cancelPending(); setFilters({ ...initialFilters(), demo: true }); };
  const refresh = () => {
    clearTimeout(pendingLoad.current);
    const problem = filterProblem(filters);
    if (problem) { setError(problem); return; }
    load({ ...filters });
  };
  const download = async (format) => {
    if (!report || !usedFilters || !canExport || loading || filterProblem(filters)) return;
    setExporting(true); setError("");
    try {
      const response = await exportVisitAnalytics({ ...usedFilters, format });
      const url = URL.createObjectURL(new Blob([response.data], { type: format === "json" ? "application/json" : "text/csv;charset=utf-8" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = `luot-kham-${report.demoCount > 0 || usedFilters.demo ? "MINH-HOA-" : ""}${usedFilters.fromDate}-${usedFilters.toDate}.${format === "json" ? "json" : "csv"}`;
      document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url);
    } catch (failure) { setError(failure.message || "Chưa tải được bảng số liệu."); }
    finally { setExporting(false); }
  };
  const months = report?.monthly || [];
  const last = months.at(-1);
  const previous = months.at(-2);
  const change = last && previous ? last.count - previous.count : null;
  const percent = previous?.count > 0 && change != null ? change / previous.count * 100 : null;
  const forecast = report?.forecast;
  const future = forecast?.available ? forecast.future : [];
  const next = future[0];
  const ranked = report?.rankedHours || [];
  const peak = ranked.filter((row) => row.rank === 1);
  const displayed = allMonths ? months : months.slice(-12);
  const labels = [...displayed.map((row) => row.month), ...future.map((row) => row.month)];
  const requiredMonths = forecast?.requiredMonths ?? 24 + (usedFilters?.testMonths || 6);
  const isExample = report?.dataKind === "synthetic" || report?.demoCount > 0;
  const views = [["monthly", "Theo tháng"], ["rankedHours", "Theo giờ"], ["specialties", "Chuyên khoa"], ["doctors", "Bác sĩ"], ["diseaseGroups", "Nhóm bệnh"]];
  const viewTitles = { monthly: "Số lượt khám theo tháng", rankedHours: "Giờ đông bệnh nhân", specialties: "Lượt khám theo chuyên khoa", doctors: "Lượt khám theo bác sĩ", diseaseGroups: "Lượt khám theo nhóm bệnh" };
  return <div className="visit-report" aria-busy={loading}>
    <form className="vr-filters" onSubmit={(event) => { event.preventDefault(); refresh(); }}>
      <label>Từ ngày<input aria-label="Từ ngày" type="date" required value={filters.fromDate} max={filters.toDate} onChange={(event) => update("fromDate", event.target.value)} /></label>
      <label>Đến ngày<input aria-label="Đến ngày" type="date" required value={filters.toDate} min={filters.fromDate} max={dateText(new Date())} onChange={(event) => update("toDate", event.target.value)} /></label>
      <label>Dự kiến trong<select aria-label="Dự kiến trong" value={filters.horizon} onChange={(event) => update("horizon", Number(event.target.value))}>
        {[1, 3, 6, 12].map((value) => <option key={value} value={value}>{value} tháng tiếp theo</option>)}
      </select></label>
      <button className="vr-primary" disabled={loading || exporting} type="submit">{loading ? "Đang tải…" : "Tải lại"}</button>
      <button className="vr-secondary" disabled={!report || !canExport || exporting || loading || !!filterProblem(filters)} type="button" onClick={() => download("monthly")}>{exporting ? "Đang tải…" : "Tải bảng tháng"}</button>
    </form>
    {error && <p role="alert" className="vr-error">{error}</p>}
    {loading && <div role="status" className={report ? "vr-refreshing" : "vr-loading"}>{report ? "Đang cập nhật số lượt khám…" : "Đang tổng hợp số lượt khám…"}</div>}
    {report && <>
      <div className="vr-period"><span>Tổng trong kỳ: <strong>{count(report.validCount)} lượt khám</strong></span>
        {isExample && <span className="vr-example">Số liệu minh họa</span>}
      </div>
      <div className="vr-metrics">
        <article><p>{last ? `Tháng ${monthName(last.month)}` : "Tháng gần nhất"}</p><strong>{last ? count(last.count) : "—"}<small>{last ? " lượt" : ""}</small></strong>
          {change != null ? <span className="vr-change">{percent != null && <b className={change !== 0 ? "vr-blue" : ""}>{percent > 0 ? "+" : ""}{count(percent, 1)}%</b>}<span>{change === 0 ? "Không đổi so với tháng trước" : `${change > 0 ? "Tăng" : "Giảm"} ${count(Math.abs(change))} lượt so với ${monthName(previous.month)}`}</span></span> : <span>{last ? "Chưa có tháng trước để so sánh" : "Chưa có tháng trọn vẹn"}</span>}</article>
        <article className="vr-next"><p>{next ? `Dự kiến tháng ${monthName(next.month)}` : "Dự kiến tháng tiếp theo"}</p><strong>{next ? count(Math.round(next.predicted)) : "—"}<small>{next ? " lượt" : ""}</small></strong></article>
        <article><p>Giờ đông nhất</p><strong className="vr-hour">{peak.length === 1 ? peak[0].label : peak.length ? `${peak.length} khung giờ` : "—"}</strong><span>{peak.length > 1 ? peak.map((row) => row.label).join(", ") : peak.length ? `${count(peak[0].count)} lượt trong kỳ` : "Chưa có số liệu theo giờ."}</span></article>
      </div>
      {!report.validCount && <p className="vr-notice">Không có lượt khám trong khoảng này. Bạn hãy chọn khoảng thời gian khác.</p>}
      <div className="vr-main-grid">
        <section className="vr-panel">
          <div className="vr-views" role="group" aria-label="Xem lượt khám">
            {views.map(([key, label]) => <button key={key} type="button" aria-pressed={view === key} onClick={() => setView(key)}>{label}</button>)}
          </div>
          <div className="vr-panel-head"><h2>{viewTitles[view]}</h2>
            {view === "monthly" && months.length > 12 && <div className="vr-segment" aria-label="Khoảng hiển thị biểu đồ">
              <button type="button" aria-pressed={!allMonths} onClick={() => setAllMonths(false)}>12 tháng gần nhất</button>
              <button type="button" aria-pressed={allMonths} onClick={() => setAllMonths(true)}>Toàn bộ</button>
            </div>}
          </div>
          {view === "monthly" ? <SeriesChart labels={labels} futureStart={future.length ? displayed.length : undefined} title="Số lượt khám đã ghi nhận và dự kiến" series={[
            { name: "Đã ghi nhận", color: "#2563eb", values: [...displayed.map((row) => row.count), ...future.map(() => null)] },
            ...(future.length ? [{ name: "Dự kiến", color: "#0f766e", dashed: true, connectFrom: displayed.length ? { index: displayed.length - 1, value: last.count } : undefined, values: [...displayed.map(() => null), ...future.map((row) => row.predicted)] }] : [])
          ]} /> : <CountList key={view} rows={report[view] || []} empty={view === "rankedHours" ? "Chưa có số liệu theo giờ." : "Chưa có số liệu."} />}
        </section>
        <section className="vr-panel vr-future"><h2>Lượt khám dự kiến</h2>
          {future.length ? <div className="vr-future-scroll"><table aria-label="Số lượt dự kiến theo tháng"><thead><tr><th>Tháng</th><th>Số lượt</th></tr></thead><tbody>{future.map((row) => <tr key={row.month}>
            <td>{monthName(row.month)}</td><td><strong>{count(Math.round(row.predicted))}</strong></td>
          </tr>)}</tbody></table></div> : <p className="vr-empty">Hiện có {months.length} tháng đầy đủ. Cần tối thiểu {requiredMonths} tháng để ước tính các tháng tiếp theo.</p>}
        </section>
      </div>
    </>}
    <div className="vr-details">
      {report && <>
      <Disclosure title="Bảng số liệu theo tháng"><div className="vr-table-scroll"><table aria-label="Số lượt khám theo tháng"><thead><tr><th>Tháng</th><th>Số lượt</th></tr></thead><tbody>{months.map((row) => <tr key={row.month}><td>{monthName(row.month)}</td><td>{count(row.count)}</td></tr>)}</tbody></table></div></Disclosure>
      {forecast?.available && <Disclosure title="Đối chiếu dự kiến">
        <p className="vr-muted">Đối chiếu trên {forecast.testCount} tháng gần nhất, từ {monthName(forecast.testFrom)} đến {monthName(forecast.testTo)}.</p>
        <p>Chênh lệch trung bình khoảng <strong>{count(forecast.metrics.mae, 1)} lượt mỗi tháng</strong>.</p>
        <SeriesChart labels={forecast.validation.map((row) => row.month)} title="Chênh lệch giữa số đã ghi nhận và số dự kiến" zeroLine valueDigits={1} series={[{ name: "Chênh lệch", color: "#d97706", values: forecast.validation.map((row) => row.residual ?? row.actual - row.predicted) }]} />
        <p className="vr-muted">Trên mốc 0: số đến khám nhiều hơn dự kiến. Dưới mốc 0: số đến khám ít hơn dự kiến.</p>
        <div className="vr-table-scroll"><table aria-label="So sánh số lượt theo tháng"><thead><tr><th>Tháng</th><th>Đã ghi nhận</th><th>Đã dự kiến</th><th>Chênh lệch</th></tr></thead><tbody>{forecast.validation.map((row) => <tr key={row.month}><td>{monthName(row.month)}</td><td>{count(row.actual)}</td><td>{count(row.predicted, 1)}</td><td>{count(row.residual ?? row.actual - row.predicted, 1)}</td></tr>)}</tbody></table></div>
      </Disclosure>}
      <Disclosure title="Về số liệu và cách tính">
        <p>{isExample ? `Báo cáo có ${count(report.demoCount)} lượt khám minh họa. Các kết quả này dùng để trình diễn, không phản ánh hoạt động thực tế của phòng khám.` : "Số liệu được tổng hợp từ các lượt khám của phòng khám."}</p>
        <p className="vr-muted">Đã bỏ {count(report.excludedCancelled)} lượt bị hủy và {count(report.excludedInvalid)} lượt chưa đủ thông tin. Các tháng chưa kết thúc không được dùng để ước tính.</p>
        {forecast?.available && <div className="vr-method">
          <h3>Chi tiết dành cho báo cáo đề tài</h3>
          <p>Holt-Winters · Chu kỳ {forecast.seasonLength} tháng · α = {forecast.parameters.alpha}, β = {forecast.parameters.beta}, γ = {forecast.parameters.gamma}.</p>
          <p>Dùng {forecast.trainCount} tháng xây dựng dự kiến và {forecast.testCount} tháng đối chiếu.</p>
          {report.trend && <p>Hồi quy tuyến tính: y = {count(report.trend.intercept, 2)} {report.trend.slope < 0 ? "−" : "+"} {count(Math.abs(report.trend.slope), 2)} × t; R² = {count(report.trend.rSquared, 4)}.</p>}
          <table aria-label="Chỉ số đánh giá"><thead><tr><th>Cách ước tính</th><th>MAE</th><th>RMSE</th><th>MAPE (%)</th></tr></thead><tbody>
            {[["Holt-Winters", forecast.metrics], ["Theo cùng tháng năm trước", forecast.baselineMetrics]].map(([name, metrics]) => <tr key={name}><td>{name}</td><td>{count(metrics.mae, 2)}</td><td>{count(metrics.rmse, 2)}</td><td>{count(metrics.mape, 2)}</td></tr>)}
          </tbody></table>
          <p>MAPE dùng {forecast.metrics.mapeCount}/{forecast.testCount} tháng có lượt khám khác 0; những tháng bằng 0 vẫn tính MAE và RMSE.</p>
          {forecast.metrics.rmse > forecast.baselineMetrics.rmse && <p className="vr-notice">Cách ước tính hiện tại có chênh lệch lớn hơn cách lấy cùng tháng năm trước trong lần đối chiếu này.</p>}
        </div>}
        <div className="vr-downloads"><button type="button" className="vr-secondary" disabled={!canExport || exporting || loading || !!filterProblem(filters)} onClick={() => download("csv")}>Tải chi tiết đánh giá</button><button type="button" className="vr-text-button" disabled={!canExport || exporting || loading || !!filterProblem(filters)} onClick={() => download("json")}>Tải toàn bộ số liệu</button></div>
      </Disclosure>
      </>}
    <Disclosure title="Tùy chọn khác">
      <div className="vr-options"><label>Số liệu sử dụng<select aria-label="Số liệu sử dụng" value={String(filters.demo)} onChange={(event) => update("demo", event.target.value === "true")}><option value="false">Số liệu phòng khám</option><option value="true">Số liệu minh họa</option></select></label>
        <label>Số tháng dùng để đối chiếu<input aria-label="Số tháng dùng để đối chiếu" type="number" min="1" max="12" value={filters.testMonths} onChange={(event) => update("testMonths", Number(event.target.value))} /></label>
        <button type="button" className="vr-secondary" disabled={exporting} onClick={loadExample}>Xem ví dụ 36 tháng</button>
      </div>
    </Disclosure>
    </div>
  </div>;
}
