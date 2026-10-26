using ThucTapTotNghiep_1150070050_NguyenNgocTuVy.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using ThucTapTotNghiep_1150070050_NguyenNgocTuVy.Data;
using VNPAY.NET;
using VNPAY.NET.Enums;
using VNPAY.NET.Models;
using VNPAY.NET.Utilities;

namespace ThucTapTotNghiep_1150070050_NguyenNgocTuVy.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class VnpayController : ControllerBase
    {
        private readonly IVnpay _vnpay;
        private readonly IConfiguration _config;
        private readonly IHoaDonService _hoaDonService;
        private readonly DACNDbContext _db;


        public VnpayController(IConfiguration config, IHoaDonService hoaDonService, DACNDbContext db)
        {
            _config = config;
            _hoaDonService = hoaDonService;
            _db = db;

            _vnpay = new Vnpay();

            _vnpay.Initialize(
                _config["Vnpay:TmnCode"],
                _config["Vnpay:HashSecret"],
                _config["Vnpay:BaseUrl"],
                _config["Vnpay:CallbackUrl"]
            );
        }

        [HttpGet("CreatePaymentUrl")]
        [Authorize]
        public async Task<IActionResult> CreatePaymentUrl(string maHd, double? amount = null)
        {
            if (string.IsNullOrWhiteSpace(maHd))
                return BadRequest(new { message = "Thiếu mã hóa đơn." });

            var invoice = await _db.HoaDons.FirstOrDefaultAsync(x => x.MaHd == maHd);
            if (invoice == null)
                return NotFound(new { message = "Không tìm thấy hóa đơn." });
            if (string.Equals(invoice.TrangThai, "DA_THANH_TOAN", StringComparison.OrdinalIgnoreCase))
                return Conflict(new { message = "Hóa đơn đã thanh toán." });
            if (string.Equals(invoice.TrangThai, "DANG_THANH_TOAN", StringComparison.OrdinalIgnoreCase))
                return Conflict(new
                {
                    message = "Hóa đơn đang có giao dịch VNPay chờ kết quả. Vui lòng hủy giao dịch đang chờ trước khi tạo giao dịch mới.",
                    state = "PAYMENT_TRANSACTION_PENDING"
                });
            if (string.Equals(invoice.TrangThai, "HUY", StringComparison.OrdinalIgnoreCase))
                return Conflict(new { message = "Hóa đơn đã hủy, không thể tạo giao dịch." });
            if (!invoice.TongTien.HasValue || invoice.TongTien.Value <= 0)
                return BadRequest(new { message = "Hóa đơn không có số tiền hợp lệ để thanh toán." });

            var ip = NetworkHelper.GetIpAddress(HttpContext);
            var paymentId = DateTime.Now.Ticks;

            var request = new PaymentRequest
            {
                PaymentId = paymentId,
                Money = Convert.ToDouble(invoice.TongTien.Value),
                Description = $"Thanh toán hóa đơn {maHd}",
                IpAddress = ip,
                BankCode = BankCode.ANY,
                Currency = Currency.VND,
                Language = DisplayLanguage.Vietnamese
            };

            var url = _vnpay.GetPaymentUrl(request);
            invoice.HinhThucTt = "VNPAY";
            invoice.MaGiaoDichVnpay = paymentId.ToString();
            invoice.TrangThai = "DANG_THANH_TOAN";
            await _db.SaveChangesAsync();

            return Ok(new { paymentUrl = url, transactionId = paymentId, amount = invoice.TongTien.Value });
        }

        [HttpPatch("CancelPending/{maHd}")]
        [Authorize]
        public async Task<IActionResult> CancelPending(string maHd)
        {
            var invoice = await _db.HoaDons.FirstOrDefaultAsync(x => x.MaHd == maHd);
            if (invoice == null)
                return NotFound(new { message = "Không tìm thấy hóa đơn." });
            if (!string.Equals(invoice.TrangThai, "DANG_THANH_TOAN", StringComparison.OrdinalIgnoreCase))
                return Conflict(new { message = "Hóa đơn không có giao dịch VNPay đang chờ để hủy." });

            invoice.TrangThai = "CHO_THANH_TOAN";
            invoice.HinhThucTt = null;
            invoice.MaGiaoDichVnpay = null;
            await _db.SaveChangesAsync();

            return Ok(new { message = "Đã hủy giao dịch VNPay đang chờ. Hóa đơn có thể được thanh toán lại." });
        }

        [HttpGet("Callback")]
        [AllowAnonymous]
        public async Task<IActionResult> Callback()
        {
            try
            {
                var result = _vnpay.GetPaymentResult(Request.Query);

                string maHd = result.Description
                    .Replace("Thanh toán hóa đơn", "")
                    .Trim();

                var callbackTransactionId = Request.Query["vnp_TxnRef"].ToString();
                var invoice = await _db.HoaDons.FirstOrDefaultAsync(x => x.MaHd == maHd);
                var isCurrentTransaction = invoice != null
                    && string.Equals(invoice.TrangThai, "DANG_THANH_TOAN", StringComparison.OrdinalIgnoreCase)
                    && !string.IsNullOrWhiteSpace(callbackTransactionId)
                    && string.Equals(invoice.MaGiaoDichVnpay, callbackTransactionId, StringComparison.Ordinal);

                if (!result.IsSuccess)
                {
                    if (isCurrentTransaction)
                    {
                        invoice!.TrangThai = "CHO_THANH_TOAN";
                        invoice.HinhThucTt = null;
                        invoice.MaGiaoDichVnpay = null;
                        await _db.SaveChangesAsync();
                    }
                    return Redirect("http://localhost:3000/payment-failed");
                }

                if (!isCurrentTransaction)
                {
                    return BadRequest(new
                    {
                        message = "Callback VNPay không khớp với giao dịch đang chờ của hóa đơn."
                    });
                }

                // Cập nhật hóa đơn
                if (!_hoaDonService.UpdateDaThanhToan(maHd))
                    return BadRequest(new { message = "Không thể cập nhật trạng thái thanh toán hóa đơn." });

                // Redirect về FE
                return Redirect($"http://localhost:3000/thu-ngan/detail/{maHd}?success=1");
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }


    }
}
