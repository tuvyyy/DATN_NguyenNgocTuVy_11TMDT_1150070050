import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import AdminLayout from "../../layouts/AdminLayout";
import BaoCao from "../BaoCao";
import AdminReportsPage from "./AdminReportsPage";
import { usePermission } from "../../hooks/UsePermission";
import { getReportOptions, getReportSummary } from "../../api/BaoCaoApi";

let mockLocation = { pathname: "/admin/bao-cao", search: "" };

jest.mock("react-router-dom", () => {
  const React = require("react");
  return {
    useLocation: () => mockLocation,
    useNavigate: () => jest.fn(),
    Link: ({ to, children, ...props }) => React.createElement("a", { ...props, href: to }, children),
    Navigate: ({ to }) => React.createElement("div", { "data-testid": "redirect", "data-destination": to.pathname + to.search }),
    Outlet: () => React.createElement(require("./AdminReportsPage").default),
  };
}, { virtual: true });
jest.mock("framer-motion", () => ({ AnimatePresence: ({ children }) => children }));
jest.mock("lucide-react", () => new Proxy({}, { get: (_, key) => key === "__esModule" ? true : () => null }), { virtual: true });
jest.mock("../../components/PageTransition", () => ({ children }) => children);
jest.mock("../../components/AdminFooter", () => () => null);
jest.mock("../../layouts/MainLayout", () => {
  const React = require("react");
  return ({ children }) => React.createElement("div", { "data-testid": "staff-layout" }, children);
});
jest.mock("../reports/VisitAnalytics", () => () => "analytics-content");
jest.mock("../../hooks/UsePermission", () => ({ usePermission: jest.fn() }));
jest.mock("../../api/BaoCaoApi", () => ({ getReportOptions: jest.fn(), getReportSummary: jest.fn(), exportReportCsv: jest.fn() }));

beforeEach(() => {
  jest.clearAllMocks();
  mockLocation = { pathname: "/admin/bao-cao", search: "" };
  usePermission.mockReturnValue({ canView: true, canExport: true, loading: false });
  getReportOptions.mockResolvedValue({
    reports: [{ type: "reception", label: "Tiếp đón" }, { type: "visit-analytics", label: "Phân tích" }],
    defaultFrom: "2024-01-01", defaultTo: "2024-12-31",
  });
  getReportSummary.mockResolvedValue({ total: 3 });
});

test("admin report keeps the admin menu and opens analytics without a staff layout", async () => {
  render(<AdminLayout />);
  expect(screen.queryByTestId("staff-layout")).toBeNull();
  expect(screen.getByText("tiuv admin")).not.toBeNull();
  expect(screen.getByRole("link", { name: "Báo cáo" }).getAttribute("href")).toBe("/admin/bao-cao");
  await screen.findByText("analytics-content");
  expect(screen.getByRole("heading", { name: "Báo cáo hoạt động" })).not.toBeNull();
  expect(screen.getByRole("combobox").value).toBe("visit-analytics");
  expect(screen.queryByTestId("staff-layout")).toBeNull();
  expect(getReportSummary).not.toHaveBeenCalled();
});

test("admin opening an old staff report link is redirected while preserving the requested report", () => {
  mockLocation = { pathname: "/bao-cao", search: "?type=admin-summary" };
  render(<BaoCao isAdmin />);
  expect(screen.getByTestId("redirect").getAttribute("data-destination")).toBe("/admin/bao-cao?type=admin-summary");
  expect(screen.queryByTestId("staff-layout")).toBeNull();
  expect(getReportOptions).not.toHaveBeenCalled();
});

test("staff reports keep their layout and cannot select an unavailable admin report from the URL", async () => {
  mockLocation = { pathname: "/bao-cao", search: "?type=visit-analytics" };
  getReportOptions.mockResolvedValue({
    reports: [{ type: "reception", label: "Tiếp đón" }], defaultFrom: "2024-01-01", defaultTo: "2024-12-31",
  });
  render(<BaoCao />);
  await screen.findByRole("heading", { name: "Báo cáo & Thống kê nghiệp vụ" });
  expect(screen.getByTestId("staff-layout")).not.toBeNull();
  expect(screen.getByRole("combobox").value).toBe("reception");
  expect(screen.queryByText("analytics-content")).toBeNull();
  await waitFor(() => expect(getReportSummary).toHaveBeenCalledWith({ type: "reception", fromDate: "2024-01-01", toDate: "2024-12-31" }));
});

test("permission denial inside the admin report does not mount a staff layout or request report data", async () => {
  usePermission.mockReturnValue({ canView: false, canExport: false, loading: false });
  render(<AdminReportsPage />);
  await screen.findByRole("heading", { name: "Không có quyền truy cập" });
  expect(screen.queryByTestId("staff-layout")).toBeNull();
  expect(getReportOptions).not.toHaveBeenCalled();
});
