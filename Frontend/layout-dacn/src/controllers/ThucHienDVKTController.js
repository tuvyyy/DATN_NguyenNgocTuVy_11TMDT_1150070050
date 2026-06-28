import Swal from "sweetalert2";
import {
  approveKetQua, cancelApproveKetQua, exportPdfDVKT, fetchFullKetQua,
  getDoneDVKT, getLogsDVKT, getPendingDVKT, getProcessingDVKT,
  hoanThanhDVKT, huyNhanDVKT, nhanDVKT, saveKetQuaChiTiet,
  saveKetQuaTong, sendKetQua,
} from "../api/ThucHienDVKTApi";

const errorMessage = (error, fallback) => error?.response?.data?.message || error?.response?.data || error?.message || fallback;

export const handleExportPDF = async (id) => {
  try {
    const blob = await exportPdfDVKT(id);
    const url = window.URL.createObjectURL(blob);
    window.open(url, "_blank");
    window.setTimeout(() => window.URL.revokeObjectURL(url), 60000);
  } catch (error) {
    Swal.fire("Không thể xuất PDF", errorMessage(error, "Vui lòng thử lại."), "error");
  }
};

export const loadPending = async (setState) => {
  setState((current) => ({ ...current, loading: true }));
  const data = await getPendingDVKT();
  setState((current) => ({ ...current, pending: data, loading: false }));
};

export const loadProcessing = async (setState) => {
  setState((current) => ({ ...current, loading: true }));
  const data = await getProcessingDVKT();
  setState((current) => ({ ...current, processing: data, loading: false }));
};

export const loadDone = async (setState, from = "", to = "") => {
  setState((current) => ({ ...current, loading: true }));
  const data = (await getDoneDVKT(from, to)).map((item) => ({ ...item, trangThaiKQ: item.trangThaiKQ ?? "draft" }));
  setState((current) => ({ ...current, done: data, loading: false }));
};

export const handleSaveKetQuaTong = async (payload, refresh) => {
  try {
    await saveKetQuaTong(payload);
    await refresh?.();
    return true;
  } catch (error) {
    Swal.fire("Không thể lưu kết quả tổng", errorMessage(error, "Vui lòng thử lại."), "error");
    return false;
  }
};

export const handleSaveChiTiet = async (payload, refresh) => {
  try {
    await saveKetQuaChiTiet(payload);
    await refresh?.();
    return true;
  } catch (error) {
    Swal.fire("Không thể lưu chỉ tiêu", errorMessage(error, "Vui lòng thử lại."), "error");
    return false;
  }
};

export const handleDuyet = async (id, refresh) => {
  try {
    await approveKetQua(id);
    await Swal.fire("Đã duyệt kết quả", "Kết quả đã được khóa để chuẩn bị gửi.", "success");
    await refresh?.();
  } catch (error) { Swal.fire("Không thể duyệt kết quả", errorMessage(error, "Vui lòng thử lại."), "error"); }
};

export const handleHuyDuyet = async (id, refresh) => {
  try {
    await cancelApproveKetQua(id);
    await Swal.fire("Đã hủy duyệt", "Kết quả đã được mở lại để chỉnh sửa.", "success");
    await refresh?.();
  } catch (error) { Swal.fire("Không thể hủy duyệt", errorMessage(error, "Vui lòng thử lại."), "error"); }
};

export const handleGui = async (id, refresh) => {
  try {
    await sendKetQua(id);
    await Swal.fire("Đã gửi kết quả", "Kết quả đã được chuyển về phòng khám.", "success");
    await refresh?.();
  } catch (error) { Swal.fire("Không thể gửi kết quả", errorMessage(error, "Vui lòng thử lại."), "error"); }
};

export const handleNhan = async (id, refresh) => {
  try {
    await nhanDVKT(id);
    await Swal.fire("Đã nhận chỉ định", "Chỉ định đã chuyển sang danh sách đang thực hiện.", "success");
    await refresh?.();
  } catch (error) { Swal.fire("Không thể nhận chỉ định", errorMessage(error, "Vui lòng thử lại."), "error"); }
};

export const handleHuyNhan = async (id, refresh) => {
  try {
    await huyNhanDVKT(id);
    await Swal.fire("Đã hủy nhận", "Chỉ định đã quay lại danh sách chờ.", "success");
    await refresh?.();
  } catch (error) { Swal.fire("Không thể hủy nhận", errorMessage(error, "Vui lòng thử lại."), "error"); }
};

export const handleHoanThanh = async (id, refresh) => {
  try {
    await hoanThanhDVKT(id);
    await Swal.fire("Đã hoàn thành", "Chỉ định đã chuyển sang danh sách hoàn thành.", "success");
    await refresh?.();
  } catch (error) { Swal.fire("Không thể hoàn thành", errorMessage(error, "Vui lòng thử lại."), "error"); }
};

export const loadLogs = async (id, setLogs) => setLogs(await getLogsDVKT(id));

export const ThucHienDVKTController = {
  loadPending, loadProcessing, loadDone, loadLogs,
  handleNhan, handleHuyNhan, handleSaveKetQuaTong, handleSaveChiTiet,
  handleDuyet, handleHuyDuyet, handleGui, handleHoanThanh,
  fetchFull: fetchFullKetQua, handleExportPDF,
};
