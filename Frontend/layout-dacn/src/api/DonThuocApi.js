// src/api/DonThuocApi.js
import axios from "axios";
import { http } from "./BacSiApi";

const api = axios.create({
  baseURL: "https://localhost:7007/api/DonThuoc",
  headers: { "Content-Type": "application/json" },
});

const getToken = () =>
  localStorage.getItem("access_token") ||
  localStorage.getItem("token") ||
  localStorage.getItem("jwt") ||
  sessionStorage.getItem("access_token");

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// =============================
//  API KÊ ĐƠN THUỐC
// =============================

// Lấy danh sách thuốc (từ endpoint ThuocController bên bạn)
export const apiGetThuocList = () =>
  http.get("/api/Thuoc");

// Kiểm tra đơn thuốc
export const apiCheckDonThuoc = (payload) =>
  api.post(`/check`, payload);

// Tạo đơn thuốc
export const apiCreateDonThuoc = (payload) =>
  api.post(`/`, payload);

// Cập nhật đơn thuốc
export const apiUpdateDonThuoc = (id, payload) =>
  api.put(`/${id}`, payload);

// Xóa đơn thuốc
export const apiDeleteDonThuoc = (id) =>
  api.delete(`/${id}`);

// Lấy đơn theo lần khám
export const apiGetDonTheoLanKham = (idLanKham) =>
  api.get(`/lan-kham/${idLanKham}`);

export const apiGetTongHopDonThuoc = (idLanKham) =>
  http.get(`/api/DonThuoc/tong-hop/lan-kham/${idLanKham}`);

// Gợi ý thuốc thay thế
export const apiGoiYThuoc = (idThuoc) =>
  api.get(`/goi-y/${idThuoc}`);

// Xóa 1 thuốc trong đơn
export function deleteThuocInDon(idChiTiet) {
  return api.delete(`/chi-tiet/${idChiTiet}`);
}

// Sửa 1 thuốc trong đơn
export function updateThuocInDon(idChiTiet, dto) {
  return api.put(`/chi-tiet/${idChiTiet}`, dto);
}

// Tải PDF đơn thuốc
export function apiDownloadDonThuocPDF(idDon) {
  return http.get(`/api/pdf/donthuoc/${idDon}`, {
    responseType: "blob",
  });
}

export function apiDownloadDonThuocTongHopPDF(idLanKham) {
  return http.get(`/api/pdf/donthuoc/tong-hop/${idLanKham}`, {
    responseType: "blob",
  });
}


export default {
  apiGetThuocList,
  apiCheckDonThuoc,
  apiCreateDonThuoc,
  apiUpdateDonThuoc,
  apiDeleteDonThuoc,
  apiGetDonTheoLanKham,
  apiGetTongHopDonThuoc,
  apiGoiYThuoc,
  deleteThuocInDon,
  updateThuocInDon,
  apiDownloadDonThuocPDF,
  apiDownloadDonThuocTongHopPDF,
};
