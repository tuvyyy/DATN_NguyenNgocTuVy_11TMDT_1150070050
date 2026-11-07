import { toast } from "react-toastify";
import Swal from "sweetalert2";

import {
  getChoKham,
  getHomNay,
  getDaKham,
  updateKetQuaKham,
  cancelLanKham,
  getLichSuKham,
  getPhongCuaNguoiDung,
  getLanKhamDetail,
  searchBenh,
  startLanKham,
  getDVKTByLanKham,
  getTongHopDVKTByLanKham,
  markDVKTResultRead,
  updateDVKT,
  cancelDVKT,
  ensureOk,
  apiReopenHoSo,
} from "../api/BacSiApi";

import {
  apiGetThuocList,
  apiCheckDonThuoc,
  apiCreateDonThuoc,
  apiUpdateDonThuoc,
  apiDeleteDonThuoc,
  apiGetDonTheoLanKham,
  apiGetTongHopDonThuoc,
  apiGoiYThuoc,
} from "../api/DonThuocApi";

const valueOf = (obj, ...keys) => {
  for (const key of keys) {
    if (obj && obj[key] !== undefined && obj[key] !== null) return obj[key];
  }
  return undefined;
};

export function mapLanKhamDetail(payload) {
  const d = payload?.data || payload || {};
  const patient = valueOf(d, "benhNhan", "BenhNhan") || {};
  const vital = valueOf(d, "sinhHieu", "SinhHieu") || null;

  return {
    id: valueOf(d, "idLanKham", "IdLanKham", "id", "Id"),
    idLanKham: valueOf(d, "idLanKham", "IdLanKham", "id", "Id"),
    idHoSo: valueOf(d, "idHoSo", "IdHoSo") || null,
    maHoSo: valueOf(d, "maHoSo", "MaHoSo", "maHs", "MaHs") || "",

    idBenhNhan: valueOf(patient, "id", "Id") || null,
    hoTen: valueOf(patient, "hoTen", "HoTen") || "",
    maBenhNhan: valueOf(patient, "maBenhNhan", "MaBenhNhan") || "",
    gioiTinh: valueOf(patient, "gioiTinh", "GioiTinh") || "",
    ngaySinh: valueOf(patient, "ngaySinh", "NgaySinh") || null,
    soDienThoai: valueOf(patient, "soDienThoai", "SoDienThoai") || "",
    diaChi: valueOf(patient, "diaChi", "DiaChi") || "",

    bacSi: valueOf(d, "bacSi", "BacSi") || null,
    phong: valueOf(d, "phong", "Phong") || null,
    khuTiepDon: valueOf(d, "khuTiepDon", "KhuTiepDon") || null,
    quayTiepDon: valueOf(d, "quayTiepDon", "QuayTiepDon") || null,
    mucUuTien: valueOf(d, "mucUuTien", "MucUuTien") || "",
    doiTuongThanhToan: valueOf(d, "doiTuongThanhToan", "DoiTuongThanhToan") || "",

    trangThai: valueOf(d, "trangThai", "TrangThai") || "",
    sinhHieu: vital,

    chanDoanSoBo: valueOf(d, "chanDoanSoBo", "ChanDoanSoBo") || "",
    chanDoanCuoi: valueOf(d, "chanDoanCuoi", "ChanDoanCuoi") || "",
    ketQuaKham: valueOf(d, "ketQuaKham", "KetQuaKham") || "",
    huongXuTri: valueOf(d, "huongXuTri", "HuongXuTri") || "",
    benh: valueOf(d, "benh", "Benh") || null,
    benhKemTheoList: valueOf(d, "benhKemTheoList", "BenhKemTheoList") || [],
    giayHenKhamLai: valueOf(d, "giayHenKhamLai", "GiayHenKhamLai") || null,
    giayKetLuanKham: valueOf(d, "giayKetLuanKham", "GiayKetLuanKham") || null,
    benhKemTheo: valueOf(d, "benhKemTheo", "BenhKemTheo") || "",
    ghiChu: valueOf(d, "ghiChu", "GhiChu") || "",
    pendingDvktCount: valueOf(d, "pendingDvktCount", "PendingDvktCount") || 0,
  };
}

export async function fetchLanKhamDetail(id, setState) {
  try {
    const res = await getLanKhamDetail(id);
    const mapped = mapLanKhamDetail(res.data);
    if (!mapped.id) throw new Error("Không đọc được chi tiết lượt khám.");
    setState?.(mapped);
    return mapped;
  } catch (err) {
    console.error("fetchLanKhamDetail:", err);
    toast.error(err?.message || "Không tải được chi tiết lượt khám!");
    return null;
  }
}

export async function handleStartLanKham(idLanKham, idBacSi) {
  const res = await startLanKham(idLanKham, idBacSi);
  ensureOk(res);
  return res.data;
}

export async function fetchChoKhamList(idBacSi, idPhong, setList) {
  try {
    const res = await getChoKham({ idBacSi, idPhong });
    ensureOk(res);
    setList(res.data || []);
  } catch (err) {
    console.error("fetchChoKhamList:", err);
    toast.error("Không tải được danh sách chờ khám!");
  }
}

export async function fetchHomNayList(idBacSi, idPhong, setList) {
  try {
    const res = await getHomNay({ idBacSi, idPhong });
    ensureOk(res);
    setList(res.data || []);
  } catch (err) {
    console.error("fetchHomNayList:", err);
    toast.error("Không tải được danh sách hôm nay!");
  }
}

export async function fetchDaKhamList(idBacSi, idPhong, setList) {
  try {
    const res = await getDaKham({ idBacSi, idPhong });
    ensureOk(res);
    setList(res.data || []);
  } catch (err) {
    console.error("fetchDaKhamList:", err);
    toast.error("Không tải được danh sách đã khám!");
  }
}

export async function handleUpdateKetQua(idLanKham, form, onDone) {
  try {
    const followUp = form.followUp || null;
    const dto = {
      ChanDoanSoBo: form.chan_doan_so_bo,
      ChanDoanCuoi: form.chan_doan_cuoi,
      KetQuaKham: form.ket_qua,
      HuongXuTri: form.huong_xu_tri,
      GhiChu: form.ghi_chu,
      IdBenh: form.id_benh ? Number(form.id_benh) : null,
      IdBenhKemTheo: Array.isArray(form.id_benh_kem_theo)
        ? form.id_benh_kem_theo.map(Number).filter(Boolean)
        : [],
      BenhKemTheo: form.benh_kem_theo,
      ConfirmNoVital: !!form.confirm_no_vital,
      KetThucKham: form.ket_thuc_kham || null,
      GiayKetLuanKham: followUp
        ? {
            LoaiGiay: followUp.loaiGiay,
            HinhThucDieuTri: followUp.hinhThucDieuTri,
            KetQua: followUp.ketQua,
            ChanDoan: form.chan_doan_cuoi || form.chan_doan_so_bo,
            BenhKemTheo: followUp.benhKemTheo || form.benh_kem_theo || form.chan_doan_cuoi,
            LyDoHen: followUp.lyDoHen,
            LoiDan: followUp.loiDan,
            NgayHen: followUp.ngayHen,
            PhongHen: followUp.phongHen,
            LyDoVaoVien: followUp.lyDoVaoVien,
            KhoaNhapVien: followUp.khoaNhapVien,
            KinhGui: followUp.kinhGui,
            DauHieuLamSang: followUp.dauHieuLamSang,
            LyDoChuyenTuyen: followUp.lyDoChuyenTuyen,
            HuongDieuTriChuyenTuyen: followUp.huongDieuTriChuyenTuyen,
            PhuongTienVanChuyen: followUp.phuongTienVanChuyen,
            LyDoKhongKham: followUp.lyDoKhongKham,
            GhiChu: followUp.ghiChu,
            DaKy: !!followUp.daKy,
            BacSiKy: followUp.bacSiKy,
            SignedAt: followUp.signedAt,
          }
        : null,
      GiayHenKhamLai: followUp
        ? {
            HinhThucDieuTri: followUp.hinhThucDieuTri,
            KetQua: followUp.ketQua,
            LyDoHen: followUp.lyDoHen,
            BenhKemTheo: followUp.benhKemTheo,
            LoiDan: followUp.loiDan,
            NgayHen: followUp.ngayHen,
            PhongHen: followUp.phongHen,
            GhiChu: followUp.ghiChu,
            DaKy: !!followUp.daKy,
            BacSiKy: followUp.bacSiKy,
            SignedAt: followUp.signedAt,
          }
        : null,
    };

    const res = await updateKetQuaKham(idLanKham, dto);
    ensureOk(res);

    toast.success("Đã lưu kết quả khám!");
    await onDone?.();
    return true;
  } catch (err) {
    console.error("handleUpdateKetQua:", err);
    toast.error(err?.message || "Không thể lưu kết quả khám!");
    return false;
  }
}

export async function fetchDonTheoLanKham(idLanKham, setDon) {
  try {
    const res = await apiGetDonTheoLanKham(idLanKham);
    const data = res.data || null;
    setDon?.(data);
    return data;
  } catch (err) {
    console.error("fetchDonTheoLanKham:", err);
    setDon?.(null);
    return null;
  }
}

export async function fetchTongHopDonThuoc(idLanKham, setData) {
  try {
    const res = await apiGetTongHopDonThuoc(idLanKham);
    const data = res?.data?.data ?? res?.data ?? null;
    setData?.(data);
    return data;
  } catch (err) {
    console.error("fetchTongHopDonThuoc:", err);
    setData?.(null);
    return null;
  }
}

export async function fetchThuocList(setList) {
  try {
    const res = await apiGetThuocList();
    setList(res.data || []);
  } catch (err) {
    console.error("fetchThuocList:", err);
    toast.error("Không tải được danh sách thuốc!");
  }
}

export async function handleCheckDonThuoc(dto) {
  try {
    const res = await apiCheckDonThuoc(dto);
    return res.data || null;
  } catch {
    return null;
  }
}

export async function fetchDVKTTheoLanKham(idLanKham, setter) {
  try {
    const res = await getDVKTByLanKham(idLanKham);
    ensureOk(res);
    setter(res.data || []);
  } catch (err) {
    console.error("fetchDVKTTheoLanKham:", err);
    setter([]);
  }
}

export async function fetchTongHopDVKTTheoLanKham(idLanKham, setter) {
  try {
    const res = await getTongHopDVKTByLanKham(idLanKham);
    ensureOk(res);
    const data = res.data || {};
    setter?.({
      hienTai: data.hienTai || data.HienTai || [],
      tongHop: data.tongHop || data.TongHop || [],
    });
    return data;
  } catch (err) {
    console.error("fetchTongHopDVKTTheoLanKham:", err);
    setter?.({ hienTai: [], tongHop: [] });
    return null;
  }
}

export async function handleMarkDVKTResultRead(id, onDone) {
  try {
    const res = await markDVKTResultRead(id);
    ensureOk(res);
    toast.success("Đã xác nhận bác sĩ đã đọc kết quả.");
    await onDone?.();
    return true;
  } catch (err) {
    console.error("handleMarkDVKTResultRead:", err);
    toast.error(err?.message || "Không thể xác nhận đã đọc kết quả.");
    return false;
  }
}

export async function handleUpdateDVKT(id, dto, onDone) {
  try {
    const res = await updateDVKT(id, dto);
    ensureOk(res);
    toast.success("Đã cập nhật chỉ định!");
    await onDone?.();
  } catch (err) {
    console.error("handleUpdateDVKT:", err);
    toast.error(err?.message || "Không thể cập nhật chỉ định!");
  }
}

export async function handleCancelDVKT(id, onDone) {
  try {
    const res = await cancelDVKT(id);
    if (!res.ok) {
      return Swal.fire({
        icon: "error",
        title: "Không thể hủy chỉ định",
        text: res.message || "Có lỗi xảy ra!",
      });
    }

    Swal.fire({
      icon: "success",
      title: "Đã hủy chỉ định",
      timer: 1200,
      showConfirmButton: false,
    });

    await onDone?.();
  } catch (err) {
    console.error("handleCancelDVKT:", err);
    return Swal.fire({
      icon: "error",
      title: "Không thể hủy chỉ định",
      text: err?.response?.data?.message || err?.message || "Có lỗi xảy ra.",
    });
  }
}

export async function handleCreateDonThuoc(dto, onDone) {
  try {
    const res = await apiCreateDonThuoc(dto);
    toast.success("Đã tạo đơn thuốc!");
    onDone?.(res.data);
  } catch (err) {
    console.error("handleCreateDonThuoc:", err);
    toast.error(err?.response?.data?.message || "Không thể tạo đơn thuốc!");
  }
}

export async function handleUpdateDonThuoc(id, dto, onDone) {
  try {
    const res = await apiUpdateDonThuoc(id, dto);
    toast.success("Đã cập nhật đơn!");
    onDone?.(res.data);
  } catch (err) {
    console.error("handleUpdateDonThuoc:", err);
    toast.error(err?.response?.data?.message || "Không thể cập nhật đơn thuốc!");
  }
}

export async function handleDeleteDonThuoc(id, onDone) {
  try {
    await apiDeleteDonThuoc(id);
    toast.info("Đã xóa đơn thuốc");
    onDone?.();
  } catch (err) {
    console.error("handleDeleteDonThuoc:", err);
    toast.error(err?.response?.data?.message || "Không thể xóa đơn thuốc!");
  }
}

export async function fetchGoiYThuoc(idThuoc, setList) {
  try {
    const res = await apiGoiYThuoc(idThuoc);
    setList(res.data || []);
  } catch (err) {
    console.error("fetchGoiYThuoc:", err);
  }
}

export async function handleCancelLanKham(idLanKham, reason, onDone) {
  try {
    const res = await cancelLanKham(idLanKham, reason);
    ensureOk(res);
    toast.info("Đã hủy lượt khám");
    await onDone?.();
  } catch (err) {
    console.error("handleCancelLanKham:", err);
    toast.error(err?.message || "Không thể hủy lượt khám!");
  }
}

export async function fetchPhongBacSi(idBacSi, setPhong) {
  try {
    const res = await getPhongCuaNguoiDung(idBacSi);
    ensureOk(res);
    setPhong(Array.isArray(res.data) ? res.data : []);
  } catch (err) {
    console.error("fetchPhongBacSi:", err);
    setPhong([]);
  }
}

export async function fetchLichSuKham(idBenhNhan, setList) {
  try {
    const res = await getLichSuKham(idBenhNhan);
    ensureOk(res);
    setList(res.data || []);
  } catch (err) {
    console.error("fetchLichSuKham:", err);
  }
}

export async function fetchBenhOptions(q, setList) {
  try {
    const res = await searchBenh(q);
    ensureOk(res);
    const seen = new Set();
    const data = (res.data || []).filter((benh) => {
      const key = String(benh.ma || benh.ten || "").trim().toUpperCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    setList?.(data);
    return data;
  } catch (err) {
    console.error("fetchBenhOptions:", err);
    return [];
  }
}

export async function handleReopenHoSo(idLanKham, lyDo, callback) {
  try {
    const res = await apiReopenHoSo(idLanKham, lyDo);
    if (res?.status >= 200 && res?.status < 300) {
      await callback?.();
      return { ok: true, data: res.data?.data ?? res.data };
    }
    return {
      ok: false,
      message: res?.data?.message || res?.data?.error || `Không thể mở lại hồ sơ (${res?.status || "lỗi không xác định"}).`,
    };
  } catch (err) {
    console.error("handleReopenHoSo:", err);
    return {
      ok: false,
      message: err?.response?.data?.message || err?.response?.data?.error || err?.message || "Không thể mở lại hồ sơ!",
    };
  }
}
