import axios from "axios";

const API_BASE = "https://localhost:7007/api/HoaDon";

const getAuthToken = () => {
  const direct = localStorage.getItem("access_token") || localStorage.getItem("token") || localStorage.getItem("jwt");
  if (direct) return direct;
  try {
    const user = JSON.parse(localStorage.getItem("userInfo") || "{}");
    return user.accessToken || user.token || user.jwt || user.access_token || "";
  } catch {
    return "";
  }
};

// ================== DANH SÁCH CHỜ THANH TOÁN ==================
export const getWaitingPatients = async (type = "") => {
  try {
    const res = await axios.get(`${API_BASE}/benh-nhan-cho-thanh-toan`, {
      params: { loai: type || "" },
    });
    return res.data;
  } catch (err) {
    console.error("❌ Lỗi khi lấy danh sách bệnh nhân:", err);
    return [];
  }
};

// ================== XEM CHI TIẾT HÓA ĐƠN ==================
export const getBillDetail = async (idOrCode) => {
  try {
    if (!idOrCode) return null;
    const url = `${API_BASE}/ma/${idOrCode}`;
    const res = await axios.get(url);
    return res.data;
  } catch (err) {
    console.error("❌ Lỗi khi lấy chi tiết hóa đơn:", err);
    return null;
  }
};
// ================== TẠO URL THANH TOÁN VNPAY ==================
export const getVnpayPaymentUrl = async (maHoaDon) => {
  try {
    const res = await axios.get(
      `https://localhost:7007/api/Vnpay/CreatePaymentUrl`,
      {
        params: { maHd: maHoaDon },
        headers: getAuthToken() ? { Authorization: `Bearer ${getAuthToken()}` } : {},
      }
    );

    return res.data; // { paymentUrl: "https://..." }
  } catch (err) {
    console.error("❌ Lỗi tạo URL thanh toán VNPay:", err);
    return null;
  }
};

export const cancelVnpayPending = async (maHoaDon) => {
  const token = getAuthToken();
  const res = await axios.patch(
    `https://localhost:7007/api/Vnpay/CancelPending/${encodeURIComponent(maHoaDon)}`,
    null,
    { headers: token ? { Authorization: `Bearer ${token}` } : {} }
  );
  return res.data;
};

// ================== XÁC NHẬN THANH TOÁN ==================
export const confirmPayment = async (idOrCode, idThuNgan, hinhThucThanhToan = "TIEN_MAT") => {
  try {
    const token = getAuthToken();
    const isStringCode = typeof idOrCode === "string";
    const url = isStringCode
      ? `${API_BASE}/xac-nhan-thanh-toan/ma/${idOrCode}`
      : `${API_BASE}/xac-nhan-thanh-toan/${idOrCode}`;
    const res = await axios.put(
  url,
  { idThuNgan, hinhThucThanhToan },
  {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  }
);

    return res.data;
  } catch (err) {
    console.error("❌ Lỗi khi xác nhận thanh toán:", err);
    throw err;
  }
};

// ================== IN PHIẾU THU ==================
export const getReceipt = async (idOrCode) => {
  try {
    if (!idOrCode) return null;
    const isStringCode =
      typeof idOrCode === "string" && !/^\d+$/.test(idOrCode.trim());
    const url = isStringCode
      ? `${API_BASE}/phieu-thu/ma/${idOrCode}`
      : `${API_BASE}/phieu-thu/${idOrCode}`;
    const res = await axios.get(url);
    return res.data;
  } catch (err) {
    console.error("❌ Lỗi khi lấy phiếu thu:", err);
    return null;
  }
};
