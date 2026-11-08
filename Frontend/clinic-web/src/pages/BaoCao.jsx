import React, { useEffect, useMemo, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { 
  Download, 
  RefreshCw, 
  BarChart3, 
  Calendar, 
  Loader2, 
  Users, 
  TrendingUp, 
  CheckCircle2, 
  AlertCircle, 
  FileText, 
  Activity,
  FileSpreadsheet
} from "lucide-react";
import MainLayout from "../layouts/MainLayout";
import { exportReportCsv, getReportOptions, getReportSummary } from "../api/BaoCaoApi";
import { usePermission } from "../hooks/UsePermission";
import VisitAnalytics from "./reports/VisitAnalytics";

const REPORT_LABELS = {
  reception: "Báo cáo lượt tiếp đón",
  cashier: "Báo cáo doanh thu thu ngân",
  doctor: "Báo cáo hoạt động bác sĩ",
  lab: "Báo cáo thực hiện cận lâm sàng",
  "admin-summary": "Báo cáo tổng hợp quản trị",
  "visit-analytics": "Lượt khám và dự kiến",
};

const SUMMARY_LABELS = {
  total: "Tổng số hồ sơ",
  amount: "Tổng doanh thu phát sinh",
  paid: "Hóa đơn đã thu",
  unpaid: "Hóa đơn chờ thu",
  cancelled: "Hồ sơ đã hủy",
  completed: "Lượt khám hoàn tất",
  invoices: "Số lượng hóa đơn",
  paidInvoices: "Số hóa đơn đã thanh toán",
  labOrders: "Tổng chỉ định kỹ thuật",
};

const formatMoney = (value) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(Number(value) || 0);

const parseFileName = (disposition, fallback) => {
  const header = disposition || "";
  const utf8Match = header.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) return decodeURIComponent(utf8Match[1]);
  const normalMatch = header.match(/filename="?([^";]+)"?/i);
  return normalMatch?.[1] || fallback;
};

const translateStatus = (status) => {
  if (!status) return "Chưa xác định";
  const upper = String(status).trim().toUpperCase();
  const statusMap = {
    // 1. Tiếp đón & Bệnh án
    MOI_TAO: "Mới tạo",
    DA_TIEP_DON: "Đã tiếp đón",
    CHO_DICH_VU: "Chờ dịch vụ",
    DICH_VU_NHAP: "Dịch vụ nháp",
    CHO_THANH_TOAN: "Chờ thanh toán",
    DA_THANH_TOAN: "Đã thanh toán",
    CHO_CHUYEN_KHU: "Chờ chuyển khu",
    DA_NHAN_KHU_MOI: "Đã nhận khu mới",
    HUY_CHUYEN_KHU: "Hủy chuyển khu",
    CHO_KHAM: "Chờ khám",
    DANG_KHAM: "Đang khám",
    CHO_CAN_LAM_SANG: "Chờ cận lâm sàng",
    CHO_KET_QUA: "Chờ kết quả",
    CHO_KET_LUAN: "Chờ kết luận",
    DA_KHAM: "Đã khám",
    DA_DONG: "Đã đóng",
    DA_HUY: "Đã hủy",
    HUY: "Đã hủy",
    
    // 2. Kỹ thuật viên / Cận lâm sàng
    CHO_THUC_HIEN: "Chờ thực hiện",
    DANG_THUC_HIEN: "Đang thực hiện",
    DA_THUC_HIEN: "Đã thực hiện",
    SENT: "Đã gửi kết quả",
    DA_GUI: "Đã gửi kết quả",
    APPROVED: "Đã duyệt kết quả",
    DA_DUYET: "Đã duyệt kết quả",
    DRAFT: "Bản nháp",
    NHAP: "Bản nháp",
    
    // 3. Khác
    SUCCESS: "Thành công",
    FAILED: "Thất bại",
    PENDING: "Chờ xử lý",
    COMPLETED: "Hoàn tất"
  };
  return statusMap[upper] || status;
};

const getStatusTone = (status) => {
  if (!status) return "bg-slate-100 text-slate-600 border-slate-200";
  const upper = String(status).trim().toUpperCase();
  switch (upper) {
    case "DA_THANH_TOAN":
    case "DA_KHAM":
    case "DA_DONG":
    case "COMPLETED":
    case "APPROVED":
    case "DA_DUYET":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "MOI_TAO":
    case "DA_TIEP_DON":
    case "PENDING":
      return "bg-sky-50 text-sky-700 border-sky-200";
    case "CHO_KHAM":
    case "CHO_THANH_TOAN":
    case "CHO_THUC_HIEN":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "DANG_KHAM":
    case "DANG_THUC_HIEN":
      return "bg-orange-50 text-orange-700 border-orange-200";
    case "CHO_CAN_LAM_SANG":
    case "CHO_DICH_VU":
      return "bg-purple-50 text-purple-700 border-purple-200";
    case "CHO_KET_QUA":
    case "CHO_KET_LUAN":
      return "bg-violet-50 text-violet-700 border-violet-200";
    case "DA_HUY":
    case "HUY":
    case "FAILED":
      return "bg-rose-50 text-rose-700 border-rose-200";
    default:
      return "bg-slate-100 text-slate-700 border-slate-200";
  }
};

const getSummaryCardConfig = (key) => {
  switch (key) {
    case "total":
      return {
        icon: <Users size={18} />,
        colorClass: "text-[#0077B6] bg-sky-50 border-sky-100",
      };
    case "amount":
      return {
        icon: <TrendingUp size={18} />,
        colorClass: "text-emerald-600 bg-emerald-50 border-emerald-100",
      };
    case "paid":
    case "paidInvoices":
      return {
        icon: <CheckCircle2 size={18} />,
        colorClass: "text-emerald-600 bg-emerald-50 border-emerald-100",
      };
    case "unpaid":
      return {
        icon: <AlertCircle size={18} />,
        colorClass: "text-amber-600 bg-amber-50 border-amber-100",
      };
    case "cancelled":
      return {
        icon: <AlertCircle size={18} />,
        colorClass: "text-rose-600 bg-rose-50 border-rose-100",
      };
    case "completed":
      return {
        icon: <CheckCircle2 size={18} />,
        colorClass: "text-emerald-600 bg-emerald-50 border-emerald-100",
      };
    case "invoices":
      return {
        icon: <FileText size={18} />,
        colorClass: "text-cyan-600 bg-cyan-50 border-cyan-100",
      };
    case "labOrders":
      return {
        icon: <Activity size={18} />,
        colorClass: "text-purple-600 bg-purple-50 border-purple-100",
      };
    default:
      return {
        icon: <FileText size={18} />,
        colorClass: "text-slate-600 bg-slate-50 border-slate-100",
      };
  }
};

export function ReportWorkspace({ defaultType = "", title = "Báo cáo & Thống kê nghiệp vụ" }) {
  const { search } = useLocation();
  const requestedType = new URLSearchParams(search).get("type");
  const permission = usePermission("BAO_CAO");
  const [reports, setReports] = useState([]);
  const [type, setType] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;

    const loadOptions = async () => {
      setLoading(true);
      setError("");
      try {
        const data = await getReportOptions();
        if (ignore) return;
        const nextReports = Array.isArray(data?.reports) ? data.reports : [];
        setReports(nextReports);
        setType((current) => {
          const preferred = requestedType || current || defaultType;
          return nextReports.some((report) => report.type === preferred) ? preferred : nextReports[0]?.type || "";
        });
        setFromDate(data?.defaultFrom || "");
        setToDate(data?.defaultTo || "");
      } catch (err) {
        if (!ignore) setError(err.message || "Chưa tải được danh sách báo cáo. Vui lòng thử lại.");
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    if (!permission.loading && permission.canView) loadOptions();
    if (!permission.loading && !permission.canView) setLoading(false);

    return () => {
      ignore = true;
    };
  }, [permission.loading, permission.canView, requestedType, defaultType]);

  const selectedReport = useMemo(() => reports.find((item) => item.type === type), [reports, type]);

  const summaryItems = useMemo(() => {
    if (!summary) return [];
    return Object.entries(summary)
      .filter(([key, value]) => key !== "breakdown" && value !== null && typeof value !== "object")
      .map(([key, value]) => ({
        key,
        label: SUMMARY_LABELS[key] || key,
        value: key === "amount" ? formatMoney(value) : value,
      }));
  }, [summary]);

  const totalBreakdownCount = useMemo(() => {
    if (!summary?.breakdown || !Array.isArray(summary.breakdown)) return 0;
    return summary.breakdown.reduce((sum, item) => sum + (Number(item.count) || 0), 0);
  }, [summary]);

  const loadSummary = async () => {
    if (!type || type === "visit-analytics") return;
    setSummaryLoading(true);
    setError("");
    try {
      const data = await getReportSummary({ type, fromDate, toDate });
      setSummary(data);
    } catch (err) {
      setSummary(null);
      setError(err.message || "Không tải được dữ liệu tổng hợp báo cáo.");
    } finally {
      setSummaryLoading(false);
    }
  };

  useEffect(() => {
    if (!type || !fromDate || !toDate) return;
    loadSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, fromDate, toDate]);

  const handleExport = async () => {
    if (!type) return;
    setExporting(true);
    setError("");
    try {
      const response = await exportReportCsv({ type, fromDate, toDate });
      const fallbackName = `bao-cao-${type}-${fromDate || "from"}-${toDate || "to"}.csv`;
      const fileName = parseFileName(response.headers?.["content-disposition"], fallbackName);
      const blob = new Blob([response.data], { type: response.headers?.["content-type"] || "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message || "Không thể xuất file báo cáo.");
    } finally {
      setExporting(false);
    }
  };

  if (permission.loading || loading) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center bg-slate-50 p-6 animate-fadeIn">
        <div className="flex h-[320px] w-full max-w-md flex-col items-center justify-center bg-white gap-3 rounded-2xl border border-slate-200 shadow-2xs">
          <Loader2 size={32} className="animate-spin text-[#0077B6]" />
          <p className="text-sm text-slate-500">Đang tải báo cáo…</p>
        </div>
      </div>
    );
  }

  if (!permission.canView) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-start bg-slate-50 p-6 animate-fadeIn">
        <div className="mx-auto max-w-md mt-16 p-6 rounded-2xl border border-rose-200 bg-white text-center shadow-2xs">
          <AlertCircle size={36} className="mx-auto text-rose-500 mb-3" />
          <h2 className="text-base font-extrabold text-slate-800">Không có quyền truy cập</h2>
          <p className="mt-2 text-xs font-medium text-slate-500 leading-relaxed">
            Bạn không có quyền xem hoặc xuất báo cáo. Vui lòng liên hệ Quản trị viên hệ thống để cấp quyền tương ứng.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-slate-50 text-slate-800 animate-fadeIn">
      {/* Executive Header Toolbar */}
      <header className="shrink-0 border-b border-slate-200/80 bg-white px-4 py-3 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <BarChart3 size={22} className="text-[#0077B6]" />
              {title}
            </h1>
          </div>

          {/* Module Selector (Combobox for test accessibility & quick switcher) */}
          <div className="flex items-center gap-3 w-full md:w-auto md:min-w-[280px]">
            <label htmlFor="report-type" className="sr-only">
              Xem báo cáo
            </label>
            <select
              id="report-type"
              value={type}
              onChange={(event) => setType(event.target.value)}
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 cursor-pointer"
            >
              {reports.map((report) => (
                <option key={report.type} value={report.type}>
                  {REPORT_LABELS[report.type] || report.label || report.type}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Standard Date & Export Controls (When not visit-analytics) */}
        {type !== "visit-analytics" && (
          <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-600">
                <span>Từ:</span>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(event) => setFromDate(event.target.value)}
                  className="h-8 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 outline-none transition focus:border-[#0077B6] focus:ring-2 focus:ring-[#0077B6]/10 shadow-2xs"
                />
              </label>

              <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-600">
                <span>Đến:</span>
                <input
                  type="date"
                  value={toDate}
                  onChange={(event) => setToDate(event.target.value)}
                  className="h-8 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 outline-none transition focus:border-[#0077B6] focus:ring-2 focus:ring-[#0077B6]/10 shadow-2xs"
                />
              </label>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={loadSummary}
                disabled={summaryLoading || !type}
                className="h-8 inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#0077B6] hover:bg-[#006093] px-3.5 text-xs font-bold text-white shadow-2xs transition active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                {summaryLoading ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                Tải dữ liệu
              </button>
              <button
                type="button"
                onClick={handleExport}
                disabled={exporting || !type || !permission.canExport}
                className="h-8 inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 px-3.5 text-xs font-bold text-white shadow-2xs transition active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                {exporting ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
                Xuất file CSV
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Main Workspace Body */}
      <section className={`min-h-0 flex-1 overflow-y-auto bg-slate-50/60 ${type === "visit-analytics" ? "p-4 space-y-3" : "p-6 space-y-6"}`}>
        {error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-bold text-rose-800 flex items-start gap-3 shadow-2xs">
            <AlertCircle size={18} className="shrink-0 mt-0.5 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {type === "visit-analytics" ? (
          <VisitAnalytics canExport={permission.canExport} />
        ) : !reports.length ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-2xs">
            <FileSpreadsheet size={40} className="mx-auto text-slate-300 mb-3" />
            <p className="text-sm font-bold text-slate-700">Không tìm thấy báo cáo</p>
            <p className="text-xs font-medium text-slate-400 mt-1 max-w-xs mx-auto leading-normal">
              Tài khoản của bạn chưa được cấp cấu hình cho bất kỳ nhóm báo cáo khả dụng nào.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Header timeframe tag */}
            <div className="bg-white rounded-xl px-4 py-2.5 border border-slate-200 flex flex-wrap items-center justify-between text-xs text-slate-500 shadow-2xs">
              <span className="flex items-center gap-1.5 font-bold text-slate-700">
                <Calendar size={14} className="text-[#0077B6]" />
                Đang hiển thị: {REPORT_LABELS[type] || selectedReport?.label || "Báo cáo nghiệp vụ"}
              </span>
              <span className="font-semibold text-slate-400">
                Khoảng thời gian: <strong className="text-slate-700">{fromDate || "..."}</strong> đến <strong className="text-slate-700">{toDate || "..."}</strong>
              </span>
            </div>

            {/* KPI Cards Grid */}
            {summaryLoading ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs animate-pulse flex items-center gap-4">
                    <div className="h-10 w-10 rounded-xl bg-slate-100 shrink-0" />
                    <div className="space-y-2 flex-1">
                      <div className="h-3 w-16 bg-slate-100 rounded" />
                      <div className="h-5 w-24 bg-slate-100 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : summaryItems.length ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {summaryItems.map((item) => {
                  const config = getSummaryCardConfig(item.key);
                  return (
                    <div
                      key={item.key}
                      className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs hover:shadow-xs transition-shadow flex items-center gap-4"
                    >
                      <div className={`p-2.5 rounded-xl border shrink-0 ${config.colorClass}`}>
                        {config.icon}
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                          {item.label}
                        </span>
                        <span
                          className={`block mt-1 font-extrabold truncate ${
                            item.key === "amount"
                              ? "text-lg font-mono text-emerald-600"
                              : "text-2xl font-mono text-slate-900"
                          }`}
                        >
                          {item.value}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center shadow-2xs">
                <p className="text-xs font-semibold text-slate-400">
                  Chưa có dữ liệu tổng hợp chính cho khoảng thời gian này.
                </p>
              </div>
            )}

            {/* Breakdown Table */}
            {!summaryLoading && Array.isArray(summary?.breakdown) && summary.breakdown.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                <div className="border-b border-slate-100 bg-slate-50/70 px-5 py-3.5 flex items-center justify-between">
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-sm">Chi tiết hoạt động &amp; Trạng thái</h3>
                    <p className="text-xs font-medium text-slate-400 mt-0.5">
                      Phân tích chi tiết số lượng hồ sơ theo từng trạng thái thực tế.
                    </p>
                  </div>
                  <span className="text-xs font-bold text-slate-500 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                    {summary.breakdown.length} trạng thái
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left text-sm">
                    <thead className="bg-slate-50/90 text-slate-400 border-b border-slate-200">
                      <tr>
                        <th className="px-5 py-2.5 text-[10px] font-bold uppercase tracking-wider">Trạng thái</th>
                        <th className="px-5 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider w-56">
                          Số lượng hồ sơ
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {summary.breakdown.map((row) => {
                        const count = Number(row.count) || 0;
                        const pct = totalBreakdownCount > 0 ? Math.round((count / totalBreakdownCount) * 100) : 0;
                        return (
                          <tr key={row.status || "empty"} className="hover:bg-slate-50/60 transition-colors">
                            <td className="px-5 py-3">
                              <span
                                className={`inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-bold border ${getStatusTone(
                                  row.status
                                )}`}
                              >
                                {translateStatus(row.status)}
                              </span>
                            </td>
                            <td className="px-5 py-3 text-right">
                              <div className="flex items-center justify-end gap-3">
                                <div className="w-20 h-1.5 rounded-full bg-slate-100 overflow-hidden hidden sm:block">
                                  <div
                                    className="h-full rounded-full bg-[#0077B6]"
                                    style={{ width: `${Math.max(4, pct)}%` }}
                                  />
                                </div>
                                <span className="font-mono text-xs font-bold text-slate-800">{count}</span>
                                <span className="font-mono text-[11px] text-slate-400 w-9 text-right">{pct}%</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

export default function BaoCao({ isAdmin = false }) {
  const { search } = useLocation();
  if (isAdmin) return <Navigate to={{ pathname: "/admin/bao-cao", search }} replace />;
  return (
    <MainLayout>
      <ReportWorkspace />
    </MainLayout>
  );
}
