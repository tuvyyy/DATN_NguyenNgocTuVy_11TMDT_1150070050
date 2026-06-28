import axios from "axios";
import { deepNormalizeVietnamese, normalizeVietnameseText } from "../utils/textCodec";

const API_BASES = [
  "https://localhost:7007",
  "http://localhost:5006",
];

const getTokenFromUserInfo = () => {
  const read = (storage) => {
    try {
      const raw = storage.getItem("userInfo");
      if (!raw) return "";
      const user = JSON.parse(raw);
      return (
        user?.accessToken ||
        user?.token ||
        user?.jwt ||
        user?.access_token ||
        ""
      );
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

const withAuth = (headers = {}) => {
  const token = getToken();
  return token ? { ...headers, Authorization: `Bearer ${token}` } : headers;
};

const sanitizeServerMessage = (payload, fallback) => {
  const raw =
    typeof payload === "string"
      ? payload
      : typeof payload?.message === "string"
      ? payload.message
      : "";

  const msg = normalizeVietnameseText(raw)?.trim();
  if (!msg) return fallback;

  const lowered = msg.toLowerCase();
  const looksLikeStackTrace =
    lowered.includes("microsoft.data.sqlclient.sqlexception") ||
    lowered.includes("system.") ||
    lowered.includes("stack trace") ||
    lowered.includes(" at ") ||
    lowered.includes("line ") ||
    lowered.includes("invalid column name");

  return looksLikeStackTrace ? fallback : msg;
};

const notifySessionExpired = (payload) => {
  if (typeof window === "undefined") return;
  const message = sanitizeServerMessage(
    payload,
    "Phiên làm việc của bạn đã hết hạn. Vui lòng đăng nhập lại để tiếp tục."
  );
  window.dispatchEvent(new CustomEvent("tiuv:session-expired", { detail: { message } }));
};

const requestWithFallback = async (
  method,
  path,
  { params, data, headers, timeout = 15000, responseType } = {}
) => {
  let lastError;
  const authHeaders = withAuth(headers);

  if (!authHeaders.Authorization) {
    notifySessionExpired(null);
    return {
      status: 401,
      data: {
        message: "Phiên đăng nhập không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.",
      },
      headers: {},
    };
  }

  for (const base of API_BASES) {
    try {
      const response = await axios({
        method,
        url: `${base}${path}`,
        params,
        data,
        timeout,
        responseType,
        headers: authHeaders,
        validateStatus: () => true,
      });

      if (response?.data !== undefined) {
        response.data = deepNormalizeVietnamese(response.data);
      }

      if (response.status === 401) {
        notifySessionExpired(response.data);
      }

      return response;
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError;
};

const normalizePaged = (payload) => {
  if (Array.isArray(payload)) {
    return {
      items: payload,
      total: payload.length,
      page: 1,
      pageSize: payload.length || 20,
      totalPages: 1,
    };
  }

  const items = Array.isArray(payload?.items) ? payload.items : [];
  const pageSize = Number(payload?.pageSize) || 20;
  const total = Number.isFinite(Number(payload?.total))
    ? Number(payload.total)
    : items.length;

  return {
    items,
    total,
    page: Number(payload?.page) || 1,
    pageSize,
    totalPages: Number(payload?.totalPages) || Math.max(1, Math.ceil(total / pageSize)),
  };
};

// -------------------------------
// Tiep don v2
// -------------------------------
const TIEP_DON_V2_BASE = "/api/tiepdon/v2";

export const lookupPatientV2 = async (params = {}) => {
  try {
    const res = await requestWithFallback("get", `${TIEP_DON_V2_BASE}/patients/lookup`, { params });
    return res;
  } catch (err) {
    console.error("[TiepDonApi.lookupPatientV2]", err);
    return null;
  }
};

export const upsertPatientV2 = async (payload) => {
  try {
    const res = await requestWithFallback("post", `${TIEP_DON_V2_BASE}/patients/upsert`, {
      data: payload,
      headers: { "Content-Type": "application/json" },
    });
    return res;
  } catch (err) {
    console.error("[TiepDonApi.upsertPatientV2]", err);
    return null;
  }
};

export const saveEncounterV2 = async (payload) => {
  try {
    const res = await requestWithFallback("post", `${TIEP_DON_V2_BASE}/encounters/save`, {
      data: payload,
      headers: { "Content-Type": "application/json" },
    });
    return res;
  } catch (err) {
    console.error("[TiepDonApi.saveEncounterV2]", err);
    return null;
  }
};

export const getEncounterListV2 = async (query = {}) => {
  try {
    const res = await requestWithFallback("get", `${TIEP_DON_V2_BASE}/encounters`, { params: query });
    if (res.status >= 400) {
      return {
        ...normalizePaged(null),
        status: res.status,
        error:
          res.status === 401
            ? ""
            : sanitizeServerMessage(res.data, "Không tải được danh sách tiếp đón."),
      };
    }

    return {
      ...normalizePaged(res.data),
      status: res.status,
      error: "",
    };
  } catch (err) {
    console.error("[TiepDonApi.getEncounterListV2]", err);
    return {
      ...normalizePaged(null),
      status: 0,
      error: "Không kết nối được API tiếp đón.",
    };
  }
};

export const getEncounterStatsV2 = async (query = {}) => {
  try {
    const res = await requestWithFallback("get", `${TIEP_DON_V2_BASE}/stats`, { params: query });
    if (res.status >= 400) return null;
    return res.data || null;
  } catch (err) {
    console.error("[TiepDonApi.getEncounterStatsV2]", err);
    return null;
  }
};

export const cancelEncounterV2 = async (encounterId, payload) => {
  try {
    const res = await requestWithFallback("patch", `${TIEP_DON_V2_BASE}/encounters/${encounterId}/cancel`, {
      data: payload,
      headers: { "Content-Type": "application/json" },
    });
    return res;
  } catch (err) {
    console.error("[TiepDonApi.cancelEncounterV2]", err);
    return null;
  }
};

export const requestAreaTransferV2 = async (encounterId, payload) => {
  try {
    return await requestWithFallback("patch", `${TIEP_DON_V2_BASE}/encounters/${encounterId}/transfer/request`, {
      data: payload,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[TiepDonApi.requestAreaTransferV2]", err);
    return null;
  }
};

export const acceptAreaTransferV2 = async (encounterId, payload = {}) => {
  try {
    return await requestWithFallback("patch", `${TIEP_DON_V2_BASE}/encounters/${encounterId}/transfer/accept`, {
      data: payload,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[TiepDonApi.acceptAreaTransferV2]", err);
    return null;
  }
};

export const cancelAreaTransferV2 = async (encounterId, payload) => {
  try {
    return await requestWithFallback("patch", `${TIEP_DON_V2_BASE}/encounters/${encounterId}/transfer/cancel`, {
      data: payload,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[TiepDonApi.cancelAreaTransferV2]", err);
    return null;
  }
};

export const getEncounterTimelineV2 = async (encounterId, limit = 120) => {
  try {
    const res = await requestWithFallback("get", `${TIEP_DON_V2_BASE}/encounters/${encounterId}/timeline`, {
      params: { limit },
    });

    if (res.status >= 400) {
      return {
        ok: false,
        status: res.status,
        data: [],
        message: sanitizeServerMessage(res.data, "Không tải được timeline hồ sơ."),
      };
    }

    return {
      ok: true,
      status: res.status,
      data: Array.isArray(res.data) ? res.data : [],
      message: "",
    };
  } catch (err) {
    console.error("[TiepDonApi.getEncounterTimelineV2]", err);
    return {
      ok: false,
      status: 0,
      data: [],
      message: "Không kết nối được API timeline.",
    };
  }
};

export const getExamTicketV2 = async (encounterId) => {
  try {
    const res = await requestWithFallback("get", `${TIEP_DON_V2_BASE}/encounters/${encounterId}/exam-ticket`);
    return res;
  } catch (err) {
    console.error("[TiepDonApi.getExamTicketV2]", err);
    return null;
  }
};

export const getReceptionDictionariesV2 = async () => {
  try {
    const res = await requestWithFallback("get", `${TIEP_DON_V2_BASE}/dictionaries`);
    if (res.status >= 400) return null;
    return res.data || null;
  } catch (err) {
    console.error("[TiepDonApi.getReceptionDictionariesV2]", err);
    return null;
  }
};

export const getReceptionAreasV2 = async () => {
  try {
    const res = await requestWithFallback("get", `${TIEP_DON_V2_BASE}/areas`);
    if (res.status >= 400) return null;
    return res.data || null;
  } catch (err) {
    console.error("[TiepDonApi.getReceptionAreasV2]", err);
    return null;
  }
};

export const searchWardLocationsV2 = async (q, limit = 12) => {
  try {
    const keyword = (q || "").toString().trim();
    if (!keyword) return { ok: true, status: 200, data: [] };

    const res = await requestWithFallback("get", `${TIEP_DON_V2_BASE}/locations/wards`, {
      params: { q: keyword, limit },
    });

    if (res.status >= 400) {
      return {
        ok: false,
        status: res.status,
        data: [],
        message: sanitizeServerMessage(res.data, "Không tải được danh sách xã/phường."),
      };
    }

    return {
      ok: true,
      status: res.status,
      data: Array.isArray(res.data) ? res.data : [],
      message: "",
    };
  } catch (err) {
    console.error("[TiepDonApi.searchWardLocationsV2]", err);
    return {
      ok: false,
      status: 0,
      data: [],
      message: "Không kết nối được API xã/phường.",
    };
  }
};

export const exportEncounterV2 = async (query = {}) => {
  try {
    return await requestWithFallback("get", `${TIEP_DON_V2_BASE}/export`, {
      params: query,
      responseType: "blob",
      timeout: 45000,
      headers: { Accept: "text/csv" },
    });
  } catch (err) {
    console.error("[TiepDonApi.exportEncounterV2]", err);
    return null;
  }
};

// -------------------------------
// Service registration v2
// -------------------------------

export const getEncounterSummaryV2 = async (encounterId) => {
  try {
    const res = await requestWithFallback("get", `/api/chidinh/v2/encounters/${encounterId}`);
    return res;
  } catch (err) {
    console.error("[TiepDonApi.getEncounterSummaryV2]", err);
    return null;
  }
};

export const getServiceCatalogV2 = async (query = {}) => {
  try {
    const res = await requestWithFallback("get", "/api/chidinh/v2/services", { params: query });
    return res;
  } catch (err) {
    console.error("[TiepDonApi.getServiceCatalogV2]", err);
    return null;
  }
};

export const saveServiceOrderDraftV2 = async (payload) => {
  try {
    const res = await requestWithFallback("post", "/api/chidinh/v2/service-orders/draft", {
      data: payload,
      headers: { "Content-Type": "application/json" },
    });
    return res;
  } catch (err) {
    console.error("[TiepDonApi.saveServiceOrderDraftV2]", err);
    return null;
  }
};

export const confirmServiceOrderV2 = async (payload) => {
  try {
    const res = await requestWithFallback("post", "/api/chidinh/v2/service-orders/confirm", {
      data: payload,
      headers: { "Content-Type": "application/json" },
    });
    return res;
  } catch (err) {
    console.error("[TiepDonApi.confirmServiceOrderV2]", err);
    return null;
  }
};

export const changeQueueRoomV2 = async (encounterId, visitId, payload) => {
  try {
    return await requestWithFallback("patch", `/api/chidinh/v2/encounters/${encounterId}/visits/${visitId}/room`, {
      data: payload,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[TiepDonApi.changeQueueRoomV2]", err);
    return null;
  }
};

// ------------------------------------------
// Backward-compat wrappers (legacy imports)
// ------------------------------------------

export const getReceptionList = (query = {}) => getEncounterListV2({ ...query, tab: "today" });
export const getCancelledList = (query = {}) => getEncounterListV2({ ...query, tab: "cancelled" });
export const getStats = () => getEncounterStatsV2();
export const getReceptionStatusLogs = (id, limit = 80) => getEncounterTimelineV2(id, limit);
export const exportReception = (query = {}) => exportEncounterV2(query);

export const createPatient = (payload) => upsertPatientV2(payload);
export const createRecord = (payload) => saveEncounterV2(payload);

export const checkPatient = (cccd, soDienThoai) =>
  lookupPatientV2({ CCCD: cccd || undefined, SoDienThoai: soDienThoai || undefined })
    .then((res) => {
      if (!res || res.status >= 400) return null;
      return res.data;
    });

export const cancelReception = (id) =>
  cancelEncounterV2(id, {
    lyDoHuy: "Hủy từ luồng cũ",
    ghiChu: "Yêu cầu hủy từ endpoint legacy",
  });

export const getSinhHieuByLanKham = async () => null;
export const saveSinhHieu = async () => null;
