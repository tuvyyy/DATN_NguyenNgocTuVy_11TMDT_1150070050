import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  AlertTriangle,
  ArrowLeft,
  Building,
  Calendar,
  CheckCircle2,
  CreditCard,
  FileText,
  Landmark,
  MapPin,
  Printer,
  User,
  Wallet,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import Swal from "sweetalert2";
import { getBillDetail } from "../api/ThuNganApi";
import { handleConfirmPayment, handlePrintReceipt } from "../controllers/ThuNganController";
import MainLayout from "../layouts/MainLayout";

const formatMoney = (value) => `${Number(value || 0).toLocaleString("vi-VN")} đ`;
const formatDate = (value) => (value ? new Date(value).toLocaleString("vi-VN") : "-");
const paymentMethods = [
  { value: "TIEN_MAT", label: "Tiền mặt" },
  { value: "VNPAY", label: "VNPay" },
  { value: "MOMO", label: "MoMo" },
];

export default function ThuNganDetail() {
  const { maHoaDon } = useParams();
  const navigate = useNavigate();
  const [bill, setBill] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("TIEN_MAT");
  const [idThuNgan, setIdThuNgan] = useState(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("userInfo");
      if (!raw) return Swal.fire("Thiếu thông tin", "Vui lòng đăng nhập lại.", "warning");
      const user = JSON.parse(raw);
      const userId = user.userId || user.id;
      if (!userId) return Swal.fire("Không xác định được thu ngân", "Vui lòng đăng nhập lại.", "error");
      setIdThuNgan(userId);
    } catch {
      Swal.fire("Lỗi dữ liệu đăng nhập", "Không thể đọc thông tin người dùng.", "error");
    }
  }, []);

  const loadBill = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getBillDetail(maHoaDon);
      setBill(data);
      if (!data) Swal.fire("Không tìm thấy hóa đơn", `Không có dữ liệu cho mã ${maHoaDon}.`, "warning");
    } catch {
      Swal.fire("Không thể tải hóa đơn", "Vui lòng thử lại sau.", "error");
    } finally {
      setLoading(false);
    }
  }, [maHoaDon]);

  useEffect(() => {
    loadBill();
  }, [loadBill]);

  const isPaid = bill?.trangThai === "DA_THANH_TOAN";
  const canPay = bill?.canThanhToan !== false && !isPaid;
  const details = useMemo(() => bill?.chiTiet || [], [bill]);

  const handleVnPay = async () => {
    try {
      setPaying(true);
      const response = await axios.get("https://localhost:7007/api/Vnpay/CreatePaymentUrl", {
        params: { maHd: bill.maHd, amount: bill.tongTien },
      });
      window.location.href = response.data.paymentUrl || response.data;
    } catch {
      setPaying(false);
      Swal.fire("Không thể tạo thanh toán VNPay", "Vui lòng thử lại hoặc chọn phương thức khác.", "error");
    }
  };

  const processPayment = async () => {
    const confirmation = await Swal.fire({
      title: "Xác nhận thanh toán",
      html: `Thu số tiền:<br/><strong style="font-size: 2.25rem; font-weight: 900; color: #15803d; display: block; margin: 12px 0; font-family: monospace;">${formatMoney(bill.tongTien)}</strong> bằng phương thức <b>${
        paymentMethods.find((item) => item.value === paymentMethod)?.label
      }</b>?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Xác nhận thu",
      cancelButtonText: "Quay lại",
      confirmButtonColor: "#059669",
    });
    if (!confirmation.isConfirmed) return;

    try {
      setPaying(true);
      const result = await handleConfirmPayment(bill.maHd, idThuNgan, paymentMethod);
      const queueText = result?.queueCreated
        ? ` Đã cập nhật ${result.queueTicketCount || 0} lượt trong hàng đợi khám.`
        : "";
      await Swal.fire("Thanh toán thành công", `Hóa đơn đã được thanh toán.${queueText}`, "success");
      await loadBill();
    } catch (error) {
      Swal.fire(
        "Thanh toán không thành công",
        error?.response?.data?.message || error?.response?.data?.Message || "Vui lòng kiểm tra và thử lại.",
        "error"
      );
    } finally {
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex h-full items-center justify-center bg-slate-50 text-slate-500 font-semibold">
          Đang tải thông tin hóa đơn...
        </div>
      </MainLayout>
    );
  }

  if (!bill) {
    return (
      <MainLayout>
        <div className="flex h-full flex-col items-center justify-center bg-slate-50 text-slate-600">
          <AlertTriangle size={34} className="mb-3 text-amber-500" />
          <p className="font-bold">Không tìm thấy hóa đơn {maHoaDon}</p>
          <button
            type="button"
            onClick={() => navigate("/thu-ngan")}
            className="mt-4 rounded-lg bg-sky-600 px-4 py-2 font-bold text-white transition hover:bg-sky-700 shadow-sm"
          >
            Quay lại danh sách
          </button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="flex h-full min-h-0 flex-col overflow-hidden bg-slate-50 text-slate-800">
        <header className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-200 bg-white px-6 py-4 shadow-sm">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => navigate("/thu-ngan")}
              className="rounded-lg border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50 hover:border-slate-350"
              title="Quay lại danh sách"
            >
              <ArrowLeft size={18} />
            </button>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="truncate text-xl font-bold text-slate-900 tracking-tight">Chi tiết hóa đơn</h1>
                <StatusBadge paid={isPaid} />
              </div>
              <p className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-slate-400">
                Mã hệ thống: <span className="font-mono font-bold text-[#0077B6] bg-[#0077B6]/5 px-2 py-0.5 rounded border border-[#0077B6]/15">{bill.maHd}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => handlePrintReceipt(bill.maHd)}
            className="inline-flex items-center gap-2 rounded-lg bg-[#0077B6] px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-[#005F92]"
          >
            <Printer size={16} /> In phiếu thu
          </button>
        </header>

        <div className="grid min-h-0 flex-1 grid-cols-12 gap-5 p-5">
          <section className="col-span-12 flex min-h-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white xl:col-span-8 shadow-sm">
            <div className="shrink-0 bg-slate-50/50 border-b border-slate-200 p-5">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="h-12 w-12 rounded-full bg-[#0077B6]/10 text-[#0077B6] flex items-center justify-center font-bold text-lg border border-[#0077B6]/20">
                    <User size={22} className="stroke-[2.5]" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 leading-none mb-1">Bệnh nhân</p>
                    <p className="text-lg font-black text-slate-900 leading-tight">{bill.benhNhan || "-"}</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-6 text-sm">
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1"><Calendar size={11} /> Ngày tạo</p>
                    <p className="mt-1 font-semibold text-slate-800 truncate">{formatDate(bill.ngayTao)}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1"><Building size={11} /> Phòng khám</p>
                    <p className="mt-1 font-semibold text-[#0077B6] truncate">{bill.phongKham || "Chưa xác định"}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1"><MapPin size={11} /> Khu tiếp đón</p>
                    <p className="mt-1 font-semibold text-slate-800 truncate" title={bill.tenKhuTiepDon || bill.maKhuTiepDon}>{bill.tenKhuTiepDon || bill.maKhuTiepDon || "Chưa có khu"}</p>
                  </div>
                </div>
              </div>
            </div>

            {bill.canThanhToan === false && (
              <div className="mx-5 mt-4 flex shrink-0 items-start gap-3 rounded-lg border-l-4 border-rose-500 bg-rose-50/50 p-4 text-sm text-rose-800 shadow-sm">
                <AlertTriangle size={18} className="shrink-0 text-rose-500 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold text-rose-900">Không thể thực hiện thanh toán</p>
                  <p className="text-rose-700 leading-relaxed font-medium">{bill.lyDoKhongThanhToan || "Thông tin dịch vụ hoặc phòng chưa khớp khu tiếp đón. Vui lòng kiểm tra trước khi thu tiền."}</p>
                </div>
              </div>
            )}

            <div className="flex h-12 shrink-0 items-center justify-between px-5 bg-slate-50/50 border-b border-slate-200 mt-2">
              <h2 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <FileText size={16} className="text-slate-400" />
                Nội dung chi phí chỉ định
              </h2>
              <span className="text-xs font-bold text-[#0077B6] bg-[#0077B6]/10 border border-[#0077B6]/15 px-2.5 py-0.5 rounded-full">{details.length} khoản</span>
            </div>
            <div className="min-h-0 flex-1 overflow-auto">
              <table className="min-w-full text-sm">
                <thead className="sticky top-0 z-10 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-3 text-left">Nội dung chỉ định</th>
                    <th className="px-5 py-3 text-left">Phòng / Khu thực hiện</th>
                    <th className="w-20 px-5 py-3 text-center">SL</th>
                    <th className="w-36 px-5 py-3 text-right">Đơn giá</th>
                    <th className="w-36 px-5 py-3 text-right">Thành tiền</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {details.length ? details.map((item, index) => {
                    const isInvalid = item.khuHopLe === false;
                    return (
                      <tr 
                        key={item.id || index} 
                        className={`transition-colors border-b border-slate-100 last:border-0 ${
                          isInvalid 
                            ? "bg-rose-50/40 hover:bg-rose-50/60" 
                            : "hover:bg-slate-50/50"
                        }`}
                      >
                        <td className="px-5 py-4">
                          <p className="font-bold text-slate-900">{item.moTa || "-"}</p>
                        </td>
                        <td className="px-5 py-4">
                          <p className="font-semibold text-slate-700">{item.tenPhong || "-"}</p>
                          <p className={`mt-0.5 text-xs flex items-center gap-1 ${isInvalid ? "font-bold text-rose-600" : "text-slate-400 font-semibold"}`}>
                            <MapPin size={10} className="shrink-0" />
                            {item.tenKhuTiepDon || item.maKhuTiepDon || "Chưa có khu"}
                          </p>
                          {isInvalid && item.lyDoKhongHopLe && (
                            <span className="mt-1.5 inline-block text-[10px] font-bold bg-rose-100 text-rose-800 px-2 py-0.5 rounded border border-rose-200">
                              {item.lyDoKhongHopLe}
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-center font-mono font-bold text-slate-600">{item.soLuong}</td>
                        <td className="px-5 py-4 text-right font-mono font-semibold text-slate-600 text-sm">{formatMoney(item.donGia)}</td>
                        <td className="px-5 py-4 text-right font-mono font-black text-slate-900 text-base">{formatMoney(item.thanhTien)}</td>
                      </tr>
                    );
                  }) : <tr><td colSpan={5} className="py-12 text-center text-slate-400 font-semibold">Hóa đơn chưa có nội dung thanh toán.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>

          <aside className="col-span-12 flex min-h-0 flex-col overflow-auto rounded-xl border border-slate-200 bg-white xl:col-span-4 shadow-sm">
            <div className="relative overflow-hidden bg-gradient-to-br from-[#0077B6] to-[#005F9E] p-6 text-white border-b border-slate-200 shadow-inner">
              <div className="absolute -right-10 -bottom-10 h-32 w-32 rounded-full bg-white/5 pointer-events-none" />
              <div className="absolute right-10 -top-10 h-24 w-24 rounded-full bg-white/5 pointer-events-none" />
              
              <p className="text-[11px] font-extrabold uppercase tracking-wider text-white/70">Tổng tiền cần thu</p>
              <p className="mt-2 text-5xl font-black text-yellow-300 tracking-tight drop-shadow-md font-mono leading-none">{formatMoney(bill.tongTien)}</p>
              
              <div className="mt-5 grid grid-cols-2 gap-4 border-t border-white/10 pt-4 text-xs font-semibold">
                <div>
                  <p className="text-white/60 text-[10px] uppercase font-bold tracking-wider">Hàng đợi khám</p>
                  <span className={`mt-1.5 inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-bold ${
                    bill.queueCreated 
                      ? "bg-emerald-500/20 text-emerald-200 border border-emerald-500/30" 
                      : "bg-white/10 text-white/80 border border-white/10"
                  }`}>
                    {bill.queueCreated ? "Đã tạo lượt" : "Chưa tạo"}
                  </span>
                </div>
                <div>
                  <p className="text-white/60 text-[10px] uppercase font-bold tracking-wider">Ngày thanh toán</p>
                  <p className="mt-1.5 font-bold text-white/95">{formatDate(bill.ngayThanhToan)}</p>
                </div>
              </div>
            </div>

            <div className="flex-1 p-5 space-y-5">
              <div>
                <h2 className="font-bold text-slate-800 text-sm tracking-tight flex items-center gap-2">
                  <CreditCard size={15} className="text-slate-400" />
                  Phương thức thanh toán
                </h2>
                
                <div className="mt-3 flex flex-col gap-2">
                  {paymentMethods.map((method) => {
                    const isSelected = paymentMethod === method.value;
                    let methodIcon = <Wallet size={16} />;
                    
                    if (method.value === "TIEN_MAT") {
                      methodIcon = <Landmark size={16} />;
                    } else if (method.value === "VNPAY") {
                      methodIcon = <CreditCard size={16} />;
                    } else if (method.value === "MOMO") {
                      methodIcon = <Wallet size={16} />;
                    }
                    
                    return (
                      <button 
                        key={method.value} 
                        type="button" 
                        disabled={isPaid} 
                        onClick={() => setPaymentMethod(method.value)} 
                        className={`flex items-center justify-between w-full p-3 rounded-lg border text-sm font-semibold transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-60 ${
                          isSelected 
                            ? "border-[#0077B6] bg-[#0077B6]/5 text-[#0077B6] font-bold shadow-sm" 
                            : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-350"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className={`p-1.5 rounded-md ${
                            isSelected 
                              ? "bg-[#0077B6]/15 text-[#0077B6]" 
                              : "bg-slate-100 text-slate-500"
                          }`}>
                            {methodIcon}
                          </span>
                          <span>{method.label}</span>
                        </div>
                        {isSelected && <span className="h-2 w-2 rounded-full bg-[#0077B6] mr-1" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {isPaid ? (
                <div className="flex items-start gap-3 rounded-lg border border-emerald-150 bg-emerald-50/50 p-4 text-sm text-emerald-800 font-semibold shadow-sm">
                  <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-600" />
                  <div className="space-y-0.5">
                    <p className="text-emerald-900 font-bold">Giao dịch đã hoàn tất</p>
                    <p className="text-emerald-700 text-xs font-medium">Hóa đơn đã được thanh toán đầy đủ. Bạn có thể in lại phiếu thu bất cứ lúc nào.</p>
                  </div>
                </div>
              ) : bill.canThanhToan === false ? (
                <div className="flex items-start gap-3 rounded-lg border border-rose-150 bg-rose-50/50 p-4 text-sm text-rose-800 font-semibold shadow-sm">
                  <AlertTriangle size={18} className="mt-0.5 shrink-0 text-rose-500" />
                  <div className="space-y-0.5">
                    <p className="text-rose-900 font-bold">Chưa thể thực hiện giao dịch</p>
                    <p className="text-rose-700 text-xs font-medium">Cần xử lý cảnh báo khu/phòng khám hợp lệ của các dịch vụ ở bảng chi tiết trước khi thu tiền.</p>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg bg-slate-50 border border-slate-100 p-4 text-xs leading-relaxed text-slate-400 font-medium">
                  <p className="font-bold text-slate-500 mb-1 uppercase tracking-wider text-[10px]">Hướng dẫn thu ngân</p>
                  Vui lòng xác nhận đúng số tiền thực nhận từ khách hàng trùng khớp với hóa đơn trước khi tiến hành xác nhận giao dịch.
                </div>
              )}
            </div>

            <div className="shrink-0 border-t border-slate-200 p-5 bg-slate-50/50">
              <button 
                type="button" 
                disabled={!canPay || paying || !idThuNgan} 
                onClick={paymentMethod === "VNPAY" ? handleVnPay : processPayment} 
                className={`inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl font-bold text-white transition-all duration-200 shadow-md ${
                  isPaid 
                    ? "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none"
                    : !canPay 
                      ? "bg-slate-100 text-slate-400 cursor-not-allowed shadow-none"
                      : "bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99]"
                }`}
              >
                {paying ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>Đang xử lý...</span>
                  </>
                ) : isPaid ? (
                  <>
                    <CheckCircle2 size={18} />
                    <span>Đã thanh toán</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={18} />
                    <span>Xác nhận thu {paymentMethods.find((item) => item.value === paymentMethod)?.label}</span>
                  </>
                )}
              </button>
            </div>
          </aside>
        </div>
      </div>
    </MainLayout>
  );
}

function StatusBadge({ paid }) {
  return paid ? (
    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-bold text-emerald-700">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
      Đã thanh toán
    </span>
  ) : (
    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-xs font-bold text-amber-700">
      <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
      Chưa thanh toán
    </span>
  );
}
