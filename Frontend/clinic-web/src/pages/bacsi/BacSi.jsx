import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";

import MainLayout from "../../layouts/MainLayout";
import { usePermission } from "../../hooks/UsePermission";

import {
  fetchChoKhamList,
  fetchHomNayList,
  fetchDaKhamList,
  fetchLichSuKham,
  fetchPhongBacSi,
  fetchLanKhamDetail,
  handleStartLanKham,
  fetchDonTheoLanKham,
} from "../../controllers/BacSiController";

import PatientList from "./components/PatientList";
import ResultForm from "./components/ResultForm";
import LichSuKham from "./components/LichSuKham";
import ModalChiDinhDVKT from "./modals/modalbacsichidinhDVKT/ModalChiDinhDVKT";
import ModalKeDonThuoc from "./modals/ModalKeDonThuoc";
import ModalXacNhanHuy from "./modals/ModalXacNhanHuy";

function safeJson(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function getCurrentUser() {
  const u = safeJson("user") || safeJson("userInfo") || {};
  return {
    id: u.userId || u.id,
    hoTen: u.fullName || u.hoTen || u.ten || u.tenNguoiDung,
    tenDangNhap: u.tenDangNhap || u.username,
    vaiTro: Array.isArray(u.roles) ? u.roles[0] : u.vaiTro,
    idPhong: u.idPhong,
  };
}

const valueOf = (obj, ...keys) => {
  for (const key of keys) {
    if (obj && obj[key] !== undefined && obj[key] !== null) return obj[key];
  }
  return undefined;
};

function normalizeRow(row) {
  if (!row) return null;
  return {
    ...row,
    id: valueOf(row, "id", "Id"),
    idBenhNhan: valueOf(row, "idBenhNhan", "IdBenhNhan"),
    benhNhan: valueOf(row, "benhNhan", "BenhNhan") || "",
    maBenhNhan: valueOf(row, "maBenhNhan", "MaBenhNhan") || "",
    maHoSo: valueOf(row, "maHoSo", "MaHoSo") || "",
    createdAt: valueOf(row, "createdAt", "CreatedAt"),
    thoiGianBatDau: valueOf(row, "thoiGianBatDau", "ThoiGianBatDau"),
    thoiGianKetThuc: valueOf(row, "thoiGianKetThuc", "ThoiGianKetThuc"),
    trangThai: valueOf(row, "trangThai", "TrangThai") || "",
    mucUuTien: valueOf(row, "mucUuTien", "MucUuTien") || "",
    sttKham: valueOf(row, "sttKham", "SttKham"),
  };
}

function normalizeRoom(room) {
  if (!room) return null;
  const idPhong = Number(valueOf(room, "idPhong", "IdPhong", "id", "Id"));
  if (!idPhong) return null;

  return {
    ...room,
    idPhong,
    maPhong: valueOf(room, "maPhong", "MaPhong") || "",
    tenPhong: valueOf(room, "tenPhong", "TenPhong") || `Phong #${idPhong}`,
    khoa: valueOf(room, "khoa", "Khoa", "khoaPhong", "KhoaPhong", "idKhoa", "IdKhoa") || "",
  };
}

function uniqueRows(rows) {
  const map = new Map();
  rows.map(normalizeRow).filter(Boolean).forEach((row) => {
    if (!row.id) return;
    const old = map.get(row.id);
    if (!old || old.trangThai === "CHO_KHAM") map.set(row.id, row);
  });
  return [...map.values()];
}

function getVisitSortTime(row) {
  const value = row?.thoiGianKetThuc || row?.thoiGianBatDau || row?.createdAt;
  const time = value ? new Date(value).getTime() : Number.NaN;
  return Number.isNaN(time) ? Number(row?.id || 0) : time;
}

function latestRowsByPatient(rows) {
  const map = new Map();
  uniqueRows(rows)
    .filter((row) => row.trangThai === "DA_KHAM")
    .forEach((row) => {
      const key = row.idBenhNhan || row.maBenhNhan || row.id;
      const old = map.get(key);
      if (!old || getVisitSortTime(row) > getVisitSortTime(old)) {
        map.set(key, row);
      }
    });

  return [...map.values()].sort((a, b) => getVisitSortTime(b) - getVisitSortTime(a));
}

export default function BacSi() {
  const user = getCurrentUser();
  const idBacSi = Number(user.id);
  const [idPhong, setIdPhong] = useState(null);
  const permission = usePermission("KHAM_BENH");

  const [listChoKham, setListChoKham] = useState([]);
  const [listHomNay, setListHomNay] = useState([]);
  const [listDaKham, setListDaKham] = useState([]);
  const [lichSu, setLichSu] = useState([]);
  const [phong, setPhong] = useState(null);
  const [phongList, setPhongList] = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState("CHO_KHAM");
  const [openKeDon, setOpenKeDon] = useState(false);
  const [openChiDinh, setOpenChiDinh] = useState(false);
  const [donThuoc, setDonThuoc] = useState(null);
  const [selectingId, setSelectingId] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const refreshLists = useCallback(async () => {
    if (!idPhong || !idBacSi) {
      setListChoKham([]);
      setListHomNay([]);
      setListDaKham([]);
      return;
    }

    setRefreshing(true);
    try {
      await Promise.all([
        fetchChoKhamList(idBacSi, idPhong, setListChoKham),
        fetchHomNayList(idBacSi, idPhong, setListHomNay),
        fetchDaKhamList(idBacSi, idPhong, setListDaKham),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [idBacSi, idPhong]);

  const refreshSelected = useCallback(async () => {
    if (selected?.id) {
      await fetchLanKhamDetail(selected.id, setSelected);
      await fetchDonTheoLanKham(selected.id, setDonThuoc);
    }
  }, [selected?.id]);

  const handleSelectPatient = async (rawRow) => {
    const row = normalizeRow(rawRow);
    if (!row?.id) {
      toast.error("Không đọc được lượt khám được chọn.");
      return;
    }

    setSelectingId(row.id);

    // Đổ một bản tạm ngay để cột bên phải phản hồi tức thì.
    setSelected((old) => ({
      ...old,
      id: row.id,
      idLanKham: row.id,
      idBenhNhan: row.idBenhNhan || old?.idBenhNhan || null,
      hoTen: row.benhNhan || old?.hoTen || "",
      maBenhNhan: row.maBenhNhan || old?.maBenhNhan || "",
      maHoSo: row.maHoSo || old?.maHoSo || "",
      trangThai: row.trangThai || old?.trangThai || "",
      mucUuTien: row.mucUuTien || old?.mucUuTien || "",
      _loadingDetail: true,
    }));

    if (row.idBenhNhan) {
      fetchLichSuKham(row.idBenhNhan, setLichSu);
    }

    try {
      const status = String(row.trangThai || "").trim().toUpperCase();
      if ((status === "CHO_KHAM" || status === "DA_THANH_TOAN") && permission.canEdit) {
        try {
          await handleStartLanKham(row.id, idBacSi);
        } catch (err) {
          toast.warning(err?.message || "Chưa chuyển được trạng thái bắt đầu khám, vẫn mở hồ sơ để xem.");
        }
      }

      await fetchLanKhamDetail(row.id, setSelected);
      await refreshLists();
    } finally {
      setSelectingId(null);
    }
  };

  const handleSelectHistory = async (rawRow) => {
    const row = normalizeRow(rawRow);
    if (!row?.id) return;

    setSelectingId(row.id);
    try {
      const detail = await fetchLanKhamDetail(row.id, setSelected);
      if (detail?.id) {
        await fetchDonTheoLanKham(detail.id, setDonThuoc);
      }
    } finally {
      setSelectingId(null);
    }
  };

  function handleOpenKeDon() {
    if (!selected?.id) return toast.error("Chưa chọn lượt khám!");
    if (!permission.canAdd) return toast.warning("Bạn chỉ có quyền xem, không thể kê đơn.");
    setOpenKeDon(true);
  }

  function handleOpenChiDinh() {
    if (!selected?.id) return toast.error("Chưa chọn lượt khám!");
    if (!permission.canAdd) return toast.warning("Bạn chỉ có quyền xem, không thể thêm chỉ định.");
    setOpenChiDinh(true);
  }

  function handleRoomChange(nextId) {
    const roomId = Number(nextId);
    setIdPhong(roomId || null);
    setSelected(null);
    setLichSu([]);
    setDonThuoc(null);
    setListChoKham([]);
    setListHomNay([]);
    setListDaKham([]);
  }

  useEffect(() => {
    if (!idBacSi) {
      setLoadingRooms(false);
      return;
    }

    setLoadingRooms(true);
    fetchPhongBacSi(idBacSi, (rooms) => {
      const list = (Array.isArray(rooms) ? rooms : [rooms]).map(normalizeRoom).filter(Boolean);
      const defaultRoomId = Number(user.idPhong);
      const selectedRoom = list.find((item) => item.idPhong === defaultRoomId) || list[0] || null;

      setPhongList(list);
      setPhong(selectedRoom);
      setIdPhong(selectedRoom?.idPhong || null);
      setLoadingRooms(false);
    });
  }, [idBacSi, user.idPhong]);

  useEffect(() => {
    const selectedRoom = phongList.find((item) => item.idPhong === Number(idPhong)) || null;
    if (selectedRoom) setPhong(selectedRoom);
  }, [idPhong, phongList]);

  useEffect(() => {
    refreshLists();
  }, [refreshLists]);

  useEffect(() => {
    const handler = () => refreshLists();
    window.addEventListener("reload-patient-list", handler);
    return () => window.removeEventListener("reload-patient-list", handler);
  }, [refreshLists]);

  useEffect(() => {
    if (selected?.idBenhNhan) fetchLichSuKham(selected.idBenhNhan, setLichSu);
    if (selected?.id) fetchDonTheoLanKham(selected.id, setDonThuoc);
    if (!selected?.id) setDonThuoc(null);
  }, [selected?.id, selected?.idBenhNhan]);

  const currentList = useMemo(() => {
    if (filter === "DA_KHAM") {
      return latestRowsByPatient(listDaKham);
    }

    if (filter === "HOM_NAY") {
      return uniqueRows(listHomNay);
    }

    return uniqueRows([
      ...listChoKham,
      ...listHomNay.filter((x) => normalizeRow(x)?.trangThai === "DANG_KHAM"),
    ]);
  }, [filter, listChoKham, listHomNay, listDaKham]);

  const counts = {
    choKham: uniqueRows(listChoKham).length,
    dangKham: uniqueRows(listHomNay).filter((x) => x.trangThai === "DANG_KHAM").length,
    daKham: latestRowsByPatient(listDaKham).length,
  };

  if (!idBacSi) {
    return (
      <MainLayout>
        <div className="p-8 text-center text-red-600 font-semibold">
          Không xác định bác sĩ. Vui lòng đăng nhập lại.
        </div>
      </MainLayout>
    );
  }

  if (permission.loading) {
    return (
      <MainLayout>
        <div className="p-8 text-center text-slate-600 font-semibold">Đang kiểm tra quyền...</div>
      </MainLayout>
    );
  }

  if (!permission.canView) {
    return (
      <MainLayout>
        <div className="p-8 text-center text-red-600 font-semibold">
          Bạn không có quyền truy cập trang bác sĩ.
        </div>
      </MainLayout>
    );
  }

  if (loadingRooms) {
    return (
      <MainLayout>
        <div className="p-8 text-center text-slate-600 font-semibold">Đang tải phạm vi phòng...</div>
      </MainLayout>
    );
  }

  if (!phongList.length) {
    return (
      <MainLayout
        headerContext={{
          title: `${user.hoTen || user.tenDangNhap || "Người dùng"} | Chưa phân phòng`,
          subtitle: "Có quyền xem màn khám, nhưng chưa có phạm vi dữ liệu.",
        }}
      >
        <div className="flex h-full min-h-[60vh] items-center justify-center bg-slate-100 p-6">
          <div className="max-w-xl rounded-lg border border-amber-200 bg-white p-6 text-center shadow-sm">
            <div className="text-lg font-bold text-slate-800">Tài khoản chưa được phân khoa/phòng</div>
            <p className="mt-2 text-sm text-slate-600">
              Vui lòng vào Quản trị phân quyền để cấp phạm vi phòng cho người dùng này. Sau khi được cấp,
              danh sách chờ khám và lịch sử trong phòng sẽ hiển thị theo đúng phạm vi.
            </p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout
      headerContext={{
        title: `${user.hoTen || user.tenDangNhap || "Bác sĩ"} | ${phong?.tenPhong || "Đang tải phòng khám"}`,
        subtitle: phong?.khoa ? `Khoa/phòng: ${phong.khoa}` : "",
      }}
    >
      <div className="flex h-full min-h-0 flex-col bg-slate-100 px-4 pb-4 pt-3">
        <div className="h-1 shrink-0 rounded-full bg-gradient-to-r from-sky-500 via-indigo-500 to-emerald-500" />

        <div className="mt-3 flex shrink-0 flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm">
          <span className="text-sm font-bold text-slate-700">Phòng làm việc</span>
          <select
            value={idPhong || ""}
            onChange={(event) => handleRoomChange(event.target.value)}
            className="min-w-[220px] rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
          >
            {phongList.map((item) => (
              <option key={item.idPhong} value={item.idPhong}>
                {[item.maPhong, item.tenPhong, item.khoa].filter(Boolean).join(" - ")}
              </option>
            ))}
          </select>
          <span className="ml-auto rounded-md bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
            {permission.canEdit ? "Chế độ thao tác" : "Chế độ xem"}
          </span>
        </div>

        <div className="flex min-h-0 flex-1 gap-4 pt-3">
          <PatientList
            list={currentList}
            filter={filter}
            setFilter={setFilter}
            selected={selected}
            onSelect={handleSelectPatient}
            counts={counts}
            loadingId={selectingId}
            refreshing={refreshing}
            onRefresh={refreshLists}
          />

          <div className="flex min-h-0 flex-1 min-w-0 flex-col">
            <ResultForm
              selected={selected}
              idBacSi={idBacSi}
              idPhong={idPhong}
              donThuoc={donThuoc}
              permission={permission}
              onOpenKeDon={handleOpenKeDon}
              onOpenChiDinh={handleOpenChiDinh}
              refresh={async () => {
                await refreshLists();
                if (selected?.id) await fetchDonTheoLanKham(selected.id, setDonThuoc);
              }}
              onReloadSelected={refreshSelected}
            />
          </div>

          <LichSuKham list={lichSu} selectedId={selected?.id} onSelect={handleSelectHistory} />
        </div>
      </div>

      {openChiDinh && (
        <ModalChiDinhDVKT
          open={openChiDinh}
          idLanKham={selected?.id}
          idBacSi={idBacSi}
          onClose={async (needRefresh) => {
            const currentId = selected?.id;
            setOpenChiDinh(false);
            if (needRefresh) {
              window.dispatchEvent(new Event("dvkt-updated"));
              if (currentId) {
                const detail = await fetchLanKhamDetail(currentId, setSelected);
                if (detail?.id) {
                  await fetchDonTheoLanKham(detail.id, setDonThuoc);
                }
              }
              await refreshLists();
            }
          }}
        />
      )}

      {openKeDon && (
        <ModalKeDonThuoc
          isOpen={openKeDon}
          onClose={() => setOpenKeDon(false)}
          idLanKham={selected?.id}
          idBenhNhan={selected?.idBenhNhan}
          idBacSi={idBacSi}
          clinicalContext={selected}
          onSaved={async () => {
            setOpenKeDon(false);
            await refreshLists();
            if (selected?.id) await fetchDonTheoLanKham(selected.id, setDonThuoc);
          }}
        />
      )}

      <ModalXacNhanHuy />
    </MainLayout>
  );
}
