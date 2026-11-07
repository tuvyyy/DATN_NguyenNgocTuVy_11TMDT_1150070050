import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import VisitAnalytics from "./VisitAnalytics";
import { exportVisitAnalytics, getVisitAnalytics } from "../../api/BaoCaoApi";

jest.mock("../../api/BaoCaoApi", () => ({ getVisitAnalytics: jest.fn(), exportVisitAnalytics: jest.fn() }));
// The icon package uses an ESM entry that CRA's older Jest resolver cannot load.
jest.mock("lucide-react", () => ({ AlertCircle: () => null, Download: () => null, Loader2: () => null, TrendingUp: () => null }), { virtual: true });

const report = {
  from: "2024-01-01", to: "2024-12-31", dataKind: "database", rawCount: 20, validCount: 18,
  excludedCancelled: 2, excludedInvalid: 0, demoCount: 0, undatedCount: 0,
  monthly: [{ month: "2024-01", count: 18 }], daily: [{ date: "2024-01-01", count: 18 }],
  hourly: [{ label: "09:00–09:59", count: 18 }], doctors: [], specialties: [], diseaseGroups: [], notes: ["Đếm từng lượt khám."],
  trend: null, forecast: { available: false, message: "Chưa đủ lịch sử để dự báo.", validation: [], future: [] },
};

beforeEach(() => {
  jest.clearAllMocks();
  getVisitAnalytics.mockResolvedValue(report);
  exportVisitAnalytics.mockResolvedValue({ data: "export", headers: {} });
  URL.createObjectURL = jest.fn(() => "blob:analytics-check");
  URL.revokeObjectURL = jest.fn();
  jest.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

test("shows insufficient history without pretending to have future forecasts", async () => {
  render(<VisitAnalytics canExport />);
  await screen.findByText("Chưa đủ lịch sử để dự báo.");
  expect(screen.queryByText("Các tháng tiếp theo")).toBeNull();
  expect(screen.getByRole("img").getAttribute("aria-label")).toContain("Lượt khám thực tế");
  expect(getVisitAnalytics.mock.calls[0][0].demo).toBe(false);
});

test("simulation requires explicit selection and clearly labels returned results", async () => {
  render(<VisitAnalytics canExport />);
  await screen.findByText("Chưa đủ lịch sử để dự báo.");
  getVisitAnalytics.mockResolvedValue({ ...report, dataKind: "synthetic", demoCount: 18 });
  fireEvent.change(screen.getByLabelText("Nguồn dữ liệu phân tích"), { target: { value: "true" } });
  fireEvent.click(screen.getByRole("button", { name: "Phân tích dữ liệu" }));
  await screen.findByText(/ĐANG XEM DỮ LIỆU MÔ PHỎNG/);
  expect(getVisitAnalytics.mock.calls.at(-1)[0].demo).toBe(true);
});

test("exports use the analyzed filters rather than unsaved date edits", async () => {
  render(<VisitAnalytics canExport />);
  await screen.findByText("Chưa đủ lịch sử để dự báo.");
  const analyzedFilters = getVisitAnalytics.mock.calls[0][0];
  fireEvent.change(screen.getByLabelText("Phân tích từ ngày"), { target: { value: "2020-01-01" } });
  fireEvent.click(screen.getByRole("button", { name: "Xuất JSON" }));
  await waitFor(() => expect(exportVisitAnalytics).toHaveBeenCalledWith({ ...analyzedFilters, format: "json" }));
  await waitFor(() => expect(URL.revokeObjectURL).toHaveBeenCalled());
});

test("read-only viewers cannot export", async () => {
  render(<VisitAnalytics canExport={false} />);
  await screen.findByText("Chưa đủ lịch sử để dự báo.");
  expect(screen.getByRole("button", { name: "Xuất CSV" }).disabled).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: "Xuất CSV" }));
  expect(exportVisitAnalytics).not.toHaveBeenCalled();
});

test("API failures are shown without retaining an obsolete report", async () => {
  render(<VisitAnalytics canExport />);
  await screen.findByText("Chưa đủ lịch sử để dự báo.");
  getVisitAnalytics.mockRejectedValue(new Error("Không kết nối được báo cáo."));
  fireEvent.click(screen.getByRole("button", { name: "Phân tích dữ liệu" }));
  await screen.findByRole("alert");
  expect(screen.getByRole("alert").textContent).toContain("Không kết nối được báo cáo.");
  expect(screen.queryByText("Chưa đủ lịch sử để dự báo.")).toBeNull();
});

test("shows holdout errors, zero-aware MAPE, baseline and future predictions", async () => {
  const metrics = { mae: 2, rmse: 3, mape: null, mapeCount: 0, zeroActualCount: 1 };
  getVisitAnalytics.mockResolvedValue({ ...report, forecast: {
    available: true, message: "Đánh giá trên tập kiểm tra.", seasonLength: 12, trainCount: 24, testCount: 1,
    trainFrom: "2022-01", trainTo: "2023-12", testFrom: "2024-01", testTo: "2024-01",
    parameters: { alpha: 0.3, beta: 0.1, gamma: 0.1 }, metrics, baselineMetrics: { ...metrics, rmse: 1 },
    validation: [{ month: "2024-01", actual: 0, predicted: 3 }], future: [{ month: "2024-02", predicted: 20 }],
  } });
  render(<VisitAnalytics canExport />);
  await screen.findByText("Các tháng tiếp theo");
  expect(screen.getByText(/MAPE dùng 0\/1/).textContent).toContain("vẫn tính MAE và RMSE");
  expect(screen.getByText(/Holt-Winters có RMSE cao hơn/)).not.toBeNull();
  expect(screen.getByText("Mốc so sánh: cùng tháng năm trước")).not.toBeNull();
});
