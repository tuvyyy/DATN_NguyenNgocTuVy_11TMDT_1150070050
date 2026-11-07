import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Filter,
  Loader2,
  MapPin,
  Phone,
  Search,
  Stethoscope,
  User,
  XCircle,
} from "lucide-react";
import MainLayout from "../layouts/MainLayout";
import AnimatedSelect from "../components/ui/AnimatedSelect";
import { usePermission } from "../hooks/UsePermission";
import {
  confirmServiceOrderV2,
  getEncounterSummaryV2,
  getServiceCatalogV2,
  saveServiceOrderDraftV2,
} from "../api/TiepDonApi";
import { hasMojibake, matchBestOption, normalizeVietnameseText, toLooseKey } from "../utils/textCodec";

const STATUS_LABEL = {
  MOI_TAO: "Mới tạo",
  DA_TIEP_DON: "Đã tiếp đón",
  CHO_DICH_VU: "Chờ dịch vụ",
  DICH_VU_NHAP: "Dịch vụ nháp",
  CHO_THANH_TOAN: "Chờ thanh toán",
  DA_THANH_TOAN: "Đã thanh toán",
  CHO_CHUYEN_KHU: "Chờ chuyển khu",
  DA_NHAN_KHU_MOI: "Đã nhận khu mới",
  HUY_CHUYEN_KHU: "Hủy chuyển khu",
  CHO_KHAM: "Chờ khám",
  DANG_KHAM: "Đang khám",
  CHO_CAN_LAM_SANG: "Chờ cận lâm sàng",
  CHO_KET_QUA: "Chờ kết quả",
  CHO_KET_LUAN: "Chờ kết luận",
  DA_KHAM: "Đã khám",
  DA_DONG: "Đã đóng",
  DA_HUY: "Đã hủy",
};

const EDITABLE_ENCOUNTER_STATES = new Set([
  "DA_TIEP_DON",
  "CHO_DICH_VU",
  "DICH_VU_NHAP",
  "CHO_THANH_TOAN",
  "DA_NHAN_KHU_MOI",
  "HUY_CHUYEN_KHU",
]);

const toDisplayDate = (value) => {
  if (!value) return "--";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "--";
  return d.toLocaleDateString("vi-VN");
};

const calcAge = (dateString) => {
  if (!dateString) return "--";
  const dob = new Date(dateString);
  if (Number.isNaN(dob.getTime())) return "--";
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age -= 1;
  return age >= 0 ? age : "--";
};

const normalize = (value) => (value ?? "").toString().trim();
const normalizeForCompare = (value) => toLooseKey(normalize(value));

const PRIORITY_OPTIONS = ["Thường", "Ưu tiên", "Cấp cứu", "Hẹn trước", "VIP"];

const toCanonicalPriority = (value) => {
  const current = normalizeVietnameseText(value || "");
  if (!current) return "";

  const match =
    PRIORITY_OPTIONS.find((item) => normalizeForCompare(item) === normalizeForCompare(current)) ||
    matchBestOption(current, PRIORITY_OPTIONS);
  if (match) return match;
  if (hasMojibake(current)) return "Thường";
  return current;
};

const extractMessage = (res, fallback) => {
  if (!res) return fallback;
  if (typeof res.data === "string") return res.data;
  return res.data?.message || fallback;
};

const inferServiceMode = (visitType) => {
  const value = normalizeForCompare(visitType);
  if (["kham tong quat", "kham theo goi", "kham doanh nghiep"].includes(value)) {
    return "MULTI_SERVICE";
  }
  return "SINGLE_MAIN_ROOM";
};

const createIdempotencyKey = (prefix = "service-order") =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

export default function ChiDinhKham() {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    canAdd,
    canEdit,
    loading: permLoading,
  } = usePermission("TIEP_DON");
  const locationPatient = location.state?.patient || null;
  const locationEncounterId = Number(locationPatient?.idHoSo ?? location.state?.encounterId ?? 0) || null;

  const [encounterInfo, setEncounterInfo] = useState(null);
  const [existingOrder, setExistingOrder] = useState(null);

  const [services, setServices] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [saving, setSaving] = useState("");

  const [keyword, setKeyword] = useState("");
  const [roomFilter, setRoomFilter] = useState("ALL");
  const [groupFilter, setGroupFilter] = useState("ALL");
  const [roomStatusFilter, setRoomStatusFilter] = useState("ALL");
  const [areaScopeFilter, setAreaScopeFilter] = useState("CURRENT_AREA");

  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [note, setNote] = useState("");
  const [modal, setModal] = useState({
    open: false,
    type: "info",
    title: "",
    message: "",
    details: "",
    action: null,
  });

  useEffect(() => {
    let isCancelled = false;
    const init = async () => {
      setLoadingList(true);
      try {
        const encounterId = locationEncounterId;
        let targetAreaId = Number(locationPatient?.khuTiepDon?.id || 0) || undefined;
        if (encounterId) {
          const summaryRes = await getEncounterSummaryV2(encounterId);
          if (summaryRes && summaryRes.status < 400 && !isCancelled) {
            const encounter = summaryRes.data?.encounter || {};
            targetAreaId = Number(encounter?.khuTiepDon?.id || targetAreaId || 0) || undefined;
            const order = summaryRes.data?.serviceOrder || null;
            setEncounterInfo({
              encounter: {
                id: encounter?.id,
                maHs: encounter?.maHs,
                trangThai: encounter?.trangThai,
                sourceType: normalizeVietnameseText(encounter?.sourceType || ""),
                visitType: normalizeVietnameseText(encounter?.visitType || ""),
                priority: toCanonicalPriority(encounter?.priority || ""),
                khuTiepDon: encounter?.khuTiepDon || locationPatient?.khuTiepDon || null,
                quayTiepDon: encounter?.quayTiepDon || locationPatient?.quayTiepDon || null,
              },
              patient: {
                id: summaryRes.data?.patient?.id,
                maBn: summaryRes.data?.patient?.maBn,
                hoTen: normalizeVietnameseText(summaryRes.data?.patient?.hoTen),
                gioiTinh: normalizeVietnameseText(summaryRes.data?.patient?.gioiTinh),
                ngaySinh: summaryRes.data?.patient?.ngaySinh,
                soDienThoai: summaryRes.data?.patient?.soDienThoai,
              },
            });
            setExistingOrder(order);

            const preselectedIds = Array.isArray(order?.lines)
              ? order.lines.map((line) => Number(line?.serviceId)).filter((id) => Number.isFinite(id) && id > 0)
              : [];

            if (preselectedIds.length > 0) {
              setSelectedIds((prev) => (prev.length > 0 ? prev : Array.from(new Set(preselectedIds))));
            }
          }
        }

        const serviceRes = await getServiceCatalogV2({
          encounterId: encounterId || undefined,
          idKhuTiepDon: targetAreaId || undefined,
        });
        if (!serviceRes || serviceRes.status >= 400) {
          if (!isCancelled) {
            setModal({
              open: true,
              type: "error",
              title: "Không tải được danh mục dịch vụ",
              message: extractMessage(serviceRes, "Vui lòng kiểm tra API danh mục dịch vụ."),
              details: "",
              action: null,
            });
          }
        } else if (!isCancelled) {
          setServices(Array.isArray(serviceRes.data) ? serviceRes.data : []);
        }
      } finally {
        if (!isCancelled) setLoadingList(false);
      }
    };

    init();
    return () => {
      isCancelled = true;
    };
  }, [locationEncounterId, locationPatient?.khuTiepDon, locationPatient?.quayTiepDon]);

  const roomOptions = useMemo(() => {
    const map = new Map();
    for (const s of services) {
      if (!s?.idPhong) continue;
      if (!map.has(s.idPhong)) map.set(s.idPhong, s.tenPhong || `Phòng ${s.idPhong}`);
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [services]);

  const groupOptions = useMemo(() => {
    const set = new Set();
    for (const s of services) {
      if (normalize(s.nhomDichVu)) set.add(normalize(s.nhomDichVu));
    }
    return Array.from(set.values()).sort();
  }, [services]);

  const targetArea = encounterInfo?.encounter?.khuTiepDon || locationPatient?.khuTiepDon || null;
  const targetAreaId = Number(targetArea?.id || 0) || null;
  const targetAreaLabel = targetArea
    ? `${targetArea.maKhu ? `${targetArea.maKhu} - ` : ""}${targetArea.tenKhu || targetArea.maKhu || ""}`
    : "";
  const areaStats = useMemo(() => {
    const total = services.length;
    const selectable = services.filter((item) => item?.canSelect !== false).length;
    const unmapped = services.filter((item) => !item?.idKhuTiepDon).length;
    const other = services.filter((item) => item?.idKhuTiepDon && targetAreaId && Number(item.idKhuTiepDon) !== Number(targetAreaId)).length;
    return { total, selectable, unmapped, other };
  }, [services, targetAreaId]);

  const filteredServices = useMemo(() => {
    const kw = normalize(keyword).toLowerCase();
    return services.filter((item) => {
      if (areaScopeFilter === "CURRENT_AREA" && item.canSelect === false) return false;
      if (areaScopeFilter === "OTHER_AREA") {
        if (!targetAreaId || !item.idKhuTiepDon || Number(item.idKhuTiepDon) === Number(targetAreaId)) return false;
      }
      if (areaScopeFilter === "UNMAPPED" && item.idKhuTiepDon) return false;
      if (roomFilter !== "ALL" && String(item.idPhong) !== roomFilter) return false;
      if (groupFilter !== "ALL" && normalize(item.nhomDichVu) !== groupFilter) return false;
      if (roomStatusFilter !== "ALL" && normalize(item.trangThaiPhong) !== roomStatusFilter) return false;
      if (!kw) return true;

      const haystack = `${item.maDichVu || ""} ${item.tenDichVu || ""} ${item.tenPhong || ""}`.toLowerCase();
      return haystack.includes(kw);
    });
  }, [areaScopeFilter, groupFilter, keyword, roomFilter, roomStatusFilter, services, targetAreaId]);

  const totalPages = Math.max(1, Math.ceil(filteredServices.length / pageSize));
  useEffect(() => {
    setPage(1);
  }, [keyword, roomFilter, groupFilter, roomStatusFilter, areaScopeFilter]);
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const currentRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredServices.slice(start, start + pageSize);
  }, [filteredServices, page]);

  const selectedServices = useMemo(
    () => services.filter((item) => selectedIds.includes(item.idDichVu)),
    [services, selectedIds]
  );

  const persistedLineMap = useMemo(() => {
    const map = new Map();
    const lines = Array.isArray(existingOrder?.lines) ? existingOrder.lines : [];
    lines.forEach((line) => {
      const serviceId = Number(line?.serviceId);
      if (Number.isFinite(serviceId) && serviceId > 0) {
        map.set(serviceId, line);
      }
    });
    return map;
  }, [existingOrder]);

  const tamTinh = useMemo(
    () => selectedServices.reduce((sum, item) => sum + Number(item.donGia || 0), 0),
    [selectedServices]
  );
  const giamGia = 0;
  const thanhTienDuKien = Math.max(0, tamTinh - giamGia);

  const canAccess = !!encounterInfo?.encounter?.id && !!encounterInfo?.patient?.id;
  const encounterStatus = normalize(encounterInfo?.encounter?.trangThai);
  const canManageServiceOrder = canAdd || canEdit;
  const canEditService = canAccess && canManageServiceOrder && EDITABLE_ENCOUNTER_STATES.has(encounterStatus);
  const lockReason = !canAccess
    ? ""
    : !canManageServiceOrder
    ? "Tài khoản hiện tại chỉ được xem tiếp đón, không được lưu/chỉnh sửa phiếu dịch vụ."
    : !canEditService
    ? "Hồ sơ đã qua bước đăng ký dịch vụ ban đầu. Reception chỉ được xem, không được xác nhận lại."
    : "";

  const toggleService = (serviceId) => {
    if (!canEditService) {
      setModal({
        open: true,
        type: "warning",
        title: "Không thể chỉnh sửa dịch vụ",
        message: lockReason || "Hồ sơ hiện tại không cho phép chỉnh sửa dịch vụ.",
        details: "",
        action: null,
      });
      return;
    }

    const service = services.find((item) => Number(item.idDichVu) === Number(serviceId));
    if (service && service.canSelect === false && !selectedIds.includes(serviceId)) {
      setModal({
        open: true,
        type: "warning",
        title: "Dịch vụ không thuộc khu tiếp đón",
        message: service.lyDoKhongChon || "Dịch vụ/phòng này không hợp lệ với khu tiếp đón của hồ sơ.",
        details: `Khu hồ sơ: ${targetAreaLabel || "--"}
Khu phòng: ${service.tenKhuTiepDon || service.maKhuTiepDon || "Chưa map khu"}`,
        action: null,
      });
      return;
    }

    setSelectedIds((prev) => {
      if (prev.includes(serviceId)) {
        const persisted = persistedLineMap.get(serviceId);
        if (persisted) {
          const orderStatus = normalize(existingOrder?.trangThai).toUpperCase();
          if (orderStatus === "DA_THANH_TOAN") {
            setModal({
              open: true,
              type: "warning",
              title: "Không thể xóa dịch vụ",
              message: "Phiếu dịch vụ đã thanh toán. Cần tạo điều chỉnh/hoàn tiền theo quy trình thu ngân.",
              details: "",
              action: null,
            });
            return prev;
          }

          const reason = window.prompt("Nhập lý do hủy dòng dịch vụ để lưu:", "");
          if (!reason || !normalize(reason)) return prev;
          setNote((old) => {
            const prefix = normalize(old);
            const extra = `Hủy dịch vụ #${serviceId}: ${normalize(reason)}`;
            return prefix ? `${prefix}\n${extra}` : extra;
          });
        }

        return prev.filter((id) => id !== serviceId);
      }
      return [...prev, serviceId];
    });
  };

  const openConfirmModal = (mode) => {
    if (!canAccess) {
      setModal({
        open: true,
        type: "warning",
        title: "Thiếu dữ liệu hồ sơ",
        message: "Không có encounter hợp lệ. Vui lòng quay lại màn tiếp đón và thao tác lại.",
        details: "",
        action: null,
      });
      return;
    }
    if (!canEditService) {
      setModal({
        open: true,
        type: "warning",
        title: "Trạng thái hồ sơ không hợp lệ",
        message: lockReason || "Hồ sơ hiện tại không cho phép xác nhận lại dịch vụ.",
        details: "",
        action: null,
      });
      return;
    }
    if (selectedIds.length === 0) {
      setModal({
        open: true,
        type: "warning",
        title: "Chưa chọn dịch vụ",
        message: "Cần chọn ít nhất 1 dịch vụ trước khi tiếp tục.",
        details: "",
        action: null,
      });
      return;
    }

    const missingSelectedIds = selectedIds.filter((id) => !services.some((item) => Number(item.idDichVu) === Number(id)));
    const invalidSelected = selectedServices.filter((item) => item?.canSelect === false);
    if (missingSelectedIds.length > 0 || invalidSelected.length > 0) {
      setModal({
        open: true,
        type: "warning",
        title: "Có dịch vụ sai khu hoặc chưa map khu",
        message: "Vui lòng bỏ các dịch vụ không hợp lệ trước khi lưu phiếu.",
        details: [
          targetAreaLabel ? `Khu hồ sơ: ${targetAreaLabel}` : "Khu hồ sơ: chưa xác định",
          ...invalidSelected.map((item) => `- ${item.tenDichVu}: ${item.lyDoKhongChon || "Không hợp lệ"}`),
          ...missingSelectedIds.map((id) => `- Dịch vụ #${id}: không còn trong danh mục hiện hành`),
        ].join("\n"),
        action: null,
      });
      return;
    }

    const actionText = mode === "draft" ? "Lưu chỉ định" : "Xác nhận dịch vụ";
    const serviceMode = inferServiceMode(encounterInfo?.encounter?.visitType);
    const nextStatus = mode === "draft" ? "DỊCH_VỤ_NHÁP" : "CHỜ_THANH_TOÁN hoặc CHỜ_KHÁM";
    setModal({
      open: true,
      type: "confirm",
      title: actionText,
      message: `Bệnh nhân: ${encounterInfo.patient.hoTen || "--"} · Mã HS: ${encounterInfo.encounter.maHs || "--"}`,
      details: `Số dịch vụ: ${selectedIds.length}
Khu tiếp đón: ${targetAreaLabel || "--"}
Tạm tính: ${tamTinh.toLocaleString("vi-VN")} đ
Chế độ chọn: ${serviceMode}
Trạng thái tiếp theo: ${nextStatus}`,
      action: mode,
    });
  };

  const runSave = async (mode) => {
    if (!canAccess || !canEditService) return;
    const serviceMode = inferServiceMode(encounterInfo?.encounter?.visitType);
    const payload = {
      encounterId: Number(encounterInfo.encounter.id),
      patientId: Number(encounterInfo.patient.id),
      serviceIds: selectedIds,
      note: normalize(note) || null,
      mode: serviceMode,
      idempotencyKey: createIdempotencyKey(mode === "draft" ? "service-draft" : "service-confirm"),
    };

    setSaving(mode);
    const res = mode === "draft"
      ? await saveServiceOrderDraftV2(payload)
      : await confirmServiceOrderV2(payload);
    setSaving("");

    if (!res) {
      setModal({
        open: true,
        type: "error",
        title: "Không kết nối được API",
        message: "Vui lòng kiểm tra backend và thử lại.",
        details: "",
        action: null,
      });
      return;
    }

    if (res.status >= 400) {
      const invalidServices = Array.isArray(res.data?.invalidServices) ? res.data.invalidServices : [];
      setModal({
        open: true,
        type: "error",
        title: mode === "draft" ? "Lưu chỉ định thất bại" : "Xác nhận dịch vụ thất bại",
        message: extractMessage(res, "Không lưu được phiếu dịch vụ."),
        details: invalidServices.length
          ? invalidServices
              .map((item) => `- ${item.serviceName || item.serviceCode || item.serviceId}: ${item.roomAreaName || item.roomAreaCode || "Chưa map khu"}`)
              .join("\n")
          : "",
        action: null,
      });
      return;
    }

    const data = res.data || {};
    const statusText = STATUS_LABEL[data.encounterStatus] || data.encounterStatus || "--";
  setModal({
      open: true,
      type: "success",
      title: mode === "draft" ? "Đã lưu chỉ định dịch vụ" : "Xác nhận dịch vụ thành công",
      message: `Mã phiếu dịch vụ: ${data.orderCode || "--"}`,
      details: `Tạm tính: ${Number(data.temporaryTotal || tamTinh).toLocaleString("vi-VN")} đ
Trạng thái hồ sơ: ${statusText}`,
      action: mode,
    });

    if (mode === "confirm") {
      setSelectedIds([]);
      setNote("");
    }
  };

  const closeModal = () => {
    const shouldBackReception = modal.type === "success" && modal.action === "confirm";
    setModal({ open: false, type: "info", title: "", message: "", details: "", action: null });
    if (shouldBackReception) {
      navigate("/tiep-don", { replace: true });
    }
  };

  return (
    <MainLayout>
      <div className="space-y-4">
        {permLoading && (
          <section className="app-card rounded-2xl p-4 text-sm text-slate-500">
            Đang kiểm tra quyền thao tác tiếp đón...
          </section>
        )}
        <section className="app-card rounded-2xl p-5 animate-fadeSlide">
          {!canAccess ? (
            <p className="text-sm italic text-slate-500">
              Không có dữ liệu hồ sơ hợp lệ. Vui lòng quay lại trang Tiếp đón và chọn hồ sơ cần đăng ký dịch vụ.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
              <InfoPill
                icon={<User size={14} />}
                label="Bệnh nhân"
                value={encounterInfo?.patient?.hoTen || "--"}
                subValue={`${encounterInfo?.patient?.gioiTinh || "--"} · ${calcAge(encounterInfo?.patient?.ngaySinh)} tuổi`}
                tone="sky"
              />
              <InfoPill
                icon={<ClipboardList size={14} />}
                label="Mã HS / Mã BN"
                value={`${encounterInfo?.encounter?.maHs || "--"} · ${encounterInfo?.patient?.maBn || "--"}`}
                tone="slate"
              />
              <InfoPill
                icon={<MapPin size={14} />}
                label="Khu tiếp đón"
                value={targetAreaLabel || "Chưa có khu"}
                subValue={encounterInfo?.encounter?.quayTiepDon?.tenQuay || encounterInfo?.encounter?.quayTiepDon?.maQuay || ""}
                tone={targetAreaLabel ? "sky" : "indigo"}
              />
              <InfoPill
                icon={<CalendarDays size={14} />}
                label="Ngày sinh"
                value={toDisplayDate(encounterInfo?.patient?.ngaySinh)}
                subValue={encounterInfo?.patient?.soDienThoai || "--"}
                subIcon={<Phone size={12} />}
                tone="slate"
              />
              <InfoPill
                icon={<Stethoscope size={14} />}
                label="Trạng thái hồ sơ"
                value={STATUS_LABEL[encounterInfo?.encounter?.trangThai] || encounterInfo?.encounter?.trangThai || "--"}
                subValue={
                  encounterInfo?.encounter?.priority
                    ? `Ưu tiên: ${encounterInfo.encounter.priority}`
                    : locationPatient?.mucUuTien
                    ? `Ưu tiên: ${toCanonicalPriority(locationPatient.mucUuTien)}`
                    : "Ưu tiên: Thường"
                }
                tone="indigo"
              />
            </div>
          )}
        </section>

        <div className="grid grid-cols-1 gap-3 xl:grid-cols-4">
          <section className="min-w-0 border border-slate-200 bg-white p-4 xl:col-span-3 animate-fadeSlide">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="flex items-center gap-2 text-base font-bold text-slate-800">
                  <Stethoscope size={16} className="text-sky-600" />
                  Đăng ký dịch vụ phòng khám
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Chọn dịch vụ khám ban đầu để tạo phiếu dịch vụ và đưa bệnh nhân vào luồng xử lý tiếp theo.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {encounterInfo?.encounter?.sourceType && (
                  <span className="rounded-full bg-cyan-100 px-2.5 py-1 text-xs font-semibold text-cyan-700">
                    Nguồn: {encounterInfo.encounter.sourceType}
                  </span>
                )}
                {encounterInfo?.encounter?.visitType && (
                  <span className="rounded-full bg-violet-100 px-2.5 py-1 text-xs font-semibold text-violet-700">
                    Loại khám: {encounterInfo.encounter.visitType}
                  </span>
                )}
                {existingOrder?.maHd && (
                  <span className="rounded-full bg-indigo-100 px-2.5 py-1 text-xs font-semibold text-indigo-700">
                    Phiếu: {existingOrder.maHd}
                  </span>
                )}
                <span className="rounded-full bg-sky-100 px-2.5 py-1 text-xs font-semibold text-sky-700">
                  {filteredServices.length} dịch vụ
                </span>
              </div>
            </div>

            {!canEditService && canAccess && (
              <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                {lockReason}
              </div>
            )}

            <div className="mb-3 grid grid-cols-1 gap-2 xl:grid-cols-[1fr,190px,190px,190px,190px]">
              <div className="relative">
                <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="Tìm theo tên dịch vụ, mã dịch vụ, phòng khám..."
                  className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none shadow-sm transition duration-200 hover:border-sky-300 focus:border-sky-400 focus:ring-2 focus:ring-sky-200"
                />
              </div>

              <AnimatedSelect
                value={roomFilter}
                onChange={(nextValue) => setRoomFilter(nextValue)}
                options={[
                  { value: "ALL", label: "T\u1ea5t c\u1ea3 ph\u00f2ng kh\u00e1m" },
                  ...roomOptions.map((room) => ({ value: String(room.id), label: room.name })),
                ]}
                placeholder={"T\u1ea5t c\u1ea3 ph\u00f2ng kh\u00e1m"}
                icon={<Filter size={14} />}
              />

              <AnimatedSelect
                value={areaScopeFilter}
                onChange={(nextValue) => setAreaScopeFilter(nextValue)}
                options={[
                  { value: "CURRENT_AREA", label: "Đúng khu hồ sơ" },
                  { value: "OTHER_AREA", label: "Khác khu" },
                  { value: "UNMAPPED", label: "Chưa map khu" },
                  { value: "ALL", label: "Tất cả khu" },
                ]}
                placeholder="Đúng khu hồ sơ"
                icon={<MapPin size={14} />}
              />

              <AnimatedSelect
                value={groupFilter}
                onChange={(nextValue) => setGroupFilter(nextValue)}
                options={[
                  { value: "ALL", label: "T\u1ea5t c\u1ea3 nh\u00f3m d\u1ecbch v\u1ee5" },
                  ...groupOptions.map((group) => ({ value: group, label: group })),
                ]}
                placeholder={"T\u1ea5t c\u1ea3 nh\u00f3m d\u1ecbch v\u1ee5"}
              />

              <AnimatedSelect
                value={roomStatusFilter}
                onChange={(nextValue) => setRoomStatusFilter(nextValue)}
                options={[
                  { value: "ALL", label: "T\u1ea5t c\u1ea3 tr\u1ea1ng th\u00e1i ph\u00f2ng" },
                  { value: "DANG_MO", label: "\u0110ang m\u1edf" },
                  { value: "TAM_NGUNG", label: "T\u1ea1m ng\u01b0ng" },
                  { value: "HET_GIO", label: "H\u1ebft gi\u1edd" },
                ]}
                placeholder={"T\u1ea5t c\u1ea3 tr\u1ea1ng th\u00e1i ph\u00f2ng"}
              />
            </div>

            <div className="mb-3 rounded-xl border border-sky-100 bg-sky-50/60 px-3 py-2 text-xs text-slate-700">
              <span className="font-semibold text-sky-700">Khu hồ sơ:</span>{" "}
              {targetAreaLabel || "chưa xác định"}{" "}
              <span className="ml-2 text-slate-500">
                Hiển thị được chọn: {areaStats.selectable}/{areaStats.total} dịch vụ
                {areaStats.other > 0 ? ` · Khác khu: ${areaStats.other}` : ""}
                {areaStats.unmapped > 0 ? ` · Chưa map khu: ${areaStats.unmapped}` : ""}
              </span>
            </div>

            <div className="min-h-[430px] max-h-[calc(100vh-335px)] overflow-auto rounded-md border border-slate-200 bg-white">
              <table className="w-full min-w-[1100px] table-fixed text-[13px]">
                <colgroup>
                  <col className="w-[7%]" />
                  <col className="w-[25%]" />
                  <col className="w-[14%]" />
                  <col className="w-[9%]" />
                  <col className="w-[18%]" />
                  <col className="w-[9%]" />
                  <col className="w-[10%]" />
                  <col className="w-[5%]" />
                  <col className="w-[5%]" />
                </colgroup>
                <thead className="app-table-head sticky top-0 z-10">
                  <tr>
                    <th className="px-3 py-2 text-left">Mã DV</th>
                    <th className="px-3 py-2 text-left">Tên dịch vụ</th>
                    <th className="px-3 py-2 text-left">Nhóm dịch vụ</th>
                    <th className="px-3 py-2 text-right">Đơn giá</th>
                    <th className="px-3 py-2 text-left">Phòng khám</th>
                    <th className="px-3 py-2 text-left">Khu</th>
                    <th className="px-3 py-2 text-left">Trạng thái phòng</th>
                    <th className="px-3 py-2 text-right">BN chờ</th>
                    <th className="sticky right-0 bg-cyan-100 px-3 py-2 text-center">Chọn</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingList ? (
                    Array.from({ length: 7 }).map((_, idx) => (
                      <tr key={`loading-${idx}`} className="border-t border-slate-100">
                        <td colSpan={9} className="px-3 py-2">
                          <span className="app-skeleton-line block h-4 w-full" />
                        </td>
                      </tr>
                    ))
                  ) : currentRows.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-3 py-8 text-center text-sm text-slate-500">
                        Không có dịch vụ phù hợp bộ lọc hiện tại.
                      </td>
                    </tr>
                  ) : (
                    currentRows.map((item) => {
                      const checked = selectedIds.includes(item.idDichVu);
                      const persistedLine = persistedLineMap.get(item.idDichVu);
                      const orderStatus = normalize(existingOrder?.trangThai).toUpperCase();
                      const disablePick = !canEditService || item.canSelect === false || (persistedLine && orderStatus === "DA_THANH_TOAN");
                      const roomStatusText = item.trangThaiPhong === "DANG_MO"
                        ? "Đang mở"
                        : item.trangThaiPhong === "TAM_NGUNG"
                        ? "Tạm ngưng"
                        : item.trangThaiPhong === "HET_GIO"
                        ? "Hết giờ"
                        : "Chưa xác định";

                      return (
                        <tr
                          key={`${item.idDichVu}-${item.idPhong}`}
                          className={`border-t border-slate-100 transition ${
                            disablePick ? "cursor-not-allowed opacity-70" : "cursor-pointer hover:bg-sky-50/60"
                          } ${checked ? "bg-sky-50" : "bg-white"}`}
                          onClick={() => {
                            if (!disablePick) toggleService(item.idDichVu);
                          }}
                        >
                          <td className="px-3 py-2 font-semibold text-slate-700">{item.maDichVu || `DV${item.idDichVu}`}</td>
                          <td className="px-3 py-2 font-medium leading-5 text-slate-800">{item.tenDichVu}</td>
                          <td className="px-3 py-2 text-slate-600">{item.nhomDichVu || "--"}</td>
                          <td className="px-3 py-2 text-right font-semibold text-sky-700">
                            {Number(item.donGia || 0).toLocaleString("vi-VN")} đ
                          </td>
                          <td className="px-3 py-2 text-slate-600">
                            <span className="inline-flex items-center gap-1">
                              <Building2 size={13} /> {item.tenPhong}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-slate-600">
                            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                              item.canSelect === false
                                ? "bg-amber-100 text-amber-700"
                                : "bg-emerald-100 text-emerald-700"
                            }`}>
                              {item.tenKhuTiepDon || item.maKhuTiepDon || "Chưa map"}
                            </span>
                            {item.canSelect === false && (
                              <p className="mt-1 max-w-[180px] text-[11px] text-amber-700">{item.lyDoKhongChon}</p>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                              item.trangThaiPhong === "DANG_MO"
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-amber-100 text-amber-700"
                            }`}>
                              {roomStatusText}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-right text-slate-600">{item.soChoDangCho || 0}</td>
                          <td className={`sticky right-0 px-3 py-2 text-center ${checked ? "bg-sky-50" : "bg-white"}`} onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={checked}
                              disabled={disablePick}
                              onChange={() => toggleService(item.idDichVu)}
                              className="h-4 w-4 rounded border-slate-300 text-sky-600 disabled:cursor-not-allowed disabled:opacity-60"
                            />
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-3 flex items-center justify-between text-xs text-slate-600">
              <span>Trang {page}/{totalPages}</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  disabled={page <= 1}
                  className="rounded-md border border-slate-200 bg-white px-2 py-1 font-semibold disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Trước
                </button>
                <button
                  type="button"
                  onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={page >= totalPages}
                  className="rounded-md border border-slate-200 bg-white px-2 py-1 font-semibold disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Sau
                </button>
              </div>
            </div>
          </section>

          <section className="min-w-0 border border-slate-200 bg-white p-4 animate-fadeSlide">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
               <h3 className="text-sm font-bold text-slate-800">Dịch vụ đã chọn</h3>
              <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
                {selectedServices.length} mục
              </span>
            </div>

            <div className="mt-3 max-h-[320px] space-y-2 overflow-y-auto pr-1">
              {selectedServices.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-5 text-center text-sm italic text-slate-500">
                  Chưa chọn dịch vụ nào.
                </div>
              ) : (
                selectedServices.map((item, idx) => {
                  const persistedLine = persistedLineMap.get(item.idDichVu);
                  const persisted = !!persistedLine;
                  const persistedStatus = normalize(existingOrder?.trangThai).toUpperCase();
                  const lockedRemove = persisted && persistedStatus === "DA_THANH_TOAN";

                  return (
                  <div key={`${item.idDichVu}-${idx}`} className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-slate-800">
                          {idx + 1}. {item.tenDichVu}
                        </p>
                        <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-slate-500">
                          <MapPin size={12} /> {item.tenPhong}
                        </p>
                        <p className={`mt-1 text-xs font-semibold ${item.canSelect === false ? "text-amber-700" : "text-emerald-700"}`}>
                          {item.tenKhuTiepDon || item.maKhuTiepDon || "Chưa map khu"}
                          {item.canSelect === false ? ` · ${item.lyDoKhongChon || "Không hợp lệ"}` : ""}
                        </p>
                        {persisted && (
                          <p className="mt-1 text-xs font-semibold text-emerald-700">
                            Đã lưu trên phiếu dịch vụ
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleService(item.idDichVu)}
                        disabled={lockedRemove}
                        className="rounded-md p-1 text-rose-500 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                        title="Bỏ chọn"
                      >
                        <XCircle size={16} />
                      </button>
                    </div>
                    <p className="mt-1 text-right text-sm font-bold text-sky-700">
                      {Number(item.donGia || 0).toLocaleString("vi-VN")} đ
                    </p>
                  </div>
                )})
              )}
            </div>

            <div className="mt-3">
              <label className="mb-1 block text-xs font-semibold text-slate-600">Ghi chú phiếu dịch vụ</label>
              <textarea
                rows={3}
                value={note}
                disabled={!canEditService}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Ghi chú thêm cho phiếu dịch vụ (nếu có)..."
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-200 disabled:cursor-not-allowed disabled:bg-slate-100"
              />
            </div>

            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
              <div className="space-y-1 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Tạm tính:</span>
                  <span className="font-semibold text-slate-800">{tamTinh.toLocaleString("vi-VN")} đ</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Giảm giá:</span>
                  <span className="font-semibold text-slate-800">{giamGia.toLocaleString("vi-VN")} đ</span>
                </div>
                <div className="flex items-center justify-between border-t border-slate-200 pt-1">
                  <span className="font-semibold text-slate-700">Thành tiền dự kiến:</span>
                  <span className="text-lg font-extrabold text-rose-600">{thanhTienDuKien.toLocaleString("vi-VN")} đ</span>
                </div>
              </div>
              <p className="mt-2 text-xs text-slate-500">
                Số tiền chính thức có thể thay đổi theo chính sách thu ngân/miễn giảm tại thời điểm thanh toán.
              </p>

              <div className="mt-3 flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={() => navigate("/tiep-don")}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                >
                  <ArrowLeft size={14} /> Về tiếp đón
                </button>
                <button
                  type="button"
                  onClick={() => openConfirmModal("draft")}
                  disabled={saving !== "" || loadingList || !canEditService}
                  className="inline-flex items-center gap-1 rounded-lg border border-sky-300 bg-white px-3 py-1.5 text-sm font-semibold text-sky-700 hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving === "draft" ? <Loader2 size={14} className="animate-spin" /> : <ClipboardList size={14} />}
                  {saving === "draft" ? "Đang lưu..." : "Lưu chỉ định"}
                </button>
                <button
                  type="button"
                  onClick={() => openConfirmModal("confirm")}
                  disabled={saving !== "" || loadingList || !canEditService}
                  className="inline-flex items-center gap-1 rounded-lg bg-gradient-to-r from-sky-600 to-cyan-500 px-4 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {saving === "confirm" ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                  {saving === "confirm" ? "Đang xác nhận..." : "Xác nhận dịch vụ"}
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>

      {modal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 px-4 backdrop-blur-[2px] animate-fadeIn">
          <div className="w-full max-w-md rounded-2xl border border-sky-100 bg-white p-5 shadow-2xl animate-fadeSlide">
            <div className="flex items-start gap-3">
              <div
                className={`mt-0.5 rounded-xl p-2 ${
                  modal.type === "success"
                    ? "bg-emerald-100 text-emerald-600"
                    : modal.type === "warning"
                    ? "bg-amber-100 text-amber-600"
                    : modal.type === "error"
                    ? "bg-rose-100 text-rose-600"
                    : modal.type === "confirm"
                    ? "bg-sky-100 text-sky-600"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                {modal.type === "success" ? <CheckCircle2 size={18} /> : <ClipboardList size={18} />}
              </div>

              <div className="min-w-0 flex-1">
                <h3 className="text-lg font-bold text-slate-800">{modal.title}</h3>
                <p className="mt-1 text-sm text-slate-600">{modal.message}</p>
                {modal.details && (
                  <p className="mt-2 whitespace-pre-line rounded-lg bg-slate-50 px-2.5 py-2 text-sm text-slate-700">
                    {modal.details}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              {modal.type === "confirm" ? (
                <>
                  <button
                    type="button"
                    onClick={closeModal}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const mode = modal.action;
                      closeModal();
                      if (mode) runSave(mode);
                    }}
                  className="rounded-lg bg-sky-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-sky-700"
                  >
                    Đồng ý
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-lg bg-sky-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-sky-700"
                >
                  {modal.type === "success" && modal.action === "confirm" ? "Về tiếp đón" : "Đóng"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}
function InfoPill({ icon, label, value, subValue = "", subIcon = null, tone = "slate" }) {
  const toneClass =
    tone === "sky"
      ? "border-sky-200 bg-sky-50/70"
      : tone === "indigo"
      ? "border-indigo-200 bg-indigo-50/70"
      : "border-slate-200 bg-white";

  return (
    <div className={`rounded-xl border px-4 py-3 ${toneClass}`}>
      <p className="flex items-center gap-2 text-xs font-semibold text-slate-600">
        {icon} {label}
      </p>
      <p className="mt-1 text-sm font-bold text-slate-800">{value}</p>
      {subValue && (
        <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-slate-500">
          {subIcon}
          {subValue}
        </p>
      )}
    </div>
  );
}
