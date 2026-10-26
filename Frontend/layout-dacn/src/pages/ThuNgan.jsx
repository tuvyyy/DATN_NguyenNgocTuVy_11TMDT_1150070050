import React, { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, MapPin, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { handleViewBill, loadWaitingPatients } from "../controllers/ThuNganController";
import MainLayout from "../layouts/MainLayout";

const getPatientName = (item) => item?.hoTen || item?.benhNhan || "-";
const getBillCode = (item) => item?.maHoaDon || item?.maHd || "";
const getAreaName = (item) => item?.tenKhuTiepDon || item?.maKhuTiepDon || "Chưa có khu";
const getRoomName = (item) => item?.phongKham || "Chưa xác định";
const formatMoney = (value) => `${Number(value || 0).toLocaleString("vi-VN")} đ`;
const formatDate = (value) => value ? new Date(value).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" }) : "-";
const toDateInput = (value) => {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
};
const invoiceTypeLabels = {
  KHAM: "Khám bệnh",
  DANG_KY_DICH_VU: "Phiếu dịch vụ",
  DVKT: "Dịch vụ kỹ thuật",
  THUOC: "Thuốc",
};
const controlClass = "h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition-all duration-200 hover:border-slate-350 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 shadow-sm";

export default function ThuNgan() {
  const [patients, setPatients] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [status, setStatus] = useState("TAT_CA");
  const [type, setType] = useState("TAT_CA");
  const [area, setArea] = useState("TAT_CA");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    setLoading(true);
    loadWaitingPatients("", (data) => {
      setPatients(data);
      setLoading(false);
    });
  }, []);

  const areaOptions = useMemo(() => Array.from(new Map(patients.map((item) => [
    item.idKhuTiepDon || "UNMAPPED",
    { id: item.idKhuTiepDon || "UNMAPPED", name: getAreaName(item) },
  ])).values()), [patients]);

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLocaleLowerCase("vi-VN");
    return patients.filter((item) => {
      const matchesSearch = !term || [getPatientName(item), getBillCode(item), item.soDienThoai]
        .some((value) => value?.toLocaleLowerCase("vi-VN").includes(term));
      const matchesStatus = status === "TAT_CA"
        || (status === "CHUA_THANH_TOAN" ? ["CHUA_THANH_TOAN", "TAO"].includes(item.trangThai) : item.trangThai === status);
      const matchesType = type === "TAT_CA" || item.loaiHoaDon === type;
      const matchesArea = area === "TAT_CA" || String(item.idKhuTiepDon || "UNMAPPED") === area;
      const itemDate = toDateInput(item.ngayTao);
      return matchesSearch && matchesStatus && matchesType && matchesArea
        && (!dateFrom || itemDate >= dateFrom) && (!dateTo || itemDate <= dateTo);
    });
  }, [area, dateFrom, dateTo, patients, searchTerm, status, type]);

  const stats = useMemo(() => ({
    total: patients.length,
    unpaid: patients.filter((item) => item.trangThai !== "DA_THANH_TOAN").length,
    paid: patients.filter((item) => item.trangThai === "DA_THANH_TOAN").length,
    blocked: patients.filter((item) => item.canThanhToan === false && item.trangThai !== "DA_THANH_TOAN").length,
  }), [patients]);

  const openInvoice = useCallback((item) => handleViewBill(getBillCode(item), navigate), [navigate]);

  return (
    <MainLayout>
      <div className="flex h-full min-h-0 flex-col overflow-hidden bg-slate-50 text-slate-800">
        <header className="shrink-0 border-b border-slate-200 bg-white px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">Quản lý thu ngân</h1>
              <p className="mt-1 text-sm text-slate-400">Chọn trực tiếp một dòng để xem và xử lý hóa đơn.</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Stat label="Tổng hóa đơn" value={stats.total} tone="text-slate-800" borderTone="border-t-sky-500" />
              <Stat label="Chưa thanh toán" value={stats.unpaid} tone="text-amber-600" borderTone="border-t-amber-500" />
              <Stat label="Đã thanh toán" value={stats.paid} tone="text-emerald-600" borderTone="border-t-emerald-500" />
              <Stat label="Cần kiểm tra" value={stats.blocked} tone="text-rose-600" borderTone="border-t-rose-500" />
            </div>
          </div>

          <div className="mt-4 grid grid-cols-12 gap-2">
            <div className="relative col-span-12 lg:col-span-4">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} className={`${controlClass} pl-9`} placeholder="Tìm mã hóa đơn, người bệnh, số điện thoại..." />
            </div>
            <select value={status} onChange={(event) => setStatus(event.target.value)} className={`${controlClass} col-span-6 lg:col-span-2`}>
              <option value="TAT_CA">Tất cả trạng thái</option>
              <option value="CHUA_THANH_TOAN">Chưa thanh toán</option>
              <option value="DA_THANH_TOAN">Đã thanh toán</option>
            </select>
            <select value={type} onChange={(event) => setType(event.target.value)} className={`${controlClass} col-span-6 lg:col-span-2`}>
              <option value="TAT_CA">Tất cả loại hóa đơn</option>
              <option value="KHAM">Khám bệnh</option>
              <option value="DANG_KY_DICH_VU">Phiếu dịch vụ</option>
              <option value="DVKT">Dịch vụ kỹ thuật</option>
              <option value="THUOC">Thuốc</option>
            </select>
            <select value={area} onChange={(event) => setArea(event.target.value)} className={`${controlClass} col-span-6 lg:col-span-2`}>
              <option value="TAT_CA">Tất cả khu</option>
              {areaOptions.map((item) => <option key={item.id} value={String(item.id)}>{item.name}</option>)}
            </select>
            <div className="col-span-6 grid grid-cols-2 gap-2 lg:col-span-2">
              <input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} className={controlClass} title="Từ ngày" />
              <input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} className={controlClass} title="Đến ngày" />
            </div>
          </div>
        </header>

        <section className="min-h-0 flex-1 p-4">
          <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex h-12 shrink-0 items-center justify-between border-b border-slate-200 px-4 bg-slate-50/50">
              <h2 className="font-bold text-slate-800 text-sm">Danh sách hóa đơn</h2>
              <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">{filtered.length} kết quả</span>
            </div>
            <div className="min-h-0 flex-1 overflow-auto">
              <table className="min-w-full text-sm">
                <thead className="sticky top-0 z-10 bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left">Mã hóa đơn</th>
                    <th className="px-4 py-3 text-left">Người bệnh</th>
                    <th className="px-4 py-3 text-left">Liên hệ</th>
                    <th className="px-4 py-3 text-left">Phòng / Khu</th>
                    <th className="px-4 py-3 text-left">Loại</th>
                    <th className="px-4 py-3 text-right">Tổng tiền</th>
                    <th className="px-4 py-3 text-left">Ngày tạo</th>
                    <th className="px-4 py-3 text-left">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? Array.from({ length: 9 }).map((_, index) => (
                    <tr key={index}>
                      {Array.from({ length: 8 }).map((__, cell) => (
                        <td key={cell} className="px-4 py-3.5"><span className="app-skeleton-line block h-3.5 w-full" /></td>
                      ))}
                    </tr>
                  ))
                    : filtered.length ? filtered.map((item) => (
                      <tr 
                        key={getBillCode(item)} 
                        tabIndex={0} 
                        role="link" 
                        onClick={() => openInvoice(item)} 
                        onKeyDown={(event) => { if (["Enter", " "].includes(event.key)) { event.preventDefault(); openInvoice(item); } }} 
                        className={`cursor-pointer outline-none transition-colors duration-150 hover:bg-sky-50/40 focus:bg-sky-50/40 ${
                          item.canThanhToan === false ? "bg-rose-50/30 hover:bg-rose-50/50" : ""
                        }`}
                      >
                        <td className="px-4 py-3.5 font-bold text-sky-700">{getBillCode(item)}</td>
                        <td className="px-4 py-3.5 font-semibold text-slate-900">{getPatientName(item)}</td>
                        <td className="px-4 py-3.5 text-slate-500 font-medium">{item.soDienThoai || "-"}</td>
                        <td className="px-4 py-3.5">
                          <p className="font-semibold text-slate-700">{getRoomName(item)}</p>
                          <p className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400">
                            <MapPin size={10} />{getAreaName(item)}
                          </p>
                        </td>
                        <td className="px-4 py-3.5 text-slate-500 font-medium">{invoiceTypeLabels[item.loaiHoaDon] || item.loaiHoaDon || "-"}</td>
                        <td className="px-4 py-3.5 text-right font-mono text-base font-extrabold text-slate-950">{formatMoney(item.tongTien)}</td>
                        <td className="px-4 py-3.5 whitespace-nowrap text-slate-500 font-medium">{formatDate(item.ngayTao)}</td>
                        <td className="px-4 py-3.5"><InvoiceStatus item={item} /></td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={8} className="p-10 text-center text-slate-400 font-semibold">
                          Không có hóa đơn phù hợp với bộ lọc.
                        </td>
                      </tr>
                    )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </MainLayout>
  );
}

function Stat({ label, value, tone, borderTone }) {
  return (
    <div className={`relative min-w-[180px] bg-white border border-slate-200 border-t-4 ${borderTone} rounded-xl px-5 py-3 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md`}>
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
      <p className={`mt-1.5 text-2xl font-extrabold leading-none ${tone}`}>{value}</p>
    </div>
  );
}

function InvoiceStatus({ item }) {
  if (item.trangThai === "DANG_THANH_TOAN") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 border border-sky-100 px-2.5 py-0.5 text-xs font-semibold text-sky-700">
        Đang chờ QR/VNPay
      </span>
    );
  }
  if (item.canThanhToan === false && item.trangThai !== "DA_THANH_TOAN") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 border border-rose-100 px-2.5 py-0.5 text-xs font-semibold text-rose-600" title={item.lyDoKhongThanhToan}>
        <AlertTriangle size={12} />Cần kiểm tra
      </span>
    );
  }
  if (item.trangThai === "DA_THANH_TOAN") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-600">
        <CheckCircle2 size={12} />Đã thanh toán
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-600">
      Chưa thanh toán
    </span>
  );
}
