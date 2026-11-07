import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Swal from "sweetalert2";
import { toast } from "react-toastify";
import {
  Ban,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Download,
  Eye,
  FileText,
  FlaskConical,
  HeartPulse,
  Lock,
  Pencil,
  Pill,
  Plus,
  Printer,
  RotateCcw,
  Save,
  Stethoscope,
  Trash2,
  User,
  X,
} from "lucide-react";

import ModalEditThuoc from "../modals/ModalEditThuoc";
import ModalKeDonThuoc from "../modals/ModalKeDonThuoc";
import {
  handleUpdateKetQua,
  handleCancelLanKham,
  fetchDonTheoLanKham,
  handleUpdateDVKT,
  handleCancelDVKT,
  handleReopenHoSo,
  fetchBenhOptions,
  fetchTongHopDVKTTheoLanKham,
  fetchTongHopDonThuoc,
  handleMarkDVKTResultRead,
} from "../../../controllers/BacSiController";
import { deleteThuocInDon, apiDownloadDonThuocPDF, apiDownloadDonThuocTongHopPDF } from "../../../api/DonThuocApi";
import { exportPdfDVKT } from "../../../api/ThucHienDVKTApi";
import { exportGiayKetLuanKhamPDF, exportPhieuChiDinhXetNghiemPDF, exportTomTatKhamPDF } from "../../../api/BacSiApi";

const lockedStatuses = new Set(["DA_KHAM", "CHO_THANH_TOAN", "DA_THANH_TOAN", "DA_HUY", "DA_DONG", "DONG"]);
const reopenableConclusionStatuses = new Set(["DA_KHAM", "DA_DONG", "DONG"]);

function normalizeStatus(value) {
  return String(value || "").trim().toUpperCase();
}

function formatDateInput(date) {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDateTimeLocalPayload(date) {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return null;
  const datePart = formatDateInput(d);
  const hour = String(d.getHours()).padStart(2, "0");
  const minute = String(d.getMinutes()).padStart(2, "0");
  const second = String(d.getSeconds()).padStart(2, "0");
  return `${datePart}T${hour}:${minute}:${second}`;
}

function addDays(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return formatDateInput(d);
}

function isPastDateInput(value) {
  if (!value) return false;
  const selectedDate = new Date(`${value}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return selectedDate < today;
}

function createPdfWindow(title) {
  const win = window.open("", "_blank");
  if (!win) return null;
  win.document.write(`
    <!doctype html>
    <html>
      <head>
        <title>${title}</title>
        <style>
          body { margin: 0; font-family: Arial, sans-serif; background: #f8fafc; color: #0f172a; }
          .loading { display: flex; height: 100vh; align-items: center; justify-content: center; font-size: 15px; font-weight: 700; }
        </style>
      </head>
      <body><div class="loading">Đang chuẩn bị ${title}...</div></body>
    </html>
  `);
  win.document.close();
  return win;
}

function openPdfBlob(blob, title, targetWindow) {
  const pdfBlob = blob?.type === "application/pdf" ? blob : new Blob([blob], { type: "application/pdf" });
  const url = URL.createObjectURL(pdfBlob);
  if (targetWindow && !targetWindow.closed) {
    targetWindow.location.href = url;
  } else {
    window.open(url, "_blank", "noopener");
  }
  setTimeout(() => URL.revokeObjectURL(url), 120000);
}

function isPrintableClsStatus(status) {
  const normalized = String(status || "").trim().toUpperCase();
  return ["DONE", "PAID", "SENT", "DA_HOAN_THANH", "DA_THANH_TOAN", "DA_DUYET", "DA_GUI"].includes(normalized);
}

function isPrintableInstructionOrder(dv) {
  const normalized = String(dv?.trangThai || "").trim().toUpperCase();
  return normalized === "PENDING" && !dv?.daThanhToan && !dv?.hasResult;
}

function statusLabel(status) {
  const map = {
    CHO_KHAM: "Chờ khám",
    DANG_KHAM: "Đang khám",
    DA_KHAM: "Đã khám",
    DA_HUY: "Đã hủy",
    CHO_THANH_TOAN: "Chờ thanh toán",
    DA_THANH_TOAN: "Đã thanh toán",
  };
  return map[status] || status || "---";
}

function statusClass(status) {
  if (status === "DANG_KHAM") return "border-blue-200 bg-blue-50 text-blue-700";
  if (status === "DA_KHAM") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "DA_HUY") return "border-slate-200 bg-slate-100 text-slate-500";
  return "border-sky-200 bg-sky-50 text-sky-700";
}

function dvktStatusClass(status) {
  const map = {
    pending: "border-amber-200 bg-amber-50 text-amber-700",
    sent: "border-blue-200 bg-blue-50 text-blue-700",
    received: "border-cyan-200 bg-cyan-50 text-cyan-700",
    processing: "border-indigo-200 bg-indigo-50 text-indigo-700",
    done: "border-emerald-200 bg-emerald-50 text-emerald-700",
    paid: "border-purple-200 bg-purple-50 text-purple-700",
    canceled: "border-slate-200 bg-slate-100 text-slate-500",
  };
  return map[status] || "border-slate-200 bg-slate-50 text-slate-600";
}

function dvktStatusLabel(status) {
  const map = {
    pending: "Chờ thực hiện",
    received: "Đã tiếp nhận",
    sent: "Đã gửi",
    processing: "Đang thực hiện",
    done: "Đã có kết quả",
    paid: "Đã có kết quả",
    canceled: "Đã hủy",
  };
  return map[status] || status || "---";
}

function dvktDisplayLabel(dv) {
  return dv?.trangThaiHienThi || dvktStatusLabel(dv?.trangThai);
}

function dvktDisplayClass(dv) {
  const label = dvktDisplayLabel(dv);
  if (label === "Đã hủy") return dvktStatusClass("canceled");
  if (label === "Đã gửi") return dvktStatusClass("sent");
  if (label === "Đã có kết quả") return dvktStatusClass("done");
  if (label === "Đang thực hiện") return dvktStatusClass("processing");
  if (label === "Đã tiếp nhận") return dvktStatusClass("received");
  return dvktStatusClass(dv?.trangThai);
}

const treatmentOptions = ["Cho về", "Hẹn khám", "Nhập viện", "Chuyển viện", "Không khám"];
const treatmentResults = ["Khỏi", "Đỡ", "Không thay đổi", "Tử vong", "Tử vong ngoại viện", "Không đánh giá"];

function conclusionPaperType(value) {
  const key = treatmentKey(value);
  if (key === "HEN_KHAM") return "HEN_KHAM";
  if (key === "NHAP_VIEN") return "NHAP_VIEN";
  if (key === "CHUYEN_VIEN") return "CHUYEN_VIEN";
  if (key === "KHONG_KHAM") return "KHONG_KHAM";
  return "CHO_VE";
}

function normalizeVN(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .trim();
}

function treatmentKey(value) {
  return normalizeVN(value).replace(/\s+/g, "_");
}

function createFollowUpDefaults(selected) {
  const savedPaper = selected?.giayKetLuanKham || {};
  const savedFollowUp = selected?.giayHenKhamLai || {};
  const savedTreatment = treatmentOptions.includes(selected?.huongXuTri) ? selected.huongXuTri : "Cho về";
  const treatment = savedPaper.hinhThucDieuTri || savedFollowUp.hinhThucDieuTri || savedTreatment;
  return {
    loaiGiay: savedPaper.loaiGiay || conclusionPaperType(treatment),
    hinhThucDieuTri: treatment,
    ketQua: savedPaper.ketQua || savedFollowUp.ketQua || selected?.ketQuaKham || "Đỡ",
    lyDoHen: savedPaper.lyDoHen || savedFollowUp.lyDoHen || "Tái khám theo hẹn của bác sĩ.",
    benhKemTheo: savedPaper.benhKemTheo || savedFollowUp.benhKemTheo || selected?.benhKemTheo || selected?.chanDoanCuoi || "",
    loiDan: savedPaper.loiDan || savedFollowUp.loiDan || "Mang theo giấy hẹn, đơn thuốc, kết quả xét nghiệm/cận lâm sàng khi tái khám.",
    ngayHen: formatDateInput(savedPaper.ngayHen || savedFollowUp.ngayHen || addDays(7)),
    phongHen: savedPaper.phongHen || savedFollowUp.phongHen || selected?.phong?.tenPhong || "",
    ghiChu: savedPaper.ghiChu || savedFollowUp.ghiChu || "",
    lyDoVaoVien: savedPaper.lyDoVaoVien || "",
    khoaNhapVien: savedPaper.khoaNhapVien || selected?.phong?.khoaPhong || selected?.phong?.khoa || "",
    kinhGui: savedPaper.kinhGui || "",
    dauHieuLamSang: savedPaper.dauHieuLamSang || "",
    lyDoChuyenTuyen: savedPaper.lyDoChuyenTuyen || "",
    huongDieuTriChuyenTuyen: savedPaper.huongDieuTriChuyenTuyen || "",
    phuongTienVanChuyen: savedPaper.phuongTienVanChuyen || "",
    lyDoKhongKham: savedPaper.lyDoKhongKham || "",
    daKy: !!(savedPaper.daKy || savedFollowUp.daKy),
    bacSiKy: savedPaper.bacSiKy || savedFollowUp.bacSiKy || "",
    signedAt: savedPaper.signedAt || savedFollowUp.signedAt || null,
    saved: !!(savedPaper.saved || savedFollowUp.saved),
  };
}

function isBlockingClsStatus(status) {
  const normalized = String(status || "").trim().toUpperCase();
  return ["PENDING", "PROCESSING", "CHO_THUC_HIEN", "DANG_THUC_HIEN"].includes(normalized);
}

function hasUsableVital(vital) {
  if (!vital) return false;
  return ["mach", "huyetAp", "nhietDo", "spo2", "canNang"].some((key) => {
    const value = vital[key];
    return value !== undefined && value !== null && String(value).trim() !== "";
  });
}

function diseaseKey(benh) {
  return String(benh?.ma || benh?.ten || "").trim().toUpperCase();
}

function dedupeDiseases(list) {
  const seen = new Set();
  return (list || []).filter((benh) => {
    const key = diseaseKey(benh);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export default function ResultForm({
  selected,
  refresh,
  donThuoc,
  onOpenChiDinh,
  onReloadSelected,
  idBacSi,
  permission,
}) {
  const [activeTab, setActiveTab] = useState("kham");
  const [form, setForm] = useState({
    chan_doan_so_bo: "",
    chan_doan_cuoi: "",
    ket_qua: "",
    huong_xu_tri: "",
    ghi_chu: "",
    id_benh: "",
    id_benh_kem_theo: [],
    benh_kem_theo: "",
    confirm_no_vital: false,
  });
  const [editingThuoc, setEditingThuoc] = useState(null);
  const [openKeDon, setOpenKeDon] = useState(false);
  const [keDonData, setKeDonData] = useState(null);
  const [localDonThuoc, setLocalDonThuoc] = useState(null);
  const [donTongHop, setDonTongHop] = useState(null);
  const [dsDVKT, setDsDVKT] = useState([]);
  const [clsSummary, setClsSummary] = useState({ hienTai: [], tongHop: [] });
  const [pdfPreview, setPdfPreview] = useState(null);
  const [printCenterOpen, setPrintCenterOpen] = useState(false);
  const [printDocumentPreview, setPrintDocumentPreview] = useState(null);
  const [printBatchPreview, setPrintBatchPreview] = useState(null);
  const [printBatchLoading, setPrintBatchLoading] = useState(false);
  const [followUpForm, setFollowUpForm] = useState(() => createFollowUpDefaults(null));
  const [forceEditable, setForceEditable] = useState(false);
  const [benhOptions, setBenhOptions] = useState([]);
  const [validationErrors, setValidationErrors] = useState({});
  const selectedIdRef = useRef(null);

  const canAdd = !!permission?.canAdd;
  const canEdit = !!permission?.canEdit;
  const canDelete = !!permission?.canDelete;
  const canExport = !!permission?.canExport;
  const noInputPermissionMessage = "Bạn chỉ có quyền xem, không thể thao tác nhập liệu trên hồ sơ khám.";
  const noExportPermissionMessage = "Bạn chưa có quyền xuất/in hồ sơ khám.";
  const currentStatus = normalizeStatus(selected?.trangThai);
  const statusLocked = lockedStatuses.has(currentStatus) && !forceEditable;
  const readonly = !canEdit || statusLocked;
  const canReopenConclusion = canEdit && !!selected?.id && (statusLocked || reopenableConclusionStatuses.has(currentStatus));
  const isLoadingDetail = !!selected?._loadingDetail;

  const completion = useMemo(() => {
    const fields = [form.ket_qua, form.chan_doan_cuoi, form.huong_xu_tri];
    return Math.round((fields.filter((x) => !!x?.trim()).length / fields.length) * 100);
  }, [form]);

  const handleSearchBenh = useCallback((q) => fetchBenhOptions(q, setBenhOptions), []);
  const refreshClinicalOrders = useCallback(async () => {
    if (!selected?.id) {
      setDsDVKT([]);
      setClsSummary({ hienTai: [], tongHop: [] });
      return;
    }

    const visitId = selected.id;
    await fetchTongHopDVKTTheoLanKham(visitId, (data) => {
      if (selectedIdRef.current !== visitId) return;
      const currentOrders = data?.hienTai || [];
      setDsDVKT(currentOrders);
      setClsSummary(data || { hienTai: currentOrders, tongHop: currentOrders });
    });
  }, [selected?.id]);

  useEffect(() => {
    selectedIdRef.current = selected?.id || null;
    setDsDVKT([]);
    setClsSummary({ hienTai: [], tongHop: [] });
  }, [selected?.id]);

  useEffect(() => {
    fetchBenhOptions("", setBenhOptions);
  }, []);

  useEffect(() => {
    if (!selected?.id) {
      setLocalDonThuoc(null);
      setDonTongHop(null);
      setDsDVKT([]);
      setClsSummary({ hienTai: [], tongHop: [] });
      return;
    }
    fetchDonTheoLanKham(selected.id, setLocalDonThuoc);
    fetchTongHopDonThuoc(selected.id, setDonTongHop);
    refreshClinicalOrders();
  }, [selected?.id, refreshClinicalOrders]);

  useEffect(() => {
    if (!openKeDon && selected?.id) {
      fetchDonTheoLanKham(selected.id, setLocalDonThuoc);
      fetchTongHopDonThuoc(selected.id, setDonTongHop);
    }
  }, [openKeDon, selected?.id]);

  useEffect(() => {
    const handleRefresh = () => refreshClinicalOrders();
    window.addEventListener("dvkt-updated", handleRefresh);
    return () => window.removeEventListener("dvkt-updated", handleRefresh);
  }, [refreshClinicalOrders]);

  useEffect(() => {
    if (!selected?.id) return undefined;
    const timer = window.setInterval(() => refreshClinicalOrders(), 20000);
    return () => window.clearInterval(timer);
  }, [selected?.id, refreshClinicalOrders]);

  useEffect(() => {
    setForm({
      chan_doan_so_bo: selected?.chanDoanSoBo || "",
      chan_doan_cuoi: selected?.chanDoanCuoi || "",
      ket_qua: selected?.ketQuaKham || "",
      huong_xu_tri: selected?.huongXuTri || "",
      ghi_chu: selected?.ghiChu || "",
      id_benh: selected?.benh?.id ? String(selected.benh.id) : "",
      id_benh_kem_theo: Array.isArray(selected?.benhKemTheoList)
        ? selected.benhKemTheoList.map((benh) => String(benh.id))
        : [],
      benh_kem_theo: selected?.benhKemTheo || "",
      confirm_no_vital: false,
    });
  }, [selected]);

  useEffect(() => {
    setForceEditable(false);
  }, [selected?.id]);

  useEffect(() => {
    if (!selected?.benh?.id) return;
    setBenhOptions((old) => {
      const selectedDiseases = [selected.benh, ...(selected.benhKemTheoList || [])].filter(Boolean);
      const merged = [...old];
      selectedDiseases.forEach((benh) => {
        if (!merged.some((item) => String(item.id) === String(benh.id))) merged.unshift(benh);
      });
      return merged;
    });
  }, [selected?.benh, selected?.benhKemTheoList]);

  useEffect(() => {
    const defaults = createFollowUpDefaults(selected);
    const savedFollowUp = selected?.giayHenKhamLai;
    const savedPaper = selected?.giayKetLuanKham;
    setFollowUpForm(savedFollowUp ? {
      ...defaults,
      hinhThucDieuTri: savedFollowUp.hinhThucDieuTri || defaults.hinhThucDieuTri,
      ketQua: savedFollowUp.ketQua || defaults.ketQua,
      lyDoHen: savedFollowUp.lyDoHen || defaults.lyDoHen,
      benhKemTheo: savedFollowUp.benhKemTheo || defaults.benhKemTheo,
      loiDan: savedFollowUp.loiDan || defaults.loiDan,
      ngayHen: formatDateInput(savedFollowUp.ngayHen) || defaults.ngayHen,
      phongHen: savedFollowUp.phongHen || defaults.phongHen,
      ghiChu: savedFollowUp.ghiChu || defaults.ghiChu,
      daKy: !!(savedFollowUp.daKy || savedPaper?.daKy),
      bacSiKy: savedFollowUp.bacSiKy || savedPaper?.bacSiKy || "",
      signedAt: savedFollowUp.signedAt || savedPaper?.signedAt || null,
      saved: !!(savedFollowUp.saved || savedPaper?.saved),
    } : defaults);
    setActiveTab((tab) => (tab === "hen" ? "ketluan" : tab));
  }, [selected]);

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === "checkbox" ? checked : value }));
    if (["chan_doan_cuoi", "huong_xu_tri", "benh_kem_theo", "id_benh", "id_benh_kem_theo"].includes(name)) {
      setFollowUpForm((old) => (
        old.daKy || old.saved
          ? { ...old, daKy: false, bacSiKy: "", signedAt: null, saved: false }
          : old
      ));
    }
    if (validationErrors[name]) {
      setValidationErrors((old) => {
        const next = { ...old };
        delete next[name];
        return next;
      });
    }
  };

  const onSave = async () => {
    if (!selected?.id) return;
    if (!canEdit) return toast.error(noInputPermissionMessage);
    if (readonly) return toast.error("Hồ sơ đã khóa, không thể lưu!");

    const initialTreatmentKey = treatmentKey(followUpForm.hinhThucDieuTri);
    const initialNoExamTreatment = initialTreatmentKey === "KHONG_KHAM";
    const blockingCls = (clsSummary.tongHop?.length ? clsSummary.tongHop : dsDVKT).filter((dv) => isBlockingClsStatus(dv.trangThai));
    if (blockingCls.length && !initialNoExamTreatment) {
      await Swal.fire({
        icon: "warning",
        title: "Chưa thể kết luận",
        html: `
          <div style="text-align:left">
            <div>Còn ${blockingCls.length} chỉ định CLS đang chờ/đang thực hiện.</div>
            <ul style="margin-top:8px;padding-left:18px">
              ${blockingCls.slice(0, 5).map((dv) => `<li>${dv.tenDvkt || dv.maDvkt || `CLS #${dv.id}`}</li>`).join("")}
            </ul>
          </div>
        `,
        confirmButtonText: "Xem danh sách CLS",
      });
      setActiveTab("dvkt");
      return;
    }

    const currentTreatmentKey = treatmentKey(followUpForm.hinhThucDieuTri);
    const isNoExamTreatment = currentTreatmentKey === "KHONG_KHAM";
    const isGoHomeTreatment = currentTreatmentKey === "CHO_VE";
    const isFollowUpTreatment = currentTreatmentKey === "HEN_KHAM";
    const isAdmissionTreatment = currentTreatmentKey === "NHAP_VIEN";
    const isTransferTreatment = currentTreatmentKey === "CHUYEN_VIEN";
    const clinicalResult = form.ket_qua?.trim() || followUpForm.ketQua;

    const errors = {};
    if (!clinicalResult?.trim()) errors.ket_qua = "Bắt buộc nhập kết quả khám.";
    if (!followUpForm.hinhThucDieuTri?.trim()) errors.huong_xu_tri = "Bắt buộc chọn hướng điều trị.";
    if (!isNoExamTreatment) {
      if (!form.chan_doan_cuoi?.trim()) errors.chan_doan_cuoi = "Bắt buộc nhập chẩn đoán cuối.";
      if (!form.id_benh) errors.id_benh = "Bắt buộc chọn mã ICD/bệnh chính.";
    }

    if (Object.keys(errors).length) {
      setValidationErrors(errors);
      setActiveTab("ketluan");
      await Swal.fire({
        icon: "warning",
        title: "Thiếu thông tin bắt buộc",
        html: `<div style="text-align:left">${Object.values(errors).map((msg) => `<div>• ${msg}</div>`).join("")}</div>`,
        confirmButtonText: "Bổ sung ngay",
        confirmButtonColor: "#0284c7",
      });
      setTimeout(() => {
        document.querySelector('[data-error="true"]')?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 80);
      return;
    }

    const multiDiagnosis =
      form.chan_doan_cuoi.includes(";") ||
      form.chan_doan_cuoi.includes("\n") ||
      form.chan_doan_cuoi.includes("|");

    if (multiDiagnosis && !form.ghi_chu?.trim()) {
      setValidationErrors({ ghi_chu: "Nhiều chẩn đoán cần có ghi chú/mô tả chi tiết." });
      setActiveTab("ketluan");
      await Swal.fire({
        icon: "warning",
        title: "Cần bổ sung ghi chú",
        text: "Nhiều chẩn đoán cần có ghi chú/mô tả chi tiết.",
        confirmButtonText: "Bổ sung",
      });
      setTimeout(() => {
        document.querySelector('[data-field-name="ghi_chu"]')?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 80);
      return;
    }

    const treatmentErrors = {};
    if (isGoHomeTreatment && !followUpForm.loiDan?.trim() && !followUpForm.ghiChu?.trim()) {
      treatmentErrors.loiDan = "Cho về bắt buộc nhập lời dặn hoặc ghi chú sau khám.";
    }

    if (isFollowUpTreatment) {
      if (!followUpForm.lyDoHen?.trim()) treatmentErrors.lyDoHen = "Hẹn khám bắt buộc nhập quá trình bệnh lý.";
      if (!followUpForm.ngayHen) treatmentErrors.ngayHen = "Hẹn khám bắt buộc chọn ngày hẹn khám lại.";
      if (followUpForm.ngayHen && isPastDateInput(followUpForm.ngayHen)) {
        treatmentErrors.ngayHen = "Ngày hẹn khám lại không được nằm trong quá khứ.";
      }
    }

    if (isAdmissionTreatment) {
      if (!followUpForm.lyDoVaoVien?.trim()) treatmentErrors.lyDoVaoVien = "Nhập viện bắt buộc nhập lý do vào viện.";
      if (!followUpForm.khoaNhapVien?.trim()) treatmentErrors.khoaNhapVien = "Nhập viện bắt buộc nhập khoa điều trị.";
    }

    if (isTransferTreatment) {
      if (!followUpForm.kinhGui?.trim()) treatmentErrors.kinhGui = "Chuyển viện bắt buộc nhập kính gửi.";
      if (!followUpForm.dauHieuLamSang?.trim()) treatmentErrors.dauHieuLamSang = "Chuyển viện bắt buộc nhập dấu hiệu lâm sàng.";
      if (!followUpForm.lyDoChuyenTuyen?.trim()) treatmentErrors.lyDoChuyenTuyen = "Chuyển viện bắt buộc chọn lý do chuyển tuyến.";
      if (!followUpForm.huongDieuTriChuyenTuyen?.trim()) treatmentErrors.huongDieuTriChuyenTuyen = "Chuyển viện bắt buộc nhập hướng điều trị.";
      if (!followUpForm.phuongTienVanChuyen?.trim()) treatmentErrors.phuongTienVanChuyen = "Chuyển viện bắt buộc nhập phương tiện vận chuyển.";
    }

    if (isNoExamTreatment && !followUpForm.lyDoKhongKham?.trim()) {
      treatmentErrors.lyDoKhongKham = "Không khám/bỏ về bắt buộc nhập lý do.";
    }

    const hasSignedPaper = !!followUpForm.daKy;
    if (!hasSignedPaper) treatmentErrors.daKy = "Bác sĩ cần ký giấy tờ kết luận trước khi lưu.";

    if (Object.keys(treatmentErrors).length) {
      setValidationErrors((old) => ({ ...old, ...treatmentErrors }));
      setActiveTab("ketluan");
      await Swal.fire({
        icon: "warning",
        title: "Thiếu thông tin kết thúc khám",
        html: `<div style="text-align:left">${Object.values(treatmentErrors).map((msg) => `<div>• ${msg}</div>`).join("")}</div>`,
        confirmButtonText: "Bổ sung ngay",
        confirmButtonColor: "#7c3aed",
      });
      setTimeout(() => {
        document.querySelector('[data-error="true"]')?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 80);
      return;
    }

    let payload = {
      ...form,
      ket_qua: clinicalResult,
      huong_xu_tri: followUpForm.hinhThucDieuTri,
      ket_thuc_kham: {
        huongDieuTri: followUpForm.hinhThucDieuTri,
        ketQua: followUpForm.ketQua,
        quaTrinhBenhLy: followUpForm.lyDoHen,
        lyDoVaoVien: followUpForm.lyDoVaoVien,
        khoaNhapVien: followUpForm.khoaNhapVien,
        kinhGui: followUpForm.kinhGui,
        dauHieuLamSang: followUpForm.dauHieuLamSang,
        lyDoChuyenTuyen: followUpForm.lyDoChuyenTuyen,
        huongDieuTriChuyenTuyen: followUpForm.huongDieuTriChuyenTuyen,
        phuongTienVanChuyen: followUpForm.phuongTienVanChuyen,
        loiDan: followUpForm.loiDan,
        lyDoKhongKham: followUpForm.lyDoKhongKham,
      },
    };
    if (isNoExamTreatment) {
      payload = {
        ...payload,
        chan_doan_cuoi: form.chan_doan_cuoi || "Không khám",
        id_benh: "",
        id_benh_kem_theo: [],
        benh_kem_theo: "",
      };
    }

    if (!isNoExamTreatment && !hasUsableVital(selected.sinhHieu) && !form.confirm_no_vital) {
      const res = await Swal.fire({
        icon: "warning",
        title: "Chưa có sinh hiệu",
        text: "Lượt khám này chưa có sinh hiệu. Bạn vẫn muốn lưu kết luận?",
        showCancelButton: true,
        confirmButtonText: "Vẫn lưu kết luận",
        cancelButtonText: "Quay lại",
        confirmButtonColor: "#0f766e",
      });
      if (!res.isConfirmed) return;
      payload = { ...payload, confirm_no_vital: true };
      setForm((old) => ({ ...old, confirm_no_vital: true }));
    }

    payload = { ...payload, followUp: followUpForm };

    const saved = await handleUpdateKetQua(selected.id, payload, async () => {
      await refresh?.();
      await onReloadSelected?.();
      window.dispatchEvent(new Event("reload-patient-list"));
    });

    if (saved) {
      setForceEditable(false);
      setFollowUpForm((old) => ({
        ...createFollowUpDefaults({ ...selected, ...payload }),
        ...old,
        loaiGiay: conclusionPaperType(payload.huong_xu_tri),
        benhKemTheo: payload.benh_kem_theo || payload.chan_doan_cuoi || old.benhKemTheo,
        lyDoHen: payload.ket_thuc_kham?.quaTrinhBenhLy || old.lyDoHen,
        saved: true,
      }));
      setActiveTab("ketluan");
      setPrintCenterOpen(true);
      toast.info("Đã lưu kết luận. Trung tâm in giấy tờ đã sẵn sàng.");
    }
  };

  const onCancel = async () => {
    if (!selected?.id) return;
    if (!canDelete) return toast.error("Bạn chưa có quyền hủy lượt khám.");
    if (statusLocked) return toast.error("Hồ sơ đã khóa, không thể hủy!");

    const res = await Swal.fire({
      icon: "warning",
      title: "Hủy lượt khám?",
      input: "textarea",
      inputPlaceholder: "Nhập lý do hủy...",
      inputValidator: (value) => (!value?.trim() ? "Bắt buộc nhập lý do hủy" : undefined),
      showCancelButton: true,
      confirmButtonText: "Hủy lượt khám",
      cancelButtonText: "Đóng",
      confirmButtonColor: "#dc2626",
    });
    if (!res.isConfirmed) return;
    await handleCancelLanKham(selected.id, res.value, refresh);
  };

  const onReopen = async () => {
    if (!selected?.id) return;
    if (!canEdit) return toast.error(noInputPermissionMessage);
    const res = await Swal.fire({
      icon: "question",
      title: "Mở lại hồ sơ?",
      input: "textarea",
      inputPlaceholder: "Nhập lý do mở lại để lưu log...",
      inputValidator: (value) => (!value?.trim() ? "Bắt buộc nhập lý do mở lại" : undefined),
      showCancelButton: true,
      confirmButtonText: "Mở lại",
      cancelButtonText: "Đóng",
      confirmButtonColor: "#ea580c",
    });
    if (!res.isConfirmed) return;

    const result = await handleReopenHoSo(selected.id, res.value);
    if (!result?.ok) {
      await Swal.fire({
        icon: "error",
        title: "Không thể mở lại",
        text: result?.message || "Không thể mở lại hồ sơ.",
        confirmButtonText: "Đóng",
      });
      return;
    }
    setForceEditable(true);
    setActiveTab("kham");
    toast.success("Đã mở lại hồ sơ, bạn có thể chỉnh sửa kết quả khám.");
    await refresh?.();
    await onReloadSelected?.();
    window.dispatchEvent(new Event("reload-patient-list"));
  };

  const onEditDVKT = async (dv) => {
    if (!canEdit) return toast.error(noInputPermissionMessage);
    if (readonly) return toast.error("Hồ sơ đã khóa, không thể sửa DVKT!");
    if (dv.canEdit === false) return toast.warning("Chỉ định đã thanh toán/đã có kết quả nên không thể sửa trực tiếp.");
    if (dv.trangThai !== "pending") return toast.warning("Chỉ sửa được chỉ định đang chờ.");

    const soLuong = await Swal.fire({
      title: "Số lượng mới",
      input: "number",
      inputValue: dv.soLuong,
      inputAttributes: { min: 1 },
      showCancelButton: true,
      confirmButtonText: "Cập nhật",
      cancelButtonText: "Đóng",
    });
    if (!soLuong.isConfirmed) return;
    if (!soLuong.value || Number(soLuong.value) <= 0) return toast.error("Số lượng không hợp lệ!");

    const ghiChu = await Swal.fire({
      title: "Ghi chú",
      input: "text",
      inputValue: dv.ghiChu || "",
      showCancelButton: true,
      confirmButtonText: "Lưu",
      cancelButtonText: "Đóng",
    });
    if (!ghiChu.isConfirmed) return;

    await handleUpdateDVKT(dv.id, { soLuong: Number(soLuong.value), ghiChu: ghiChu.value }, async () => {
      await refreshClinicalOrders();
      await refresh?.();
    });
  };

  const onDeleteDVKT = async (dv) => {
    if (!canDelete) return toast.error("Bạn chưa có quyền hủy chỉ định DVKT.");
    if (statusLocked) return toast.error("Hồ sơ đã khóa, không thể hủy DVKT!");
    if (dv.canDelete === false) {
      return Swal.fire({
        icon: "warning",
        title: "Không thể hủy trực tiếp",
        text: "Dịch vụ đã thanh toán/đã có kết quả/PACS/LIS/RIS phải xử lý theo quy trình hủy nghiệp vụ.",
      });
    }
    if (dv.trangThai !== "pending") {
      return Swal.fire({
        icon: "warning",
        title: "Không thể hủy",
        text: "Chỉ hủy trực tiếp chỉ định đang chờ. Dịch vụ đã gửi/thực hiện/thanh toán phải xử lý theo quy trình hủy nghiệp vụ.",
      });
    }

    const confirmRes = await Swal.fire({
      icon: "warning",
      title: "Xác nhận hủy",
      text: `Hủy chỉ định ${dv.tenDvkt}?`,
      showCancelButton: true,
      confirmButtonText: "Hủy chỉ định",
      cancelButtonText: "Đóng",
      confirmButtonColor: "#dc2626",
    });
    if (!confirmRes.isConfirmed) return;

    await handleCancelDVKT(dv.id, async () => {
      await refreshClinicalOrders();
      await refresh?.();
    });
  };

  const onDeleteThuoc = async (t) => {
    if (!canDelete) return toast.error("Bạn chưa có quyền xóa thuốc trong đơn.");
    if (statusLocked) return toast.error("Hồ sơ đã khóa, không thể xóa thuốc!");
    if (t.daThanhToan || t.canEdit === false) return toast.warning("Thuốc đã thanh toán, không thể xóa trực tiếp.");
    const confirmRes = await Swal.fire({
      title: "Xóa thuốc?",
      text: `Thuốc: ${t.tenThuoc}`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      confirmButtonText: "Xóa",
      cancelButtonText: "Đóng",
    });
    if (!confirmRes.isConfirmed) return;

    const res = await deleteThuocInDon(t.id);
    if (res?.status === 200) {
      toast.success("Đã xóa thuốc!");
      await fetchDonTheoLanKham(selected.id, setLocalDonThuoc);
      await fetchTongHopDonThuoc(selected.id, setDonTongHop);
    } else {
      toast.error("Xóa thuốc thất bại!");
    }
  };

  const onEditThuoc = (t) => {
    if (!canEdit) return toast.error(noInputPermissionMessage);
    if (readonly) return toast.error("Hồ sơ đã khóa, không thể sửa thuốc!");
    if (t.daThanhToan || t.canEdit === false) return toast.warning("Thuốc đã thanh toán, không thể sửa trực tiếp.");
    setEditingThuoc(t);
  };

  const onPrintDon = async (idDon) => {
    try {
      if (!canExport) return toast.error(noExportPermissionMessage);
      if (!idDon) return toast.error("Không tìm thấy đơn thuốc để in!");
      const res = await apiDownloadDonThuocPDF(idDon);
      const file = new Blob([res.data], { type: "application/pdf" });
      openPdfBlob(file, "Đơn thuốc");
    } catch {
      toast.error("Không thể xuất PDF!");
    }
  };

  const onPrintTongHopDon = async () => {
    try {
      if (!canExport) return toast.error(noExportPermissionMessage);
      if (!selected?.id) return toast.error("Chưa chọn lượt khám.");
      if (donTongHop && donTongHop.canPrintTongHop === false) {
        const rooms = (donTongHop.blockingRooms || []).map((x) => x.phong || x.Phong).filter(Boolean).join(", ");
        return toast.warning(`Chưa thể in đơn tổng. Còn phòng chưa kết luận${rooms ? `: ${rooms}` : "."}`);
      }
      const res = await apiDownloadDonThuocTongHopPDF(selected.id);
      const file = new Blob([res.data], { type: "application/pdf" });
      openPdfBlob(file, "Đơn thuốc tổng hợp");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Không thể in đơn thuốc tổng hợp.");
    }
  };

  const onPrintChiDinhXetNghiem = async () => {
    try {
      if (!canExport) return toast.error(noExportPermissionMessage);
      if (!selected?.id) return toast.error("Chưa chọn lượt khám.");
      const printableOrders = dsDVKT.filter(isPrintableInstructionOrder);
      if (!printableOrders.length) return toast.warning("Không có chỉ định mới/chưa thanh toán để in phiếu.");
      const blob = await exportPhieuChiDinhXetNghiemPDF(selected.id, printableOrders.map((dv) => dv.id));
      openPdfBlob(blob, "Phiếu chỉ định xét nghiệm");
    } catch (err) {
      toast.error(err?.message || "Không thể in phiếu chỉ định xét nghiệm.");
    }
  };

  const buildFollowUpPayload = () => ({
    LoaiGiay: conclusionPaperType(followUpForm.hinhThucDieuTri),
    HinhThucDieuTri: followUpForm.hinhThucDieuTri,
    KetQua: followUpForm.ketQua,
    ChanDoan: form.chan_doan_cuoi || form.chan_doan_so_bo,
    LyDoHen: followUpForm.lyDoHen,
    BenhKemTheo: followUpForm.benhKemTheo,
    LoiDan: followUpForm.loiDan,
    NgayHen: followUpForm.ngayHen,
    PhongHen: followUpForm.phongHen,
    GhiChu: followUpForm.ghiChu,
    LyDoVaoVien: followUpForm.lyDoVaoVien,
    KhoaNhapVien: followUpForm.khoaNhapVien,
    KinhGui: followUpForm.kinhGui,
    DauHieuLamSang: followUpForm.dauHieuLamSang,
    LyDoChuyenTuyen: followUpForm.lyDoChuyenTuyen,
    HuongDieuTriChuyenTuyen: followUpForm.huongDieuTriChuyenTuyen,
    PhuongTienVanChuyen: followUpForm.phuongTienVanChuyen,
    LyDoKhongKham: followUpForm.lyDoKhongKham,
    DaKy: followUpForm.daKy,
    BacSiKy: followUpForm.bacSiKy || selected?.bacSi?.hoTen || selected?.bacSi?.ten || "",
    SignedAt: followUpForm.signedAt,
  });

  const getPrintDocuments = () => {
    if (!selected?.id) return [];

    const documents = [];
    const printableInstructionOrders = dsDVKT.filter(isPrintableInstructionOrder);
    const printableCls = summaryClsOrders.filter((dv) => dv.hasResult || isPrintableClsStatus(dv.trangThai));
    const donId = localDonThuoc?.id || donThuoc?.id;
    const paperPayload = buildFollowUpPayload();
    const paperType = conclusionPaperType(followUpForm.hinhThucDieuTri);
    const treatmentLabel = followUpForm.hinhThucDieuTri || "---";
    const addDocument = (doc) => documents.push({
      status: doc.ready ? "ready" : doc.notApplicable ? "na" : "missing",
      badge: doc.ready ? "Sẵn sàng" : doc.notApplicable ? "Không áp dụng" : "Thiếu dữ liệu",
      ...doc,
    });

    addDocument({
      id: "tom-tat-kham",
      title: "Phiếu/tóm tắt khám bệnh",
      description: "Thông tin hành chính, sinh hiệu, chẩn đoán, hướng xử trí, CLS và đơn thuốc.",
      group: "Khám bệnh",
      ready: !!(form.chan_doan_cuoi?.trim() || selected?.chanDoanCuoi || selected?.chanDoanSoBo),
      reason: "Cần có chẩn đoán hoặc kết quả khám để in tóm tắt.",
      getBlob: () => exportTomTatKhamPDF(selected.id),
    });

    addDocument({
      id: "phieu-chi-dinh-dvkt",
      title: "Phiếu chỉ định xét nghiệm/DVKT",
      description: printableInstructionOrders.length
        ? `${printableInstructionOrders.length} dịch vụ mới/chưa thanh toán, chưa có kết quả.`
        : "Chỉ in dịch vụ mới/chưa thanh toán, không in lẫn dịch vụ cũ đã có kết quả.",
      group: "CLS/DVKT",
      ready: printableInstructionOrders.length > 0,
      reason: dsDVKT.length ? "Không có chỉ định mới/chưa thanh toán/chưa có kết quả để in." : "Chưa có chỉ định DVKT.",
      getBlob: () => exportPhieuChiDinhXetNghiemPDF(selected.id, printableInstructionOrders.map((dv) => dv.id)),
    });

    printableCls.forEach((dv, index) => {
      addDocument({
        id: `ket-qua-cls-${dv.id}`,
        title: `Kết quả CLS ${index + 1}`,
        description: dv.tenDvkt || dv.maDvkt || `Chỉ định #${dv.id}`,
        group: "CLS/DVKT",
        ready: true,
        getBlob: () => exportPdfDVKT(dv.id),
      });
    });

    if (!printableCls.length) {
      addDocument({
        id: "ket-qua-cls-empty",
        title: "Kết quả CLS",
        description: dsDVKT.length ? "CLS/DVKT chưa có kết quả hợp lệ để in." : "Chưa có CLS/DVKT.",
        group: "CLS/DVKT",
        ready: false,
        notApplicable: !dsDVKT.length,
        reason: dsDVKT.length ? "Chưa có kết quả CLS/DVKT đã hoàn thành/đã gửi." : "Không có chỉ định CLS/DVKT.",
      });
    }

    if (donTongHop && donTongHop.canPrintTongHop !== false) {
      addDocument({
        id: "don-thuoc-tong-hop",
        title: "Đơn thuốc tổng hợp",
        description: "Gom đơn theo phòng khám, bác sĩ kê và nhóm thuốc.",
        group: "Đơn thuốc",
        ready: true,
        getBlob: async () => {
          const res = await apiDownloadDonThuocTongHopPDF(selected.id);
          return res.data;
        },
      });
    } else if (donTongHop?.canPrintTongHop === false) {
      const rooms = (donTongHop.blockingRooms || []).map((x) => x.phong || x.Phong).filter(Boolean).join(", ");
      addDocument({
        id: "don-thuoc-tong-hop",
        title: "Đơn thuốc tổng hợp",
        description: "Đơn tổng chỉ in sau khi các phòng liên quan đã kết luận.",
        group: "Đơn thuốc",
        ready: false,
        reason: rooms ? `Còn phòng chưa kết luận: ${rooms}.` : "Còn phòng liên quan chưa kết luận.",
      });
    } else if (donId) {
      addDocument({
        id: "don-thuoc",
        title: "Đơn thuốc",
        description: "Đơn thuốc của lượt khám hiện tại.",
        group: "Đơn thuốc",
        ready: true,
        getBlob: async () => {
          const res = await apiDownloadDonThuocPDF(donId);
          return res.data;
        },
      });
    } else {
      addDocument({
        id: "don-thuoc-empty",
        title: "Đơn thuốc",
        description: "Chưa có đơn thuốc hoặc ghi chú/lời dặn không kê thuốc.",
        group: "Đơn thuốc",
        ready: false,
        notApplicable: true,
        reason: "Chưa có đơn thuốc.",
      });
    }

    const conclusionDocs = {
      HEN_KHAM: {
        title: "Giấy hẹn khám lại",
        applicable: paperType === "HEN_KHAM",
        missing: [
          !followUpForm.lyDoHen?.trim() && "quá trình bệnh lý",
          !followUpForm.benhKemTheo?.trim() && "chẩn đoán",
          !followUpForm.ngayHen && "ngày hẹn",
          followUpForm.ngayHen && isPastDateInput(followUpForm.ngayHen) && "ngày hẹn không được quá khứ",
          !followUpForm.phongHen?.trim() && "phòng hẹn",
        ].filter(Boolean),
      },
      NHAP_VIEN: {
        title: "Giấy khám bệnh vào viện",
        applicable: paperType === "NHAP_VIEN",
        missing: [
          !followUpForm.lyDoVaoVien?.trim() && "lý do vào viện",
          !followUpForm.khoaNhapVien?.trim() && "khoa điều trị",
        ].filter(Boolean),
      },
      CHUYEN_VIEN: {
        title: "Giấy chuyển tuyến BHYT",
        applicable: paperType === "CHUYEN_VIEN",
        missing: [
          !followUpForm.kinhGui?.trim() && "kính gửi",
          !followUpForm.dauHieuLamSang?.trim() && "dấu hiệu lâm sàng",
          !followUpForm.lyDoChuyenTuyen?.trim() && "lý do chuyển tuyến",
          !followUpForm.huongDieuTriChuyenTuyen?.trim() && "hướng điều trị",
          !followUpForm.phuongTienVanChuyen?.trim() && "phương tiện vận chuyển",
        ].filter(Boolean),
      },
      CHO_VE: {
        title: "Kết luận cho về",
        applicable: paperType === "CHO_VE",
        missing: [
          !followUpForm.loiDan?.trim() && !followUpForm.ghiChu?.trim() && "lời dặn hoặc ghi chú sau khám",
        ].filter(Boolean),
      },
      KHONG_KHAM: {
        title: "Phiếu không khám/bỏ về",
        applicable: paperType === "KHONG_KHAM",
        missing: [
          !followUpForm.lyDoKhongKham?.trim() && "lý do không khám/bỏ về",
        ].filter(Boolean),
      },
    };

    const hasSignedPaper = !!followUpForm.daKy;

    Object.entries(conclusionDocs).forEach(([type, doc]) => {
      const missing = doc.applicable && !hasSignedPaper
        ? [...doc.missing, "chữ ký bác sĩ"]
        : doc.missing;
      addDocument({
        id: `giay-ket-luan-${type}`,
        title: doc.title,
        description: doc.applicable
          ? `Hướng điều trị hiện tại: ${treatmentLabel}.`
          : `Không áp dụng khi hướng điều trị là ${treatmentLabel}.`,
        group: "Kết luận khám",
        ready: doc.applicable && missing.length === 0,
        notApplicable: !doc.applicable,
        reason: !doc.applicable ? "" : (missing.length ? `Thiếu: ${missing.join(", ")}.` : ""),
        getBlob: () => exportGiayKetLuanKhamPDF(selected.id, { ...paperPayload, LoaiGiay: type }),
      });
    });

    addDocument({
      id: "sang-loc-dinh-duong",
      title: "Phiếu tư vấn/sàng lọc dinh dưỡng",
      description: "Chưa có dữ liệu sàng lọc dinh dưỡng trong lượt khám này.",
      group: "Phiếu khác",
      ready: false,
      notApplicable: true,
      reason: "Không có dữ liệu dinh dưỡng.",
    });

    return documents;
  };

  const onPrintReadyDocuments = async () => {
    if (printBatchLoading) return;
    if (!canExport) return toast.error(noExportPermissionMessage);
    if (!selected?.id) return toast.error("Chưa chọn lượt khám.");
    const documents = getPrintDocuments();
    const jobs = documents.filter((doc) => doc.status === "ready" && typeof doc.getBlob === "function");
    const missing = documents
      .filter((doc) => doc.status === "missing")
      .map((doc) => `${doc.title}: ${doc.reason || "thiếu dữ liệu"}`);

    if (!jobs.length) {
      return Swal.fire({
        icon: "info",
        title: "Chưa có giấy tờ để in",
        text: missing.join("; ") || "Lượt khám chưa có giấy tờ hợp lệ.",
        confirmButtonText: "Đóng",
      });
    }

    toast.info(`Đang tải ${jobs.length} giấy tờ hợp lệ...`);
    setPrintBatchLoading(true);

    const results = await Promise.allSettled(
      jobs.map(async (job) => {
        const blob = await job.getBlob();
        return {
          id: job.id,
          title: job.title,
          group: job.group,
          blob: blob?.type === "application/pdf" ? blob : new Blob([blob], { type: "application/pdf" }),
        };
      })
    );

    const loadedDocs = results.filter((result) => result.status === "fulfilled").map((result) => result.value);
    const failed = results.filter((result) => result.status === "rejected");
    results.forEach((result, index) => {
      if (result.status === "rejected") console.error("print center failed:", jobs[index]?.title, result.reason);
    });
    const successCount = loadedDocs.length;
    const failCount = failed.length;
    setPrintBatchLoading(false);

    if (loadedDocs.length) {
      setPrintBatchPreview({ documents: loadedDocs, missing });
      toast.success(`Đã tải ${successCount} giấy tờ hợp lệ.`);
    }
    if (failCount || missing.length) {
      toast.warning([
        failCount ? `${failCount} giấy tờ chưa tải được` : "",
        missing.length ? missing.join("; ") : "",
      ].filter(Boolean).join(". "));
    }
  };

  const printSingleDocument = async (doc) => {
    if (!canExport) return toast.error(noExportPermissionMessage);
    if (!doc || doc.status !== "ready" || typeof doc.getBlob !== "function") {
      return toast.warning("Giấy tờ này chưa đủ điều kiện để in.");
    }

    const win = createPdfWindow(doc.title);
    try {
      const blob = await doc.getBlob();
      openPdfBlob(blob, doc.title, win);
      toast.success(`Đã mở ${doc.title} để in.`);
    } catch (err) {
      if (win && !win.closed) win.close();
      console.error("print document failed:", doc.title, err);
      toast.error(err?.message || `Không thể mở ${doc.title}.`);
    }
  };

  const openPrintCenter = () => {
    if (!canExport) return toast.error(noExportPermissionMessage);
    if (!selected?.id) return toast.error("Chưa chọn lượt khám.");
    setActiveTab("ketluan");
    setPrintCenterOpen(true);
  };

  const openPdfPreview = (dv) => {
    if (!dv?.id) return;
    setPdfPreview({
      id: dv.id,
      title: dv.tenDvkt || `Kết quả CLS #${dv.id}`,
    });
  };

  const onMarkReadDVKT = async (dv) => {
    if (!dv?.id) return;
    if (!canEdit) return toast.error(noInputPermissionMessage);
    if (!dv.hasResult && !isPrintableClsStatus(dv.trangThai)) {
      return toast.warning("Chỉ xác nhận đã đọc khi CLS/DVKT đã có kết quả.");
    }
    await handleMarkDVKTResultRead(dv.id, refreshClinicalOrders);
  };

  const onFollowUpChange = (e) => {
    const { name, value } = e.target;
    if (name === "ngayHen" && isPastDateInput(value)) {
      toast.warning("Ngày hẹn khám lại không được nằm trong quá khứ.");
    }
    setFollowUpForm((old) => ({
      ...old,
      [name]: value,
      ...(name === "hinhThucDieuTri" ? { loaiGiay: conclusionPaperType(value) } : {}),
      ...(old.daKy || old.saved ? { daKy: false, bacSiKy: "", signedAt: null, saved: false } : {}),
    }));
    setValidationErrors((old) => {
      const next = { ...old };
      delete next[name];
      if (name !== "daKy") delete next.daKy;
      return next;
    });
  };

  const onSignFollowUp = async () => {
    if (!canEdit) return toast.error(noInputPermissionMessage);
    const doctorName = selected?.bacSi?.hoTen || selected?.bacSi?.ten || selected?.bacSi?.tenNguoiDung || `Bác sĩ #${idBacSi || ""}`;
    if (!doctorName?.trim()) return toast.warning("Không xác định được bác sĩ ký.");

    const key = treatmentKey(followUpForm.hinhThucDieuTri);
    const signErrors = {};
    const clinicalResult = form.ket_qua?.trim() || followUpForm.ketQua;
    const isNoExamTreatment = key === "KHONG_KHAM";

    if (!clinicalResult?.trim()) signErrors.ket_qua = "Bắt buộc nhập kết quả khám trước khi ký.";
    if (!followUpForm.hinhThucDieuTri?.trim()) signErrors.huong_xu_tri = "Bắt buộc chọn hướng điều trị trước khi ký.";
    if (!isNoExamTreatment) {
      if (!form.chan_doan_cuoi?.trim()) signErrors.chan_doan_cuoi = "Bắt buộc nhập chẩn đoán cuối trước khi ký.";
      if (!form.id_benh) signErrors.id_benh = "Bắt buộc chọn mã ICD/bệnh chính trước khi ký.";
    }

    const multiDiagnosis =
      form.chan_doan_cuoi.includes(";") ||
      form.chan_doan_cuoi.includes("\n") ||
      form.chan_doan_cuoi.includes("|");
    if (multiDiagnosis && !form.ghi_chu?.trim()) {
      signErrors.ghi_chu = "Nhiều chẩn đoán cần có ghi chú/mô tả chi tiết trước khi ký.";
    }

    if (key === "HEN_KHAM") {
      if (!followUpForm.lyDoHen?.trim()) signErrors.lyDoHen = "Hẹn khám bắt buộc nhập quá trình bệnh lý/lý do hẹn.";
      if (!followUpForm.benhKemTheo?.trim()) signErrors.benhKemTheo = "Hẹn khám bắt buộc nhập chẩn đoán trên giấy hẹn.";
      if (!followUpForm.ngayHen) signErrors.ngayHen = "Hẹn khám bắt buộc chọn ngày hẹn khám lại.";
      if (followUpForm.ngayHen && isPastDateInput(followUpForm.ngayHen)) signErrors.ngayHen = "Ngày hẹn khám lại không được nằm trong quá khứ.";
      if (!followUpForm.phongHen?.trim()) signErrors.phongHen = "Hẹn khám bắt buộc nhập phòng hẹn.";
    } else if (key === "NHAP_VIEN") {
      if (!followUpForm.lyDoVaoVien?.trim()) signErrors.lyDoVaoVien = "Nhập viện bắt buộc nhập lý do vào viện.";
      if (!followUpForm.khoaNhapVien?.trim()) signErrors.khoaNhapVien = "Nhập viện bắt buộc nhập khoa điều trị.";
    } else if (key === "CHUYEN_VIEN") {
      if (!followUpForm.kinhGui?.trim()) signErrors.kinhGui = "Chuyển viện bắt buộc nhập kính gửi.";
      if (!followUpForm.dauHieuLamSang?.trim()) signErrors.dauHieuLamSang = "Chuyển viện bắt buộc nhập dấu hiệu lâm sàng.";
      if (!followUpForm.lyDoChuyenTuyen?.trim()) signErrors.lyDoChuyenTuyen = "Chuyển viện bắt buộc chọn lý do chuyển tuyến.";
      if (!followUpForm.huongDieuTriChuyenTuyen?.trim()) signErrors.huongDieuTriChuyenTuyen = "Chuyển viện bắt buộc nhập hướng điều trị.";
      if (!followUpForm.phuongTienVanChuyen?.trim()) signErrors.phuongTienVanChuyen = "Chuyển viện bắt buộc nhập phương tiện vận chuyển.";
    } else if (key === "KHONG_KHAM") {
      if (!followUpForm.lyDoKhongKham?.trim()) signErrors.lyDoKhongKham = "Không khám/bỏ về bắt buộc nhập lý do.";
    } else if (!followUpForm.loiDan?.trim() && !followUpForm.ghiChu?.trim()) {
      signErrors.loiDan = "Cho về bắt buộc nhập lời dặn hoặc ghi chú sau khám.";
    }

    if (Object.keys(signErrors).length) {
      setValidationErrors((old) => ({ ...old, ...signErrors }));
      setActiveTab("ketluan");
      setTimeout(() => {
        document.querySelector('[data-error="true"]')?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 80);
      return Swal.fire({
        icon: "warning",
        title: "Chưa đủ dữ liệu để ký",
        html: `<div style="text-align:left">${Object.values(signErrors).map((item) => `<div>• ${item}</div>`).join("")}</div>`,
        confirmButtonText: "Bổ sung",
      });
    }

    const res = await Swal.fire({
      icon: "question",
      title: "Ký giấy tờ kết luận?",
      text: `Xác nhận bác sĩ ${doctorName} ký giấy ${followUpForm.hinhThucDieuTri || "kết luận"}.`,
      showCancelButton: true,
      confirmButtonText: "Ký tên",
      cancelButtonText: "Đóng",
      confirmButtonColor: "#059669",
    });
    if (!res.isConfirmed) return;

    setFollowUpForm((old) => ({
      ...old,
      daKy: true,
      bacSiKy: doctorName,
      signedAt: formatDateTimeLocalPayload(new Date()),
      saved: false,
    }));
    setValidationErrors((old) => {
      const next = { ...old };
      delete next.daKy;
      return next;
    });
    toast.success("Đã ký giấy tờ kết luận.");
  };

  const onCancelSignFollowUp = async () => {
    if (!followUpForm.daKy) return;
    if (!canEdit) return toast.error(noInputPermissionMessage);

    const res = await Swal.fire({
      icon: "warning",
      title: "Hủy chữ ký bác sĩ?",
      text: "Giấy tờ kết luận sẽ chuyển về trạng thái chưa ký và cần ký lại trước khi lưu/in.",
      showCancelButton: true,
      confirmButtonText: "Hủy ký",
      cancelButtonText: "Đóng",
      confirmButtonColor: "#dc2626",
    });
    if (!res.isConfirmed) return;

    setFollowUpForm((old) => ({
      ...old,
      daKy: false,
      bacSiKy: "",
      signedAt: null,
      saved: false,
    }));
    setValidationErrors((old) => ({
      ...old,
      daKy: "Bác sĩ cần ký giấy tờ kết luận trước khi lưu.",
    }));
    toast.info("Đã hủy chữ ký bác sĩ.");
  };

  useEffect(() => {
    if (!followUpForm.daKy) return;
    setValidationErrors((old) => {
      if (!old.daKy) return old;
      const next = { ...old };
      delete next.daKy;
      return next;
    });
  }, [followUpForm.daKy]);

  useEffect(() => {
    if (!selected?.id) return undefined;

    const handleShortcut = (event) => {
      if (event.repeat || event.altKey || event.ctrlKey || event.metaKey) return;

      if (event.key === "F1") {
        event.preventDefault();
        setActiveTab("ketluan");
        onSignFollowUp();
      }

      if (event.key === "F2") {
        event.preventDefault();
        setActiveTab("ketluan");
        onSave();
      }
    };

    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  });

  const activeTreatmentKey = treatmentKey(followUpForm.hinhThucDieuTri);
  const hideClinicalFieldsForNoExam = activeTreatmentKey === "KHONG_KHAM";
  const currentClsOrders = clsSummary.hienTai?.length ? clsSummary.hienTai : dsDVKT;
  const summaryClsOrders = clsSummary.tongHop?.length ? clsSummary.tongHop : currentClsOrders;
  const unreadResultCount = summaryClsOrders.filter((dv) => (dv.hasResult || isPrintableClsStatus(dv.trangThai)) && !dv.bacSiDaDocKetQua).length;
  const blockingClsCount = (clsSummary.tongHop?.length ? clsSummary.tongHop : dsDVKT).filter((dv) => isBlockingClsStatus(dv.trangThai)).length;
  const canConcludeNow = hideClinicalFieldsForNoExam || blockingClsCount === 0;

  if (!selected) {
    return (
      <section className="flex h-full min-h-0 flex-1 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white text-slate-400">
        <div className="text-center">
          <Stethoscope className="mx-auto mb-3 h-10 w-10 text-sky-300" />
          <div className="text-base font-semibold text-slate-500">Chọn bệnh nhân để bắt đầu khám</div>
          <div className="mt-1 text-sm">Danh sách bên trái sẽ mở chi tiết vào khu vực này.</div>
        </div>
      </section>
    );
  }

  return (
    <section className="flex h-full min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm ring-1 ring-white">
      <PatientSummary selected={selected} readonly={readonly} completion={completion} isLoading={isLoadingDetail} />

      <div className="border-b border-slate-200 bg-gradient-to-r from-slate-50 via-sky-50/80 to-emerald-50/70 px-3 py-2">
        <div className="flex flex-wrap items-center gap-2">
          <TabButton id="kham" icon={ClipboardList} label="Khám bệnh" tone="sky" activeTab={activeTab} setActiveTab={setActiveTab} />
          <TabButton id="dvkt" icon={FlaskConical} label={`CLS (${summaryClsOrders.length})`} tone="indigo" activeTab={activeTab} setActiveTab={setActiveTab} />
          <TabButton id="don" icon={Pill} label={localDonThuoc ? "Đơn thuốc" : "Kê đơn"} tone="amber" activeTab={activeTab} setActiveTab={setActiveTab} />
          <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
            <ActionButton icon={Printer} label="Trung tâm in" onClick={openPrintCenter} disabled={!selected?.id || !canExport} tone="purple" compact />
            <ActionButton icon={Save} label="Lưu kết luận & in" onClick={onSave} disabled={readonly} tone="green" compact prominent />
            <ActionButton icon={Ban} label="Hủy khám" onClick={onCancel} disabled={readonly || !canDelete} tone="red" compact />
            <ActionButton icon={RotateCcw} label="Mở lại" onClick={onReopen} disabled={!canReopenConclusion} tone="orange" compact />
            <TabButton id="ketluan" icon={FileText} label="Kết luận & giấy tờ" tone="emerald" activeTab={activeTab} setActiveTab={setActiveTab} />
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-gradient-to-br from-white via-slate-50/60 to-sky-50/40 p-4 pb-24">
        <div key={activeTab} className="min-h-full pb-10 animate-fadeSlide">
        {activeTab === "kham" && (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <div className="xl:col-span-2">
              <TreatmentOutcomePanel
                selected={selected}
                form={followUpForm}
                onChange={onFollowUpChange}
                examForm={form}
                onExamChange={onChange}
                benhOptions={benhOptions}
                onSearchBenh={handleSearchBenh}
                disabled={readonly}
                errors={validationErrors}
                onSign={onSignFollowUp}
                onCancelSign={onCancelSignFollowUp}
              />
            </div>
          </div>
        )}

        {activeTab === "dvkt" && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-indigo-100 bg-white p-3 shadow-sm">
              <div className="mr-auto flex flex-wrap items-center gap-2">
                <span className="rounded-md bg-indigo-50 px-3 py-2 text-sm font-bold text-indigo-700">
                  Danh sách chỉ định CLS ({summaryClsOrders.length})
                </span>
                {unreadResultCount > 0 && (
                  <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
                    {unreadResultCount} kết quả chưa xác nhận đọc
                  </span>
                )}
              </div>
              <ActionButton icon={Printer} label="In phiếu chỉ định" onClick={onPrintChiDinhXetNghiem} disabled={!canExport || !dsDVKT.some(isPrintableInstructionOrder)} tone="purple" />
              <ActionButton icon={Plus} label="Thêm chỉ định" onClick={onOpenChiDinh} disabled={statusLocked || !canAdd} tone="green" />
            </div>
            <DVKTTable
              dsDVKT={summaryClsOrders}
              currentLanKhamId={selected?.id}
              onEdit={onEditDVKT}
              onDelete={onDeleteDVKT}
              onPreview={openPdfPreview}
              onMarkRead={onMarkReadDVKT}
              canEdit={canEdit}
              canDelete={canDelete}
              canMarkRead={canEdit}
            />
          </div>
        )}

        {activeTab === "don" && (
          <div className="space-y-3">
            <PrescriptionClinicalSummary selected={selected} tongHop={donTongHop} />
            <div className="flex flex-wrap justify-end gap-2">
              <ActionButton
                icon={Plus}
                label={localDonThuoc ? "Cập nhật đơn" : "Kê đơn"}
                disabled={statusLocked || !(localDonThuoc ? canEdit : canAdd)}
                tone="amber"
                onClick={() => {
                  if (!(localDonThuoc ? canEdit : canAdd)) {
                    toast.error(noInputPermissionMessage);
                    return;
                  }
                  setKeDonData({
                    idLanKham: selected.id,
                    idBenhNhan: selected.idBenhNhan,
                    idBacSi: selected.bacSi?.id || idBacSi,
                    clinicalContext: selected,
                  });
                  setOpenKeDon(true);
                }}
              />
              <ActionButton icon={Printer} label="In đơn" tone="purple" onClick={() => onPrintDon(donThuoc?.id || localDonThuoc?.id)} disabled={!canExport || !(donThuoc?.id || localDonThuoc?.id)} />
              <ActionButton icon={Printer} label="In đơn tổng" tone="green" onClick={onPrintTongHopDon} disabled={!canExport || !donTongHop || donTongHop.canPrintTongHop === false} />
            </div>
            <DonThuoc donThuoc={localDonThuoc} tongHop={donTongHop} onEditThuoc={onEditThuoc} onDeleteThuoc={onDeleteThuoc} canEdit={canEdit} canDelete={canDelete} />
          </div>
        )}

        {activeTab === "ketluan" && (
          <div className="w-full overflow-hidden rounded-xl border border-emerald-200 bg-white shadow-md">
            <div className="border-b border-emerald-100 bg-gradient-to-r from-emerald-600 via-teal-600 to-sky-600 p-4 text-white">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-white/15 ring-1 ring-white/25">
                    <Save className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-lg font-bold">Kết luận lượt khám</div>
                    <div className="text-sm text-white/80">Chọn hướng điều trị, kết quả và lưu để đóng hồ sơ hoặc cập nhật giấy tờ tương ứng.</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3 p-4">
              <TreatmentOutcomePanel
                selected={selected}
                form={followUpForm}
                onChange={onFollowUpChange}
                examForm={form}
                onExamChange={onChange}
                benhOptions={benhOptions}
                onSearchBenh={handleSearchBenh}
                disabled={readonly}
                errors={validationErrors}
                onSign={onSignFollowUp}
                onCancelSign={onCancelSignFollowUp}
              />

              {readonly && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-700">
                  Hồ sơ đang khóa. Nếu cần sửa kết luận, dùng nút Mở lại trước rồi lưu lại kết quả.
                </div>
              )}

              {!readonly && (
                <div className="rounded-lg border border-emerald-100 bg-emerald-50/60 p-3 text-sm font-semibold text-emerald-700">
                  Đang ở chế độ chỉnh sửa. Bạn có thể sửa nhanh kết quả ngay tại đây hoặc quay lại tab Khám bệnh.
                </div>
              )}

              {!canConcludeNow && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-700">
                  Còn {blockingClsCount} chỉ định CLS đang chờ/đang thực hiện. Hoàn tất hoặc hủy đúng nghiệp vụ trước khi kết luận khám.
                </div>
              )}

              <div className="flex flex-wrap items-center justify-end gap-2 rounded-lg border border-emerald-100 bg-white px-3 py-3 shadow-sm">
                <ActionButton icon={Printer} label="Mở trung tâm in" onClick={openPrintCenter} disabled={!selected?.id || !canExport} tone="purple" />
                <ActionButton icon={Save} label="Lưu kết luận & mở in" onClick={onSave} disabled={readonly} tone="green" prominent />
              </div>

            </div>
          </div>
        )}

        </div>
      </div>

      {keDonData && openKeDon && (
        <ModalKeDonThuoc
          isOpen={openKeDon}
          onClose={() => {
            setOpenKeDon(false);
            setKeDonData(null);
          }}
          idLanKham={keDonData.idLanKham}
          idBenhNhan={keDonData.idBenhNhan}
          idBacSi={keDonData.idBacSi}
          clinicalContext={keDonData.clinicalContext}
          onSaved={async () => {
            await fetchDonTheoLanKham(selected.id, setLocalDonThuoc);
            await fetchTongHopDonThuoc(selected.id, setDonTongHop);
            setOpenKeDon(false);
            setKeDonData(null);
          }}
        />
      )}

      {editingThuoc && selected?.id && (
        <ModalEditThuoc
          open={true}
          thuoc={editingThuoc}
          onClose={() => setEditingThuoc(null)}
          onSaved={async () => {
            await fetchDonTheoLanKham(selected.id, setLocalDonThuoc);
            await fetchTongHopDonThuoc(selected.id, setDonTongHop);
            setEditingThuoc(null);
          }}
        />
      )}

      {printCenterOpen && (
        <PrintCenterModal
          documents={getPrintDocuments()}
          onPreview={(doc) => setPrintDocumentPreview(doc)}
          onPrint={(doc) => printSingleDocument(doc)}
          onPrintAll={onPrintReadyDocuments}
          printAllLoading={printBatchLoading}
          onClose={() => setPrintCenterOpen(false)}
        />
      )}

      {pdfPreview && (
        <PdfPreviewModal preview={pdfPreview} onClose={() => setPdfPreview(null)} />
      )}

      {printDocumentPreview && (
        <GenericPdfPreviewModal
          documentItem={printDocumentPreview}
          onClose={() => setPrintDocumentPreview(null)}
        />
      )}

      {printBatchPreview && (
        <PrintBatchPreviewModal
          batch={printBatchPreview}
          onClose={() => setPrintBatchPreview(null)}
        />
      )}
    </section>
  );
}

function PatientSummary({ selected, readonly, completion, isLoading }) {
  const vital = selected.sinhHieu;
  return (
    <div className="shrink-0 border-b border-slate-200 bg-gradient-to-r from-white via-sky-50/60 to-emerald-50/50 px-3 py-2">
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sky-600 text-white shadow-sm">
            <User className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-base font-bold text-slate-900">{selected.hoTen || "Đang tải..."}</h2>
              <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${statusClass(selected.trangThai)}`}>
                {statusLabel(selected.trangThai)}
              </span>
              {readonly && (
                <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                  <Lock className="h-3 w-3" />
                  Khóa
                </span>
              )}
              {isLoading && <span className="text-xs font-semibold text-sky-600">Đang tải chi tiết...</span>}
            </div>
            <div className="mt-0.5 truncate text-xs text-slate-500">
              {selected.maBenhNhan || "---"} · HS {selected.maHoSo || "---"} · {selected.gioiTinh || "---"} · {selected.ngaySinh || "---"}
            </div>
            <div className="mt-0.5 truncate text-xs text-slate-500">
              Phòng: {selected.phong?.tenPhong || "---"} · Khu: {selected.khuTiepDon?.tenKhu || "---"} · Đối tượng: {selected.doiTuongThanhToan || "---"}
            </div>
          </div>
        </div>

        <div className="flex min-w-[260px] flex-col gap-1">
          <div className="flex items-center justify-between gap-3 text-xs font-semibold text-slate-500">
            <span>Tiến độ</span>
            <span>{completion}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-white shadow-inner">
            <div className="h-1.5 rounded-full bg-gradient-to-r from-sky-500 via-indigo-500 to-emerald-500 transition-all" style={{ width: `${completion}%` }} />
          </div>
          {vital && (
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold text-slate-500">
              <HeartPulse className="h-3 w-3 text-emerald-600" />
              <span>Mạch {vital?.mach || "---"}</span>
              <span>HA {vital?.huyetAp || "---"}</span>
              <span>SpO2 {vital?.spo2 || "---"}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TabButton({ id, icon: Icon, label, shortcut, activeTab, setActiveTab, tone = "sky", prominent }) {
  const active = activeTab === id;
  const tones = {
    sky: {
      active: "bg-white text-sky-700 shadow-sm ring-1 ring-sky-100",
      idle: "text-slate-500 hover:bg-white hover:text-sky-700",
      bar: "bg-sky-500",
    },
    indigo: {
      active: "bg-white text-indigo-700 shadow-sm ring-1 ring-indigo-100",
      idle: "text-slate-500 hover:bg-white hover:text-indigo-700",
      bar: "bg-indigo-500",
    },
    amber: {
      active: "bg-white text-amber-700 shadow-sm ring-1 ring-amber-100",
      idle: "text-slate-500 hover:bg-white hover:text-amber-700",
      bar: "bg-amber-500",
    },
    emerald: {
      active: "bg-white text-emerald-700 shadow-sm ring-1 ring-emerald-100",
      idle: "text-slate-500 hover:bg-white hover:text-emerald-700",
      bar: "bg-emerald-500",
    },
    violet: {
      active: "bg-white text-violet-700 shadow-sm ring-1 ring-violet-100",
      idle: "text-slate-500 hover:bg-white hover:text-violet-700",
      bar: "bg-violet-500",
    },
  };
  const color = tones[tone] || tones.sky;
  return (
    <button
      type="button"
      onClick={() => setActiveTab(id)}
      className={`relative inline-flex items-center gap-2 overflow-hidden rounded-md px-3 py-2 text-sm font-semibold transition-all whitespace-nowrap ${
        prominent && !active ? "bg-emerald-600 text-white shadow-sm hover:bg-emerald-700" : active ? color.active : color.idle
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
      {shortcut && (
        <span className={`rounded border px-1.5 py-0.5 text-[10px] font-black ${
          prominent && !active ? "border-white/30 bg-white/15 text-white" : "border-slate-200 bg-slate-50 text-slate-500"
        }`}>
          {shortcut}
        </span>
      )}
      {active && <span className={`absolute inset-x-2 bottom-0 h-0.5 rounded-full ${color.bar}`} />}
    </button>
  );
}

function TextArea({ label, name, value, onChange, disabled, required, rows = 4, error }) {
  return (
    <label className="block" data-field-name={name} data-error={error ? "true" : "false"}>
      <div className="mb-1 flex items-center gap-1 text-sm font-semibold text-slate-700">
        {label}
        {required && <span className="text-red-500">*</span>}
      </div>
      <textarea
        name={name}
        value={value}
        onChange={onChange}
        rows={rows}
        disabled={disabled}
        className={`w-full resize-none rounded-md border px-3 py-2 text-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100 ${
          error
            ? "border-red-300 bg-red-50/50 text-slate-800 ring-2 ring-red-100"
            : disabled
              ? "border-slate-200 bg-slate-100 text-slate-500"
              : "border-slate-200 bg-white"
        }`}
      />
      {error && <div className="mt-1 text-xs font-semibold text-red-600">{error}</div>}
    </label>
  );
}

function DiagnosisFields({ form, onChange, disabled, benhOptions, onSearch, error, paper = false }) {
  const extraIds = Array.isArray(form.id_benh_kem_theo) ? form.id_benh_kem_theo.map(String) : [];
  const selectedIds = [form.id_benh, ...extraIds].filter(Boolean).map(String);
  const selectedIdsKey = selectedIds.join("|");
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);
  const [selectedCache, setSelectedCache] = useState([]);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const uniqueOptions = useMemo(() => dedupeDiseases(benhOptions), [benhOptions]);

  const normalizeSearch = (value) => String(value || "").trim().toLowerCase();
  const matchBenh = (benh, keyword) => {
    const term = normalizeSearch(keyword);
    if (!term) return true;
    return normalizeSearch(benh.ma).includes(term) || normalizeSearch(benh.ten).includes(term);
  };
  const selectedDiseases = selectedIds
    .map((id) => uniqueOptions.find((benh) => String(benh.id) === id) || selectedCache.find((benh) => String(benh.id) === id))
    .filter(Boolean);
  const availableOptions = uniqueOptions
    .filter((benh) => !selectedIds.includes(String(benh.id)))
    .filter((benh) => matchBenh(benh, query));

  useEffect(() => {
    const idSet = new Set(selectedIdsKey.split("|").filter(Boolean));
    const selectedFromOptions = uniqueOptions.filter((benh) => idSet.has(String(benh.id)));
    if (!selectedFromOptions.length) return;
    setSelectedCache((old) => {
      const merged = [...old];
      selectedFromOptions.forEach((benh) => {
        if (!merged.some((item) => String(item.id) === String(benh.id))) merged.push(benh);
      });
      return merged;
    });
  }, [uniqueOptions, selectedIdsKey]);

  useEffect(() => {
    if (!open || disabled) return undefined;
    const timer = setTimeout(() => onSearch?.(query.trim()), 250);
    return () => clearTimeout(timer);
  }, [query, open, disabled, onSearch]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query, availableOptions.length]);

  useEffect(() => {
    if (!open) return undefined;
    const handlePointerDown = (event) => {
      if (!wrapperRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  const handleSearchChange = (e) => {
    setQuery(e.target.value);
    setOpen(true);
  };

  const selectBenh = (benh) => {
    const id = String(benh.id);
    if (selectedIds.includes(id)) {
      setQuery("");
      setOpen(false);
      requestAnimationFrame(() => inputRef.current?.blur());
      return;
    }

    if (!form.id_benh) {
      onChange({ target: { name: "id_benh", value: id, type: "text" } });
    } else {
      onChange({ target: { name: "id_benh_kem_theo", value: [...extraIds, id], type: "text" } });
    }
    setSelectedCache((old) => (old.some((item) => String(item.id) === id) ? old : [...old, benh]));
    setQuery("");
    setOpen(false);
    setActiveIndex(0);
    requestAnimationFrame(() => inputRef.current?.blur());
  };

  const removeBenh = (id) => {
    const idText = String(id);
    if (String(form.id_benh) === idText) {
      const [nextPrimary, ...rest] = extraIds;
      onChange({ target: { name: "id_benh", value: nextPrimary || "", type: "text" } });
      onChange({ target: { name: "id_benh_kem_theo", value: rest, type: "text" } });
      return;
    }
    onChange({
      target: {
        name: "id_benh_kem_theo",
        value: extraIds.filter((item) => item !== idText),
        type: "text",
      },
    });
  };

  const handleKeyDown = async (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActiveIndex((old) => Math.min(old + 1, Math.max(availableOptions.length - 1, 0)));
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      setOpen(true);
      setActiveIndex((old) => Math.max(old - 1, 0));
      return;
    }

    if (e.key === "Escape") {
      setOpen(false);
      return;
    }

    if (e.key !== "Enter") return;
    e.preventDefault();
    let candidate = availableOptions[activeIndex] || availableOptions[0];
    if (!candidate && query.trim()) {
      const freshOptions = await onSearch?.(query.trim());
      candidate = (freshOptions || [])
        .filter((benh) => !selectedIds.includes(String(benh.id)))
        .find((benh) => matchBenh(benh, query));
    }
    if (candidate) selectBenh(candidate);
  };

  return (
    <div className={paper ? "md:col-span-2 grid grid-cols-1 gap-3" : "grid grid-cols-1 gap-4 xl:grid-cols-2"}>
      <div
        ref={wrapperRef}
        className={paper
          ? "space-y-2"
          : `space-y-2 rounded-lg border p-3 ${error ? "border-red-200 bg-red-50/60" : "border-sky-100 bg-sky-50/50"}`}
        data-field-name="id_benh"
        data-error={error ? "true" : "false"}
      >
        <div className="relative">
          <div className={paper ? "flex min-w-0 items-start gap-2 border-b border-dotted border-slate-300 pb-1" : ""}>
            <div className={paper ? "shrink-0 pt-1 font-semibold" : "mb-1 flex items-center gap-1 text-sm font-semibold text-slate-700"}>
              Mã ICD / bệnh chính <span className="text-red-500">*</span>{paper && ":"}
            </div>
          <input
            ref={inputRef}
            type="search"
            value={query}
            disabled={disabled}
            onChange={handleSearchChange}
            onKeyDown={handleKeyDown}
            onFocus={() => setOpen(true)}
            placeholder="Nhập mã/tên bệnh rồi nhấn Enter..."
            className={paper
              ? "min-h-8 w-full flex-1 border-0 bg-transparent px-1 py-0 text-sm font-semibold text-slate-950 outline-none disabled:text-slate-500"
              : `w-full rounded-md border bg-white px-3 py-2 text-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100 disabled:bg-slate-100 ${
                error ? "border-red-300 ring-2 ring-red-100" : "border-slate-200"
              }`}
          />
          </div>
          {open && !disabled && (
            <div className="absolute z-30 mt-1 max-h-56 w-full overflow-y-auto rounded-md border border-slate-200 bg-white py-1 text-sm shadow-xl">
              {availableOptions.length ? (
                availableOptions.map((benh, index) => (
                  <button
                    key={benh.id}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      selectBenh(benh);
                    }}
                    onMouseEnter={() => setActiveIndex(index)}
                    className={`flex w-full items-start gap-2 px-3 py-2 text-left transition ${
                      index === activeIndex ? "bg-sky-100 text-sky-900" : "hover:bg-sky-50"
                    }`}
                  >
                    <span className="shrink-0 rounded bg-sky-100 px-2 py-0.5 text-xs font-bold text-sky-700">{benh.ma}</span>
                    <span className="min-w-0 text-slate-700">{benh.ten}</span>
                  </button>
                ))
              ) : (
                <div className="px-3 py-2 text-slate-400">Không tìm thấy mã ICD/bệnh phù hợp.</div>
              )}
            </div>
          )}
          {error && <div className="mt-1 text-xs font-semibold text-red-600">{error}</div>}
          <div className="mt-2 flex flex-wrap gap-1.5">
            {selectedDiseases.map((benh, index) => (
              <span
                key={benh.id}
                className={`inline-flex max-w-full items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ring-1 ${
                  index === 0
                    ? "bg-sky-600 text-white ring-sky-500"
                    : "bg-white text-sky-700 ring-sky-100"
                }`}
              >
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{benh.ma} - {benh.ten}</span>
                {!disabled && (
                  <button
                    type="button"
                    onClick={() => removeBenh(benh.id)}
                    className={`ml-1 rounded-full px-1 ${index === 0 ? "hover:bg-white/20" : "hover:bg-sky-50"}`}
                    title="Bỏ mã ICD"
                  >
                    ×
                  </button>
                )}
              </span>
            ))}
          </div>
          <div className="mt-2 text-[11px] font-medium text-slate-500">
            Mã đầu tiên là bệnh chính; nhấn Enter để thêm mã kế tiếp.
          </div>
        </div>
      </div>
      {paper ? (
        <PaperLineField
          label="Bệnh kèm theo"
          name="benh_kem_theo"
          value={form.benh_kem_theo}
          onChange={onChange}
          disabled={disabled}
          multiline
          wide
        />
      ) : (
        <TextArea
          label="Bệnh kèm theo"
          name="benh_kem_theo"
          value={form.benh_kem_theo}
          onChange={onChange}
          disabled={disabled}
          rows={5}
        />
      )}
    </div>
  );
}

function PaperDiagnosisFields(props) {
  return <DiagnosisFields {...props} paper />;
}

function ActionButton({ icon: Icon, label, onClick, disabled, tone = "blue", full, prominent, compact }) {
  const tones = {
    blue: "bg-sky-600 hover:bg-sky-700 text-white",
    green: "bg-emerald-600 hover:bg-emerald-700 text-white",
    amber: "bg-amber-500 hover:bg-amber-600 text-white",
    purple: "bg-purple-600 hover:bg-purple-700 text-white",
    red: "bg-red-600 hover:bg-red-700 text-white",
    orange: "bg-orange-500 hover:bg-orange-600 text-white",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-md font-semibold shadow-sm transition disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-white ${
        tones[tone]
      } ${compact ? "h-9 px-2.5 text-xs" : "px-3 py-2 text-sm"} ${full ? "w-full" : ""} ${prominent && !compact ? "min-h-11 text-base ring-2 ring-emerald-100" : ""} ${prominent && compact ? "ring-2 ring-emerald-100" : ""}`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

function TreatmentOutcomePanel({ selected, form, onChange, examForm, onExamChange, benhOptions, onSearchBenh, disabled, errors = {}, onSign, onCancelSign }) {
  const key = treatmentKey(form.hinhThucDieuTri);
  const isFollowUp = key === "HEN_KHAM";
  const isAdmission = key === "NHAP_VIEN";
  const isTransfer = key === "CHUYEN_VIEN";
  const isNoExam = key === "KHONG_KHAM";
  const paperTitle = isFollowUp
    ? "Giấy hẹn khám lại"
    : isAdmission
      ? "Giấy khám bệnh vào viện"
      : isTransfer
        ? "Giấy chuyển tuyến khám bệnh, chữa bệnh BHYT"
        : isNoExam
          ? "Đóng hồ sơ không khám"
          : "Kết luận cho về";
  const paperTitleText = paperTitle.toLocaleUpperCase("vi-VN").normalize("NFC");
  const signedDoctorName = form.bacSiKy || selected?.bacSi?.hoTen || selected?.bacSi?.ten || "Bác sĩ điều trị";
  const today = new Date().toLocaleDateString("vi-VN");

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-sky-100 bg-white p-3 shadow-sm">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.2fr_0.8fr]">
          <PaperField label="Hướng điều trị" name="hinhThucDieuTri" value={form.hinhThucDieuTri} onChange={onChange} as="select" required error={errors.huong_xu_tri} disabled={disabled}>
            {treatmentOptions.map((item) => <option key={item}>{item}</option>)}
          </PaperField>
          <PaperField label="Kết quả" name="ketQua" value={form.ketQua} onChange={onChange} as="select" required error={errors.ket_qua} disabled={disabled}>
            {treatmentResults.map((item) => <option key={item}>{item}</option>)}
          </PaperField>
        </div>
      </div>

      <div className="rounded-sm border border-slate-300 bg-white p-6 shadow-inner">
        <div className="flex flex-wrap items-start justify-between gap-4 text-sm text-slate-800">
          <div>
            <div className="text-lg font-bold uppercase">Phòng khám đa khoa</div>
            <div className="text-xs text-slate-500">Hệ thống quản lý khám bệnh</div>
            <div className="mt-3">Khoa/phòng: <b>{selected?.phong?.tenPhong || "---"}</b></div>
          </div>
          <div className="text-right text-xs leading-5 text-slate-600">
            <div>Ngày lập: {today}</div>
            <div>Mã BN: {selected?.maBenhNhan || "---"}</div>
            <div>Mã HS: {selected?.maHoSo || "---"}</div>
          </div>
        </div>

        <div className="my-5 border-y border-slate-300 py-3 text-center">
          <div className="text-2xl font-black tracking-wide text-slate-950">{paperTitleText}</div>
        </div>

        <div className="space-y-5 text-sm text-slate-900">
          <div>
            <div className="mb-2 font-bold uppercase">I. Hành chính</div>
            <div className="grid grid-cols-1 gap-x-8 gap-y-2 md:grid-cols-2">
              <PaperInfoLine label="Họ tên" value={selected?.hoTen || "---"} />
              <PaperInfoLine label="Giới tính" value={selected?.gioiTinh || "---"} />
              <PaperInfoLine label="Ngày sinh" value={selected?.ngaySinh || "---"} />
              <PaperInfoLine label="Số điện thoại" value={selected?.soDienThoai || "---"} />
              <div className="md:col-span-2">
                <PaperInfoLine label="Địa chỉ" value={selected?.diaChi || "---"} />
              </div>
            </div>
          </div>

          <div>
            <div className="mb-2 font-bold uppercase">II. Thông tin khám bệnh lần này</div>
            <div className="grid grid-cols-1 gap-x-8 gap-y-2 md:grid-cols-2">
              <PaperInfoLine label="Ngày khám" value={selected?.ngayKham || selected?.thoiGianBatDau || "---"} />
              <PaperInfoLine label="Phòng khám" value={selected?.phong?.tenPhong || "---"} />
              <PaperInfoLine label="Hướng điều trị" value={form.hinhThucDieuTri || "---"} />
              <PaperInfoLine label="Kết quả" value={form.ketQua || "---"} />
            </div>
          </div>

          {!isNoExam && examForm && (
            <div>
              <div className="mb-2 font-bold uppercase">III. Chẩn đoán và kết quả khám</div>
              <div className="grid grid-cols-1 gap-x-8 gap-y-3 md:grid-cols-2">
                <PaperLineField label="Chẩn đoán sơ bộ" name="chan_doan_so_bo" value={examForm.chan_doan_so_bo} onChange={onExamChange} multiline disabled={disabled} wide />
                <PaperLineField label="Kết quả khám" name="ket_qua" value={examForm.ket_qua} onChange={onExamChange} multiline required error={errors.ket_qua} disabled={disabled} wide />
                <PaperLineField label="Chẩn đoán cuối" name="chan_doan_cuoi" value={examForm.chan_doan_cuoi} onChange={onExamChange} multiline required error={errors.chan_doan_cuoi} disabled={disabled} wide />
                <PaperDiagnosisFields
                  form={examForm}
                  onChange={onExamChange}
                  disabled={disabled}
                  benhOptions={benhOptions}
                  error={errors.id_benh}
                  onSearch={onSearchBenh}
                />
                <PaperLineField label="Hướng xử trí" name="huong_xu_tri" value={examForm.huong_xu_tri} onChange={onExamChange} multiline required error={errors.huong_xu_tri} disabled={disabled} wide />
                <PaperLineField label="Ghi chú/mô tả chẩn đoán" name="ghi_chu" value={examForm.ghi_chu} onChange={onExamChange} multiline error={errors.ghi_chu} disabled={disabled} wide />
              </div>
            </div>
          )}

          {isFollowUp && (
            <div>
              <div className="mb-2 font-bold uppercase">IV. Nội dung hẹn khám lại</div>
              <div className="grid grid-cols-1 gap-x-8 gap-y-3 md:grid-cols-2">
                <PaperLineField label="Quá trình bệnh lý" name="lyDoHen" value={form.lyDoHen} onChange={onChange} multiline required error={errors.lyDoHen} disabled={disabled} wide />
                <PaperLineField label="Chẩn đoán/bệnh kèm theo" name="benhKemTheo" value={form.benhKemTheo} onChange={onChange} disabled={disabled} wide />
                <PaperLineField label="Lời dặn" name="loiDan" value={form.loiDan} onChange={onChange} multiline disabled={disabled} wide />
                <PaperLineField label="Hẹn khám vào ngày" name="ngayHen" value={form.ngayHen} onChange={onChange} type="date" min={formatDateInput(new Date())} required error={errors.ngayHen} disabled={disabled} />
                <PaperLineField label="Tại phòng" name="phongHen" value={form.phongHen} onChange={onChange} required error={errors.phongHen} disabled={disabled} />
                {errors.daKy && <div className="md:col-span-2 text-xs font-semibold text-red-600">{errors.daKy}</div>}
              </div>
            </div>
          )}

          {isAdmission && (
            <div>
              <div className="mb-2 font-bold uppercase">IV. Giấy khám bệnh vào viện</div>
              <div className="grid grid-cols-1 gap-x-8 gap-y-3 md:grid-cols-2">
                <PaperLineField label="Lý do vào viện" name="lyDoVaoVien" value={form.lyDoVaoVien} onChange={onChange} multiline required error={errors.lyDoVaoVien} disabled={disabled} wide />
                <PaperLineField label="Cho vào điều trị tại khoa" name="khoaNhapVien" value={form.khoaNhapVien} onChange={onChange} required error={errors.khoaNhapVien} disabled={disabled} wide />
              </div>
            </div>
          )}

          {isTransfer && (
            <div>
              <div className="mb-2 font-bold uppercase">IV. Giấy chuyển tuyến khám bệnh, chữa bệnh BHYT</div>
              <div className="grid grid-cols-1 gap-x-8 gap-y-3 md:grid-cols-2">
                <PaperLineField label="Kính gửi" name="kinhGui" value={form.kinhGui} onChange={onChange} required error={errors.kinhGui} disabled={disabled} wide />
                <PaperLineField label="Dấu hiệu lâm sàng" name="dauHieuLamSang" value={form.dauHieuLamSang} onChange={onChange} multiline required error={errors.dauHieuLamSang} disabled={disabled} wide />
                <PaperLineField label="Lý do chuyển tuyến" name="lyDoChuyenTuyen" value={form.lyDoChuyenTuyen} onChange={onChange} as="select" required error={errors.lyDoChuyenTuyen} disabled={disabled} wide>
                  <option value="">Chọn lý do chuyển tuyến</option>
                  <option>Đủ điều kiện chuyển tuyến</option>
                  <option>Phù hợp yêu cầu chuyên môn kỹ thuật</option>
                  <option>Theo yêu cầu của người bệnh/người đại diện</option>
                </PaperLineField>
                <PaperLineField label="Hướng điều trị" name="huongDieuTriChuyenTuyen" value={form.huongDieuTriChuyenTuyen} onChange={onChange} required error={errors.huongDieuTriChuyenTuyen} disabled={disabled} />
                <PaperLineField label="Phương tiện vận chuyển" name="phuongTienVanChuyen" value={form.phuongTienVanChuyen} onChange={onChange} required error={errors.phuongTienVanChuyen} disabled={disabled} />
              </div>
            </div>
          )}

          {isNoExam && (
            <div>
              <div className="mb-2 font-bold uppercase">III. Lý do không khám/bỏ về</div>
              <PaperLineField label="Lý do không khám/bỏ về" name="lyDoKhongKham" value={form.lyDoKhongKham} onChange={onChange} multiline required error={errors.lyDoKhongKham} disabled={disabled} wide />
            </div>
          )}

          {!isFollowUp && !isAdmission && !isTransfer && (
            <div>
              <div className="mb-2 font-bold uppercase">{isNoExam ? "III. Kết luận khám" : "IV. Kết luận khám"}</div>
              {isNoExam ? (
                <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 font-semibold text-amber-800">
                  NB bỏ về/không khám: lưu kết luận sẽ đóng lượt khám và hủy các chỉ định còn ở trạng thái chờ.
                </div>
              ) : (
                <PaperLineField label="Lời dặn sau khám" name="loiDan" value={form.loiDan} onChange={onChange} multiline required error={errors.loiDan} disabled={disabled} wide />
              )}
            </div>
          )}
        </div>

        <div className="mt-8 grid grid-cols-1 gap-8 text-sm md:grid-cols-2">
          <div>
            <div className="font-bold uppercase">Bác sĩ, y sĩ khám bệnh</div>
            <div className="text-xs text-slate-500">(Ký tên)</div>
            <div className="mt-4 min-h-20 border-t border-dotted border-slate-300 pt-3">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={onSign}
                  disabled={disabled}
                  className={`inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm font-bold shadow-sm transition disabled:bg-slate-300 disabled:text-white ${
                    form.daKy ? "bg-emerald-600 text-white hover:bg-emerald-700" : "bg-violet-600 text-white hover:bg-violet-700"
                  }`}
                >
                  <Pencil className="h-4 w-4" />
                  {form.daKy ? `Đã ký: ${signedDoctorName}` : `Ký giấy ${form.hinhThucDieuTri || "kết luận"}`}
                </button>
                {form.daKy && (
                  <button
                    type="button"
                    onClick={onCancelSign}
                    disabled={disabled}
                    className="inline-flex h-9 items-center gap-2 rounded-md border border-red-200 bg-white px-3 text-sm font-bold text-red-600 shadow-sm transition hover:bg-red-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                  >
                    <X className="h-4 w-4" />
                    Hủy ký
                  </button>
                )}
              </div>
              {errors.daKy && <div className="mt-2 text-xs font-semibold text-red-600">{errors.daKy}</div>}
            </div>
          </div>
          <div className="text-right">
            <div className="font-bold uppercase">Đại diện cơ sở khám bệnh</div>
            <div className="text-xs text-slate-500">(Ký tên, đóng dấu)</div>
            <div className="mt-14 border-t border-dotted border-slate-300 pt-2 text-xs text-slate-400"> </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PaperInfoLine({ label, value }) {
  return (
    <div className="flex min-w-0 gap-2 border-b border-dotted border-slate-300 pb-1">
      <span className="shrink-0 font-semibold">{label}:</span>
      <span className="min-w-0 flex-1 truncate">{value}</span>
    </div>
  );
}

function PaperLineField({ label, name, value, onChange, as, type = "text", multiline, children, required, error, min, disabled, wide }) {
  const inputClass =
    "min-h-8 w-full flex-1 border-0 bg-transparent px-1 py-0 text-sm font-semibold text-slate-950 outline-none disabled:text-slate-500";

  return (
    <div className={wide ? "md:col-span-2" : ""} data-error={error ? "true" : undefined}>
      <div className="flex min-w-0 items-start gap-2 border-b border-dotted border-slate-300 pb-1">
        <span className="shrink-0 pt-1 font-semibold">
          {label}{required && <span className="text-red-500"> *</span>}:
        </span>
        {as === "select" ? (
          <select name={name} value={value} onChange={onChange} disabled={disabled} className={inputClass}>
            {children}
          </select>
        ) : multiline ? (
          <textarea name={name} value={value} onChange={onChange} disabled={disabled} rows={2} className={`${inputClass} resize-none leading-6`} />
        ) : type === "date" ? (
          <DatePickerField name={name} value={value} onChange={onChange} min={min} disabled={disabled} className={inputClass} />
        ) : (
          <input name={name} value={value} onChange={onChange} disabled={disabled} type={type} min={min} className={inputClass} />
        )}
      </div>
      {error && <div className="mt-1 text-xs font-semibold text-red-600">{error}</div>}
    </div>
  );
}

function PaperField({ label, name, value, onChange, as, type = "text", multiline, children, required, error, min, disabled }) {
  const commonClass =
    `mt-1 w-full rounded-md border px-3 py-2 text-sm font-semibold outline-none transition focus:ring-2 disabled:bg-slate-100 disabled:text-slate-500 ${
      error ? "border-red-300 bg-red-50/40 text-slate-800 focus:border-red-400 focus:ring-red-100" : "border-slate-300 bg-white text-slate-800 focus:border-sky-400 focus:ring-sky-100"
    }`;

  return (
    <label className="block">
      <div className="text-xs font-bold uppercase tracking-wide text-slate-500">
        {label} {required && <span className="text-red-500">*</span>}
      </div>
      {as === "select" ? (
        <select name={name} value={value} onChange={onChange} disabled={disabled} className={commonClass}>
          {children}
        </select>
      ) : multiline ? (
        <textarea name={name} value={value} onChange={onChange} disabled={disabled} rows={3} className={`${commonClass} resize-none`} />
      ) : type === "date" ? (
        <DatePickerField name={name} value={value} onChange={onChange} min={min} disabled={disabled} className={commonClass} />
      ) : (
        <input name={name} value={value} onChange={onChange} disabled={disabled} type={type} min={min} className={commonClass} />
      )}
      {error && <div className="mt-1 text-xs font-semibold text-red-600">{error}</div>}
    </label>
  );
}

function parseDateInput(value) {
  if (!value) return null;
  const [year, month, day] = String(value).split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function formatDisplayDate(value) {
  const date = parseDateInput(value);
  if (!date) return "";
  return date.toLocaleDateString("vi-VN");
}

function sameDate(a, b) {
  return a?.getFullYear() === b?.getFullYear() &&
    a?.getMonth() === b?.getMonth() &&
    a?.getDate() === b?.getDate();
}

function DatePickerField({ name, value, onChange, min, disabled, className }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const selectedDate = parseDateInput(value);
  const minDate = parseDateInput(min);
  const [viewDate, setViewDate] = useState(() => selectedDate || minDate || new Date());

  useEffect(() => {
    const current = parseDateInput(value);
    if (current) setViewDate(current);
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const start = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
  const daysInMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
  const leading = start.getDay();
  const cells = [
    ...Array.from({ length: leading }, (_, i) => ({ key: `empty-${i}`, empty: true })),
    ...Array.from({ length: daysInMonth }, (_, i) => {
      const date = new Date(viewDate.getFullYear(), viewDate.getMonth(), i + 1);
      return {
        key: formatDateInput(date),
        date,
        value: formatDateInput(date),
        disabled: minDate && date < minDate,
      };
    }),
  ];

  const chooseDate = (nextValue) => {
    onChange({ target: { name, value: nextValue, type: "date" } });
    setOpen(false);
  };

  const shiftMonth = (amount) => {
    setViewDate((old) => new Date(old.getFullYear(), old.getMonth() + amount, 1));
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((old) => !old)}
        disabled={disabled}
        className={`${className} flex items-center justify-between text-left`}
      >
        <span>{formatDisplayDate(value) || "Chọn ngày"}</span>
        <CalendarDays className="h-4 w-4 text-slate-500" />
      </button>

      {open && (
        <div className="absolute z-40 mt-2 w-[310px] rounded-xl border border-sky-100 bg-white p-3 shadow-2xl ring-1 ring-sky-50 animate-fadeSlide">
          <div className="mb-3 flex items-center justify-between">
            <button type="button" onClick={() => shiftMonth(-1)} className="rounded-md p-2 text-slate-500 transition hover:bg-slate-100 hover:text-sky-700">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="text-sm font-black text-slate-800">
              Tháng {viewDate.getMonth() + 1}/{viewDate.getFullYear()}
            </div>
            <button type="button" onClick={() => shiftMonth(1)} className="rounded-md p-2 text-slate-500 transition hover:bg-slate-100 hover:text-sky-700">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-bold uppercase text-slate-400">
            {["CN", "T2", "T3", "T4", "T5", "T6", "T7"].map((day) => <div key={day}>{day}</div>)}
          </div>

          <div className="mt-2 grid grid-cols-7 gap-1">
            {cells.map((cell) => cell.empty ? (
              <span key={cell.key} className="h-9" />
            ) : (
              <button
                key={cell.key}
                type="button"
                disabled={cell.disabled}
                onClick={() => chooseDate(cell.value)}
                className={`h-9 rounded-lg text-sm font-bold transition disabled:cursor-not-allowed disabled:text-slate-300 ${
                  sameDate(cell.date, selectedDate)
                    ? "bg-sky-600 text-white shadow-sm"
                    : sameDate(cell.date, new Date())
                      ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100"
                      : "text-slate-700 hover:bg-sky-50 hover:text-sky-700"
                }`}
              >
                {cell.date.getDate()}
              </button>
            ))}
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-xs font-semibold">
            <button type="button" onClick={() => chooseDate(formatDateInput(new Date()))} className="text-sky-700 hover:text-sky-900">
              Hôm nay
            </button>
            <button type="button" onClick={() => setOpen(false)} className="text-slate-500 hover:text-slate-700">
              Đóng
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function getDvktTimeValue(dv) {
  return dv?.thoiGianChiDinh || dv?.createdAt || dv?.ngayChiDinh || dv?.thoiGian || dv?.updatedAt || "";
}

function getDvktDateKey(dv) {
  const value = getDvktTimeValue(dv);
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return "unknown";
  return formatDateInput(date);
}

function getDvktDateLabel(dv) {
  const value = getDvktTimeValue(dv);
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return "Chưa rõ ngày";
  return date.toLocaleDateString("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" });
}

function DVKTTable({ dsDVKT, currentLanKhamId, onEdit, onDelete, onPreview, onMarkRead, canEdit = false, canDelete = false, canMarkRead = false }) {
  if (!dsDVKT.length) {
    return (
      <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-400">
        Chưa có chỉ định cận lâm sàng.
      </div>
    );
  }

  const sortedRows = [...dsDVKT].sort((a, b) => {
    const aTime = new Date(getDvktTimeValue(a)).getTime();
    const bTime = new Date(getDvktTimeValue(b)).getTime();
    const safeA = Number.isNaN(aTime) ? 0 : aTime;
    const safeB = Number.isNaN(bTime) ? 0 : bTime;
    return safeB - safeA;
  });
  let lastDateKey = "";

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
      <table className="w-full min-w-[1040px] text-sm">
        <thead className="bg-gradient-to-r from-indigo-50 via-sky-50 to-emerald-50 text-xs uppercase tracking-wide text-slate-600">
          <tr>
            <th className="w-[150px] p-3 text-left">Trạng thái</th>
            <th className="p-3 text-left">Dịch vụ</th>
            <th className="w-[170px] p-3 text-left">Nguồn/phòng</th>
            <th className="w-[70px] p-3 text-center">SL</th>
            <th className="w-[170px] p-3 text-center">Thời gian</th>
            <th className="w-[150px] p-3 text-center">Đọc kết quả</th>
            <th className="p-3 text-left">Ghi chú</th>
            <th className="w-[170px] p-3 text-center">Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {sortedRows.map((dv) => {
            const dateKey = getDvktDateKey(dv);
            const showDateHeader = dateKey !== lastDateKey;
            lastDateKey = dateKey;
            const sourceText = String(dv.idLanKham || "") && String(dv.idLanKham) !== String(currentLanKhamId)
              ? `Từ lượt #${dv.idLanKham}`
              : "Lượt hiện tại";

            return (
            <React.Fragment key={dv.id || `${dateKey}-${dv.maDvkt}-${dv.thoiGianChiDinh}`}>
              {showDateHeader && (
                <tr className="border-t border-slate-200 bg-slate-50/90">
                  <td colSpan={8} className="px-3 py-2 text-xs font-black uppercase tracking-wide text-slate-600">
                    {getDvktDateLabel(dv)}
                  </td>
                </tr>
              )}
              <tr className="border-t border-slate-100 transition hover:bg-sky-50/50">
              <td className="p-3">
                <span className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-semibold ${dvktDisplayClass(dv)}`}>
                  {dvktDisplayLabel(dv)}
                </span>
              </td>
              <td className="p-3">
                <div className="font-semibold text-slate-800">{dv.tenDvkt}</div>
                <div className="text-xs text-slate-500">
                  Mã: {dv.maDvkt} {dv.loaiKetQua ? `· ${dv.loaiKetQua}` : ""}
                </div>
              </td>
              <td className="p-3 text-xs text-slate-600">
                <div className="font-semibold text-slate-700">{dv.phongThucHien || dv.phongChiDinh || "---"}</div>
                <div>{sourceText}</div>
              </td>
              <td className="p-3 text-center">{dv.soLuong}</td>
              <td className="p-3 text-center text-xs text-slate-500">
                {dv.thoiGianChiDinh ? new Date(dv.thoiGianChiDinh).toLocaleString("vi-VN") : "--"}
              </td>
              <td className="p-3 text-center">
                {(dv.hasResult || isPrintableClsStatus(dv.trangThai)) ? (
                  dv.bacSiDaDocKetQua ? (
                    <span className="inline-flex whitespace-nowrap rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                      Đã đọc
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onMarkRead?.(dv)}
                      disabled={!canMarkRead}
                      className="inline-flex h-8 items-center justify-center rounded-md border border-indigo-200 bg-indigo-50 px-2 text-xs font-bold text-indigo-700 transition hover:bg-indigo-100"
                    >
                      Đã đọc kết quả
                    </button>
                  )
                ) : (
                  <span className="text-xs text-slate-400">---</span>
                )}
              </td>
              <td className="p-3 text-slate-600">{dv.ghiChu || "---"}</td>
              <td className="p-3">
                <div className="grid min-w-[148px] grid-cols-3 justify-items-center gap-1.5">
                  <button type="button" onClick={() => onEdit(dv)} disabled={!canEdit || dv.canEdit === false} className="inline-flex h-8 w-8 items-center justify-center rounded-md text-orange-600 transition hover:bg-orange-50 disabled:text-slate-300 disabled:hover:bg-transparent" title={!canEdit ? "Chỉ có quyền xem" : dv.canEdit === false ? "Không sửa được chỉ định đã thanh toán/có kết quả" : "Sửa chỉ định"}>
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={() => onDelete(dv)} disabled={!canDelete || dv.canDelete === false} className="inline-flex h-8 w-8 items-center justify-center rounded-md text-red-600 transition hover:bg-red-50 disabled:text-slate-300 disabled:hover:bg-transparent" title={!canDelete ? "Chưa có quyền hủy" : dv.canDelete === false ? "Không hủy trực tiếp chỉ định đã thanh toán/có kết quả" : "Hủy chỉ định"}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                  {(dv.canPreview || dv.hasResult || isPrintableClsStatus(dv.trangThai)) && (
                    <button
                      type="button"
                      onClick={() => onPreview?.(dv)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md text-sky-600 transition hover:bg-sky-50"
                      title="Xem kết quả"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  )}
                  {!(dv.canPreview || dv.hasResult || isPrintableClsStatus(dv.trangThai)) && (
                    <span className="h-8 w-8" aria-hidden="true" />
                  )}
                </div>
              </td>
              </tr>
            </React.Fragment>
            );
          })}
        </tbody>
      </table>
      </div>
    </div>
  );
}

function printPdfUrl(url) {
  if (!url) return Promise.reject(new Error("Không có file PDF để in."));

  return new Promise((resolve, reject) => {
    const iframe = document.createElement("iframe");
    let settled = false;
    let fallbackTimer = null;

    const finish = () => {
      if (settled) return;
      settled = true;
      if (fallbackTimer) window.clearTimeout(fallbackTimer);
      window.setTimeout(() => {
        iframe.remove();
        resolve();
      }, 500);
    };

    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "1px";
    iframe.style.height = "1px";
    iframe.style.opacity = "0";
    iframe.style.pointerEvents = "none";
    iframe.onload = () => {
      window.setTimeout(() => {
        try {
          const printWindow = iframe.contentWindow;
          if (!printWindow) throw new Error("Trình duyệt không mở được khung in.");
          printWindow.focus();
          printWindow.onafterprint = finish;
          printWindow.addEventListener?.("afterprint", finish, { once: true });
          printWindow.print();
          fallbackTimer = window.setTimeout(finish, 5 * 60 * 1000);
        } catch (err) {
          if (fallbackTimer) window.clearTimeout(fallbackTimer);
          iframe.remove();
          reject(err);
        }
      }, 250);
    };
    iframe.onerror = () => {
      if (fallbackTimer) window.clearTimeout(fallbackTimer);
      iframe.remove();
      reject(new Error("Không tải được file PDF để in."));
    };

    document.body.appendChild(iframe);
    iframe.src = url;
  });
}

async function mergePdfDocuments(documents) {
  const { PDFDocument } = await import("pdf-lib");
  const merged = await PDFDocument.create();

  for (const doc of documents) {
    const bytes = await doc.blob.arrayBuffer();
    const source = await PDFDocument.load(bytes, { ignoreEncryption: true });
    const pages = await merged.copyPages(source, source.getPageIndices());
    pages.forEach((page) => merged.addPage(page));
  }

  const mergedBytes = await merged.save();
  return new Blob([mergedBytes], { type: "application/pdf" });
}

async function printPdfBlob(blob) {
  const url = URL.createObjectURL(blob);
  try {
    await printPdfUrl(url);
  } finally {
    window.setTimeout(() => URL.revokeObjectURL(url), 2000);
  }
}

function PrintCenterModal({ documents = [], onPreview, onPrint, onPrintAll, printAllLoading, onClose }) {
  const readyCount = documents.filter((doc) => doc.status === "ready").length;
  const missingCount = documents.filter((doc) => doc.status === "missing").length;
  const grouped = documents.reduce((acc, doc) => {
    const key = doc.group || "Khác";
    if (!acc[key]) acc[key] = [];
    acc[key].push(doc);
    return acc;
  }, {});

  const badgeClass = (status) => {
    if (status === "ready") return "border-emerald-200 bg-emerald-50 text-emerald-700";
    if (status === "missing") return "border-amber-200 bg-amber-50 text-amber-700";
    return "border-slate-200 bg-slate-100 text-slate-500";
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-4 backdrop-blur-sm animate-fadeIn">
      <div className="flex h-[90vh] w-[min(98vw,108rem)] flex-col overflow-hidden rounded-xl border border-purple-100 bg-white shadow-2xl animate-fadeSlide">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-gradient-to-r from-purple-50 via-sky-50 to-emerald-50 px-4 py-3">
          <div className="min-w-0">
            <div className="text-xs font-semibold uppercase tracking-wide text-purple-600">Trung tâm in giấy tờ khám bệnh</div>
            <div className="text-lg font-black text-slate-950">Chọn giấy tờ để xem trước hoặc in toàn bộ giấy hợp lệ</div>
            <div className="mt-1 text-xs font-semibold text-slate-500">
              {readyCount} sẵn sàng · {missingCount} thiếu dữ liệu · giấy không áp dụng sẽ không được in.
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <ActionButton icon={Printer} label={printAllLoading ? "Đang tải..." : "In tất cả hợp lệ"} onClick={onPrintAll} disabled={!readyCount || printAllLoading} tone="purple" />
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 transition hover:border-red-200 hover:text-red-600"
              title="Đóng"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50 p-4">
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2 2xl:grid-cols-3">
            {Object.entries(grouped).map(([group, items]) => (
              <section key={group} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-200 bg-gradient-to-r from-slate-100 via-sky-50 to-emerald-50 px-4 py-3">
                  <div className="text-sm font-black uppercase tracking-wide text-slate-800">{group}</div>
                </div>
                <div className="divide-y divide-slate-100">
                  {items.map((doc) => (
                    <div key={doc.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="font-bold text-slate-950">{doc.title}</div>
                          <span className={`rounded-full border px-2 py-0.5 text-[11px] font-black ${badgeClass(doc.status)}`}>
                            {doc.badge}
                          </span>
                        </div>
                        <div className="mt-0.5 text-xs font-medium text-slate-500">{doc.description}</div>
                        {doc.status === "missing" && doc.reason && (
                          <div className="mt-1 text-xs font-semibold text-amber-700">{doc.reason}</div>
                        )}
                        {doc.status === "na" && doc.reason && (
                          <div className="mt-1 text-xs font-semibold text-slate-500">{doc.reason}</div>
                        )}
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onPreview(doc)}
                          disabled={doc.status !== "ready" || typeof doc.getBlob !== "function"}
                          className="inline-flex h-9 items-center gap-2 rounded-md border border-sky-200 bg-white px-3 text-sm font-bold text-sky-700 transition hover:bg-sky-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                        >
                          <Eye className="h-4 w-4" />
                          Xem
                        </button>
                        <button
                          type="button"
                          onClick={() => onPrint(doc)}
                          disabled={doc.status !== "ready" || typeof doc.getBlob !== "function"}
                          className="inline-flex h-9 items-center gap-2 rounded-md bg-purple-600 px-3 text-sm font-bold text-white shadow-sm transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-white"
                        >
                          <Printer className="h-4 w-4" />
                          In
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function PrintBatchPreviewModal({ batch, onClose }) {
  const [items, setItems] = useState([]);
  const [activeId, setActiveId] = useState("");
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    const urls = (batch?.documents || []).map((doc, index) => ({
      ...doc,
      url: URL.createObjectURL(doc.blob),
      id: doc.id || `paper-${index}`,
    }));
    setItems(urls);
    setActiveId(urls[0]?.id || "");

    return () => {
      urls.forEach((doc) => URL.revokeObjectURL(doc.url));
    };
  }, [batch]);

  const active = items.find((doc) => doc.id === activeId) || items[0];

  const printOne = async (doc) => {
    if (!doc?.url) return;
    setPrinting(true);
    try {
      await printPdfUrl(doc.url);
      toast.success(`Đã gửi ${doc.title} sang máy in.`);
    } catch (err) {
      toast.error(err?.message || `Không thể in ${doc.title}.`);
    } finally {
      setPrinting(false);
    }
  };

  const printAll = async () => {
    if (!items.length || printing) return;
    setPrinting(true);
    try {
      toast.info(`Đang gộp ${items.length} giấy tờ để in một lần...`);
      const mergedBlob = await mergePdfDocuments(items);
      await printPdfBlob(mergedBlob);
      toast.success(`Đã gửi ${items.length} giấy tờ hợp lệ sang máy in.`);
    } catch (err) {
      console.error("print batch failed:", err);
      toast.error(err?.message || "Không thể in tất cả giấy tờ.");
    } finally {
      setPrinting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/65 px-4 backdrop-blur-sm animate-fadeIn">
      <div className="flex h-[92vh] w-[min(98vw,112rem)] flex-col overflow-hidden rounded-xl border border-purple-100 bg-white shadow-2xl animate-fadeSlide">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-gradient-to-r from-purple-50 via-sky-50 to-emerald-50 px-4 py-3">
          <div className="min-w-0">
            <div className="text-xs font-semibold uppercase tracking-wide text-purple-600">Xem giấy tờ hợp lệ</div>
            <div className="text-lg font-black text-slate-950">{items.length} giấy tờ đã sẵn sàng trong trang hiện tại</div>
            {!!batch?.missing?.length && (
              <div className="mt-1 max-w-5xl truncate text-xs font-semibold text-amber-700">
                Chưa in: {batch.missing.join("; ")}
              </div>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <ActionButton icon={Printer} label={printing ? "Đang in..." : "In tất cả"} onClick={printAll} disabled={!items.length || printing} tone="purple" />
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 transition hover:border-red-200 hover:text-red-600"
              title="Đóng"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 bg-slate-100 lg:grid-cols-[320px_1fr]">
          <aside className="min-h-0 overflow-y-auto border-r border-slate-200 bg-white p-3">
            <div className="space-y-2">
              {items.map((doc, index) => (
                <div
                  key={doc.id}
                  className={`w-full rounded-lg border px-3 py-3 text-left transition ${
                    active?.id === doc.id
                      ? "border-purple-300 bg-purple-50 text-purple-900 shadow-sm"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <button type="button" onClick={() => setActiveId(doc.id)} className="w-full text-left">
                    <div className="text-xs font-black uppercase text-slate-400">Giấy {index + 1}</div>
                    <div className="mt-1 font-bold">{doc.title}</div>
                    {doc.group && <div className="mt-0.5 text-xs font-semibold text-slate-500">{doc.group}</div>}
                  </button>
                  <button
                    type="button"
                    onClick={() => printOne(doc)}
                    disabled={printing}
                    className="mt-3 inline-flex h-8 w-full items-center justify-center gap-2 rounded-md bg-purple-600 px-3 text-xs font-bold text-white shadow-sm transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    <Printer className="h-4 w-4" />
                    In giấy này
                  </button>
                </div>
              ))}
            </div>
          </aside>

          <main className="flex min-h-0 flex-col p-3">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
              <div className="min-w-0 truncate text-sm font-bold text-slate-900">{active?.title || "Giấy tờ"}</div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => printOne(active)}
                  disabled={!active?.url || printing}
                  className="inline-flex h-9 items-center gap-2 rounded-md bg-purple-600 px-3 text-sm font-semibold text-white shadow-sm transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  <Printer className="h-4 w-4" />
                  In giấy này
                </button>
                <a
                  href={active?.url || undefined}
                  download={`${active?.id || "GIAY_TO"}.pdf`}
                  className={`inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm font-semibold text-white shadow-sm transition ${
                    active?.url ? "bg-sky-600 hover:bg-sky-700" : "pointer-events-none bg-slate-300"
                  }`}
                >
                  <Download className="h-4 w-4" />
                  Tải xuống
                </a>
              </div>
            </div>

            {active?.url ? (
              <iframe
                title={`PDF ${active.title}`}
                src={active.url}
                className="min-h-0 flex-1 rounded-lg border border-slate-200 bg-white"
              />
            ) : (
              <div className="flex min-h-0 flex-1 items-center justify-center rounded-lg border border-slate-200 bg-white text-sm font-semibold text-slate-500">
                Không có giấy tờ để xem.
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

function GenericPdfPreviewModal({ documentItem, onClose }) {
  const [blobUrl, setBlobUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const printPreview = () => {
    if (!blobUrl) return;
    window.open(blobUrl, "_blank", "noopener");
  };

  useEffect(() => {
    let url = "";
    let alive = true;

    setLoading(true);
    setError("");
    setBlobUrl("");

    Promise.resolve(documentItem.getBlob())
      .then((blob) => {
        if (!alive) return;
        const pdfBlob = blob?.type === "application/pdf" ? blob : new Blob([blob], { type: "application/pdf" });
        url = URL.createObjectURL(pdfBlob);
        setBlobUrl(url);
      })
      .catch((err) => {
        if (alive) setError(err?.message || "Không tải được file PDF.");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [documentItem]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 px-4 backdrop-blur-sm animate-fadeIn">
      <div className="flex h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-xl border border-sky-100 bg-white shadow-2xl animate-fadeSlide">
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-gradient-to-r from-sky-50 via-indigo-50 to-emerald-50 px-4 py-3">
          <div className="min-w-0">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Xem trước giấy tờ</div>
            <div className="truncate text-base font-bold text-slate-900">{documentItem.title}</div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={printPreview}
              disabled={!blobUrl}
              className="inline-flex h-9 items-center gap-2 rounded-md bg-purple-600 px-3 text-sm font-semibold text-white shadow-sm transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              <Printer className="h-4 w-4" />
              In
            </button>
            <a
              href={blobUrl || undefined}
              download={`${documentItem.id || "GIAY_TO"}.pdf`}
              className={`inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm font-semibold text-white shadow-sm transition ${
                blobUrl ? "bg-sky-600 hover:bg-sky-700" : "pointer-events-none bg-slate-300"
              }`}
            >
              <Download className="h-4 w-4" />
              Tải xuống
            </a>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 transition hover:border-red-200 hover:text-red-600"
              title="Đóng"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 bg-slate-100 p-3">
          {loading ? (
            <div className="flex h-full items-center justify-center rounded-lg border border-slate-200 bg-white text-sm font-semibold text-slate-500">
              Đang tải PDF để xem trực tiếp...
            </div>
          ) : error ? (
            <div className="flex h-full items-center justify-center rounded-lg border border-red-100 bg-red-50 p-6 text-center text-sm font-semibold text-red-600">
              {error}
            </div>
          ) : (
            <iframe
              title={`PDF ${documentItem.title}`}
              src={blobUrl}
              className="h-full w-full rounded-lg border border-slate-200 bg-white"
            />
          )}
        </div>
      </div>
    </div>
  );
}

function PdfPreviewModal({ preview, onClose }) {
  const [blobUrl, setBlobUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const printPreview = () => {
    if (!blobUrl) return;
    window.open(blobUrl, "_blank", "noopener");
  };

  useEffect(() => {
    let url = "";
    let alive = true;

    setLoading(true);
    setError("");
    setBlobUrl("");

    exportPdfDVKT(preview.id)
      .then((blob) => {
        if (!alive) return;
        const pdfBlob = blob?.type === "application/pdf" ? blob : new Blob([blob], { type: "application/pdf" });
        url = URL.createObjectURL(pdfBlob);
        setBlobUrl(url);
      })
      .catch((err) => {
        if (alive) setError(err?.message || "Không tải được file PDF kết quả.");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [preview.id]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-4 backdrop-blur-sm animate-fadeIn">
      <div className="flex h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-sky-100 bg-white shadow-2xl animate-fadeSlide">
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-gradient-to-r from-sky-50 via-indigo-50 to-emerald-50 px-4 py-3">
          <div className="min-w-0">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Kết quả cận lâm sàng</div>
            <div className="truncate text-base font-bold text-slate-900">{preview.title}</div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={printPreview}
              disabled={!blobUrl}
              className="inline-flex h-9 items-center gap-2 rounded-md bg-purple-600 px-3 text-sm font-semibold text-white shadow-sm transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              <Printer className="h-4 w-4" />
              In
            </button>
            <a
              href={blobUrl || undefined}
              download={`KET_QUA_CLS_${preview.id}.pdf`}
              className={`inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm font-semibold text-white shadow-sm transition ${
                blobUrl ? "bg-sky-600 hover:bg-sky-700" : "pointer-events-none bg-slate-300"
              }`}
            >
              <Download className="h-4 w-4" />
              Tải xuống
            </a>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 transition hover:border-red-200 hover:text-red-600"
              title="Đóng"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 bg-slate-100 p-3">
          {loading ? (
            <div className="flex h-full items-center justify-center rounded-lg border border-slate-200 bg-white text-sm font-semibold text-slate-500">
              Đang tải PDF để xem trực tiếp...
            </div>
          ) : error ? (
            <div className="flex h-full items-center justify-center rounded-lg border border-red-100 bg-red-50 p-6 text-center text-sm font-semibold text-red-600">
              {error}
            </div>
          ) : (
            <iframe
              title={`PDF ${preview.title}`}
              src={blobUrl}
              className="h-full w-full rounded-lg border border-slate-200 bg-white"
            />
          )}
        </div>
      </div>
    </div>
  );
}

function PrescriptionClinicalSummary({ selected, tongHop }) {
  const rooms = tongHop?.rooms || tongHop?.Rooms || [];
  const currentDiagnosis =
    selected?.benh?.ma && selected?.benh?.ten
      ? `${selected.benh.ma} - ${selected.benh.ten}`
      : selected?.chanDoanCuoi || selected?.chanDoanSoBo || "---";
  const comorbid =
    (selected?.benhKemTheoList || [])
      .map((b) => `${b.ma || b.Ma || ""} ${b.ten || b.Ten || ""}`.trim())
      .filter(Boolean)
      .join("; ") || selected?.benhKemTheo || "---";

  return (
    <div className="rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 via-white to-emerald-50 p-4 shadow-sm">
      <div className="grid gap-3 md:grid-cols-4">
        <div>
          <div className="text-xs font-bold uppercase text-slate-500">Chẩn đoán cuối</div>
          <div className="mt-1 font-semibold text-slate-900">{currentDiagnosis}</div>
        </div>
        <div>
          <div className="text-xs font-bold uppercase text-slate-500">Bệnh kèm theo</div>
          <div className="mt-1 font-semibold text-slate-900">{comorbid}</div>
        </div>
        <div>
          <div className="text-xs font-bold uppercase text-slate-500">Đơn trong hồ sơ/ngày</div>
          <div className="mt-1 font-semibold text-emerald-700">
            {tongHop?.totalPrescriptions ?? tongHop?.TotalPrescriptions ?? 0}/{tongHop?.totalRooms ?? tongHop?.TotalRooms ?? rooms.length} phòng
          </div>
        </div>
        <div>
          <div className="text-xs font-bold uppercase text-slate-500">Trạng thái in đơn tổng</div>
          <div className={`mt-1 font-semibold ${tongHop?.canPrintTongHop === false ? "text-amber-700" : "text-emerald-700"}`}>
            {tongHop?.canPrintTongHop === false ? "Còn phòng chưa kết luận" : "Sẵn sàng"}
          </div>
        </div>
      </div>
    </div>
  );
}

function DonTongHopMini({ tongHop }) {
  const rooms = tongHop?.rooms || tongHop?.Rooms || [];
  if (!rooms.length) return null;

  return (
    <div className="overflow-hidden rounded-lg border border-emerald-100 bg-white">
      <div className="border-b border-emerald-100 bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-800">
        Đơn tổng theo phòng/bác sĩ
      </div>
      <div className="divide-y divide-slate-100">
        {rooms.map((room) => {
          const phong = room.phong || room.Phong || {};
          const bacSi = room.bacSi || room.BacSi || room.donThuoc?.bacSi || room.DonThuoc?.BacSi || {};
          const don = room.donThuoc || room.DonThuoc;
          const groups = room.nhomThuoc || room.NhomThuoc || [];
          const paper = room.giayKetLuan || room.GiayKetLuan || {};
          return (
            <div key={room.idLanKham || room.IdLanKham} className="grid gap-3 px-4 py-3 md:grid-cols-[220px_1fr_220px]">
              <div>
                <div className="font-bold text-slate-900">{phong.tenPhong || phong.TenPhong || `Lượt khám #${room.idLanKham || room.IdLanKham}`}</div>
                <div className="text-xs text-slate-500">BS: {bacSi.hoTen || bacSi.HoTen || "---"}</div>
              </div>
              <div className="text-sm text-slate-700">
                {don ? (
                  <div className="flex flex-wrap gap-2">
                    {groups.map((g) => (
                      <span key={g.loaiThuoc || g.LoaiThuoc} className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
                        {g.loaiThuoc || g.LoaiThuoc}: {g.soDong || g.SoDong} thuốc
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-500">Không kê thuốc</span>
                )}
                {(don?.ghiChu || don?.GhiChu || paper.loiDan || paper.LoiDan) && (
                  <div className="mt-2 text-xs text-slate-500">Lời dặn: {don?.ghiChu || don?.GhiChu || paper.loiDan || paper.LoiDan}</div>
                )}
              </div>
              <div className="text-xs text-slate-500">
                Hẹn khám: {paper.ngayHen || paper.NgayHen ? new Date(paper.ngayHen || paper.NgayHen).toLocaleDateString("vi-VN") : "---"}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DonThuoc({ donThuoc, tongHop, onEditThuoc, onDeleteThuoc, canEdit = false, canDelete = false }) {
  if (!donThuoc) {
    return (
      <div className="space-y-3">
        <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-400">
          Chưa có đơn thuốc.
        </div>
        <DonTongHopMini tongHop={tongHop} />
      </div>
    );
  }

  return (
    <div className="space-y-3">
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3 text-sm">
        <div className="font-bold text-slate-800">
          Ngày kê: {donThuoc.ngayKe ? new Date(donThuoc.ngayKe).toLocaleString("vi-VN") : "---"}
        </div>
        <div className="text-slate-500">Số ngày uống: {donThuoc.soNgayUong || "---"}</div>
        <div className="text-slate-500">Ghi chú: {donThuoc.ghiChu || "---"}</div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-white text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="p-3 text-left">Thuốc</th>
              <th className="p-3 text-center">SL</th>
              <th className="p-3 text-center">Đơn vị</th>
              <th className="p-3 text-center">Sáng</th>
              <th className="p-3 text-center">Trưa</th>
              <th className="p-3 text-center">Chiều</th>
              <th className="p-3 text-center">Tối</th>
              <th className="p-3 text-left">Ghi chú</th>
              <th className="p-3 text-center">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {donThuoc.chiTiet?.map((t) => (
              <tr key={t.id} className="border-t border-slate-100 hover:bg-sky-50/50">
                <td className="p-3">
                  <div className="font-semibold text-slate-800">{t.tenThuoc}</div>
                  <div className="text-xs text-slate-500">ID thuốc: {t.idThuoc}</div>
                </td>
                <td className="p-3 text-center">{t.soLuong}</td>
                <td className="p-3 text-center">{t.donVi}</td>
                <td className="p-3 text-center">{t.sang}</td>
                <td className="p-3 text-center">{t.trua}</td>
                <td className="p-3 text-center">{t.chieu}</td>
                <td className="p-3 text-center">{t.toi}</td>
                <td className="p-3 text-slate-600">{t.ghiChu || "---"}</td>
                <td className="p-3">
                  <div className="flex items-center justify-center gap-2">
                    <button type="button" disabled={!canEdit || t.daThanhToan || t.canEdit === false} className="rounded p-1.5 text-sky-600 hover:bg-sky-50 disabled:cursor-not-allowed disabled:text-slate-300" onClick={() => onEditThuoc(t)} title={!canEdit ? "Chỉ có quyền xem" : t.daThanhToan ? "Thuốc đã thanh toán, không thể sửa" : "Sửa thuốc"}>
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button type="button" disabled={!canDelete || t.daThanhToan || t.canEdit === false} className="rounded p-1.5 text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:text-slate-300" onClick={() => onDeleteThuoc(t)} title={!canDelete ? "Chưa có quyền xóa" : t.daThanhToan ? "Thuốc đã thanh toán, không thể xóa" : "Xóa thuốc"}>
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="border-t border-slate-100 px-4 py-2 text-xs text-slate-500">
        <FileText className="mr-1 inline h-3.5 w-3.5" />
        Đơn thuốc hiển thị theo lượt khám hiện tại.
      </div>
    </div>
    <DonTongHopMini tongHop={tongHop} />
    </div>
  );
}
