// ============================================
// src/api/BacSiApi.js
// ============================================

import axios from "axios";

/** ============================================
 *  Axios instance + helpers
 *  ============================================ */
const BASE_URL = "https://localhost:7007";

// Lấy token
const getToken = () =>
  localStorage.getItem("access_token") ||
  localStorage.getItem("token") ||
  localStorage.getItem("jwt");



export const http = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  withCredentials: false,
  validateStatus: () => true,
});

// Gắn Authorization nếu có
http.interceptors.request.use((config) => {
  const token = getToken();

  if (token) config.headers.Authorization = `Bearer ${token}`;

  return config;
});

// Chuẩn hóa response
const wrap = (res) => {
  const isOk = res?.status >= 200 && res?.status < 300;

  // Trường hợp BE trả về plain text
  if (typeof res?.data === "string") {
    return {
      ok: isOk,
      status: res.status,
      data: null,
      message: res.data,   // <-- Lấy nội dung text BE trả về
    };
  }

  // Trường hợp BE trả JSON
  return {
    ok: isOk,
    status: res?.status ?? 0,
    data: res?.data?.data ?? res?.data ?? null,
    message:
      res?.data?.message ||
      res?.data?.error ||
      (isOk ? "Success" : `Error ${res?.status || ""}`.trim()),
  };
};

export async function chiDinhDVKTRaw(dto, config = {}) {
  return http.post("/api/bacsi/dvkt/chidinh", dto, config);
}

// CHỈ ĐỊNH DVKT – LUÔN GỬI TOKEN
export async function chiDinhDVKT(dto) {
  const res = await http.post("/api/bacsi/dvkt/chidinh", dto);
  return wrap(res);
}

export function getLanKhamDetail(id) {
  return http.get(`/api/LanKham/lan-kham/${id}/detail`);
}

export async function startLanKham(idLanKham, idBacSi) {
  const res = await http.patch(`/api/LanKham/${idLanKham}/start`, null, {
    params: { idBacSi },
  });
  return wrap(res);
}

// 1) DANH SÁCH BỆNH NHÂN CHỜ KHÁM
export async function getChoKham({ idBacSi, idPhong }) {
  const res = await http.get("/api/LanKham/cho-kham", {
    params: { idBacSi, idPhong },
  });
  return wrap(res);
}

// 2) DANH SÁCH LƯỢT KHÁM HÔM NAY
export async function getHomNay({ idBacSi, idPhong }) {
  const res = await http.get("/api/LanKham/hom-nay", {
    params: { idBacSi, idPhong },
  });
  return wrap(res);
}

// 2.1) DANH SÁCH LƯỢT ĐÃ KHÁM
export async function getDaKham({ idBacSi, idPhong }) {
  const res = await http.get("/api/LanKham/da-kham", {
    params: { idBacSi, idPhong },
  });
  return wrap(res);
}

// 3) CẬP NHẬT KẾT QUẢ KHÁM
export async function updateKetQuaKham(idLanKham, dto) {
  const res = await http.put(`/api/LanKham/${idLanKham}`, dto);
  return wrap(res);
}

export async function searchBenh(q = "") {
  const res = await http.get("/api/LanKham/benh/search", {
    params: { q },
  });
  return wrap(res);
}

export async function exportGiayHenKhamLaiPDF(idLanKham, dto) {
  let res;
  try {
    res = await http.post(`/api/LanKham/${idLanKham}/giay-hen-kham-lai/pdf`, dto, {
      responseType: "blob",
      timeout: 30000,
    });
  } catch (err) {
    let message = err?.response?.data?.message || err?.message || "Không thể lưu PDF giấy hẹn khám lại.";
    const blob = err?.response?.data;
    if (blob?.text) {
      try {
        const text = await blob.text();
        const json = JSON.parse(text);
        message = json.message || json.error || message;
      } catch {
        // Blob lỗi không phải JSON thì giữ thông báo mặc định.
      }
    }
    throw new Error(message);
  }

  if (res.status < 200 || res.status >= 300) {
    let message = `Không thể lưu PDF giấy hẹn khám lại (${res.status}).`;
    try {
      const text = await res.data.text();
      const json = JSON.parse(text);
      message = json.message || json.error || message;
    } catch {
      // Blob lỗi không phải JSON thì giữ thông báo mặc định.
    }
    throw new Error(message);
  }

  return res.data;
}

export async function exportGiayKetLuanKhamPDF(idLanKham, dto) {
  let res;
  try {
    res = await http.post(`/api/LanKham/${idLanKham}/giay-ket-luan/pdf`, dto, {
      responseType: "blob",
      timeout: 30000,
    });
  } catch (err) {
    let message = err?.response?.data?.message || err?.message || "Không thể in giấy kết luận khám.";
    const blob = err?.response?.data;
    if (blob?.text) {
      try {
        const text = await blob.text();
        const json = JSON.parse(text);
        message = json.message || json.error || message;
      } catch {
        // Keep fallback.
      }
    }
    throw new Error(message);
  }

  if (res.status < 200 || res.status >= 300) {
    let message = `Không thể in giấy kết luận khám (${res.status}).`;
    try {
      const text = await res.data.text();
      const json = JSON.parse(text);
      message = json.message || json.error || message;
    } catch {
      // Keep fallback.
    }
    throw new Error(message);
  }

  return res.data;
}

export async function exportPhieuChiDinhXetNghiemPDF(idLanKham, chiDinhIds = []) {
  const query = Array.isArray(chiDinhIds) && chiDinhIds.length
    ? `?${chiDinhIds.map((id) => `chiDinhIds=${encodeURIComponent(id)}`).join("&")}`
    : "";

  const res = await http.get(`/api/LanKham/${idLanKham}/phieu-chi-dinh-xet-nghiem/pdf${query}`, {
    responseType: "blob",
    timeout: 30000,
  });

  if (res.status < 200 || res.status >= 300) {
    let message = `Không thể in phiếu chỉ định (${res.status}).`;
    try {
      const text = await res.data.text();
      const json = JSON.parse(text);
      message = json.message || json.error || message;
    } catch {
      // Giữ thông báo mặc định nếu body lỗi không phải JSON.
    }
    throw new Error(message);
  }

  return res.data;
}

export async function exportTomTatKhamPDF(idLanKham) {
  const res = await http.get(`/api/LanKham/${idLanKham}/tom-tat-kham/pdf`, {
    responseType: "blob",
    timeout: 30000,
  });

  if (res.status < 200 || res.status >= 300) {
    let message = `Không thể in phiếu tóm tắt khám (${res.status}).`;
    try {
      const text = await res.data.text();
      const json = JSON.parse(text);
      message = json.message || json.error || message;
    } catch {
      // Keep fallback.
    }
    throw new Error(message);
  }

  return res.data;
}

// DANH SÁCH DVKT
export async function getAllDVKT() {
  const res = await http.get("/api/bacsi/dvkt/full");
  return wrap(res);
}

// Lấy DVKT theo lần khám
export async function getDVKTByLanKham(idLanKham) {
  const res = await http.get(`/api/bacsi/dvkt/lankham/${idLanKham}`);
  return wrap(res);
}

export async function getTongHopDVKTByLanKham(idLanKham) {
  const res = await http.get(`/api/bacsi/dvkt/lankham/${idLanKham}/tonghop`);
  return wrap(res);
}

export async function markDVKTResultRead(idChiDinh) {
  const res = await http.patch(`/api/bacsi/dvkt/${idChiDinh}/doctor-read`);
  return wrap(res);
}

// Cập nhật DVKT
export async function updateDVKT(id, dto) {
  const res = await http.put(`/api/bacsi/dvkt/${id}`, dto);
  return wrap(res);
}

// Hủy DVKT
export async function cancelDVKT(id) {
  const res = await http.delete(`/api/bacsi/dvkt/${id}`);
  return wrap(res);
}

// 6) HỦY LƯỢT KHÁM
export async function cancelLanKham(idLanKham, reason) {
  const res = await http.patch(
    `/api/LanKham/${idLanKham}/cancel`,
    JSON.stringify(reason ?? ""),
    { headers: { "Content-Type": "application/json" } }
  );
  return wrap(res);
}

// 7) LỊCH SỬ KHÁM
export async function getLichSuKham(idBenhNhan) {
  const res = await http.get(`/api/benhNhan/${idBenhNhan}/lichSuKham`);
  return wrap(res);
}

// Helper
export function ensureOk(resp, fallbackMsg = "Có lỗi xảy ra") {
  if (!resp?.ok) throw new Error(resp?.message || fallbackMsg);
  return resp.data;
}

// Lấy phòng theo bác sĩ
export async function getPhongByBacSi(idBacSi) {
  const res = await http.get(`/api/bacsi/${idBacSi}/phong`);
  return wrap(res);
}

export async function getPhongCuaNguoiDung(idNguoiDung) {
  const res = await http.get("/api/LanKham/phong-cua-bac-si", {
    params: { idBacSi: idNguoiDung },
  });
  return wrap(res);
}


export async function apiReopenHoSo(idLanKham, lyDo) {
  return http.patch(`/api/LanKham/${idLanKham}/reopen`, { LyDo: lyDo });
}



// ============================================
// DEFAULT EXPORT
// ============================================
const BacSiApi = {
  getChoKham,
  getHomNay,
  getDaKham,
  updateKetQuaKham,
  searchBenh,
  exportGiayHenKhamLaiPDF,
  exportGiayKetLuanKhamPDF,
  exportPhieuChiDinhXetNghiemPDF,
  exportTomTatKhamPDF,
  cancelLanKham,
  getLichSuKham,
  getPhongByBacSi,
  getPhongCuaNguoiDung,
  startLanKham,

  chiDinhDVKT,
  chiDinhDVKTRaw, // ← Dâu nghĩ là có

  getAllDVKT,
  getDVKTByLanKham,
  getTongHopDVKTByLanKham,
  markDVKTResultRead,
  updateDVKT,
  cancelDVKT,
  apiReopenHoSo,
  ensureOk,
};

export default BacSiApi;
