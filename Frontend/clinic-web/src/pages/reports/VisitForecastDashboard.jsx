import React, { useEffect, useId, useRef, useState } from "react";
import { Activity, ArrowRight, BarChart3, CalendarDays, Check, ChevronRight, Database, Download, Info, RefreshCw, TrendingUp } from "lucide-react";
import SelectField from "../../components/ui/SelectField";
import { CountList, Disclosure, SeriesChart, count, monthName } from "./VisitReportCharts";
import { forecastScale, roundedForecast } from "./forecastLevels";

const rangeText = (from, to) => `${monthName(from)} – ${monthName(to)}`;
const total = (rows, key) => rows.reduce((sum, row) => sum + Math.round(Number(row[key]) || 0), 0);
const todayText = () => { const date = new Date(); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; };

function Stat({ label, value, unit = "lượt", children, accent = false, icon: Icon = Activity }) {
  return <article className={`vr-stat${accent ? " vr-stat-accent" : ""}`}>
    <div className="vr-stat-label"><span>{label}</span><Icon size={17} aria-hidden="true" /></div>
    <div className="vr-stat-value">{value}<small>{unit}</small></div>
    {children && <div className="vr-stat-foot">{children}</div>}
  </article>;
}

function HistoryStatus({ months, required, available, loadExample, demo }) {
  const missing = Math.max(0, required - months.length);
  return <section className={`vr-history-status${available ? " is-ready" : ""}`} aria-label="Tình trạng dữ liệu dự báo">
    <span className="vr-status-icon">{available ? <Check size={18} /> : <Database size={18} />}</span>
    <div><strong>{available ? "Đủ lịch sử để dự báo" : "Chưa đủ lịch sử để dự báo"}</strong>
      <p>{available ? `${months.length} tháng đầy đủ · ${rangeText(months[0]?.month, months.at(-1)?.month)}` : `Có ${months.length}/${required} tháng cần thiết${missing ? ` · Cần thêm ${missing} tháng` : ""}. Chọn khoảng dữ liệu dài hơn để kiểm tra lại.`}</p>
    </div>
    {!available && !demo && <button type="button" className="vr-text-button" onClick={loadExample}>Xem ví dụ 36 tháng <ArrowRight size={15} /></button>}
    {!available && <div className="vr-progress" role="progressbar" aria-label="Số tháng lịch sử" aria-valuemin={0} aria-valuemax={required} aria-valuenow={Math.min(months.length, required)}><span style={{ width: `${Math.min(100, months.length / required * 100)}%` }} /></div>}
  </section>;
}

function ForecastView({ report, allMonths, setAllMonths, loadExample, demo }) {
  const months = report.monthly || [];
  const forecast = report.forecast;
  const future = forecast?.available ? forecast.future || [] : [];
  const last = months.at(-1);
  const displayed = allMonths ? months : months.slice(-12);
  const labels = [...displayed.map(row => row.month), ...future.map(row => row.month)];
  const trendByMonth = new Map((report.trend?.points || []).map(({ month, value }) => [month, value]));
  const trend = displayed.map(({ month }) => trendByMonth.get(month));
  const futurePlaceholders = future.map(() => null);
  const scale = forecastScale(future);
  return <>
    <div className="vr-stats vr-forecast-summary">
      <Stat label={future.length ? `Tháng tiếp theo · ${monthName(future[0].month)}` : "Tháng tiếp theo"} value={future.length ? count(Math.round(future[0].predicted)) : "—"} icon={CalendarDays} />
      <Stat label={future.length ? `Tổng dự báo ${future.length} tháng` : "Tổng lượt dự báo"} value={future.length ? count(total(future, "predicted")) : "—"} icon={BarChart3}>
        {future.length ? rangeText(future[0].month, future.at(-1).month) : "Chưa đủ dữ liệu"}
      </Stat>
    </div>
    <div className="vr-forecast-grid">
      <section className="vr-panel vr-chart-panel">
        <div className="vr-panel-head"><div><h2>Lượt khám theo tháng</h2></div>
          {months.length > 12 && <div className="vr-segment" role="group" aria-label="Khoảng hiển thị biểu đồ"><button type="button" aria-pressed={!allMonths} onClick={() => setAllMonths(false)}>12 tháng</button><button type="button" aria-pressed={allMonths} onClick={() => setAllMonths(true)}>Toàn bộ</button></div>}
        </div>
        <SeriesChart title="Lượt khám thực tế và dự báo" labels={labels} futureStart={future.length ? displayed.length : undefined} series={[
          { name: "Đã ghi nhận", color: "#8c96a6", values: [...displayed.map(row => row.count), ...futurePlaceholders] },
          ...(trend.some(Number.isFinite) ? [{
            name: "Xu hướng tuyến tính",
            color: "#7557b9",
            lineStyle: "dotted",
            showPoints: false,
            valueDigits: 2,
            values: [...trend, ...futurePlaceholders],
          }] : []),
          ...(future.length ? [{ name: "Dự báo", color: "#4263eb", dashed: true, connectFrom: displayed.length ? { index: displayed.length - 1, value: last.count } : undefined, values: [...displayed.map(() => null), ...future.map(row => row.predicted)] }] : []),
        ]} />
      </section>
      <section className="vr-forecast-card">
        <h2>Dự báo từng tháng</h2>
        {future.length ? <>
          <p className="vr-level-subtitle">Mức lượt khám trong kỳ dự báo</p>
          <div className="vr-future-scroll"><table aria-label="Số lượt dự báo theo tháng"><thead><tr><th>Tháng</th><th>Lượt khám</th><th>Mức</th></tr></thead><tbody>{future.map(row => {
            const level = scale.levelFor(row.predicted);
            return <tr key={row.month} className={`vr-month-row is-${level?.key || "unknown"}`}><td>{monthName(row.month)}</td><td>{count(roundedForecast(row.predicted))}</td><td><span className="vr-level-badge">{level?.label || "—"}</span></td></tr>;
          })}</tbody></table></div>
          <div className="vr-level-legend" aria-label="Chú giải mức lượt khám">
            {scale.mode === "range" && scale.bands.map(band => <div key={band.key} className={`is-${band.key}`}><span className="vr-level-dot" /><strong>{band.label}</strong><span>{band.min === band.max ? count(band.min) : `${count(band.min)}–${count(band.max)}`} lượt</span></div>)}
            <p>{scale.mode === "range" ? "Chia khoảng từ ít nhất đến nhiều nhất thành 3 mức; so sánh các tháng trong kỳ này." : scale.mode === "single" ? "Chỉ có 1 tháng dự báo, chưa phân mức ít / nhiều." : scale.mode === "even" ? "Các tháng có cùng số lượt dự báo sau khi làm tròn." : "Chưa có số lượt hợp lệ để phân mức."}</p>
          </div>
        </> : <div className="vr-forecast-placeholder"><CalendarDays size={32} /><strong>Chưa có dự báo</strong></div>}
      </section>
    </div>
    {!forecast?.available && <HistoryStatus months={months} required={forecast?.requiredMonths || 30} available={false} loadExample={loadExample} demo={demo} />}
    <Disclosure title="Xem bảng số liệu đã ghi nhận"><div className="vr-table-scroll"><table aria-label="Số lượt khám theo tháng"><thead><tr><th>Tháng</th><th>Lượt khám</th></tr></thead><tbody>{months.map(row => <tr key={row.month}><td>{monthName(row.month)}</td><td>{count(row.count)}</td></tr>)}</tbody></table></div></Disclosure>
  </>;
}

function EvaluationView({ report, usedFilters, loadExample }) {
  const forecast = report.forecast;
  const months = report.monthly || [];
  if (!forecast?.available) return <HistoryStatus months={months} required={forecast?.requiredMonths || 30} available={false} loadExample={loadExample} demo={usedFilters?.demo} />;
  const metrics = forecast.metrics || {};
  const baseline = forecast.baselineMetrics || {};
  const validation = forecast.validation || [];
  const comparable = Number.isFinite(metrics.rmse) && Number.isFinite(baseline.rmse);
  const better = comparable && metrics.rmse < baseline.rmse;
  const equal = comparable && metrics.rmse === baseline.rmse;
  return <>
    <section className="vr-panel vr-evaluation-intro"><div><h2>Dự báo sát thực tế đến đâu?</h2></div><span className="vr-model-badge">Holt-Winters · Chu kỳ {forecast.seasonLength} tháng</span></section>
    <div className="vr-training-flow">
      <div><span className="vr-step-number">01</span><div><strong>Huấn luyện · {forecast.trainCount} tháng</strong><p>{rangeText(forecast.trainFrom, forecast.trainTo)}</p></div></div>
      <ChevronRight size={18} aria-hidden="true" />
      <div><span className="vr-step-number">02</span><div><strong>Kiểm tra · {forecast.testCount} tháng</strong><p>{rangeText(forecast.testFrom, forecast.testTo)}</p></div></div>
      <ChevronRight size={18} aria-hidden="true" />
      <div><span className="vr-step-number">03</span><div><strong>Dự báo · {forecast.future?.length || 0} tháng</strong><p>Khớp lại trên toàn bộ lịch sử</p></div></div>
    </div>
    <div className="vr-error-metrics">
      <Stat label="MAE · Sai lệch trung bình" value={count(metrics.mae, 1)}>mỗi tháng</Stat>
      <Stat label="RMSE · Sai số tổng hợp" value={count(metrics.rmse, 1)}></Stat>
      <Stat label="MAPE · Sai lệch theo tỷ lệ" value={count(metrics.mape, 1)} unit={metrics.mape == null ? "" : "%"}><span>{metrics.mape == null ? "Không tính được khi các tháng kiểm tra đều bằng 0." : `Tính trên ${metrics.mapeCount}/${forecast.testCount} tháng có lượt khám khác 0.`}</span></Stat>
    </div>
    <section className="vr-panel">
      <div className="vr-panel-head"><div><h2>Đối chiếu dự báo và số đã ghi nhận</h2><p className="vr-muted">{rangeText(forecast.testFrom, forecast.testTo)}</p></div></div>
      <SeriesChart title="Đối chiếu lượt khám trên tập kiểm tra" labels={validation.map(row => row.month)} series={[
        { name: "Đã ghi nhận", color: "#8c96a6", values: validation.map(row => row.actual) },
        { name: "Holt-Winters", color: "#4263eb", dashed: true, values: validation.map(row => row.predicted) },
        { name: "Cùng kỳ năm trước", color: "#94a3b8", dashed: true, values: validation.map(row => row.seasonalNaive) },
      ]} />
      <div className={`vr-model-comparison${better ? " is-better" : ""}`}><Info size={17} /><p>{!comparable ? "Chưa đủ chỉ số để so sánh hai mô hình." : equal ? "Hai mô hình có RMSE bằng nhau trong kỳ kiểm tra này." : better ? "Holt-Winters có RMSE thấp hơn cách lấy cùng kỳ năm trước trong kỳ kiểm tra này." : "Holt-Winters có RMSE cao hơn cách lấy cùng kỳ năm trước. Cần cân nhắc kết quả trước khi sử dụng."}</p></div>
      <div className="vr-table-scroll"><table aria-label="So sánh số lượt theo tháng"><thead><tr><th>Tháng</th><th>Đã ghi nhận</th><th>Holt-Winters</th><th>Cùng kỳ năm trước</th><th>Thực tế − dự báo</th></tr></thead><tbody>{validation.map(row => { const residual = row.residual ?? row.actual - row.predicted; return <tr key={row.month}><td>{monthName(row.month)}</td><td>{count(row.actual)}</td><td>{count(row.predicted, 1)}</td><td>{count(row.seasonalNaive, 1)}</td><td><span className={`vr-residual ${residual >= 0 ? "is-positive" : "is-negative"}`}>{residual > 0 ? "+" : ""}{count(residual, 1)}</span></td></tr>; })}</tbody></table></div>
      <p className="vr-muted vr-table-caption">Chênh lệch dương: dự báo thấp hơn thực tế. Chênh lệch âm: dự báo cao hơn thực tế.</p>
    </section>
    <Disclosure title="Tham số mô hình và cách đánh giá">
      <p>Holt-Winters dạng cộng sử dụng mức nền, xu hướng và mùa vụ {forecast.seasonLength} tháng. Tham số được chọn bằng dữ liệu huấn luyện.</p>
      {forecast.parameters && <div className="vr-parameters"><span>α · Mức nền <strong>{forecast.parameters.alpha}</strong></span><span>β · Xu hướng <strong>{forecast.parameters.beta}</strong></span><span>γ · Mùa vụ <strong>{forecast.parameters.gamma}</strong></span></div>}
      <div className="vr-table-scroll"><table aria-label="Chỉ số đánh giá"><thead><tr><th>Mô hình</th><th>MAE (lượt)</th><th>RMSE (lượt)</th><th>MAPE (%)</th></tr></thead><tbody>{[["Holt-Winters", metrics], ["Cùng kỳ năm trước", baseline]].map(([name, item]) => <tr key={name}><td>{name}</td><td>{count(item.mae, 2)}</td><td>{count(item.rmse, 2)}</td><td>{count(item.mape, 2)}</td></tr>)}</tbody></table></div>
      <p className="vr-muted">MAPE dùng {metrics.mapeCount}/{forecast.testCount} tháng có lượt khám khác 0; những tháng bằng 0 vẫn tính MAE và RMSE. Sai số càng thấp, dự báo càng sát trong kỳ kiểm tra.</p>
    </Disclosure>
  </>;
}

const dayName = date => date.split("-").reverse().join("/");

function DailyVisitChart({ days }) {
  const [selectedMonth, setSelectedMonth] = useState("");
  const daysByMonth = new Map();
  for (const day of days) {
    const month = day.date.slice(0, 7);
    if (!daysByMonth.has(month)) daysByMonth.set(month, []);
    daysByMonth.get(month).push(day);
  }
  const months = [...daysByMonth.keys()].sort().reverse();
  const month = daysByMonth.has(selectedMonth) ? selectedMonth : months[0];
  const displayedDays = daysByMonth.get(month) || [];

  return <>
    {months.length > 1 && <div className="vr-day-period">
      <SelectField label="Tháng hiển thị" value={month} onChange={setSelectedMonth}
        options={months.map(value => ({ value, label: monthName(value) }))} />
    </div>}
    <SeriesChart
      title="Biểu đồ lượt khám theo ngày"
      labels={displayedDays.map(day => day.date)}
      series={[{ name: "Đã ghi nhận", color: "#4263eb", values: displayedDays.map(day => day.count) }]}
      formatLabel={dayName}
      emptyMessage="Chưa có số liệu theo ngày."
    />
  </>;
}

function AnalysisView({ report }) {
  const [view, setView] = useState("rankedHours");
  const peak = (report.rankedHours || []).filter(row => row.rank === 1);
  const views = [["rankedHours", "Theo giờ"], ["daily", "Theo ngày"], ["specialties", "Chuyên khoa"], ["doctors", "Bác sĩ"], ["diseaseGroups", "Nhóm bệnh"]];
  const titles = { rankedHours: "Khung giờ có nhiều lượt khám", daily: "Lượt khám theo ngày", specialties: "Lượt khám theo chuyên khoa", doctors: "Lượt khám theo bác sĩ", diseaseGroups: "Lượt khám theo nhóm bệnh" };
  return <>
    <div className="vr-error-metrics"><Stat label="Tổng lượt trong kỳ" value={count(report.validCount)} /><Stat label="Số tháng đầy đủ" value={count(report.monthly?.length || 0)} unit="tháng" /><Stat label="Giờ đông nhất" value={peak.length === 1 ? peak[0].label : peak.length ? `${peak.length} khung giờ` : "—"} unit="">{peak.length > 1 ? peak.map(row => row.label).join(", ") : peak.length ? `${count(peak[0].count)} lượt trong kỳ` : "Chưa có số liệu theo giờ."}</Stat></div>
    <section className="vr-panel">
      <div className="vr-panel-head">
        <h2>{titles[view]}</h2>
        <div className="vr-segment" role="group" aria-label="Phân tích theo">
          {views.map(([key, label]) => <button key={key} type="button" aria-pressed={view === key} onClick={() => setView(key)}>{label}</button>)}
        </div>
      </div>
      {view === "daily"
        ? <DailyVisitChart days={report.daily || []} />
        : <CountList key={view} rows={report[view] || []} />}
    </section>
    <Disclosure title="Nguồn dữ liệu và quy tắc thống kê">
      <p>{report.dataKind === "synthetic" ? "Số liệu mô phỏng được tạo để xem thử quy trình, không ghi thêm vào cơ sở dữ liệu." : report.demoCount > 0 ? `Báo cáo có ${count(report.demoCount)} lượt khám minh họa; kết quả không đại diện hoàn toàn cho hoạt động thực tế.` : "Số liệu được tổng hợp từ các lượt khám của phòng khám."}</p>
      <p>Loại {count(report.excludedCancelled)} lượt hủy và {count(report.excludedInvalid)} lượt chưa hợp lệ hoặc chỉ mới tiếp đón. Dự báo chỉ dùng tháng đầy đủ đã kết thúc.</p>
      {(report.notes || []).map((note, i) => <p className="vr-muted" key={i}>{note}</p>)}
    </Disclosure>
  </>;
}

export default function VisitForecastDashboard({ report, filters, usedFilters, update, loading, exporting, error, refresh, download, downloadDisabled, dirty, applying, loadExample, allMonths, setAllMonths }) {
  const [tab, setTab] = useState("forecast");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const id = useId();
  const scrollRef = useRef(null);
  const example = report?.dataKind === "synthetic" || report?.demoCount > 0;
  const tabs = [["forecast", "Dự báo lượt khám", TrendingUp], ["evaluation", "Đánh giá mô hình", Activity], ["analysis", "Phân tích lượt khám", BarChart3]];
  const titles = { forecast: "Kết quả dự báo", evaluation: "Kiểm tra độ sai lệch", analysis: "Phân bố lượt khám" };
  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = 0; }, [tab]);
  const tabKeyDown = (event, index) => {
    const offset = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (!offset && event.key !== "Home" && event.key !== "End") return;
    event.preventDefault();
    const next = event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : (index + offset + tabs.length) % tabs.length;
    setTab(tabs[next][0]);
    document.getElementById(`${id}-${tabs[next][0]}`)?.focus();
  };

  return <div className={`visit-report${settingsOpen ? " is-settings-open" : ""}`} aria-busy={loading}>
    <button type="button" className="vr-mobile-settings-toggle" aria-expanded={settingsOpen} aria-controls={`${id}-settings`} onClick={() => setSettingsOpen(!settingsOpen)}>Thiết lập dữ liệu<ChevronRight size={14} /></button>
    <aside id={`${id}-settings`} className="vr-settings-panel" aria-label="Thiết lập báo cáo">
      <form onSubmit={event => { event.preventDefault(); refresh(); }}>
        <h2>Thiết lập</h2>
        <section className="vr-setting-group" aria-labelledby={`${id}-data`}>
          <h3 id={`${id}-data`}>Dữ liệu đầu vào</h3>
          <SelectField label="Nguồn dữ liệu" value={String(filters.demo)}
            options={[{ value: "false", label: "Phòng khám" }, { value: "true", label: "Mô phỏng" }]}
            onChange={value => update("demo", value === "true")} />
          <label>Từ ngày<input aria-label="Từ ngày" type="date" required value={filters.fromDate}
            max={filters.toDate} onChange={event => update("fromDate", event.target.value)} /></label>
          <label>Đến ngày<input aria-label="Đến ngày" type="date" required value={filters.toDate}
            min={filters.fromDate} max={todayText()} onChange={event => update("toDate", event.target.value)} /></label>
        </section>
        <section className="vr-setting-group" aria-labelledby={`${id}-horizon`}>
          <h3 id={`${id}-horizon`}>Phạm vi dự báo</h3>
          <SelectField label="Số tháng tiếp theo" aria-label="Dự báo trong" value={filters.horizon}
            options={[1, 3, 6, 12].map(value => ({ value, label: `${value} tháng` }))}
            onChange={value => update("horizon", value)} />
        </section>
        <details className="vr-model-options">
          <summary>Kiểm tra mô hình<ChevronRight size={14} aria-hidden="true" /></summary>
          <SelectField label="Số tháng kiểm tra" value={filters.testMonths}
            options={Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: `${i + 1} tháng` }))}
            onChange={value => update("testMonths", value)} />
        </details>
        <div className="vr-apply-actions">
          <button className="vr-primary" type="submit" disabled={applying || exporting} aria-label="Cập nhật">
            <RefreshCw size={15} className={applying ? "vr-spin" : ""} />{applying ? "Đang cập nhật…" : "Cập nhật báo cáo"}
          </button>
          {dirty && <span role="status" className="vr-draft-status">{applying ? "Đang áp dụng thiết lập…" : "Thay đổi chưa được áp dụng"}</span>}
        </div>
      </form>
    </aside>

    <section className="vr-report-workspace" aria-label="Nội dung báo cáo">
      <div className="vr-fixed-controls">
        <div className="vr-workspace-tabs" role="tablist" aria-label="Chọn tác vụ">
          {tabs.map(([key, label, Icon], index) => <button key={key} id={`${id}-${key}`} type="button" role="tab"
            aria-label={label} aria-selected={tab === key} aria-controls={`${id}-panel`} tabIndex={tab === key ? 0 : -1}
            onClick={() => setTab(key)} onKeyDown={event => tabKeyDown(event, index)}>
            <Icon size={16} /><span className="vr-tab-label-full">{label}</span>
            <span className="vr-tab-label-short" aria-hidden="true">{{ forecast: "Dự báo", evaluation: "Đánh giá", analysis: "Phân tích" }[key]}</span>
          </button>)}
        </div>
        <header className="vr-result-heading">
          <div><h2>{titles[tab]}</h2>
            {report && <p>Dữ liệu: {report.from?.split("-").reverse().join("/")} – {report.to?.split("-").reverse().join("/")}</p>}
          </div>
          <div className="vr-result-actions">
            {example && <span className="vr-example-pill">Dữ liệu minh họa</span>}
            <button type="button" className="vr-secondary" disabled={downloadDisabled} onClick={() => download(tab === "evaluation" ? "csv" : "monthly")}>
              <Download size={15} />{exporting ? "Đang xuất…" : tab === "evaluation" ? "Tải đánh giá" : "Tải bảng tháng"}
            </button>
          </div>
        </header>
      </div>
      <div ref={scrollRef} className="vr-results-scroll" role="region" aria-label="Kết quả báo cáo" tabIndex={0}>
        {error && <div role="alert" className="vr-error"><Info size={18} /><p>{error}</p><button type="button" className="vr-secondary" onClick={refresh}>Thử lại</button></div>}
        {loading && <div role="status" className={report ? "vr-refreshing" : "vr-loading"}><RefreshCw size={18} className="vr-spin" /><span>{report ? "Đang cập nhật…" : "Đang tổng hợp dữ liệu…"}</span></div>}
        {report && <div id={`${id}-panel`} role="tabpanel" aria-labelledby={`${id}-${tab}`} className={`vr-tab-content${loading ? " is-updating" : ""}`}>
          {!report.validCount && <div className="vr-notice">Chưa có lượt khám trong kỳ này.</div>}
          {tab === "forecast" && <ForecastView report={report} allMonths={allMonths} setAllMonths={setAllMonths} loadExample={loadExample} demo={usedFilters?.demo} />}
          {tab === "evaluation" && <EvaluationView report={report} usedFilters={usedFilters} loadExample={loadExample} />}
          {tab === "analysis" && <AnalysisView report={report} />}
        </div>}
      </div>
    </section>
  </div>;
}
