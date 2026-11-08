import React from "react";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import VisitAnalytics from "./VisitAnalytics";
import { exportVisitAnalytics, getVisitAnalytics } from "../../api/BaoCaoApi";

jest.mock("../../api/BaoCaoApi", () => ({ getVisitAnalytics: jest.fn(), exportVisitAnalytics: jest.fn() }));

const report = {
  from: "2024-01-01", to: "2024-12-31", dataKind: "database", rawCount: 20, validCount: 18,
  excludedCancelled: 2, excludedInvalid: 0, demoCount: 0, undatedCount: 0,
  monthly: [{ month: "2024-11", count: 8 }, { month: "2024-12", count: 10 }],
  daily: [], hourly: [{ label: "09:00–09:59", count: 18 }], doctors: [], specialties: [], diseaseGroups: [], notes: [],
  rankedHours: [{ rank: 1, label: "09:00–09:59", count: 18, sharePercent: 100 }],
  trend: { intercept: 8, slope: 2, rSquared: 1, direction: "Tăng", points: [] },
  forecast: { available: false, requiredMonths: 30, message: "Internal technical message", validation: [], future: [] },
};
const predictedReport = () => ({ ...report, forecast: {
  available: true, requiredMonths: 30, seasonLength: 12, trainCount: 30, testCount: 2,
  trainFrom: "2022-01", trainTo: "2024-06", testFrom: "2024-11", testTo: "2024-12",
  parameters: { alpha: .3, beta: .1, gamma: .1 },
  metrics: { mae: 2.5, rmse: 3, mape: null, mapeCount: 0, zeroActualCount: 2 },
  baselineMetrics: { mae: 1, rmse: 1, mape: null },
  validation: [{ month: "2024-11", actual: 8, predicted: 6, residual: 2 }, { month: "2024-12", actual: 10, predicted: 13, residual: -3 }],
  future: [{ month: "2025-01", predicted: 12.6 }, { month: "2025-02", predicted: 14.4 }],
} });

beforeEach(() => {
  jest.clearAllMocks();
  getVisitAnalytics.mockResolvedValue(report);
  exportVisitAnalytics.mockResolvedValue({ data: "export", headers: {} });
  URL.createObjectURL = jest.fn(() => "blob:analytics-check");
  URL.revokeObjectURL = jest.fn();
  jest.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

test("overview answers practical questions and keeps mathematical details out of the initial screen", async () => {
  getVisitAnalytics.mockResolvedValue(predictedReport());
  render(<VisitAnalytics canExport />);
  await screen.findByRole("heading", { name: "Số lượt khám theo tháng" });
  expect(screen.getByText("+25%")).not.toBeNull();
  expect(screen.getByText("Tăng 2 lượt so với 11/2024")).not.toBeNull();
  expect(screen.getByText("Dự kiến tháng 01/2025")).not.toBeNull();
  const futureTable = screen.getByRole("table", { name: "Số lượt dự kiến theo tháng" });
  expect(within(futureTable).getAllByRole("row")[1].textContent).toBe("01/202513");
  const chart = screen.getByRole("img", { name: "Số lượt khám đã ghi nhận và dự kiến" });
  expect(chart.querySelectorAll("path").length).toBe(2);
  expect(screen.queryByText(/Holt-Winters|Hồi quy|RMSE|MAPE|database|train|test/i)).toBeNull();
  expect(screen.queryByText("Internal technical message")).toBeNull();
  expect(screen.queryByRole("table", { name: "So sánh số lượt theo tháng" })).toBeNull();
  expect(within(chart).queryByText(/12\/2024 · Dự kiến/)).toBeNull();
});

test("insufficient history uses readable guidance without presenting made-up future values", async () => {
  render(<VisitAnalytics canExport />);
  await screen.findByText(/Hiện có 2 tháng đầy đủ/);
  expect(screen.queryByRole("table", { name: "Số lượt dự kiến theo tháng" })).toBeNull();
  expect(getVisitAnalytics.mock.calls[0][0].demo).toBe(false);
});

test("date edits update automatically and downloads match the displayed date range", async () => {
  getVisitAnalytics.mockImplementation(async (params) => ({ ...report, from: params.fromDate, to: params.toDate }));
  render(<VisitAnalytics canExport />);
  await screen.findByRole("heading", { name: "Số lượt khám theo tháng" });
  const analyzed = getVisitAnalytics.mock.calls[0][0];
  fireEvent.change(screen.getByLabelText("Từ ngày"), { target: { value: "2020-01-01" } });
  fireEvent.change(screen.getByLabelText("Từ ngày"), { target: { value: "2020-02-01" } });
  expect(screen.getByRole("button", { name: "Tải bảng tháng" }).disabled).toBe(true);
  await waitFor(() => expect(getVisitAnalytics).toHaveBeenCalledTimes(2));
  await waitFor(() => expect(screen.getByRole("button", { name: "Tải bảng tháng" }).disabled).toBe(false));
  expect(getVisitAnalytics.mock.calls.at(-1)[0].fromDate).toBe("2020-02-01");
  fireEvent.click(screen.getByRole("button", { name: "Tải bảng tháng" }));
  await waitFor(() => expect(exportVisitAnalytics).toHaveBeenCalledWith({ ...analyzed, fromDate: "2020-02-01", format: "monthly" }));
  await waitFor(() => expect(URL.revokeObjectURL).toHaveBeenCalled());
});

test("read-only viewers cannot download a report", async () => {
  render(<VisitAnalytics canExport={false} />);
  await screen.findByRole("heading", { name: "Số lượt khám theo tháng" });
  expect(screen.getByRole("button", { name: "Tải bảng tháng" }).disabled).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: "Tải bảng tháng" }));
  expect(exportVisitAnalytics).not.toHaveBeenCalled();
});

test("failed refresh removes obsolete figures and explains the failure", async () => {
  render(<VisitAnalytics canExport />);
  await screen.findByRole("heading", { name: "Số lượt khám theo tháng" });
  getVisitAnalytics.mockRejectedValue(new Error("Không kết nối được báo cáo."));
  fireEvent.click(screen.getByRole("button", { name: "Tải lại" }));
  await screen.findByRole("alert");
  expect(screen.queryByRole("heading", { name: "Số lượt khám theo tháng" })).toBeNull();
  expect(screen.getByRole("alert").textContent).toContain("Không kết nối được báo cáo.");
});

test("comparison opens on request and preserves the signs of forecast errors", async () => {
  getVisitAnalytics.mockResolvedValue(predictedReport());
  render(<VisitAnalytics canExport />);
  const button = await screen.findByRole("button", { name: "Đối chiếu dự kiến" });
  expect(button.getAttribute("aria-expanded")).toBe("false");
  fireEvent.click(button);
  const chart = screen.getByRole("img", { name: "Chênh lệch giữa số đã ghi nhận và số dự kiến" });
  expect(within(chart).getByText("Không chênh lệch")).not.toBeNull();
  expect(within(chart).getByText("11/2024 · Chênh lệch: 2 lượt")).not.toBeNull();
  expect(within(chart).getByText("12/2024 · Chênh lệch: -3 lượt")).not.toBeNull();
  expect(chart.innerHTML).not.toContain("NaN");
  expect(screen.getByRole("table", { name: "So sánh số lượt theo tháng" }).textContent).toContain("-3");
  fireEvent.click(button);
  expect(screen.queryByRole("table", { name: "So sánh số lượt theo tháng" })).toBeNull();
});

test("method details and zero-aware metrics remain available when requested", async () => {
  getVisitAnalytics.mockResolvedValue(predictedReport());
  render(<VisitAnalytics canExport />);
  const button = await screen.findByRole("button", { name: "Về số liệu và cách tính" });
  fireEvent.click(button);
  expect(screen.getByText(/MAPE dùng 0\/2/).textContent).toContain("vẫn tính MAE và RMSE");
  expect(screen.getByRole("table", { name: "Chỉ số đánh giá" })).not.toBeNull();
});

test("the shared report panel switches breakdowns without reloading or hiding future counts", async () => {
  getVisitAnalytics.mockResolvedValue({ ...predictedReport(),
    specialties: [{ label: "Nội tổng quát", count: 10 }],
    doctors: Array.from({ length: 6 }, (_, i) => ({ label: `Bác sĩ ${i + 1} (#${i + 1})`, count: 6 - i })),
    diseaseGroups: [{ label: "Bệnh hô hấp", count: 8 }],
  });
  render(<VisitAnalytics canExport />);
  await screen.findByRole("heading", { name: "Số lượt khám theo tháng" });
  const switcher = screen.getByRole("group", { name: "Xem lượt khám" });
  expect(screen.queryByRole("list")).toBeNull();
  for (const [button, heading, row] of [
    ["Theo giờ", "Giờ đông bệnh nhân", "09:00–09:59"],
    ["Chuyên khoa", "Lượt khám theo chuyên khoa", "Nội tổng quát"],
    ["Bác sĩ", "Lượt khám theo bác sĩ", "Bác sĩ 1"],
    ["Nhóm bệnh", "Lượt khám theo nhóm bệnh", "Bệnh hô hấp"],
  ]) {
    fireEvent.click(within(switcher).getByRole("button", { name: button }));
    expect(screen.getByRole("heading", { name: heading })).not.toBeNull();
    expect(within(screen.getByRole("list")).getByText(row)).not.toBeNull();
    expect(screen.getAllByRole("list")).toHaveLength(1);
    expect(within(switcher).getByRole("button", { name: button }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("table", { name: "Số lượt dự kiến theo tháng" })).not.toBeNull();
  }
  fireEvent.click(within(switcher).getByRole("button", { name: "Bác sĩ" }));
  expect(screen.queryByText("Bác sĩ 6")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Xem đủ 6 mục" }));
  expect(screen.getByText("Bác sĩ 6")).not.toBeNull();
  fireEvent.click(within(switcher).getByRole("button", { name: "Theo tháng" }));
  expect(screen.getByRole("img", { name: "Số lượt khám đã ghi nhận và dự kiến" })).not.toBeNull();
  expect(screen.queryByRole("list")).toBeNull();
  expect(getVisitAnalytics).toHaveBeenCalledTimes(1);
});

test("example mode is an explicit option and resets to 36 complete months", async () => {
  render(<VisitAnalytics canExport />);
  await screen.findByRole("heading", { name: "Số lượt khám theo tháng" });
  fireEvent.change(screen.getByLabelText("Từ ngày"), { target: { value: "2024-12-01" } });
  fireEvent.change(screen.getByLabelText("Đến ngày"), { target: { value: "2024-12-31" } });
  fireEvent.click(screen.getByRole("button", { name: "Tùy chọn khác" }));
  getVisitAnalytics.mockResolvedValue({ ...report, dataKind: "synthetic", demoCount: 18 });
  fireEvent.click(screen.getByRole("button", { name: "Xem ví dụ 36 tháng" }));
  await waitFor(() => expect(getVisitAnalytics.mock.calls.at(-1)[0].demo).toBe(true));
  await screen.findByText("Số liệu minh họa", { selector: "span" });
  const params = getVisitAnalytics.mock.calls.at(-1)[0];
  const [fy, fm, fd] = params.fromDate.split("-").map(Number);
  const [ty, tm, td] = params.toDate.split("-").map(Number);
  expect(params).toMatchObject({ demo: true, horizon: 6, testMonths: 6 });
  expect((ty - fy) * 12 + tm - fm + 1).toBe(36);
  expect(fd).toBe(1);
  expect(td).toBe(new Date(ty, tm, 0).getDate());
});

test("tied busy hours are shown together, and a zero previous month does not produce an infinite percentage", async () => {
  getVisitAnalytics.mockResolvedValue({ ...report, monthly: [{ month: "2024-11", count: 0 }, { month: "2024-12", count: 10 }], rankedHours: [
    { rank: 1, label: "08:00–08:59", count: 9, sharePercent: 50 }, { rank: 1, label: "09:00–09:59", count: 9, sharePercent: 50 },
  ] });
  render(<VisitAnalytics canExport />);
  await screen.findByText("2 khung giờ");
  expect(screen.getByText("08:00–08:59, 09:00–09:59")).not.toBeNull();
  expect(screen.queryByText(/Infinity|NaN/)).toBeNull();
  expect(screen.getByText("Tăng 10 lượt so với 11/2024")).not.toBeNull();
});

test("empty reports do not invent a busiest hour", async () => {
  getVisitAnalytics.mockResolvedValue({ ...report, validCount: 0, monthly: [], rankedHours: [] });
  render(<VisitAnalytics canExport />);
  await screen.findByText("Chưa có số liệu theo giờ.");
  expect(screen.queryByRole("img", { name: "Chênh lệch giữa số đã ghi nhận và số dự kiến" })).toBeNull();
});

test("database sample records are labelled honestly without exposing database terminology", async () => {
  getVisitAnalytics.mockResolvedValue({ ...report, demoCount: 12 });
  render(<VisitAnalytics canExport />);
  await screen.findByText("Số liệu minh họa");
  expect(screen.queryByText(/database/i)).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Về số liệu và cách tính" }));
  expect(screen.getByText(/Báo cáo có 12 lượt khám minh họa/)).not.toBeNull();
});

test("selecting a forecast period automatically changes the number of predicted months", async () => {
  getVisitAnalytics.mockImplementation(async (params) => {
    const data = predictedReport();
    return { ...data, forecast: { ...data.forecast, future: Array.from({ length: params.horizon }, (_, i) => ({ month: `2025-${String(i + 1).padStart(2, "0")}`, predicted: 100 + i })) } };
  });
  render(<VisitAnalytics canExport />);
  const table = await screen.findByRole("table", { name: "Số lượt dự kiến theo tháng" });
  expect(within(table).getAllByRole("row")).toHaveLength(7);
  fireEvent.change(screen.getByLabelText("Dự kiến trong"), { target: { value: "3" } });
  await waitFor(() => expect(within(screen.getByRole("table", { name: "Số lượt dự kiến theo tháng" })).getAllByRole("row")).toHaveLength(4));
  expect(getVisitAnalytics.mock.calls.at(-1)[0].horizon).toBe(3);
  expect(screen.queryByText(/Bạn vừa đổi thời gian xem/)).toBeNull();
});

test("a slower earlier request cannot overwrite the latest forecast selection", async () => {
  render(<VisitAnalytics canExport />);
  await screen.findByRole("heading", { name: "Số lượt khám theo tháng" });
  let older, latest;
  getVisitAnalytics.mockImplementationOnce(() => new Promise(resolve => { older = resolve; }));
  getVisitAnalytics.mockImplementationOnce(() => new Promise(resolve => { latest = resolve; }));
  fireEvent.change(screen.getByLabelText("Dự kiến trong"), { target: { value: "3" } });
  await waitFor(() => expect(getVisitAnalytics).toHaveBeenCalledTimes(2));
  const olderSignal = getVisitAnalytics.mock.calls[1][1].signal;
  expect(screen.getByLabelText("Dự kiến trong").disabled).toBe(false);
  fireEvent.change(screen.getByLabelText("Dự kiến trong"), { target: { value: "12" } });
  await waitFor(() => expect(getVisitAnalytics).toHaveBeenCalledTimes(3));
  expect(olderSignal.aborted).toBe(true);
  expect(getVisitAnalytics.mock.calls[2][1].signal.aborted).toBe(false);
  const newerData = predictedReport();
  newerData.forecast.future[0].predicted = 1247;
  await act(async () => latest(newerData));
  const oldData = predictedReport();
  oldData.forecast.future[0].predicted = 333;
  await act(async () => older(oldData));
  expect(screen.getByRole("table", { name: "Số lượt dự kiến theo tháng" }).textContent).toContain("1.247");
  expect(screen.getByRole("table", { name: "Số lượt dự kiến theo tháng" }).textContent).not.toContain("333");
});

test("leaving the page cancels an outstanding report request", async () => {
  getVisitAnalytics.mockImplementationOnce(() => new Promise(() => {}));
  const { unmount } = render(<VisitAnalytics canExport />);
  await waitFor(() => expect(getVisitAnalytics).toHaveBeenCalledTimes(1));
  const signal = getVisitAnalytics.mock.calls[0][1].signal;
  expect(signal.aborted).toBe(false);
  unmount();
  expect(signal.aborted).toBe(true);
});

test("invalid dates are not submitted and a corrected range automatically recovers", async () => {
  render(<VisitAnalytics canExport />);
  await screen.findByRole("heading", { name: "Số lượt khám theo tháng" });
  fireEvent.change(screen.getByLabelText("Từ ngày"), { target: { value: "2099-01-01" } });
  expect(screen.getByRole("alert").textContent).toContain("Ngày bắt đầu cần trước");
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 450)); });
  expect(getVisitAnalytics).toHaveBeenCalledTimes(1);
  fireEvent.change(screen.getByLabelText("Từ ngày"), { target: { value: "2024-01-01" } });
  await waitFor(() => expect(getVisitAnalytics).toHaveBeenCalledTimes(2));
  await waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
});
