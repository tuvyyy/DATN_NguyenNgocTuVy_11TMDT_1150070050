import axios from "axios";
import { getVisitAnalytics } from "./BaoCaoApi";

jest.mock("axios", () => ({ get: jest.fn(), isCancel: jest.fn() }));
jest.mock("../utils/textCodec", () => ({ deepNormalizeVietnamese: value => value }));

beforeEach(() => {
  jest.resetAllMocks();
  localStorage.clear();
  sessionStorage.clear();
  localStorage.setItem("access_token", "report-test-token");
});

test("a slow report fails once with a readable error instead of repeating the SQL request", async () => {
  axios.get.mockRejectedValue(Object.assign(new Error("timeout"), { code: "ECONNABORTED" }));
  await expect(getVisitAnalytics({ horizon: 1 })).rejects.toThrow("Tải báo cáo quá lâu");
  expect(axios.get).toHaveBeenCalledTimes(1);
  expect(axios.get.mock.calls[0][1].timeout).toBe(15000);
});

test("an aborted report is not retried on the second API address", async () => {
  const controller = new AbortController();
  const cancelled = Object.assign(new Error("cancelled"), { code: "ERR_CANCELED" });
  axios.get.mockImplementation(async () => { controller.abort(); throw cancelled; });
  await expect(getVisitAnalytics({ horizon: 3 }, { signal: controller.signal })).rejects.toBe(cancelled);
  expect(axios.get).toHaveBeenCalledTimes(1);
  expect(axios.get.mock.calls[0][1].signal).toBe(controller.signal);
});

test("a connection failure still falls back and forwards the same cancellation signal", async () => {
  const controller = new AbortController();
  axios.get.mockRejectedValueOnce(Object.assign(new Error("connection"), { code: "ERR_NETWORK" }))
    .mockResolvedValueOnce({ status: 200, data: { validCount: 12 } });
  await expect(getVisitAnalytics({ horizon: 6 }, { signal: controller.signal })).resolves.toEqual({ validCount: 12 });
  expect(axios.get).toHaveBeenCalledTimes(2);
  expect(axios.get.mock.calls[1][0]).toBe("http://localhost:5006/api/bao-cao/visits");
  expect(axios.get.mock.calls[1][1].signal).toBe(controller.signal);
});

test("an expired login does not send a report request", async () => {
  localStorage.clear();
  await expect(getVisitAnalytics({})).rejects.toThrow(/đăng nhập/);
  expect(axios.get).not.toHaveBeenCalled();
});
