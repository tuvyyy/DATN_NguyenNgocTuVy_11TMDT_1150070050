import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  AlertCircle,
  AlertTriangle,
  Ban,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Download,
  FilePlus2,
  Filter,
  HelpCircle,
  History,
  Info,
  ListChecks,
  Loader2,
  MoveDown,
  MoveUp,
  Phone,
  Printer,
  Search,
  Settings2,
  Trash2,
  User,
  X,
} from "lucide-react";
import MainLayout from "../layouts/MainLayout";
import { usePermission } from "../hooks/UsePermission";
import AnimatedSelect from "../components/ui/AnimatedSelect";
import DatePicker from "../components/ui/DatePicker";
import {
  cancelEncounterV2,
  exportEncounterV2,
  getEncounterListV2,
  getExamTicketV2,
  getEncounterTimelineV2,
  getReceptionDictionariesV2,
} from "../api/TiepDonApi";
import { hasMojibake, normalizeVietnameseText } from "../utils/textCodec";

const STATUS_BADGE_CONFIG = {
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

const TAB_CONFIG = {
  today: {
    key: "today",
    label: "Đã tiếp đón",
    title: "Danh sách người bệnh đã tiếp đón",
    subtitle: "Hiển thị các hồ sơ đã tiếp đón chưa hoàn tất, bao gồm cả hồ sơ từ ngày trước.",
    showCreateButton: true,
  },
  cancelled: {
    key: "cancelled",
    label: "Hồ sơ hủy",
    title: "Danh sách hồ sơ đã hủy",
    subtitle: "Hiển thị các hồ sơ đã hủy theo ngày lọc và bộ lọc hiện tại.",
    showCreateButton: false,
  },
  completed: {
    key: "completed",
    label: "Hoàn tất",
    title: "Danh sách hồ sơ hoàn tất",
    subtitle: "Hiển thị các hồ sơ đã khám hoặc đã đóng.",
    showCreateButton: false,
  },
};

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
  SERVICE_ORDER_DRAFT_SAVED: "Lưu chỉ định",
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

const TAB_OPTIONS = Object.values(TAB_CONFIG).map((x) => ({ key: x.key, label: x.label }));

const TAB_BUTTON_STYLE = {
  today: {
    active: "bg-[#0077B6] text-white font-bold shadow-sm border border-[#0077B6]",
    idle: "text-slate-600 border border-transparent hover:bg-white hover:border-slate-200 hover:text-slate-900 font-bold",
  },
  cancelled: {
    active: "bg-rose-600 text-white font-bold shadow-sm border border-rose-600",
    idle: "text-slate-600 border border-transparent hover:bg-white hover:border-slate-200 hover:text-slate-900 font-bold",
  },
  completed: {
    active: "bg-emerald-600 text-white font-bold shadow-sm border border-emerald-600",
    idle: "text-slate-600 border border-transparent hover:bg-white hover:border-slate-200 hover:text-slate-900 font-bold",
  },
};

const STATUS_OPTIONS = [
  { value: "ALL", label: "Tất cả trạng thái" },
  ...Object.keys(STATUS_BADGE_CONFIG).map((key) => ({ value: key, label: STATUS_BADGE_CONFIG[key].label })),
];

const DEFAULT_NGUON_OPTIONS = ["Trực tiếp", "Đặt lịch", "Tái khám", "Chuyển tuyến", "Cấp cứu", "Khám đoàn", "Doanh nghiệp"];
const DEFAULT_LOAI_KHAM_OPTIONS = ["Khám mới", "Tái khám", "Cấp cứu", "Khám dịch vụ", "Khám tổng quát", "Khám theo gói", "Khám doanh nghiệp"];
const DEFAULT_CANCEL_REASONS = [
  { code: "BENH_NHAN_KHONG_TIEP_TUC", label: "Bệnh nhân không tiếp tục khám" },
  { code: "NHAP_NHAM_THONG_TIN", label: "Nhập nhầm thông tin" },
  { code: "TAO_TRUNG_HO_SO", label: "Tạo trùng hồ sơ" },
  { code: "SAI_DICH_VU_PHONG", label: "Sai dịch vụ/phòng khám" },
  { code: "CHUYEN_CO_SO", label: "Bệnh nhân chuyển cơ sở khác" },
  { code: "KHAC", label: "Lý do khác" },
];

const DEFAULT_COLUMNS = [
  { id: "stt", label: "STT", visible: true, locked: true },
  { id: "ngay_tiep_don", label: "Ngày đăng ký", visible: true },
  { id: "ma_hs", label: "Mã HS", visible: true },
  { id: "ma_bn", label: "Mã BN", visible: true },
  { id: "ho_ten", label: "Họ tên người bệnh", visible: true },
  { id: "ngay_sinh", label: "Ngày sinh", visible: true },
  { id: "dia_chi", label: "Địa chỉ", visible: true },
  { id: "so_dien_thoai", label: "Số điện thoại", visible: true },
  { id: "loai_kham", label: "Loại khám", visible: true },
  { id: "nguon_tiep_nhan", label: "Nguồn", visible: true },
  { id: "phong_dang_ky", label: "Phòng/Dịch vụ", visible: true },
  { id: "trang_thai", label: "Trạng thái", visible: true },
  { id: "nguoi_tiep_don", label: "NV tiếp đón", visible: false },
  { id: "thao_tac", label: "Thao tác", visible: true, locked: true },
];

const COLUMN_STORAGE_KEY = "tiuv.reception.list.columns.v2";
const HIDDEN_CANCELLED_STORAGE_KEY = "tiuv.reception.cancelled.hidden.v1";

const normalize = (value) => (value ?? "").toString().trim();
const normalizeStatus = (value) => normalize(value).toUpperCase();

const toOptionItems = (options = []) =>
  options.map((item) =>
    typeof item === "string"
      ? { value: item, label: item }
      : {
          value: item?.value ?? "",
          label: item?.label ?? item?.value ?? "",
        }
  );

const toDisplayDate = (value, withTime = false) => {
  if (!value) return "--";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "--";

  if (withTime) {
    return new Intl.DateTimeFormat("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(d);
  }

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
};

const getTodayKey = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${day}`;
};

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

const escapeHtml = (value) =>
  normalize(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const loadColumnConfig = () => {
  try {
    const raw = localStorage.getItem(COLUMN_STORAGE_KEY);
    if (!raw) return DEFAULT_COLUMNS;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULT_COLUMNS;

    const map = new Map(parsed.map((x) => [x.id, { ...x }]));
    return DEFAULT_COLUMNS.map((base) => {
      const saved = map.get(base.id);
      if (!saved) return base;
      return {
        ...base,
        visible: base.locked ? true : saved.visible !== false,
      };
    });
  } catch {
    return DEFAULT_COLUMNS;
  }
};

const saveColumnConfig = (columns) => {
  try {
    localStorage.setItem(COLUMN_STORAGE_KEY, JSON.stringify(columns));
  } catch {
    // ignore
  }
};

const loadHiddenCancelled = () => {
  try {
    const raw = localStorage.getItem(HIDDEN_CANCELLED_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map((x) => Number(x)).filter(Number.isFinite) : [];
  } catch {
    return [];
  }
};

const saveHiddenCancelled = (ids) => {
  try {
    localStorage.setItem(HIDDEN_CANCELLED_STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // ignore
  }
};

const getStatusMetaV2 = (status) => {
  const base = STATUS_BADGE_CONFIG[status] || { label: status || "Không rõ" };
  
  let tone = "bg-slate-50 border border-slate-200 text-slate-600"; // default fallback

  switch (status) {
    // 1. Mới Tiếp Nhận / Đang Tiếp Đón -> Xanh Dương Sky
    case "MOI_TAO":
    case "DA_TIEP_DON":
      tone = "bg-sky-50 border border-sky-200 text-sky-700";
      break;

    // 2. Chờ Khám -> Vàng Hổ Phách (Amber)
    case "CHO_KHAM":
      tone = "bg-amber-50 border border-amber-200 text-amber-700";
      break;

    // 3. Đang Khám -> Cam (Orange)
    case "DANG_KHAM":
      tone = "bg-orange-50 border border-orange-200 text-orange-700";
      break;

    // 4. Chờ làm Cận lâm sàng / Chỉ định dịch vụ -> Tím / Indigo / Fuchsia / Violet
    case "CHO_DICH_VU":
      tone = "bg-purple-50 border border-purple-200 text-purple-700";
      break;
    case "CHO_CAN_LAM_SANG":
      tone = "bg-indigo-50 border border-indigo-200 text-indigo-700";
      break;
    case "CHO_KET_QUA":
      tone = "bg-fuchsia-50 border border-fuchsia-200 text-fuchsia-700";
      break;
    case "CHO_KET_LUAN":
      tone = "bg-violet-50 border border-violet-200 text-violet-700";
      break;

    // 5. Thanh toán / Dịch vụ nháp -> Hồng / Hồng cánh sen
    case "CHO_THANH_TOAN":
      tone = "bg-pink-50 border border-pink-200 text-pink-700";
      break;
    case "DICH_VU_NHAP":
      tone = "bg-rose-50/70 border border-rose-200/50 text-rose-600";
      break;

    // 6. Hoàn tất lượt khám -> Xanh Lá Cây
    case "DA_THANH_TOAN":
    case "DA_KHAM":
    case "DA_DONG":
      tone = "bg-emerald-50 border border-emerald-200 text-emerald-700";
      break;

    // 7. Đã Hủy -> Đỏ (Rose)
    case "DA_HUY":
      tone = "bg-rose-50 border border-rose-200 text-rose-700";
      break;

    // 8. Chuyển Phân Khu -> Xanh Ngọc / Teal / Slate
    case "CHO_CHUYEN_KHU":
      tone = "bg-cyan-50 border border-cyan-200 text-cyan-700";
      break;
    case "DA_NHAN_KHU_MOI":
      tone = "bg-teal-50 border border-teal-200 text-teal-700";
      break;
    case "HUY_CHUYEN_KHU":
      tone = "bg-slate-50 border border-slate-200 text-slate-700";
      break;
    default:
      break;
  }

  return { ...base, className: tone };
};

const getStatusMeta = getStatusMetaV2;

const summarizeRoomAndService = (rawValue) => {
  const raw = normalize(rawValue);
  if (!raw) {
    return { shortText: "Chưa chọn", fullText: "Chưa chọn" };
  }
  const values = raw
    .split(",")
    .map((item) => normalize(item))
    .filter(Boolean);
  if (values.length === 0) {
    return { shortText: "Chưa chọn", fullText: "Chưa chọn" };
  }
  if (values.length === 1) {
    return { shortText: values[0], fullText: values[0] };
  }
  return {
    shortText: `${values[0]} +${values.length - 1}`,
    fullText: values.join(", "),
  };
};

const getCancelBlockedReason = (status) => {
  const map = {
    DANG_KHAM: "Không thể hủy hồ sơ đang khám.",
    DA_KHAM: "Không thể hủy hồ sơ đã khám.",
    DA_DONG: "Không thể hủy hồ sơ đã đóng.",
    DA_HUY: "Hồ sơ đã hủy.",
  };
  return map[status] || "Không thể hủy hồ sơ ở trạng thái hiện tại.";
};

const getServiceBlockedReason = (status) => {
  if (status === "DA_HUY") return "Không thể chọn dịch vụ cho hồ sơ đã hủy.";
  if (status === "DA_DONG" || status === "DA_KHAM") return "Không thể chọn dịch vụ cho hồ sơ hoàn tất.";
  return "Không thể chọn dịch vụ ở trạng thái hiện tại.";
};

const getCancelledReason = (record) =>
  normalize(record?.lyDoHuy) ||
  normalize(record?.lyDoHuyChiTiet) ||
  normalize(record?.ghiChuHuy) ||
  normalize(record?.ghiChuTiepDon) ||
  "Chưa có lý do hủy.";

const columnHeaderClass = (columnId) => {
  if (columnId === "trang_thai") return "min-w-[160px] whitespace-nowrap";
  if (columnId === "thao_tac") return "sticky top-0 right-0 z-30 min-w-[230px] bg-slate-50 text-center shadow-[-10px_0_18px_-18px_rgba(15,23,42,0.65)]";
  if (columnId === "phong_dang_ky") return "min-w-[220px]";
  if (columnId === "ma_hs" || columnId === "ma_bn") return "min-w-[140px]";
  return "";
};

const columnCellClass = (columnId) => {
  if (columnId === "thao_tac") return "sticky right-0 z-10 bg-white group-hover:bg-sky-50/20 text-center shadow-[-10px_0_18px_-18px_rgba(15,23,42,0.55)]";
  return "";
};

const rowSortTime = (row) => {
  const time = new Date(row?.ngayTao || row?.createdAt || 0).getTime();
  return Number.isFinite(time) ? time : 0;
};

const normalizeStatusValue = (value) => String(value || "").trim().toUpperCase();

const countStatusValues = (items) =>
  items.reduce((acc, item) => {
    const status = normalizeStatusValue(item?.trangThai);
    if (!status) return acc;
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

const mergeEncounterResults = (results, page, pageSize, statusFilterValue = "ALL") => {
  const byId = new Map();
  const errors = [];
  let unauthorized = false;

  results.forEach((result) => {
    if (!result) return;
    if (result.status === 401) unauthorized = true;
    if (result.error) errors.push(result.error);
    (result.items || []).forEach((item) => {
      const key = Number(item?.id || 0) || item?.maHs || JSON.stringify(item);
      if (!byId.has(key)) byId.set(key, item);
    });
  });

  const merged = Array.from(byId.values()).sort((a, b) => {
    const byTime = rowSortTime(b) - rowSortTime(a);
    if (byTime !== 0) return byTime;
    return Number(b?.id || 0) - Number(a?.id || 0);
  });

  const statusCounts = countStatusValues(merged);
  const selectedStatus = normalizeStatusValue(statusFilterValue);
  const filtered =
    !selectedStatus || selectedStatus === "ALL"
      ? merged
      : merged.filter((item) => normalizeStatusValue(item?.trangThai) === selectedStatus);

  const total = filtered.length;
  const safePageSize = Number(pageSize) || 20;
  const totalPages = total === 0 ? 1 : Math.ceil(total / safePageSize);
  const safePage = Math.min(Math.max(Number(page) || 1, 1), totalPages);
  const start = (safePage - 1) * safePageSize;

  return {
    items: filtered.slice(start, start + safePageSize),
    total,
    page: safePage,
    pageSize: safePageSize,
    totalPages,
    statusCounts,
    status: unauthorized ? 401 : 200,
    error: unauthorized ? "" : errors.find(Boolean) || "",
  };
};

export default function TiepDonDanhSach({ initialTab = "today" }) {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    canView,
    canDelete,
    canExport,
    loading: permLoading,
  } = usePermission("TIEP_DON");

  const [activeTab, setActiveTab] = useState(initialTab || "today");
  const [filterDate, setFilterDate] = useState(getTodayKey());
  const [keyword, setKeyword] = useState("");
  const [phoneKeyword, setPhoneKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [loaiKhamFilter, setLoaiKhamFilter] = useState("ALL");
  const [nguonFilter, setNguonFilter] = useState("ALL");
  const [advancedFiltersOpen, setAdvancedFiltersOpen] = useState(false);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [records, setRecords] = useState([]);
  const [listLoading, setListLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [authFailed, setAuthFailed] = useState(false);
  const [statusCounts, setStatusCounts] = useState({});

  const [notice, setNotice] = useState({ type: "", text: "" });
  const [hiddenCancelledIds, setHiddenCancelledIds] = useState(loadHiddenCancelled);

  // eslint-disable-next-line no-unused-vars
  const [dictionaryLoading, setDictionaryLoading] = useState(false);
  const [dictionaries, setDictionaries] = useState({
    nguonTiepNhan: DEFAULT_NGUON_OPTIONS,
    loaiKham: DEFAULT_LOAI_KHAM_OPTIONS,
    lyDoHuy: DEFAULT_CANCEL_REASONS,
  });

  const [columnModalOpen, setColumnModalOpen] = useState(false);
  const [columnSearch, setColumnSearch] = useState("");
  const [columns, setColumns] = useState(loadColumnConfig);

  const [timelineModal, setTimelineModal] = useState({
    open: false,
    loading: false,
    record: null,
    logs: [],
    error: "",
  });
  const [cancelModal, setCancelModal] = useState({
    open: false,
    record: null,
    maLyDoHuy: "",
    lyDoHuy: "",
    ghiChu: "",
    errors: {},
    submitting: false,
  });
  const [infoModal, setInfoModal] = useState({ open: false, title: "", content: "" });
  const [confirmDeleteCancelled, setConfirmDeleteCancelled] = useState({ open: false, record: null });

  const [debouncedKeyword, setDebouncedKeyword] = useState("");
  const [debouncedPhoneKeyword, setDebouncedPhoneKeyword] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedKeyword(keyword.trim()), 280);
    return () => clearTimeout(timer);
  }, [keyword]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedPhoneKeyword(phoneKeyword.trim()), 280);
    return () => clearTimeout(timer);
  }, [phoneKeyword]);

  useEffect(() => {
    setActiveTab(initialTab || "today");
  }, [initialTab]);

  useEffect(() => {
    const queryTab = new URLSearchParams(location.search).get("tab");
    if (queryTab === "appointments") {
      setActiveTab("today");
      setNguonFilter("Đặt lịch");
      return;
    }
    if (queryTab === "pending") {
      setActiveTab("today");
      return;
    }
    if (queryTab === "cancelled") {
      setActiveTab("cancelled");
      return;
    }
    if (queryTab === "completed") {
      setActiveTab("completed");
      return;
    }
    if (queryTab === "today") {
      setActiveTab("today");
    }
  }, [location.search]);

  useEffect(() => {
    setPage(1);
  }, [activeTab, filterDate, debouncedKeyword, debouncedPhoneKeyword, statusFilter, loaiKhamFilter, nguonFilter]);

  useEffect(() => {
    let ignore = false;
    const loadDictionaries = async () => {
      setDictionaryLoading(true);
      const data = await getReceptionDictionariesV2();
      if (ignore) return;
      if (data) {
        setDictionaries({
          nguonTiepNhan: Array.isArray(data.nguonTiepNhan) && data.nguonTiepNhan.length > 0 ? data.nguonTiepNhan : DEFAULT_NGUON_OPTIONS,
          loaiKham: Array.isArray(data.loaiKham) && data.loaiKham.length > 0 ? data.loaiKham : DEFAULT_LOAI_KHAM_OPTIONS,
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

  const nguonOptions = useMemo(
    () => toOptionItems(dictionaries.nguonTiepNhan?.length ? dictionaries.nguonTiepNhan : DEFAULT_NGUON_OPTIONS),
    [dictionaries.nguonTiepNhan]
  );
  const loaiKhamOptions = useMemo(
    () => toOptionItems(dictionaries.loaiKham?.length ? dictionaries.loaiKham : DEFAULT_LOAI_KHAM_OPTIONS),
    [dictionaries.loaiKham]
  );
  const cancelReasonOptions = useMemo(
    () =>
      Array.isArray(dictionaries.lyDoHuy)
        ? dictionaries.lyDoHuy.map((x) => ({ value: x.code || "", label: x.label || x.code || "" })).filter((x) => x.value)
        : [],
    [dictionaries.lyDoHuy]
  );
  const statusOptions = useMemo(() => {
    const hasCounts = Object.keys(statusCounts).length > 0;
    if (!hasCounts) return STATUS_OPTIONS;

    return STATUS_OPTIONS.filter((option) => {
      if (option.value === "ALL") return true;
      return (statusCounts[option.value] || 0) > 0;
    });
  }, [statusCounts]);

  useEffect(() => {
    if (statusFilter === "ALL") return;
    if (statusOptions.some((option) => option.value === statusFilter)) return;
    setStatusFilter("ALL");
  }, [statusFilter, statusOptions]);

  const loadList = useCallback(async () => {
    if (authFailed) {
      setListLoading(false);
      return;
    }
    setListLoading(true);
    const mergedKeyword = [debouncedKeyword, debouncedPhoneKeyword].filter(Boolean).join(" ").trim();
    const effectiveTab = activeTab === "pending" ? "today" : activeTab;
    const baseQuery = {
      tab: effectiveTab,
      date: filterDate || undefined,
      keyword: mergedKeyword || undefined,
      loaiKham: loaiKhamFilter === "ALL" ? undefined : loaiKhamFilter,
      nguonTiepNhan: nguonFilter === "ALL" ? undefined : nguonFilter,
      page,
      pageSize,
      sortBy: "ngay_tao",
      sortDir: "desc",
    };
    const result =
      effectiveTab === "today"
        ? mergeEncounterResults(
            await Promise.all([
              getEncounterListV2({
                ...baseQuery,
                tab: "today",
                page: 1,
                pageSize: Math.max(2000, page * pageSize),
              }),
              getEncounterListV2({
                ...baseQuery,
                tab: "pending",
                page: 1,
                pageSize: Math.max(2000, page * pageSize),
              }),
            ]),
            page,
            pageSize,
            statusFilter
          )
        : mergeEncounterResults(
            [
              await getEncounterListV2({
                ...baseQuery,
                page: 1,
                pageSize: Math.max(2000, page * pageSize),
              }),
            ],
            page,
            pageSize,
            statusFilter
          );

    const sourceItems = result?.items || [];
    const nextItems =
      effectiveTab === "cancelled"
        ? sourceItems.filter((row) => !hiddenCancelledIds.includes(Number(row?.id)))
        : sourceItems;

    setRecords(nextItems);
    setStatusCounts(result?.statusCounts || {});
    setTotal(effectiveTab === "cancelled" ? nextItems.length : result?.total || 0);
    setPage(result?.page || 1);
    setPageSize(result?.pageSize || 20);
    setTotalPages(result?.totalPages || 1);
    if (result?.status === 401) {
      setAuthFailed(true);
      setListLoading(false);
      return;
    }
    if (result?.error) {
      setNotice({ type: "error", text: result.error });
    }
    setListLoading(false);
  }, [activeTab, authFailed, debouncedKeyword, debouncedPhoneKeyword, filterDate, hiddenCancelledIds, loaiKhamFilter, nguonFilter, page, pageSize, statusFilter]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  const visibleColumns = useMemo(() => columns.filter((x) => x.visible || x.locked), [columns]);

  const currentTabMeta = useMemo(() => TAB_CONFIG[activeTab] || TAB_CONFIG.today, [activeTab]);

  const filteredColumnOptions = useMemo(() => {
    const q = normalize(columnSearch).toLowerCase();
    if (!q) return columns;
    return columns.filter((x) => x.label.toLowerCase().includes(q));
  }, [columnSearch, columns]);

  const moveColumn = (index, direction) => {
    setColumns((prev) => {
      const next = [...prev];
      const target = direction === "up" ? index - 1 : index + 1;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      saveColumnConfig(next);
      return next;
    });
  };

  const toggleColumn = (columnId) => {
    setColumns((prev) => {
      const next = prev.map((c) => {
        if (c.id !== columnId || c.locked) return c;
        return { ...c, visible: !c.visible };
      });
      saveColumnConfig(next);
      return next;
    });
  };

  const openTimeline = async (record) => {
    if (!record?.id) return;
    setTimelineModal({
      open: true,
      loading: true,
      record,
      logs: [],
      error: "",
    });

    const result = await getEncounterTimelineV2(record.id);
    if (!result?.ok) {
      setTimelineModal((prev) => ({
        ...prev,
        loading: false,
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

  const navigateToService = (record) => {
    navigate("/tiep-don/chi-dinh", {
      state: {
        patient: {
          idBenhNhan: record?.benhNhan?.idBenhNhan,
          idHoSo: record?.id,
          maBn: record?.benhNhan?.maBn,
          maHs: record?.maHs,
          hoTen: record?.benhNhan?.hoTen,
          gioiTinh: record?.benhNhan?.gioiTinh,
          ngaySinh: record?.benhNhan?.ngaySinh,
          soDienThoai: record?.benhNhan?.soDienThoai,
          mucUuTien: record?.mucUuTien,
          trangThaiHoSo: record?.trangThai,
        },
      },
    });
  };

  const navigateToForm = (record) => {
    navigate("/tiep-don/nhap", {
      state: {
        prefillEncounter: record,
      },
    });
  };

  const openCancelModal = (record) => {
    setCancelModal({
      open: true,
      record,
      maLyDoHuy: "",
      lyDoHuy: "",
      ghiChu: "",
      errors: {},
      submitting: false,
    });
  };

  const confirmCancelEncounter = async () => {
    const modalErrors = {};
    if (!normalize(cancelModal.maLyDoHuy)) modalErrors.maLyDoHuy = "Vui lòng chọn lý do hủy.";
    if (normalize(cancelModal.maLyDoHuy) === "KHAC" && !normalize(cancelModal.ghiChu)) {
      modalErrors.ghiChu = "Khi chọn Lý do khác, bạn cần nhập ghi chú.";
    }
    if (Object.keys(modalErrors).length) {
      setCancelModal((prev) => ({ ...prev, errors: modalErrors }));
      return;
    }

    setCancelModal((prev) => ({ ...prev, submitting: true }));
    const res = await cancelEncounterV2(cancelModal.record?.id, {
      maLyDoHuy: normalize(cancelModal.maLyDoHuy),
      lyDoHuy: normalize(cancelModal.lyDoHuy) || null,
      ghiChu: normalize(cancelModal.ghiChu) || null,
    });
    setCancelModal((prev) => ({ ...prev, submitting: false }));

    if (!res) {
      setNotice({ type: "error", text: "Không kết nối được API hủy hồ sơ." });
      return;
    }
    if (res.status >= 400) {
      const message = typeof res.data === "string" ? res.data : res.data?.message || "Hủy hồ sơ thất bại.";
      setNotice({ type: "error", text: message });
      return;
    }

    setCancelModal({
      open: false,
      record: null,
      maLyDoHuy: "",
      lyDoHuy: "",
      ghiChu: "",
      errors: {},
      submitting: false,
    });
    setNotice({ type: "success", text: res.data?.message || "Hủy tiếp đón thành công." });
    await loadList();
  };

  const handleExport = async () => {
    if (!canExport) {
      setNotice({ type: "error", text: "Bạn không có quyền xuất dữ liệu." });
      return;
    }
    if (records.length === 0) {
      setNotice({ type: "warning", text: "Không có dữ liệu phù hợp để xuất." });
      return;
    }
    setExporting(true);
    const mergedKeyword = [debouncedKeyword, debouncedPhoneKeyword].filter(Boolean).join(" ").trim();
    const effectiveTab = activeTab === "pending" ? "today" : activeTab;
    const res = await exportEncounterV2({
      tab: effectiveTab,
      date: filterDate || undefined,
      keyword: mergedKeyword || undefined,
      status: statusFilter,
      loaiKham: loaiKhamFilter === "ALL" ? undefined : loaiKhamFilter,
      nguonTiepNhan: nguonFilter === "ALL" ? undefined : nguonFilter,
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

  const confirmDeleteCancelledRecord = () => {
    const row = confirmDeleteCancelled.record;
    if (!row?.id) return;
    const id = Number(row.id);
    const nextIds = Array.from(new Set([...hiddenCancelledIds, id]));
    setHiddenCancelledIds(nextIds);
    saveHiddenCancelled(nextIds);
    setRecords((prev) => prev.filter((x) => Number(x?.id) !== id));
    setConfirmDeleteCancelled({ open: false, record: null });
    setInfoModal({
      open: true,
      title: "Thông báo",
      content: "Đã xóa hồ sơ khỏi danh sách hủy trên màn hình hiện tại.",
    });
  };

  const handlePrintExamTicket = async (row) => {
    if (!row?.id) return;

    const res = await getExamTicketV2(row.id);
    if (!res || res.status >= 400 || !res.data) {
      setNotice({ type: "error", text: res?.data?.message || "Không tải được phiếu khám." });
      return;
    }

    const ticket = res.data;
    const encounter = ticket.encounter || {};
    const patient = ticket.patient || {};
    const rooms = Array.isArray(ticket.rooms) ? ticket.rooms : [];
    const services = Array.isArray(ticket.services) ? ticket.services : [];
    const serviceRows = services.length
      ? services
          .map(
            (item, index) => `
              <tr>
                <td>${index + 1}</td>
                <td>${escapeHtml(item.serviceName || item.serviceCode)}</td>
                <td>${escapeHtml(item.roomName || "")}</td>
                <td>${escapeHtml(item.status || "")}</td>
              </tr>`
          )
          .join("")
      : `<tr><td colspan="4">Chưa có dịch vụ</td></tr>`;
    const roomText = rooms.map((room) => room.tenPhong || room.maPhong).filter(Boolean).join(", ") || "--";

    const win = window.open("", "_blank", "width=760,height=860");
    if (!win) {
      setNotice({ type: "error", text: "Trình duyệt đang chặn cửa sổ in phiếu." });
      return;
    }

    win.document.write(`
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Phiếu khám ${escapeHtml(encounter.maHs || "")}</title>
          <style>
            body { font-family: Arial, sans-serif; color: #111827; margin: 28px; }
            h1 { font-size: 22px; margin: 0 0 4px; text-align: center; }
            .sub { text-align: center; color: #475569; margin-bottom: 18px; }
            .stt { font-size: 30px; font-weight: 800; text-align: center; margin: 10px 0; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; margin: 14px 0; }
            .label { color: #64748b; font-size: 12px; }
            .value { font-weight: 700; margin-top: 2px; }
            table { width: 100%; border-collapse: collapse; margin-top: 14px; }
            th, td { border: 1px solid #cbd5e1; padding: 8px; font-size: 13px; text-align: left; }
            th { background: #f8fafc; }
            @media print { body { margin: 16px; } }
          </style>
        </head>
        <body>
          <h1>PHIẾU KHÁM</h1>
          <div class="sub">${escapeHtml(encounter.khuTiepDon?.tenKhu || "")} - ${escapeHtml(encounter.quayTiepDon?.tenQuay || "")}</div>
          <div class="stt">${escapeHtml(encounter.maSttTiepDon || encounter.sttTiepDon || "")}</div>
          <div class="grid">
            <div><div class="label">Mã hồ sơ</div><div class="value">${escapeHtml(encounter.maHs || "")}</div></div>
            <div><div class="label">Mã bệnh nhân</div><div class="value">${escapeHtml(patient.maBn || "")}</div></div>
            <div><div class="label">Họ tên</div><div class="value">${escapeHtml(patient.hoTen || "")}</div></div>
            <div><div class="label">Ngày sinh / Giới tính</div><div class="value">${escapeHtml(patient.ngaySinh || "")} - ${escapeHtml(patient.gioiTinh || "")}</div></div>
            <div><div class="label">Loại khám</div><div class="value">${escapeHtml(encounter.loaiKham || "")}</div></div>
            <div><div class="label">Ưu tiên</div><div class="value">${escapeHtml(encounter.mucUuTien || "")}</div></div>
            <div><div class="label">Phòng</div><div class="value">${escapeHtml(roomText)}</div></div>
            <div><div class="label">Lý do khám</div><div class="value">${escapeHtml(encounter.lyDoKham || "")}</div></div>
          </div>
          <table>
            <thead><tr><th>#</th><th>Dịch vụ</th><th>Phòng</th><th>Trạng thái</th></tr></thead>
            <tbody>${serviceRows}</tbody>
          </table>
        </body>
      </html>
    `);
    win.document.close();
    win.focus();
    win.print();
  };

  const renderActionButtons = (row) => {
    const status = normalizeStatus(row?.trangThai);
    const isCancelledTab = activeTab === "cancelled";
    const isCompletedTab = activeTab === "completed";
    const canSelectService = !isCancelledTab && !isCompletedTab && !!row?.canSelectService && status !== "DA_HUY" && status !== "DA_KHAM" && status !== "DA_DONG";
    const canCancelAction = !isCancelledTab && !isCompletedTab && canDelete && !!row?.canCancel;
    const showCancelDisabled = !isCancelledTab && !isCompletedTab && !canCancelAction;
    const showServiceDisabled = !isCancelledTab && !isCompletedTab && !canSelectService;

    const cancelReason = !canDelete
      ? "Bạn không có quyền hủy tiếp đón."
      : isCancelledTab
      ? "Hồ sơ đã hủy."
      : isCompletedTab
      ? "Không thể hủy hồ sơ hoàn tất."
      : getCancelBlockedReason(status);

    const serviceReason = isCancelledTab
      ? "Hồ sơ đã hủy."
      : isCompletedTab
      ? "Không thể chọn dịch vụ cho hồ sơ hoàn tất."
      : getServiceBlockedReason(status);

    return (
      <div className="flex items-center justify-center gap-1.5">
        <ActionIconButton
          label="Timeline"
          icon={<Clock3 size={14} />}
          onClick={() => openTimeline(row)}
          className="border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100"
        />
        <ActionIconButton
          label={isCompletedTab ? "Xem chi ti\u1ebft h\u1ed3 s\u01a1" : "N\u1ea1p v\u00e0o form"}
          icon={<User size={14} />}
          onClick={() => navigateToForm(row)}
          className="border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
        />
        <ActionIconButton
          label="In phi\u1ebfu kh\u00e1m"
          icon={<Printer size={14} />}
          onClick={() => handlePrintExamTicket(row)}
          className="border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
        />
        {(canSelectService || showServiceDisabled) && (
          <ActionIconButton
            label={canSelectService ? "Ch\u1ecdn d\u1ecbch v\u1ee5" : serviceReason}
            icon={<ListChecks size={14} />}
            onClick={() => navigateToService(row)}
            disabled={!canSelectService}
            className={canSelectService ? "border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100" : "border-slate-200 bg-slate-100 text-slate-400"}
          />
        )}
        {(canCancelAction || showCancelDisabled) && (
          <ActionIconButton
            label={canCancelAction ? "H\u1ee7y ti\u1ebfp \u0111\u00f3n" : cancelReason}
            icon={<Ban size={14} />}
            onClick={() => openCancelModal(row)}
            disabled={!canCancelAction}
            className={canCancelAction ? "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100" : "border-slate-200 bg-slate-100 text-slate-400"}
          />
        )}
        {isCancelledTab && (
          <>
            <ActionIconButton
              label={`Xem l\u00fd do h\u1ee7y: ${getCancelledReason(row)}`}
              icon={<Info size={14} />}
              onClick={() =>
                setInfoModal({
                  open: true,
                  title: "L\u00fd do h\u1ee7y h\u1ed3 s\u01a1",
                  content: getCancelledReason(row),
                })
              }
              className="border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
            />
            <ActionIconButton
              label="X\u00f3a kh\u1ecfi danh s\u00e1ch h\u1ee7y"
              icon={<Trash2 size={14} />}
              onClick={() => setConfirmDeleteCancelled({ open: true, record: row })}
              className="border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
            />
          </>
        )}
      </div>
    );

    // eslint-disable-next-line no-unreachable
    return (
      <div className="flex flex-wrap items-center justify-center gap-1.5">
        <ActionIconButton
          label="Timeline"
          icon={<Clock3 size={14} />}
          onClick={() => openTimeline(row)}
          className="border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100"
        />

        <ActionIconButton
          label={isCompletedTab ? "Xem chi tiết hồ sơ" : "Nạp vào form"}
          icon={<User size={14} />}
          onClick={() => navigateToForm(row)}
          className="border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
        />

        <ActionIconButton
          label="In phiếu khám"
          icon={<Printer size={14} />}
          onClick={() => handlePrintExamTicket(row)}
          className="border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
        />

        {canSelectService && (
          <ActionIconButton
            label="Chọn dịch vụ"
            icon={<ListChecks size={14} />}
            onClick={() => navigateToService(row)}
            className="border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100"
          />
        )}

        {showServiceDisabled && (
          <ActionIconButton
            label={serviceReason}
            icon={<ListChecks size={14} />}
            disabled
            className="border-slate-200 bg-slate-100 text-slate-400"
          />
        )}

        {canCancelAction && (
          <ActionIconButton
            label="Hủy tiếp đón"
            icon={<Ban size={14} />}
            onClick={() => openCancelModal(row)}
            className="border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
          />
        )}

        {showCancelDisabled && (
          <ActionIconButton
            label={cancelReason}
            icon={<Ban size={14} />}
            disabled
            className="border-slate-200 bg-slate-100 text-slate-400"
          />
        )}

        {isCancelledTab && (
          <>
            <ActionIconButton
              label={`Xem lý do hủy: ${getCancelledReason(row)}`}
              icon={<Info size={14} />}
              onClick={() =>
                setInfoModal({
                  open: true,
                  title: "Lý do hủy hồ sơ",
                  content: getCancelledReason(row),
                })
              }
              className="border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
            />
            <ActionIconButton
              label="Xóa khỏi danh sách hủy"
              icon={<Trash2 size={14} />}
              onClick={() => setConfirmDeleteCancelled({ open: true, record: row })}
              className="border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
            />
          </>
        )}
      </div>
    );
  };

  const renderCell = (row, columnId, rowIndex) => {
    const address = [row?.benhNhan?.diaChiDuong, row?.benhNhan?.diaChiXa, row?.benhNhan?.diaChiHuyen, row?.benhNhan?.diaChiTinh]
      .filter((x) => normalize(x))
      .join(", ");
    const status = normalizeStatus(row?.trangThai);

    if (columnId === "stt") {
      return (
        <span className="font-medium text-slate-700" title={row?.maSttTiepDon || ""}>
          {row?.sttTiepDon || (page - 1) * pageSize + rowIndex + 1}
        </span>
      );
    }

    if (columnId === "ngay_tiep_don") {
      return (
        <div className="text-xs text-slate-600 whitespace-nowrap">
          {toDisplayDate(row?.ngayTao, true)}
        </div>
      );
    }

    if (columnId === "ma_hs") {
      return (
        <button
          type="button"
          onClick={() => navigateToForm(row)}
          className="font-semibold text-slate-700 hover:text-sky-700 hover:underline"
          title="Mở chi tiết hồ sơ"
        >
          {row?.maHs || "--"}
        </button>
      );
    }

    if (columnId === "ma_bn") {
      return (
        <button
          type="button"
          onClick={() => navigateToForm(row)}
          className="font-semibold text-sky-700 hover:text-sky-800 hover:underline"
          title="Mở hồ sơ bệnh nhân"
        >
          {row?.benhNhan?.maBn || "--"}
        </button>
      );
    }

    if (columnId === "ho_ten") return <span className="font-semibold text-slate-800">{row?.benhNhan?.hoTen || "--"}</span>;
    if (columnId === "ngay_sinh") return <span>{toDisplayDate(row?.benhNhan?.ngaySinh)}</span>;
    if (columnId === "dia_chi") return <span className="text-slate-600">{address || "Chưa cập nhật"}</span>;
    if (columnId === "so_dien_thoai") return <span>{row?.benhNhan?.soDienThoai || "--"}</span>;
    if (columnId === "loai_kham") return <span>{row?.loaiKham || "Chưa chọn"}</span>;
    if (columnId === "nguon_tiep_nhan") return <span>{row?.nguonTiepNhan || "Chưa chọn"}</span>;
    if (columnId === "phong_dang_ky") {
      const roomInfo = summarizeRoomAndService(row?.phongDangKy);
      return (
        <span className="inline-block max-w-[280px] truncate text-slate-700" title={roomInfo.fullText}>
          {roomInfo.shortText}
        </span>
      );
    }
    if (columnId === "trang_thai") {
      const statusMeta = getStatusMetaV2(status);
      const cancelledReason = status === "DA_HUY" ? getCancelledReason(row) : "";
      return (
        <span
          title={cancelledReason || statusMeta.label}
          className={`inline-flex whitespace-nowrap rounded-md px-2.5 py-1 text-[11px] font-bold tracking-wide transition duration-150 ${statusMeta.className}`}
        >
          {statusMeta.label}
        </span>
      );
    }
    if (columnId === "nguoi_tiep_don") return <span>{row?.nguoiTiepDon || "--"}</span>;
    if (columnId === "thao_tac") return renderActionButtons(row);
    return "--";
  };

  if (permLoading) {
    return <div className="p-8 text-center text-sm text-slate-500">Đang kiểm tra quyền truy cập...</div>;
  }

  if (!canView) {
    return <div className="p-8 text-center text-lg font-semibold text-rose-600">Bạn không có quyền xem danh sách tiếp đón.</div>;
  }

  return (
    <MainLayout>
      <div className="h-full w-full bg-slate-50 p-4 text-slate-800 flex flex-col min-h-0">
        <div className="flex h-full w-full flex-col min-h-0">
          {notice.text && <Notice type={notice.type} text={notice.text} />}

          <section className="flex min-h-0 w-full flex-1 flex-col p-0">
            <div className="sticky top-0 z-20 -mx-4 -mt-4 mb-4 flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 bg-white/95 px-6 py-4 backdrop-blur shadow-sm shrink-0">
              <div>
                <h2 className="text-lg font-bold text-slate-900 tracking-tight">{currentTabMeta.title}</h2>
                <p className="text-xs font-semibold text-slate-450 mt-0.5">{currentTabMeta.subtitle}</p>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-3">
                <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-100/70 p-1 shadow-inner h-9">
                  {TAB_OPTIONS.map((tab) => {
                    const tone = TAB_BUTTON_STYLE[tab.key] || TAB_BUTTON_STYLE.today;
                    return (
                      <button
                        key={tab.key}
                        type="button"
                        onClick={() => setActiveTab(tab.key)}
                        className={`rounded-lg px-3.5 text-xs font-bold transition-all duration-200 hover:-translate-y-[0.5px] active:translate-y-0 h-7 flex items-center justify-center ${
                          activeTab === tab.key ? tone.active : tone.idle
                        }`}
                      >
                        {tab.label}
                      </button>
                    );
                  })}
                </div>
                {(
                  <button
                    type="button"
                    onClick={() => navigate("/tiep-don/nhap")}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#0077B6] hover:bg-[#006093] hover:shadow-md hover:shadow-[#0077B6]/15 px-3.5 text-xs font-bold text-white shadow-sm transition-all duration-150 hover:-translate-y-[0.5px] active:translate-y-0 h-9"
                    title="Tạo tiếp đón mới"
                  >
                    <FilePlus2 size={14} />
                    Tiếp đón mới
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setAdvancedFiltersOpen((prev) => !prev)}
                  className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 text-xs font-bold transition-all duration-155 hover:-translate-y-[0.5px] active:translate-y-0 h-9 ${
                    advancedFiltersOpen
                      ? "border-amber-300 bg-amber-50 text-amber-700 shadow-sm"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-350 hover:shadow-sm"
                  }`}
                  title="Bộ lọc nâng cao"
                >
                  <Filter size={14} />
                  Bộ lọc nâng cao
                </button>
                <button
                  type="button"
                  onClick={() => setColumnModalOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all duration-150 hover:-translate-y-[0.5px] active:translate-y-0 hover:shadow-sm h-9"
                  title="Tùy chỉnh cột hiển thị"
                >
                  <Settings2 size={14} />
                  Cột hiển thị
                </button>
                <button
                  type="button"
                  onClick={handleExport}
                  disabled={!canExport || exporting || listLoading || records.length === 0}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100/80 transition-all duration-150 hover:-translate-y-[0.5px] active:translate-y-0 hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-50 disabled:-translate-y-0 disabled:shadow-none h-9"
                >
                  <Download size={14} />
                  {exporting ? "Đang xuất..." : "Xuất Excel"}
                </button>
              </div>
            </div>

            <div className="mt-1 grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-4">
              <div className="relative">
                <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="Tìm họ tên, mã BN, mã HS, CCCD..."
                  className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3.5 text-sm outline-none shadow-sm transition-all duration-200 hover:border-slate-300 focus:border-[#0077B6] focus:ring-4 focus:ring-[#0077B6]/10 font-semibold"
                />
              </div>
              <div className="relative">
                <Phone size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={phoneKeyword}
                  onChange={(e) => setPhoneKeyword(e.target.value)}
                  placeholder="Tìm số điện thoại"
                  className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3.5 text-sm outline-none shadow-sm transition-all duration-200 hover:border-slate-300 focus:border-[#0077B6] focus:ring-4 focus:ring-[#0077B6]/10 font-semibold"
                />
              </div>
              <DatePicker
                value={filterDate}
                onChange={(nextValue) => setFilterDate(nextValue)}
                placeholder="Chọn ngày lọc hồ sơ..."
                className="w-full"
              />
              <AnimatedSelect
                value={statusFilter}
                onChange={(nextValue) => setStatusFilter(nextValue)}
                options={statusOptions}
                placeholder={"Tất cả trạng thái"}
                icon={<Filter size={14} />}
                buttonClassName="!rounded-lg"
              />
            </div>

            {advancedFiltersOpen && (
              <div className="mt-2 grid grid-cols-1 gap-2 lg:grid-cols-2 xl:grid-cols-4">
                <AnimatedSelect
                  value={loaiKhamFilter}
                  onChange={(nextValue) => setLoaiKhamFilter(nextValue)}
                  options={[
                    { value: "ALL", label: "Tất cả loại khám" },
                    ...loaiKhamOptions,
                  ]}
                  placeholder={"Tất cả loại khám"}
                  buttonClassName="!rounded-lg"
                />
                <AnimatedSelect
                  value={nguonFilter}
                  onChange={(nextValue) => setNguonFilter(nextValue)}
                  options={[
                    { value: "ALL", label: "Tất cả nguồn tiếp nhận" },
                    ...nguonOptions,
                  ]}
                  placeholder={"Tất cả nguồn tiếp nhận"}
                  buttonClassName="!rounded-lg"
                />
              </div>
            )}

            <div className="mt-3 min-h-0 flex-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-all duration-300 flex flex-col">
              <div className="flex-1 overflow-auto min-h-[430px]">
                <table className="min-w-full text-sm">
                  <thead className="sticky top-0 z-20 bg-slate-50">
                    <tr>
                      {visibleColumns.map((column) => (
                        <th
                          key={column.id}
                          className={`border-b border-slate-200 px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400 ${columnHeaderClass(column.id)}`}
                        >
                          {column.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {listLoading ? (
                      <tr>
                        <td colSpan={visibleColumns.length} className="h-[calc(62vh-42px)] min-h-[380px] px-3 py-8 text-center text-slate-500">
                          <div className="mx-auto grid max-w-5xl gap-2">
                            {Array.from({ length: 10 }).map((_, rowIndex) => (
                              <div key={`skeleton-row-${rowIndex}`} className="grid grid-cols-6 gap-3">
                                {Array.from({ length: 6 }).map((__, colIndex) => (
                                  <span
                                    key={`skeleton-cell-${rowIndex}-${colIndex}`}
                                    className={`h-3 animate-pulse rounded bg-slate-200 ${colIndex === 2 ? "col-span-2" : ""}`}
                                  />
                                ))}
                              </div>
                            ))}
                          </div>
                          <span className="sr-only">
                            <Loader2 size={15} className="animate-spin" />
                            Đang tải danh sách...
                          </span>
                        </td>
                      </tr>
                    ) : records.length === 0 ? (
                      <tr>
                        <td colSpan={visibleColumns.length} className="h-[calc(62vh-42px)] min-h-[380px] px-3 py-10 text-center text-slate-400">
                          <div className="flex flex-col items-center gap-2">
                            <AlertCircle size={18} className="text-slate-400" />
                            <p className="font-medium text-slate-500">Không có hồ sơ phù hợp</p>
                            <p className="text-xs text-slate-400">Thử thay đổi bộ lọc hoặc ngày tìm kiếm.</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      records.map((row, idx) => (
                        <tr key={row?.id || idx} className="group hover:bg-sky-50/20 transition-all duration-150">
                          {visibleColumns.map((column) => (
                            <td
                              key={`${row?.id || idx}-${column.id}`}
                              className={`border-b border-slate-100 px-3 py-2.5 align-top text-slate-700 ${columnCellClass(column.id)}`}
                            >
                              {renderCell(row, column.id, idx)}
                            </td>
                          ))}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-3 text-xs text-slate-600 bg-slate-50/30 px-2 py-1.5 rounded-lg mt-2">
              <span className="font-bold">
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
                  buttonClassName="!rounded-md !py-1 !pr-7 !text-xs border-slate-200 hover:border-slate-350 hover:shadow-sm"
                  menuClassName="min-w-[110px]"
                />
                <button
                  type="button"
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  disabled={page <= 1 || listLoading}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-bold transition-all duration-150 hover:-translate-y-[0.5px] hover:bg-slate-50 active:translate-y-0 hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0 disabled:shadow-none"
                >
                  Trước
                </button>
                <button
                  type="button"
                  onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={page >= totalPages || listLoading}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-bold transition-all duration-150 hover:-translate-y-[0.5px] hover:bg-slate-50 active:translate-y-0 hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0 disabled:shadow-none"
                >
                  Sau
                </button>
              </div>
            </div>
          </section>
        </div>

        {columnModalOpen && (
          <ColumnSettingModal
            search={columnSearch}
            columns={columns}
            filteredColumns={filteredColumnOptions}
            onSearchChange={setColumnSearch}
            onToggle={toggleColumn}
            onMove={moveColumn}
            onClose={() => setColumnModalOpen(false)}
            onReset={() => {
              setColumns(DEFAULT_COLUMNS);
              saveColumnConfig(DEFAULT_COLUMNS);
            }}
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

        {cancelModal.open && (
          <CancelModal
            state={cancelModal}
            reasonOptions={cancelReasonOptions}
            onChange={(patch) => setCancelModal((prev) => ({ ...prev, ...patch }))}
            onClose={() =>
              setCancelModal({
                open: false,
                record: null,
                maLyDoHuy: "",
                lyDoHuy: "",
                ghiChu: "",
                errors: {},
                submitting: false,
              })
            }
            onConfirm={confirmCancelEncounter}
          />
        )}

        {confirmDeleteCancelled.open && (
          <ConfirmModal
            title="Xóa hồ sơ khỏi danh sách hủy"
            content={`Xác nhận xóa hồ sơ ${confirmDeleteCancelled.record?.maHs || "--"} khỏi danh sách hủy trên màn hình hiện tại?`}
            confirmText="Xóa"
            danger
            onCancel={() => setConfirmDeleteCancelled({ open: false, record: null })}
            onConfirm={confirmDeleteCancelledRecord}
          />
        )}

        {infoModal.open && (
          <InfoModal
            title={infoModal.title}
            content={infoModal.content}
            onClose={() => setInfoModal({ open: false, title: "", content: "" })}
          />
        )}
      </div>
    </MainLayout>
  );
}

function ActionIconButton({ label, icon, onClick, className = "", disabled = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      disabled={disabled}
      className={`rounded-md border p-1.5 transition disabled:cursor-not-allowed ${disabled ? "opacity-60" : ""} ${className}`}
    >
      {icon}
    </button>
  );
}

function ColumnSettingModal({ search, columns, filteredColumns, onSearchChange, onToggle, onMove, onClose, onReset }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 backdrop-blur-sm animate-fadeIn">
      <div className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl animate-fadeSlide">
        <header className="flex shrink-0 items-center justify-between border-b border-[#0077B6]/20 bg-gradient-to-r from-[#0077B6] to-[#0096C7] px-5 py-4 text-white">
          <div>
            <p className="text-[10px] font-extrabold uppercase text-sky-100 tracking-wider leading-none mb-1">
              Cài đặt hệ thống
            </p>
            <h3 className="text-base font-bold tracking-tight">Cài đặt hiển thị cột bảng</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-white hover:bg-white/20 transition-all duration-200"
          >
            <X size={18} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-5">
          <p className="text-xs font-semibold text-slate-500 mb-3">Chọn các cột dữ liệu bạn muốn hiển thị trên danh sách và sắp xếp thứ tự hiển thị bằng các nút di chuyển.</p>

          <div className="relative mb-4">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Tìm kiếm cột cần hiển thị..."
              className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none shadow-sm transition-all duration-200 hover:border-slate-350 focus:border-[#0077B6] focus:ring-4 focus:ring-[#0077B6]/10 font-medium text-slate-700"
            />
          </div>

          <div className="max-h-[40vh] overflow-y-auto pr-1 space-y-2">
            {filteredColumns.map((col) => {
              const realIndex = columns.findIndex((x) => x.id === col.id);
              const isChecked = col.visible !== false;
              return (
                <div key={col.id} className="flex items-center justify-between rounded-xl border border-slate-150 bg-slate-50/50 hover:bg-slate-50 p-3 hover:border-slate-300 transition-all duration-150">
                  <label className="flex items-center gap-3 text-sm font-semibold text-slate-700 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      disabled={col.locked}
                      onChange={() => onToggle(col.id)}
                      className="h-4.5 w-4.5 rounded border-slate-300 text-[#0077B6] focus:ring-[#0077B6]/20 cursor-pointer disabled:cursor-not-allowed"
                    />
                    <span className={isChecked ? "text-slate-800" : "text-slate-450 font-normal"}>{col.label}</span>
                    {col.locked && (
                      <span className="rounded-md bg-slate-200/80 px-2 py-0.5 text-[10px] font-bold text-slate-650">Bắt buộc</span>
                    )}
                  </label>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onMove(realIndex, "up")}
                      disabled={realIndex <= 0}
                      className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white disabled:cursor-not-allowed transition"
                      aria-label="Di chuyển cột lên trên"
                      title="Di chuyển lên trên"
                    >
                      <MoveUp size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => onMove(realIndex, "down")}
                      disabled={realIndex >= columns.length - 1}
                      className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white disabled:cursor-not-allowed transition"
                      aria-label="Di chuyển cột xuống dưới"
                      title="Di chuyển xuống dưới"
                    >
                      <MoveDown size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <footer className="shrink-0 flex items-center justify-between border-t border-slate-200 bg-slate-50/50 px-5 py-4">
          <button
            type="button"
            onClick={onReset}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-300 hover:shadow-sm transition"
          >
            Về mặc định
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-300 hover:shadow-sm transition"
            >
              Hủy bỏ
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg bg-[#0077B6] px-5 py-2 text-xs font-bold text-white hover:bg-[#006093] hover:shadow-md hover:shadow-[#0077B6]/15 transition"
            >
              Lưu thay đổi
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}

function TimelineModal({ state, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 backdrop-blur-sm animate-fadeIn">
      <div className="flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl animate-fadeSlide">
        <header className="flex shrink-0 items-center justify-between border-b border-[#0077B6]/20 bg-gradient-to-r from-[#0077B6] to-[#0096C7] px-5 py-4 text-white">
          <div>
            <p className="text-[10px] font-extrabold uppercase text-sky-100 tracking-wider leading-none mb-1">
              Lịch sử hồ sơ
            </p>
            <h3 className="text-base font-bold tracking-tight">Timeline trạng thái tiếp đón</h3>
            <p className="mt-1 text-xs font-medium text-sky-100/70">
              Mã HS: <span className="font-bold text-white">{state.record?.maHs || "--"}</span> • {state.record?.benhNhan?.hoTen || "Không rõ bệnh nhân"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-white hover:bg-white/20 transition-all duration-200"
          >
            <X size={18} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-5 bg-slate-50/30">
          {state.loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, idx) => (
                <div key={idx} className="animate-pulse rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="h-4 w-1/3 rounded bg-slate-200" />
                  <div className="mt-3 h-3 w-2/3 rounded bg-slate-200" />
                  <div className="mt-2 h-3 w-1/2 rounded bg-slate-200" />
                </div>
              ))}
            </div>
          ) : state.error ? (
            <div className="flex flex-col items-center gap-2 py-8 text-rose-600">
              <AlertCircle size={24} />
              <p className="text-sm font-semibold">{state.error}</p>
            </div>
          ) : (state.logs || []).length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-slate-400">
              <History size={24} className="text-slate-350" />
              <p className="text-sm font-medium">Chưa có lịch sử thay đổi trạng thái cho hồ sơ này.</p>
            </div>
          ) : (
            <div className="relative pl-8 pr-1 py-1">
              <span className="absolute bottom-1 left-[14px] top-1 w-0.5 bg-slate-200" />
              {(state.logs || []).map((log, idx) => {
                const stepNum = idx + 1;
                return (
                  <div key={log?.id || idx} className="relative mb-4 last:mb-0 rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition duration-200">
                    <span className="absolute -left-[27px] top-3.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#0077B6]/10 border border-[#0077B6]/15 text-xs font-bold text-[#0077B6]">
                      {stepNum}
                    </span>
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2 mb-2">
                      <p className="text-sm font-bold text-slate-800">
                        {getStatusMeta(normalizeStatus(log?.fromTrangThai)).label} 
                        <span className="mx-2 text-slate-400">→</span> 
                        {getStatusMeta(normalizeStatus(log?.toTrangThai)).label}
                      </p>
                      <span className="text-xs font-semibold text-slate-500 bg-slate-100 rounded-md px-2 py-0.5">{toDisplayDate(log?.createdAt, true)}</span>
                    </div>
                    <p className="text-xs text-slate-600 font-medium leading-relaxed">
                      Hành động: <span className="font-bold text-slate-800">{getTimelineActionLabel(log?.action)}</span>
                    </p>
                    <p className="text-xs text-slate-600 font-medium leading-relaxed mt-1">
                      Nhân viên: <span className="font-bold text-slate-800">{log?.nguoiDung || `Mã NV #${log?.idNguoiDung || "--"}`}</span>
                    </p>
                    {getTimelineNote(log) && (
                      <div className="mt-3 rounded-lg border border-slate-150 bg-slate-50 p-2.5 text-xs text-slate-700 font-medium">
                        <span className="font-bold block text-slate-500 uppercase text-[9px] mb-1">Ghi chú chi tiết</span>
                        {getTimelineNote(log)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <footer className="shrink-0 border-t border-slate-200 bg-slate-50/50 px-5 py-4 text-right">
          <button 
            type="button" 
            onClick={onClose} 
            className="rounded-lg border border-slate-200 bg-white px-5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition"
          >
            Đóng cửa sổ
          </button>
        </footer>
      </div>
    </div>
  );
}

function CancelModal({ state, reasonOptions = [], onChange, onClose, onConfirm }) {
  const selectedReason = reasonOptions.find((x) => x.value === state.maLyDoHuy);
  const reasonLabel = selectedReason?.label || "";
  const isOtherReason = state.maLyDoHuy === "KHAC";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-lg rounded-2xl border border-rose-100 bg-white shadow-2xl animate-fadeSlide overflow-hidden">
        <header className="flex shrink-0 items-center justify-between border-b border-rose-100 bg-gradient-to-r from-rose-500 to-rose-600 px-5 py-4 text-white">
          <div>
            <p className="text-[10px] font-extrabold uppercase text-rose-100 tracking-wider leading-none mb-1">
              Yêu cầu hủy tiếp nhận
            </p>
            <h3 className="text-base font-bold tracking-tight">Xác nhận hủy hồ sơ tiếp đón</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-white hover:bg-white/20 transition-all duration-200"
          >
            <X size={18} />
          </button>
        </header>

        <div className="p-5">
          <div className="mb-4 rounded-xl border border-rose-200/60 bg-rose-50/50 p-3 text-xs text-rose-800 font-semibold flex items-center gap-2">
            <AlertTriangle size={16} className="text-rose-600 shrink-0" />
            <span>Hồ sơ đang chọn: <strong className="font-extrabold">{state.record?.maHs || "--"}</strong> ({state.record?.benhNhan?.hoTen || "--"})</span>
          </div>

          <div className="space-y-4">
            <AnimatedSelect
              label="Lý do hủy tiếp đón *"
              value={state.maLyDoHuy || ""}
              onChange={(value) =>
                onChange({
                  maLyDoHuy: value,
                  lyDoHuy: reasonOptions.find((x) => x.value === value)?.label || "",
                  errors: { ...state.errors, maLyDoHuy: "", lyDoHuy: "" },
                })
              }
              options={reasonOptions}
              placeholder={"-- Chọn lý do hủy tiếp đón --"}
              error={state.errors.maLyDoHuy}
              buttonClassName="!rounded-lg !py-2 !text-sm border-slate-200 focus:border-rose-500 focus:ring-rose-200"
            />
            
            <InputField
              label="Diễn giải lý do"
              name="lyDoHuy"
              value={state.lyDoHuy || reasonLabel}
              readOnly
              onChange={(e) => onChange({ lyDoHuy: e.target.value, errors: { ...state.errors, lyDoHuy: "" } })}
              error={state.errors.lyDoHuy}
            />
            
            <TextAreaField
              required={isOtherReason}
              label={isOtherReason ? "Ghi chú bắt buộc khi chọn lý do khác *" : "Ghi chú chi tiết"}
              name="ghiChu"
              value={state.ghiChu}
              placeholder="Nhập lý do chi tiết..."
              onChange={(e) => onChange({ ghiChu: e.target.value, errors: { ...state.errors, ghiChu: "" } })}
              error={state.errors.ghiChu}
            />
          </div>
        </div>

        <footer className="shrink-0 flex items-center justify-end gap-2 border-t border-slate-100 bg-slate-50/50 px-5 py-4">
          <button 
            type="button" 
            onClick={onClose} 
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-350 transition"
          >
            Quay lại
          </button>
          <button 
            type="button" 
            onClick={onConfirm} 
            disabled={state.submitting} 
            className="rounded-lg bg-rose-600 px-5 py-2 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-60 transition shadow-sm hover:shadow-md hover:shadow-rose-600/10 flex items-center gap-1.5"
          >
            {state.submitting ? "Đang xử lý..." : "Xác nhận hủy hồ sơ"}
          </button>
        </footer>
      </div>
    </div>
  );
}

function ConfirmModal({ title, content, onCancel, onConfirm, confirmText = "Xác nhận", danger = false }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-955/50 px-4 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-2xl animate-fadeSlide overflow-hidden">
        <header className={`flex shrink-0 items-center justify-between border-b px-5 py-4 text-white ${
          danger 
            ? "border-rose-100 bg-gradient-to-r from-rose-500 to-rose-600" 
            : "border-[#0077B6]/20 bg-gradient-to-r from-[#0077B6] to-[#0096C7]"
        }`}>
          <div className="flex items-center gap-2">
            {danger ? <AlertTriangle size={18} className="text-white" /> : <HelpCircle size={18} className="text-white" />}
            <h3 className="text-base font-bold tracking-tight">{title}</h3>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-white hover:bg-white/20 transition-all duration-200"
          >
            <X size={18} />
          </button>
        </header>

        <div className="p-5 text-sm font-semibold text-slate-655 leading-relaxed">
          {content}
        </div>

        <footer className="shrink-0 flex items-center justify-end gap-2 border-t border-slate-100 bg-slate-50/50 px-5 py-4">
          <button 
            type="button" 
            onClick={onCancel} 
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
          >
            Để sau
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`rounded-lg px-5 py-2 text-xs font-bold text-white transition hover:shadow-md ${
              danger 
                ? "bg-rose-600 hover:bg-rose-700 hover:shadow-rose-600/10" 
                : "bg-[#0077B6] hover:bg-[#006093] hover:shadow-[#0077B6]/10"
            }`}
          >
            {confirmText}
          </button>
        </footer>
      </div>
    </div>
  );
}

function InfoModal({ title, content, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-955/50 px-4 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-md rounded-2xl border border-emerald-100 bg-white shadow-2xl animate-fadeSlide overflow-hidden">
        <header className="flex shrink-0 items-center justify-between border-b border-emerald-100 bg-gradient-to-r from-emerald-500 to-emerald-600 px-5 py-4 text-white">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} className="text-white" />
            <h3 className="text-base font-bold tracking-tight">{title}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-white hover:bg-white/20 transition-all duration-200"
          >
            <X size={18} />
          </button>
        </header>

        <div className="p-5 text-sm font-semibold text-slate-655 leading-relaxed">
          {content}
        </div>

        <footer className="shrink-0 flex justify-end border-t border-slate-100 bg-slate-50/50 px-5 py-4">
          <button 
            type="button" 
            onClick={onClose} 
            className="rounded-lg bg-emerald-600 px-5 py-2 text-xs font-bold text-white hover:bg-emerald-700 transition hover:shadow-md hover:shadow-emerald-600/10"
          >
            Đã hiểu
          </button>
        </footer>
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
        <ChevronDown size={16} className="mt-0.5 rotate-[-90deg]" />
        <span>{text}</span>
      </div>
    </div>
  );
}

function InputField({ label, name, value, onChange, readOnly = false, error = "", type = "text" }) {
  return (
    <label className="block">
      <span className="mb-0.5 block text-xs font-semibold text-slate-600">{label}</span>
      <input
        type={type}
        name={name}
        value={value || ""}
        onChange={onChange}
        readOnly={readOnly}
        className={`w-full rounded-lg border px-3 py-1.5 text-sm outline-none transition duration-200 ${
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

function TextAreaField({ label, name, value, onChange, error = "", rows = 3, required = false }) {
  return (
    <label className="block">
      <span className={`mb-0.5 block text-xs font-semibold ${required ? "text-rose-600" : "text-slate-600"}`}>{label}</span>
      <textarea
        name={name}
        value={value || ""}
        onChange={onChange}
        rows={rows}
        className={`w-full rounded-lg border px-3 py-1.5 text-sm outline-none transition duration-200 ${
          error
            ? "border-rose-300 bg-white shadow-sm focus:border-rose-500 focus:ring-2 focus:ring-rose-200"
            : "border-slate-200 bg-white shadow-sm hover:border-sky-300 focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
        }`}
      />
      {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
    </label>
  );
}
