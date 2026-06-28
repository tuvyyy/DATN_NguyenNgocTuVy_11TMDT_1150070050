// src/pages/bacsi/modals/ModalKeDonThuoc.jsx
import React, { useEffect, useMemo, useState } from "react";
import { AlertTriangle, X, Search } from "lucide-react";
import { toast } from "react-toastify";

// ✅ Các API dùng cho modal (tùy file DonThuocApi.js của bạn)
import {
  apiGetThuocList,
  apiGetDonTheoLanKham,
  apiCheckDonThuoc,
  apiCreateDonThuoc,
  apiUpdateDonThuoc,
} from "../../../api/DonThuocApi";


// ======================
// Helper
// ======================
const fmtVnd = (n) =>
  typeof n === "number"
    ? n.toLocaleString("vi-VN", {
        style: "currency",
        currency: "VND",
        maximumFractionDigits: 0,
      })
    : "";

const toInt = (v, def = 0) => {
  const n = parseInt(v, 10);
  return Number.isNaN(n) ? def : n;
};

// ======================
// Component chính
// ======================
export default function ModalKeDonThuoc({
  isOpen,
  onClose,
  idLanKham,
  idBenhNhan,
  idBacSi,
  clinicalContext,
  donCu, // có/không đều được, modal sẽ tự load theo idLanKham nếu cần
  onSaved,
}) {
  const [loadingThuoc, setLoadingThuoc] = useState(false);
  const [thuocList, setThuocList] = useState([]);

  const [search, setSearch] = useState("");

  // Map theo idThuoc => detail dòng đã chọn
  const [selectedMap, setSelectedMap] = useState({});
  const selectedList = useMemo(
    () => Object.values(selectedMap),
    [selectedMap]
  );

  const [donId, setDonId] = useState(null); // để biết là create hay update
  const [ghiChuDon, setGhiChuDon] = useState("");

  const [checking, setChecking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [checkResult, setCheckResult] = useState(null); // {errors:[], warnings:[]}

  // ================================
  // Load danh sách thuốc
  // ================================
  useEffect(() => {
    if (!isOpen) return;

    async function loadThuoc() {
      try {
        setLoadingThuoc(true);

        // gọi API lấy danh sách thuốc
        const res = await apiGetThuocList({
          keyword: "",
          page: 1,
          pageSize: 500,
        });

        // tùy backend trả gì
        const list =
          res?.data?.items ||
          res?.data?.data ||
          res?.data ||
          [];

        setThuocList(list);
      } catch (err) {
        console.error(err);
        toast.error("Không tải được danh sách thuốc!");
      } finally {
        setLoadingThuoc(false);
      }
    }

    loadThuoc();
  }, [isOpen]);


  // ================================
  // Load đơn cũ theo lần khám (nếu có)
  // ================================
  useEffect(() => {
    if (!isOpen || !idLanKham) return;

    async function loadDonCu() {
      try {
        const res = await apiGetDonTheoLanKham(idLanKham);
        const data = res?.data;
        if (!data || !data.chiTiet || data.chiTiet.length === 0) {
          setDonId(null);
          setSelectedMap({});
          setGhiChuDon(data?.ghiChu || "");
          return;
        }

        setDonId(data.id || null);
        setGhiChuDon(data.ghiChu || "");

        const map = {};
        data.chiTiet.forEach((ct) => {
          const lanNgay =
            (ct.sang || 0) +
              (ct.trua || 0) +
              (ct.chieu || 0) +
              (ct.toi || 0) +
              (ct.khuya || 0) || 1;
          const soNgay = ct.soNgayUong || data.soNgayUong || 1;

          let slLan = 1;
          if (lanNgay > 0 && soNgay > 0 && ct.soLuong) {
            slLan = Math.max(
              1,
              Math.round(ct.soLuong / (lanNgay * soNgay))
            );
          }

          map[ct.idThuoc] = {
            idThuoc: ct.idThuoc,
            ma: ct.maThuoc || ct.idThuoc,
            ten: ct.tenThuoc,
            hoatChat: ct.hoatChat || ct.HoatChat || "",
            loaiThuoc: ct.loaiThuoc || ct.LoaiThuoc || "",
            donVi: ct.donVi,
            donGia: ct.donGia || 0,
            soLuongTon: ct.soLuongTon || 0,

            soNgay: soNgay,
            lanNgay,
            slLan,

            cachDung: ct.ghiChu || "",
            thoiDiemDung: "",
            duongDung: "",
          };
        });

        setSelectedMap(map);
      } catch (err) {
        console.error(err);
        // Không có đơn cũ cũng không sao
        setDonId(null);
        setSelectedMap({});
      }
    }

    loadDonCu();
  }, [isOpen, idLanKham]);

  // Reset khi đóng modal
  useEffect(() => {
    if (!isOpen) {
      setSearch("");
      setSelectedMap({});
      setDonId(null);
      setGhiChuDon("");
      setCheckResult(null);
      setChecking(false);
      setSaving(false);
    }
  }, [isOpen]);

  // ================================
  // Filter trên danh sách thuốc
  // ================================
  const filteredThuoc = useMemo(() => {
    if (!search) return thuocList;
    const s = search.toLowerCase();

    return thuocList.filter(
      (t) =>
        `${t.ma || ""} ${t.ten || ""} ${t.tenThuoc || ""}`
          .toLowerCase()
          .includes(s)
    );
  }, [thuocList, search]);

  const duplicateIngredients = useMemo(() => {
    const groups = new Map();
    selectedList.forEach((item) => {
      const key = String(item.hoatChat || item.ten || "").trim().toLowerCase();
      if (!key) return;
      groups.set(key, [...(groups.get(key) || []), item.ten]);
    });
    return [...groups.entries()]
      .filter(([, names]) => names.length > 1)
      .map(([ingredient, names]) => ({ ingredient, names }));
  }, [selectedList]);


  // ================================
  // Handle chọn thuốc
  // ================================
  const toggleThuoc = (row) => {
    const id = row.id || row.idThuoc || row.id_thuoc;
    if (!id) return;

    setSelectedMap((old) => {
      const clone = { ...old };
      if (clone[id]) {
        delete clone[id];
      } else {
        clone[id] = {
          idThuoc: id,
          ma: row.ma || row.code || "",
          ten: row.tenDayDu || row.ten || row.tenThuoc || "",
          hoatChat: row.hoatChat || row.HoatChat || "",
          loaiThuoc: row.loaiThuoc || row.LoaiThuoc || row.tenNhom || row.TenNhom || "",
          donVi:
            row.donVi ||
            row.donViTinh ||
            row.dvt ||
            row.don_vi ||
            "Viên",
          donGia:
            row.donGia || row.giaBan || row.price || row.don_gia || 0,
          soLuongTon: row.soLuongTon || row.stock || row.so_luong_ton || 0,

          soNgay: 3,
          lanNgay: 2,
          slLan: 1,

          cachDung: "",
          thoiDiemDung: "",
          duongDung: "",
        };
      }
      return clone;
    });
  };

  const updateItemField = (idThuoc, field, value) => {
    setSelectedMap((old) => {
      const it = old[idThuoc];
      if (!it) return old;
      const clone = { ...old };
      clone[idThuoc] = {
        ...it,
        [field]:
          field === "soNgay" || field === "lanNgay" || field === "slLan"
            ? toInt(value, 0)
            : value,
      };
      return clone;
    });
  };

  const calcSoLuong = (it) => {
    const soNgay = it.soNgay || 0;
    const lanNgay = it.lanNgay || 0;
    const slLan = it.slLan || 0;
    return soNgay * lanNgay * slLan;
  };

  // ================================
  // Build payload cho API
  // ================================
  const buildPayload = () => {
    const chiTiet = selectedList.map((it) => ({
      idThuoc: it.idThuoc,
      soLuong: calcSoLuong(it),
      donVi: it.donVi,
      dungTich: null,
      sang: it.lanNgay,
      trua: 0,
      chieu: 0,
      toi: 0,
      khuya: 0,
      soNgayUong: it.soNgay,
      ghiChu: it.cachDung,
    }));

    const soNgayUong =
      selectedList.reduce(
        (max, it) => Math.max(max, it.soNgay || 0),
        0
      ) || 0;

    return {
      idLanKham: idLanKham,
      idBenhNhan: idBenhNhan,
      idBacSi: idBacSi,
      soNgayUong,
      ghiChu: ghiChuDon,
      loiDan: ghiChuDon,
      chiTiet,
    };
  };


  // ================================
  // Validate client
  // ================================
  const validateLocal = () => {
    if (!selectedList.length) {
      if (ghiChuDon.trim()) return true;
      toast.error("Chưa chọn thuốc nào. Nếu phòng không kê thuốc, hãy nhập lời dặn/ghi chú đơn trắng.");
      return false;
    }

    if (duplicateIngredients.length) {
      const first = duplicateIngredients[0];
      toast.error(`Trùng hoạt chất: ${first.names.join(", ")}`);
      return false;
    }

    for (const it of selectedList) {
      if (!it.soNgay || it.soNgay <= 0) {
        toast.error(`Thuốc ${it.ten}: Số ngày phải > 0`);
        return false;
      }
      if (!it.lanNgay || it.lanNgay <= 0) {
        toast.error(`Thuốc ${it.ten}: Lần/ngày phải > 0`);
        return false;
      }
      if (!it.slLan || it.slLan <= 0) {
        toast.error(`Thuốc ${it.ten}: SL/lần phải > 0`);
        return false;
      }
      const qty = calcSoLuong(it);
      if (it.soLuongTon && qty > it.soLuongTon) {
        toast.warning(
          `Thuốc ${it.ten}: kê ${qty} > tồn kho ${it.soLuongTon}`
        );
      }
    }

    return true;
  };

  // ================================
  // Submit (check + save)
  // ================================
  const handleSubmit = async () => {
    if (!validateLocal()) return;

    const payload = buildPayload();

    try {
      setChecking(true);
      const resCheck = await apiCheckDonThuoc(payload);
      const cr = resCheck?.data || { errors: [], warnings: [], isSafe: true };
      setCheckResult(cr);

      if (!cr.isSafe) {
        toast.error("Đơn thuốc chưa an toàn, xem lỗi bên dưới!");
        setChecking(false);
        return;
      }

      setChecking(false);
      setSaving(true);

      if (donId) {
        await apiUpdateDonThuoc(donId, payload);
      } else {
        const res = await apiCreateDonThuoc(payload);
        const newId = res?.data?.id;
        if (newId) setDonId(newId);
      }

      toast.success("Lưu đơn thuốc thành công!");
      onSaved?.();       // reload đơn thuốc ở ResultForm
      onClose?.();       // đóng modal → UI re-render

    } catch (err) {
      console.error(err);
      toast.error("Không thể lưu đơn thuốc!");
    } finally {
      setChecking(false);
      setSaving(false);
    }
  };

  // ================================
  // Render
  // ================================
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-[2px] p-4 transition-all">
      <div className="w-[98vw] max-w-7xl h-[92vh] bg-white rounded-2xl shadow-2xl flex flex-col border border-slate-100 overflow-hidden transition-all duration-300">
        {/* HEADER */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#0077B6] text-white">
          <div className="flex items-center gap-3">
            <span className="text-base font-bold tracking-wide uppercase">
              Chỉ định thuốc
            </span>
            {idBenhNhan && (
              <span className="text-xs bg-white/20 text-white px-2.5 py-1 rounded-full font-medium">
                Bệnh nhân ID: {idBenhNhan}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 transition-colors text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* FILTER BAR */}
        <div className="flex flex-wrap items-center gap-3 px-6 py-3 border-b border-slate-100 bg-slate-50/50">
          <select className="h-9 text-xs border border-slate-200 hover:border-slate-300 rounded-lg px-3 bg-white text-slate-700 font-medium focus:ring-2 focus:ring-sky-100 focus:border-[#0077B6] outline-none cursor-pointer transition-all">
            <option>Thuốc nhà thuốc</option>
            <option>Thuốc BHYT</option>
          </select>

          <select className="h-9 text-xs border border-slate-200 hover:border-slate-300 rounded-lg px-3 bg-white text-slate-700 font-medium focus:ring-2 focus:ring-sky-100 focus:border-[#0077B6] outline-none cursor-pointer transition-all">
            <option>Phân nhóm thuốc</option>
          </select>

          <div className="flex-1 min-w-[200px] relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              className="w-full h-9 pl-9 pr-4 text-xs border border-slate-200 hover:border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-100 focus:border-[#0077B6] outline-none transition-all placeholder-slate-400 text-slate-700"
              placeholder="Nhập mã hoặc tên thuốc..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2 bg-[#0077B6]/5 px-3 py-1.5 rounded-lg border border-[#0077B6]/15">
            <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Tổng tiền ước tính:</span>
            <span className="text-sm text-[#0077B6] font-bold font-mono">
              {fmtVnd(
                selectedList.reduce(
                  (s, it) =>
                    s + (calcSoLuong(it) || 0) * (it.donGia || 0),
                    0
                )
              )}
            </span>
          </div>
        </div>

        {/* DIAGNOSIS AND REMARKS */}
        <div className="grid gap-4 border-b border-slate-100 bg-white px-6 py-3 text-xs md:grid-cols-[1fr_1fr]">
          <div className="rounded-xl border border-sky-100/80 bg-sky-50/30 px-4 py-2.5 shadow-sm transition-all hover:bg-sky-50/50">
            <div className="text-[10px] font-bold uppercase tracking-wider text-sky-700">Chẩn đoán / ICD</div>
            <div className="mt-1 text-[13px] font-semibold text-slate-800">
              {clinicalContext?.benh?.ma && clinicalContext?.benh?.ten
                ? `${clinicalContext.benh.ma} - ${clinicalContext.benh.ten}`
                : clinicalContext?.chanDoanCuoi || clinicalContext?.chanDoanSoBo || "---"}
            </div>
          </div>
          <label className="block rounded-xl border border-amber-100 bg-amber-50/30 px-4 py-2.5 shadow-sm transition-all hover:bg-amber-50/50 cursor-text">
            <div className="text-[10px] font-bold uppercase tracking-wider text-amber-700">Lời dặn / ghi chú đơn thuốc</div>
            <input
              className="mt-1 h-8 w-full rounded-lg border border-amber-200/80 bg-white px-3 text-[12px] text-slate-800 outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-400 transition-all placeholder-slate-400"
              value={ghiChuDon}
              onChange={(e) => setGhiChuDon(e.target.value)}
              placeholder="Có thể nhập đơn trắng nếu phòng không kê thuốc..."
            />
          </label>
          {duplicateIngredients.length > 0 && (
            <div className="md:col-span-2 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50/40 px-4 py-2.5 font-semibold text-red-700 text-[12px] animate-pulse">
              <AlertTriangle className="h-4 w-4 shrink-0 text-red-500" />
              <span>Trùng hoạt chất: {duplicateIngredients.map((x) => x.names.join(", ")).join("; ")}</span>
            </div>
          )}
        </div>

        {/* BODY 2 PANEL */}
        <div className="flex-1 flex gap-4 px-6 py-4 overflow-hidden bg-slate-50/30">
          {/* LEFT: DANH MỤC THUỐC (40%) */}
          <div className="w-[40%] border border-slate-200 bg-white rounded-xl shadow-sm flex flex-col overflow-hidden">
            <div className="px-4 py-3 text-xs font-bold text-slate-700 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <span className="uppercase tracking-wider">Danh mục thuốc</span>
              <span className="text-[10px] text-slate-400 font-normal">Hiển thị tối đa 500 mục</span>
            </div>

            <div className="flex-1 overflow-auto text-xs">
              {loadingThuoc ? (
                <div className="p-6 text-center text-slate-400 font-medium">
                  Đang tải danh sách thuốc...
                </div>
              ) : (
                <table className="min-w-full text-xs">
                  <thead className="sticky top-0 bg-slate-50/90 backdrop-blur-sm border-b border-slate-150 z-10">
                    <tr className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                      <th className="w-12 px-3 py-2.5 text-center">Chọn</th>
                      <th className="w-20 px-2 py-2.5 text-left">Mã</th>
                      <th className="px-3 py-2.5 text-left">Tên thuốc - Hàm lượng</th>
                      <th className="w-24 px-3 py-2.5 text-right">Đơn giá</th>
                      <th className="w-24 px-3 py-2.5 text-right">Tồn kho</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredThuoc.map((t) => {
                      const id = t.id || t.idThuoc || t.id_thuoc;
                      const checked = !!selectedMap[id];
                      return (
                        <tr
                          key={id}
                          onClick={() => toggleThuoc(t)}
                          className={`hover:bg-slate-50/80 cursor-pointer transition-colors duration-150 ${
                            checked ? "bg-blue-50/40" : ""
                          }`}
                        >
                          <td className="px-3 py-2 text-center" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              className="w-4 h-4 rounded border-slate-300 text-[#0077B6] focus:ring-[#0077B6]/25 focus:ring-offset-0 cursor-pointer"
                              checked={checked}
                              onChange={() => toggleThuoc(t)}
                            />
                          </td>
                          <td className="px-2 py-2 font-mono text-[11px] text-slate-500">
                            {t.ma || t.code}
                          </td>
                          <td className="px-3 py-2">
                            <div className="font-semibold text-slate-800">
                              {t.tenDayDu || t.ten || t.tenThuoc}
                            </div>
                            {t.hamLuong && (
                              <div className="text-[10px] font-medium text-slate-400 mt-0.5">
                                {t.hamLuong}
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-2 text-right font-semibold text-slate-700">
                            {fmtVnd(t.donGia || t.giaBan || t.price || t.don_gia)}
                          </td>
                          <td className="px-3 py-2 text-right">
                            <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              (t.soLuongTon || t.stock || t.so_luong_ton || 0) > 0 
                                ? "bg-slate-100 text-slate-600" 
                                : "bg-red-50 text-red-500"
                            }`}>
                              {t.soLuongTon || t.stock || t.so_luong_ton || 0}
                            </span>
                          </td>
                        </tr>
                      );
                    })}

                    {!filteredThuoc.length && (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-4 py-8 text-center text-slate-400 italic"
                        >
                          Không có thuốc phù hợp.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* RIGHT: ĐÃ CHỌN (60%) */}
          <div className="w-[60%] border border-slate-200 bg-white rounded-xl shadow-sm flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 text-xs font-bold text-slate-700 bg-slate-50 border-b border-slate-100">
              <span className="uppercase tracking-wider">Thuốc đã chọn</span>
              <span className="text-[10px] text-[#0077B6] font-semibold bg-[#0077B6]/5 px-2 py-0.5 rounded border border-[#0077B6]/10">
                Lưu ý: số lượng chính xác được xác định tại quầy thu ngân
              </span>
            </div>

            <div className="flex-1 overflow-auto text-xs">
              <table className="min-w-full text-xs">
                <thead className="sticky top-0 bg-slate-50/90 backdrop-blur-sm border-b border-slate-150 z-10">
                  <tr className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                    <th className="w-10 px-2 py-2.5 text-center">#</th>
                    <th className="px-3 py-2.5 text-left">Tên thuốc - Hàm lượng</th>
                    <th className="w-18 px-1 py-2.5 text-center">Số ngày</th>
                    <th className="w-18 px-1 py-2.5 text-center">Lần/ngày</th>
                    <th className="w-18 px-1 py-2.5 text-center">SL/lần</th>
                    <th className="w-20 px-1 py-2.5 text-center">Đơn vị</th>
                    <th className="w-16 px-1 py-2.5 text-center">Số lượng</th>
                    <th className="w-40 px-1 py-2.5 text-left">Cách dùng</th>
                    <th className="w-24 px-1 py-2.5 text-center">Thời điểm</th>
                    <th className="w-24 px-1 py-2.5 text-center">Đường dùng</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedList.map((it, idx) => {
                    const qty = calcSoLuong(it);
                    return (
                      <tr
                        key={it.idThuoc}
                        className="hover:bg-slate-50/50 transition-colors duration-150 bg-white"
                      >
                        <td className="px-2 py-2 align-middle text-center font-mono text-[11px] text-slate-400">
                          {idx + 1}
                        </td>
                        <td className="px-3 py-2 align-middle">
                          <div className="font-semibold text-slate-800 leading-tight">
                            {it.ten}
                          </div>
                          <div className="text-[10px] font-medium text-slate-400 mt-0.5">
                            Mã: {it.ma} • Tồn: {it.soLuongTon}
                          </div>
                          {(it.hoatChat || it.loaiThuoc) && (
                            <div className="text-[10px] text-sky-700 font-semibold mt-0.5">
                              {it.hoatChat ? `Hoạt chất: ${it.hoatChat}` : ""}{it.hoatChat && it.loaiThuoc ? " • " : ""}{it.loaiThuoc || ""}
                            </div>
                          )}
                        </td>

                        <td className="px-1 py-2 align-middle text-center">
                          <input
                            type="number"
                            min={1}
                            className="w-14 h-8 text-center border border-slate-200 focus:border-[#0077B6] focus:ring-2 focus:ring-sky-100 rounded-lg text-xs font-semibold outline-none transition-all"
                            value={it.soNgay ?? ""}
                            onChange={(e) =>
                              updateItemField(
                                it.idThuoc,
                                "soNgay",
                                e.target.value
                              )
                            }
                          />
                        </td>

                        <td className="px-1 py-2 align-middle text-center">
                          <input
                            type="number"
                            min={1}
                            className="w-14 h-8 text-center border border-slate-200 focus:border-[#0077B6] focus:ring-2 focus:ring-sky-100 rounded-lg text-xs font-semibold outline-none transition-all"
                            value={it.lanNgay ?? ""}
                            onChange={(e) =>
                              updateItemField(
                                it.idThuoc,
                                "lanNgay",
                                e.target.value
                              )
                            }
                          />
                        </td>

                        <td className="px-1 py-2 align-middle text-center">
                          <input
                            type="number"
                            min={1}
                            className="w-14 h-8 text-center border border-slate-200 focus:border-[#0077B6] focus:ring-2 focus:ring-sky-100 rounded-lg text-xs font-semibold outline-none transition-all"
                            value={it.slLan ?? ""}
                            onChange={(e) =>
                              updateItemField(
                                it.idThuoc,
                                "slLan",
                                e.target.value
                              )
                            }
                          />
                        </td>

                        <td className="px-1 py-2 align-middle text-center">
                          <input
                            className="w-16 h-8 text-center border border-slate-200 focus:border-[#0077B6] focus:ring-2 focus:ring-sky-100 rounded-lg text-xs font-semibold outline-none transition-all"
                            value={it.donVi || ""}
                            onChange={(e) =>
                              updateItemField(
                                it.idThuoc,
                                "donVi",
                                e.target.value
                              )
                            }
                          />
                        </td>

                        <td className="px-1 py-2 align-middle text-center font-bold text-slate-700 font-mono text-[12px]">
                          {qty}
                        </td>

                        <td className="px-1 py-2 align-middle">
                          <input
                            className="w-full h-8 border border-slate-200 focus:border-[#0077B6] focus:ring-2 focus:ring-sky-100 rounded-lg px-2.5 text-xs outline-none transition-all placeholder-slate-400"
                            placeholder="Ví dụ: Uống sau ăn"
                            value={it.cachDung || ""}
                            onChange={(e) =>
                              updateItemField(
                                it.idThuoc,
                                "cachDung",
                                e.target.value
                              )
                            }
                          />
                        </td>

                        <td className="px-1 py-2 align-middle text-center">
                          <input
                            className="w-full h-8 border border-slate-200 focus:border-[#0077B6] focus:ring-2 focus:ring-sky-100 rounded-lg px-2 text-center text-xs outline-none transition-all placeholder-slate-400"
                            placeholder="Sáng / Tối..."
                            value={it.thoiDiemDung || ""}
                            onChange={(e) =>
                              updateItemField(
                                it.idThuoc,
                                "thoiDiemDung",
                                e.target.value
                              )
                            }
                          />
                        </td>

                        <td className="px-1 py-2 align-middle text-center">
                          <input
                            className="w-full h-8 border border-slate-200 focus:border-[#0077B6] focus:ring-2 focus:ring-sky-100 rounded-lg px-2 text-center text-xs outline-none transition-all placeholder-slate-400"
                            placeholder="Uống / Tiêm..."
                            value={it.duongDung || ""}
                            onChange={(e) =>
                              updateItemField(
                                it.idThuoc,
                                "duongDung",
                                e.target.value
                              )
                            }
                          />
                        </td>
                      </tr>
                    );
                  })}

                  {!selectedList.length && (
                    <tr>
                      <td
                        colSpan={10}
                        className="px-4 py-12 text-center text-slate-400 italic"
                      >
                        Chưa chọn thuốc nào. Hãy chọn từ danh sách bên trái.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* CHECK RESULT / FOOTER */}
        <div className="border-t border-slate-150 px-6 py-4 flex items-center justify-between gap-4 bg-slate-50">
          {/* Panel lỗi / cảnh báo */}
          <div className="flex-1 text-xs max-h-24 overflow-auto">
            {checkResult && (
              <div className="bg-white rounded-lg border border-slate-200 p-2.5 shadow-sm">
                {!!checkResult.errors?.length && (
                  <div className="mb-1.5">
                    <div className="font-bold text-red-600 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Lỗi an toàn:
                    </div>
                    <ul className="list-disc pl-4 text-red-600 font-medium mt-0.5 space-y-0.5">
                      {checkResult.errors.map((e, idx) => (
                        <li key={idx}>{e}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {!!checkResult.warnings?.length && (
                  <div>
                    <div className="font-bold text-amber-600 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                      Cảnh báo:
                    </div>
                    <ul className="list-disc pl-4 text-amber-600 font-medium mt-0.5 space-y-0.5">
                      {checkResult.warnings.map((w, idx) => (
                        <li key={idx}>{w}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {!checkResult.errors?.length &&
                  !checkResult.warnings?.length && (
                    <div className="text-emerald-600 font-bold flex items-center gap-1">
                      <span>✅ Đơn thuốc an toàn.</span>
                    </div>
                  )}
              </div>
            )}
          </div>

          {/* Nút */}
          <div className="flex gap-3 shrink-0">
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl border border-slate-200 bg-white text-slate-600 text-sm font-semibold hover:bg-slate-50 active:bg-slate-100 transition-colors shadow-sm"
            >
              Hủy
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving || checking}
              className="px-6 py-2 rounded-xl bg-gradient-to-r from-sky-600 to-[#0077B6] text-white text-sm font-semibold shadow-md hover:brightness-110 active:opacity-95 disabled:opacity-60 transition-all"
            >
              {saving || checking ? "Đang xử lý..." : "Đồng ý (F4)"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
