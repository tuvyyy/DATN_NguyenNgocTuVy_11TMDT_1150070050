import {
  createPatient,
  createRecord,
  checkPatient,
  getReceptionList,
  getCancelledList,
  getStats,
} from "../api/TiepDonApi";

const STATUS = {
  NEW_PATIENT_CREATED: "NEW_PATIENT_CREATED",
  NEED_CREATE_RECORD: "NEED_CREATE_RECORD",
  NEED_ORDER: "NEED_ORDER",
  ORDERED_WAITING_DOCTOR: "ORDERED_WAITING_DOCTOR",
  EXAM_DONE_OR_CLOSED: "EXAM_DONE_OR_CLOSED",
};

const getCurrentUserId = () => {
  try {
    const raw = localStorage.getItem("userInfo");
    if (!raw) return 0;
    const user = JSON.parse(raw);
    return Number(user?.userId) || 0;
  } catch {
    return 0;
  }
};

const toInputDate = (value) => {
  if (!value) return "";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
};

const normalizeInputDateForApi = (value) => {
  const raw = toNullableString(value);
  if (!raw) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) {
    const [dd, mm, yyyy] = raw.split("/");
    return `${yyyy}-${mm}-${dd}`;
  }

  const normalized = toInputDate(raw);
  return normalized || null;
};

const toNullableString = (value) => {
  const trimmed = (value ?? "").toString().trim();
  return trimmed.length ? trimmed : null;
};

const toNumberOrNull = (value) => {
  if (value === "" || value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

const normalizeApiMessage = (res, fallback) => {
  if (!res) return fallback;
  if (typeof res.data === "string") return res.data;
  if (res.data?.errors && typeof res.data.errors === "object") {
    const firstErrorGroup = Object.values(res.data.errors).find((group) => Array.isArray(group) && group.length);
    if (Array.isArray(firstErrorGroup) && firstErrorGroup[0]) return firstErrorGroup[0];
  }
  if (res.data?.title) return res.data.title;
  return res.data?.message || fallback;
};

const normalizeLookupPatient = (patient) => {
  if (!patient) return null;
  return {
    idBenhNhan: patient.id,
    maBn: patient.maBn || "",
    hoTen: patient.hoTen || "",
    ngaySinh: toInputDate(patient.ngaySinh),
    gioiTinh: patient.gioiTinh || "",
    cccd: patient.cccd || "",
    soDienThoai: patient.soDienThoai || "",
    email: patient.email || "",
    ngheNghiep: patient.ngheNghiep || "",
    diaChiDuong: patient.diaChiDuong || "",
    diaChiXa: patient.diaChiXa || "",
    diaChiHuyen: patient.diaChiHuyen || "",
    diaChiTinh: patient.diaChiTinh || "",
    quocTich: patient.quocTich || "",
    danToc: patient.danToc || "",
    quocGia: patient.quocGia || "",
  };
};

const buildPatientInfoFromForm = (form, source = {}) => ({
  idBenhNhan: source.idBenhNhan || source.IdBenhNhan || 0,
  idHoSo: source.idHoSo || source.IdHoSo || 0,
  idLanKham: source.idLanKham || source.IdLanKham || 0,
  maBn: source.maBn || source.MaBn || form.ma_bn || "",
  maHs: source.maHs || source.MaHs || "",
  hoTen: form.ho_ten || "",
  gioiTinh: form.gio_tinh || "",
  ngaySinh: form.ngay_sinh || "",
  soDienThoai: form.so_dien_thoai || "",
  diaChi: form.dia_chi_duong || "",
  email: form.email || "",
});

const buildPatientInfoFromServer = (data = {}) => {
  const hoSo = data?.hoSo || {};
  const benhNhan = data?.benhNhan || {};

  const pick = (obj, keyA, keyB, keyC) => obj?.[keyA] ?? obj?.[keyB] ?? obj?.[keyC] ?? null;

  return {
    idBenhNhan: pick(benhNhan, "IdBenhNhan", "idBenhNhan", "id"),
    idHoSo: pick(hoSo, "IdHoSo", "idHoSo", "id"),
    idLanKham: pick(data, "IdLanKham", "idLanKham", "idLanKhamMoi") || 0,
    maBn: pick(benhNhan, "MaBn", "maBn", "maBN") || "",
    maHs: pick(hoSo, "MaHs", "maHs", "maHS") || "",
    hoTen: pick(benhNhan, "HoTen", "hoTen", "tenBenhNhan") || "",
    gioiTinh: pick(benhNhan, "GioiTinh", "gioiTinh", "gender") || "",
    ngaySinh: toInputDate(pick(benhNhan, "NgaySinh", "ngaySinh", "dob")),
    soDienThoai: pick(benhNhan, "SoDienThoai", "soDienThoai", "phone") || "",
    diaChi: pick(benhNhan, "DiaChiDuong", "diaChiDuong", "diaChi") || "",
    email: pick(benhNhan, "Email", "email", "mail") || "",
  };
};

const validateReceptionForm = (form) => {
  if (!toNullableString(form?.ho_ten)) {
    return "Vui l�ng nh?p h? t�n b?nh nh�n.";
  }

  if (!toNullableString(form?.cccd) && !toNullableString(form?.so_dien_thoai)) {
    return "C?n nh?p �t nh?t CCCD ho?c s? di?n tho?i.";
  }

  if (form?.ngay_sinh) {
    const dob = new Date(form.ngay_sinh);
    if (Number.isNaN(dob.getTime())) return "Ng�y sinh kh�ng h?p l?.";
    if (dob > new Date()) return "Ng�y sinh kh�ng du?c l?n hon h�m nay.";
  }

  return "";
};

const buildPatientPayload = (form) => ({
  Ho_ten: toNullableString(form.ho_ten),
  Ngay_sinh: normalizeInputDateForApi(form.ngay_sinh),
  Gioi_tinh: toNullableString(form.gio_tinh),
  CCCD: toNullableString(form.cccd),
  So_dien_thoai: toNullableString(form.so_dien_thoai),
  Email: toNullableString(form.email),
  Quoc_tich: toNullableString(form.quoc_tich),
  Dan_toc: toNullableString(form.dan_toc),
  Nghe_nghiep: toNullableString(form.nghe_nghiep),
  Dia_chi_duong: toNullableString(form.dia_chi_duong),
  Dia_chi_xa: toNullableString(form.dia_chi_xa),
  Dia_chi_huyen: toNullableString(form.dia_chi_huyen),
  Dia_chi_tinh: toNullableString(form.dia_chi_tinh),
  Quoc_gia: toNullableString(form.quoc_gia) || "Vi?t Nam",
});

const buildSinhHieuPayload = (sinhHieu = {}) => {
  const canNang = toNumberOrNull(sinhHieu.canNang);
  const chieuCao = toNumberOrNull(sinhHieu.chieuCao);
  const heightInMeter = chieuCao ? chieuCao / 100 : null;

  const autoBmi =
    canNang && heightInMeter
      ? Number((canNang / (heightInMeter * heightInMeter)).toFixed(2))
      : null;

  return {
    NhietDo: toNumberOrNull(sinhHieu.nhietDo),
    HuyetApTamThu: toNumberOrNull(sinhHieu.huyetApTamThu),
    HuyetApTamTruong: toNumberOrNull(sinhHieu.huyetApTamTruong),
    NhipTim: toNumberOrNull(sinhHieu.nhipTim),
    NhipTho: toNumberOrNull(sinhHieu.nhipTho),
    SpO2: toNumberOrNull(sinhHieu.spo2),
    CanNang: canNang,
    ChieuCao: chieuCao,
    Bmi: toNumberOrNull(sinhHieu.bmi) || autoBmi,
  };
};

export async function handleTiepDonSave(form, onNext) {
  const validationError = validateReceptionForm(form);
  if (validationError) {
    return { ok: false, type: "error", message: validationError };
  }

  const patientPayload = buildPatientPayload(form);
  const sinhHieuPayload = buildSinhHieuPayload(form?.sinhHieu || {});

  try {
    const patientRes = await createPatient(patientPayload);
    if (!patientRes) {
      return {
        ok: false,
        type: "error",
        message: "Kh�ng th? k?t n?i API ti?p d�n.",
      };
    }

    if (patientRes.status >= 400) {
      return {
        ok: false,
        type: "error",
        message: normalizeApiMessage(patientRes, "Kh�ng t?o du?c b?nh nh�n."),
      };
    }

    const data = patientRes.data || {};
    const state = data.state;

    if (state === STATUS.NEED_ORDER) {
      const info = buildPatientInfoFromServer(data);
      if (onNext) onNext(info, STATUS.NEED_ORDER);
      return {
        ok: true,
        type: "warning",
        state,
        message:
          data.message ||
          "B?nh nh�n d� c� h? so h�m nay, c?n chuy?n sang bu?c ch? d?nh.",
        patientInfo: info,
      };
    }

    if (state === STATUS.ORDERED_WAITING_DOCTOR) {
      const info = buildPatientInfoFromServer(data);
      return {
        ok: true,
        type: "warning",
        state,
        message:
          data.message ||
          "B?nh nh�n d� du?c ch? d?nh v� dang ch? b�c si kh�m.",
        patientInfo: info,
      };
    }

    if (state === STATUS.EXAM_DONE_OR_CLOSED) {
      return {
        ok: true,
        type: "warning",
        state,
        message:
          data.message || "H? so h�m nay d� kh�m xong ho?c d� d�ng, kh�ng ti?p d�n l?i.",
      };
    }

    if (state === STATUS.NEW_PATIENT_CREATED || state === STATUS.NEED_CREATE_RECORD) {
      const userId = getCurrentUserId() || 2;

      const recordRes = await createRecord({
        IdBenhNhan: data.IdBenhNhan || data.idBenhNhan,
        IdNguoiTao: userId,
        SinhHieu: sinhHieuPayload,
      });

      if (!recordRes) {
        return {
          ok: false,
          type: "error",
          message: "Kh�ng t?o du?c h? so kh�m cho b?nh nh�n.",
        };
      }

      if (recordRes.status >= 400) {
        return {
          ok: false,
          type: "error",
          message: normalizeApiMessage(recordRes, "Kh�ng t?o du?c h? so kh�m."),
        };
      }

      const info = buildPatientInfoFromForm(form, {
        idBenhNhan: data.IdBenhNhan || data.idBenhNhan,
        maBn: data.MaBn || data.maBn,
        idHoSo: recordRes.data?.idHoSo,
        maHs: recordRes.data?.maHs,
        idLanKham: recordRes.data?.idLanKham,
      });

      if (onNext) onNext(info, state);

      return {
        ok: true,
        type: "success",
        state,
        message: recordRes.data?.reused
          ? "D� c?p nh?t l?i h? so ti?p d�n trong ng�y."
          : "Luu ti?p d�n th�nh c�ng. S?n s�ng chuy?n sang ch? d?nh.",
        patientInfo: info,
      };
    }

    return {
      ok: false,
      type: "error",
      state,
      message: data.message || "Tr?ng th�i ti?p d�n kh�ng x�c d?nh.",
    };
  } catch (err) {
    console.error("[handleTiepDonSave]", err);
    return {
      ok: false,
      type: "error",
      message: "D� x?y ra l?i trong qu� tr�nh luu ti?p d�n.",
    };
  }
}

export async function autoFillPatient(cccd, sdt) {
  try {
    const res = await checkPatient(cccd, sdt);
    if (!res || !res.exists || !res.patient) {
      return { exists: false, patient: null, todayRecord: null, formPatch: null };
    }

    const patient = normalizeLookupPatient(res.patient);

    const formPatch = {
      ma_bn: patient.maBn,
      ho_ten: patient.hoTen,
      gio_tinh: patient.gioiTinh,
      ngay_sinh: patient.ngaySinh,
      cccd: patient.cccd,
      so_dien_thoai: patient.soDienThoai,
      email: patient.email,
      nghe_nghiep: patient.ngheNghiep,
      dia_chi_duong: patient.diaChiDuong,
      dia_chi_xa: patient.diaChiXa,
      dia_chi_huyen: patient.diaChiHuyen,
      dia_chi_tinh: patient.diaChiTinh,
      quoc_tich: patient.quocTich,
      dan_toc: patient.danToc,
      quoc_gia: patient.quocGia || "Vi?t Nam",
    };

    return {
      exists: true,
      patient,
      todayRecord: res.todayRecord || null,
      formPatch,
    };
  } catch (err) {
    console.warn("[autoFillPatient]", err);
    return { exists: false, patient: null, todayRecord: null, formPatch: null };
  }
}

export async function fetchReceptionLists(options = {}) {
  const {
    tab = "today",
    date,
    fromDate,
    toDate,
    keyword = "",
    status = "ALL",
    page = 1,
    pageSize = 20,
    sortBy = "ngay_tao",
    sortDir = "desc",
  } = options;

  try {
    const params = {
      date: date || undefined,
      fromDate: fromDate || undefined,
      toDate: toDate || undefined,
      keyword: keyword?.trim() || undefined,
      status: status || "ALL",
      page,
      pageSize,
      sortBy,
      sortDir,
    };

    return tab === "cancelled"
      ? await getCancelledList(params)
      : await getReceptionList(params);
  } catch (e) {
    console.error("[fetchReceptionLists]", e);
    return {
      items: [],
      total: 0,
      page: 1,
      pageSize,
      totalPages: 1,
      status: 0,
      error: "Kh�ng k?t n?i du?c API ti?p d�n.",
    };
  }
}

export async function fetchReceptionStats(setStats) {
  try {
    const stats = await getStats();
    const normalized = {
      totalToday: stats?.totalToday || 0,
      cancelled: stats?.cancelled || 0,
      newPatients: stats?.newPatients || 0,
      reExam: stats?.reExam || 0,
    };

    if (typeof setStats === "function") {
      setStats(normalized);
    }
    return normalized;
  } catch (e) {
    console.error("[fetchReceptionStats]", e);
    const fallback = { totalToday: 0, cancelled: 0, newPatients: 0, reExam: 0 };
    if (typeof setStats === "function") {
      setStats(fallback);
    }
    return fallback;
  }
}
