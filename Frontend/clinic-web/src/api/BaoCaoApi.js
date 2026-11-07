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

const requestWithFallback = async (path, { params, responseType } = {}) => {
  const token = getToken();
  if (!token) {
    return {
      status: 401,
      data: { message: "Phien dang nhap da het han. Vui long dang nhap lai." },
      headers: {},
    };
  }

  let lastError;
  for (const base of API_BASES) {
    try {
      const response = await axios.get(`${base}${path}`, {
        params,
        responseType,
        headers: { Authorization: `Bearer ${token}` },
        timeout: 30000,
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
      lastError = err;
    }
  }

  throw lastError;
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

export const getVisitAnalytics = async (params) => {
  const response = await requestWithFallback("/api/bao-cao/visits", { params });
  if (response.status >= 400) throw new Error(response.data?.message || "Không tải được phân tích lượt khám.");
  return response.data;
};

export const exportVisitAnalytics = async (params) => {
  const response = await requestWithFallback("/api/bao-cao/visits/export", { params, responseType: "blob" });
  if (response.status >= 400) throw new Error("Không xuất được kết quả phân tích lượt khám.");
  return response;
};
