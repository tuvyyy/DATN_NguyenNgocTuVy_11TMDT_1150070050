import React from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import axios from "axios";
import DangKy from "./DangKy";
import AuthPage from "./AuthPage";

jest.mock("axios", () => jest.fn());
jest.mock("react-router-dom", () => ({ useNavigate: () => jest.fn(), useLocation: () => ({ pathname: "/register" }) }), { virtual: true });
jest.mock("react-toastify", () => ({ toast: { success: jest.fn(), error: jest.fn() } }), { virtual: true });
jest.mock("lucide-react", () => new Proxy({}, { get: (_, key) => key === "__esModule" ? true : () => null }), { virtual: true });

beforeEach(() => {
  jest.clearAllMocks();
  axios.mockResolvedValue({ data: { message: "Đã tạo tài khoản." } });
  jest.spyOn(console, "log").mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

function fill(form, confirmation = "Test-only-123!") {
  fireEvent.change(within(form).getByPlaceholderText("VD: NV001"), { target: { value: "pending_test" } });
  fireEvent.change(within(form).getByPlaceholderText(/^(Nhập )?mật khẩu$/i), { target: { value: "Test-only-123!" } });
  fireEvent.change(within(form).getByPlaceholderText("Nhập lại mật khẩu"), { target: { value: confirmation } });
}

test.each([["Trang đăng ký riêng", DangKy], ["Trang đăng nhập và đăng ký", AuthPage]])("%s không tự gán vai trò", async (_, Component) => {
  const { container } = render(<Component />);
  const forms = container.querySelectorAll("form");
  const form = forms[forms.length - 1];
  fill(form);
  fireEvent.submit(form);
  await waitFor(() => expect(axios).toHaveBeenCalledWith(expect.objectContaining({ method: "post", data: expect.objectContaining({ vaiTroIds: [] }) })));
  expect(await screen.findByText(/Tài khoản đã được tạo\. Liên hệ quản trị viên/)).not.toBeNull();
  expect(axios.mock.calls.some(([config]) => config.method === "get")).toBe(false);
});

test("Mật khẩu xác nhận không khớp không được gửi đăng ký", () => {
  const { container } = render(<DangKy />);
  const form = container.querySelector("form");
  fill(form, "different");
  fireEvent.submit(form);
  expect(axios).not.toHaveBeenCalled();
});
