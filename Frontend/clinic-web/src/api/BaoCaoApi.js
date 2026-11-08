import axios from "axios";
import { deepNormalizeVietnamese } from "../utils/textCodec";

const API_BASES = ["https://localhost:7007", "http://localhost:5006"];

const getTokenFromUserInfo = () => {
  const read = (storage) => {
    try {
      const raw = storage.getItem("userInfo");
      if (!raw) return "";
      const user = JSON.parse(raw);
      return user?.accessToken || user?.token || user?.jwt || user?.access_token || "";
    } catch {
      return "";
    }
  };

  return read(localStorage) || read(sessionStorage);
};

const getToken = () =>
  localStorage.getItem("access_token") ||
  localStorage.getItem("token") ||
  localStorage.getItem("jwt") ||
  sessionStorage.getItem("access_token") ||
  sessionStorage.getItem("token") ||
  getTokenFromUserInfo();

const requestWithFallback = async (path, { params, responseType, signal } = {}) => {
  const token = getToken();
  if (!token) {
    return {
      status: 401,
      data: { message: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại." },
      headers: {},
    };
  }

  let lastError;
  for (const base of API_BASES) {
    try {
      const response = await axios.get(`${base}${path}`, {
        params,
        responseType,
        signal,
        headers: { Authorization: `Bearer ${token}` },
        timeout: responseType === "blob" ? 30000 : 15000,
        validateStatus: () => true,
      });

      if (responseType !== "blob" && response?.data !== undefined) {
        response.data = deepNormalizeVietnamese(response.data);
      }

      if ([404, 502, 503, 504].includes(response.status)) {
        lastError = new Error(`Bao cao API unavailable at ${base}`);
        continue;
      }

      return response;
    } catch (err) {
      if (signal?.aborted || axios.isCancel(err)) throw err;
      if (err.code === "ECONNABORTED" || err.code === "ETIMEDOUT") {
        throw new Error("Tải báo cáo quá lâu. Bạn hãy thử lại.");
      }
      lastError = err;
    }
  }

  throw new Error("Không kết nối được máy chủ báo cáo. Bạn hãy thử lại.", { cause: lastError });
};

export const getReportOptions = async () => {
  const response = await requestWithFallback("/api/bao-cao/options");
  if (response.status >= 400) {
    throw new Error(response.data?.message || "Khong tai duoc danh sach bao cao.");
  }
  return response.data;
};

export const getReportSummary = async ({ type, fromDate, toDate }) => {
  const response = await requestWithFallback("/api/bao-cao/summary", {
    params: { type, fromDate, toDate },
  });
  if (response.status >= 400) {
    throw new Error(response.data?.message || "Khong tai duoc thong ke bao cao.");
  }
  return response.data;
};

export const exportReportCsv = async ({ type, fromDate, toDate }) => {
  const response = await requestWithFallback("/api/bao-cao/export", {
    params: { type, fromDate, toDate },
    responseType: "blob",
  });
  if (response.status >= 400) {
    throw new Error("Khong xuat duoc bao cao.");
  }
  return response;
};

export const getVisitAnalytics = async (params, { signal } = {}) => {
  const response = await requestWithFallback("/api/bao-cao/visits", { params, signal });
  if (response.status >= 400) throw new Error(response.data?.message || "Không tải được phân tích lượt khám.");
  return response.data;
};

export const exportVisitAnalytics = async (params) => {
  const response = await requestWithFallback("/api/bao-cao/visits/export", { params, responseType: "blob" });
  if (response.status >= 400) throw new Error("Không xuất được kết quả phân tích lượt khám.");
  return response;
};
