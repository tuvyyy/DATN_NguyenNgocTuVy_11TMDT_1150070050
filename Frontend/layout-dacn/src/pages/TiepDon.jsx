import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  AlertCircle,
  Ban,
  Calendar,
  ChevronDown,
  ClipboardCheck,
  Download,
  Filter,
  ListChecks,
  Loader2,
  MapPin,
  Move,
  RefreshCcw,
  Search,
} from "lucide-react";
import MainLayout from "../layouts/MainLayout";
import { usePermission } from "../hooks/UsePermission";
import {
  cancelEncounterV2,
  exportEncounterV2,
  getEncounterListV2,
  getReceptionAreasV2,
  getReceptionDictionariesV2,
  getEncounterTimelineV2,
  lookupPatientV2,
  searchWardLocationsV2,
  saveEncounterV2,
  upsertPatientV2,
} from "../api/TiepDonApi";
import AnimatedSelect from "../components/ui/AnimatedSelect";
import { hasMojibake, matchBestOption, normalizeVietnameseText, toLooseKey } from "../utils/textCodec";

const PAYMENT_SELF_PAY = "Tự phí";
const PAYMENT_INSURANCE = "Bảo hiểm";

const EMPTY_FORM = {
  ma_bn: "",
  ho_ten: "",
  ngay_sinh: "",
  gioi_tinh: "",
  cccd: "",
  so_dien_thoai: "",
  email: "",
  nghe_nghiep: "",
  dia_chi_duong: "",
  dia_chi_xa: "",
  dia_chi_huyen: "",
  dia_chi_tinh: "",
  dan_toc: "Kinh",
  quoc_tich: "Việt Nam",
  quoc_gia: "Việt Nam",
  nguon_tiep_nhan: "Trực tiếp",
  loai_kham: "Khám mới",
  ly_do_kham: "",
  trieu_chung_ban_dau: "",
  thoi_gian_xuat_hien_trieu_chung: "",
  muc_do_dau: "",
  muc_uu_tien: "Thường",
  ghi_chu_tiep_don: "",
  doi_tuong_thanh_toan: PAYMENT_SELF_PAY,
  ly_do_tao_them_luot: "",
  ma_lich_hen: "",
  id_khu_tiep_don: "",
  ma_khu_tiep_don: "",
  ten_khu_tiep_don: "",
  id_quay_tiep_don: "",
  ma_quay_tiep_don: "",
  ten_quay_tiep_don: "",
  ly_do_chuyen_khu: "",
  quay_tiep_don: "Quầy tự chọn",
  stt_tiep_don: "",
  so_the_bhyt: "",
  han_bhyt: "",
  noi_dang_ky_kcb: "",
  tuyen_kham: "",
  giay_chuyen_tuyen: "",
  nguoi_lien_he_khan_cap: "",
  sdt_lien_he_khan_cap: "",
  quan_he_lien_he_khan_cap: "",
  nguoi_giam_ho: "",
  sdt_giam_ho: "",
  quan_he_giam_ho: "",
  ghi_chu_dinh_danh: "",
};

const EMPTY_VITAL = {
  nhietDo: "",
  nhipTim: "",
  spo2: "",
  huyetApTamThu: "",
  huyetApTamTruong: "",
  nhipTho: "",
  chieuCao: "",
  canNang: "",
  bmi: "",
  diUngThuoc: "",
  benhNen: "",
  tinhTrangMangThai: "",
  trieuChungNguyHiem: "",
  mucDoDau: "",
};

const STATUS_META = {
  MOI_TAO: { label: "Mới tạo", className: "bg-sky-100 text-sky-700" },
  DA_TIEP_DON: { label: "Đã tiếp đón", className: "bg-cyan-100 text-cyan-700" },
  CHO_DICH_VU: { label: "Chờ dịch vụ", className: "bg-indigo-100 text-indigo-700" },
  DICH_VU_NHAP: { label: "Dịch vụ nháp", className: "bg-blue-100 text-blue-700" },
  CHO_THANH_TOAN: { label: "Chờ thanh toán", className: "bg-violet-100 text-violet-700" },
  DA_THANH_TOAN: { label: "Đã thanh toán", className: "bg-emerald-100 text-emerald-700" },
  CHO_CHUYEN_KHU: { label: "Chờ chuyển khu", className: "bg-orange-100 text-orange-700" },
  DA_NHAN_KHU_MOI: { label: "Đã nhận khu mới", className: "bg-teal-100 text-teal-700" },
  HUY_CHUYEN_KHU: { label: "Hủy chuyển khu", className: "bg-slate-100 text-slate-700" },
  CHO_KHAM: { label: "Chờ khám", className: "bg-amber-100 text-amber-700" },
  DANG_KHAM: { label: "Đang khám", className: "bg-orange-100 text-orange-700" },
  CHO_CAN_LAM_SANG: { label: "Chờ cận lâm sàng", className: "bg-fuchsia-100 text-fuchsia-700" },
  CHO_KET_QUA: { label: "Chờ kết quả", className: "bg-purple-100 text-purple-700" },
  CHO_KET_LUAN: { label: "Chờ kết luận", className: "bg-purple-100 text-purple-700" },
  DA_KHAM: { label: "Đã khám", className: "bg-emerald-100 text-emerald-700" },
  DA_DONG: { label: "Đã đóng", className: "bg-slate-100 text-slate-700" },
  DA_HUY: { label: "Đã hủy", className: "bg-rose-100 text-rose-700" },
};

const STATUS_OPTIONS = [
  { value: "ALL", label: "Tất cả trạng thái" },
  ...Object.keys(STATUS_META).map((key) => ({ value: key, label: STATUS_META[key].label })),
];

const TIMELINE_ACTION_NOTES = {
  ENCOUNTER_CREATED: "T\u1ea1o h\u1ed3 s\u01a1 l\u01b0\u1ee3t kh\u00e1m m\u1edbi t\u1eeb ti\u1ebfp \u0111\u00f3n.",
  RECEPTION_COMPLETED: "Ho\u00e0n t\u1ea5t nh\u1eadp th\u00f4ng tin ti\u1ebfp \u0111\u00f3n.",
  MOVE_TO_SERVICE_REGISTRATION: "M\u1edf l\u1ea1i b\u01b0\u1edbc \u0111\u0103ng k\u00fd d\u1ecbch v\u1ee5 t\u1eeb h\u1ed3 s\u01a1 hi\u1ec7n t\u1ea1i.",
  ENCOUNTER_UPDATED: "C\u1eadp nh\u1eadt th\u00f4ng tin ti\u1ebfp \u0111\u00f3n/h\u00e0nh ch\u00ednh.",
  VITALS_UPDATED: "C\u1eadp nh\u1eadt sinh hi\u1ec7u t\u1ea1i m\u00e0n ti\u1ebfp \u0111\u00f3n.",
  VITALS_CAPTURED: "Nh\u1eadp sinh hi\u1ec7u ban \u0111\u1ea7u t\u1ea1i qu\u1ea7y ti\u1ebfp \u0111\u00f3n.",
  APPOINTMENT_CHECKED_IN: "Check-in l\u1ecbch h\u1eb9n th\u00e0nh c\u00f4ng.",
  CANCEL_ENCOUNTER: "\u0110\u00e3 h\u1ee7y h\u1ed3 s\u01a1 ti\u1ebfp \u0111\u00f3n.",
  AREA_TRANSFER_REQUESTED: "\u0110\u00e3 t\u1ea1o y\u00eau c\u1ea7u chuy\u1ec3n khu.",
  AREA_TRANSFER_ACCEPTED: "\u0110\u00e3 nh\u1eadn h\u1ed3 s\u01a1 sang khu m\u1edbi.",
  AREA_TRANSFER_CANCELLED: "\u0110\u00e3 h\u1ee7y y\u00eau c\u1ea7u chuy\u1ec3n khu.",
  CROSS_AREA_RECEIVED: "\u0110\u00e3 nh\u1eadn h\u1ed3 s\u01a1 sang khu m\u1edbi.",
};

const TIMELINE_ACTION_LABELS = {
  ENCOUNTER_CREATED: "Tạo hồ sơ tiếp đón",
  RECEPTION_COMPLETED: "Hoàn tất tiếp đón",
  MOVE_TO_SERVICE_REGISTRATION: "Chuyển đăng ký dịch vụ",
  ENCOUNTER_UPDATED: "Cập nhật hồ sơ",
  VITALS_UPDATED: "Cập nhật sinh hiệu",
  VITALS_CAPTURED: "Ghi nhận sinh hiệu ban đầu",
  APPOINTMENT_CHECKED_IN: "Đăng ký từ lịch hẹn",
  CANCEL_ENCOUNTER: "Hủy hồ sơ tiếp đón",
  AREA_TRANSFER_REQUESTED: "Yêu cầu chuyển khu",
  AREA_TRANSFER_ACCEPTED: "Nhận chuyển khu",
  AREA_TRANSFER_CANCELLED: "Hủy yêu cầu chuyển khu",
  CROSS_AREA_RECEIVED: "Nhận chuyển khu liên viện",
  SERVICE_ORDER_DRAFT_SAVED: "Lưu nháp chỉ định",
  SERVICE_ORDER_CONFIRMED: "Xác nhận chỉ định dịch vụ",
  QUEUE_TICKETS_CREATED: "Cấp số thứ tự khám",
  QUEUE_ROOM_CHANGED: "Đổi phòng khám/hàng đợi",
  QUEUE_TICKETS_CREATED_AFTER_PAYMENT: "Cấp số khám sau thanh toán",
  DOCTOR_REOPEN_CLOSED_EXAM: "Bác sĩ mở lại hồ sơ",
};

const getTimelineActionLabel = (action) => {
  if (!action) return "--";
  const key = action.trim().toUpperCase();
  return TIMELINE_ACTION_LABELS[key] || action;
};

const getTimelineNote = (log) => {
  const repaired = normalizeVietnameseText(log?.note || "").trim();
  if (repaired && !hasMojibake(repaired)) return repaired;
  return TIMELINE_ACTION_NOTES[(log?.action || "").trim().toUpperCase()] || repaired;
};

const DEFAULT_NGUON_OPTIONS = ["Trực tiếp", "Đặt lịch", "Tái khám", "Chuyển tuyến", "Cấp cứu", "Khám đoàn", "Doanh nghiệp"];
const DEFAULT_LOAI_KHAM_OPTIONS = ["Khám mới", "Tái khám", "Cấp cứu", "Khám dịch vụ", "Khám tổng quát", "Khám theo gói", "Khám doanh nghiệp"];
const DEFAULT_UU_TIEN_OPTIONS = ["Thường", "Ưu tiên", "Cấp cứu", "Hẹn trước", "VIP"];
const DEFAULT_THANH_TOAN_OPTIONS = [PAYMENT_SELF_PAY, PAYMENT_INSURANCE, "Dịch vụ yêu cầu", "Công ty chi trả", "Miễn giảm"];
const DEFAULT_CANCEL_REASONS = [
  { code: "BENH_NHAN_KHONG_TIEP_TUC", label: "Bệnh nhân không tiếp tục khám" },
  { code: "NHAP_NHAM_THONG_TIN", label: "Nhập nhầm thông tin" },
  { code: "TAO_TRUNG_HO_SO", label: "Tạo trùng hồ sơ" },
  { code: "SAI_DICH_VU_PHONG", label: "Sai dịch vụ/phòng khám" },
  { code: "CHUYEN_CO_SO", label: "Bệnh nhân chuyển cơ sở khác" },
  { code: "KHAC", label: "Lý do khác" },
];
const GIOI_TINH_OPTIONS = ["Nam", "Nữ", "Khác"];

const TAB_OPTIONS = [
  { key: "today", label: "Tiếp đón trong ngày" },
  { key: "pending", label: "Hồ sơ tồn" },
  { key: "cancelled", label: "Hồ sơ đã hủy" },
  { key: "completed", label: "Hồ sơ hoàn tất" },
];

const FLOW_STEPS = [
  "MOI_TAO",
  "DA_TIEP_DON",
  "CHO_DICH_VU",
  "DICH_VU_NHAP",
  "CHO_THANH_TOAN",
  "DA_THANH_TOAN",
  "CHO_CHUYEN_KHU",
  "DA_NHAN_KHU_MOI",
  "HUY_CHUYEN_KHU",
  "CHO_KHAM",
  "DANG_KHAM",
  "CHO_CAN_LAM_SANG",
  "CHO_KET_QUA",
  "CHO_KET_LUAN",
  "DA_KHAM",
  "DA_DONG",
];

const PHONE_REGEX = /^(0|\+84)(3|5|7|8|9)\d{8}$/;
const CCCD_REGEX = /^\d{9}(\d{3})?$/;
const normalize = (value) => (value ?? "").toString().trim();
const sameLoose = (a, b) => toLooseKey(a) === toLooseKey(b);
const toCanonicalOption = (value, options, fallback = "") => {
  const current = normalizeVietnameseText(value || "");
  if (!current) return fallback;

  const direct = options.find((item) => sameLoose(item, current));
  if (direct) return direct;

  const fuzzy = matchBestOption(current, options);
  if (fuzzy) return fuzzy;

  if (hasMojibake(current)) return fallback || options[0] || "";
  return current;
};

const sanitizeDictionaryArray = (source, fallback) => {
  const list = Array.isArray(source) ? source : [];
  if (list.length === 0) return [...fallback];

  const normalized = list
    .map((item) => (typeof item === "string" ? item : item?.label || item?.value || ""))
    .map((item) => toCanonicalOption(item, fallback, ""))
    .filter((item) => !!item);

  const unique = Array.from(new Set(normalized));
  return unique.length > 0 ? unique : [...fallback];
};

const toOptionItems = (options = []) =>
  options.map((item) =>
    typeof item === "string"
      ? { value: normalizeVietnameseText(item), label: normalizeVietnameseText(item) }
      : {
          value: normalizeVietnameseText(item?.value ?? ""),
          label: normalizeVietnameseText(item?.label ?? item?.value ?? ""),
        }
  );

const normalizeReceptionAreas = (payload) => {
  const items = Array.isArray(payload?.items) ? payload.items : Array.isArray(payload) ? payload : [];
  return items
    .map((area) => {
      const counters = Array.isArray(area?.counters) ? area.counters : [];
      return {
        id: area?.id,
        maKhu: normalizeVietnameseText(area?.maKhu || area?.code || ""),
        tenKhu: normalizeVietnameseText(area?.tenKhu || area?.name || ""),
        moTa: normalizeVietnameseText(area?.moTa || ""),
        isDefault: area?.isDefault === true,
        counters: counters
          .map((counter) => ({
            id: counter?.id,
            maQuay: normalizeVietnameseText(counter?.maQuay || counter?.code || ""),
            tenQuay: normalizeVietnameseText(counter?.tenQuay || counter?.name || ""),
            thuTu: Number(counter?.thuTu) || 0,
            idKhuTiepDon: counter?.idKhuTiepDon || area?.id,
            isDefault: counter?.isDefault === true,
          }))
          .filter((counter) => counter.id)
          .sort((a, b) => (a.thuTu || 9999) - (b.thuTu || 9999) || String(a.maQuay).localeCompare(String(b.maQuay))),
      };
    })
    .filter((area) => area.id);
};

const getDefaultArea = (areas = [], payload = {}) => {
  const defaultId = payload?.defaultAreaId;
  return areas.find((area) => String(area.id) === String(defaultId)) || areas.find((area) => area.isDefault) || areas[0] || null;
};

const getDefaultCounter = (area, payload = {}) => {
  const counters = area?.counters || [];
  const defaultId = payload?.defaultCounterId;
  return counters.find((counter) => String(counter.id) === String(defaultId)) || counters.find((counter) => counter.isDefault) || counters[0] || null;
};

const buildAreaFormPatch = (area, counter) => ({
  id_khu_tiep_don: area?.id ? String(area.id) : "",
  ma_khu_tiep_don: area?.maKhu || "",
  ten_khu_tiep_don: area?.tenKhu || "",
  id_quay_tiep_don: counter?.id ? String(counter.id) : "",
  ma_quay_tiep_don: counter?.maQuay || "",
  ten_quay_tiep_don: counter?.tenQuay || "",
  quay_tiep_don: counter?.tenQuay || counter?.maQuay || "",
});

const toCanonicalNguon = (value) =>
  toCanonicalOption(value, DEFAULT_NGUON_OPTIONS, DEFAULT_NGUON_OPTIONS[0]);
const toCanonicalLoaiKham = (value) =>
  toCanonicalOption(value, DEFAULT_LOAI_KHAM_OPTIONS, DEFAULT_LOAI_KHAM_OPTIONS[0]);
const toCanonicalUuTien = (value) =>
  toCanonicalOption(value, DEFAULT_UU_TIEN_OPTIONS, DEFAULT_UU_TIEN_OPTIONS[0]);
const toCanonicalThanhToan = (value) =>
  toCanonicalOption(value, DEFAULT_THANH_TOAN_OPTIONS, DEFAULT_THANH_TOAN_OPTIONS[0]);
const isNguonDatLich = (value) => sameLoose(value, "Đặt lịch");
const isThanhToanBaoHiem = (value) => sameLoose(value, PAYMENT_INSURANCE);
const isMucUuTien = (value) => sameLoose(value, "Ưu tiên");
const isMucCapCuu = (value) => sameLoose(value, "Cấp cứu");

const toInputDate = (value) => {
  if (!value) return "";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
};

const toDisplayDate = (value) => {
  if (!value) return "--";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "--";
  return d.toLocaleDateString("vi-VN");
};

const toDisplayTime = (value) => {
  if (!value) return "--:--";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "--:--";
  return d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
};

const getTodayKey = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const calcAge = (dateString) => {
  if (!dateString) return "--";
  const dob = new Date(dateString);
  if (Number.isNaN(dob.getTime())) return "--";
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const diffMonth = now.getMonth() - dob.getMonth();
  if (diffMonth < 0 || (diffMonth === 0 && now.getDate() < dob.getDate())) {
    age -= 1;
  }
  return age >= 0 ? age : "--";
};

const meta = (status) => STATUS_META[status] || { label: status || "Không rõ", className: "bg-slate-100 text-slate-600" };

const parseFileName = (contentDisposition, fallback) => {
  if (!contentDisposition) return fallback;
  const utf8 = /filename\*=UTF-8''([^;]+)/i.exec(contentDisposition);
  if (utf8?.[1]) {
    try {
      return decodeURIComponent(utf8[1]);
    } catch {
      return utf8[1];
    }
  }
  const normal = /filename="?([^";]+)"?/i.exec(contentDisposition);
  return normal?.[1] || fallback;
};

const normalizeStatus = (status) => normalize(status).toUpperCase();
const generateIdempotencyKey = (prefix = "idem") =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const validate = (form, vital) => {
  const errors = {};

  if (!normalize(form.ho_ten)) errors.ho_ten = "Họ tên là bắt buộc.";
  if (!normalize(form.ngay_sinh)) errors.ngay_sinh = "Ngày sinh là bắt buộc.";
  if (!normalize(form.gioi_tinh)) errors.gioi_tinh = "Giới tính là bắt buộc.";
  if (!normalize(form.so_dien_thoai)) {
    errors.so_dien_thoai = "Số điện thoại là bắt buộc.";
  } else if (!PHONE_REGEX.test(normalize(form.so_dien_thoai))) {
    errors.so_dien_thoai = "Số điện thoại không đúng định dạng Việt Nam.";
  }

  if (normalize(form.cccd) && !CCCD_REGEX.test(normalize(form.cccd))) {
    errors.cccd = "CCCD phải có 9 hoặc 12 chữ số.";
  }
  if (normalize(form.email)) {
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalize(form.email));
    if (!emailOk) errors.email = "Email không đúng định dạng.";
  }

  if (normalize(form.ngay_sinh)) {
    const dob = new Date(form.ngay_sinh);
    if (Number.isNaN(dob.getTime())) {
      errors.ngay_sinh = "Ngày sinh không hợp lệ.";
    } else if (dob > new Date()) {
      errors.ngay_sinh = "Ngày sinh không được lớn hơn ngày hiện tại.";
    }
  }

  if (!normalize(form.nguon_tiep_nhan)) errors.nguon_tiep_nhan = "Nguồn tiếp nhận là bắt buộc.";
  if (!normalize(form.loai_kham)) errors.loai_kham = "Loại khám là bắt buộc.";
  if (!normalize(form.ly_do_kham)) errors.ly_do_kham = "Lý do khám là bắt buộc.";
  if (!normalize(form.muc_uu_tien)) errors.muc_uu_tien = "Mức ưu tiên là bắt buộc.";
  if (!normalize(form.doi_tuong_thanh_toan)) errors.doi_tuong_thanh_toan = "Đối tượng thanh toán là bắt buộc.";
  if (!normalize(form.id_khu_tiep_don)) errors.id_khu_tiep_don = "Khu tiếp đón là bắt buộc.";
  if (!normalize(form.id_quay_tiep_don)) errors.id_quay_tiep_don = "Quầy tiếp đón là bắt buộc.";

  if (isNguonDatLich(form.nguon_tiep_nhan) && !normalize(form.ma_lich_hen)) {
    errors.ma_lich_hen = "Nguồn đặt lịch cần nhập mã lịch hẹn.";
  }
  if (isThanhToanBaoHiem(form.doi_tuong_thanh_toan)) {
    if (!normalize(form.so_the_bhyt)) {
      errors.so_the_bhyt = "Người bệnh BHYT cần nhập số thẻ BHYT.";
    }

    if (!normalize(form.han_bhyt)) {
      errors.han_bhyt = "Người bệnh BHYT cần nhập ngày hết hạn thẻ.";
    } else {
      const expiry = new Date(form.han_bhyt);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (Number.isNaN(expiry.getTime())) {
        errors.han_bhyt = "Ngày hết hạn BHYT không hợp lệ.";
      } else if (expiry < today) {
        errors.han_bhyt = "Thẻ BHYT đã hết hạn.";
      }
    }

    if (!normalize(form.noi_dang_ky_kcb)) {
      errors.noi_dang_ky_kcb = "Người bệnh BHYT cần nhập nơi đăng ký KCB.";
    }
    if (!normalize(form.tuyen_kham)) {
      errors.tuyen_kham = "Người bệnh BHYT cần nhập tuyến khám.";
    }
    if (
      ["chuyen tuyen", "trai tuyen"].includes(toLooseKey(form.tuyen_kham)) ||
      toLooseKey(form.nguon_tiep_nhan) === "chuyen tuyen"
    ) {
      if (!normalize(form.giay_chuyen_tuyen)) {
        errors.giay_chuyen_tuyen = "Chuyển tuyến/trái tuyến cần nhập giấy chuyển tuyến.";
      }
    }
  }

  const age = calcAge(form.ngay_sinh);
  if (typeof age === "number" && age < 16) {
    if (!normalize(form.nguoi_giam_ho)) errors.nguoi_giam_ho = "Bệnh nhân dưới 16 tuổi cần người giám hộ.";
    if (!normalize(form.sdt_giam_ho)) {
      errors.sdt_giam_ho = "Bệnh nhân dưới 16 tuổi cần SĐT người giám hộ.";
    } else if (!PHONE_REGEX.test(normalize(form.sdt_giam_ho))) {
      errors.sdt_giam_ho = "SĐT người giám hộ không đúng định dạng Việt Nam.";
    }
  } else if (normalize(form.sdt_giam_ho) && !PHONE_REGEX.test(normalize(form.sdt_giam_ho))) {
    errors.sdt_giam_ho = "SĐT người giám hộ không đúng định dạng Việt Nam.";
  }

  if (normalize(form.sdt_lien_he_khan_cap) && !PHONE_REGEX.test(normalize(form.sdt_lien_he_khan_cap))) {
    errors.sdt_lien_he_khan_cap = "SĐT liên hệ khẩn cấp không đúng định dạng Việt Nam.";
  }

  if (normalize(form.muc_do_dau)) {
    const pain = Number(form.muc_do_dau);
    if (!Number.isFinite(pain) || pain < 0 || pain > 10) {
      errors.muc_do_dau = "Mức độ đau phải từ 0 đến 10.";
    }
  }

  const numberFields = [
    "nhietDo",
    "nhipTim",
    "spo2",
    "huyetApTamThu",
    "huyetApTamTruong",
    "nhipTho",
    "chieuCao",
    "canNang",
  ];
  for (const key of numberFields) {
    const value = normalize(vital[key]);
    if (!value) continue;
    if (!/^[-]?\d+(\.\d+)?$/.test(value)) {
      errors[key] = "Giá trị phải là số.";
    }
  }

  if (normalize(vital.spo2)) {
    const spo2 = Number(vital.spo2);
    if (Number.isFinite(spo2) && (spo2 < 0 || spo2 > 100)) errors.spo2 = "SpO2 phải từ 0 đến 100.";
  }
  if (normalize(vital.nhietDo)) {
    const t = Number(vital.nhietDo);
    if (Number.isFinite(t) && (t < 30 || t > 45)) errors.nhietDo = "Nhiệt độ phải từ 30 đến 45°C.";
  }
  if (normalize(vital.nhipTim)) {
    const hr = Number(vital.nhipTim);
    if (Number.isFinite(hr) && (hr < 30 || hr > 220)) errors.nhipTim = "Nhịp tim phải từ 30 đến 220.";
  }
  if (normalize(vital.mucDoDau)) {
    const pain = Number(vital.mucDoDau);
    if (!Number.isFinite(pain) || pain < 0 || pain > 10) errors.mucDoDau = "Mức độ đau phải từ 0 đến 10.";
  }

  return errors;
};

const toEncounterPayload = (form, vital, patientId, moveToService, selectedEncounterId, idempotencyKey) => {
  const dangerSymptoms = normalize(vital.trieuChungNguyHiem)
    .split(",")
    .map((x) => normalize(x))
    .filter(Boolean);

  return {
    idHoSo: selectedEncounterId ? Number(selectedEncounterId) : null,
    idBenhNhan: patientId,
    idNguoiTao: 0,
    chuyenSangDangKyDichVu: moveToService,
    idempotencyKey,
    thongTinTiepDon: {
      nguonTiepNhan: normalize(form.nguon_tiep_nhan) || null,
      loaiKham: normalize(form.loai_kham) || null,
      lyDoKham: normalize(form.ly_do_kham) || null,
      trieuChungBanDau: normalize(form.trieu_chung_ban_dau) || null,
      thoiGianXuatHienTrieuChung: normalize(form.thoi_gian_xuat_hien_trieu_chung) || null,
      mucDoDau: normalize(form.muc_do_dau) ? Number(form.muc_do_dau) : null,
      mucUuTien: normalize(form.muc_uu_tien) || null,
      ghiChuTiepDon: normalize(form.ghi_chu_tiep_don) || null,
      doiTuongThanhToan: normalize(form.doi_tuong_thanh_toan) || null,
      lyDoTaoThemLuotTrongNgay: normalize(form.ly_do_tao_them_luot) || null,
      appointmentCode: normalize(form.ma_lich_hen) || null,
      idKhuTiepDon: normalize(form.id_khu_tiep_don) ? Number(form.id_khu_tiep_don) : null,
      maKhuTiepDon: normalize(form.ma_khu_tiep_don) || null,
      tenKhuTiepDon: normalize(form.ten_khu_tiep_don) || null,
      idQuayTiepDon: normalize(form.id_quay_tiep_don) ? Number(form.id_quay_tiep_don) : null,
      maQuayTiepDon: normalize(form.ma_quay_tiep_don) || null,
      tenQuayTiepDon: normalize(form.ten_quay_tiep_don) || null,
      lyDoChuyenKhu: normalize(form.ly_do_chuyen_khu) || null,
      insuranceSoThe: normalize(form.so_the_bhyt) || null,
      insuranceNgayHetHan: normalize(form.han_bhyt) || null,
      insuranceNoiDangKyKcb: normalize(form.noi_dang_ky_kcb) || null,
      insuranceTuyenKham: normalize(form.tuyen_kham) || null,
      insuranceGiayChuyenTuyen: normalize(form.giay_chuyen_tuyen) || null,
      tinhTrangDiUngThuoc: normalize(vital.diUngThuoc) || null,
      benhNen: normalize(vital.benhNen) || null,
      tinhTrangMangThai: normalize(vital.tinhTrangMangThai) || null,
      trieuChungNguyHiem: dangerSymptoms,
    },
    sinhHieu: {
      nhietDo: normalize(vital.nhietDo) ? Number(vital.nhietDo) : null,
      nhipTim: normalize(vital.nhipTim) ? Number(vital.nhipTim) : null,
      spo2: normalize(vital.spo2) ? Number(vital.spo2) : null,
      huyetApTamThu: normalize(vital.huyetApTamThu) ? Number(vital.huyetApTamThu) : null,
      huyetApTamTruong: normalize(vital.huyetApTamTruong) ? Number(vital.huyetApTamTruong) : null,
      nhipTho: normalize(vital.nhipTho) ? Number(vital.nhipTho) : null,
      chieuCao: normalize(vital.chieuCao) ? Number(vital.chieuCao) : null,
      canNang: normalize(vital.canNang) ? Number(vital.canNang) : null,
      bmi: normalize(vital.bmi) ? Number(vital.bmi) : null,
      diUngThuoc: normalize(vital.diUngThuoc) || null,
      benhNen: normalize(vital.benhNen) || null,
      tinhTrangMangThai: normalize(vital.tinhTrangMangThai) || null,
      trieuChungNguyHiem: dangerSymptoms,
      mucDoDau: normalize(vital.mucDoDau) ? Number(vital.mucDoDau) : null,
    },
  };
};

export default function TiepDon({ viewMode = "full", initialTab = "today" }) {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    canView,
    canAdd,
    canEdit,
    canDelete,
    canExport,
    loading: permLoading,
  } = usePermission("TIEP_DON");

  const canSave = canAdd || canEdit;

  const [form, setForm] = useState(EMPTY_FORM);
  const [vital, setVital] = useState(EMPTY_VITAL);
  const [errors, setErrors] = useState({});
  const [selectedEncounter, setSelectedEncounter] = useState(null);

  const [activeTab, setActiveTab] = useState(initialTab || "today");
  const [filterDate, setFilterDate] = useState(getTodayKey());
  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [loaiKhamFilter, setLoaiKhamFilter] = useState("ALL");
  const [nguonFilter, setNguonFilter] = useState("ALL");
  const [areaFilter, setAreaFilter] = useState("ALL");

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [records, setRecords] = useState([]);

  const [listLoading, setListLoading] = useState(true);
  const [savingMode, setSavingMode] = useState("");
  const [exporting, setExporting] = useState(false);

  const [notice, setNotice] = useState({ type: "", text: "" });
  const [lookupLoading, setLookupLoading] = useState(false);
  const [areaLoading, setAreaLoading] = useState(false);
  const [receptionAreas, setReceptionAreas] = useState([]);

  const [cancelModal, setCancelModal] = useState({
    open: false,
    record: null,
    maLyDoHuy: "",
    lyDoHuy: "",
    ghiChu: "",
    errors: {},
  });
  const [confirmClearModal, setConfirmClearModal] = useState(false);
  const [warningModal, setWarningModal] = useState({ open: false, title: "", message: "" });
  const [timelineModal, setTimelineModal] = useState({
    open: false,
    loading: false,
    record: null,
    logs: [],
    error: "",
  });
  const [wardSuggestions, setWardSuggestions] = useState([]);
  const [wardSuggestLoading, setWardSuggestLoading] = useState(false);
  const [wardSuggestError, setWardSuggestError] = useState("");
  const [dictionaryLoading, setDictionaryLoading] = useState(false);
  const [dictionaries, setDictionaries] = useState({
    nguonTiepNhan: DEFAULT_NGUON_OPTIONS,
    loaiKham: DEFAULT_LOAI_KHAM_OPTIONS,
    mucUuTien: DEFAULT_UU_TIEN_OPTIONS,
    doiTuongThanhToan: DEFAULT_THANH_TOAN_OPTIONS,
    lyDoHuy: DEFAULT_CANCEL_REASONS,
  });
  const [extraInfoCollapsed, setExtraInfoCollapsed] = useState(true);

  const [debouncedKeyword, setDebouncedKeyword] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedKeyword(keyword.trim()), 350);
    return () => clearTimeout(timer);
  }, [keyword]);

  useEffect(() => {
    setPage(1);
  }, [activeTab, filterDate, debouncedKeyword, statusFilter, loaiKhamFilter, nguonFilter, areaFilter]);

  useEffect(() => {
    setActiveTab(initialTab || "today");
  }, [initialTab]);

  useEffect(() => {
    const queryTab = new URLSearchParams(location.search).get("tab");
    if (viewMode !== "list") return;
    if (queryTab === "appointments") {
      setActiveTab("today");
      setNguonFilter(toCanonicalNguon("Đặt lịch"));
    }
  }, [location.search, viewMode]);

  useEffect(() => {
    let ignore = false;
    const loadDictionaries = async () => {
      setDictionaryLoading(true);
      const data = await getReceptionDictionariesV2();
      if (ignore) return;

      if (data) {
        setDictionaries({
          nguonTiepNhan: sanitizeDictionaryArray(data.nguonTiepNhan, DEFAULT_NGUON_OPTIONS),
          loaiKham: sanitizeDictionaryArray(data.loaiKham, DEFAULT_LOAI_KHAM_OPTIONS),
          mucUuTien: sanitizeDictionaryArray(data.mucUuTien, DEFAULT_UU_TIEN_OPTIONS),
          doiTuongThanhToan: sanitizeDictionaryArray(data.doiTuongThanhToan, DEFAULT_THANH_TOAN_OPTIONS),
          lyDoHuy: Array.isArray(data.lyDoHuy) && data.lyDoHuy.length > 0 ? data.lyDoHuy : DEFAULT_CANCEL_REASONS,
        });
      }
      setDictionaryLoading(false);
    };

    loadDictionaries();
    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    let ignore = false;
    const loadAreas = async () => {
      setAreaLoading(true);
      const data = await getReceptionAreasV2();
      if (ignore) return;

      const areas = normalizeReceptionAreas(data);
      setReceptionAreas(areas);

      const defaultArea = getDefaultArea(areas, data || {});
      const defaultCounter = getDefaultCounter(defaultArea, data || {});
      if (defaultArea) {
        const patch = buildAreaFormPatch(defaultArea, defaultCounter);
        setForm((prev) => ({
          ...prev,
          ...(prev.id_khu_tiep_don ? {} : patch),
        }));
      }

      setAreaLoading(false);
    };

    loadAreas();
    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    const weight = Number(vital.canNang);
    const height = Number(vital.chieuCao);
    if (Number.isFinite(weight) && Number.isFinite(height) && weight > 0 && height > 0) {
      const bmi = (weight / ((height / 100) * (height / 100))).toFixed(2);
      setVital((prev) => (prev.bmi === bmi ? prev : { ...prev, bmi }));
    } else if (vital.bmi) {
      setVital((prev) => ({ ...prev, bmi: "" }));
    }
  }, [vital.canNang, vital.chieuCao, vital.bmi]);

  const nguonOptions = useMemo(
    () => toOptionItems(dictionaries.nguonTiepNhan?.length ? dictionaries.nguonTiepNhan : DEFAULT_NGUON_OPTIONS),
    [dictionaries.nguonTiepNhan]
  );
  const loaiKhamOptions = useMemo(
    () => toOptionItems(dictionaries.loaiKham?.length ? dictionaries.loaiKham : DEFAULT_LOAI_KHAM_OPTIONS),
    [dictionaries.loaiKham]
  );
  const mucUuTienOptions = useMemo(
    () => toOptionItems(dictionaries.mucUuTien?.length ? dictionaries.mucUuTien : DEFAULT_UU_TIEN_OPTIONS),
    [dictionaries.mucUuTien]
  );
  const doiTuongThanhToanOptions = useMemo(
    () => toOptionItems(dictionaries.doiTuongThanhToan?.length ? dictionaries.doiTuongThanhToan : DEFAULT_THANH_TOAN_OPTIONS),
    [dictionaries.doiTuongThanhToan]
  );
  const cancelReasonOptions = useMemo(
    () =>
      Array.isArray(dictionaries.lyDoHuy)
        ? dictionaries.lyDoHuy.map((x) => ({ value: x.code || "", label: x.label || x.code || "" })).filter((x) => x.value)
        : [],
    [dictionaries.lyDoHuy]
  );
  const areaOptions = useMemo(
    () =>
      receptionAreas.map((area) => ({
        value: String(area.id),
        label: `${area.maKhu ? `${area.maKhu} - ` : ""}${area.tenKhu || area.maKhu || `Khu #${area.id}`}`,
      })),
    [receptionAreas]
  );
  const selectedArea = useMemo(
    () => receptionAreas.find((area) => String(area.id) === String(form.id_khu_tiep_don)) || null,
    [form.id_khu_tiep_don, receptionAreas]
  );
  const counterOptions = useMemo(
    () =>
      (selectedArea?.counters || []).map((counter) => ({
        value: String(counter.id),
        label: `${counter.maQuay ? `${counter.maQuay} - ` : ""}${counter.tenQuay || counter.maQuay || `Quầy #${counter.id}`}`,
      })),
    [selectedArea]
  );
  const areaFilterOptions = useMemo(
    () => [{ value: "ALL", label: "Tất cả khu tiếp đón" }, ...areaOptions],
    [areaOptions]
  );
  const selectedEncounterAreaId = Number(selectedEncounter?.khuTiepDon?.id || 0);
  const currentAreaId = Number(form.id_khu_tiep_don || 0);
  const isSelectedEncounterOtherArea =
    Boolean(selectedEncounter?.id) && selectedEncounterAreaId > 0 && currentAreaId > 0 && selectedEncounterAreaId !== currentAreaId;

  const loadList = useCallback(async () => {
    setListLoading(true);
    const result = await getEncounterListV2({
      tab: activeTab,
      date: filterDate || undefined,
      keyword: debouncedKeyword || undefined,
      status: statusFilter,
      loaiKham: loaiKhamFilter === "ALL" ? undefined : loaiKhamFilter,
      nguonTiepNhan: nguonFilter === "ALL" ? undefined : nguonFilter,
      idKhuTiepDon: areaFilter === "ALL" ? undefined : Number(areaFilter),
      page,
      pageSize,
      sortBy: "ngay_tao",
      sortDir: "desc",
    });

    setRecords(result?.items || []);
    setTotal(result?.total || 0);
    setPage(result?.page || 1);
    setPageSize(result?.pageSize || 20);
    setTotalPages(result?.totalPages || 1);

    if (result?.error) {
      setNotice({ type: "error", text: result.error });
    }
    setListLoading(false);
  }, [activeTab, areaFilter, debouncedKeyword, filterDate, loaiKhamFilter, nguonFilter, page, pageSize, statusFilter]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  useEffect(() => {
    if (!selectedEncounter?.id) return;
    const current = records.find((x) => Number(x?.id) === Number(selectedEncounter.id));
    if (!current) return;
    setSelectedEncounter((prev) => ({
      ...prev,
      id: current.id,
      maHs: current.maHs || prev?.maHs || "",
      trangThai: current.trangThai || prev?.trangThai || "",
      khuTiepDon: current.khuTiepDon || prev?.khuTiepDon || null,
      quayTiepDon: current.quayTiepDon || prev?.quayTiepDon || null,
      canEditEncounter: current.canEditEncounter !== false,
      canCancel: current.canCancel !== false,
      canSelectService: current.canSelectService !== false,
    }));
  }, [records, selectedEncounter?.id]);

  useEffect(() => {
    const lookupTimer = setTimeout(async () => {
      const payload = {
        CCCD: normalize(form.cccd) || undefined,
        SoDienThoai: normalize(form.so_dien_thoai) || undefined,
        MaBenhNhan: normalize(form.ma_bn) || undefined,
        HoTen: normalize(form.ho_ten) || undefined,
        NgaySinh: normalize(form.ngay_sinh) || undefined,
        GioiTinh: normalize(form.gioi_tinh) || undefined,
        IdKhuTiepDon: normalize(form.id_khu_tiep_don) ? Number(form.id_khu_tiep_don) : undefined,
        MaKhuTiepDon: normalize(form.ma_khu_tiep_don) || undefined,
      };

      const hasSignal = payload.CCCD || payload.SoDienThoai || payload.MaBenhNhan;
      if (!hasSignal) {
        return;
      }

      setLookupLoading(true);
      const res = await lookupPatientV2(payload);
      setLookupLoading(false);

      if (!res || res.status >= 400 || !res.data?.exists || !res.data?.patient) {
        return;
      }

      const p = res.data.patient;
      const todayRecord = res.data?.todayRecord;

      setForm((prev) => ({
        ...prev,
        ma_bn: p.maBn || prev.ma_bn,
        ho_ten: normalizeVietnameseText(p.hoTen) || prev.ho_ten,
        ngay_sinh: toInputDate(p.ngaySinh) || prev.ngay_sinh,
        gioi_tinh: normalizeVietnameseText(p.gioiTinh) || prev.gioi_tinh,
        cccd: p.cccd || prev.cccd,
        so_dien_thoai: p.soDienThoai || prev.so_dien_thoai,
        email: normalizeVietnameseText(p.email) || prev.email,
        nghe_nghiep: normalizeVietnameseText(p.ngheNghiep) || prev.nghe_nghiep,
        dia_chi_duong: normalizeVietnameseText(p.diaChiDuong) || prev.dia_chi_duong,
        dia_chi_xa: normalizeVietnameseText(p.diaChiXa) || prev.dia_chi_xa,
        dia_chi_huyen: normalizeVietnameseText(p.diaChiHuyen) || prev.dia_chi_huyen,
        dia_chi_tinh: normalizeVietnameseText(p.diaChiTinh) || prev.dia_chi_tinh,
        dan_toc: normalizeVietnameseText(p.danToc) || prev.dan_toc,
        quoc_tich: normalizeVietnameseText(p.quocTich) || prev.quoc_tich,
        quoc_gia: normalizeVietnameseText(p.quocGia) || prev.quoc_gia,
        nguoi_lien_he_khan_cap: normalizeVietnameseText(p.nguoiLienHeKhanCap) || prev.nguoi_lien_he_khan_cap,
        sdt_lien_he_khan_cap: p.sdtLienHeKhanCap || prev.sdt_lien_he_khan_cap,
        quan_he_lien_he_khan_cap: normalizeVietnameseText(p.quanHeLienHeKhanCap) || prev.quan_he_lien_he_khan_cap,
        nguoi_giam_ho: normalizeVietnameseText(p.nguoiGiamHo) || prev.nguoi_giam_ho,
        sdt_giam_ho: p.sdtGiamHo || prev.sdt_giam_ho,
        quan_he_giam_ho: normalizeVietnameseText(p.quanHeGiamHo) || prev.quan_he_giam_ho,
        ghi_chu_dinh_danh: normalizeVietnameseText(p.ghiChuDinhDanh) || prev.ghi_chu_dinh_danh,
      }));

      if (todayRecord?.id) {
        setSelectedEncounter({
          id: todayRecord.id,
          maHs: todayRecord.maHs || "",
          trangThai: todayRecord.trangThai || "",
          khuTiepDon: todayRecord.khuTiepDon || null,
          quayTiepDon: todayRecord.quayTiepDon || null,
          isOtherArea: todayRecord.isOtherArea === true,
          canEditEncounter: true,
          canCancel: true,
          canSelectService: true,
        });

        if (todayRecord.isOtherArea) {
          const areaName = todayRecord.khuTiepDon?.tenKhu || todayRecord.khuTiepDon?.maKhu || "khu khác";
          setNotice({
            type: "warning",
            text: `Bệnh nhân đang có hồ sơ trong ngày tại ${areaName}. Nếu nhận sang khu hiện tại, cần nhập lý do chuyển/nhận khu.`,
          });
        }
      }
    }, 650);

    return () => clearTimeout(lookupTimer);
  }, [form.cccd, form.so_dien_thoai, form.ma_bn, form.ho_ten, form.ngay_sinh, form.gioi_tinh, form.id_khu_tiep_don, form.ma_khu_tiep_don]);

  useEffect(() => {
    const keyword = normalize(form.dia_chi_xa);
    if (!keyword) {
      setWardSuggestions([]);
      setWardSuggestLoading(false);
      setWardSuggestError("");
      return;
    }

    let ignore = false;
    const timer = setTimeout(async () => {
      setWardSuggestLoading(true);
      setWardSuggestError("");
      const res = await searchWardLocationsV2(keyword, 12);
      if (ignore) return;

      setWardSuggestLoading(false);
      if (!res || !res.ok) {
        setWardSuggestions([]);
        setWardSuggestError(res?.message || "Không kết nối được API gợi ý xã/phường.");
        return;
      }

      setWardSuggestions(Array.isArray(res.data) ? res.data : []);
      setWardSuggestError("");
    }, 260);

    return () => {
      ignore = true;
      clearTimeout(timer);
    };
  }, [form.dia_chi_xa]);

  const setFormField = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => (prev[name] ? { ...prev, [name]: "" } : prev));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (selectedEncounter && ["ma_bn", "ho_ten", "cccd", "so_dien_thoai"].includes(name)) {
      setSelectedEncounter(null);
    }
    if (name === "id_khu_tiep_don") {
      const nextArea = receptionAreas.find((area) => String(area.id) === String(value)) || null;
      const nextCounter = getDefaultCounter(nextArea, {});
      setForm((prev) => ({
        ...prev,
        ...buildAreaFormPatch(nextArea, nextCounter),
        ly_do_chuyen_khu: "",
      }));
      setErrors((prev) => ({
        ...prev,
        id_khu_tiep_don: "",
        id_quay_tiep_don: "",
        ly_do_chuyen_khu: "",
      }));
      return;
    }

    if (name === "id_quay_tiep_don") {
      const nextCounter = (selectedArea?.counters || []).find((counter) => String(counter.id) === String(value)) || null;
      setForm((prev) => ({
        ...prev,
        id_quay_tiep_don: nextCounter?.id ? String(nextCounter.id) : "",
        ma_quay_tiep_don: nextCounter?.maQuay || "",
        ten_quay_tiep_don: nextCounter?.tenQuay || "",
        quay_tiep_don: nextCounter?.tenQuay || nextCounter?.maQuay || "",
      }));
      setErrors((prev) => ({ ...prev, id_quay_tiep_don: "" }));
      return;
    }

    if (name === "nguon_tiep_nhan") {
      const isEmergencySource = isMucCapCuu(value);
      setForm((prev) => ({
        ...prev,
        [name]: value,
        ma_lich_hen: isNguonDatLich(value) ? prev.ma_lich_hen : "",
        loai_kham:
          isEmergencySource
            ? "Cấp cứu"
            : isMucCapCuu(prev.nguon_tiep_nhan) && isMucCapCuu(prev.loai_kham)
              ? "Khám mới"
              : prev.loai_kham,
        muc_uu_tien:
          isEmergencySource
            ? "Cấp cứu"
            : isMucCapCuu(prev.nguon_tiep_nhan) && isMucCapCuu(prev.muc_uu_tien)
              ? "Thường"
              : prev.muc_uu_tien,
      }));
      setErrors((prev) => ({ ...prev, [name]: "", ma_lich_hen: "", loai_kham: "", muc_uu_tien: "" }));
      return;
    }

    if (name === "loai_kham") {
      const isEmergencyVisit = isMucCapCuu(value);
      setForm((prev) => ({
        ...prev,
        [name]: value,
        muc_uu_tien: isEmergencyVisit ? "Cấp cứu" : prev.muc_uu_tien,
      }));
      setErrors((prev) => ({ ...prev, [name]: "", muc_uu_tien: "" }));
      return;
    }

    if (name === "doi_tuong_thanh_toan") {
      setForm((prev) => ({
        ...prev,
        [name]: value,
        so_the_bhyt: isThanhToanBaoHiem(value) ? prev.so_the_bhyt : "",
        han_bhyt: isThanhToanBaoHiem(value) ? prev.han_bhyt : "",
        noi_dang_ky_kcb: isThanhToanBaoHiem(value) ? prev.noi_dang_ky_kcb : "",
        tuyen_kham: isThanhToanBaoHiem(value) ? prev.tuyen_kham : "",
        giay_chuyen_tuyen: isThanhToanBaoHiem(value) ? prev.giay_chuyen_tuyen : "",
      }));
      setErrors((prev) => ({ ...prev, [name]: "", so_the_bhyt: "", han_bhyt: "" }));
      return;
    }

    setFormField(name, value);
  };

  const handleInsuranceModeChange = (enabled) => {
    const value = enabled ? PAYMENT_INSURANCE : PAYMENT_SELF_PAY;
    setForm((prev) => ({
      ...prev,
      doi_tuong_thanh_toan: value,
      so_the_bhyt: enabled ? prev.so_the_bhyt : "",
      han_bhyt: enabled ? prev.han_bhyt : "",
      noi_dang_ky_kcb: enabled ? prev.noi_dang_ky_kcb : "",
      tuyen_kham: enabled ? prev.tuyen_kham : "",
      giay_chuyen_tuyen: enabled ? prev.giay_chuyen_tuyen : "",
    }));
    setErrors((prev) => ({
      ...prev,
      doi_tuong_thanh_toan: "",
      so_the_bhyt: "",
      han_bhyt: "",
      noi_dang_ky_kcb: "",
      tuyen_kham: "",
      giay_chuyen_tuyen: "",
    }));
  };

  const handleVitalChange = (e) => {
    const { name, value } = e.target;
    setVital((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleWardSelect = (item) => {
    if (!item) return;
    setForm((prev) => ({
      ...prev,
      dia_chi_xa: item.nameWithType || item.name || prev.dia_chi_xa,
      dia_chi_tinh: item.provinceName || prev.dia_chi_tinh,
    }));
    setErrors((prev) => ({ ...prev, dia_chi_xa: "" }));
  };

  const applyEncounterToForm = useCallback(
    (record, withNotice = true) => {
      if (!record) return;
      setSelectedEncounter({
        id: record?.id,
        maHs: record?.maHs || "",
        trangThai: record?.trangThai || "",
        khuTiepDon: record?.khuTiepDon || null,
        quayTiepDon: record?.quayTiepDon || null,
        isOtherArea: record?.isOtherArea === true,
        canEditEncounter: record?.canEditEncounter !== false,
        canCancel: record?.canCancel !== false,
        canSelectService: record?.canSelectService !== false,
      });
      setForm((prev) => ({
        ...prev,
        ma_bn: record?.benhNhan?.maBn || prev.ma_bn,
        ho_ten: normalizeVietnameseText(record?.benhNhan?.hoTen) || prev.ho_ten,
        ngay_sinh: toInputDate(record?.benhNhan?.ngaySinh) || prev.ngay_sinh,
        gioi_tinh: normalizeVietnameseText(record?.benhNhan?.gioiTinh) || prev.gioi_tinh,
        cccd: record?.benhNhan?.cccd || prev.cccd,
        so_dien_thoai: record?.benhNhan?.soDienThoai || prev.so_dien_thoai,
        loai_kham: toCanonicalLoaiKham(record?.loaiKham || prev.loai_kham),
        nguon_tiep_nhan: toCanonicalNguon(record?.nguonTiepNhan || prev.nguon_tiep_nhan),
        muc_uu_tien: toCanonicalUuTien(record?.mucUuTien || prev.muc_uu_tien),
        ly_do_kham: normalizeVietnameseText(record?.lyDoKham) || prev.ly_do_kham,
        trieu_chung_ban_dau: normalizeVietnameseText(record?.trieuChungBanDau) || prev.trieu_chung_ban_dau,
        muc_do_dau: normalize(record?.mucDoDau) || prev.muc_do_dau,
        doi_tuong_thanh_toan: toCanonicalThanhToan(record?.doiTuongThanhToan || prev.doi_tuong_thanh_toan),
        ghi_chu_tiep_don: normalizeVietnameseText(record?.ghiChuTiepDon) || prev.ghi_chu_tiep_don,
        ly_do_tao_them_luot: normalizeVietnameseText(record?.lyDoTaoThemLuotTrongNgay) || prev.ly_do_tao_them_luot,
        ma_lich_hen: record?.appointmentCode || prev.ma_lich_hen,
        email: normalizeVietnameseText(record?.benhNhan?.email) || prev.email,
        nghe_nghiep: normalizeVietnameseText(record?.benhNhan?.ngheNghiep) || prev.nghe_nghiep,
        dia_chi_duong: normalizeVietnameseText(record?.benhNhan?.diaChiDuong) || prev.dia_chi_duong,
        dia_chi_xa: normalizeVietnameseText(record?.benhNhan?.diaChiXa) || prev.dia_chi_xa,
        dia_chi_huyen: normalizeVietnameseText(record?.benhNhan?.diaChiHuyen) || prev.dia_chi_huyen,
        dia_chi_tinh: normalizeVietnameseText(record?.benhNhan?.diaChiTinh) || prev.dia_chi_tinh,
        dan_toc: normalizeVietnameseText(record?.benhNhan?.danToc) || prev.dan_toc,
        quoc_gia: normalizeVietnameseText(record?.benhNhan?.quocGia) || prev.quoc_gia,
        nguoi_lien_he_khan_cap: normalizeVietnameseText(record?.benhNhan?.nguoiLienHeKhanCap) || prev.nguoi_lien_he_khan_cap,
        sdt_lien_he_khan_cap: record?.benhNhan?.sdtLienHeKhanCap || prev.sdt_lien_he_khan_cap,
        quan_he_lien_he_khan_cap: normalizeVietnameseText(record?.benhNhan?.quanHeLienHeKhanCap) || prev.quan_he_lien_he_khan_cap,
        nguoi_giam_ho: normalizeVietnameseText(record?.benhNhan?.nguoiGiamHo) || prev.nguoi_giam_ho,
        sdt_giam_ho: record?.benhNhan?.sdtGiamHo || prev.sdt_giam_ho,
        quan_he_giam_ho: normalizeVietnameseText(record?.benhNhan?.quanHeGiamHo) || prev.quan_he_giam_ho,
        ghi_chu_dinh_danh: normalizeVietnameseText(record?.benhNhan?.ghiChuDinhDanh) || prev.ghi_chu_dinh_danh,
        id_khu_tiep_don: record?.khuTiepDon?.id ? String(record.khuTiepDon.id) : prev.id_khu_tiep_don,
        ma_khu_tiep_don: normalizeVietnameseText(record?.khuTiepDon?.maKhu) || prev.ma_khu_tiep_don,
        ten_khu_tiep_don: normalizeVietnameseText(record?.khuTiepDon?.tenKhu) || prev.ten_khu_tiep_don,
        id_quay_tiep_don: record?.quayTiepDon?.id ? String(record.quayTiepDon.id) : prev.id_quay_tiep_don,
        ma_quay_tiep_don: normalizeVietnameseText(record?.quayTiepDon?.maQuay) || prev.ma_quay_tiep_don,
        ten_quay_tiep_don: normalizeVietnameseText(record?.quayTiepDon?.tenQuay) || prev.ten_quay_tiep_don,
        quay_tiep_don: normalizeVietnameseText(record?.quayTiepDon?.tenQuay || record?.quayTiepDon?.maQuay) || prev.quay_tiep_don,
        ly_do_chuyen_khu: normalizeVietnameseText(record?.lyDoChuyenKhu) || "",
      }));
      setVital((prev) => ({
        ...prev,
        mucDoDau: normalize(record?.mucDoDau) || prev.mucDoDau,
      }));
      setErrors({});
      if (withNotice) {
        setNotice({ type: "success", text: "Đã nạp hồ sơ vào form." });
      }
    },
    []
  );

  useEffect(() => {
    if (viewMode !== "form") return;
    const prefill = location.state?.prefillEncounter;
    if (!prefill) return;
    applyEncounterToForm(prefill, true);
    navigate(location.pathname, { replace: true, state: null });
  }, [applyEncounterToForm, location.pathname, location.state, navigate, viewMode]);

  const resetForm = () => {
    const currentArea = receptionAreas.find((area) => String(area.id) === String(form.id_khu_tiep_don))
      || receptionAreas.find((area) => area.isDefault)
      || receptionAreas[0]
      || null;
    const currentCounter = (currentArea?.counters || []).find((counter) => String(counter.id) === String(form.id_quay_tiep_don))
      || getDefaultCounter(currentArea, {});
    setForm({ ...EMPTY_FORM, ...buildAreaFormPatch(currentArea, currentCounter) });
    setVital(EMPTY_VITAL);
    setSelectedEncounter(null);
    setWardSuggestions([]);
    setWardSuggestLoading(false);
    setWardSuggestError("");
    setErrors({});
    setNotice({ type: "", text: "" });
  };

  const handleClearForm = () => {
    const currentArea = receptionAreas.find((area) => String(area.id) === String(form.id_khu_tiep_don))
      || receptionAreas.find((area) => area.isDefault)
      || receptionAreas[0]
      || null;
    const currentCounter = (currentArea?.counters || []).find((counter) => String(counter.id) === String(form.id_quay_tiep_don))
      || getDefaultCounter(currentArea, {});
    const emptyWithArea = { ...EMPTY_FORM, ...buildAreaFormPatch(currentArea, currentCounter) };
    const hasDirty = JSON.stringify(form) !== JSON.stringify(emptyWithArea) || JSON.stringify(vital) !== JSON.stringify(EMPTY_VITAL);
    if (!hasDirty) {
      resetForm();
      return;
    }
    setConfirmClearModal(true);
  };

  const saveFlow = async (moveToService) => {
    if (!canSave) {
      setNotice({ type: "error", text: "Bạn không có quyền lưu tiếp đón." });
      return;
    }
    if (selectedEncounter && selectedEncounter.canEditEncounter === false) {
      setNotice({ type: "error", text: "Hồ sơ hiện tại đã khóa chỉnh sửa cho vai trò tiếp đón." });
      return;
    }

    const validationErrors = validate(form, vital);
    if (isSelectedEncounterOtherArea && !normalize(form.ly_do_chuyen_khu)) {
      validationErrors.ly_do_chuyen_khu = "Cần nhập lý do chuyển/nhận hồ sơ sang khu hiện tại.";
    }
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) {
      const messages = Array.from(new Set(Object.values(validationErrors).filter(Boolean)));
      const extraFieldNames = new Set([
        "nguon_tiep_nhan",
        "loai_kham",
        "muc_uu_tien",
        "nguoi_giam_ho",
        "sdt_giam_ho",
        "sdt_lien_he_khan_cap",
      ]);
      if (Object.keys(validationErrors).some((key) => extraFieldNames.has(key))) {
        setExtraInfoCollapsed(false);
      }
      setNotice({
        type: "error",
        text: `Cần kiểm tra: ${messages.join(" ")}`,
      });
      const firstInvalidField = Object.keys(validationErrors)[0];
      window.setTimeout(() => {
        const element = document.querySelector(`[name="${firstInvalidField}"]`);
        element?.scrollIntoView?.({ behavior: "smooth", block: "center" });
        element?.focus?.();
      }, 0);
      return;
    }

    const mode = moveToService ? "move-service" : "save-only";
    const requestId = generateIdempotencyKey(`reception-${mode}`);
    setSavingMode(mode);
    setNotice({ type: "", text: "" });

    const patientPayload = {
      ho_ten: normalize(form.ho_ten) || null,
      ngay_sinh: normalize(form.ngay_sinh) || null,
      gioi_tinh: normalize(form.gioi_tinh) || null,
      cccd: normalize(form.cccd) || null,
      so_dien_thoai: normalize(form.so_dien_thoai) || null,
      email: normalize(form.email) || null,
      nghe_nghiep: normalize(form.nghe_nghiep) || null,
      dia_chi_duong: normalize(form.dia_chi_duong) || null,
      dia_chi_xa: normalize(form.dia_chi_xa) || null,
      dia_chi_huyen: normalize(form.dia_chi_huyen) || null,
      dia_chi_tinh: normalize(form.dia_chi_tinh) || null,
      dan_toc: normalize(form.dan_toc) || null,
      quoc_tich: normalize(form.quoc_tich) || null,
      quoc_gia: normalize(form.quoc_gia) || "Việt Nam",
      nguoi_lien_he_khan_cap: normalize(form.nguoi_lien_he_khan_cap) || null,
      sdt_lien_he_khan_cap: normalize(form.sdt_lien_he_khan_cap) || null,
      quan_he_lien_he_khan_cap: normalize(form.quan_he_lien_he_khan_cap) || null,
      nguoi_giam_ho: normalize(form.nguoi_giam_ho) || null,
      sdt_giam_ho: normalize(form.sdt_giam_ho) || null,
      quan_he_giam_ho: normalize(form.quan_he_giam_ho) || null,
      ghi_chu_dinh_danh: normalize(form.ghi_chu_dinh_danh) || null,
      idempotencyKey: `${requestId}-patient`,
    };

    const patientRes = await upsertPatientV2(patientPayload);
    if (!patientRes) {
      setSavingMode("");
      setNotice({ type: "error", text: "Không kết nối được API bệnh nhân." });
      return;
    }
    if (patientRes.status >= 400) {
      const message = typeof patientRes.data === "string" ? patientRes.data : patientRes.data?.message || "Không lưu được bệnh nhân.";
      setSavingMode("");
      setNotice({ type: "error", text: message });
      return;
    }

    const patient = patientRes.data?.patient;
    if (!patient?.id) {
      setSavingMode("");
      setNotice({ type: "error", text: "Không nhận được mã bệnh nhân từ hệ thống." });
      return;
    }

    const encounterPayload = toEncounterPayload(
      form,
      vital,
      Number(patient.id),
      moveToService,
      selectedEncounter?.id || null,
      `${requestId}-encounter`
    );
    const encounterRes = await saveEncounterV2(encounterPayload);
    setSavingMode("");

    if (!encounterRes) {
      setNotice({ type: "error", text: "Không kết nối được API tạo hồ sơ tiếp đón." });
      return;
    }

    if (encounterRes.status >= 400) {
      const state = encounterRes.data?.state;
      const message = typeof encounterRes.data === "string"
        ? encounterRes.data
        : encounterRes.data?.message || "Không tạo được hồ sơ tiếp đón.";

      const conflictEncounter = encounterRes.data?.encounter;
      if (conflictEncounter?.id) {
        setSelectedEncounter({
          id: conflictEncounter.id,
          maHs: conflictEncounter.maHs || "",
          trangThai: conflictEncounter.trangThai || "",
          khuTiepDon: conflictEncounter.khuTiepDon || null,
          quayTiepDon: conflictEncounter.quayTiepDon || null,
          isOtherArea: state === "ACTIVE_ENCOUNTER_IN_OTHER_AREA",
          canEditEncounter: true,
          canCancel: true,
          canSelectService: true,
        });
      }

      if (state === "NEED_AREA_TRANSFER_REASON") {
        setErrors((prev) => ({
          ...prev,
          ly_do_chuyen_khu: "Cần nhập lý do chuyển/nhận hồ sơ sang khu hiện tại.",
        }));
        setNotice({ type: "warning", text: message });
      } else if (state === "ACTIVE_ENCOUNTER_EXISTS" || state === "ACTIVE_ENCOUNTER_IN_OTHER_AREA" || state === "NEED_ADDITIONAL_VISIT_REASON") {
        setWarningModal({
          open: true,
          title: "Không thể tạo hồ sơ mới",
          message,
        });
      } else {
        setNotice({ type: "error", text: message });
      }
      return;
    }

    const encounter = encounterRes.data?.encounter;
    if (encounter?.id) {
      setSelectedEncounter((prev) => ({
        id: Number(encounter.id),
        maHs: encounter.maHs || prev?.maHs || "",
        trangThai: encounter.trangThai || prev?.trangThai || "",
        khuTiepDon: encounter.khuTiepDon || prev?.khuTiepDon || null,
        quayTiepDon: encounter.quayTiepDon || prev?.quayTiepDon || null,
        isOtherArea: false,
        canEditEncounter: true,
        canCancel: true,
        canSelectService: true,
      }));
    }
    setNotice({
      type: "success",
      text: encounterRes.data?.message || "Lưu tiếp đón thành công.",
    });

    await loadList();

    if (moveToService && encounter?.id) {
      navigate("/tiep-don/chi-dinh", {
        state: {
          patient: {
            idBenhNhan: Number(patient.id),
            idHoSo: Number(encounter.id),
            maBn: patient.maBn || "",
            maHs: encounter.maHs || "",
            hoTen: patient.hoTen || "",
            gioiTinh: patient.gioiTinh || "",
            ngaySinh: patient.ngaySinh || "",
            soDienThoai: patient.soDienThoai || "",
            mucUuTien: form.muc_uu_tien,
            trangThaiHoSo: encounter.trangThai || "",
            khuTiepDon: encounter.khuTiepDon || selectedEncounter?.khuTiepDon || null,
            quayTiepDon: encounter.quayTiepDon || selectedEncounter?.quayTiepDon || null,
          },
        },
      });
    }
  };

  const handleOpenTimeline = async (record) => {
    if (!record?.id) return;
    setTimelineModal({
      open: true,
      loading: true,
      record,
      logs: [],
      error: "",
    });

    const result = await getEncounterTimelineV2(record.id, 120);
    if (!result?.ok) {
      setTimelineModal((prev) => ({
        ...prev,
        loading: false,
        logs: [],
        error: result?.message || "Không tải được timeline.",
      }));
      return;
    }

    setTimelineModal((prev) => ({
      ...prev,
      loading: false,
      logs: result.data || [],
      error: "",
    }));
  };

  const handleCancelEncounter = async () => {
    if (!cancelModal.record?.id) return;
    const modalErrors = {};
    if (!normalize(cancelModal.maLyDoHuy)) modalErrors.maLyDoHuy = "Vui lòng chọn lý do hủy.";
    if (normalize(cancelModal.maLyDoHuy) === "KHAC" && !normalize(cancelModal.ghiChu)) {
      modalErrors.ghiChu = "Khi chọn Lý do khác, bạn cần nhập ghi chú.";
    }
    if (Object.keys(modalErrors).length) {
      setCancelModal((prev) => ({ ...prev, errors: modalErrors }));
      return;
    }

    const res = await cancelEncounterV2(cancelModal.record.id, {
      maLyDoHuy: normalize(cancelModal.maLyDoHuy),
      lyDoHuy: normalize(cancelModal.lyDoHuy) || null,
      ghiChu: normalize(cancelModal.ghiChu) || null,
    });

    if (!res) {
      setNotice({ type: "error", text: "Không kết nối được API hủy hồ sơ." });
    } else if (res.status >= 400) {
      const message = typeof res.data === "string" ? res.data : res.data?.message || "Hủy hồ sơ thất bại.";
      setNotice({ type: "error", text: message });
    } else {
      setNotice({ type: "success", text: res.data?.message || "Đã hủy hồ sơ thành công." });
    }

    setCancelModal({
      open: false,
      record: null,
      maLyDoHuy: "",
      lyDoHuy: "",
      ghiChu: "",
      errors: {},
    });

    await loadList();
  };

  const handleExport = async () => {
    if (!canExport) {
      setNotice({ type: "error", text: "Bạn không có quyền xuất dữ liệu." });
      return;
    }
    if (total === 0) {
      setNotice({ type: "warning", text: "Không có dữ liệu phù hợp để xuất." });
      return;
    }
    setExporting(true);
    const res = await exportEncounterV2({
      tab: activeTab,
      date: filterDate || undefined,
      keyword: debouncedKeyword || undefined,
      status: statusFilter,
      loaiKham: loaiKhamFilter === "ALL" ? undefined : loaiKhamFilter,
      nguonTiepNhan: nguonFilter === "ALL" ? undefined : nguonFilter,
      idKhuTiepDon: areaFilter === "ALL" ? undefined : Number(areaFilter),
    });
    setExporting(false);

    if (!res) {
      setNotice({ type: "error", text: "Không kết nối được API export." });
      return;
    }
    if (res.status >= 400) {
      setNotice({ type: "error", text: "Xuất dữ liệu thất bại." });
      return;
    }

    const fallback = `tiuv-reception-${filterDate || getTodayKey()}.csv`;
    const fileName = parseFileName(res.headers?.["content-disposition"], fallback);
    const blobUrl = URL.createObjectURL(res.data);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(blobUrl);
    setNotice({ type: "success", text: "Xuất Excel thành công." });
  };

  const age = calcAge(form.ngay_sinh);
  const showListPanel = viewMode !== "form";
  const showFormPanel = viewMode !== "list";
  const showQuickNav = false;

  useEffect(() => {
    if (!showFormPanel) return;

    const focusByName = (name) => {
      const el = document.querySelector(`[name="${name}"]`);
      if (!el) return;
      el.focus();
      if (typeof el.select === "function") el.select();
    };

    const handleShortcut = (e) => {
      const key = (e.key || "").toUpperCase();
      if (!key.startsWith("F")) return;

      if (key === "F1") {
        e.preventDefault();
        if (savingMode === "") {
          const saveBtn = document.getElementById("btn-save-reception");
          saveBtn?.click();
        }
      } else if (key === "F2") {
        e.preventDefault();
        focusByName("cccd");
      } else if (key === "F4") {
        e.preventDefault();
        if (savingMode === "") {
          const saveBtn = document.getElementById("btn-save-reception");
          saveBtn?.click();
        }
      } else if (key === "F6") {
        e.preventDefault();
        focusByName("ho_ten");
      } else if (key === "F7") {
        e.preventDefault();
        if (!isThanhToanBaoHiem(form.doi_tuong_thanh_toan)) {
          setFormField("doi_tuong_thanh_toan", PAYMENT_INSURANCE);
          setTimeout(() => focusByName("so_the_bhyt"), 0);
        } else {
          focusByName("so_the_bhyt");
        }
      } else if (key === "F8") {
        e.preventDefault();
        focusByName("nguoi_lien_he_khan_cap");
      }
    };

    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, [form.doi_tuong_thanh_toan, savingMode, showFormPanel]);

  if (permLoading) {
    return <div className="p-8 text-center text-sm text-slate-500">Đang kiểm tra quyền truy cập...</div>;
  }

  if (!canView) {
    return <div className="p-8 text-center text-lg font-semibold text-rose-600">Bạn không có quyền xem màn tiếp đón.</div>;
  }

  return (
    <MainLayout>
      <div
        className={`h-[calc(100vh-90px)] w-full bg-gradient-to-b from-sky-50 via-white to-cyan-50 p-3 ${
          viewMode === "form" ? "overflow-hidden" : "overflow-y-auto"
        }`}
      >
        <div className={`${viewMode === "form" ? "flex h-full min-h-0 flex-col gap-3" : "space-y-4"}`}>
          {notice.text && notice.type !== "error" && <Notice type={notice.type} text={notice.text} />}
          {notice.text && notice.type === "error" && (
            <ErrorNoticeModal text={notice.text} onClose={() => setNotice({ type: "", text: "" })} />
          )}

          <div
            className={`grid min-h-0 grid-cols-1 gap-3 ${
              showListPanel && showFormPanel ? "xl:grid-cols-5" : "xl:grid-cols-1"
            }`}
          >
            {showListPanel && (
            <section className="w-full bg-white/70 p-3 xl:col-span-3">
              <div className="border-b border-slate-200 pb-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {TAB_OPTIONS.map((tab) => (
                      <button
                        key={tab.key}
                        type="button"
                        onClick={() => setActiveTab(tab.key)}
                        className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                          activeTab === tab.key
                            ? "bg-sky-600 text-white"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleExport}
                      disabled={!canExport || exporting || listLoading || total === 0}
                      className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Download size={14} />
                      {exporting ? "Đang xuất..." : "Xuất Excel"}
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        await loadList();
                      }}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      <RefreshCcw size={14} />
                      Làm mới
                    </button>
                  </div>
                </div>

                <div className="mt-3 space-y-2">
                  <div className="relative">
                    <Search size={14} className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      value={keyword}
                      onChange={(e) => setKeyword(e.target.value)}
                      placeholder="Tìm tên, mã BN, mã HS, SĐT, CCCD..."
                      className="w-full rounded-lg border border-slate-200 py-2 pl-8 pr-3 text-sm outline-none shadow-sm transition duration-200 hover:border-sky-300 focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="group relative">
                      <Calendar size={14} className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="date"
                        value={filterDate}
                        onChange={(e) => setFilterDate(e.target.value)}
                        className="w-full rounded-lg border border-slate-200 py-2 pl-8 pr-2 text-sm outline-none shadow-sm transition duration-200 hover:border-sky-300 focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
                      />
                    </div>
                    <AnimatedSelect
                      value={statusFilter}
                      onChange={(nextValue) => setStatusFilter(nextValue)}
                      options={STATUS_OPTIONS}
                      placeholder={"T\u1ea5t c\u1ea3 tr\u1ea1ng th\u00e1i"}
                      icon={<Filter size={14} />}
                      buttonClassName="!rounded-lg"
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                    <AnimatedSelect
                      value={loaiKhamFilter}
                      onChange={(nextValue) => setLoaiKhamFilter(nextValue)}
                      options={[
                        { value: "ALL", label: "T\u1ea5t c\u1ea3 lo\u1ea1i kh\u00e1m" },
                        ...loaiKhamOptions,
                      ]}
                      placeholder={"T\u1ea5t c\u1ea3 lo\u1ea1i kh\u00e1m"}
                      buttonClassName="!rounded-lg"
                    />
                    <AnimatedSelect
                      value={nguonFilter}
                      onChange={(nextValue) => setNguonFilter(nextValue)}
                      options={[
                        { value: "ALL", label: "T\u1ea5t c\u1ea3 ngu\u1ed3n ti\u1ebfp nh\u1eadn" },
                        ...nguonOptions,
                      ]}
                      placeholder={"T\u1ea5t c\u1ea3 ngu\u1ed3n ti\u1ebfp nh\u1eadn"}
                      buttonClassName="!rounded-lg"
                    />
                    <AnimatedSelect
                      value={areaFilter}
                      onChange={(nextValue) => setAreaFilter(nextValue)}
                      options={areaFilterOptions}
                      placeholder="Tất cả khu tiếp đón"
                      icon={<MapPin size={14} />}
                      buttonClassName="!rounded-lg"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-3 space-y-3 overflow-y-auto">
                {listLoading ? (
                  <ListSkeleton />
                ) : records.length === 0 ? (
                  <div className="mt-20 text-center text-sm italic text-slate-400">Không có hồ sơ phù hợp.</div>
                ) : (
                  <div className="space-y-3">
                    {records.map((record) => (
                      <EncounterCard
                        key={record.id}
                        record={record}
                        canSave={canSave}
                        canDelete={canDelete}
                        onPrefill={() => applyEncounterToForm(record, true)}
                        onTimeline={() => handleOpenTimeline(record)}
                        onSelectService={() => {
                          navigate("/tiep-don/chi-dinh", {
                            state: {
                              patient: {
                                idBenhNhan: record?.benhNhan?.idBenhNhan,
                                idHoSo: record?.id,
                                maBn: record?.benhNhan?.maBn,
                                maHs: record?.maHs,
                                hoTen: normalizeVietnameseText(record?.benhNhan?.hoTen),
                                gioiTinh: normalizeVietnameseText(record?.benhNhan?.gioiTinh),
                                ngaySinh: record?.benhNhan?.ngaySinh,
                                soDienThoai: record?.benhNhan?.soDienThoai,
                                mucUuTien: toCanonicalUuTien(record?.mucUuTien),
                                trangThaiHoSo: record?.trangThai,
                                khuTiepDon: record?.khuTiepDon || null,
                                quayTiepDon: record?.quayTiepDon || null,
                              },
                            },
                          });
                        }}
                        onCancel={() =>
                          setCancelModal({
                            open: true,
                            record,
                            maLyDoHuy: "",
                            lyDoHuy: "",
                            ghiChu: "",
                            errors: {},
                          })
                        }
                      />
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-3 text-xs text-slate-600">
                <span>
                  Trang {page}/{totalPages} • {total} hồ sơ
                </span>
                <div className="flex items-center gap-2">
                  <AnimatedSelect
                    value={String(pageSize)}
                    onChange={(nextValue) => setPageSize(Number(nextValue) || 20)}
                    options={[
                      { value: "10", label: "10/trang" },
                      { value: "20", label: "20/trang" },
                      { value: "50", label: "50/trang" },
                      { value: "100", label: "100/trang" },
                    ]}
                    size="sm"
                    buttonClassName="!rounded-md !py-1 !pr-7 !text-xs"
                    menuClassName="min-w-[110px]"
                  />
                  <button
                    type="button"
                    onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                    disabled={page <= 1 || listLoading}
                    className="rounded-md border border-slate-200 bg-white px-2 py-1 font-semibold disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Trước
                  </button>
                  <button
                    type="button"
                    onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                    disabled={page >= totalPages || listLoading}
                    className="rounded-md border border-slate-200 bg-white px-2 py-1 font-semibold disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Sau
                  </button>
                </div>
              </div>
            </section>
            )}

            {showFormPanel && (
            <section className={`w-full xl:col-span-3 ${viewMode === "form" ? "h-full min-h-0 overflow-hidden" : ""}`}>
              <div className="flex flex-wrap items-center justify-end gap-2 border-b border-slate-200 bg-white/70 px-2 pb-2">
                <div className="mr-auto flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => navigate("/tiep-don/nhap")}
                    className="inline-flex items-center gap-1 rounded-lg border border-sky-200 bg-sky-50 px-3 py-1 text-sm font-semibold text-sky-700 hover:bg-sky-100"
                    title="Tiếp đón"
                  >
                    <ClipboardCheck size={14} />
                    Tiếp đón
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate("/tiep-don/danh-sach")}
                    className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1 text-sm font-semibold text-indigo-700 hover:bg-indigo-100"
                    title="Danh sách tiếp đón"
                  >
                    <ListChecks size={14} />
                    Danh sách
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate("/tiep-don/huy")}
                    className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1 text-sm font-semibold text-rose-700 hover:bg-rose-100"
                    title="Hồ sơ hủy"
                  >
                    <Ban size={14} />
                    Hồ sơ hủy
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => navigate("/tiep-don/danh-sach")}
                  title="Đóng màn nhập và quay về danh sách tiếp đón"
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <Ban size={14} />
                  Đóng quầy
                </button>
                <button
                  type="button"
                  onClick={handleClearForm}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Làm trống form
                </button>
                <button
                  type="button"
                  id="btn-save-reception"
                  onClick={() => saveFlow(false)}
                  title={!canSave ? "Tài khoản hiện tại chưa có quyền lưu tiếp đón" : "Lưu hồ sơ tiếp đón"}
                  disabled={!canSave || savingMode !== ""}
                  className="rounded-lg border border-sky-300 bg-white px-3 py-1 text-sm font-semibold text-sky-700 hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {savingMode === "save-only" ? "Đang lưu..." : "Lưu tiếp đón"}
                </button>
                <button
                  type="button"
                  onClick={() => saveFlow(true)}
                  title={!canSave ? "Tài khoản hiện tại chưa có quyền lưu tiếp đón" : "Lưu hồ sơ rồi chuyển sang chọn dịch vụ"}
                  disabled={!canSave || savingMode !== ""}
                  className="rounded-lg bg-gradient-to-r from-sky-600 to-cyan-500 px-4 py-1 text-sm font-semibold text-white shadow-sm transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {savingMode === "move-service" ? "Đang xử lý..." : "Lưu tiếp đón & chọn dịch vụ"}
                </button>
              </div>

              {!canSave && (
                <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
                  Tài khoản hiện tại chỉ có quyền xem tiếp đón. Các thao tác lưu, chọn dịch vụ và hủy hồ sơ đã bị khóa.
                </div>
              )}

              {(lookupLoading || dictionaryLoading || areaLoading || selectedEncounter?.id) && (
                <div className="mt-1 space-y-1">
                  {lookupLoading && <p className="text-[11px] italic text-slate-500">Đang kiểm tra thông tin bệnh nhân...</p>}
                  {dictionaryLoading && <p className="text-[11px] italic text-slate-500">Đang đồng bộ danh mục tiếp đón...</p>}
                  {areaLoading && <p className="text-[11px] italic text-slate-500">Đang nạp danh mục khu/quầy tiếp đón...</p>}
                  {selectedEncounter?.id && (
                    <div className={`rounded-lg border px-2 py-1 text-[11px] ${isSelectedEncounterOtherArea ? "border-amber-200 bg-amber-50 text-amber-700" : "border-sky-200 bg-sky-50 text-sky-700"}`}>
                      Hồ sơ: <span className="font-semibold">{selectedEncounter.maHs || `#${selectedEncounter.id}`}</span>{" "}
                      • Trạng thái: <span className="font-semibold">{meta(normalizeStatus(selectedEncounter.trangThai)).label}</span>
                      {selectedEncounter.khuTiepDon && (
                        <>
                          {" "}• Khu hồ sơ: <span className="font-semibold">{selectedEncounter.khuTiepDon.tenKhu || selectedEncounter.khuTiepDon.maKhu}</span>
                        </>
                      )}
                      {isSelectedEncounterOtherArea && " • Cần lý do chuyển/nhận khu"}
                    </div>
                  )}
                </div>
              )}

              <div className={`${viewMode === "form" ? "mt-2 h-[calc(100%-78px)] overflow-hidden" : "mt-3"}`}>
                <div className={`${viewMode === "form" ? "flex h-full min-h-0 flex-col gap-2" : "space-y-2"}`}>
                  <PanelSection title="Chọn quầy tiếp đón" className="shrink-0">
                    <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-7">
                      <InputField label="Mã BN" name="ma_bn" value={form.ma_bn} onChange={handleChange} readOnly />
                      <InputField label="Mã HS" name="ma_hs_hien_tai" value={selectedEncounter?.maHs || ""} onChange={() => {}} readOnly />
                      <SelectField required label="Khu tiếp đón *" name="id_khu_tiep_don" value={form.id_khu_tiep_don} onChange={handleChange} options={areaOptions} error={errors.id_khu_tiep_don} />
                      <SelectField required label="Quầy tiếp đón *" name="id_quay_tiep_don" value={form.id_quay_tiep_don} onChange={handleChange} options={counterOptions} error={errors.id_quay_tiep_don} />
                      <SelectField required label="Đối tượng thanh toán *" name="doi_tuong_thanh_toan" value={form.doi_tuong_thanh_toan} onChange={handleChange} options={doiTuongThanhToanOptions} error={errors.doi_tuong_thanh_toan} />
                      <InputField
                        required={isNguonDatLich(form.nguon_tiep_nhan)}
                        label={isNguonDatLich(form.nguon_tiep_nhan) ? "Mã lịch hẹn *" : "Mã lịch hẹn"}
                        name="ma_lich_hen"
                        value={form.ma_lich_hen}
                        onChange={handleChange}
                        error={errors.ma_lich_hen}
                      />
                      <InputField label="CCCD" name="cccd" value={form.cccd} onChange={handleChange} error={errors.cccd} />
                    </div>
                    <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-5">
                      <InputField required label="Họ tên *" name="ho_ten" value={form.ho_ten} onChange={handleChange} error={errors.ho_ten} />
                      <InputField required label="Số điện thoại *" name="so_dien_thoai" value={form.so_dien_thoai} onChange={handleChange} error={errors.so_dien_thoai} />
                      <InputField required type="date" label="Ngày sinh *" name="ngay_sinh" value={form.ngay_sinh} onChange={handleChange} error={errors.ngay_sinh} />
                      <SelectField required label="Giới tính *" name="gioi_tinh" value={form.gioi_tinh} onChange={handleChange} options={GIOI_TINH_OPTIONS} error={errors.gioi_tinh} />
                      <InputField label="Email" name="email" value={form.email} onChange={handleChange} error={errors.email} />
                    </div>
                    <div className="mt-2 grid grid-cols-1 gap-2 xl:grid-cols-2">
                      <TextAreaField required rows={1} label="Lý do khám *" name="ly_do_kham" value={form.ly_do_kham} onChange={handleChange} error={errors.ly_do_kham} />
                      <div className="grid grid-cols-2 gap-2">
                        <label className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700">
                          <input
                            type="checkbox"
                            checked={isMucUuTien(form.muc_uu_tien)}
                            onChange={(e) => setFormField("muc_uu_tien", e.target.checked ? "Ưu tiên" : "Thường")}
                          />
                          Ưu tiên
                        </label>
                        <label className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700">
                          <input
                            type="checkbox"
                            checked={isMucCapCuu(form.muc_uu_tien)}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setForm((prev) => ({
                                ...prev,
                                muc_uu_tien: checked ? "Cấp cứu" : "Thường",
                                loai_kham: checked ? "Cấp cứu" : isMucCapCuu(prev.loai_kham) ? "Khám mới" : prev.loai_kham,
                              }));
                              setErrors((prev) => ({ ...prev, muc_uu_tien: "", loai_kham: "" }));
                            }}
                          />
                          Cấp cứu
                        </label>
                      </div>
                      {isSelectedEncounterOtherArea && (
                        <div className="xl:col-span-2">
                          <TextAreaField
                            required
                            rows={1}
                            label="Lý do chuyển/nhận khu *"
                            name="ly_do_chuyen_khu"
                            value={form.ly_do_chuyen_khu}
                            onChange={handleChange}
                            error={errors.ly_do_chuyen_khu}
                          />
                        </div>
                      )}
                    </div>
                  </PanelSection>

                  <div className={`${viewMode === "form" ? "relative grid min-h-0 flex-1 grid-cols-1 gap-2 pr-9 xl:grid-cols-12" : "relative grid grid-cols-1 gap-2 pr-9 xl:grid-cols-12"}`}>
                    <PanelSection
                      title="Thông tin cá nhân"
                      hint="Nhấn [F6]"
                      className={`${extraInfoCollapsed ? "xl:col-span-6" : "xl:col-span-4"} min-h-0`}
                      scrollable
                    >
                      <div className="grid grid-cols-1 gap-2">
                        <InputField label="Địa chỉ đường" name="dia_chi_duong" value={form.dia_chi_duong} onChange={handleChange} />
                        <WardAutocompleteField
                          label="Xã/Phường"
                          value={form.dia_chi_xa}
                          onChange={(value) => setFormField("dia_chi_xa", value)}
                          onSelect={handleWardSelect}
                          options={wardSuggestions}
                          loading={wardSuggestLoading}
                          apiError={wardSuggestError}
                        />
                        <InputField label="Quận/Huyện" name="dia_chi_huyen" value={form.dia_chi_huyen} onChange={handleChange} />
                        <InputField label="Tỉnh/Thành" name="dia_chi_tinh" value={form.dia_chi_tinh} onChange={handleChange} />
                        <InputField label="Nghề nghiệp" name="nghe_nghiep" value={form.nghe_nghiep} onChange={handleChange} />
                        <InputField label="Dân tộc" name="dan_toc" value={form.dan_toc} onChange={handleChange} />
                        <InputField label="Quốc gia" name="quoc_gia" value={form.quoc_gia} onChange={handleChange} />
                      </div>
                    </PanelSection>

                    <PanelSection
                      title="Thông tin BHYT"
                      hint="Nhấn [F7]"
                      className={`${extraInfoCollapsed ? "xl:col-span-6" : "xl:col-span-4"} min-h-0`}
                      scrollable
                    >
                      <div className="grid grid-cols-1 gap-2">
                        <div
                          className="grid grid-cols-2 rounded-lg border border-slate-200 bg-slate-100 p-1"
                          role="group"
                          aria-label="Tình trạng bảo hiểm y tế"
                        >
                          <button
                            type="button"
                            onClick={() => handleInsuranceModeChange(false)}
                            className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                              !isThanhToanBaoHiem(form.doi_tuong_thanh_toan)
                                ? "bg-white text-slate-800 shadow-sm"
                                : "text-slate-500 hover:text-slate-700"
                            }`}
                            aria-pressed={!isThanhToanBaoHiem(form.doi_tuong_thanh_toan)}
                          >
                            Không BHYT
                          </button>
                          <button
                            type="button"
                            onClick={() => handleInsuranceModeChange(true)}
                            className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                              isThanhToanBaoHiem(form.doi_tuong_thanh_toan)
                                ? "bg-sky-600 text-white shadow-sm"
                                : "text-slate-500 hover:text-slate-700"
                            }`}
                            aria-pressed={isThanhToanBaoHiem(form.doi_tuong_thanh_toan)}
                          >
                            Có BHYT
                          </button>
                        </div>
                        {!isThanhToanBaoHiem(form.doi_tuong_thanh_toan) && (
                          <p className="rounded-lg border border-sky-100 bg-sky-50 px-3 py-2 text-xs text-sky-800">
                            Người bệnh không sử dụng BHYT. Các thông tin thẻ không bắt buộc.
                          </p>
                        )}
                        <fieldset
                          disabled={!isThanhToanBaoHiem(form.doi_tuong_thanh_toan)}
                          className={`grid grid-cols-1 gap-2 ${
                            isThanhToanBaoHiem(form.doi_tuong_thanh_toan) ? "" : "opacity-50"
                          }`}
                        >
                        <InputField
                          required={isThanhToanBaoHiem(form.doi_tuong_thanh_toan)}
                          label={isThanhToanBaoHiem(form.doi_tuong_thanh_toan) ? "Số thẻ BHYT *" : "Số thẻ BHYT"}
                          name="so_the_bhyt"
                          value={form.so_the_bhyt}
                          onChange={handleChange}
                          error={errors.so_the_bhyt}
                        />
                        <InputField
                          required={isThanhToanBaoHiem(form.doi_tuong_thanh_toan)}
                          type="date"
                          label={isThanhToanBaoHiem(form.doi_tuong_thanh_toan) ? "Ngày hết hạn BHYT *" : "Ngày hết hạn BHYT"}
                          name="han_bhyt"
                          value={form.han_bhyt}
                          onChange={handleChange}
                          error={errors.han_bhyt}
                        />
                        <InputField
                          required={isThanhToanBaoHiem(form.doi_tuong_thanh_toan)}
                          label={isThanhToanBaoHiem(form.doi_tuong_thanh_toan) ? "Nơi đăng ký KCB *" : "Nơi đăng ký KCB"}
                          name="noi_dang_ky_kcb"
                          value={form.noi_dang_ky_kcb}
                          onChange={handleChange}
                          error={errors.noi_dang_ky_kcb}
                        />
                        <InputField
                          required={isThanhToanBaoHiem(form.doi_tuong_thanh_toan)}
                          label={isThanhToanBaoHiem(form.doi_tuong_thanh_toan) ? "Tuyến khám *" : "Tuyến khám"}
                          name="tuyen_kham"
                          value={form.tuyen_kham}
                          onChange={handleChange}
                          error={errors.tuyen_kham}
                        />
                        <InputField
                          required={
                            isThanhToanBaoHiem(form.doi_tuong_thanh_toan) &&
                            (["chuyen tuyen", "trai tuyen"].includes(toLooseKey(form.tuyen_kham)) ||
                              toLooseKey(form.nguon_tiep_nhan) === "chuyen tuyen")
                          }
                          label="Giấy chuyển tuyến"
                          name="giay_chuyen_tuyen"
                          value={form.giay_chuyen_tuyen}
                          onChange={handleChange}
                          error={errors.giay_chuyen_tuyen}
                        />
                        </fieldset>
                      </div>
                    </PanelSection>

                    {!extraInfoCollapsed && (
                    <PanelSection
                      title="Thông tin bổ sung"
                      hint="Nhấn [F8]"
                      className="xl:col-span-4 min-h-0"
                      scrollable
                    >
                      <div className="grid grid-cols-1 gap-2">
                        <SelectField required label="Nguồn tiếp nhận *" name="nguon_tiep_nhan" value={form.nguon_tiep_nhan} onChange={handleChange} options={nguonOptions} error={errors.nguon_tiep_nhan} />
                        <SelectField required label="Loại khám *" name="loai_kham" value={form.loai_kham} onChange={handleChange} options={loaiKhamOptions} error={errors.loai_kham} />
                        <SelectField required label="Mức ưu tiên *" name="muc_uu_tien" value={form.muc_uu_tien} onChange={handleChange} options={mucUuTienOptions} error={errors.muc_uu_tien} />
                        <InputField label="Thời gian xuất hiện triệu chứng" type="datetime-local" name="thoi_gian_xuat_hien_trieu_chung" value={form.thoi_gian_xuat_hien_trieu_chung} onChange={handleChange} />
                        <InputField label="Mức độ đau (0-10)" name="muc_do_dau" value={form.muc_do_dau} onChange={handleChange} error={errors.muc_do_dau} />
                        <InputField label="Người liên hệ khẩn cấp" name="nguoi_lien_he_khan_cap" value={form.nguoi_lien_he_khan_cap} onChange={handleChange} />
                        <InputField label="SĐT liên hệ khẩn cấp" name="sdt_lien_he_khan_cap" value={form.sdt_lien_he_khan_cap} onChange={handleChange} error={errors.sdt_lien_he_khan_cap} />
                        <InputField label="Quan hệ liên hệ khẩn cấp" name="quan_he_lien_he_khan_cap" value={form.quan_he_lien_he_khan_cap} onChange={handleChange} />
                        <InputField
                          required={typeof age === "number" && age < 16}
                          label={typeof age === "number" && age < 16 ? "Người giám hộ *" : "Người giám hộ"}
                          name="nguoi_giam_ho"
                          value={form.nguoi_giam_ho}
                          onChange={handleChange}
                          error={errors.nguoi_giam_ho}
                        />
                        <InputField
                          required={typeof age === "number" && age < 16}
                          label={typeof age === "number" && age < 16 ? "SĐT người giám hộ *" : "SĐT người giám hộ"}
                          name="sdt_giam_ho"
                          value={form.sdt_giam_ho}
                          onChange={handleChange}
                          error={errors.sdt_giam_ho}
                        />
                        <InputField label="Quan hệ người giám hộ" name="quan_he_giam_ho" value={form.quan_he_giam_ho} onChange={handleChange} />
                        <TextAreaField rows={1} label="Ghi chú tiếp đón" name="ghi_chu_tiep_don" value={form.ghi_chu_tiep_don} onChange={handleChange} />
                        <TextAreaField rows={1} label="Lý do tạo thêm lượt trong ngày" name="ly_do_tao_them_luot" value={form.ly_do_tao_them_luot} onChange={handleChange} />
                        {!normalize(form.cccd) && (
                          <TextAreaField
                            rows={1}
                            label="Ghi chú định danh (không bắt buộc)"
                            name="ghi_chu_dinh_danh"
                            value={form.ghi_chu_dinh_danh}
                            onChange={handleChange}
                            error={errors.ghi_chu_dinh_danh}
                          />
                        )}
                      </div>
                    </PanelSection>
                    )}
                    <button
                      type="button"
                      onClick={() => setExtraInfoCollapsed((old) => !old)}
                      title={extraInfoCollapsed ? "Mở thông tin bổ sung" : "Thu gọn thông tin bổ sung"}
                      aria-label={extraInfoCollapsed ? "Mở thông tin bổ sung" : "Thu gọn thông tin bổ sung"}
                      className="absolute bottom-0 right-0 top-0 z-10 flex w-8 flex-col items-center justify-center rounded-r-xl border border-cyan-200 bg-[#0b4fa3] text-[10px] font-bold uppercase text-cyan-50 shadow-sm transition hover:bg-[#0a438b] focus:outline-none focus:ring-2 focus:ring-cyan-300"
                    >
                      <ChevronDown className={`mb-2 h-3.5 w-3.5 transition ${extraInfoCollapsed ? "-rotate-90" : "rotate-90"}`} />
                      <span className="leading-none [writing-mode:vertical-rl]">Thông tin bổ sung</span>
                    </button>
                  </div>

                  <PanelSection title="Thông tin sinh hiệu" hint="Nhấn [F9]" className="shrink-0">
                    <div className="grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-8">
                      <InputField label="Nhiệt độ (°C)" name="nhietDo" value={vital.nhietDo} onChange={handleVitalChange} error={errors.nhietDo} />
                      <InputField label="Nhịp tim" name="nhipTim" value={vital.nhipTim} onChange={handleVitalChange} error={errors.nhipTim} />
                      <InputField label="SpO2 (%)" name="spo2" value={vital.spo2} onChange={handleVitalChange} error={errors.spo2} />
                      <InputField label="HA tâm thu" name="huyetApTamThu" value={vital.huyetApTamThu} onChange={handleVitalChange} error={errors.huyetApTamThu} />
                      <InputField label="HA tâm trương" name="huyetApTamTruong" value={vital.huyetApTamTruong} onChange={handleVitalChange} error={errors.huyetApTamTruong} />
                      <InputField label="Nhịp thở" name="nhipTho" value={vital.nhipTho} onChange={handleVitalChange} error={errors.nhipTho} />
                      <InputField label="Chiều cao (cm)" name="chieuCao" value={vital.chieuCao} onChange={handleVitalChange} error={errors.chieuCao} />
                      <InputField label="Cân nặng (kg)" name="canNang" value={vital.canNang} onChange={handleVitalChange} error={errors.canNang} />
                      <InputField label="BMI (tự tính)" name="bmi" value={vital.bmi} onChange={handleVitalChange} readOnly />
                      <InputField label="Dị ứng thuốc" name="diUngThuoc" value={vital.diUngThuoc} onChange={handleVitalChange} />
                      <InputField label="Tình trạng mang thai" name="tinhTrangMangThai" value={vital.tinhTrangMangThai} onChange={handleVitalChange} />
                      <InputField label="Mức độ đau sinh hiệu (0-10)" name="mucDoDau" value={vital.mucDoDau} onChange={handleVitalChange} error={errors.mucDoDau} />
                      <TextAreaField rows={1} label="Bệnh nền" name="benhNen" value={vital.benhNen} onChange={handleVitalChange} />
                      <TextAreaField rows={1} label="Triệu chứng nguy hiểm" name="trieuChungNguyHiem" value={vital.trieuChungNguyHiem} onChange={handleVitalChange} />
                    </div>
                  </PanelSection>
                </div>
              </div>
            </section>
            )}
          </div>
        </div>

        {showQuickNav && (
          <ReceptionQuickNav
            onGotoForm={() => navigate("/tiep-don/nhap")}
            onGotoList={() => navigate("/tiep-don/danh-sach")}
            onGotoCancelled={() => navigate("/tiep-don/huy")}
            currentPath={location.pathname}
          />
        )}

        {confirmClearModal && (
          <ConfirmModal
            title="Xác nhận làm trống form"
            content="Bạn đang nhập dở dữ liệu. Bạn có chắc muốn làm trống toàn bộ form?"
            confirmText="Làm trống"
            danger
            onCancel={() => setConfirmClearModal(false)}
            onConfirm={() => {
              setConfirmClearModal(false);
              resetForm();
            }}
          />
        )}

        {warningModal.open && (
          <InfoModal
            title={warningModal.title}
            content={warningModal.message}
            onClose={() => setWarningModal({ open: false, title: "", message: "" })}
          />
        )}

        {cancelModal.open && (
          <CancelModal
            state={cancelModal}
            reasonOptions={cancelReasonOptions}
            onChange={(patch) => setCancelModal((prev) => ({ ...prev, ...patch }))}
            onClose={() => setCancelModal({ open: false, record: null, maLyDoHuy: "", lyDoHuy: "", ghiChu: "", errors: {} })}
            onConfirm={handleCancelEncounter}
          />
        )}

        {timelineModal.open && (
          <TimelineModal
            state={timelineModal}
            onClose={() =>
              setTimelineModal({
                open: false,
                loading: false,
                record: null,
                logs: [],
                error: "",
              })
            }
          />
        )}
      </div>
    </MainLayout>
  );
}

function PanelSection({ title, hint = "", children, className = "", scrollable = false, headerAction = null }) {
  return (
    <section className={`overflow-hidden rounded-xl border border-slate-300 bg-white ${className}`}>
      <div className="flex items-center justify-between gap-2 bg-[#0b4fa3] px-3 py-1">
        <h3 className="text-[13px] font-bold text-white">{title}</h3>
        <div className="flex items-center gap-2">
          {hint ? <span className="text-[10px] font-semibold text-cyan-100">{hint}</span> : null}
          {headerAction}
        </div>
      </div>
      <div className={`p-2 ${scrollable ? "h-full overflow-y-auto pr-1" : ""}`}>{children}</div>
    </section>
  );
}

function buildFieldPlaceholder(label, type = "text", readOnly = false) {
  if (readOnly) return "";
  if (type === "date") return "Chọn ngày";
  if (type === "datetime-local") return "Chọn thời điểm";
  const base = normalize(label).replace(/\*/g, "").replace(/\(.*?\)/g, "").trim();
  return base ? `Nhập ${base.toLowerCase()}` : "Nhập thông tin";
}

function ReceptionQuickNav({ onGotoForm, onGotoList, onGotoCancelled, currentPath }) {
  const [position, setPosition] = useState(() => ({
    x: typeof window === "undefined" ? 16 : Math.max(16, window.innerWidth - 76),
    y: typeof window === "undefined" ? 240 : Math.max(80, Math.round(window.innerHeight / 2) - 90),
  }));
  const dragRef = useRef(null);
  const navItems = [
    {
      key: "form",
      label: "Tiếp đón",
      onClick: onGotoForm,
      active: currentPath === "/tiep-don/nhap",
      icon: <ClipboardCheck size={18} />,
    },
    {
      key: "list",
      label: "Danh sách tiếp đón",
      onClick: onGotoList,
      active: currentPath === "/tiep-don/danh-sach",
      icon: <ListChecks size={18} />,
    },
    {
      key: "cancelled",
      label: "Hồ sơ hủy",
      onClick: onGotoCancelled,
      active: currentPath === "/tiep-don/huy",
      icon: <Ban size={18} />,
    },
  ];

  const clampPosition = (x, y) => {
    if (typeof window === "undefined") return { x, y };
    return {
      x: Math.min(Math.max(8, x), window.innerWidth - 64),
      y: Math.min(Math.max(72, y), window.innerHeight - 180),
    };
  };

  const startDrag = (event) => {
    event.preventDefault();
    const start = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: position.x,
      originY: position.y,
    };
    dragRef.current = start;
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const moveDrag = (event) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    setPosition(clampPosition(
      drag.originX + event.clientX - drag.startX,
      drag.originY + event.clientY - drag.startY
    ));
  };

  const stopDrag = (event) => {
    if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null;
  };

  return (
    <div className="fixed z-30" style={{ left: `${position.x}px`, top: `${position.y}px` }}>
      <div className="flex flex-col gap-2 rounded-2xl border border-sky-100 bg-white/70 p-1.5 shadow-xl backdrop-blur">
        <button
          type="button"
          onPointerDown={startDrag}
          onPointerMove={moveDrag}
          onPointerUp={stopDrag}
          onPointerCancel={stopDrag}
          title="Kéo để di chuyển cụm điều hướng tiếp đón"
          aria-label="Kéo để di chuyển cụm điều hướng tiếp đón"
          className="group relative inline-flex h-8 w-10 cursor-move items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-sky-200 hover:text-sky-700"
        >
          <Move size={16} />
          <span className="pointer-events-none absolute right-12 top-1/2 hidden -translate-y-1/2 whitespace-nowrap rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 shadow-lg group-hover:block">
            Kéo để di chuyển
          </span>
        </button>
        {navItems.map((item) => (
          <button
            key={item.key}
            type="button"
            title={item.label}
            aria-label={item.label}
            onClick={item.onClick}
            className={`group relative inline-flex h-10 w-10 items-center justify-center rounded-xl border text-white shadow-sm transition ${
              item.active
                ? "border-sky-700 bg-sky-700"
                : "border-sky-300 bg-sky-600 hover:brightness-110"
            }`}
          >
            {item.icon}
            <span className="pointer-events-none absolute right-12 top-1/2 hidden -translate-y-1/2 whitespace-nowrap rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 shadow-lg group-hover:block">
              {item.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function Notice({ type, text }) {
  const style =
    type === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : type === "warning"
      ? "border-amber-200 bg-amber-50 text-amber-700"
      : "border-rose-200 bg-rose-50 text-rose-700";
  return (
    <div className={`rounded-xl border px-4 py-3 text-sm ${style}`}>
      <div className="flex items-start gap-2">
        <AlertCircle size={16} className="mt-0.5" />
        <span>{text}</span>
      </div>
    </div>
  );
}

function ErrorNoticeModal({ text, onClose }) {
  const cleanText = normalize(text).replace(/^Cần kiểm tra:\s*/i, "");
  const details = cleanText.split(/(?<=[.!?])\s+/).filter(Boolean);
  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/50 px-4 backdrop-blur-sm" role="alertdialog" aria-modal="true">
      <div className="w-full max-w-lg overflow-hidden rounded-xl border border-rose-200 bg-white shadow-2xl">
        <div className="flex items-start gap-4 px-6 py-5">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600">
            <AlertCircle size={22} />
          </span>
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-slate-900">Thông tin chưa hợp lệ</h2>
            <p className="mt-1 text-sm text-slate-600">Vui lòng kiểm tra các nội dung sau trước khi lưu:</p>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-700">
              {details.map((item, index) => <li key={index} className="flex gap-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-500" /><span>{item}</span></li>)}
            </ul>
          </div>
        </div>
        <div className="flex justify-end border-t bg-slate-50 px-6 py-4">
          <button type="button" onClick={onClose} className="rounded-md bg-rose-600 px-5 py-2 text-sm font-semibold text-white hover:bg-rose-700">Đã hiểu</button>
        </div>
      </div>
    </div>
  );
}

function InputField({ label, name, value, onChange, readOnly = false, error = "", type = "text", required = false, placeholder = "" }) {
  const fieldPlaceholder = placeholder || buildFieldPlaceholder(label, type, readOnly);
  return (
    <label className="block">
      <span className={`mb-0.5 block text-[11px] font-semibold ${required ? "text-rose-600" : "text-slate-600"}`}>{label}</span>
      <input
        type={type}
        name={name}
        value={value || ""}
        onChange={onChange}
        readOnly={readOnly}
        placeholder={fieldPlaceholder}
        className={`w-full rounded-lg border px-2.5 py-1 text-[13px] outline-none transition duration-200 ${
          readOnly
            ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-500"
            : error
            ? "border-rose-300 bg-white shadow-sm focus:border-rose-500 focus:ring-2 focus:ring-rose-200"
            : "border-slate-200 bg-white shadow-sm hover:border-sky-300 focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
        }`}
      />
      {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
    </label>
  );
}

function SelectField({ label, name, value, onChange, options = [], error = "", required = false }) {
  const optionItems = toOptionItems(options);
  const selectPlaceholder = `Chọn ${normalize(label).replace(/\*/g, "").toLowerCase()}`;
  return (
    <AnimatedSelect
      label={label}
      labelClassName={required ? "!text-rose-600 !text-[11px]" : "!text-[11px]"}
      value={value || ""}
      onChange={(nextValue) => onChange?.({ target: { name, value: nextValue } })}
      options={optionItems}
      placeholder={selectPlaceholder}
      error={error}
      buttonClassName="!rounded-lg !py-1 !text-[13px]"
    />
  );
}

function TextAreaField({ label, name, value, onChange, error = "", rows = 3, required = false, placeholder = "" }) {
  const fieldPlaceholder = placeholder || buildFieldPlaceholder(label, "text", false);
  return (
    <label className="block">
      <span className={`mb-0.5 block text-[11px] font-semibold ${required ? "text-rose-600" : "text-slate-600"}`}>{label}</span>
      <textarea
        name={name}
        value={value || ""}
        onChange={onChange}
        rows={rows}
        placeholder={fieldPlaceholder}
        className={`w-full rounded-lg border px-2.5 py-1 text-[13px] outline-none transition duration-200 ${
          error
            ? "border-rose-300 bg-white shadow-sm focus:border-rose-500 focus:ring-2 focus:ring-rose-200"
            : "border-slate-200 bg-white shadow-sm hover:border-sky-300 focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
        }`}
      />
      {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
    </label>
  );
}

function WardAutocompleteField({
  label,
  value,
  onChange,
  onSelect,
  options = [],
  loading = false,
  apiError = "",
  error = "",
}) {
  const [open, setOpen] = useState(false);
  const wrapperRef = React.useRef(null);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (!wrapperRef.current || wrapperRef.current.contains(event.target)) return;
      setOpen(false);
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const keyword = normalize(value);
  const items = Array.isArray(options) ? options : [];
  const visible = open && (loading || keyword || items.length > 0 || apiError);

  return (
    <label className="block">
      <span className="mb-0.5 block text-[11px] font-semibold text-slate-600">{label}</span>
      <div ref={wrapperRef} className="relative">
        <div className="relative">
          <MapPin size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={value || ""}
            onChange={(e) => {
              onChange(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            placeholder="Nhập để tìm xã/phường..."
            className={`w-full rounded-lg border py-1 pl-8 pr-9 text-[13px] outline-none transition duration-200 ${
              error
                ? "border-rose-300 bg-white shadow-sm focus:border-rose-500 focus:ring-2 focus:ring-rose-200"
                : "border-slate-200 bg-white shadow-sm hover:border-sky-300 focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
            }`}
          />
          {loading ? (
            <Loader2 size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-sky-500" />
          ) : (
            <ChevronDown
              size={15}
              className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 transition-all duration-200 ${
                open ? "-rotate-180 text-sky-600" : "text-slate-400"
              }`}
            />
          )}
        </div>

        {visible && (
          <div className="animate-fadeSlide absolute z-30 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-sky-100 bg-white/95 p-1.5 shadow-[0_18px_45px_-18px_rgba(2,132,199,0.45)] ring-1 ring-sky-50 backdrop-blur-sm">
            {loading && (
              <div className="px-2 py-2 text-xs text-slate-500">Đang tìm xã/phường...</div>
            )}
            {!loading && apiError && (
              <div className="px-2 py-2 text-xs text-rose-600">{apiError}</div>
            )}
            {!loading && !apiError && items.length === 0 && (
              <div className="px-2 py-2 text-xs text-slate-500">Không có kết quả phù hợp.</div>
            )}
            {!loading &&
              !apiError &&
              items.map((item, idx) => (
                <button
                  key={`${item.code || item.name || "ward"}-${idx}`}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onSelect(item);
                    setOpen(false);
                  }}
                  className="flex w-full flex-col rounded-lg px-2 py-1.5 text-left transition hover:bg-sky-50"
                >
                  <span className="text-sm font-semibold text-slate-700">{item.displayLabel || item.nameWithType || item.name}</span>
                  <span className="text-[11px] text-slate-500">{item.pathWithType || item.path || ""}</span>
                </button>
              ))}
          </div>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
    </label>
  );
}

function EncounterCard({ record, canSave, canDelete, onPrefill, onTimeline, onSelectService, onCancel }) {
  const status = normalizeStatus(record?.trangThai);
  const statusMeta = meta(status);
  const stepIndex = FLOW_STEPS.indexOf(status);
  const timelineIndex = stepIndex >= 0 ? stepIndex : 0;
  const hoTen = normalizeVietnameseText(record?.benhNhan?.hoTen) || "Không rõ";
  const loaiKham = toCanonicalLoaiKham(record?.loaiKham || "");
  const nguonTiepNhan = toCanonicalNguon(record?.nguonTiepNhan || "");
  const phongDangKy = normalizeVietnameseText(record?.phongDangKy || "");
  const khuTiepDon = normalizeVietnameseText(record?.khuTiepDon?.tenKhu || record?.khuTiepDon?.maKhu || "");
  const quayTiepDon = normalizeVietnameseText(record?.quayTiepDon?.tenQuay || record?.quayTiepDon?.maQuay || "");

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm transition hover:border-sky-300 hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-800">{hoTen}</p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
            <span className="rounded-full bg-slate-100 px-2 py-0.5">Mã BN: <span className="font-semibold text-slate-700">{record?.benhNhan?.maBn || "--"}</span></span>
            <span className="rounded-full bg-slate-100 px-2 py-0.5">Mã HS: <span className="font-semibold text-slate-700">{record?.maHs || "--"}</span></span>
            <span className="rounded-full bg-slate-100 px-2 py-0.5">{record?.benhNhan?.soDienThoai || "--"}</span>
            <span className="rounded-full bg-slate-100 px-2 py-0.5">{toDisplayTime(record?.ngayTao)}</span>
          </div>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusMeta.className}`}>{statusMeta.label}</span>
      </div>

      <div className="mt-2 text-xs text-slate-600">
        <p>Loại khám: <span className="font-semibold">{loaiKham || "Chưa chọn"}</span></p>
        <p>Nguồn: <span className="font-semibold">{nguonTiepNhan || "Chưa chọn"}</span></p>
        <p>Khu/Quầy: <span className="font-semibold">{[khuTiepDon, quayTiepDon].filter(Boolean).join(" - ") || "Chưa chọn"}</span></p>
        <p>Phòng/Dịch vụ: <span className="font-semibold">{phongDangKy || "Chưa chọn"}</span></p>
      </div>

      <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2">
        <div className="flex items-center gap-1">
          {FLOW_STEPS.map((step, index) => {
            const reached = index <= timelineIndex;
            const active = index === timelineIndex;
            return (
              <React.Fragment key={step}>
                <span
                  className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                    reached ? "bg-sky-600 text-white" : "bg-slate-200 text-slate-500"
                  }`}
                >
                  {reached ? "?" : index + 1}
                </span>
                <span className={`text-[10px] font-semibold ${active ? "text-sky-700" : "text-slate-500"}`}>
                  {meta(step).label}
                </span>
                {index < FLOW_STEPS.length - 1 && <span className={`h-0.5 flex-1 rounded ${index < timelineIndex ? "bg-sky-500" : "bg-slate-200"}`} />}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-end gap-2 text-xs">
        <button type="button" onClick={onTimeline} className="inline-flex items-center rounded-lg border border-violet-200 bg-violet-50 px-2.5 py-1 font-semibold text-violet-700 hover:bg-violet-100">
          Timeline
        </button>
        {canSave && (
          <button type="button" onClick={onPrefill} className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 font-semibold text-slate-700 hover:bg-slate-100">
            Nạp vào form
          </button>
        )}
        {canSave && record?.canSelectService && (
          <button type="button" onClick={onSelectService} className="inline-flex items-center rounded-lg border border-sky-200 bg-sky-50 px-2.5 py-1 font-semibold text-sky-700 hover:bg-sky-100">
            Chọn dịch vụ
          </button>
        )}
        {canDelete && record?.canCancel && (
          <button type="button" onClick={onCancel} className="inline-flex items-center rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 font-semibold text-rose-700 hover:bg-rose-100">
            Hủy tiếp đón
          </button>
        )}
      </div>
    </div>
  );
}

function ConfirmModal({ title, content, onCancel, onConfirm, confirmText = "Xác nhận", danger = false }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 px-4 backdrop-blur-[2px] animate-fadeIn">
      <div className="w-full max-w-md rounded-2xl border border-sky-100 bg-white p-5 shadow-2xl animate-fadeSlide">
        <div className="flex items-start gap-3">
          <div className={`rounded-xl p-2 ${danger ? "bg-rose-100 text-rose-600" : "bg-sky-100 text-sky-600"}`}>
            <AlertCircle size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-bold text-slate-800">{title}</h3>
            <p className="mt-1 text-sm text-slate-600">{content}</p>
          </div>
        </div>
        <div className="mt-5 flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
          <button type="button" onClick={onCancel} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            K? sau
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`rounded-lg px-3 py-1.5 text-sm font-semibold text-white ${danger ? "bg-rose-600 hover:bg-rose-700" : "bg-sky-600 hover:bg-sky-700"}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

function InfoModal({ title, content, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 px-4 backdrop-blur-[2px] animate-fadeIn">
      <div className="w-full max-w-md rounded-2xl border border-amber-100 bg-white p-5 shadow-2xl animate-fadeSlide">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-amber-100 p-2 text-amber-600">
            <AlertCircle size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-bold text-slate-800">{title}</h3>
            <p className="mt-1 text-sm text-slate-600">{content}</p>
          </div>
        </div>
        <div className="mt-5 flex justify-end border-t border-slate-100 pt-4">
          <button type="button" onClick={onClose} className="rounded-lg bg-amber-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-amber-600">
            Đã hiểu
          </button>
        </div>
      </div>
    </div>
  );
}

function CancelModal({ state, reasonOptions = [], onChange, onClose, onConfirm }) {
  const selectedReason = reasonOptions.find((x) => x.value === state.maLyDoHuy);
  const reasonLabel = selectedReason?.label || "";
  const isOtherReason = state.maLyDoHuy === "KHAC";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 px-4 backdrop-blur-[2px] animate-fadeIn">
      <div className="w-full max-w-lg rounded-2xl border border-rose-100 bg-white p-5 shadow-2xl animate-fadeSlide">
        <h3 className="text-lg font-bold text-slate-800">Xác nhận hủy tiếp đón</h3>
        <p className="mt-1 text-sm text-slate-600">
            Hồ sơ: <span className="font-semibold">{state.record?.maHs || "--"}</span>
        </p>
        <div className="mt-4 space-y-3">
          <AnimatedSelect
            label="Lý do hủy *"
            value={state.maLyDoHuy || ""}
            onChange={(value) =>
              onChange({
                maLyDoHuy: value,
                lyDoHuy: reasonOptions.find((x) => x.value === value)?.label || "",
                errors: { ...state.errors, maLyDoHuy: "", lyDoHuy: "" },
              })
            }
            options={reasonOptions}
            placeholder={"-- Chọn lý do hủy --"}
            error={state.errors.maLyDoHuy}
            buttonClassName="!rounded-lg !py-1.5"
          />
          <InputField
            required
            label="Diễn giải lý do"
            name="lyDoHuy"
            value={state.lyDoHuy || reasonLabel}
            readOnly
            onChange={(e) => onChange({ lyDoHuy: e.target.value, errors: { ...state.errors, lyDoHuy: "" } })}
            error={state.errors.lyDoHuy}
          />
          <TextAreaField
            required={isOtherReason}
            label={isOtherReason ? "Ghi chú hủy *" : "Ghi chú hủy"}
            name="ghiChu"
            value={state.ghiChu}
            onChange={(e) => onChange({ ghiChu: e.target.value, errors: { ...state.errors, ghiChu: "" } })}
            error={state.errors.ghiChu}
          />
        </div>
        <div className="mt-5 flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            Kế sau
          </button>
          <button type="button" onClick={onConfirm} className="rounded-lg bg-rose-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-rose-700">
            Xác nhận hủy
          </button>
        </div>
      </div>
    </div>
  );
}

function TimelineModal({ state, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 px-4 backdrop-blur-[2px] animate-fadeIn">
      <div className="flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-sky-100 bg-white shadow-2xl animate-fadeSlide">
        <div className="border-b border-slate-200 bg-gradient-to-r from-sky-50 via-white to-cyan-50 px-5 py-4">
          <h3 className="text-lg font-bold text-slate-800">Timeline trạng thái hồ sơ</h3>
          <p className="mt-1 text-sm text-slate-500">
            {state.record?.maHs || "--"} · {state.record?.benhNhan?.hoTen || "Không rõ bệnh nhân"}
          </p>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {state.loading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, idx) => (
                <div key={idx} className="animate-pulse rounded-xl border border-slate-200 p-3">
                  <div className="h-3 w-36 rounded bg-slate-200" />
                  <div className="mt-2 h-3 w-56 rounded bg-slate-200" />
                </div>
              ))}
            </div>
          ) : state.error ? (
            <p className="text-sm text-rose-600">{state.error}</p>
          ) : (state.logs || []).length === 0 ? (
            <p className="text-sm text-slate-500">Chưa có timeline cho hồ sơ này.</p>
          ) : (
            <div className="relative pl-8">
              <span className="absolute bottom-1 left-[11px] top-1 w-px bg-slate-200" />
              {(state.logs || []).map((log, idx) => (
                <div key={log?.id || idx} className="relative mb-3 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
                  <span className="absolute -left-[22px] top-3 inline-flex h-5 w-5 items-center justify-center rounded-full bg-sky-100 text-[10px] font-bold text-sky-700">
                    {idx + 1}
                  </span>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-800">
                      {meta(normalizeStatus(log?.fromTrangThai)).label} → {meta(normalizeStatus(log?.toTrangThai)).label}
                    </p>
                    <span className="text-xs text-slate-500">{toDisplayDate(log?.createdAt)} {toDisplayTime(log?.createdAt)}</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-600">
                    Hành động: <span className="font-semibold">{getTimelineActionLabel(log?.action)}</span> · Người dùng:{" "}
                    <span className="font-semibold">{log?.nguoiDung || `User #${log?.idNguoiDung || "--"}`}</span>
                  </p>
                  {getTimelineNote(log) && <p className="mt-1 text-sm text-slate-600">{getTimelineNote(log)}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="border-t border-slate-200 bg-slate-50 px-5 py-3 text-right">
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 bg-white px-4 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="animate-pulse rounded-xl border border-slate-200 p-3">
          <div className="h-4 w-40 rounded bg-slate-200" />
          <div className="mt-2 h-3 w-52 rounded bg-slate-200" />
          <div className="mt-1 h-3 w-32 rounded bg-slate-200" />
        </div>
      ))}
    </div>
  );
}

