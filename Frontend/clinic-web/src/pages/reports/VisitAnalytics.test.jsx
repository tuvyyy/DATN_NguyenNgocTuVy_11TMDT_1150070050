import React from "react";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import VisitAnalytics from "./VisitAnalytics";
import { exportVisitAnalytics, getVisitAnalytics } from "../../api/BaoCaoApi";

jest.mock("lucide-react", () => new Proxy({}, { get: (_, key) => key === "__esModule" ? true : () => null }), { virtual: true });
jest.mock("../../api/BaoCaoApi", () => ({ getVisitAnalytics: jest.fn(), exportVisitAnalytics: jest.fn() }));

const report = {
  from: "2024-01-01", to: "2024-12-31", dataKind: "database", validCount: 18, rawCount: 20,
  excludedCancelled: 2, excludedInvalid: 0, demoCount: 0, monthly: [{ month: "2024-11", count: 8 }, { month: "2024-12", count: 10 }],
  doctors: [], specialties: [], diseaseGroups: [], notes: [],
  rankedHours: [{ rank: 1, label: "09:00–09:59", count: 18 }],
  forecast: { available: false, requiredMonths: 30, future: [], validation: [] },
};
const predictedReport = () => ({ ...report, forecast: {
  available: true, requiredMonths: 26, seasonLength: 12, trainCount: 24, testCount: 2,
  trainFrom: "2022-11", trainTo: "2024-10", testFrom: "2024-11", testTo: "2024-12",
  parameters: { alpha: .3, beta: .1, gamma: .1 },
  metrics: { mae: 2.5, rmse: 3, mape: null, mapeCount: 0 }, baselineMetrics: { mae: 1, rmse: 1, mape: null },
  validation: [{ month: "2024-11", actual: 8, predicted: 6, seasonalNaive: 7, residual: 2 }, { month: "2024-12", actual: 10, predicted: 13, seasonalNaive: 9, residual: -3 }],
  future: [{ month: "2025-01", predicted: 12.6 }, { month: "2025-02", predicted: 14.4 }],
} });
const loaded = () => screen.findByRole("heading", { name: "Lượt khám theo tháng" });
const apply = () => fireEvent.click(screen.getByRole("button", { name: "Cập nhật", exact: true }));
const openTab = async name => fireEvent.click(await screen.findByRole("tab", { name }));
const selectOption = (name, value) => {
  if (name === "Số tháng kiểm tra") {
    const details = screen.getByText("Kiểm tra mô hình").closest("details");
    if (!details.open) fireEvent.click(screen.getByText("Kiểm tra mô hình"));
  }
  fireEvent.click(screen.getByRole("combobox", { name }));
  fireEvent.click(screen.getByRole("option", { name: value, exact: true }));
};
beforeEach(() => {
  jest.clearAllMocks(); getVisitAnalytics.mockResolvedValue(report);
  exportVisitAnalytics.mockResolvedValue({ data: "export", headers: {} });
  URL.createObjectURL = jest.fn(() => "blob:report"); URL.revokeObjectURL = jest.fn();
  jest.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

test("forecast is its own task and only shows the next month and forecast total", async () => {
  getVisitAnalytics.mockResolvedValue(predictedReport()); render(<VisitAnalytics canExport />); await loaded();
  expect(screen.getByRole("complementary", { name: "Thiết lập báo cáo" })).not.toBeNull();
  expect(screen.getByRole("heading", { name: "Kết quả dự báo" })).not.toBeNull();
  expect(screen.getByText("Tháng tiếp theo · 01/2025")).not.toBeNull();
  const table = screen.getByRole("table", { name: "Số lượt dự báo theo tháng" });
  expect(within(table).getAllByRole("row")[1].textContent).toBe("01/202513Ít");
  expect(within(table).getAllByRole("row")[2].textContent).toBe("02/202514Nhiều");
  expect(screen.getByLabelText("Chú giải mức lượt khám").textContent).toContain("13 lượt");
  expect(screen.getByLabelText("Chú giải mức lượt khám").textContent).toContain("14 lượt");
  expect(screen.queryByText(/Sai lệch trung bình|MAE|RMSE/)).toBeNull();
  expect(screen.queryByRole("table", { name: "So sánh số lượt theo tháng" })).toBeNull();
});

test("the linear trend matches the displayed history and stops before the forecast", async () => {
  const months = [
    { month: "2023-12", count: 30 },
    ...Array.from({ length: 12 }, (_, i) => ({ month: `2024-${String(i + 1).padStart(2, "0")}`, count: 40 + i })),
  ];
  getVisitAnalytics.mockResolvedValue({
    ...predictedReport(),
    monthly: months,
    trend: { points: months.map(({ month }, i) => ({ month, value: 30.25 + i })) },
  });
  render(<VisitAnalytics canExport />);
  const chart = await screen.findByRole("img", { name: "Lượt khám thực tế và dự báo" });
  const readout = name => screen.getByText(name, { selector: ".vr-chart-readout span" }).textContent;

  fireEvent.focus(within(chart).getByLabelText("01/2024, Đã ghi nhận: 40 lượt"));
  expect(readout("Xu hướng tuyến tính:")).toContain("31,25 lượt");
  expect(within(chart).queryByLabelText("12/2023, Đã ghi nhận: 30 lượt")).toBeNull();
  fireEvent.focus(within(chart).getByLabelText("01/2025, Dự báo: 13 lượt"));
  expect(screen.queryByText("Xu hướng tuyến tính:", { selector: ".vr-chart-readout span" })).toBeNull();

  fireEvent.click(screen.getByRole("button", { name: "Toàn bộ" }));
  fireEvent.focus(within(chart).getByLabelText("12/2023, Đã ghi nhận: 30 lượt"));
  expect(readout("Xu hướng tuyến tính:")).toContain("30,25 lượt");
  expect(getVisitAnalytics).toHaveBeenCalledTimes(1);
});

test("daily analysis keeps zero-count days and switches months without reloading the report", async () => {
  getVisitAnalytics.mockResolvedValue({
    ...predictedReport(),
    daily: [
      { date: "2024-11-30", count: 3 },
      { date: "2024-12-01", count: 0 },
      { date: "2024-12-02", count: 7 },
    ],
  });
  render(<VisitAnalytics canExport />);
  await loaded();
  await openTab("Phân tích lượt khám");
  fireEvent.click(screen.getByRole("button", { name: "Theo ngày" }));
  const chart = screen.getByRole("img", { name: "Biểu đồ lượt khám theo ngày" });
  expect(screen.getByRole("combobox", { name: "Tháng hiển thị" }).textContent).toBe("12/2024");
  fireEvent.focus(within(chart).getByLabelText("01/12/2024, Đã ghi nhận: 0 lượt"));
  expect(screen.getByText("Đã ghi nhận:", { selector: ".vr-chart-readout span" }).textContent).toContain("0 lượt");
  expect(within(chart).queryByLabelText("30/11/2024, Đã ghi nhận: 3 lượt")).toBeNull();

  selectOption("Tháng hiển thị", "11/2024");
  expect(within(chart).getByLabelText("30/11/2024, Đã ghi nhận: 3 lượt")).not.toBeNull();
  expect(within(chart).queryByLabelText("02/12/2024, Đã ghi nhận: 7 lượt")).toBeNull();
  await openTab("Dự báo lượt khám");
  expect(screen.getByRole("table", { name: "Số lượt dự báo theo tháng" })).not.toBeNull();
  expect(getVisitAnalytics).toHaveBeenCalledTimes(1);
});

test("draft settings do not change results or request data until explicitly applied", async () => {
  getVisitAnalytics.mockImplementation(async params => ({ ...report, from: params.fromDate, to: params.toDate }));
  render(<VisitAnalytics canExport />); await loaded();
  const initial = getVisitAnalytics.mock.calls[0][0];
  fireEvent.change(screen.getByLabelText("Từ ngày"), { target: { value: "2020-01-01" } });
  fireEvent.change(screen.getByLabelText("Từ ngày"), { target: { value: "2020-02-01" } });
  expect(getVisitAnalytics).toHaveBeenCalledTimes(1);
  expect(screen.getByText("Thay đổi chưa được áp dụng")).not.toBeNull();
  expect(screen.getByRole("button", { name: "Tải bảng tháng" }).disabled).toBe(true);
  expect(screen.getByRole("heading", { name: "Lượt khám theo tháng" })).not.toBeNull();
  apply();
  await waitFor(() => expect(getVisitAnalytics).toHaveBeenCalledTimes(2));
  await waitFor(() => expect(screen.getByRole("button", { name: "Tải bảng tháng" }).disabled).toBe(false));
  expect(screen.queryByText("Thay đổi chưa được áp dụng")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Tải bảng tháng" }));
  await waitFor(() => expect(exportVisitAnalytics).toHaveBeenCalledWith({ ...initial, fromDate: "2020-02-01", format: "monthly" }));
  await waitFor(() => expect(URL.revokeObjectURL).toHaveBeenCalled());
});

test("unapplied source changes leave the source of the displayed data intact", async () => {
  render(<VisitAnalytics canExport />); await loaded();
  getVisitAnalytics.mockResolvedValue({ ...report, dataKind: "synthetic", demoCount: 18 });
  selectOption("Nguồn dữ liệu", "Mô phỏng");
  expect(getVisitAnalytics).toHaveBeenCalledTimes(1);
  expect(screen.queryByText("Dữ liệu minh họa")).toBeNull();
  apply(); await screen.findByText("Dữ liệu minh họa");
  expect(getVisitAnalytics.mock.calls.at(-1)[0].demo).toBe(true);
});

test("forecast horizon is applied before the future table is updated", async () => {
  getVisitAnalytics.mockImplementation(async params => { const data = predictedReport(); return { ...data, forecast: { ...data.forecast, future: Array.from({ length: params.horizon }, (_, i) => ({ month: `2025-${String(i + 1).padStart(2, "0")}`, predicted: 100 + i })) } }; });
  render(<VisitAnalytics canExport />); await loaded();
  const table = () => screen.getByRole("table", { name: "Số lượt dự báo theo tháng" });
  expect(within(table()).getAllByRole("row")).toHaveLength(7);
  selectOption("Dự báo trong", "3 tháng");
  expect(within(table()).getAllByRole("row")).toHaveLength(7);
  apply(); await waitFor(() => expect(within(table()).getAllByRole("row")).toHaveLength(4));
  expect(getVisitAnalytics.mock.calls.at(-1)[0].horizon).toBe(3);
});

test("a newer explicit apply cancels the older request and ignores late responses", async () => {
  render(<VisitAnalytics canExport />); await loaded();
  let older, latest;
  getVisitAnalytics.mockImplementationOnce(() => new Promise(resolve => { older = resolve; }));
  getVisitAnalytics.mockImplementationOnce(() => new Promise(resolve => { latest = resolve; }));
  selectOption("Dự báo trong", "3 tháng"); apply();
  const olderSignal = getVisitAnalytics.mock.calls[1][1].signal;
  selectOption("Dự báo trong", "12 tháng"); apply();
  expect(olderSignal.aborted).toBe(true);
  const newerData = predictedReport(); newerData.forecast.future[0].predicted = 1247;
  await act(async () => latest(newerData));
  const oldData = predictedReport(); oldData.forecast.future[0].predicted = 333;
  await act(async () => older(oldData));
  expect(screen.getByRole("table", { name: "Số lượt dự báo theo tháng" }).textContent).toContain("1.247");
  expect(screen.getByRole("table", { name: "Số lượt dự báo theo tháng" }).textContent).not.toContain("333");
});

test("insufficient history reports the actual number of available months", async () => {
  render(<VisitAnalytics canExport />); await loaded();
  expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe("2");
  expect(screen.getByRole("progressbar").getAttribute("aria-valuemax")).toBe("30");
  expect(screen.queryByRole("table", { name: "Số lượt dự báo theo tháng" })).toBeNull();
});

test("model check settings are separate and take effect on apply", async () => {
  getVisitAnalytics.mockImplementation(async params => ({ ...report, forecast: { ...report.forecast, requiredMonths: 24 + params.testMonths } }));
  render(<VisitAnalytics canExport />); await loaded();
  selectOption("Số tháng kiểm tra", "12 tháng");
  expect(getVisitAnalytics).toHaveBeenCalledTimes(1); apply();
  await waitFor(() => expect(screen.getByRole("progressbar").getAttribute("aria-valuemax")).toBe("36"));
  expect(getVisitAnalytics.mock.calls.at(-1)[0].testMonths).toBe(12);
});

test("evaluation owns quality metrics, comparisons and its export action", async () => {
  getVisitAnalytics.mockResolvedValue(predictedReport()); render(<VisitAnalytics canExport />); await loaded();
  await openTab("Đánh giá mô hình");
  expect(screen.getByRole("heading", { name: "Kiểm tra độ sai lệch" })).not.toBeNull();
  expect(screen.getByText("MAE · Sai lệch trung bình")).not.toBeNull();
  const chart = screen.getByRole("img", { name: "Đối chiếu lượt khám trên tập kiểm tra" });
  expect(chart.querySelectorAll("path")).toHaveLength(3);
  const table = screen.getByRole("table", { name: "So sánh số lượt theo tháng" });
  expect(within(table).getByText("+2")).not.toBeNull(); expect(within(table).getByText("-3")).not.toBeNull();
  expect(screen.getByText(/Holt-Winters có RMSE cao hơn/)).not.toBeNull();
  expect(screen.getAllByRole("button", { name: "Tải đánh giá" })).toHaveLength(1);
  fireEvent.click(screen.getByRole("button", { name: "Tải đánh giá" }));
  await waitFor(() => expect(exportVisitAnalytics).toHaveBeenCalledWith(expect.objectContaining({ format: "csv" })));
});

test("zero-aware metric explanations and parameters remain available", async () => {
  getVisitAnalytics.mockResolvedValue(predictedReport()); render(<VisitAnalytics canExport />);
  await openTab("Đánh giá mô hình");
  expect(screen.getByText(/Không tính được khi các tháng kiểm tra đều bằng 0/)).not.toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Tham số mô hình và cách đánh giá" }));
  expect(screen.getByText(/MAPE dùng 0\/2/).textContent).toContain("vẫn tính MAE và RMSE");
});

test("analysis switches breakdowns without fetching data or mixing the forecast table", async () => {
  getVisitAnalytics.mockResolvedValue({ ...predictedReport(), specialties: [{ label: "Nội tổng quát", count: 10 }], doctors: Array.from({ length: 6 }, (_, i) => ({ label: `Bác sĩ ${i + 1} (#${i + 1})`, count: 6 - i })) });
  render(<VisitAnalytics canExport />); await openTab("Phân tích lượt khám");
  expect(screen.queryByRole("table", { name: "Số lượt dự báo theo tháng" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Chuyên khoa" }));
  expect(within(screen.getByRole("list")).getByText("Nội tổng quát")).not.toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Bác sĩ", exact: true }));
  fireEvent.click(screen.getByRole("button", { name: "Xem đủ 6 mục" }));
  expect(screen.getByText("Bác sĩ 6")).not.toBeNull();
  await openTab("Dự báo lượt khám");
  expect(screen.getByRole("table", { name: "Số lượt dự báo theo tháng" })).not.toBeNull();
  expect(getVisitAnalytics).toHaveBeenCalledTimes(1);
});

test("the example action immediately loads 36 complete months as an explicit request", async () => {
  render(<VisitAnalytics canExport />); await loaded();
  getVisitAnalytics.mockResolvedValue({ ...report, dataKind: "synthetic", demoCount: 18 });
  fireEvent.click(screen.getByRole("button", { name: "Xem ví dụ 36 tháng" }));
  await screen.findByText("Dữ liệu minh họa");
  const params = getVisitAnalytics.mock.calls.at(-1)[0];
  const [fy, fm, fd] = params.fromDate.split("-").map(Number); const [ty, tm, td] = params.toDate.split("-").map(Number);
  expect((ty - fy) * 12 + tm - fm + 1).toBe(36); expect(fd).toBe(1); expect(td).toBe(new Date(ty, tm, 0).getDate());
  expect(params.demo).toBe(true);
});

test("an invalid apply never requests data and keeps the previously applied results", async () => {
  render(<VisitAnalytics canExport />); await loaded();
  fireEvent.change(screen.getByLabelText("Từ ngày"), { target: { value: "2099-01-01" } });
  fireEvent.submit(screen.getByRole("complementary").querySelector("form"));
  expect(screen.getByRole("alert").textContent).toContain("Ngày bắt đầu cần trước");
  expect(getVisitAnalytics).toHaveBeenCalledTimes(1);
  expect(screen.getByRole("heading", { name: "Lượt khám theo tháng" })).not.toBeNull();
  fireEvent.change(screen.getByLabelText("Từ ngày"), { target: { value: "2024-01-01" } }); apply();
  await waitFor(() => expect(getVisitAnalytics).toHaveBeenCalledTimes(2));
  expect(screen.queryByRole("alert")).toBeNull();
});

test("failed refresh removes obsolete figures and allows retry", async () => {
  render(<VisitAnalytics canExport />); await loaded();
  getVisitAnalytics.mockRejectedValueOnce(new Error("Không kết nối được báo cáo.")); apply();
  await screen.findByRole("alert");
  expect(screen.queryByRole("heading", { name: "Lượt khám theo tháng" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Thử lại" })); await loaded();
});

test("read-only viewers cannot export from either task", async () => {
  getVisitAnalytics.mockResolvedValue(predictedReport()); render(<VisitAnalytics canExport={false} />); await loaded();
  expect(screen.getByRole("button", { name: "Tải bảng tháng" }).disabled).toBe(true);
  await openTab("Đánh giá mô hình"); expect(screen.getByRole("button", { name: "Tải đánh giá" }).disabled).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: "Tải đánh giá" })); expect(exportVisitAnalytics).not.toHaveBeenCalled();
});

test("empty reports do not invent forecasts or busiest hours", async () => {
  getVisitAnalytics.mockResolvedValue({ ...report, validCount: 0, monthly: [], rankedHours: [] }); render(<VisitAnalytics canExport />); await loaded();
  expect(screen.queryByRole("table", { name: "Số lượt dự báo theo tháng" })).toBeNull();
  await openTab("Phân tích lượt khám"); expect(screen.getByText("Chưa có số liệu theo giờ.")).not.toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Theo ngày" }));
  expect(screen.getByText("Chưa có số liệu theo ngày.")).not.toBeNull();
  expect(screen.queryByRole("img", { name: "Biểu đồ lượt khám theo ngày" })).toBeNull();
});

test("tabs retain keyboard focus and do not trigger new requests", async () => {
  getVisitAnalytics.mockResolvedValue(predictedReport()); render(<VisitAnalytics canExport />); await loaded();
  fireEvent.keyDown(screen.getByRole("tab", { name: "Dự báo lượt khám" }), { key: "ArrowRight" });
  const tab = screen.getByRole("tab", { name: "Đánh giá mô hình" });
  expect(tab.getAttribute("aria-selected")).toBe("true"); expect(document.activeElement).toBe(tab);
  expect(screen.getByRole("tabpanel").getAttribute("aria-labelledby")).toBe(tab.id); expect(getVisitAnalytics).toHaveBeenCalledTimes(1);
});

test("unmount aborts the outstanding report request", async () => {
  getVisitAnalytics.mockImplementationOnce(() => new Promise(() => {})); const { unmount } = render(<VisitAnalytics canExport />);
  await waitFor(() => expect(getVisitAnalytics).toHaveBeenCalledTimes(1)); const signal = getVisitAnalytics.mock.calls[0][1].signal;
  unmount(); expect(signal.aborted).toBe(true);
});
