import React from "react";
import { render, screen } from "@testing-library/react";
import AdminDashboard from "./AdminDashboard";

jest.mock("react-router-dom", () => ({ Link: ({ to, children, ...props }) => <a href={to} {...props}>{children}</a> }), { virtual: true });
jest.mock("lucide-react", () => new Proxy({}, { get: (_, key) => key === "__esModule" ? true : () => null }), { virtual: true });

test("overview separates reports, operations, personnel and catalogs with direct task links", () => {
  render(<AdminDashboard />);
  ["Tổng quan", "Nhân sự & quyền truy cập", "Danh mục phòng khám"].forEach(name => expect(screen.getByRole("heading", { name })).not.toBeNull());
  const paths = screen.getAllByRole("link").map(link => link.getAttribute("href"));
  expect(paths).toEqual(["/admin/bao-cao", "/admin/logs", "/admin/users", "/admin/roles", "/admin/danh-muc-dv", "/admin/danh-muc-thuoc", "/admin/danh-muc-dvkt"]);
});
