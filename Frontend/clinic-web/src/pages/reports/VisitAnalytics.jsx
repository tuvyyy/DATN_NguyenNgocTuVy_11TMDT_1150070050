import React, { useCallback, useEffect, useRef, useState } from "react";
import { exportVisitAnalytics, getVisitAnalytics } from "../../api/BaoCaoApi";
import VisitForecastDashboard from "./VisitForecastDashboard";
import "./VisitAnalytics.css";

const dateText = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const initialFilters = () => {
  const now = new Date();
  return { fromDate: dateText(new Date(now.getFullYear(), now.getMonth() - 36, 1)), toDate: dateText(new Date(now.getFullYear(), now.getMonth(), 0)), horizon: 6, testMonths: 6, demo: false };
};
const filterProblem = (params) => {
  const validDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value) && value.slice(0, 4) >= "1900" && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
  if (!validDate(params.fromDate) || !validDate(params.toDate)) return "Chọn đủ ngày bắt đầu và ngày kết thúc.";
  if (params.fromDate > params.toDate) return "Ngày bắt đầu cần trước hoặc trùng ngày kết thúc.";
  if (params.toDate > dateText(new Date())) return "Ngày kết thúc không được vượt quá hôm nay.";
  if ((Date.parse(params.toDate) - Date.parse(params.fromDate)) / 86400000 > 3660) return "Chọn khoảng thời gian trong vòng 10 năm.";
  if (!Number.isInteger(params.horizon) || params.horizon < 1 || params.horizon > 12
    || !Number.isInteger(params.testMonths) || params.testMonths < 1 || params.testMonths > 12) return "Số tháng cần nằm trong khoảng từ 1 đến 12.";
  return "";
};

export default function VisitAnalytics({ canExport }) {
  const [initial] = useState(initialFilters);
  const [filters, setFilters] = useState(initial);
  const [usedFilters, setUsedFilters] = useState(null);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pendingFilters, setPendingFilters] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");
  const [allMonths, setAllMonths] = useState(false);
  const requestVersion = useRef(0);
  const inFlight = useRef(null);
  const load = useCallback(async (params) => {
    inFlight.current?.abort();
    const controller = new AbortController();
    inFlight.current = controller;
    const version = ++requestVersion.current;
    setLoading(true); setPendingFilters(params); setError("");
    try {
      const data = await getVisitAnalytics(params, { signal: controller.signal });
      if (version === requestVersion.current) { setReport(data); setUsedFilters(params); }
    } catch (failure) {
      if (version === requestVersion.current) { setError(failure.message || "Chưa tải được báo cáo. Vui lòng thử lại."); setReport(null); }
    } finally { if (version === requestVersion.current) { setLoading(false); setPendingFilters(null); inFlight.current = null; } }
  }, []);
  const cancelPending = useCallback(() => { requestVersion.current++; inFlight.current?.abort(); inFlight.current = null; }, []);
  useEffect(() => { load({ ...initial }); return cancelPending; }, [initial, load, cancelPending]);
  const update = (key, value) => { setFilters(previous => ({ ...previous, [key]: value })); setError(""); };
  const loadExample = () => { const example = { ...initialFilters(), demo: true }; setFilters(example); load(example); };
  const dirty = Object.keys(filters).some(key => filters[key] !== (usedFilters || initial)[key]);
  const editingDuringLoad = pendingFilters && Object.keys(filters).some(key => filters[key] !== pendingFilters[key]);
  const refresh = () => {
    const problem = filterProblem(filters);
    if (problem) { setError(problem); return; }
    load({ ...filters });
  };
  const download = async (format) => {
    if (!report || !usedFilters || !canExport || loading || dirty || filterProblem(filters)) return;
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
  const downloadDisabled = !report || !usedFilters || !canExport || exporting || loading || dirty || !!filterProblem(filters);
  return <VisitForecastDashboard report={report} filters={filters} usedFilters={usedFilters} update={update}
    loading={loading} exporting={exporting} error={error} refresh={refresh} download={download}
    downloadDisabled={downloadDisabled} dirty={dirty} applying={loading && !editingDuringLoad} loadExample={loadExample} allMonths={allMonths} setAllMonths={setAllMonths} />;
}
