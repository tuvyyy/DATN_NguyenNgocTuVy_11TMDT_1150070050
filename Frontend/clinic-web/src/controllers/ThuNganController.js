import Swal from "sweetalert2";
import { confirmPayment, getReceipt, getWaitingPatients } from "../api/ThuNganApi";

export async function loadWaitingPatients(type, setList) {
  const data = await getWaitingPatients(type);
  setList(Array.isArray(data) ? data : []);
}

export const handleViewBill = (maHoaDon, navigate) => {
  if (!maHoaDon) return;
  navigate(`/thu-ngan/detail/${encodeURIComponent(maHoaDon)}`);
};

export const handleConfirmPayment = async (maHd, idThuNgan, paymentMethod) => {
  if (!idThuNgan) throw new Error("Thiếu thông tin thu ngân. Vui lòng đăng nhập lại.");
  return confirmPayment(maHd, idThuNgan, paymentMethod);
};

const escapeHtml = (value) => String(value ?? "")
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");

const formatMoney = (value) => `${Number(value || 0).toLocaleString("vi-VN")} đ`;
const formatDate = (value) => value ? new Date(value).toLocaleString("vi-VN") : "Chưa cập nhật";

export async function handlePrintReceipt(maHoaDon) {
  const printWindow = window.open("", "_blank", "width=900,height=900");
  if (!printWindow) {
    await Swal.fire("Không thể mở cửa sổ in", "Vui lòng cho phép popup đối với trang này rồi thử lại.", "warning");
    return;
  }

  printWindow.document.write("<p style='font-family:Arial;padding:24px'>Đang chuẩn bị phiếu thu...</p>");

  const data = await getReceipt(maHoaDon);
  if (!data) {
    printWindow.close();
    await Swal.fire("Không thể in phiếu thu", "Chưa có dữ liệu phiếu thu cho hóa đơn này.", "error");
    return;
  }

  const details = Array.isArray(data.chiTiet) ? data.chiTiet : [];
  const rows = details.map((item, index) => `
    <tr>
      <td class="center">${index + 1}</td>
      <td><strong>${escapeHtml(item.moTa || "Dịch vụ")}</strong>${item.tenPhong ? `<div class="sub">${escapeHtml(item.tenPhong)}${item.tenKhuTiepDon ? ` · ${escapeHtml(item.tenKhuTiepDon)}` : ""}</div>` : ""}</td>
      <td class="center">${escapeHtml(item.soLuong)}</td>
      <td class="money">${escapeHtml(formatMoney(item.donGia))}</td>
      <td class="money"><strong>${escapeHtml(formatMoney(item.thanhTien))}</strong></td>
    </tr>
  `).join("");

  const logoUrl = `${window.location.origin}/logo-clinic.svg`;
  const html = `<!doctype html>
  <html lang="vi">
    <head>
      <meta charset="utf-8" />
      <title>Phiếu thu ${escapeHtml(data.maHd)}</title>
      <style>
        @page { size: A5 portrait; margin: 12mm; }
        * { box-sizing: border-box; }
        body { margin: 0; color: #0f172a; font-family: Arial, "Helvetica Neue", sans-serif; font-size: 12px; line-height: 1.45; }
        .receipt { width: 100%; }
        .clinic { display: flex; align-items: center; gap: 10px; padding-bottom: 10px; border-bottom: 2px solid #0284c7; }
        .logo { width: 42px; height: 42px; object-fit: contain; }
        .clinic-name { margin: 0; font-size: 16px; color: #075985; text-transform: uppercase; }
        .clinic-info { margin-top: 2px; color: #475569; font-size: 10px; }
        .title { margin: 18px 0 2px; text-align: center; font-size: 22px; letter-spacing: .5px; }
        .receipt-code { text-align: center; color: #475569; margin-bottom: 16px; }
        .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 7px 20px; margin-bottom: 14px; }
        .meta-item { border-bottom: 1px dotted #cbd5e1; padding-bottom: 4px; }
        .label { color: #64748b; font-size: 10px; text-transform: uppercase; }
        .value { margin-top: 2px; font-weight: 600; }
        table { width: 100%; border-collapse: collapse; }
        th { padding: 7px 6px; background: #e0f2fe; color: #075985; font-size: 10px; text-align: left; text-transform: uppercase; border: 1px solid #bae6fd; }
        td { padding: 7px 6px; vertical-align: top; border: 1px solid #cbd5e1; }
        .center { text-align: center; }
        .money { text-align: right; white-space: nowrap; }
        .sub { margin-top: 2px; color: #64748b; font-size: 10px; }
        .total { display: flex; justify-content: flex-end; align-items: baseline; gap: 18px; margin-top: 10px; padding: 10px 0; border-top: 1px solid #94a3b8; border-bottom: 1px solid #94a3b8; }
        .total-label { font-weight: 700; text-transform: uppercase; }
        .total-value { font-size: 26px; font-weight: 900; color: #000; }
        .note { margin-top: 9px; color: #64748b; font-size: 10px; font-style: italic; }
        .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 50px; margin-top: 20px; text-align: center; }
        .signature-title { font-weight: 700; }
        .signature-note { color: #64748b; font-size: 10px; font-style: italic; }
        .signature-space { height: 54px; }
        .footer { margin-top: 12px; padding-top: 7px; border-top: 1px solid #e2e8f0; color: #94a3b8; font-size: 9px; text-align: center; }
        @media print { body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
      </style>
    </head>
    <body>
      <main class="receipt">
        <header class="clinic">
          <img class="logo" src="${escapeHtml(logoUrl)}" alt="Logo" />
          <div><h1 class="clinic-name">TIUV Clinic</h1><div class="clinic-info">Hệ thống quản lý phòng khám · Hotline: 036 887 8419</div></div>
        </header>
        <h2 class="title">PHIẾU THU</h2>
        <div class="receipt-code">Số: <strong>${escapeHtml(data.maHd)}</strong></div>
        <section class="meta">
          <div class="meta-item"><div class="label">Người nộp tiền</div><div class="value">${escapeHtml(data.tenBenhNhan || "-")}</div></div>
          <div class="meta-item"><div class="label">Ngày thu</div><div class="value">${escapeHtml(formatDate(data.ngayThu || data.ngayThanhToan))}</div></div>
          <div class="meta-item"><div class="label">Loại hóa đơn</div><div class="value">${escapeHtml(data.loaiHoaDon || "-")}</div></div>
          <div class="meta-item"><div class="label">Khu / Phòng</div><div class="value">${escapeHtml([data.khuTiepDon, data.phongKham].filter(Boolean).join(" · ") || "-")}</div></div>
        </section>
        <table><thead><tr><th class="center">STT</th><th>Nội dung thu</th><th class="center">SL</th><th class="money">Đơn giá</th><th class="money">Thành tiền</th></tr></thead><tbody>${rows || '<tr><td colspan="5" class="center">Không có chi tiết</td></tr>'}</tbody></table>
        <div class="total"><span class="total-label">Tổng cộng</span><span class="total-value">${escapeHtml(formatMoney(data.tongTien))}</span></div>
        <div class="note">Phiếu được lập từ hệ thống. Vui lòng kiểm tra thông tin trước khi rời quầy.</div>
        <section class="signatures"><div><div class="signature-title">Người nộp tiền</div><div class="signature-note">Ký và ghi rõ họ tên</div><div class="signature-space"></div></div><div><div class="signature-title">Thu ngân</div><div class="signature-note">Ký và ghi rõ họ tên</div><div class="signature-space"></div></div></section>
        <footer class="footer">TIUV Clinic · ${escapeHtml(data.maHd)} · In lúc ${escapeHtml(new Date().toLocaleString("vi-VN"))}</footer>
      </main>
    </body>
  </html>`;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => printWindow.print(), 400);
}
