using DACN_QLPK_1150070050_NguyenNgocTuVy.Data;
using DACN_QLPK_1150070050_NguyenNgocTuVy.Models;
using DACN_QLPK_1150070050_NguyenNgocTuVy.Dtos;
using DACN_QLPK_1150070050_NguyenNgocTuVy.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace DACN_QLPK_1150070050_NguyenNgocTuVy.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class HoaDonController : ControllerBase
    {
        private readonly DACNDbContext _db;
        private readonly ICodeGenerator _code;
        private readonly PricingService _pricing;
        private readonly IHoSoTrangThaiService _status;

        public HoaDonController(
            DACNDbContext db,
            ICodeGenerator code,
            PricingService pricing,
            IHoSoTrangThaiService status)
        {
            _db = db;
            _code = code;
            _pricing = pricing;
            _status = status;
        }

        // ===========================================================
        // ✅ LẤY HÓA ĐƠN THEO MÃ (Dành cho frontend Thu Ngân)
        // ===========================================================
        [HttpGet("ma/{maHoaDon}")]
        public async Task<IActionResult> GetByMaHoaDon(string maHoaDon)
        {
            if (string.IsNullOrWhiteSpace(maHoaDon))
                return BadRequest("Thiếu mã hóa đơn.");

            var hoaDon = await _db.HoaDons
                .Include(h => h.ChiTietHoaDons)
                .Include(h => h.IdBenhNhanNavigation)
                .FirstOrDefaultAsync(h => h.MaHd == maHoaDon);

            if (hoaDon == null)
                return NotFound("Không tìm thấy hóa đơn.");

            return Ok(await BuildHoaDonDetailDtoAsync(hoaDon));
        }

        // ===========================================================
        // 0️⃣ DANH SÁCH BỆNH NHÂN CHỜ THANH TOÁN (lọc theo loại)
        // ===========================================================
        [HttpGet("benh-nhan-cho-thanh-toan")]
        public async Task<IActionResult> GetPatientsWaitingForPayment([FromQuery] string? loai = null)
        {
            var query = _db.HoaDons
                .Include(h => h.IdBenhNhanNavigation)
                .Where(h =>
    h.TrangThai == "CHUA_THANH_TOAN" ||
    h.TrangThai == "TAO" ||
    h.TrangThai == "DA_THANH_TOAN"
);


            if (!string.IsNullOrEmpty(loai))
                query = query.Where(h => h.LoaiHoaDon == loai.ToUpper());

            var bills = await query
                .Include(h => h.ChiTietHoaDons)
                .Include(h => h.IdBenhNhanNavigation)
                .OrderByDescending(h => h.NgayTao)
                .ToListAsync();

            var data = new List<HoaDonListDto>();
            foreach (var bill in bills)
            {
                data.Add(await BuildHoaDonListDtoAsync(bill));
            }

            if (data.Count == 0)
                return Ok(new { Message = "Không có bệnh nhân nào đang chờ thanh toán." });

            return Ok(data);
        }

        // ===========================================================
        // 1️⃣ DANH SÁCH HÓA ĐƠN CHƯA THANH TOÁN (mọi loại)
        // ===========================================================
        [HttpGet("cho-thanh-toan")]
        public async Task<IActionResult> GetWaitingBills([FromQuery] DateTime? tuNgay = null, [FromQuery] DateTime? denNgay = null)
        {
            var query = _db.HoaDons
                .Include(h => h.IdBenhNhanNavigation)
                .Where(h => h.TrangThai == "CHUA_THANH_TOAN" || h.TrangThai == "TAO");

            if (tuNgay.HasValue) query = query.Where(h => h.NgayTao >= tuNgay.Value);
            if (denNgay.HasValue) query = query.Where(h => h.NgayTao <= denNgay.Value);

            var bills = await query
                .Include(h => h.ChiTietHoaDons)
                .Include(h => h.IdBenhNhanNavigation)
                .OrderByDescending(h => h.NgayTao)
                .ToListAsync();

            var result = new List<HoaDonListDto>();
            foreach (var bill in bills)
            {
                result.Add(await BuildHoaDonListDtoAsync(bill));
            }

            return Ok(result);
        }

        // ===========================================================
        // 2️⃣ XEM CHI TIẾT HÓA ĐƠN THEO ID
        // ===========================================================
        [HttpGet("{id:long}")]
        public async Task<IActionResult> GetBillDetail(long id)
        {
            var hoaDon = await _db.HoaDons
                .Include(h => h.IdBenhNhanNavigation)
                .FirstOrDefaultAsync(h => h.Id == id);

            if (hoaDon == null) return NotFound("Không tìm thấy hóa đơn.");

            var chiTiet = await _db.ChiTietHoaDons
                .Where(ct => ct.IdHoaDon == id)
                .ToListAsync();

            hoaDon.ChiTietHoaDons = chiTiet;

            return Ok(await BuildHoaDonDetailDtoAsync(hoaDon));
        }

        // ===========================================================
        // 3️⃣ XÁC NHẬN THANH TOÁN
        // ===========================================================

        // ✅ Xác nhận thanh toán bằng ID (long)
        [HttpPut("xac-nhan-thanh-toan/{id:long}")]
        public async Task<IActionResult> ConfirmPayment(long id, [FromBody] long idThuNgan)
        {
            var hd = await _db.HoaDons.FirstOrDefaultAsync(x => x.Id == id);
            if (hd == null)
                return NotFound("Không tìm thấy hóa đơn.");

            return await ConfirmPaymentCoreAsync(hd, idThuNgan, null);
        }

        // ✅ Xác nhận thanh toán bằng MÃ HÓA ĐƠN (chuỗi)
        [HttpPut("xac-nhan-thanh-toan/ma/{maHd}")]
        public async Task<IActionResult> ConfirmPaymentByCode(string maHd, [FromBody] ConfirmPaymentRequest req)
        {
            if (string.IsNullOrWhiteSpace(maHd))
                return BadRequest("Thiếu mã hóa đơn.");

            if (req == null || req.IdThuNgan <= 0)
                return BadRequest("Thiếu idThuNgan hợp lệ.");

            var hd = await _db.HoaDons.FirstOrDefaultAsync(x => x.MaHd == maHd);
            if (hd == null)
                return NotFound("Không tìm thấy hóa đơn.");

            return await ConfirmPaymentCoreAsync(hd, req.IdThuNgan, req.HinhThucThanhToan);
        }

        private async Task<IActionResult> ConfirmPaymentCoreAsync(HoaDon hd, long idThuNgan, string? paymentMethod)
        {
            if (idThuNgan <= 0)
                return BadRequest("Thiếu idThuNgan hợp lệ.");

            if (string.Equals(hd.TrangThai, "DA_THANH_TOAN", StringComparison.OrdinalIgnoreCase))
                return BadRequest("Hóa đơn này đã được thanh toán rồi.");

            var now = DateTime.Now;
            await using var tx = await _db.Database.BeginTransactionAsync();

            hd.TrangThai = "DA_THANH_TOAN";
            hd.IdThuNgan = idThuNgan;
            hd.NgayThanhToan = now;
            hd.HinhThucTt = NormalizePaymentMethod(paymentMethod);

            var postProcess = await CompleteServiceOrderAfterPaymentAsync(hd, idThuNgan, now);
            if (!postProcess.Success)
            {
                await tx.RollbackAsync();
                return BadRequest(new
                {
                    state = postProcess.State,
                    message = postProcess.ErrorMessage,
                    invalidServices = postProcess.InvalidServices
                });
            }

            await _db.SaveChangesAsync();
            await tx.CommitAsync();

            return Ok(new
            {
                Message = "Thanh toán thành công!",
                hd.MaHd,
                queueCreated = postProcess.QueueCreated,
                queueTicketCount = postProcess.QueueTicketCount,
                encounterId = postProcess.EncounterId,
                encounterStatus = postProcess.EncounterStatus
            });
        }

        private async Task<PaymentPostProcessResult> CompleteServiceOrderAfterPaymentAsync(HoaDon hd, long actorId, DateTime now)
        {
            if (!IsServiceOrder(hd))
                return PaymentPostProcessResult.Ok(false, 0);

            var order = await _db.HoaDons
                .Include(h => h.ChiTietHoaDons)
                .Include(h => h.IdLanKhamNavigation)
                    .ThenInclude(l => l!.IdHoSoNavigation)
                        .ThenInclude(hs => hs!.IdKhuTiepDonNavigation)
                .FirstOrDefaultAsync(h => h.Id == hd.Id);

            var baseVisit = order?.IdLanKhamNavigation;
            var encounter = baseVisit?.IdHoSoNavigation;
            if (order == null || baseVisit == null || encounter == null)
            {
                return PaymentPostProcessResult.Fail(
                    "SERVICE_ORDER_ENCOUNTER_MISSING",
                    "Phiếu dịch vụ chưa gắn được hồ sơ tiếp đón, không thể tạo hàng đợi sau thanh toán.");
            }

            if (!encounter.IdKhuTiepDon.HasValue)
            {
                return PaymentPostProcessResult.Fail(
                    "ENCOUNTER_AREA_MISSING",
                    "Hồ sơ chưa có khu tiếp đón. Vui lòng cập nhật khu tiếp đón trước khi thanh toán.");
            }

            var lines = await ResolveServiceOrderLinesAsync(order, encounter.IdKhuTiepDon.Value);
            if (lines.Count == 0)
            {
                return PaymentPostProcessResult.Fail(
                    "SERVICE_ORDER_EMPTY",
                    "Phiếu dịch vụ chưa có dòng dịch vụ hợp lệ để tạo hàng đợi.");
            }

            var invalidLines = lines.Where(x => !x.KhuHopLe).ToList();
            if (invalidLines.Count > 0)
            {
                return PaymentPostProcessResult.Fail(
                    invalidLines.Any(x => x.Reason == "ROOM_AREA_MISSING") ? "ROOM_AREA_MISSING" : "SERVICE_AREA_MISMATCH",
                    "Có dịch vụ/phòng không thuộc khu tiếp đón của hồ sơ. Vui lòng kiểm tra lại trước khi thanh toán.",
                    invalidLines.Select(x => new
                    {
                        serviceId = x.ServiceId,
                        serviceCode = x.ServiceCode,
                        serviceName = x.ServiceName,
                        roomId = x.RoomId,
                        roomName = x.RoomName,
                        roomAreaId = x.RoomAreaId,
                        roomAreaCode = x.RoomAreaCode,
                        roomAreaName = x.RoomAreaName,
                        reason = x.Reason
                    }).Cast<object>().ToList());
            }

            var normalizedEncounterStatus = _status.NormalizeStatus(encounter.TrangThai);
            if (string.Equals(normalizedEncounterStatus, HoSoTrangThaiService.ChoThanhToan, StringComparison.OrdinalIgnoreCase))
            {
                var paidTransition = _status.ApplyTransition(
                    encounter,
                    HoSoTrangThaiService.DaThanhToan,
                    actorId,
                    "PAYMENT_CONFIRMED",
                    $"Thanh toán phiếu {order.MaHd}",
                    new
                    {
                        orderCode = order.MaHd,
                        paymentMethod = hd.HinhThucTt,
                        total = hd.TongTien
                    });

                if (!paidTransition.Success)
                    return PaymentPostProcessResult.Fail("STATUS_TRANSITION_FAILED", paidTransition.ErrorMessage ?? "Không cập nhật được trạng thái hồ sơ sau thanh toán.");
            }
            else if (!string.Equals(normalizedEncounterStatus, HoSoTrangThaiService.DaThanhToan, StringComparison.OrdinalIgnoreCase)
                && !string.Equals(normalizedEncounterStatus, HoSoTrangThaiService.ChoKham, StringComparison.OrdinalIgnoreCase))
            {
                return PaymentPostProcessResult.Fail(
                    "ENCOUNTER_STATUS_INVALID",
                    $"Hồ sơ đang ở trạng thái '{normalizedEncounterStatus}', không thể xác nhận thanh toán phiếu dịch vụ.");
            }

            normalizedEncounterStatus = _status.NormalizeStatus(encounter.TrangThai);
            if (string.Equals(normalizedEncounterStatus, HoSoTrangThaiService.DaThanhToan, StringComparison.OrdinalIgnoreCase))
            {
                var queueTransition = _status.ApplyTransition(
                    encounter,
                    HoSoTrangThaiService.ChoKham,
                    actorId,
                    "QUEUE_READY_AFTER_PAYMENT",
                    $"Đã thanh toán phiếu {order.MaHd}, chuyển sang chờ khám.",
                    new
                    {
                        orderCode = order.MaHd,
                        serviceCount = lines.Count,
                        paymentMethod = hd.HinhThucTt
                    });

                if (!queueTransition.Success)
                    return PaymentPostProcessResult.Fail("STATUS_TRANSITION_FAILED", queueTransition.ErrorMessage ?? "Không chuyển được hồ sơ sang chờ khám.");
            }

            var createdTickets = 0;
            foreach (var line in lines)
            {
                var queueVisit = await _db.LanKhams
                    .Where(l =>
                        l.IdHoSo == encounter.Id &&
                        l.IdPhong == line.RoomId &&
                        l.TrangThai != "DA_HUY")
                    .OrderByDescending(l => l.CreatedAt ?? l.ThoiGianBatDau)
                    .FirstOrDefaultAsync();

                if (queueVisit == null)
                {
                    var assignedDoctor = await _db.BacSiPhongs
                        .Where(x => x.IdPhong == line.RoomId)
                        .Select(x => (long?)x.IdBacSi)
                        .FirstOrDefaultAsync();

                    queueVisit = new LanKham
                    {
                        IdHoSo = encounter.Id,
                        IdBenhNhan = encounter.IdBenhNhan,
                        IdPhong = line.RoomId,
                        IdBacSi = assignedDoctor,
                        TrangThai = "CHO_KHAM",
                        CreatedAt = now,
                        UpdatedAt = now,
                        ThoiGianBatDau = now,
                        LyDo = "DANG_KY_DICH_VU",
                        IdTiepDon = actorId
                    };
                    _db.LanKhams.Add(queueVisit);
                    await _db.SaveChangesAsync();
                }
                else if (string.IsNullOrWhiteSpace(queueVisit.TrangThai)
                    || string.Equals(queueVisit.TrangThai, "TIEP_DON", StringComparison.OrdinalIgnoreCase)
                    || string.Equals(queueVisit.TrangThai, "DA_THANH_TOAN", StringComparison.OrdinalIgnoreCase))
                {
                    queueVisit.TrangThai = "CHO_KHAM";
                    queueVisit.UpdatedAt = now;
                }

                var duplicateLine = await _db.LanKhamDichVus.AnyAsync(x =>
                    x.IdLanKham == queueVisit.Id &&
                    x.IdDichVu == line.ServiceId &&
                    x.TrangThaiThucHien != "DA_HUY");
                if (duplicateLine) continue;

                _db.LanKhamDichVus.Add(new LanKhamDichVu
                {
                    IdLanKham = queueVisit.Id,
                    IdDichVu = line.ServiceId,
                    SoLuong = 1,
                    DonGia = line.UnitPrice,
                    TrangThaiThucHien = "CHO_THUC_HIEN",
                    GhiChu = $"PDV:{order.MaHd}"
                });
                createdTickets++;
            }

            _db.TiepDonTrangThaiLogs.Add(new TiepDonTrangThaiLog
            {
                IdHoSo = encounter.Id,
                FromTrangThai = _status.NormalizeStatus(encounter.TrangThai),
                ToTrangThai = _status.NormalizeStatus(encounter.TrangThai),
                Action = "QUEUE_TICKETS_CREATED_AFTER_PAYMENT",
                Note = "Đã tạo hàng đợi khám sau khi thu ngân xác nhận thanh toán.",
                IdNguoiDung = actorId,
                CreatedAt = now,
                Metadata = JsonSerializer.Serialize(new
                {
                    orderCode = order.MaHd,
                    createdTickets,
                    serviceCount = lines.Count,
                    areaId = encounter.IdKhuTiepDon,
                    areaCode = encounter.IdKhuTiepDonNavigation?.MaKhu,
                    rooms = lines.Select(x => new { x.RoomId, x.RoomName, x.RoomAreaId }).Distinct()
                })
            });

            return PaymentPostProcessResult.Ok(
                queueCreated: lines.Count > 0,
                queueTicketCount: createdTickets,
                encounterId: encounter.Id,
                encounterStatus: _status.NormalizeStatus(encounter.TrangThai));
        }

        // ===========================================================
        // 4️⃣ IN PHIẾU THU
        // ===========================================================
        [HttpGet("phieu-thu/{id}")]
        public async Task<IActionResult> PrintReceipt(long id)
        {
            var hoaDon = await _db.HoaDons
                .Include(h => h.ChiTietHoaDons)
                .Include(h => h.IdBenhNhanNavigation)
                .FirstOrDefaultAsync(h => h.Id == id);

            if (hoaDon == null) return NotFound("Không tìm thấy hóa đơn.");

            return Ok(await BuildReceiptPayloadAsync(hoaDon));
        }

        [HttpGet("phieu-thu/ma/{maHd}")]
        public async Task<IActionResult> PrintReceiptByCode(string maHd)
        {
            var hoaDon = await _db.HoaDons
                .Include(h => h.ChiTietHoaDons)
                .Include(h => h.IdBenhNhanNavigation)
                .FirstOrDefaultAsync(h => h.MaHd == maHd);

            if (hoaDon == null) return NotFound("Không tìm thấy hóa đơn.");

            return Ok(await BuildReceiptPayloadAsync(hoaDon));
        }

        private async Task<object> BuildReceiptPayloadAsync(HoaDon hoaDon)
        {
            var detail = await BuildHoaDonDetailDtoAsync(hoaDon);

            return new
            {
                detail.MaHd,
                TenBenhNhan = detail.BenhNhan,
                detail.NgayThanhToan,
                NgayThu = detail.NgayThanhToan,
                detail.LoaiHoaDon,
                detail.TongTien,
                KhuTiepDon = detail.TenKhuTiepDon,
                PhongKham = detail.PhongKham,
                ChiTiet = detail.ChiTiet.Select(x => new
                {
                    x.MoTa,
                    x.TenPhong,
                    x.TenKhuTiepDon,
                    x.SoLuong,
                    x.DonGia,
                    x.ThanhTien
                })
            };
        }

        [HttpPost("fix-dvkt-invoices")]
        public async Task<IActionResult> FixDvktInvoices()
        {
            var dvkts = await _db.HoaDons
                .Where(h => h.LoaiHoaDon == "DVKT")
                .ToListAsync();

            int count = 0;

            foreach (var hd in dvkts)
            {
                // lấy các DVKT thuộc lần khám hoặc bệnh nhân
                var cds = await _db.ChiDinhDvkts
    .Join(
        _db.LanKhams,
        cd => cd.IdLanKham,
        lk => lk.Id,
        (cd, lk) => new { cd, lk }
    )
    .Where(x => x.lk.IdBenhNhan == hd.IdBenhNhan)
    .Select(x => x.cd)
    .ToListAsync();


                foreach (var cd in cds)
                {
                    // lấy giá
                    var gia = await _db.DvktGia
                        .Where(g => g.IdDvkt == cd.IdDvkt)
                        .OrderByDescending(g => g.TuNgay)
                        .Select(g => g.DonGia)
                        .FirstOrDefaultAsync();

                    if (gia <= 0) continue;

                    // tạo chi tiết
                    _db.ChiTietHoaDons.Add(new ChiTietHoaDon
                    {
                        IdHoaDon = hd.Id,
                        LoaiThamChieu = "DVKT",
                        IdThamChieu = cd.IdDvkt,
                        SoLuong = cd.SoLuong,
                        DonGia = gia,
                        ThanhTien = gia * cd.SoLuong,
                        MoTa = "DVKT - AutoFix"
                    });

                    // cập nhật tổng tiền
                    hd.TongTienTruoc += gia * cd.SoLuong;
                    hd.TongTien = hd.TongTienTruoc;

                    count++;
                }
            }

            await _db.SaveChangesAsync();

            return Ok(new { success = true, message = "Đã bổ sung chi tiết DVKT", created = count });
        }

        // ===========================================================
        // 5️⃣ TẠO HÓA ĐƠN KHÁM
        // ===========================================================
        [HttpPost("tao-hoa-don-kham")]
        public async Task<IActionResult> CreateKhamBill([FromBody] CLSRequest req)
        {
            if (req == null || req.DichVus == null || req.DichVus.Count == 0)
                return BadRequest("Thiếu danh sách dịch vụ khám.");

            var now = DateTime.Now;
            var maHd = _code.GenMa("HDKHAM");

            var hd = new HoaDon
            {
                MaHd = maHd,
                IdBenhNhan = req.IdBenhNhan,
                LoaiHoaDon = "KHAM",
                HinhThucTt = "TIEN_MAT",
                TrangThai = "CHUA_THANH_TOAN",
                NgayTao = now
            };
            _db.HoaDons.Add(hd);
            await _db.SaveChangesAsync();

            decimal tong = 0;
            foreach (var dv in req.DichVus)
            {
                var donGia = await _pricing.GetCurrentPriceAsync(dv.IdDichVu, dv.IdPhong);
                if (!donGia.HasValue) continue;

                _db.ChiTietHoaDons.Add(new ChiTietHoaDon
                {
                    IdHoaDon = hd.Id,
                    LoaiThamChieu = "PHONG_KHAM",
                    IdThamChieu = dv.IdDichVu,
                    MoTa = $"Khám: {dv.TenDichVu}",
                    SoLuong = dv.SoLuong,
                    DonGia = donGia.Value,
                    ThanhTien = donGia.Value * dv.SoLuong
                });
                tong += donGia.Value * dv.SoLuong;
            }

            hd.TongTienTruoc = tong;
            hd.TongTien = tong;
            await _db.SaveChangesAsync();

            return Ok(new { Message = "✅ Tạo hóa đơn khám thành công", hd.MaHd, hd.TongTien, hd.Id });
        }

        // ===========================================================
        // 6️⃣ TẠO HÓA ĐƠN CLS (DỊCH VỤ KỸ THUẬT)
        // ===========================================================
        [HttpPost("tao-hoa-don-cls")]
        public async Task<IActionResult> CreateCLSBill([FromBody] CLSRequest req)
        {
            var hoaDonKham = await _db.HoaDons
                .Where(h => h.IdBenhNhan == req.IdBenhNhan && h.LoaiHoaDon == "KHAM")
                .OrderByDescending(h => h.NgayTao)
                .FirstOrDefaultAsync();

            if (hoaDonKham == null)
                return BadRequest("Bệnh nhân chưa có hóa đơn khám.");
            if (hoaDonKham.TrangThai != "DA_THANH_TOAN")
                return BadRequest("Chưa thanh toán tiền khám, không thể tạo hóa đơn CLS.");

            var now = DateTime.Now;
            var maHd = _code.GenMa("HDCLS");

            var hd = new HoaDon
            {
                MaHd = maHd,
                IdBenhNhan = req.IdBenhNhan,
                LoaiHoaDon = "DVKT",
                HinhThucTt = "TIEN_MAT",
                TrangThai = "CHUA_THANH_TOAN",
                NgayTao = now
            };
            _db.HoaDons.Add(hd);
            await _db.SaveChangesAsync();

            decimal tong = 0;
            foreach (var dv in req.DichVus)
            {
                var gia = await _pricing.GetCurrentPriceAsync(dv.IdDichVu, dv.IdPhong);
                if (!gia.HasValue) continue;

                _db.ChiTietHoaDons.Add(new ChiTietHoaDon
                {
                    IdHoaDon = hd.Id,
                    LoaiThamChieu = "DVKT",
                    IdThamChieu = dv.IdDichVu,
                    MoTa = $"CLS: {dv.TenDichVu}",
                    SoLuong = dv.SoLuong,
                    DonGia = gia.Value,
                    ThanhTien = gia.Value * dv.SoLuong
                });
                tong += gia.Value * dv.SoLuong;
            }

            hd.TongTienTruoc = tong;
            hd.TongTien = tong;
            await _db.SaveChangesAsync();

            return Ok(new { Message = "✅ Tạo hóa đơn CLS thành công", hd.MaHd, hd.TongTien, hd.Id });
        }

        // ===========================================================
        // 7️⃣ TẠO HÓA ĐƠN THUỐC
        // ===========================================================
        [HttpPost("tao-hoa-don-thuoc")]
        public async Task<IActionResult> CreateMedicineBill([FromBody] TaoHoaDonThuocRequest req)
        {
            var don = await _db.DonThuocs
                .Include(x => x.IdBenhNhanNavigation)
                .FirstOrDefaultAsync(x => x.Id == req.IdDonThuoc);

            if (don == null) return NotFound("Không tìm thấy đơn thuốc.");

            var chiTietThuoc = await _db.ChiTietDonThuocs
                .Include(x => x.IdThuocNavigation)
                .Where(x => x.IdDonThuoc == req.IdDonThuoc)
                .ToListAsync();

            var maHd = _code.GenMa("HDTHUOC");
            decimal tong = chiTietThuoc.Sum(x => x.SoLuong.GetValueOrDefault() * (decimal)(x.IdThuocNavigation?.DonGia ?? 0));

            var hd = new HoaDon
            {
                MaHd = maHd,
                IdBenhNhan = don.IdBenhNhan,
                LoaiHoaDon = "THUOC",
                HinhThucTt = "TIEN_MAT",
                TrangThai = "CHUA_THANH_TOAN",
                NgayTao = DateTime.Now,
                TongTienTruoc = tong,
                TongTien = tong,
                GhiChu = "Thanh toán thuốc"
            };
            _db.HoaDons.Add(hd);
            await _db.SaveChangesAsync();

            foreach (var ct in chiTietThuoc)
            {
                _db.ChiTietHoaDons.Add(new ChiTietHoaDon
                {
                    IdHoaDon = hd.Id,
                    LoaiThamChieu = "THUOC",
                    IdThamChieu = ct.Id,
                    MoTa = $"Thuốc: {ct.IdThuocNavigation?.Ten}",
                    SoLuong = ct.SoLuong,
                    DonGia = (decimal)(ct.IdThuocNavigation?.DonGia ?? 0),
                    ThanhTien = ct.SoLuong.GetValueOrDefault() * (decimal)(ct.IdThuocNavigation?.DonGia ?? 0)
                });
            }

            await _db.SaveChangesAsync();
            return Ok(new { Message = "✅ Tạo hóa đơn thuốc thành công", hd.MaHd, hd.TongTien, hd.Id });
        }

        private async Task<HoaDonListDto> BuildHoaDonListDtoAsync(HoaDon hoaDon)
        {
            var detail = await BuildHoaDonDetailDtoAsync(hoaDon);
            return new HoaDonListDto
            {
                Id = detail.Id,
                MaHd = detail.MaHd,
                LoaiHoaDon = detail.LoaiHoaDon,
                BenhNhan = detail.BenhNhan,
                IdBenhNhan = detail.IdBenhNhan,
                SoDienThoai = detail.SoDienThoai,
                IdHoSo = detail.IdHoSo,
                IdKhuTiepDon = detail.IdKhuTiepDon,
                MaKhuTiepDon = detail.MaKhuTiepDon,
                TenKhuTiepDon = detail.TenKhuTiepDon,
                PhongKham = detail.PhongKham,
                CanThanhToan = detail.CanThanhToan,
                LyDoKhongThanhToan = detail.LyDoKhongThanhToan,
                QueueCreated = detail.QueueCreated,
                TongTien = detail.TongTien,
                NgayTao = detail.NgayTao,
                TrangThai = detail.TrangThai
            };
        }

        private async Task<HoaDonDetailDto> BuildHoaDonDetailDtoAsync(HoaDon hoaDon)
        {
            if (hoaDon.ChiTietHoaDons.Count == 0)
            {
                await _db.Entry(hoaDon).Collection(h => h.ChiTietHoaDons).LoadAsync();
            }

            var area = await GetBillAreaContextAsync(hoaDon);
            var items = await BuildHoaDonItemsAsync(hoaDon, area);
            var isServiceOrder = IsServiceOrder(hoaDon);
            var invalidItem = items.FirstOrDefault(x => !x.KhuHopLe);
            var canPay = !isServiceOrder || (area.IdKhuTiepDon.HasValue && invalidItem == null);
            var phongKham = string.Join(", ",
                items.Select(x => x.TenPhong)
                    .Where(x => !string.IsNullOrWhiteSpace(x))
                    .Distinct());

            return new HoaDonDetailDto
            {
                Id = hoaDon.Id,
                MaHd = hoaDon.MaHd,
                LoaiHoaDon = hoaDon.LoaiHoaDon,
                TongTien = hoaDon.TongTien,
                TrangThai = hoaDon.TrangThai,
                NgayTao = hoaDon.NgayTao,
                NgayThanhToan = hoaDon.NgayThanhToan,
                BenhNhan = RepairInvoiceText(hoaDon.IdBenhNhanNavigation?.HoTen),
                IdBenhNhan = hoaDon.IdBenhNhan,
                SoDienThoai = hoaDon.IdBenhNhanNavigation?.SoDienThoai,
                IdHoSo = area.IdHoSo,
                IdKhuTiepDon = area.IdKhuTiepDon,
                MaKhuTiepDon = RepairInvoiceText(area.MaKhuTiepDon),
                TenKhuTiepDon = RepairInvoiceText(area.TenKhuTiepDon),
                PhongKham = phongKham,
                CanThanhToan = canPay,
                LyDoKhongThanhToan = canPay
                    ? null
                    : !area.IdKhuTiepDon.HasValue
                        ? "Hồ sơ chưa có khu tiếp đón."
                        : RepairInvoiceText(invalidItem?.LyDoKhongHopLe),
                QueueCreated = await HasQueueForBillAsync(hoaDon),
                ChiTiet = items
            };
        }

        private async Task<BillAreaContext> GetBillAreaContextAsync(HoaDon hoaDon)
        {
            if (!hoaDon.IdLanKham.HasValue)
                return new BillAreaContext();

            var visit = await _db.LanKhams
                .AsNoTracking()
                .Include(l => l.IdHoSoNavigation)
                    .ThenInclude(h => h!.IdKhuTiepDonNavigation)
                .FirstOrDefaultAsync(l => l.Id == hoaDon.IdLanKham.Value);

            var encounter = visit?.IdHoSoNavigation;
            return new BillAreaContext
            {
                IdHoSo = encounter?.Id,
                IdKhuTiepDon = encounter?.IdKhuTiepDon,
                MaKhuTiepDon = encounter?.IdKhuTiepDonNavigation?.MaKhu,
                TenKhuTiepDon = encounter?.IdKhuTiepDonNavigation?.TenKhu
            };
        }

        private async Task<List<HoaDonItemDto>> BuildHoaDonItemsAsync(HoaDon hoaDon, BillAreaContext area)
        {
            var details = hoaDon.ChiTietHoaDons.ToList();
            var serviceIds = details
                .Where(IsServiceOrderLine)
                .Select(x => x.IdThamChieu ?? TryReadJsonLong(x.MoTa, "serviceId"))
                .Where(x => x.HasValue)
                .Select(x => x!.Value)
                .Distinct()
                .ToList();

            var serviceLookup = serviceIds.Count == 0
                ? new Dictionary<long, DichVu>()
                : await _db.DichVus
                    .AsNoTracking()
                    .Include(d => d.IdPhongNavigation)
                        .ThenInclude(p => p!.IdKhuTiepDonNavigation)
                    .Where(d => serviceIds.Contains(d.Id))
                    .ToDictionaryAsync(d => d.Id);

            var items = new List<HoaDonItemDto>();
            foreach (var ct in details)
            {
                var isServiceLine = IsServiceOrderLine(ct);
                var serviceId = isServiceLine
                    ? ct.IdThamChieu ?? TryReadJsonLong(ct.MoTa, "serviceId")
                    : ct.IdThamChieu;

                serviceLookup.TryGetValue(serviceId ?? 0, out var service);
                var room = service?.IdPhongNavigation;
                var roomArea = room?.IdKhuTiepDonNavigation;

                var roomId = room?.Id ?? (int?)TryReadJsonLong(ct.MoTa, "roomId");
                var roomAreaId = room?.IdKhuTiepDon ?? (int?)TryReadJsonLong(ct.MoTa, "roomAreaId");
                var roomName = room?.TenPhong ?? TryReadJsonString(ct.MoTa, "roomName");
                var serviceName = service?.Ten ?? TryReadJsonString(ct.MoTa, "serviceName");
                var serviceCode = service?.Ma ?? TryReadJsonString(ct.MoTa, "serviceCode");
                var roomAreaCode = roomArea?.MaKhu ?? TryReadJsonString(ct.MoTa, "roomAreaCode");
                var roomAreaName = roomArea?.TenKhu ?? TryReadJsonString(ct.MoTa, "roomAreaName");

                var khuHopLe = true;
                string? lyDoKhongHopLe = null;
                if (isServiceLine && area.IdKhuTiepDon.HasValue)
                {
                    if (!roomAreaId.HasValue)
                    {
                        khuHopLe = false;
                        lyDoKhongHopLe = "Phòng chưa được map khu tiếp đón.";
                    }
                    else if (roomAreaId.Value != area.IdKhuTiepDon.Value)
                    {
                        khuHopLe = false;
                        lyDoKhongHopLe = "Phòng thuộc khu khác với khu tiếp đón của hồ sơ.";
                    }
                }

                items.Add(new HoaDonItemDto
                {
                    MoTa = RepairInvoiceText(serviceName ?? ct.MoTa),
                    IdDichVu = serviceId,
                    MaDichVu = RepairInvoiceText(serviceCode),
                    TenDichVu = RepairInvoiceText(serviceName),
                    IdPhong = roomId,
                    TenPhong = RepairInvoiceText(roomName),
                    IdKhuTiepDon = roomAreaId,
                    MaKhuTiepDon = RepairInvoiceText(roomAreaCode),
                    TenKhuTiepDon = RepairInvoiceText(roomAreaName),
                    KhuHopLe = khuHopLe,
                    LyDoKhongHopLe = RepairInvoiceText(lyDoKhongHopLe),
                    SoLuong = ct.SoLuong,
                    DonGia = ct.DonGia,
                    ThanhTien = ct.ThanhTien
                });
            }

            return items;
        }

        private async Task<List<ResolvedServiceOrderLine>> ResolveServiceOrderLinesAsync(HoaDon order, int encounterAreaId)
        {
            var details = order.ChiTietHoaDons
                .Where(IsServiceOrderLine)
                .ToList();

            var serviceIds = details
                .Select(x => x.IdThamChieu ?? TryReadJsonLong(x.MoTa, "serviceId"))
                .Where(x => x.HasValue)
                .Select(x => x!.Value)
                .Distinct()
                .ToList();

            var serviceLookup = serviceIds.Count == 0
                ? new Dictionary<long, DichVu>()
                : await _db.DichVus
                    .Include(d => d.IdPhongNavigation)
                        .ThenInclude(p => p!.IdKhuTiepDonNavigation)
                    .Where(d => serviceIds.Contains(d.Id))
                    .ToDictionaryAsync(d => d.Id);

            var lines = new List<ResolvedServiceOrderLine>();
            foreach (var detail in details)
            {
                var serviceId = detail.IdThamChieu ?? TryReadJsonLong(detail.MoTa, "serviceId");
                serviceLookup.TryGetValue(serviceId ?? 0, out var service);

                var room = service?.IdPhongNavigation;
                var roomArea = room?.IdKhuTiepDonNavigation;
                var roomId = room?.Id ?? (int?)TryReadJsonLong(detail.MoTa, "roomId");
                var roomAreaId = room?.IdKhuTiepDon ?? (int?)TryReadJsonLong(detail.MoTa, "roomAreaId");

                string? reason = null;
                if (!serviceId.HasValue || service == null)
                    reason = "SERVICE_NOT_FOUND";
                else if (!roomId.HasValue)
                    reason = "ROOM_MISSING";
                else if (!roomAreaId.HasValue)
                    reason = "ROOM_AREA_MISSING";
                else if (roomAreaId.Value != encounterAreaId)
                    reason = "ROOM_AREA_MISMATCH";

                lines.Add(new ResolvedServiceOrderLine
                {
                    ServiceId = serviceId ?? 0,
                    ServiceCode = service?.Ma ?? TryReadJsonString(detail.MoTa, "serviceCode"),
                    ServiceName = service?.Ten ?? TryReadJsonString(detail.MoTa, "serviceName"),
                    RoomId = roomId ?? 0,
                    RoomName = room?.TenPhong ?? TryReadJsonString(detail.MoTa, "roomName"),
                    RoomAreaId = roomAreaId,
                    RoomAreaCode = roomArea?.MaKhu ?? TryReadJsonString(detail.MoTa, "roomAreaCode"),
                    RoomAreaName = roomArea?.TenKhu ?? TryReadJsonString(detail.MoTa, "roomAreaName"),
                    UnitPrice = detail.DonGia ?? 0m,
                    KhuHopLe = reason == null,
                    Reason = reason
                });
            }

            return lines;
        }

        private async Task<bool> HasQueueForBillAsync(HoaDon hoaDon)
        {
            if (!IsServiceOrder(hoaDon) || string.IsNullOrWhiteSpace(hoaDon.MaHd))
                return false;

            var marker = $"PDV:{hoaDon.MaHd}";
            return await _db.LanKhamDichVus
                .AsNoTracking()
                .AnyAsync(x =>
                    x.GhiChu != null &&
                    x.GhiChu.Contains(marker) &&
                    x.TrangThaiThucHien != "DA_HUY");
        }

        private static bool IsServiceOrder(HoaDon hoaDon) =>
            string.Equals(hoaDon.LoaiHoaDon, "DANG_KY_DICH_VU", StringComparison.OrdinalIgnoreCase);

        private static bool IsServiceOrderLine(ChiTietHoaDon detail) =>
            string.Equals(detail.LoaiThamChieu, "SERVICE_ORDER_LINE", StringComparison.OrdinalIgnoreCase);

        private static string NormalizePaymentMethod(string? paymentMethod)
        {
            var normalized = (paymentMethod ?? string.Empty).Trim().ToUpperInvariant();
            return string.IsNullOrWhiteSpace(normalized) ? "TIEN_MAT" : normalized;
        }

        private static string? TryReadJsonString(string? raw, string propertyName)
        {
            if (string.IsNullOrWhiteSpace(raw) || !raw.TrimStart().StartsWith("{", StringComparison.Ordinal))
                return null;

            try
            {
                using var doc = JsonDocument.Parse(raw);
                return doc.RootElement.TryGetProperty(propertyName, out var value)
                    ? value.GetString()
                    : null;
            }
            catch
            {
                return null;
            }
        }

        private static long? TryReadJsonLong(string? raw, string propertyName)
        {
            if (string.IsNullOrWhiteSpace(raw) || !raw.TrimStart().StartsWith("{", StringComparison.Ordinal))
                return null;

            try
            {
                using var doc = JsonDocument.Parse(raw);
                if (!doc.RootElement.TryGetProperty(propertyName, out var value))
                    return null;

                if (value.ValueKind == JsonValueKind.Number && value.TryGetInt64(out var number))
                    return number;

                if (value.ValueKind == JsonValueKind.String && long.TryParse(value.GetString(), out var parsed))
                    return parsed;
            }
            catch
            {
                return null;
            }

            return null;
        }

        private static string? RepairInvoiceText(string? value)
        {
            var text = TextEncodingRepair.Repair(value);
            if (string.IsNullOrWhiteSpace(text))
                return text;

            return text
                .Replace("Nguy?n", "Nguyễn")
                .Replace("Khám t?i ph?ng", "Khám tại phòng")
                .Replace("Khám t?i phòng", "Khám tại phòng")
                .Replace("Khám tại ph?ng", "Khám tại phòng")
                .Replace("Khám t?i Ph?ng", "Khám tại Phòng")
                .Replace("Ph?ng khám", "Phòng khám")
                .Replace("N?i t?ng quát", "Nội tổng quát")
                .Replace("Ngo?i th?n kinh", "Ngoại thần kinh")
                .Replace("Tai M?i H?ng", "Tai Mũi Họng")
                .Replace("Da Li?u", "Da Liễu")
                .Replace("N?i Ti?t", "Nội Tiết")
                .Replace("Răng Hàm M?t", "Răng Hàm Mặt")
                .Replace("S?n Ph? khoa", "Sản Phụ khoa")
                .Replace("Ki?m tra máu t?ng quát", "Kiểm tra máu tổng quát");
        }

        private sealed class BillAreaContext
        {
            public long? IdHoSo { get; init; }
            public int? IdKhuTiepDon { get; init; }
            public string? MaKhuTiepDon { get; init; }
            public string? TenKhuTiepDon { get; init; }
        }

        private sealed class ResolvedServiceOrderLine
        {
            public long ServiceId { get; init; }
            public string? ServiceCode { get; init; }
            public string? ServiceName { get; init; }
            public int RoomId { get; init; }
            public string? RoomName { get; init; }
            public int? RoomAreaId { get; init; }
            public string? RoomAreaCode { get; init; }
            public string? RoomAreaName { get; init; }
            public decimal UnitPrice { get; init; }
            public bool KhuHopLe { get; init; }
            public string? Reason { get; init; }
        }

        private sealed class PaymentPostProcessResult
        {
            public bool Success { get; init; }
            public string? State { get; init; }
            public string? ErrorMessage { get; init; }
            public bool QueueCreated { get; init; }
            public int QueueTicketCount { get; init; }
            public long? EncounterId { get; init; }
            public string? EncounterStatus { get; init; }
            public List<object> InvalidServices { get; init; } = new();

            public static PaymentPostProcessResult Ok(
                bool queueCreated,
                int queueTicketCount,
                long? encounterId = null,
                string? encounterStatus = null) =>
                new()
                {
                    Success = true,
                    QueueCreated = queueCreated,
                    QueueTicketCount = queueTicketCount,
                    EncounterId = encounterId,
                    EncounterStatus = encounterStatus
                };

            public static PaymentPostProcessResult Fail(
                string state,
                string message,
                List<object>? invalidServices = null) =>
                new()
                {
                    Success = false,
                    State = state,
                    ErrorMessage = message,
                    InvalidServices = invalidServices ?? new List<object>()
                };
        }
    }
}
