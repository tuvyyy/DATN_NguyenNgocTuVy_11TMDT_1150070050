using ThucTapTotNghiep_1150070050_NguyenNgocTuVy.Data;
using ThucTapTotNghiep_1150070050_NguyenNgocTuVy.Dtos;
using ThucTapTotNghiep_1150070050_NguyenNgocTuVy.Models;
using ThucTapTotNghiep_1150070050_NguyenNgocTuVy.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using System.Globalization;
using System.Security.Claims;
using System.Text;
using System.Text.Json;

namespace ThucTapTotNghiep_1150070050_NguyenNgocTuVy.Controllers
{
    [ApiController]
    [Authorize]
    [RequireFeature("KHAM_BENH")]
    [Route("api/[controller]")]
    public class LanKhamController : ControllerBase
    {
        private readonly DACNDbContext _db;
        private readonly IHoSoTrangThaiService _hoSoTrangThai;
        private readonly IKhamBenhAuditService _audit;

        public LanKhamController(DACNDbContext db, IHoSoTrangThaiService hoSoTrangThai, IKhamBenhAuditService audit)
        {
            _db = db;
            _hoSoTrangThai = hoSoTrangThai;
            _audit = audit;
        }

        public static class TrangThai
        {
            public const string ChoKham = "CHO_KHAM";
            public const string DangKham = "DANG_KHAM";
            public const string DaKham = "DA_KHAM";
            public const string ChoThucHien = "CHO_THUC_HIEN";
            public const string ChoThanhToan = "CHO_THANH_TOAN";
            public const string DaThanhToan = "DA_THANH_TOAN";
            public const string Huy = "DA_HUY";
        }

        private const string MetaPrefix = "[RECEPTION_META]";
        private const string FeatureKhamBenh = "KHAM_BENH";

        [HttpGet("lan-kham/{id}/detail")]
        public async Task<IActionResult> GetLanKhamDetail(long id)
        {
            var lk = await _db.LanKhams
                .Include(x => x.IdHoSoNavigation)
                    .ThenInclude(h => h.IdKhuTiepDonNavigation)
                .Include(x => x.IdHoSoNavigation)
                    .ThenInclude(h => h.IdQuayTiepDonNavigation)
                .Include(x => x.IdBenhNhanNavigation)
                .Include(x => x.IdPhongNavigation)
                .Include(x => x.IdBacSiNavigation)
                .Include(x => x.IdBenhNavigation)
                .FirstOrDefaultAsync(x => x.Id == id);

            if (lk == null)
                return NotFound(new { success = false, message = "Khong tim thay luot kham." });

            var accessError = await EnsureCanTouchVisit(lk);
            if (accessError != null) return accessError;

            var hs = lk.IdHoSoNavigation;
            var bn = lk.IdBenhNhanNavigation;

            var sh = await _db.SinhHieus
                .Where(x => x.IdLanKham == id || x.Id == lk.IdSinhHieu)
                .OrderByDescending(x => x.ThoiGianDo)
                .FirstOrDefaultAsync();

            var pendingDvktCount = await _db.ChiDinhDvkts
                .CountAsync(x => x.IdLanKham == id && x.TrangThai != DvktTrangThai.Canceled);

            var benhKemTheoList = await _db.LanKhamBenhKemTheos
                .AsNoTracking()
                .Include(x => x.IdBenhNavigation)
                .Where(x => x.IdLanKham == id)
                .OrderBy(x => x.ThuTu)
                .Select(x => new
                {
                    id = x.IdBenhNavigation.Id,
                    ma = x.IdBenhNavigation.Ma,
                    ten = x.IdBenhNavigation.Ten
                })
                .ToListAsync();

            var latestFollowUp = await _db.GiayHenKhamLais
                .AsNoTracking()
                .Where(x => x.IdLanKham == id)
                .OrderByDescending(x => x.UpdatedAt ?? x.CreatedAt)
                .Select(x => new
                {
                    id = x.Id,
                    hinhThucDieuTri = x.HinhThucDieuTri,
                    ketQua = x.KetQua,
                    lyDoHen = x.LyDoHen,
                    benhKemTheo = x.BenhKemTheo,
                    loiDan = x.LoiDan,
                    ngayHen = x.NgayHen,
                    phongHen = x.PhongHen,
                    ghiChu = x.GhiChu,
                    daKy = x.DaKy,
                    bacSiKy = x.BacSiKy,
                    signedAt = x.SignedAt,
                    saved = true
                })
                .FirstOrDefaultAsync();

            var currentPaperType = ToConclusionPaperType(FoldText(lk.HuongXuTri));
            var conclusionPapers = await _db.GiayKetLuanKhams
                .AsNoTracking()
                .Where(x => x.IdLanKham == id)
                .OrderByDescending(x => x.UpdatedAt ?? x.CreatedAt)
                .Select(x => new
                {
                    id = x.Id,
                    loaiGiay = x.LoaiGiay,
                    hinhThucDieuTri = x.HinhThucDieuTri,
                    ketQua = x.KetQua,
                    chanDoan = x.ChanDoan,
                    benhKemTheo = x.BenhKemTheo,
                    lyDoHen = x.LyDoHen,
                    loiDan = x.LoiDan,
                    ngayHen = x.NgayHen,
                    phongHen = x.PhongHen,
                    lyDoVaoVien = x.LyDoVaoVien,
                    khoaNhapVien = x.KhoaNhapVien,
                    kinhGui = x.KinhGui,
                    dauHieuLamSang = x.DauHieuLamSang,
                    lyDoChuyenTuyen = x.LyDoChuyenTuyen,
                    huongDieuTriChuyenTuyen = x.HuongDieuTriChuyenTuyen,
                    phuongTienVanChuyen = x.PhuongTienVanChuyen,
                    lyDoKhongKham = x.LyDoKhongKham,
                    ghiChu = x.GhiChu,
                    daKy = x.DaKy,
                    bacSiKy = x.BacSiKy,
                    signedAt = x.SignedAt,
                    saved = true
                })
                .ToListAsync();

            var latestConclusionPaper = conclusionPapers
                .FirstOrDefault(x => string.Equals(x.loaiGiay, currentPaperType, StringComparison.OrdinalIgnoreCase))
                ?? conclusionPapers.FirstOrDefault();

            return Ok(new
            {
                idLanKham = lk.Id,
                idHoSo = lk.IdHoSo,
                maHoSo = hs?.MaHs,
                maHs = hs?.MaHs,
                trangThaiHoSo = hs?.TrangThai,
                mucUuTien = ReadMetaString(hs?.GhiChu, "priority"),
                doiTuongThanhToan = ReadMetaString(hs?.GhiChu, "paymentObject"),
                phong = lk.IdPhongNavigation == null ? null : new
                {
                    id = lk.IdPhongNavigation.Id,
                    maPhong = lk.IdPhongNavigation.MaPhong,
                    tenPhong = lk.IdPhongNavigation.TenPhong,
                    khoaPhong = lk.IdPhongNavigation.KhoaPhong
                },
                bacSi = lk.IdBacSiNavigation == null ? null : new
                {
                    id = lk.IdBacSiNavigation.Id,
                    hoTen = lk.IdBacSiNavigation.HoTen,
                    tenDangNhap = lk.IdBacSiNavigation.TenDangNhap
                },
                khuTiepDon = hs?.IdKhuTiepDonNavigation == null ? null : new
                {
                    id = hs.IdKhuTiepDonNavigation.Id,
                    maKhu = hs.IdKhuTiepDonNavigation.MaKhu,
                    tenKhu = hs.IdKhuTiepDonNavigation.TenKhu
                },
                quayTiepDon = hs?.IdQuayTiepDonNavigation == null ? null : new
                {
                    id = hs.IdQuayTiepDonNavigation.Id,
                    maQuay = hs.IdQuayTiepDonNavigation.MaQuay,
                    tenQuay = hs.IdQuayTiepDonNavigation.TenQuay
                },
                benhNhan = bn == null ? null : new
                {
                    id = bn.Id,
                    hoTen = bn.HoTen,
                    ngaySinh = bn.NgaySinh,
                    soDienThoai = bn.SoDienThoai,
                    diaChi = $"{bn.DiaChiDuong}, {bn.DiaChiXa}, {bn.DiaChiHuyen}, {bn.DiaChiTinh}",
                    maBenhNhan = bn.MaBn,
                    gioiTinh = bn.GioiTinh,
                    cccd = bn.Cccd
                },
                sinhHieu = sh == null ? null : new
                {
                    nhietDo = sh.NhietDo,
                    mach = sh.NhipTim,
                    huyetAp = $"{sh.HuyetApTamThu}/{sh.HuyetApTamTruong}",
                    nhipTho = sh.NhipTho,
                    spo2 = sh.SpO2,
                    canNang = sh.CanNang,
                    chieuCao = sh.ChieuCao
                },
                chanDoanSoBo = lk.ChanDoanSoBo,
                chanDoanCuoi = lk.ChanDoanCuoi,
                ketQuaKham = lk.KetQuaKham,
                huongXuTri = lk.HuongXuTri,
                benhKemTheo = lk.BenhKemTheo,
                benh = lk.IdBenhNavigation == null ? null : new
                {
                    id = lk.IdBenhNavigation.Id,
                    ma = lk.IdBenhNavigation.Ma,
                    ten = lk.IdBenhNavigation.Ten
                },
                benhKemTheoList,
                giayHenKhamLai = latestFollowUp,
                giayKetLuanKham = latestConclusionPaper,
                ghiChu = lk.GhiChu,
                trangThai = lk.TrangThai,
                pendingDvktCount
            });
        }

        [HttpGet("cho-kham")]
        [Authorize]
        public async Task<IActionResult> GetChoKham([FromQuery] long idBacSi, [FromQuery] int idPhong)
        {
            var actorId = GetCurrentUserId() ?? idBacSi;
            if (!await HasKhamBenhPermissionAsync(actorId, "xem"))
                return StatusCode(403, new { success = false, message = "Ban khong co quyen xem hang doi kham." });

            if (!await HasRoomScopeAsync(actorId, idPhong))
                return Ok(new { success = true, count = 0, data = Array.Empty<object>() });

            var raw = await _db.LanKhams
                .Include(x => x.IdBenhNhanNavigation)
                .Include(x => x.IdHoSoNavigation)
                .Where(x => x.TrangThai == TrangThai.ChoKham
                            && x.IdPhong == idPhong
                            && x.IdHoSoNavigation != null
                            && x.IdHoSoNavigation.TrangThai != "HUY"
                            && x.IdHoSoNavigation.TrangThai != TrangThai.Huy)
                .Select(x => new QueueVisitRow(
                    x.Id,
                    x.IdBenhNhan,
                    x.IdBenhNhanNavigation != null ? x.IdBenhNhanNavigation.HoTen : "",
                    x.IdBenhNhanNavigation != null ? x.IdBenhNhanNavigation.MaBn : "",
                    x.IdHoSoNavigation != null ? x.IdHoSoNavigation.MaHs : "",
                    x.IdHoSoNavigation != null ? x.IdHoSoNavigation.GhiChu : null,
                    x.CreatedAt,
                    x.ThoiGianBatDau,
                    x.ThoiGianKetThuc,
                    x.TrangThai,
                    x.ChanDoanCuoi,
                    x.HuongXuTri
                ))
                .ToListAsync();

            var list = BuildQueueList(raw);
            return Ok(new { success = true, count = list.Count, data = list });
        }

        [HttpGet("da-kham")]
        [Authorize]
        public async Task<IActionResult> GetDaKham([FromQuery] long idBacSi, [FromQuery] int idPhong)
        {
            var actorId = GetCurrentUserId() ?? idBacSi;
            if (!await HasKhamBenhPermissionAsync(actorId, "xem"))
                return StatusCode(403, new { success = false, message = "Ban khong co quyen xem danh sach da kham." });

            if (!await HasRoomScopeAsync(actorId, idPhong))
                return Ok(new { success = true, data = Array.Empty<object>() });

            var raw = await _db.LanKhams
                .Include(x => x.IdBenhNhanNavigation)
                .Include(x => x.IdHoSoNavigation)
                .Where(x => x.IdPhong == idPhong
                            && x.TrangThai == TrangThai.DaKham)
                .OrderByDescending(x => x.ThoiGianKetThuc)
                .Select(x => new QueueVisitRow(
                    x.Id,
                    x.IdBenhNhan,
                    x.IdBenhNhanNavigation != null ? x.IdBenhNhanNavigation.HoTen : "",
                    x.IdBenhNhanNavigation != null ? x.IdBenhNhanNavigation.MaBn : "",
                    x.IdHoSoNavigation != null ? x.IdHoSoNavigation.MaHs : "",
                    x.IdHoSoNavigation != null ? x.IdHoSoNavigation.GhiChu : null,
                    x.CreatedAt,
                    x.ThoiGianBatDau,
                    x.ThoiGianKetThuc,
                    TrangThai.DaKham,
                    x.ChanDoanCuoi,
                    x.HuongXuTri
                ))
                .ToListAsync();

            var list = BuildQueueList(raw);
            return Ok(new { success = true, data = list });
        }

        [HttpGet("hom-nay")]
        [Authorize]
        public async Task<IActionResult> GetHomNay([FromQuery] long idBacSi, [FromQuery] int idPhong)
        {
            var today = DateTime.Today;

            var actorId = GetCurrentUserId() ?? idBacSi;
            if (!await HasKhamBenhPermissionAsync(actorId, "xem"))
                return StatusCode(403, new { success = false, message = "Ban khong co quyen xem danh sach hom nay." });

            if (!await HasRoomScopeAsync(actorId, idPhong))
                return Ok(new { success = true, data = Array.Empty<object>() });

            var raw = await _db.LanKhams
                .Include(x => x.IdBenhNhanNavigation)
                .Include(x => x.IdHoSoNavigation)
                .Where(x =>
                    x.IdPhong == idPhong &&
                    x.TrangThai != TrangThai.Huy &&
                    (
                        (x.CreatedAt.HasValue && x.CreatedAt.Value.Date == today) ||
                        x.TrangThai == TrangThai.DangKham
                    ))
                .Select(x => new QueueVisitRow(
                    x.Id,
                    x.IdBenhNhan,
                    x.IdBenhNhanNavigation != null ? x.IdBenhNhanNavigation.HoTen : "",
                    x.IdBenhNhanNavigation != null ? x.IdBenhNhanNavigation.MaBn : "",
                    x.IdHoSoNavigation != null ? x.IdHoSoNavigation.MaHs : "",
                    x.IdHoSoNavigation != null ? x.IdHoSoNavigation.GhiChu : null,
                    x.CreatedAt,
                    x.ThoiGianBatDau,
                    x.ThoiGianKetThuc,
                    x.TrangThai,
                    x.ChanDoanCuoi,
                    x.HuongXuTri
                ))
                .ToListAsync();

            var list = BuildQueueList(raw);
            return Ok(new { success = true, data = list });
        }

        [HttpPatch("{id}/start")]
        [Authorize]
        public async Task<IActionResult> StartKham(long id, [FromQuery] long? idBacSi)
        {
            var kham = await _db.LanKhams
                .Include(x => x.IdHoSoNavigation)
                .FirstOrDefaultAsync(x => x.Id == id);

            if (kham == null)
                return NotFound(new { success = false, message = "Khong tim thay luot kham." });

            var featurePermissionError = await EnsureKhamBenhPermissionAsync("sua");
            if (featurePermissionError != null)
                return featurePermissionError;

            var status = Normalize(kham.TrangThai);
            if (IsLockedLanKhamForDoctor(kham.TrangThai) && status != TrangThai.DaThanhToan)
                return BadRequest(new { success = false, message = "Luot kham da khoa, khong the bat dau kham." });

            var actorId = GetCurrentUserId() ?? idBacSi;
            var permissionError = await EnsureCanTouchVisit(kham);
            if (permissionError != null)
                return permissionError;

            if (actorId.HasValue)
            {
                if (kham.IdBacSi.HasValue && kham.IdBacSi.Value != actorId.Value)
                    return BadRequest(new { success = false, message = "Luot kham da duoc gan cho bac si khac." });

                kham.IdBacSi ??= actorId.Value;
            }

            if (string.IsNullOrWhiteSpace(status) || status == TrangThai.ChoKham || status == TrangThai.DaThanhToan)
            {
                kham.TrangThai = TrangThai.DangKham;
                kham.ThoiGianBatDau ??= DateTime.Now;
                kham.UpdatedAt = DateTime.Now;
            }
            else if (status != TrangThai.DangKham)
            {
                return BadRequest(new { success = false, message = $"Trang thai {status} khong cho phep bat dau kham." });
            }

            if (kham.IdHoSoNavigation != null)
            {
                var transition = EnsureHoSoDoctorStatus(
                    kham.IdHoSoNavigation,
                    TrangThai.DangKham,
                    actorId,
                    "DOCTOR_START_EXAM",
                    "Bac si bat dau kham."
                );

                if (!transition.Success)
                    return BadRequest(new { success = false, message = transition.ErrorMessage });
            }

            await _db.SaveChangesAsync();
            await _audit.WriteAsync(
                kham.Id,
                "START_EXAM",
                "LAN_KHAM",
                kham.Id,
                duLieuSau: new { kham.TrangThai, kham.IdBacSi, kham.ThoiGianBatDau });

            return Ok(new { success = true, message = "Da bat dau kham.", data = new { idLanKham = kham.Id, trangThai = kham.TrangThai } });
        }

        [HttpGet("benh/search")]
        public async Task<IActionResult> SearchBenh([FromQuery] string? q = "")
        {
            var keyword = (q ?? string.Empty).Trim();
            var query = _db.Benhs.AsNoTracking();

            if (!string.IsNullOrWhiteSpace(keyword))
            {
                query = query.Where(x => x.Ma.Contains(keyword) || x.Ten.Contains(keyword));
            }

            var raw = await query
                .OrderBy(x => x.Ma)
                .ThenBy(x => x.Id)
                .Take(1000)
                .Select(x => new
                {
                    id = x.Id,
                    ma = x.Ma,
                    ten = x.Ten
                })
                .ToListAsync();

            var data = raw
                .GroupBy(x => string.IsNullOrWhiteSpace(x.ma)
                    ? (x.ten ?? string.Empty).Trim().ToUpperInvariant()
                    : x.ma.Trim().ToUpperInvariant())
                .Select(x => x.First())
                .Take(string.IsNullOrWhiteSpace(keyword) ? 200 : 150)
                .ToList();

            return Ok(new { success = true, data });
        }

        [HttpGet("{id}/audit")]
        [Authorize]
        public async Task<IActionResult> GetAuditLogs(long id)
        {
            var kham = await _db.LanKhams
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.Id == id);

            if (kham == null)
                return NotFound(new { success = false, message = "Khong tim thay luot kham." });

            var featurePermissionError = await EnsureKhamBenhPermissionAsync("xem");
            if (featurePermissionError != null)
                return featurePermissionError;

            var permissionError = await EnsureCanTouchVisit(kham);
            if (permissionError != null)
                return permissionError;

            var logs = await _db.KhamBenhAuditLogs
                .AsNoTracking()
                .Where(x => x.IdLanKham == id)
                .OrderByDescending(x => x.CreatedAt)
                .Select(x => new
                {
                    x.Id,
                    x.HanhDong,
                    x.DoiTuong,
                    x.IdDoiTuong,
                    x.LyDo,
                    x.IdNguoiThucHien,
                    x.TenNguoiThucHien,
                    x.IdBacSiChuSoHuu,
                    x.IdPhong,
                    x.IpAddress,
                    x.UserAgent,
                    x.CreatedAt,
                    x.DuLieuTruoc,
                    x.DuLieuSau
                })
                .ToListAsync();

            return Ok(new { success = true, data = logs });
        }

        [HttpPut("{id}")]
        [Authorize]
        public async Task<IActionResult> UpdateKetQua(long id, [FromBody] LanKhamUpdateDto dto)
        {
            var kham = await _db.LanKhams
                .Include(x => x.IdHoSoNavigation)
                .FirstOrDefaultAsync(x => x.Id == id);

            if (kham == null)
                return NotFound(new { success = false, message = "Khong tim thay luot kham." });

            var featurePermissionError = await EnsureKhamBenhPermissionAsync("sua");
            if (featurePermissionError != null)
                return featurePermissionError;

            if (IsLockedLanKhamForDoctor(kham.TrangThai))
                return BadRequest(new { success = false, message = "Ho so da khoa, khong the chinh sua ket qua kham." });

            var permissionError = await EnsureCanTouchVisit(kham);
            if (permissionError != null)
                return permissionError;

            var beforeAudit = new
            {
                kham.TrangThai,
                kham.ChanDoanSoBo,
                kham.ChanDoanCuoi,
                kham.KetQuaKham,
                kham.HuongXuTri,
                kham.IdBenh,
                kham.BenhKemTheo,
                kham.GhiChu
            };

            var errors = ValidateExamResult(dto);
            if (errors.Count > 0)
            {
                return BadRequest(new
                {
                    success = false,
                    message = "Ket qua kham chua du thong tin bat buoc.",
                    errors
                });
            }

            var treatmentKey = GetTreatmentKey(dto);
            var conclusionPaperType = ToConclusionPaperType(treatmentKey);
            var conclusionPaper = BuildConclusionPaperDto(dto, conclusionPaperType);
            var isFollowUpTreatment = IsTreatment(treatmentKey, "HEN KHAM");
            var isNoExamTreatment = IsTreatment(treatmentKey, "KHONG KHAM");
            var signedFollowUp = isFollowUpTreatment &&
                (dto.GiayHenKhamLai?.DaKy == true || conclusionPaper.DaKy);
            var followUpDate = conclusionPaper.NgayHen ?? dto.GiayHenKhamLai?.NgayHen ?? DateTime.Now.AddDays(7);
            if (signedFollowUp && followUpDate.Date < DateTime.Today)
            {
                return BadRequest(new
                {
                    success = false,
                    message = "Ngay hen kham lai khong duoc nam trong qua khu."
                });
            }
            if (signedFollowUp &&
                (string.IsNullOrWhiteSpace(conclusionPaper.LyDoHen) ||
                 string.IsNullOrWhiteSpace(conclusionPaper.BenhKemTheo) ||
                 string.IsNullOrWhiteSpace(conclusionPaper.PhongHen)))
            {
                return BadRequest(new
                {
                    success = false,
                    message = "Giay hen kham lai thieu ly do hen, chan doan hoac phong hen."
                });
            }

            if (isFollowUpTreatment)
            {
                var hasSignedFollowUp = await _db.GiayHenKhamLais
                    .AnyAsync(x => x.IdLanKham == id && x.DaKy && x.SignedAt.HasValue);
                var hasSignedConclusionPaper = await _db.GiayKetLuanKhams
                    .AnyAsync(x => x.IdLanKham == id && x.LoaiGiay == "HEN_KHAM" && x.DaKy && x.SignedAt.HasValue);
                if (!hasSignedFollowUp && !hasSignedConclusionPaper && !signedFollowUp)
                {
                    return BadRequest(new
                    {
                        success = false,
                        message = "Can lap va ky giay hen kham lai truoc khi ket luan."
                    });
                }
            }

            if (isNoExamTreatment)
            {
                var hasPaidInvoice = await HasPaidInvoiceForVisit(id);
                var hasPendingElectronicPayment = await HasPendingElectronicPaymentForVisit(id);
                var hasLockedServices = await HasLockedClinicalServices(id);
                if (hasPaidInvoice || hasPendingElectronicPayment || hasLockedServices)
                {
                    return Conflict(new
                    {
                        success = false,
                        state = hasPendingElectronicPayment
                            ? "PAYMENT_TRANSACTION_PENDING"
                            : hasPaidInvoice
                                ? "VISIT_HAS_PAID_INVOICE"
                                : "CLINICAL_SERVICE_ALREADY_ACCEPTED",
                        message = hasPendingElectronicPayment
                            ? "Lượt khám đang có giao dịch QR/VNPay chờ kết quả, không thể kết luận Không khám."
                            : hasPaidInvoice
                                ? "Lượt khám đã có hóa đơn thanh toán, không thể kết luận Không khám trực tiếp."
                                : "Đã có chỉ định được khoa thực hiện tiếp nhận hoặc có kết quả, không thể kết luận Không khám trực tiếp."
                    });
                }
            }

            if (!isNoExamTreatment)
            {
                var completedClsStatuses = new[]
                {
                    "done", "paid", "completed", "sent", "da_hoan_thanh", "da_thanh_toan",
                    "canceled", "cancelled", "da_huy", "huy"
                };
                var blockingCls = await _db.ChiDinhDvkts
                    .Include(x => x.IdDvktNavigation)
                    .Where(x => x.IdLanKham == id)
                    .Where(x => x.TrangThai == null || !completedClsStatuses.Contains(x.TrangThai.ToLower()))
                    .Select(x => new
                    {
                        x.Id,
                        x.TrangThai,
                        TenDvkt = x.IdDvktNavigation.TenDvkt
                    })
                    .ToListAsync();

                if (blockingCls.Count > 0)
                {
                    return BadRequest(new
                    {
                        success = false,
                        message = "Con CLS dang cho/dang thuc hien, chua the ket luan.",
                        data = blockingCls
                    });
                }
            }

            var hasVital = kham.IdSinhHieu.HasValue ||
                           await _db.SinhHieus.AnyAsync(x => x.IdLanKham == id);
            if (!isNoExamTreatment && !hasVital && !dto.ConfirmNoVital)
            {
                return BadRequest(new
                {
                    success = false,
                    message = "Luot kham chua co sinh hieu. Can xac nhan neu van muon ket luan.",
                    code = "MISSING_VITAL"
                });
            }

            if (!isNoExamTreatment && dto.IdBenh.HasValue)
            {
                var diseaseExists = await _db.Benhs.AnyAsync(x => x.Id == dto.IdBenh.Value);
                if (!diseaseExists)
                    return BadRequest(new { success = false, message = "Ma ICD/benh chinh khong hop le." });
            }

            var extraDiseaseIds = (dto.IdBenhKemTheo ?? new List<long>())
                .Where(x => x > 0 && x != dto.IdBenh)
                .Distinct()
                .ToList();
            if (isNoExamTreatment)
                extraDiseaseIds.Clear();

            if (!isNoExamTreatment && extraDiseaseIds.Count > 0)
            {
                var validDiseaseCount = await _db.Benhs.CountAsync(x => extraDiseaseIds.Contains(x.Id));
                if (validDiseaseCount != extraDiseaseIds.Count)
                    return BadRequest(new { success = false, message = "Danh sach ICD/benh kem theo khong hop le." });
            }

            kham.ChanDoanSoBo = dto.ChanDoanSoBo;
            kham.ChanDoanCuoi = dto.ChanDoanCuoi;
            kham.KetQuaKham = string.IsNullOrWhiteSpace(dto.KetThucKham?.KetQua) ? dto.KetQuaKham : dto.KetThucKham.KetQua;
            kham.HuongXuTri = string.IsNullOrWhiteSpace(dto.KetThucKham?.HuongDieuTri) ? dto.HuongXuTri : dto.KetThucKham.HuongDieuTri;
            kham.IdBenh = isNoExamTreatment ? null : dto.IdBenh;
            kham.BenhKemTheo = isNoExamTreatment ? null : dto.BenhKemTheo;
            kham.GhiChu = dto.GhiChu;
            kham.ThoiGianKetThuc = DateTime.Now;
            kham.TrangThai = TrangThai.DaKham;
            kham.UpdatedAt = DateTime.Now;
            kham.IdBacSi ??= GetCurrentUserId();

            if (isNoExamTreatment)
                await CancelPendingClinicalOrders(id);

            await UpsertConclusionPaper(id, kham, conclusionPaperType, conclusionPaper, followUpDate, signedFollowUp);

            if (signedFollowUp)
            {
                var now = DateTime.Now;
                var existingFollowUp = await _db.GiayHenKhamLais
                    .Where(x => x.IdLanKham == id)
                    .OrderByDescending(x => x.CreatedAt)
                    .FirstOrDefaultAsync();

                if (existingFollowUp == null)
                {
                    _db.GiayHenKhamLais.Add(new GiayHenKhamLai
                    {
                        IdLanKham = id,
                        IdBenhNhan = kham.IdBenhNhan,
                        IdBacSi = kham.IdBacSi,
                        HinhThucDieuTri = conclusionPaper.HinhThucDieuTri,
                        KetQua = conclusionPaper.KetQua,
                        LyDoHen = conclusionPaper.LyDoHen,
                        BenhKemTheo = conclusionPaper.BenhKemTheo,
                        LoiDan = conclusionPaper.LoiDan,
                        NgayHen = followUpDate,
                        PhongHen = conclusionPaper.PhongHen,
                        GhiChu = conclusionPaper.GhiChu,
                        DaKy = true,
                        BacSiKy = string.IsNullOrWhiteSpace(conclusionPaper.BacSiKy) ? "Bac si dieu tri" : conclusionPaper.BacSiKy.Trim(),
                        SignedAt = NormalizeClientDateTime(conclusionPaper.SignedAt ?? now),
                        CreatedAt = now
                    });
                }
                else
                {
                    existingFollowUp.IdBenhNhan = kham.IdBenhNhan;
                    existingFollowUp.IdBacSi = kham.IdBacSi;
                    existingFollowUp.HinhThucDieuTri = conclusionPaper.HinhThucDieuTri;
                    existingFollowUp.KetQua = conclusionPaper.KetQua;
                    existingFollowUp.LyDoHen = conclusionPaper.LyDoHen;
                    existingFollowUp.BenhKemTheo = conclusionPaper.BenhKemTheo;
                    existingFollowUp.LoiDan = conclusionPaper.LoiDan;
                    existingFollowUp.NgayHen = followUpDate;
                    existingFollowUp.PhongHen = conclusionPaper.PhongHen;
                    existingFollowUp.GhiChu = conclusionPaper.GhiChu;
                    existingFollowUp.DaKy = true;
                    existingFollowUp.BacSiKy = string.IsNullOrWhiteSpace(conclusionPaper.BacSiKy) ? "Bac si dieu tri" : conclusionPaper.BacSiKy.Trim();
                    existingFollowUp.SignedAt = NormalizeClientDateTime(conclusionPaper.SignedAt ?? now);
                    existingFollowUp.UpdatedAt = now;
                }
            }

            var oldExtraDiseases = await _db.LanKhamBenhKemTheos
                .Where(x => x.IdLanKham == id)
                .ToListAsync();
            if (oldExtraDiseases.Count > 0)
                _db.LanKhamBenhKemTheos.RemoveRange(oldExtraDiseases);

            for (var i = 0; i < extraDiseaseIds.Count; i++)
            {
                _db.LanKhamBenhKemTheos.Add(new LanKhamBenhKemTheo
                {
                    IdLanKham = id,
                    IdBenh = extraDiseaseIds[i],
                    ThuTu = i + 1,
                    CreatedAt = DateTime.Now
                });
            }

            var remainingRooms = await CountRemainingActiveRooms(id, kham.IdHoSo);
            if (kham.IdHoSoNavigation != null)
            {
                var targetStatus = remainingRooms == 0 ? TrangThai.DaKham : TrangThai.DangKham;
                var transition = EnsureHoSoDoctorStatus(
                    kham.IdHoSoNavigation,
                    targetStatus,
                    GetCurrentUserId(),
                    remainingRooms == 0 ? "DOCTOR_COMPLETE_EXAM" : "DOCTOR_COMPLETE_ROOM_EXAM",
                    remainingRooms == 0
                        ? "Bac si cap nhat ket qua kham, khong con phong dang cho."
                        : $"Da xong phong hien tai, con {remainingRooms} luot/phong kham chua ket thuc."
                );

                if (!transition.Success)
                    return BadRequest(new { success = false, message = transition.ErrorMessage });
            }

            await _db.SaveChangesAsync();
            var afterAudit = new
            {
                kham.TrangThai,
                kham.ChanDoanSoBo,
                kham.ChanDoanCuoi,
                kham.KetQuaKham,
                kham.HuongXuTri,
                kham.IdBenh,
                kham.BenhKemTheo,
                kham.GhiChu,
                remainingRooms
            };

            await _audit.WriteAsync(
                kham.Id,
                "SAVE_EXAM_RESULT",
                "LAN_KHAM",
                kham.Id,
                duLieuTruoc: beforeAudit,
                duLieuSau: afterAudit);

            await _audit.WriteAsync(
                kham.Id,
                "CONCLUDE_EXAM",
                "LAN_KHAM",
                kham.Id,
                duLieuTruoc: beforeAudit,
                duLieuSau: afterAudit);

            return Ok(new
            {
                success = true,
                message = "Cap nhat ket qua kham thanh cong.",
                encounterClosed = remainingRooms == 0,
                remainingRooms
            });
        }

        [HttpPost("{id}/giay-hen-kham-lai/pdf")]
        [Authorize]
        public async Task<IActionResult> ExportGiayHenKhamLaiPdf(long id, [FromBody] GiayHenKhamLaiDto dto)
        {
            var kham = await _db.LanKhams
                .Include(x => x.IdBenhNhanNavigation)
                .Include(x => x.IdPhongNavigation)
                .Include(x => x.IdBacSiNavigation)
                .Include(x => x.IdHoSoNavigation)
                .FirstOrDefaultAsync(x => x.Id == id);

            if (kham == null)
                return NotFound(new { success = false, message = "Khong tim thay luot kham." });

            var featurePermissionError = await EnsureKhamBenhPermissionAsync("xuat");
            if (featurePermissionError != null)
                return featurePermissionError;

            if (!dto.DaKy)
                return BadRequest(new { success = false, message = "Bac si can ky ten truoc khi luu giay hen kham lai." });

            var bn = kham.IdBenhNhanNavigation;
            var phong = kham.IdPhongNavigation;
            var bacSi = kham.IdBacSiNavigation;
            var ngayHen = dto.NgayHen ?? DateTime.Now.AddDays(7);
            var ngayLap = DateTime.Now;
            DateTime? signedAt = dto.DaKy ? NormalizeClientDateTime(dto.SignedAt ?? ngayLap) : null;

            if (ngayHen.Date < DateTime.Today)
                return BadRequest(new { success = false, message = "Ngay hen kham lai khong duoc nam trong qua khu." });

            if (string.IsNullOrWhiteSpace(dto.LyDoHen) ||
                string.IsNullOrWhiteSpace(dto.BenhKemTheo) ||
                string.IsNullOrWhiteSpace(dto.PhongHen))
            {
                return BadRequest(new { success = false, message = "Giay hen kham lai thieu ly do hen, chan doan hoac phong hen." });
            }

            static string Safe(string? value, string fallback = "---")
                => string.IsNullOrWhiteSpace(value) ? fallback : value.Trim();

            var diaChi = string.Join(", ", new[]
                {
                    bn?.DiaChiDuong,
                    bn?.DiaChiXa,
                    bn?.DiaChiHuyen,
                    bn?.DiaChiTinh
                }
                .Where(x => !string.IsNullOrWhiteSpace(x)));

            var hoSo = kham.IdHoSoNavigation;
            var ngayKham = kham.ThoiGianBatDau ?? kham.CreatedAt ?? ngayLap;
            var signedDoctor = Safe(dto.BacSiKy, bacSi?.HoTen ?? "Bac si kham benh");
            var departmentName = Safe(phong?.KhoaPhong, "Khoa Kham benh");
            var roomName = Safe(dto.PhongHen, Safe(phong?.TenPhong));
            var recordCode = Safe(hoSo?.MaHs, id.ToString());

            static string DateText(DateTime? value)
                => value.HasValue ? value.Value.ToString("dd/MM/yyyy") : "---";

            static string DateOnlyText(DateOnly? value)
                => value.HasValue ? value.Value.ToString("dd/MM/yyyy") : "---";

            static string GenderText(string? value)
                => string.IsNullOrWhiteSpace(value) ? "---" : value.Trim();

            static void Barcode(IContainer container, string code)
            {
                var clean = string.IsNullOrWhiteSpace(code) ? "0000000000" : code.Trim().ToUpperInvariant();
                var checksum = clean.Aggregate(0, (sum, ch) => sum + ch);

                container.Column(col =>
                {
                    col.Item().Height(30).AlignCenter().Row(row =>
                    {
                        for (var i = 0; i < 34; i++)
                        {
                            var width = 1 + ((checksum + i * 7) % 3);
                            row.ConstantItem(width).Height(30).Background(Colors.Black);
                            row.ConstantItem(1.5f);
                        }
                    });
                    col.Item().AlignCenter().Text(clean).FontSize(7).FontColor(Colors.Grey.Darken2);
                });
            }

            QuestPDF.Settings.License = LicenseType.Community;
            var pdf = Document.Create(container =>
            {
                container.Page(page =>
                {
                    page.Size(PageSizes.A4);
                    page.Margin(36);
                    page.DefaultTextStyle(TextStyle.Default.FontFamily("Times New Roman").FontSize(11).LineHeight(1.25f));

                    page.Header().Row(header =>
                    {
                        header.RelativeItem(1).Column(left =>
                        {
                            left.Item().Text("BỆNH VIỆN CHỢ RẪY").Bold().FontSize(11);
                            left.Item().Text(departmentName).FontSize(10);
                        });
                        header.RelativeItem(1.5f).AlignCenter().Column(center =>
                        {
                            center.Item().Text("CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM").Bold().FontSize(11);
                            center.Item().Text("Độc lập - Tự do - Hạnh phúc").Bold().Underline().FontSize(10);
                        });
                    });

                    page.Content().PaddingTop(20).Column(stack =>
                    {
                        stack.Item().Row(title =>
                        {
                            title.RelativeItem().AlignCenter().Text("GIẤY HẸN KHÁM LẠI").Bold().FontSize(18);
                            title.ConstantItem(150).Element(box => Barcode(box, recordCode));
                        });

                        stack.Item().PaddingTop(14).Column(section =>
                        {
                            section.Spacing(5);
                            section.Item().Text("1. Hành chính").Bold();
                            section.Item().Row(row =>
                            {
                                row.RelativeItem().Text(t =>
                                {
                                    t.Span("- Họ tên: ");
                                    t.Span(Safe(bn?.HoTen)).Bold();
                                });
                                row.ConstantItem(110).Text(t =>
                                {
                                    t.Span("Năm sinh: ");
                                    t.Span(bn?.NgaySinh.HasValue == true ? bn.NgaySinh.Value.Year.ToString() : "---");
                                });
                                row.ConstantItem(90).Text(t =>
                                {
                                    t.Span("Giới tính: ");
                                    t.Span(GenderText(bn?.GioiTinh));
                                });
                                row.ConstantItem(118).Text(t =>
                                {
                                    t.Span("Số hồ sơ: ");
                                    t.Span(recordCode);
                                });
                            });
                            section.Item().Text(t =>
                            {
                                t.Span("- Địa chỉ: ");
                                t.Span(Safe(diaChi));
                            });
                            section.Item().Text(t =>
                            {
                                t.Span("- Số thẻ BHYT: ");
                                t.Span("---");
                                t.Span("        Từ ngày: ---        Đến ngày: ---");
                            });
                        });

                        stack.Item().PaddingTop(10).Column(section =>
                        {
                            section.Spacing(5);
                            section.Item().Text("2. Thông tin chuyển tuyến").Bold();
                            section.Item().Text(t =>
                            {
                                t.Span("- Bệnh viện chuyển đến: ");
                                t.Span(Safe(dto.HinhThucDieuTri, "Khám lại theo hẹn"));
                            });
                            section.Item().Text("- Số giấy chuyển tuyến: ---");
                        });

                        stack.Item().PaddingTop(10).Column(section =>
                        {
                            section.Spacing(6);
                            section.Item().Text("3. Thông tin khám bệnh lần này").Bold();
                            section.Item().Row(row =>
                            {
                                row.RelativeItem().Text(t =>
                                {
                                    t.Span("- Điều trị ngoại trú từ ngày: ");
                                    t.Span(DateText(ngayKham));
                                });
                                row.RelativeItem().Text(t =>
                                {
                                    t.Span("đến ngày: ");
                                    t.Span(DateText(ngayLap));
                                });
                            });
                            section.Item().Text(t =>
                            {
                                t.Span("- Chẩn đoán: ");
                                t.Span(Safe(dto.BenhKemTheo, Safe(kham.ChanDoanCuoi)));
                            });
                            section.Item().Text(t =>
                            {
                                t.Span("- Ngày hẹn khám lại: ");
                                t.Span($"{ngayHen:dd/MM/yyyy}").Bold();
                            });
                            section.Item().PaddingTop(4).Text(t =>
                            {
                                t.Span("Tái khám phòng ");
                                t.Span(roomName).Bold();
                                t.Span($" bệnh viện Chợ Rẫy ngày {ngayHen:dd/MM/yyyy}");
                            });
                            section.Item().Text(t =>
                            {
                                t.Span("Hoặc khám lại bất kỳ thời gian nào trước ngày hẹn khám nếu có dấu hiệu bất thường");
                                t.Span(" (triệu chứng bất thường tái phát, diễn tiến nặng hoặc theo lời dặn của bác sĩ).").Italic();
                            });
                            section.Item().PaddingTop(4).Text(t =>
                            {
                                t.Span("- Quá trình bệnh lý / lý do hẹn: ");
                                t.Span(Safe(dto.LyDoHen));
                            });
                            section.Item().Text(t =>
                            {
                                t.Span("- Lời dặn: ");
                                t.Span(Safe(dto.LoiDan));
                            });
                            section.Item().Text(t =>
                            {
                                t.Span("- Ghi chú: ");
                                t.Span(Safe(dto.GhiChu));
                            });
                        });

                        stack.Item().PaddingTop(10).Text("- Giấy hẹn khám lại chỉ có giá trị sử dụng 01 (một) lần trong thời hạn 10 ngày làm việc, kể từ ngày được hẹn khám lại.").Italic();

                        stack.Item().PaddingTop(38).Row(row =>
                        {
                            row.RelativeItem();
                            row.ConstantItem(250).AlignCenter().Column(sign =>
                            {
                                sign.Item().Text("BÁC SĨ KHÁM BỆNH").Bold();
                                sign.Item().Text($"Ngày {ngayLap:dd} tháng {ngayLap:MM} năm {ngayLap:yyyy}").FontSize(10);
                                sign.Item().Height(72);
                                sign.Item().Text(signedDoctor).Bold().FontSize(12);
                                if (signedAt.HasValue)
                                    sign.Item().Text($"Ký lúc: {signedAt.Value:HH:mm:ss d/M/yyyy}").FontSize(8).FontColor(Colors.Grey.Darken1);
                            });
                        });
                    });

                    page.Footer().AlignCenter().Text(t =>
                    {
                        t.Span("Mã BN: ").FontSize(8).FontColor(Colors.Grey.Darken1);
                        t.Span(Safe(bn?.MaBn)).FontSize(8).FontColor(Colors.Grey.Darken1);
                        t.Span(" - Ngày sinh: ").FontSize(8).FontColor(Colors.Grey.Darken1);
                        t.Span(DateOnlyText(bn?.NgaySinh)).FontSize(8).FontColor(Colors.Grey.Darken1);
                    });
                });
            }).GeneratePdf();

            var existing = await _db.GiayHenKhamLais
                .Where(x => x.IdLanKham == id)
                .OrderByDescending(x => x.CreatedAt)
                .FirstOrDefaultAsync();

            if (existing == null)
            {
                _db.GiayHenKhamLais.Add(new GiayHenKhamLai
                {
                    IdLanKham = id,
                    IdBenhNhan = kham.IdBenhNhan,
                    IdBacSi = kham.IdBacSi,
                    HinhThucDieuTri = dto.HinhThucDieuTri,
                    KetQua = dto.KetQua,
                    LyDoHen = dto.LyDoHen,
                    BenhKemTheo = dto.BenhKemTheo,
                    LoiDan = dto.LoiDan,
                    NgayHen = ngayHen,
                    PhongHen = dto.PhongHen,
                    GhiChu = dto.GhiChu,
                    DaKy = dto.DaKy,
                    BacSiKy = dto.DaKy ? Safe(dto.BacSiKy, bacSi?.HoTen ?? "Bac si dieu tri") : null,
                    SignedAt = signedAt,
                    CreatedAt = ngayLap
                });
            }
            else
            {
                existing.IdBenhNhan = kham.IdBenhNhan;
                existing.IdBacSi = kham.IdBacSi;
                existing.HinhThucDieuTri = dto.HinhThucDieuTri;
                existing.KetQua = dto.KetQua;
                existing.LyDoHen = dto.LyDoHen;
                existing.BenhKemTheo = dto.BenhKemTheo;
                existing.LoiDan = dto.LoiDan;
                existing.NgayHen = ngayHen;
                existing.PhongHen = dto.PhongHen;
                existing.GhiChu = dto.GhiChu;
                existing.DaKy = dto.DaKy;
                existing.BacSiKy = dto.DaKy ? Safe(dto.BacSiKy, bacSi?.HoTen ?? "Bac si dieu tri") : null;
                existing.SignedAt = signedAt;
                existing.UpdatedAt = ngayLap;
            }

            await _db.SaveChangesAsync();
            if (dto.DaKy)
            {
                await _audit.WriteAsync(
                    id,
                    "SIGN_PAPER",
                    "GIAY_HEN_KHAM_LAI",
                    existing?.Id,
                    duLieuSau: new { dto.DaKy, dto.BacSiKy, signedAt, ngayHen });
            }

            await _audit.WriteAsync(
                id,
                "PRINT_DOCUMENT",
                "GIAY_HEN_KHAM_LAI",
                existing?.Id,
                duLieuSau: new { fileName = $"GIAY_HEN_KHAM_LAI_{Safe(bn?.MaBn, id.ToString())}_{ngayHen:yyyyMMdd}.pdf" });

            var fileName = $"GIAY_HEN_KHAM_LAI_{Safe(bn?.MaBn, id.ToString())}_{ngayHen:yyyyMMdd}.pdf";
            return File(pdf, "application/pdf", fileName);
        }

        [HttpPost("{id}/giay-ket-luan/pdf")]
        [Authorize]
        public async Task<IActionResult> ExportGiayKetLuanKhamPdf(long id, [FromBody] GiayKetLuanKhamDto dto)
        {
            var kham = await _db.LanKhams
                .Include(x => x.IdHoSoNavigation)
                .Include(x => x.IdBenhNhanNavigation)
                .Include(x => x.IdPhongNavigation)
                .Include(x => x.IdBacSiNavigation)
                .Include(x => x.IdBenhNavigation)
                .FirstOrDefaultAsync(x => x.Id == id);

            if (kham == null)
                return NotFound(new { success = false, message = "Khong tim thay luot kham." });

            var featurePermissionError = await EnsureKhamBenhPermissionAsync("xuat");
            if (featurePermissionError != null)
                return featurePermissionError;

            var paperType = ToConclusionPaperType(dto.LoaiGiay ?? dto.HinhThucDieuTri ?? kham.HuongXuTri);
            dto.LoaiGiay = paperType;
            dto.HinhThucDieuTri = FirstText(dto.HinhThucDieuTri, kham.HuongXuTri, CanonicalTreatmentName(paperType));
            dto.KetQua = FirstText(dto.KetQua, kham.KetQuaKham);
            dto.ChanDoan = FirstText(dto.ChanDoan, kham.ChanDoanCuoi, kham.ChanDoanSoBo, kham.IdBenhNavigation?.Ten);
            dto.BenhKemTheo = FirstText(dto.BenhKemTheo, kham.BenhKemTheo, dto.ChanDoan);
            dto.BacSiKy = FirstText(dto.BacSiKy, kham.IdBacSiNavigation?.HoTen, "Bac si dieu tri");

            var errors = ValidateConclusionPaperForPdf(dto);
            if (errors.Count > 0)
            {
                return BadRequest(new
                {
                    success = false,
                    message = "Giay ket luan chua du thong tin bat buoc.",
                    errors
                });
            }

            var bn = kham.IdBenhNhanNavigation;
            var hs = kham.IdHoSoNavigation;
            var phong = kham.IdPhongNavigation;
            var printedAt = DateTime.Now;
            var title = ConclusionPaperTitle(paperType);
            static string SafePdf(string? value, string fallback = "---")
                => string.IsNullOrWhiteSpace(value) ? fallback : value.Trim();

            var patientAddress = string.Join(", ", new[]
            {
                bn?.DiaChiDuong,
                bn?.DiaChiXa,
                bn?.DiaChiHuyen,
                bn?.DiaChiTinh
            }.Where(x => !string.IsNullOrWhiteSpace(x)));

            QuestPDF.Settings.License = LicenseType.Community;
            var pdf = Document.Create(container =>
            {
                container.Page(page =>
                {
                    page.Size(PageSizes.A4);
                    page.Margin(32);
                    page.DefaultTextStyle(TextStyle.Default.FontFamily("Times New Roman").FontSize(12));

                    page.Content().Column(stack =>
                    {
                        stack.Spacing(10);

                        stack.Item().Row(row =>
                        {
                            row.RelativeItem().Column(left =>
                            {
                                left.Item().Text("BỘ Y TẾ").FontSize(10);
                                left.Item().Text("PHÒNG KHÁM ĐA KHOA").Bold().FontSize(12);
                                left.Item().Text(SafePdf(phong?.KhoaPhong, "Khoa Khám bệnh")).FontSize(10);
                            });
                            row.RelativeItem().AlignCenter().Column(center =>
                            {
                                center.Item().Text("CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM").Bold().FontSize(11);
                                center.Item().Text("Độc lập - Tự do - Hạnh phúc").Bold().FontSize(10);
                            });
                            row.RelativeItem().AlignRight().Column(right =>
                            {
                                right.Item().Text($"Mã HS: {SafePdf(hs?.MaHs, id.ToString())}").FontSize(10);
                                right.Item().Text($"Mã NB: {SafePdf(bn?.MaBn)}").FontSize(10);
                                right.Item().Text($"Ngày lập: {printedAt:dd/MM/yyyy HH:mm}").FontSize(10);
                            });
                        });

                        stack.Item().LineHorizontal(1);
                        stack.Item().AlignCenter().Text(title).Bold().FontSize(18);

                        stack.Item().Border(1).BorderColor(Colors.Grey.Lighten2).Padding(8).Column(info =>
                        {
                            info.Spacing(4);
                            info.Item().Text(t =>
                            {
                                t.Span("Họ và tên: ").Bold();
                                t.Span(SafePdf(bn?.HoTen).ToUpperInvariant()).Bold();
                                t.Span("    Giới tính: ").Bold();
                                t.Span(SafePdf(bn?.GioiTinh));
                            });
                            info.Item().Text(t =>
                            {
                                t.Span("Ngày sinh: ").Bold();
                                t.Span(bn?.NgaySinh?.ToString("dd/MM/yyyy") ?? "---");
                                t.Span("    Số điện thoại: ").Bold();
                                t.Span(SafePdf(bn?.SoDienThoai));
                            });
                            info.Item().Text(t =>
                            {
                                t.Span("Địa chỉ: ").Bold();
                                t.Span(SafePdf(patientAddress));
                            });
                            info.Item().Text(t =>
                            {
                                t.Span("Phòng khám: ").Bold();
                                t.Span(SafePdf(phong?.TenPhong));
                                t.Span("    Hướng điều trị: ").Bold();
                                t.Span(SafePdf(dto.HinhThucDieuTri));
                            });
                            info.Item().Text(t =>
                            {
                                t.Span("Kết quả: ").Bold();
                                t.Span(SafePdf(dto.KetQua));
                            });
                        });

                        stack.Item().Column(body =>
                        {
                            body.Spacing(6);
                            body.Item().Text("NỘI DUNG").Bold().FontSize(13).FontColor(Colors.Blue.Darken3);
                            body.Item().Text(t =>
                            {
                                t.Span("Chẩn đoán: ").Bold();
                                t.Span(SafePdf(dto.ChanDoan));
                            });

                            if (paperType == "HEN_KHAM")
                            {
                                body.Item().Text(t => { t.Span("Quá trình bệnh lý / Lý do hẹn: ").Bold(); t.Span(SafePdf(dto.LyDoHen)); });
                                body.Item().Text(t => { t.Span("Chẩn đoán/bệnh kèm theo: ").Bold(); t.Span(SafePdf(dto.BenhKemTheo)); });
                                body.Item().Text(t => { t.Span("Lời dặn: ").Bold(); t.Span(SafePdf(dto.LoiDan)); });
                                body.Item().Text(t =>
                                {
                                    t.Span("Hẹn khám vào ngày: ").Bold().FontColor(Colors.Red.Medium);
                                    t.Span(dto.NgayHen?.ToString("dd/MM/yyyy") ?? "---").FontColor(Colors.Red.Medium);
                                    t.Span(" tại ");
                                    t.Span(SafePdf(dto.PhongHen));
                                });
                            }
                            else if (paperType == "NHAP_VIEN")
                            {
                                body.Item().Text(t => { t.Span("Lý do vào viện: ").Bold(); t.Span(SafePdf(dto.LyDoVaoVien)); });
                                body.Item().Text(t => { t.Span("Cho vào điều trị tại khoa: ").Bold(); t.Span(SafePdf(dto.KhoaNhapVien)); });
                                body.Item().Text(t => { t.Span("Ghi chú/lời dặn: ").Bold(); t.Span(SafePdf(dto.LoiDan)); });
                            }
                            else if (paperType == "CHUYEN_VIEN")
                            {
                                body.Item().Text(t => { t.Span("Kính gửi: ").Bold(); t.Span(SafePdf(dto.KinhGui)); });
                                body.Item().Text(t => { t.Span("Dấu hiệu lâm sàng: ").Bold(); t.Span(SafePdf(dto.DauHieuLamSang)); });
                                body.Item().Text(t => { t.Span("Lý do chuyển tuyến: ").Bold(); t.Span(SafePdf(dto.LyDoChuyenTuyen)); });
                                body.Item().Text(t => { t.Span("Hướng điều trị: ").Bold(); t.Span(SafePdf(dto.HuongDieuTriChuyenTuyen)); });
                                body.Item().Text(t => { t.Span("Phương tiện vận chuyển: ").Bold(); t.Span(SafePdf(dto.PhuongTienVanChuyen)); });
                            }
                            else if (paperType == "KHONG_KHAM")
                            {
                                body.Item().Text(t => { t.Span("Lý do không khám/bỏ về: ").Bold(); t.Span(SafePdf(dto.LyDoKhongKham)); });
                                body.Item().Text(t => { t.Span("Ghi chú: ").Bold(); t.Span(SafePdf(dto.GhiChu)); });
                            }
                            else
                            {
                                body.Item().Text(t => { t.Span("Lời dặn sau khám: ").Bold(); t.Span(SafePdf(dto.LoiDan)); });
                                body.Item().Text(t => { t.Span("Ghi chú: ").Bold(); t.Span(SafePdf(dto.GhiChu)); });
                            }
                        });

                        stack.Item().PaddingTop(24).Row(row =>
                        {
                            row.RelativeItem().Column(left =>
                            {
                                left.Item().Text("BÁC SĨ, Y SĨ KHÁM BỆNH").Bold();
                                left.Item().Text("(Ký tên)").Italic().FontSize(10);
                                if (dto.DaKy || paperType != "HEN_KHAM")
                                {
                                    left.Item().PaddingTop(34).Text(SafePdf(dto.BacSiKy, kham.IdBacSiNavigation?.HoTen ?? "Bác sĩ điều trị")).Bold();
                                    if (dto.SignedAt.HasValue)
                                        left.Item().Text($"Ký lúc: {NormalizeClientDateTime(dto.SignedAt.Value):HH:mm:ss dd/MM/yyyy}").FontSize(9).FontColor(Colors.Grey.Darken1);
                                }
                            });
                            row.RelativeItem().AlignRight().Column(right =>
                            {
                                right.Item().Text($"Ngày {printedAt:dd} tháng {printedAt:MM} năm {printedAt:yyyy}").Italic();
                                right.Item().Text("ĐẠI DIỆN CƠ SỞ KHÁM BỆNH").Bold();
                                right.Item().Text("(Ký tên, đóng dấu)").Italic().FontSize(10);
                            });
                        });
                    });
                });
            }).GeneratePdf();

            var fileName = $"{paperType}_{SafePdf(bn?.MaBn, id.ToString())}_{printedAt:yyyyMMddHHmmss}.pdf";
            if (dto.DaKy)
            {
                await _audit.WriteAsync(
                    id,
                    "SIGN_PAPER",
                    "GIAY_KET_LUAN_KHAM",
                    null,
                    duLieuSau: new { dto.LoaiGiay, dto.HinhThucDieuTri, dto.BacSiKy, dto.SignedAt });
            }

            await _audit.WriteAsync(
                id,
                "PRINT_DOCUMENT",
                "GIAY_KET_LUAN_KHAM",
                null,
                duLieuSau: new { dto.LoaiGiay, fileName });

            Response.Headers["Content-Disposition"] = $"inline; filename=\"{fileName}\"";
            return File(pdf, "application/pdf");
        }

        [HttpGet("{id}/tom-tat-kham/pdf")]
        [Authorize]
        public async Task<IActionResult> ExportTomTatKhamPdf(long id)
        {
            var kham = await _db.LanKhams
                .AsNoTracking()
                .Include(x => x.IdBenhNhanNavigation)
                .Include(x => x.IdPhongNavigation)
                .Include(x => x.IdBacSiNavigation)
                .Include(x => x.IdHoSoNavigation)
                .Include(x => x.IdBenhNavigation)
                .Include(x => x.SinhHieus)
                .FirstOrDefaultAsync(x => x.Id == id);

            if (kham == null)
                return NotFound(new { success = false, message = "Khong tim thay luot kham." });

            var featurePermissionError = await EnsureKhamBenhPermissionAsync("xuat");
            if (featurePermissionError != null)
                return featurePermissionError;

            var clsOrders = await _db.ChiDinhDvkts
                .AsNoTracking()
                .Include(x => x.IdDvktNavigation)
                    .ThenInclude(x => x.IdNhomNavigation)
                .Include(x => x.DvktKetQuas)
                .Where(x => x.IdLanKham == id && x.TrangThai != DvktTrangThai.Canceled && x.TrangThai != "canceled")
                .OrderBy(x => x.CreatedAt)
                .ToListAsync();

            var prescriptionItems = await _db.ChiTietDonThuocs
                .AsNoTracking()
                .Include(x => x.IdThuocNavigation)
                .Include(x => x.IdDonThuocNavigation)
                .Where(x => x.IdDonThuocNavigation != null && x.IdDonThuocNavigation.IdLanKham == id)
                .OrderBy(x => x.Id)
                .ToListAsync();

            var conclusionPaper = await _db.GiayKetLuanKhams
                .AsNoTracking()
                .Where(x => x.IdLanKham == id)
                .OrderByDescending(x => x.UpdatedAt ?? x.CreatedAt)
                .FirstOrDefaultAsync();

            var bn = kham.IdBenhNhanNavigation;
            var phong = kham.IdPhongNavigation;
            var bacSi = kham.IdBacSiNavigation;
            var hoSo = kham.IdHoSoNavigation;
            var sinhHieu = kham.SinhHieus
                .OrderByDescending(x => x.ThoiGianDo)
                .FirstOrDefault();
            var printedAt = DateTime.Now;

            static string Safe(string? value, string fallback = "---")
                => string.IsNullOrWhiteSpace(value) ? fallback : value.Trim();

            static string DateOnlyText(DateOnly? value)
                => value.HasValue ? value.Value.ToString("dd/MM/yyyy") : "---";

            static string DateTimeText(DateTime? value)
                => value.HasValue ? value.Value.ToString("HH:mm dd/MM/yyyy") : "---";

            static string StatusText(string? value)
            {
                var status = (value ?? string.Empty).Trim().ToUpperInvariant();
                return status switch
                {
                    "PENDING" or "CHO_THUC_HIEN" => "Chờ thực hiện",
                    "RECEIVED" or "DA_TIEP_NHAN" => "Đã tiếp nhận",
                    "PROCESSING" or "DANG_THUC_HIEN" => "Đang thực hiện",
                    "DONE" or "DA_HOAN_THANH" or "PAID" or "DA_THANH_TOAN" => "Đã có kết quả",
                    "SENT" or "DA_GUI" => "Đã gửi",
                    "CANCELED" or "CANCELLED" or "DA_HUY" => "Đã hủy",
                    _ => Safe(value)
                };
            }

            var diaChi = string.Join(", ", new[] { bn?.DiaChiDuong, bn?.DiaChiXa, bn?.DiaChiHuyen, bn?.DiaChiTinh }
                .Where(x => !string.IsNullOrWhiteSpace(x)));
            var recordCode = Safe(hoSo?.MaHs, id.ToString());
            var patientCode = Safe(bn?.MaBn, id.ToString());
            var diagnosis = Safe(kham.ChanDoanCuoi, Safe(kham.ChanDoanSoBo, Safe(kham.IdBenhNavigation?.Ten)));
            var conclusion = conclusionPaper?.HinhThucDieuTri ?? kham.HuongXuTri;
            var result = conclusionPaper?.KetQua ?? kham.KetQuaKham;

            QuestPDF.Settings.License = LicenseType.Community;
            var pdf = Document.Create(container =>
            {
                container.Page(page =>
                {
                    page.Size(PageSizes.A4);
                    page.Margin(32);
                    page.DefaultTextStyle(TextStyle.Default.FontFamily("Times New Roman").FontSize(12).LineHeight(1.15f));

                    page.Header().Column(header =>
                    {
                        header.Item().Row(row =>
                        {
                            row.RelativeItem().Column(left =>
                            {
                                left.Item().Text("BỘ Y TẾ").FontSize(10);
                                left.Item().Text("PHÒNG KHÁM ĐA KHOA").Bold().FontSize(12);
                                left.Item().Text(Safe(phong?.KhoaPhong, "Khoa Khám bệnh")).FontSize(10);
                            });
                            row.RelativeItem().AlignCenter().Column(center =>
                            {
                                center.Item().Text("PHIẾU TÓM TẮT KHÁM BỆNH").Bold().FontSize(18);
                                center.Item().Text($"Ngày in: {printedAt:HH:mm dd/MM/yyyy}").FontSize(10);
                            });
                            row.RelativeItem().AlignRight().Column(right =>
                            {
                                right.Item().Text($"Mã HS: {recordCode}").FontSize(10);
                                right.Item().Text($"Mã NB: {patientCode}").FontSize(10);
                                right.Item().Text($"Lượt khám: {id}").FontSize(10);
                            });
                        });
                        header.Item().PaddingTop(6).LineHorizontal(1);
                    });

                    page.Content().PaddingTop(10).Column(stack =>
                    {
                        stack.Spacing(10);

                        stack.Item().Border(1).BorderColor(Colors.Grey.Lighten2).Padding(8).Column(info =>
                        {
                            info.Spacing(4);
                            info.Item().Text("I. HÀNH CHÍNH").Bold().FontSize(13).FontColor(Colors.Blue.Darken3);
                            info.Item().Row(row =>
                            {
                                row.RelativeItem().Text(t => { t.Span("Họ tên: ").Bold(); t.Span(Safe(bn?.HoTen).ToUpperInvariant()).Bold(); });
                                row.ConstantItem(130).Text(t => { t.Span("Giới tính: ").Bold(); t.Span(Safe(bn?.GioiTinh)); });
                                row.ConstantItem(160).Text(t => { t.Span("Ngày sinh: ").Bold(); t.Span(DateOnlyText(bn?.NgaySinh)); });
                            });
                            info.Item().Text(t => { t.Span("Địa chỉ: ").Bold(); t.Span(Safe(diaChi)); });
                            info.Item().Row(row =>
                            {
                                row.RelativeItem().Text(t => { t.Span("Phòng khám: ").Bold(); t.Span(Safe(phong?.TenPhong)); });
                                row.RelativeItem().Text(t => { t.Span("Bác sĩ: ").Bold(); t.Span(Safe(bacSi?.HoTen)); });
                            });
                            info.Item().Row(row =>
                            {
                                row.RelativeItem().Text(t => { t.Span("Bắt đầu: ").Bold(); t.Span(DateTimeText(kham.ThoiGianBatDau)); });
                                row.RelativeItem().Text(t => { t.Span("Kết thúc: ").Bold(); t.Span(DateTimeText(kham.ThoiGianKetThuc)); });
                            });
                        });

                        stack.Item().Border(1).BorderColor(Colors.Grey.Lighten2).Padding(8).Column(exam =>
                        {
                            exam.Spacing(4);
                            exam.Item().Text("II. THÔNG TIN KHÁM").Bold().FontSize(13).FontColor(Colors.Blue.Darken3);
                            exam.Item().Text(t => { t.Span("Lý do khám: ").Bold(); t.Span(Safe(kham.LyDo)); });
                            exam.Item().Text(t => { t.Span("Chẩn đoán sơ bộ: ").Bold(); t.Span(Safe(kham.ChanDoanSoBo)); });
                            exam.Item().Text(t => { t.Span("Chẩn đoán cuối: ").Bold(); t.Span(diagnosis); });
                            exam.Item().Text(t => { t.Span("Bệnh kèm theo: ").Bold(); t.Span(Safe(kham.BenhKemTheo)); });
                            exam.Item().Text(t => { t.Span("Kết quả khám: ").Bold(); t.Span(Safe(result)); });
                            exam.Item().Text(t => { t.Span("Hướng xử trí: ").Bold(); t.Span(Safe(conclusion)); });
                            exam.Item().Text(t => { t.Span("Ghi chú/lời dặn: ").Bold(); t.Span(Safe(conclusionPaper?.LoiDan, Safe(kham.GhiChu))); });
                        });

                        stack.Item().Border(1).BorderColor(Colors.Grey.Lighten2).Padding(8).Column(vital =>
                        {
                            vital.Spacing(4);
                            vital.Item().Text("III. SINH HIỆU").Bold().FontSize(13).FontColor(Colors.Blue.Darken3);
                            vital.Item().Row(row =>
                            {
                                row.RelativeItem().Text($"Mạch: {Safe(sinhHieu?.NhipTim?.ToString())}");
                                row.RelativeItem().Text($"Huyết áp: {Safe(sinhHieu?.HuyetApTamThu?.ToString())}/{Safe(sinhHieu?.HuyetApTamTruong?.ToString())}");
                                row.RelativeItem().Text($"Nhiệt độ: {Safe(sinhHieu?.NhietDo?.ToString())}");
                                row.RelativeItem().Text($"SpO2: {Safe(sinhHieu?.SpO2?.ToString())}");
                            });
                        });

                        stack.Item().Text("IV. CLS/DVKT").Bold().FontSize(13).FontColor(Colors.Blue.Darken3);
                        stack.Item().Table(table =>
                        {
                            table.ColumnsDefinition(columns =>
                            {
                                columns.ConstantColumn(34);
                                columns.RelativeColumn();
                                columns.ConstantColumn(110);
                                columns.RelativeColumn();
                            });
                            table.Header(header =>
                            {
                                header.Cell().Border(1).Background(Colors.Blue.Lighten5).Padding(4).Text("STT").Bold();
                                header.Cell().Border(1).Background(Colors.Blue.Lighten5).Padding(4).Text("Dịch vụ").Bold();
                                header.Cell().Border(1).Background(Colors.Blue.Lighten5).Padding(4).Text("Trạng thái").Bold();
                                header.Cell().Border(1).Background(Colors.Blue.Lighten5).Padding(4).Text("Kết quả").Bold();
                            });

                            if (clsOrders.Count == 0)
                            {
                                table.Cell().ColumnSpan(4).Border(1).Padding(6).Text("Không có chỉ định CLS/DVKT.");
                            }
                            else
                            {
                                var index = 1;
                                foreach (var order in clsOrders)
                                {
                                    var latest = order.DvktKetQuas.OrderByDescending(x => x.ThoiGianThucHien ?? DateTime.MinValue).FirstOrDefault();
                                    table.Cell().Border(1).Padding(4).Text(index.ToString());
                                    table.Cell().Border(1).Padding(4).Text(Safe(order.IdDvktNavigation?.TenDvkt));
                                    table.Cell().Border(1).Padding(4).Text(StatusText(order.TrangThai));
                                    table.Cell().Border(1).Padding(4).Text(Safe(latest?.KetQuaText));
                                    index++;
                                }
                            }
                        });

                        stack.Item().Text("V. ĐƠN THUỐC").Bold().FontSize(13).FontColor(Colors.Blue.Darken3);
                        stack.Item().Table(table =>
                        {
                            table.ColumnsDefinition(columns =>
                            {
                                columns.ConstantColumn(34);
                                columns.RelativeColumn();
                                columns.ConstantColumn(60);
                                columns.RelativeColumn();
                            });
                            table.Header(header =>
                            {
                                header.Cell().Border(1).Background(Colors.Green.Lighten5).Padding(4).Text("STT").Bold();
                                header.Cell().Border(1).Background(Colors.Green.Lighten5).Padding(4).Text("Thuốc").Bold();
                                header.Cell().Border(1).Background(Colors.Green.Lighten5).Padding(4).Text("SL").Bold();
                                header.Cell().Border(1).Background(Colors.Green.Lighten5).Padding(4).Text("Cách dùng").Bold();
                            });

                            if (prescriptionItems.Count == 0)
                            {
                                table.Cell().ColumnSpan(4).Border(1).Padding(6).Text("Không có thuốc trong lượt khám này.");
                            }
                            else
                            {
                                var index = 1;
                                foreach (var item in prescriptionItems)
                                {
                                    var usage = string.Join(" - ", new[]
                                    {
                                        item.Sang.HasValue ? $"Sáng {item.Sang}" : null,
                                        item.Trua.HasValue ? $"Trưa {item.Trua}" : null,
                                        item.Chieu.HasValue ? $"Chiều {item.Chieu}" : null,
                                        item.Toi.HasValue ? $"Tối {item.Toi}" : null,
                                        item.GhiChu
                                    }.Where(x => !string.IsNullOrWhiteSpace(x)));
                                    table.Cell().Border(1).Padding(4).Text(index.ToString());
                                    table.Cell().Border(1).Padding(4).Text(Safe(item.IdThuocNavigation?.Ten));
                                    table.Cell().Border(1).Padding(4).AlignCenter().Text((item.SoLuong ?? 0).ToString());
                                    table.Cell().Border(1).Padding(4).Text(Safe(usage));
                                    index++;
                                }
                            }
                        });

                        stack.Item().PaddingTop(18).Row(row =>
                        {
                            row.RelativeItem();
                            row.ConstantItem(240).AlignCenter().Column(sign =>
                            {
                                sign.Item().Text($"Ngày {printedAt:dd} tháng {printedAt:MM} năm {printedAt:yyyy}").Italic();
                                sign.Item().Text("BÁC SĨ KHÁM BỆNH").Bold();
                                sign.Item().Text("(Ký, ghi rõ họ tên)").Italic().FontSize(10);
                                sign.Item().PaddingTop(42).Text(Safe(bacSi?.HoTen, "Bác sĩ khám bệnh")).Bold();
                            });
                        });
                    });
                });
            }).GeneratePdf();

            var fileName = $"TOM_TAT_KHAM_{patientCode}_{printedAt:yyyyMMddHHmmss}.pdf";
            await _audit.WriteAsync(
                id,
                "PRINT_DOCUMENT",
                "TOM_TAT_KHAM",
                null,
                duLieuSau: new { fileName });

            Response.Headers["Content-Disposition"] = $"inline; filename=\"{fileName}\"";
            return File(pdf, "application/pdf");
        }

        [HttpGet("{id}/phieu-chi-dinh-xet-nghiem/pdf")]
        [Authorize]
        public async Task<IActionResult> ExportPhieuChiDinhXetNghiemPdf(long id, [FromQuery] long[]? chiDinhIds)
        {
            var kham = await _db.LanKhams
                .Include(x => x.IdBenhNhanNavigation)
                .Include(x => x.IdPhongNavigation)
                .Include(x => x.IdBacSiNavigation)
                .Include(x => x.IdHoSoNavigation)
                .Include(x => x.IdBenhNavigation)
                .FirstOrDefaultAsync(x => x.Id == id);

            if (kham == null)
                return NotFound(new { success = false, message = "Khong tim thay luot kham." });

            var featurePermissionError = await EnsureKhamBenhPermissionAsync("xuat");
            if (featurePermissionError != null)
                return featurePermissionError;

            var requestedOrderIds = (chiDinhIds ?? Array.Empty<long>())
                .Where(x => x > 0)
                .Distinct()
                .ToList();

            var ordersQuery = _db.ChiDinhDvkts
                .AsNoTracking()
                .Include(x => x.IdDvktNavigation)
                    .ThenInclude(x => x.IdNhomNavigation)
                .Include(x => x.IdDvktNavigation)
                    .ThenInclude(x => x.DvktGia)
                .Include(x => x.IdDvktNavigation)
                    .ThenInclude(x => x.DvktPhongs)
                        .ThenInclude(x => x.IdPhongNavigation)
                            .ThenInclude(x => x.IdKhuTiepDonNavigation)
                .Include(x => x.DvktKetQuas)
                .Where(x => x.IdLanKham == id && x.TrangThai != DvktTrangThai.Canceled && x.TrangThai != "canceled");

            if (requestedOrderIds.Count > 0)
            {
                ordersQuery = ordersQuery.Where(x => requestedOrderIds.Contains(x.Id));
            }
            else
            {
                ordersQuery = ordersQuery.Where(x => x.TrangThai == DvktTrangThai.Pending);
            }

            var orders = await ordersQuery
                .OrderBy(x => x.IdDvktNavigation.IdNhomNavigation.TenNhom)
                .ThenBy(x => x.CreatedAt)
                .ThenBy(x => x.Id)
                .ToListAsync();

            if (orders.Count > 0)
            {
                static bool IsPaidBill(HoaDon bill)
                {
                    var status = (bill.TrangThai ?? string.Empty).Trim().ToUpperInvariant();
                    return status is "DA_THANH_TOAN" or "PAID" or "THANH_TOAN";
                }

                static bool IsCanceledBill(HoaDon bill)
                {
                    var status = (bill.TrangThai ?? string.Empty).Trim().ToUpperInvariant();
                    return status is "DA_HUY" or "HUY" or "CANCELED" or "CANCELLED";
                }

                var dvktBills = await _db.HoaDons
                    .AsNoTracking()
                    .Include(h => h.ChiTietHoaDons)
                    .Where(h => h.IdLanKham == id && h.LoaiHoaDon == "DVKT")
                    .ToListAsync();

                var paidDvktIds = dvktBills
                    .Where(IsPaidBill)
                    .SelectMany(h => h.ChiTietHoaDons)
                    .Where(x => x.LoaiThamChieu == "DVKT" && x.IdThamChieu.HasValue)
                    .Select(x => (int)x.IdThamChieu!.Value)
                    .ToHashSet();

                var openDvktIds = dvktBills
                    .Where(h => !IsPaidBill(h) && !IsCanceledBill(h))
                    .SelectMany(h => h.ChiTietHoaDons)
                    .Where(x => x.LoaiThamChieu == "DVKT" && x.IdThamChieu.HasValue)
                    .Select(x => (int)x.IdThamChieu!.Value)
                    .ToHashSet();

                orders = orders
                    .Where(x =>
                        x.TrangThai == DvktTrangThai.Pending &&
                        !x.HoanThanhLuc.HasValue &&
                        !x.DvktKetQuas.Any() &&
                        (!paidDvktIds.Contains(x.IdDvkt) || openDvktIds.Contains(x.IdDvkt)))
                    .ToList();
            }

            if (orders.Count == 0)
                return BadRequest(new
                {
                    success = false,
                    message = requestedOrderIds.Count > 0
                        ? "Chi in phieu chi dinh cho dich vu moi/chua thanh toan/chua co ket qua."
                        : "Khong co chi dinh moi/chua thanh toan de in."
                });

            var orderDvktIds = orders
                .Select(x => (long)x.IdDvkt)
                .Distinct()
                .ToList();

            var invoiceDetails = await _db.ChiTietHoaDons
                .AsNoTracking()
                .Include(x => x.IdHoaDonNavigation)
                .Where(x => x.IdHoaDonNavigation != null
                    && x.IdHoaDonNavigation.IdLanKham == id
                    && x.IdHoaDonNavigation.LoaiHoaDon == "DVKT"
                    && x.LoaiThamChieu == "DVKT"
                    && x.IdThamChieu.HasValue
                    && orderDvktIds.Contains(x.IdThamChieu.Value))
                .ToListAsync();

            var invoicePriceByDvkt = invoiceDetails
                .GroupBy(x => x.IdThamChieu!.Value)
                .ToDictionary(
                    x => (int)x.Key,
                    x => x.OrderByDescending(d => d.Id).First().DonGia ?? 0m
                );

            static string Safe(string? value, string fallback = "---")
                => string.IsNullOrWhiteSpace(value) ? fallback : value.Trim();

            static string DateOnlyText(DateOnly? value)
                => value.HasValue ? value.Value.ToString("dd/MM/yyyy") : "---";

            static string GenderText(string? value)
                => string.IsNullOrWhiteSpace(value) ? "---" : value.Trim();

            static string AgeText(DateOnly? birthDate, DateOnly today)
            {
                if (!birthDate.HasValue) return string.Empty;

                var age = today.Year - birthDate.Value.Year;
                if (birthDate.Value > today.AddYears(-age)) age--;

                return age >= 0 ? $" ({age} tuổi)" : string.Empty;
            }

            static string MoneyText(decimal value)
                => string.Format(CultureInfo.GetCultureInfo("vi-VN"), "{0:N0}", value);

            static string MoneyWithCurrency(decimal value)
                => $"{MoneyText(value)}đ";

            static decimal UnitPrice(ChiDinhDvkt order, DateOnly serviceDate)
            {
                var price = order.IdDvktNavigation.DvktGia
                    .Where(x => x.TuNgay <= serviceDate && (x.DenNgay == null || x.DenNgay >= serviceDate))
                    .OrderByDescending(x => x.TuNgay)
                    .Select(x => (decimal?)x.DonGia)
                    .FirstOrDefault();

                return price ?? 0m;
            }

            static string RoomLabel(ChiDinhDvkt order)
            {
                var room = order.IdDvktNavigation.DvktPhongs
                    .Select(x => x.IdPhongNavigation)
                    .FirstOrDefault(x => x != null);

                var roomName = Safe(room?.TenPhong, Safe(order.IdDvktNavigation.IdNhomNavigation?.TenNhom, "Phòng thực hiện"));
                var meta = new List<string>();

                if (room?.Tang != null)
                    meta.Add($"Lầu {room.Tang}");

                if (!string.IsNullOrWhiteSpace(room?.IdKhuTiepDonNavigation?.TenKhu))
                    meta.Add(room.IdKhuTiepDonNavigation.TenKhu);

                return meta.Count > 0
                    ? $"{roomName} ({string.Join(" - ", meta)})"
                    : roomName;
            }

            static string ClinicShortName(string? source)
            {
                var value = Safe(source, "Khám bệnh");
                var prefixes = new[] { "Phòng khám", "Khoa", "Khoa/phòng" };

                foreach (var prefix in prefixes)
                {
                    if (value.StartsWith(prefix, StringComparison.OrdinalIgnoreCase))
                        return value[prefix.Length..].Trim();
                }

                return value;
            }

            static void Barcode(IContainer container, string code)
            {
                var clean = string.IsNullOrWhiteSpace(code) ? "0000000000" : code.Trim().ToUpperInvariant();
                var checksum = clean.Aggregate(0, (sum, ch) => sum + ch);

                container.Column(col =>
                {
                    col.Item().Height(42).AlignCenter().Row(row =>
                    {
                        for (var i = 0; i < 44; i++)
                        {
                            var width = 1 + ((checksum + i * 5) % 3);
                            row.ConstantItem(width).Height(42).Background(Colors.Black);
                            row.ConstantItem(1.2f);
                        }
                    });
                    col.Item().AlignCenter().Text(clean).FontSize(7).FontColor(Colors.Grey.Darken2);
                });
            }

            static void ChoRayLogo(IContainer container)
            {
                container.Width(48).Height(48)
                    .Border(2)
                    .BorderColor(Colors.Red.Medium)
                    .Padding(3)
                    .AlignCenter()
                    .AlignMiddle()
                    .Text("CR")
                    .Bold()
                    .FontSize(18)
                    .FontColor(Colors.Teal.Darken2);
            }

            var bn = kham.IdBenhNhanNavigation;
            var phong = kham.IdPhongNavigation;
            var hoSo = kham.IdHoSoNavigation;
            var bacSi = kham.IdBacSiNavigation;
            var printedAt = DateTime.Now;
            var orderedAt = orders.Min(x => x.CreatedAt) ?? printedAt;
            var serviceDate = DateOnly.FromDateTime(orderedAt);
            var today = DateOnly.FromDateTime(printedAt);
            var diaChi = string.Join(", ", new[] { bn?.DiaChiDuong, bn?.DiaChiXa, bn?.DiaChiHuyen, bn?.DiaChiTinh }
                .Where(x => !string.IsNullOrWhiteSpace(x)));
            var recordCode = Safe(hoSo?.MaHs, id.ToString());
            var patientCode = Safe(bn?.MaBn, id.ToString());
            var departmentName = Safe(phong?.KhoaPhong ?? bacSi?.KhoaPhong, "Khoa Khám bệnh");
            var clinicName = Safe(phong?.TenPhong, "Phòng khám");
            var paymentObject = Safe(ReadMetaString(hoSo?.GhiChu, "paymentObject"), "Không BHYT");
            var diagnosis = Safe(kham.ChanDoanCuoi, Safe(kham.ChanDoanSoBo, Safe(kham.IdBenhNavigation?.Ten)));
            var queueNumber = Math.Max(1, (int)(Math.Abs(id) % 900) + 100);
            var serviceRows = orders
                .Select(order =>
                {
                    var quantity = Math.Max(order.SoLuong, 1);
                    var unitPrice = invoicePriceByDvkt.TryGetValue(order.IdDvkt, out var invoicePrice)
                        ? invoicePrice
                        : UnitPrice(order, serviceDate);
                    return new
                    {
                        Service = order.IdDvktNavigation,
                        RoomName = RoomLabel(order),
                        Quantity = quantity,
                        Amount = unitPrice * quantity
                    };
                })
                .ToList();
            var grouped = serviceRows
                .GroupBy(x => x.RoomName)
                .ToList();
            var totalAmount = serviceRows.Sum(x => x.Amount);

            QuestPDF.Settings.License = LicenseType.Community;
            var pdf = Document.Create(container =>
            {
                container.Page(page =>
                {
                    page.Size(PageSizes.A4);
                    page.Margin(30);
                    page.DefaultTextStyle(TextStyle.Default.FontFamily("Times New Roman").FontSize(12).LineHeight(1.12f));

                    page.Header().Column(header =>
                    {
                        header.Item().Row(row =>
                        {
                            row.ConstantItem(58).Element(ChoRayLogo);

                            row.RelativeItem().Column(left =>
                            {
                                left.Item().Text("BỘ Y TẾ").FontSize(10).FontColor(Colors.Blue.Darken3);
                                left.Item().Text("BỆNH VIỆN CHỢ RẪY").Bold().FontSize(12).FontColor(Colors.Green.Darken2);
                                left.Item().Text(departmentName).Bold().FontSize(11).FontColor(Colors.Blue.Darken3);
                            });

                            row.ConstantItem(170).AlignCenter().Column(center =>
                            {
                                center.Item().Element(box => Barcode(box, recordCode));
                                center.Item().AlignCenter().Text(t =>
                                {
                                    t.Span("Mã Hồ sơ: ").FontSize(10).FontColor(Colors.Blue.Darken3);
                                    t.Span(recordCode).FontSize(10).FontColor(Colors.Blue.Darken3);
                                });
                            });

                            row.RelativeItem().AlignRight().Column(right =>
                            {
                                right.Item().Text($"PK {ClinicShortName(departmentName)}").Bold().FontColor(Colors.Blue.Darken3);
                                right.Item().AlignRight().Text(t =>
                                {
                                    t.Span("Mã Hồ sơ: ").FontSize(10).FontColor(Colors.Blue.Darken3);
                                    t.Span(recordCode).FontSize(10).FontColor(Colors.Blue.Darken3);
                                });
                                right.Item().AlignRight().Text(t =>
                                {
                                    t.Span("Mã NB: ").FontSize(10).FontColor(Colors.Blue.Darken3);
                                    t.Span(patientCode).FontSize(10).FontColor(Colors.Blue.Darken3);
                                });
                            });
                        });

                        header.Item().PaddingTop(6).LineHorizontal(1.2f).LineColor(Colors.Grey.Darken2);
                    });

                    page.Content().PaddingTop(4).Column(stack =>
                    {
                        stack.Item().AlignCenter().Text("PHIẾU STT THỰC HIỆN").Bold().FontSize(18);
                        stack.Item().AlignCenter().Text(t =>
                        {
                            t.Span("Ngày chỉ định XN: ").Bold().FontSize(13);
                            t.Span($"{orderedAt:HH:mm:ss dd/MM/yyyy}").Bold().FontSize(13);
                        });

                        stack.Item().PaddingTop(10).Column(info =>
                        {
                            info.Spacing(4);
                            info.Item().Row(row =>
                            {
                                row.RelativeItem().Text(t =>
                                {
                                    t.Span("Họ và tên: ");
                                    t.Span(Safe(bn?.HoTen).ToUpperInvariant()).Bold().FontColor(Colors.Blue.Darken3);
                                });
                                row.ConstantItem(140).Text(t =>
                                {
                                    t.Span("Giới tính: ");
                                    t.Span(GenderText(bn?.GioiTinh)).Bold();
                                });
                                row.ConstantItem(170).Text(t =>
                                {
                                    t.Span("Ngày sinh: ");
                                    t.Span($"{DateOnlyText(bn?.NgaySinh)}{AgeText(bn?.NgaySinh, today)}");
                                });
                            });

                            info.Item().Row(row =>
                            {
                                row.RelativeItem().Text(t =>
                                {
                                    t.Span("Loại đối tượng: ");
                                    t.Span(Safe(bn?.QuocTich, "Tự phí")).Bold().FontColor(Colors.Blue.Darken3);
                                });
                                row.ConstantItem(325).Text(t =>
                                {
                                    t.Span("Đối tượng: ");
                                    t.Span(paymentObject).Bold();
                                });
                            });

                            info.Item().Text(t =>
                            {
                                t.Span("Địa chỉ    : ");
                                t.Span(Safe(diaChi));
                            });
                            info.Item().Text(t =>
                            {
                                t.Span("Chẩn đoán: ").Bold().Underline();
                                t.Span(diagnosis);
                            });
                        });

                        stack.Item().PaddingTop(4).Text("Danh sách dịch vụ:").Bold().Italic();
                        stack.Item().PaddingTop(8).Table(table =>
                        {
                            table.ColumnsDefinition(columns =>
                            {
                                columns.ConstantColumn(42);
                                columns.RelativeColumn();
                                columns.ConstantColumn(60);
                                columns.ConstantColumn(120);
                            });

                            table.Header(header =>
                            {
                                header.Cell().Border(1).Background(Colors.Green.Lighten5).Padding(3).AlignCenter().Text("STT").Bold();
                                header.Cell().Border(1).Background(Colors.Green.Lighten5).Padding(3).AlignCenter().Text("Tên dịch vụ").Bold();
                                header.Cell().Border(1).Background(Colors.Green.Lighten5).Padding(3).AlignCenter().Text("SL").Bold();
                                header.Cell().Border(1).Background(Colors.Green.Lighten5).Padding(3).AlignCenter().Text("Thành tiền").Bold();
                            });

                            var index = 1;
                            var groupIndex = 0;
                            foreach (var group in grouped)
                            {
                                groupIndex++;
                                table.Cell().ColumnSpan(2).Border(1).Background(Colors.Blue.Lighten5).Padding(4).Column(cell =>
                                {
                                    cell.Item().Text(group.Key).Bold();
                                    cell.Item().Text(t =>
                                    {
                                        t.Span("Ngày thực hiện: ").Bold();
                                        t.Span($"{serviceDate:dd/MM/yyyy}").Bold();
                                    });
                                });
                                table.Cell().ColumnSpan(2).Border(1).Background(Colors.Blue.Lighten5).Padding(4).AlignMiddle().AlignCenter().Text(t =>
                                {
                                    t.Span("Số thứ tự: ").Bold().FontSize(14);
                                    t.Span((queueNumber + groupIndex - 1).ToString()).Bold().FontSize(14);
                                });

                                foreach (var service in group)
                                {
                                    table.Cell().Border(1).Padding(4).AlignCenter().Text(index.ToString());
                                    table.Cell().Border(1).Padding(4).Text($"{index}. {Safe(service.Service.TenDvkt)}");
                                    table.Cell().Border(1).Padding(4).AlignCenter().Text(service.Quantity.ToString());
                                    table.Cell().Border(1).Padding(4).AlignRight().Text(MoneyText(service.Amount));
                                    index++;
                                }
                            }

                            table.Cell().ColumnSpan(3).Border(1).Padding(4).AlignRight().Text("").Bold();
                            table.Cell().Border(1).Padding(4).AlignRight().Text(MoneyText(totalAmount)).Bold();
                        });

                        stack.Item().PaddingTop(4).Row(row =>
                        {
                            row.RelativeItem().Column(pay =>
                            {
                                pay.Item().Text(t =>
                                {
                                    t.Span("Tổng số tiền đã tạm ứng: ").Italic();
                                    t.Span(MoneyWithCurrency(0)).Bold().Italic();
                                });
                                pay.Item().Text(t =>
                                {
                                    t.Span("Số tiền còn lại: ").Italic();
                                    t.Span(MoneyWithCurrency(totalAmount)).Bold().Italic();
                                });
                            });

                            row.ConstantItem(240).AlignCenter().Column(sign =>
                            {
                                sign.Item().Text($"Ngày {printedAt:dd} tháng {printedAt:MM} năm {printedAt:yyyy}").Italic();
                                sign.Item().Text("BÁC SĨ CHỈ ĐỊNH").Bold();
                                sign.Item().Text("(Ký, ghi rõ họ tên)").Italic();
                            });
                        });

                        stack.Item().PaddingTop(64).Row(row =>
                        {
                            row.RelativeItem();
                            row.ConstantItem(240).AlignCenter().Column(sign =>
                            {
                                sign.Item().Text(Safe(bacSi?.HoTen, "Bác sĩ chỉ định")).Bold();
                            });
                        });

                        stack.Item().PaddingTop(82).Text("Lời dặn trước khi thực hiện xét nghiệm máu: Xét nghiệm đường huyết, mỡ máu (cholesterol, Triglyceride,...) nên lấy máu trước khi ăn sáng.").FontSize(10);
                    });
                });
            }).GeneratePdf();

            var fileName = $"PHIEU_CHI_DINH_XET_NGHIEM_{patientCode}_{printedAt:yyyyMMddHHmmss}.pdf";
            await _audit.WriteAsync(
                id,
                "PRINT_DOCUMENT",
                "PHIEU_CHI_DINH_XET_NGHIEM",
                null,
                duLieuSau: new
                {
                    fileName,
                    chiDinhIds = orders.Select(x => x.Id).ToList()
                });

            Response.Headers["Content-Disposition"] = $"inline; filename=\"{fileName}\"";
            return File(pdf, "application/pdf");
        }

        [HttpPatch("{id}/reopen")]
        [Authorize]
        public async Task<IActionResult> Reopen(long id, [FromBody] ReopenLanKhamDto? dto)
        {
            var reason = dto?.LyDo?.Trim();
            if (string.IsNullOrWhiteSpace(reason))
                return BadRequest(new { success = false, message = "Bat buoc nhap ly do mo lai ho so." });

            var kham = await _db.LanKhams
                .Include(x => x.IdHoSoNavigation)
                .FirstOrDefaultAsync(x => x.Id == id);

            if (kham == null)
                return NotFound(new { success = false, message = "Khong tim thay luot kham." });

            var permissionError = await EnsureCanTouchVisit(kham);
            if (permissionError != null)
                return permissionError;

            if (Normalize(kham.TrangThai) == TrangThai.Huy)
            {
                return BadRequest(new { success = false, message = "Ho so da huy, khong the mo lai." });
            }

            var hasPaidInvoice = await HasPaidInvoiceForVisit(kham.Id);

            if (kham.IdHoSoNavigation != null &&
                _hoSoTrangThai.NormalizeStatus(kham.IdHoSoNavigation.TrangThai) == HoSoTrangThaiService.DaHuy)
                return BadRequest(new { success = false, message = "Ho so da huy, khong the mo lai." });

            var actorId = GetCurrentUserId();
            kham.IdBacSi = actorId ?? kham.IdBacSi;
            kham.TrangThai = TrangThai.DangKham;
            kham.UpdatedAt = DateTime.Now;

            if (kham.IdHoSoNavigation != null)
            {
                var transition = EnsureHoSoDoctorStatus(
                    kham.IdHoSoNavigation,
                    TrangThai.DangKham,
                    actorId,
                    "DOCTOR_REOPEN_EXAM",
                    hasPaidInvoice
                        ? $"Mo lai ket luan sau thanh toan de chinh sua thong tin kham. Ly do: {reason}"
                        : $"Mo lai ho so de chinh sua ket qua kham. Ly do: {reason}"
                );

                if (!transition.Success)
                {
                    var currentHoSoStatus = _hoSoTrangThai.NormalizeStatus(kham.IdHoSoNavigation.TrangThai);
                    if (currentHoSoStatus != HoSoTrangThaiService.DaDong)
                        return BadRequest(new { success = false, message = transition.ErrorMessage });

                    kham.IdHoSoNavigation.TrangThai = HoSoTrangThaiService.DangKham;
                    kham.IdHoSoNavigation.UpdatedAt = DateTime.Now;
                    _db.TiepDonTrangThaiLogs.Add(new TiepDonTrangThaiLog
                    {
                        IdHoSo = kham.IdHoSoNavigation.Id,
                        FromTrangThai = currentHoSoStatus,
                        ToTrangThai = HoSoTrangThaiService.DangKham,
                        Action = "DOCTOR_REOPEN_CLOSED_EXAM",
                        Note = hasPaidInvoice
                            ? $"Mo lai ho so da dong sau thanh toan de chinh sua ket luan. Ly do: {reason}"
                            : $"Mo lai ho so da dong de chinh sua ket qua kham. Ly do: {reason}",
                        IdNguoiDung = actorId,
                        CreatedAt = DateTime.Now
                    });
                }
            }

            await _db.SaveChangesAsync();
            await _audit.WriteAsync(
                kham.Id,
                "REOPEN_EXAM",
                "LAN_KHAM",
                kham.Id,
                reason,
                duLieuSau: new { kham.TrangThai, kham.IdBacSi, hasPaidInvoice });

            return Ok(new
            {
                success = true,
                message = "Da mo ho so, cho phep chinh sua.",
                data = new
                {
                    idLanKham = kham.Id,
                    trangThai = kham.TrangThai,
                    lyDo = reason,
                    openedAt = DateTime.Now
                }
            });
        }

        [HttpPost("{id}/dichVu")]
        [Authorize]
        public async Task<IActionResult> ChiDinhDichVu(long id, [FromBody] List<ChiDinhDichVuDto> ds)
        {
            if (ds == null || ds.Count == 0)
                return BadRequest(new { success = false, message = "Danh sach dich vu trong." });

            using var tran = await _db.Database.BeginTransactionAsync();
            try
            {
                var kham = await _db.LanKhams.FindAsync(id);
                if (kham == null)
                    return NotFound(new { success = false, message = "Khong tim thay luot kham." });

                var featurePermissionError = await EnsureKhamBenhPermissionAsync("them");
                if (featurePermissionError != null)
                    return featurePermissionError;

                var permissionError = await EnsureCanTouchVisit(kham);
                if (permissionError != null)
                    return permissionError;

                if (IsLockedLanKhamForDoctor(kham.TrangThai) || await HasPaidInvoiceForVisit(kham.Id))
                    return BadRequest(new { success = false, message = "Luot kham da khoa/thanh toan, khong the chi dinh dich vu." });

                foreach (var item in ds)
                {
                    var isDuplicate = await _db.LanKhamDichVus.AnyAsync(x =>
                        x.IdLanKham == id &&
                        x.IdDichVu == item.IdDichVu &&
                        x.TrangThaiThucHien != TrangThai.Huy &&
                        x.TrangThaiThucHien != "HUY" &&
                        x.TrangThaiThucHien != "canceled");

                    if (isDuplicate)
                        return BadRequest(new { success = false, message = $"Dich vu {item.IdDichVu} da duoc chi dinh cho lan kham nay." });

                    var gia = await _db.DichVuGia
                        .Where(x => x.IdDichVu == item.IdDichVu && (x.HoatDong ?? false))
                        .OrderByDescending(x => x.NgayApDung)
                        .Select(x => x.DonGia)
                        .FirstOrDefaultAsync();

                    _db.LanKhamDichVus.Add(new LanKhamDichVu
                    {
                        IdLanKham = id,
                        IdDichVu = item.IdDichVu,
                        SoLuong = item.SoLuong,
                        DonGia = gia,
                        TrangThaiThucHien = TrangThai.ChoThucHien,
                        GhiChu = item.GhiChu
                    });
                }

                kham.TrangThai = TrangThai.ChoThucHien;
                kham.UpdatedAt = DateTime.Now;

                var hoaDon = new HoaDon
                {
                    MaHd = "HDCLS_" + DateTime.Now.Ticks,
                    IdLanKham = id,
                    IdBenhNhan = kham.IdBenhNhan,
                    LoaiHoaDon = "DVKT",
                    TrangThai = "CHUA_THANH_TOAN",
                    NgayTao = DateTime.Now
                };
                _db.HoaDons.Add(hoaDon);

                await _db.SaveChangesAsync();
                await tran.CommitAsync();
                await _audit.WriteAsync(
                    id,
                    "CREATE_SERVICE_ORDER",
                    "LAN_KHAM_DICH_VU",
                    null,
                    duLieuSau: ds);

                return Ok(new { success = true, message = "Chi dinh DVKT thanh cong." });
            }
            catch (Exception ex)
            {
                await tran.RollbackAsync();
                return BadRequest(new { success = false, message = "Loi khi chi dinh DVKT", error = ex.Message });
            }
        }

        [HttpPatch("{id}/cancel")]
        [Authorize]
        public async Task<IActionResult> Cancel(long id, [FromBody] string? reason)
        {
            reason = reason?.Trim();
            if (string.IsNullOrWhiteSpace(reason) || reason.Length < 5)
            {
                return BadRequest(new
                {
                    success = false,
                    message = "Hủy lượt khám bắt buộc nhập lý do cụ thể (ít nhất 5 ký tự)."
                });
            }

            var kham = await _db.LanKhams
                .Include(x => x.IdHoSoNavigation)
                .FirstOrDefaultAsync(x => x.Id == id);

            if (kham == null)
                return NotFound(new { success = false, message = "Khong tim thay luot kham." });

            var featurePermissionError = await EnsureKhamBenhPermissionAsync("xoa");
            if (featurePermissionError != null)
                return featurePermissionError;

            var permissionError = await EnsureCanTouchVisit(kham);
            if (permissionError != null)
                return permissionError;

            if (string.Equals(kham.TrangThai, TrangThai.DangKham, StringComparison.OrdinalIgnoreCase))
            {
                return Conflict(new
                {
                    success = false,
                    state = "EXAM_ALREADY_STARTED",
                    message = "Lượt khám đã bắt đầu. Không được hủy thẳng; bác sĩ phải kết luận Không khám và ghi rõ lý do."
                });
            }

            if (await HasPaidInvoiceForVisit(id))
                return BadRequest(new { success = false, message = "Luot kham da co hoa don thanh toan, khong the huy." });

            if (await HasPendingElectronicPaymentForVisit(id))
            {
                return Conflict(new
                {
                    success = false,
                    state = "PAYMENT_TRANSACTION_PENDING",
                    message = "Lượt khám đang có giao dịch QR/VNPay chờ kết quả, không thể hủy."
                });
            }

            if (await HasLockedClinicalServices(id))
                return BadRequest(new { success = false, message = "Da co dich vu/ket qua CLS dang thuc hien hoac da hoan tat, khong the huy thang." });

            var hoSo = kham.IdHoSoNavigation;
            if (hoSo != null)
            {
                var current = _hoSoTrangThai.NormalizeStatus(hoSo.TrangThai);
                if (current == HoSoTrangThaiService.DaKham || current == HoSoTrangThaiService.DaDong)
                    return BadRequest(new { success = false, message = "Ho so da kham/da dong, khong the huy luot kham." });
            }

            kham.TrangThai = TrangThai.Huy;
            kham.GhiChu = $"[Huy] {reason ?? "Khong ro ly do"}";
            kham.UpdatedAt = DateTime.Now;
            await CancelPendingClinicalOrders(id);

            var remainingRooms = await CountRemainingActiveRooms(id, kham.IdHoSo);
            if (hoSo != null && remainingRooms == 0)
            {
                var transition = _hoSoTrangThai.ApplyTransition(
                    hoSo,
                    "HUY",
                    GetCurrentUserId(),
                    "CANCEL_LAN_KHAM",
                    reason
                );

                if (!transition.Success)
                    return BadRequest(new { success = false, message = transition.ErrorMessage });
            }

            await _db.SaveChangesAsync();
            await _audit.WriteAsync(
                kham.Id,
                "CANCEL_EXAM",
                "LAN_KHAM",
                kham.Id,
                reason,
                duLieuSau: new { kham.TrangThai, kham.GhiChu });

            return Ok(new { success = true, message = "Da huy luot kham." });
        }

        [HttpGet("~/api/benhNhan/{id}/lichSuKham")]
        public async Task<IActionResult> GetLichSuKham(long id)
        {
            var list = await _db.LanKhams
                .Include(x => x.IdPhongNavigation)
                .Where(x => x.IdBenhNhan == id)
                .OrderByDescending(x => x.CreatedAt)
                .Select(x => new
                {
                    x.Id,
                    x.CreatedAt,
                    x.ThoiGianBatDau,
                    x.ThoiGianKetThuc,
                    x.ChanDoanCuoi,
                    x.HuongXuTri,
                    PhongKham = x.IdPhongNavigation != null ? x.IdPhongNavigation.TenPhong : "",
                    x.TrangThai
                })
                .ToListAsync();

            return Ok(new { success = true, data = list });
        }

        [HttpGet("phong-cua-bac-si")]
        [Authorize]
        public async Task<IActionResult> GetPhongCuaBacSi([FromQuery] long idBacSi)
        {
            var actorId = GetCurrentUserId();
            if (!actorId.HasValue)
                return Unauthorized(new { success = false, message = "Phien dang nhap khong hop le." });

            if (actorId.Value != idBacSi && !HasPrivilegedRoleClaim())
                return StatusCode(403, new { success = false, message = "Ban khong co quyen xem pham vi phong cua nguoi dung khac." });

            var user = await _db.NguoiDungs
                .FirstOrDefaultAsync(x => x.Id == idBacSi);

            if (user == null)
                return NotFound(new { success = false, message = "Khong tim thay nguoi dung." });

            if (await HasGlobalRoomScopeAsync(idBacSi))
            {
                var allRooms = await _db.PhongKhams
                    .AsNoTracking()
                    .Where(x => x.HoatDong != false)
                    .OrderBy(x => x.KhoaPhong)
                    .ThenBy(x => x.TenPhong)
                    .Select(x => new
                    {
                        IdPhong = x.Id,
                        x.MaPhong,
                        TenPhong = x.TenPhong,
                        Khoa = x.KhoaPhong
                    })
                    .ToListAsync();

                return Ok(new { success = true, data = allRooms });
            }

            var list = await _db.BacSiPhongs
                .Include(x => x.IdPhongNavigation)
                .Where(x => x.IdBacSi == idBacSi)
                .OrderBy(x => x.IdPhongNavigation.KhoaPhong)
                .ThenBy(x => x.IdPhongNavigation.TenPhong)
                .Select(x => new
                {
                    x.IdPhong,
                    MaPhong = x.IdPhongNavigation.MaPhong,
                    TenPhong = x.IdPhongNavigation.TenPhong,
                    Khoa = x.IdPhongNavigation.KhoaPhong
                })
                .ToListAsync();

            return Ok(new { success = true, data = list });
        }

        [HttpGet("~/api/bacsi/{id}/phong")]
        [Authorize]
        public async Task<IActionResult> GetPhongByBacSi(long id)
        {
            var actorId = GetCurrentUserId();
            if (!actorId.HasValue)
                return Unauthorized(new { success = false, message = "Phien dang nhap khong hop le." });

            if (actorId.Value != id && !HasPrivilegedRoleClaim())
                return StatusCode(403, new { success = false, message = "Ban khong co quyen xem phong cua nguoi dung khac." });

            if (await HasGlobalRoomScopeAsync(id))
            {
                var anyRoom = await _db.PhongKhams
                    .AsNoTracking()
                    .Where(x => x.HoatDong != false)
                    .OrderBy(x => x.KhoaPhong)
                    .ThenBy(x => x.TenPhong)
                    .Select(x => new
                    {
                        IdPhong = x.Id,
                        x.MaPhong,
                        TenPhong = x.TenPhong,
                        Khoa = x.KhoaPhong,
                        IdKhoa = x.KhoaPhong
                    })
                    .FirstOrDefaultAsync();

                if (anyRoom != null)
                    return Ok(anyRoom);
            }

            var phong = await _db.BacSiPhongs
                .Include(x => x.IdPhongNavigation)
                .Where(x => x.IdBacSi == id)
                .OrderBy(x => x.IdPhongNavigation.KhoaPhong)
                .ThenBy(x => x.IdPhongNavigation.TenPhong)
                .Select(x => new
                {
                    x.IdPhong,
                    MaPhong = x.IdPhongNavigation.MaPhong,
                    TenPhong = x.IdPhongNavigation.TenPhong,
                    Khoa = x.IdPhongNavigation.KhoaPhong,
                    IdKhoa = x.IdPhongNavigation.KhoaPhong
                })
                .FirstOrDefaultAsync();

            if (phong == null)
                return NotFound(new { message = "Bac si chua duoc phan vao phong nao." });

            return Ok(phong);
        }

        private long? GetCurrentUserId()
        {
            var raw = User.FindFirstValue("sub")
                      ?? User.FindFirstValue(ClaimTypes.NameIdentifier)
                      ?? User.FindFirstValue("nameid");

            return long.TryParse(raw, out var id) ? id : null;
        }

        private async Task<IActionResult?> EnsureKhamBenhPermissionAsync(string action)
        {
            var actorId = GetCurrentUserId();
            if (!actorId.HasValue)
                return Unauthorized(new { success = false, message = "Phien dang nhap khong hop le." });

            if (await HasKhamBenhPermissionAsync(actorId.Value, action))
                return null;

            return StatusCode(403, new
            {
                success = false,
                message = $"Ban khong co quyen {action} tren chuc nang kham benh."
            });
        }

        private async Task<bool> HasKhamBenhPermissionAsync(long actorId, string action)
        {
            var roleIds = await _db.NguoiDungVaiTros
                .AsNoTracking()
                .Where(x => x.IdNguoiDung == actorId)
                .Select(x => x.IdVaiTro.GetValueOrDefault())
                .Distinct()
                .ToListAsync();

            if (roleIds.Count == 0)
                return false;

            var roleNames = await _db.VaiTros
                .AsNoTracking()
                .Where(x => roleIds.Contains(x.Id))
                .Select(x => (x.Ten ?? string.Empty).ToUpper())
                .ToListAsync();

            if (roleNames.Contains("ADMIN") || roleNames.Contains("QUAN_TRI"))
                return true;

            var query = from vtq in _db.VaiTroQuyens.AsNoTracking()
                        join q in _db.Quyens.AsNoTracking() on vtq.IdQuyen equals q.Id
                        join cn in _db.ChucNangs.AsNoTracking() on q.IdChucNang equals cn.Id
                        where vtq.IdVaiTro.HasValue
                              && roleIds.Contains(vtq.IdVaiTro.Value)
                              && cn.MaChucNang != null
                              && cn.MaChucNang.ToUpper() == FeatureKhamBenh
                        select new
                        {
                            Xem = (vtq.Xem ?? false) && (q.Xem ?? false),
                            Them = (vtq.Them ?? false) && (q.Them ?? false),
                            Sua = (vtq.Sua ?? false) && (q.Sua ?? false),
                            Xoa = (vtq.Xoa ?? false) && (q.Xoa ?? false),
                            Xuat = (vtq.Xuat ?? false) && (q.Xuat ?? false)
                        };

            return action.Trim().ToLowerInvariant() switch
            {
                "xem" => await query.AnyAsync(x => x.Xem),
                "them" => await query.AnyAsync(x => x.Them),
                "sua" => await query.AnyAsync(x => x.Sua),
                "xoa" => await query.AnyAsync(x => x.Xoa),
                "xuat" => await query.AnyAsync(x => x.Xuat),
                _ => false
            };
        }

        private async Task<bool> HasRoomScopeAsync(long actorId, int roomId)
        {
            if (roomId <= 0)
                return false;

            if (await HasGlobalRoomScopeAsync(actorId))
                return true;

            return await _db.BacSiPhongs
                .AsNoTracking()
                .AnyAsync(x => x.IdBacSi == actorId && x.IdPhong == roomId);
        }

        private async Task<bool> HasGlobalRoomScopeAsync(long actorId)
        {
            var currentUserId = GetCurrentUserId();
            if (currentUserId.HasValue && currentUserId.Value == actorId && HasPrivilegedRoleClaim())
                return true;

            var globalRoles = new[] { "ADMIN", "QUAN_TRI", "TRUONG_KHOA", "BAC_SI_LIEN_KHOA" };
            return await _db.NguoiDungVaiTros
                .AsNoTracking()
                .Include(x => x.IdVaiTroNavigation)
                .AnyAsync(x =>
                    x.IdNguoiDung == actorId &&
                    x.IdVaiTroNavigation != null &&
                    globalRoles.Contains(x.IdVaiTroNavigation.Ten.ToUpper()));
        }

        private async Task<IActionResult?> EnsureCanTouchVisit(LanKham kham)
        {
            var actorId = GetCurrentUserId();
            if (!actorId.HasValue)
                return Unauthorized(new { success = false, message = "Phien dang nhap khong hop le." });

            if (kham.IdBacSi.HasValue && kham.IdBacSi.Value != actorId.Value)
            {
                if (await HasCrossDoctorEditPermission(actorId.Value))
                    return null;

                return BadRequest(new
                {
                    success = false,
                    message = "Khong the thao tac ho so cua bac si khac neu chua co quyen lien khoa."
                });
            }

            if (!kham.IdBacSi.HasValue && kham.IdPhong.HasValue)
            {
                var doctorInRoom = await _db.BacSiPhongs
                    .AsNoTracking()
                    .AnyAsync(x => x.IdBacSi == actorId.Value && x.IdPhong == kham.IdPhong.Value);

                if (!doctorInRoom && !await HasCrossDoctorEditPermission(actorId.Value))
                {
                    return BadRequest(new
                    {
                        success = false,
                        message = "Bac si chua duoc phan quyen phong kham nay."
                    });
                }
            }

            return null;
        }

        private async Task<bool> HasCrossDoctorEditPermission(long actorId)
        {
            if (HasPrivilegedRoleClaim())
                return true;

            var privilegedRoles = new[] { "ADMIN", "QUAN_TRI", "TRUONG_KHOA", "BAC_SI_LIEN_KHOA" };
            if (await _db.NguoiDungVaiTros
                .AsNoTracking()
                .Include(x => x.IdVaiTroNavigation)
                .AnyAsync(x =>
                    x.IdNguoiDung == actorId &&
                    x.IdVaiTroNavigation != null &&
                    privilegedRoles.Contains(x.IdVaiTroNavigation.Ten.ToUpper())))
            {
                return true;
            }

            var crossPermissionCodes = new[]
            {
                "KHAM_BENH_LIEN_KHOA",
                "KHAM_BENH_SUA_LIEN_KHOA",
                "KHAM_BENH_XEM_LIEN_KHOA",
                "BACSI_LIEN_KHOA"
            };

            return await _db.NguoiDungVaiTros
                .AsNoTracking()
                .Where(x => x.IdNguoiDung == actorId && x.IdVaiTro.HasValue)
                .Join(_db.VaiTroQuyens.AsNoTracking(),
                    userRole => userRole.IdVaiTro!.Value,
                    rolePermission => rolePermission.IdVaiTro ?? 0,
                    (userRole, rolePermission) => rolePermission)
                .Join(_db.Quyens.AsNoTracking(),
                    rolePermission => rolePermission.IdQuyen ?? 0,
                    permission => permission.Id,
                    (rolePermission, permission) => permission)
                .AnyAsync(permission =>
                    permission.MaQuyen != null &&
                    crossPermissionCodes.Contains(permission.MaQuyen.ToUpper()) &&
                    permission.Sua == true);
        }

        private bool HasPrivilegedRoleClaim()
        {
            var roles = User?.Claims?
                .Where(c => c.Type == ClaimTypes.Role || c.Type == "role" || c.Type.EndsWith("/role"))
                .Select(c => c.Value.Trim().ToUpperInvariant())
                .ToHashSet() ?? new HashSet<string>();

            return roles.Contains("ADMIN") ||
                   roles.Contains("QUAN_TRI") ||
                   roles.Contains("TRUONG_KHOA") ||
                   roles.Contains("BAC_SI_LIEN_KHOA");
        }

        private static string Normalize(string? value)
        {
            return (value ?? string.Empty).Trim().ToUpperInvariant();
        }

        private static DateTime NormalizeClientDateTime(DateTime value)
        {
            return value.Kind == DateTimeKind.Utc ? value.ToLocalTime() : value;
        }

        private static string FoldText(string? value)
        {
            if (string.IsNullOrWhiteSpace(value)) return string.Empty;

            var normalized = value.Normalize(NormalizationForm.FormD);
            var sb = new StringBuilder(normalized.Length);
            foreach (var c in normalized)
            {
                if (CharUnicodeInfo.GetUnicodeCategory(c) != UnicodeCategory.NonSpacingMark)
                    sb.Append(c);
            }

            return sb.ToString().Normalize(NormalizationForm.FormC).ToUpperInvariant();
        }

        private static bool IsLockedLanKhamForDoctor(string? status)
        {
            var normalized = Normalize(status);
            return normalized is
                TrangThai.DaKham or
                TrangThai.ChoThanhToan or
                TrangThai.DaThanhToan or
                TrangThai.Huy or
                "HUY" or
                "DONG" or
                "DA_DONG";
        }

        private async Task UpsertConclusionPaper(
            long idLanKham,
            LanKham kham,
            string paperType,
            GiayKetLuanKhamDto paper,
            DateTime followUpDate,
            bool signedFollowUp)
        {
            var now = DateTime.Now;
            var existing = await _db.GiayKetLuanKhams
                .Where(x => x.IdLanKham == idLanKham && x.LoaiGiay == paperType)
                .OrderByDescending(x => x.UpdatedAt ?? x.CreatedAt)
                .FirstOrDefaultAsync();

            if (existing == null)
            {
                existing = new GiayKetLuanKham
                {
                    IdLanKham = idLanKham,
                    LoaiGiay = paperType,
                    CreatedAt = now
                };
                _db.GiayKetLuanKhams.Add(existing);
            }

            var isFollowUp = paperType == "HEN_KHAM";
            var signed = isFollowUp ? signedFollowUp : paper.DaKy;

            existing.IdBenhNhan = kham.IdBenhNhan;
            existing.IdBacSi = kham.IdBacSi ?? GetCurrentUserId();
            existing.HinhThucDieuTri = FirstText(paper.HinhThucDieuTri, CanonicalTreatmentName(paperType));
            existing.KetQua = paper.KetQua;
            existing.ChanDoan = paper.ChanDoan;
            existing.BenhKemTheo = paper.BenhKemTheo;
            existing.LyDoHen = paper.LyDoHen;
            existing.LoiDan = paper.LoiDan;
            existing.NgayHen = isFollowUp ? followUpDate : paper.NgayHen;
            existing.PhongHen = paper.PhongHen;
            existing.LyDoVaoVien = paper.LyDoVaoVien;
            existing.KhoaNhapVien = paper.KhoaNhapVien;
            existing.KinhGui = paper.KinhGui;
            existing.DauHieuLamSang = paper.DauHieuLamSang;
            existing.LyDoChuyenTuyen = paper.LyDoChuyenTuyen;
            existing.HuongDieuTriChuyenTuyen = paper.HuongDieuTriChuyenTuyen;
            existing.PhuongTienVanChuyen = paper.PhuongTienVanChuyen;
            existing.LyDoKhongKham = paper.LyDoKhongKham;
            existing.GhiChu = paper.GhiChu;
            existing.DaKy = signed;
            existing.BacSiKy = string.IsNullOrWhiteSpace(paper.BacSiKy) ? null : paper.BacSiKy.Trim();
            existing.SignedAt = signed ? NormalizeClientDateTime(paper.SignedAt ?? now) : null;
            existing.UpdatedAt = now;
        }

        private static GiayKetLuanKhamDto BuildConclusionPaperDto(LanKhamUpdateDto dto, string paperType)
        {
            var paper = dto.GiayKetLuanKham;
            var followUp = dto.GiayHenKhamLai;
            var end = dto.KetThucKham;

            return new GiayKetLuanKhamDto
            {
                LoaiGiay = paperType,
                HinhThucDieuTri = FirstText(paper?.HinhThucDieuTri, end?.HuongDieuTri, followUp?.HinhThucDieuTri, dto.HuongXuTri, CanonicalTreatmentName(paperType)),
                KetQua = FirstText(paper?.KetQua, end?.KetQua, followUp?.KetQua, dto.KetQuaKham),
                ChanDoan = FirstText(paper?.ChanDoan, dto.ChanDoanCuoi, dto.ChanDoanSoBo),
                BenhKemTheo = FirstText(paper?.BenhKemTheo, followUp?.BenhKemTheo, dto.BenhKemTheo, dto.ChanDoanCuoi),
                LyDoHen = FirstText(paper?.LyDoHen, followUp?.LyDoHen, end?.QuaTrinhBenhLy),
                LoiDan = FirstText(paper?.LoiDan, followUp?.LoiDan, end?.LoiDan),
                NgayHen = paper?.NgayHen ?? followUp?.NgayHen,
                PhongHen = FirstText(paper?.PhongHen, followUp?.PhongHen),
                LyDoVaoVien = FirstText(paper?.LyDoVaoVien, end?.LyDoVaoVien),
                KhoaNhapVien = FirstText(paper?.KhoaNhapVien, end?.KhoaNhapVien),
                KinhGui = FirstText(paper?.KinhGui, end?.KinhGui),
                DauHieuLamSang = FirstText(paper?.DauHieuLamSang, end?.DauHieuLamSang),
                LyDoChuyenTuyen = FirstText(paper?.LyDoChuyenTuyen, end?.LyDoChuyenTuyen),
                HuongDieuTriChuyenTuyen = FirstText(paper?.HuongDieuTriChuyenTuyen, end?.HuongDieuTriChuyenTuyen),
                PhuongTienVanChuyen = FirstText(paper?.PhuongTienVanChuyen, end?.PhuongTienVanChuyen),
                LyDoKhongKham = FirstText(paper?.LyDoKhongKham, end?.LyDoKhongKham),
                GhiChu = FirstText(paper?.GhiChu, followUp?.GhiChu, dto.GhiChu),
                DaKy = paper?.DaKy == true || followUp?.DaKy == true,
                BacSiKy = FirstText(paper?.BacSiKy, followUp?.BacSiKy),
                SignedAt = paper?.SignedAt ?? followUp?.SignedAt
            };
        }

        private static string FirstText(params string?[] values)
        {
            foreach (var value in values)
            {
                if (!string.IsNullOrWhiteSpace(value))
                    return value.Trim();
            }
            return string.Empty;
        }

        private static string ToConclusionPaperType(string? foldedTreatment)
        {
            var value = FoldText(foldedTreatment);
            if (value.Contains("HEN") || value.Contains("TAI KHAM"))
                return "HEN_KHAM";
            if (value.Contains("NHAP"))
                return "NHAP_VIEN";
            if (value.Contains("CHUYEN"))
                return "CHUYEN_VIEN";
            if (value.Contains("KHONG") || value.Contains("BO VE"))
                return "KHONG_KHAM";
            return "CHO_VE";
        }

        private static string CanonicalTreatmentName(string paperType)
        {
            return paperType switch
            {
                "HEN_KHAM" => "Hẹn khám",
                "NHAP_VIEN" => "Nhập viện",
                "CHUYEN_VIEN" => "Chuyển viện",
                "KHONG_KHAM" => "Không khám",
                _ => "Cho về"
            };
        }

        private static string ConclusionPaperTitle(string paperType)
        {
            return paperType switch
            {
                "HEN_KHAM" => "GIẤY HẸN KHÁM LẠI",
                "NHAP_VIEN" => "GIẤY KHÁM BỆNH VÀO VIỆN",
                "CHUYEN_VIEN" => "GIẤY CHUYỂN TUYẾN KHÁM BỆNH, CHỮA BỆNH BHYT",
                "KHONG_KHAM" => "PHIẾU GHI NHẬN KHÔNG KHÁM",
                _ => "KẾT LUẬN CHO VỀ"
            };
        }

        private static List<string> ValidateConclusionPaperForPdf(GiayKetLuanKhamDto paper)
        {
            var errors = new List<string>();
            var paperType = ToConclusionPaperType(paper.LoaiGiay ?? paper.HinhThucDieuTri);

            if (string.IsNullOrWhiteSpace(paper.HinhThucDieuTri))
                errors.Add("Huong dieu tri la bat buoc.");
            if (string.IsNullOrWhiteSpace(paper.KetQua))
                errors.Add("Ket qua la bat buoc.");

            if (paperType != "KHONG_KHAM" && string.IsNullOrWhiteSpace(paper.ChanDoan))
                errors.Add("Chan doan la bat buoc.");

            if (paperType == "HEN_KHAM")
            {
                if (string.IsNullOrWhiteSpace(paper.LyDoHen))
                    errors.Add("Hen kham bat buoc nhap qua trinh benh ly.");
                if (!paper.NgayHen.HasValue)
                    errors.Add("Hen kham bat buoc chon ngay hen.");
                else if (paper.NgayHen.Value.Date < DateTime.Today)
                    errors.Add("Ngay hen kham lai khong duoc nam trong qua khu.");
                if (string.IsNullOrWhiteSpace(paper.BenhKemTheo))
                    errors.Add("Hen kham bat buoc co chan doan.");
                if (string.IsNullOrWhiteSpace(paper.PhongHen))
                    errors.Add("Hen kham bat buoc nhap phong hen.");
                if (!paper.DaKy)
                    errors.Add("Hen kham bat buoc co chu ky bac si.");
            }
            else if (paperType == "NHAP_VIEN")
            {
                if (string.IsNullOrWhiteSpace(paper.LyDoVaoVien))
                    errors.Add("Nhap vien bat buoc nhap ly do vao vien.");
                if (string.IsNullOrWhiteSpace(paper.KhoaNhapVien))
                    errors.Add("Nhap vien bat buoc nhap khoa dieu tri.");
            }
            else if (paperType == "CHUYEN_VIEN")
            {
                if (string.IsNullOrWhiteSpace(paper.KinhGui))
                    errors.Add("Chuyen vien bat buoc nhap kinh gui.");
                if (string.IsNullOrWhiteSpace(paper.DauHieuLamSang))
                    errors.Add("Chuyen vien bat buoc nhap dau hieu lam sang.");
                if (string.IsNullOrWhiteSpace(paper.LyDoChuyenTuyen))
                    errors.Add("Chuyen vien bat buoc chon ly do chuyen tuyen.");
                if (string.IsNullOrWhiteSpace(paper.HuongDieuTriChuyenTuyen))
                    errors.Add("Chuyen vien bat buoc nhap huong dieu tri.");
                if (string.IsNullOrWhiteSpace(paper.PhuongTienVanChuyen))
                    errors.Add("Chuyen vien bat buoc nhap phuong tien van chuyen.");
            }
            else if (paperType == "KHONG_KHAM")
            {
                if (string.IsNullOrWhiteSpace(paper.LyDoKhongKham))
                    errors.Add("Khong kham/bo ve bat buoc nhap ly do.");
            }
            else if (string.IsNullOrWhiteSpace(paper.LoiDan) && string.IsNullOrWhiteSpace(paper.GhiChu))
            {
                errors.Add("Cho ve bat buoc nhap loi dan hoac ghi chu sau kham.");
            }

            return errors;
        }

        private static List<string> ValidateExamResult(LanKhamUpdateDto dto)
        {
            var errors = new List<string>();
            var treatmentKey = GetTreatmentKey(dto);
            var paper = BuildConclusionPaperDto(dto, ToConclusionPaperType(treatmentKey));
            var isGoHome = IsTreatment(treatmentKey, "CHO VE");
            var isNoExam = IsTreatment(treatmentKey, "KHONG KHAM");
            var isFollowUp = IsTreatment(treatmentKey, "HEN KHAM");
            var isAdmission = IsTreatment(treatmentKey, "NHAP VIEN");
            var isTransfer = IsTreatment(treatmentKey, "CHUYEN VIEN");
            var result = FirstText(paper.KetQua, dto.KetThucKham?.KetQua, dto.KetQuaKham);

            if (string.IsNullOrWhiteSpace(result))
                errors.Add("Ket qua kham la bat buoc.");
            if (string.IsNullOrWhiteSpace(paper.HinhThucDieuTri) &&
                string.IsNullOrWhiteSpace(dto.KetThucKham?.HuongDieuTri) &&
                string.IsNullOrWhiteSpace(dto.HuongXuTri))
                errors.Add("Huong xu tri la bat buoc.");

            if (!isNoExam)
            {
                if (string.IsNullOrWhiteSpace(dto.ChanDoanCuoi))
                    errors.Add("Chan doan cuoi la bat buoc.");
                if (!dto.IdBenh.HasValue)
                    errors.Add("Ma ICD/benh chinh la bat buoc.");
                if (HasMultipleDiagnoses(dto.ChanDoanCuoi) && string.IsNullOrWhiteSpace(dto.GhiChu))
                    errors.Add("Nhieu chan doan can co ghi chu/mo ta chi tiet.");
            }

            if (isGoHome && string.IsNullOrWhiteSpace(paper.LoiDan) && string.IsNullOrWhiteSpace(dto.GhiChu))
                errors.Add("Cho ve bat buoc nhap loi dan hoac huong xu tri sau kham.");

            if (isFollowUp)
            {
                if (string.IsNullOrWhiteSpace(paper.LyDoHen) && string.IsNullOrWhiteSpace(dto.KetThucKham?.QuaTrinhBenhLy))
                    errors.Add("Hen kham bat buoc nhap qua trinh benh ly.");
                if (paper.NgayHen.HasValue != true)
                    errors.Add("Hen kham bat buoc chon ngay hen kham lai.");
                if (string.IsNullOrWhiteSpace(paper.BenhKemTheo) && string.IsNullOrWhiteSpace(dto.ChanDoanCuoi))
                    errors.Add("Hen kham bat buoc co chan doan.");
                if (string.IsNullOrWhiteSpace(paper.PhongHen))
                    errors.Add("Hen kham bat buoc nhap phong hen.");
            }

            if (isAdmission)
            {
                if (string.IsNullOrWhiteSpace(paper.LyDoVaoVien))
                    errors.Add("Nhap vien bat buoc nhap ly do vao vien.");
                if (string.IsNullOrWhiteSpace(paper.KhoaNhapVien))
                    errors.Add("Nhap vien bat buoc chon khoa dieu tri.");
            }

            if (isTransfer)
            {
                if (string.IsNullOrWhiteSpace(paper.KinhGui))
                    errors.Add("Chuyen vien bat buoc nhap kinh gui.");
                if (string.IsNullOrWhiteSpace(paper.DauHieuLamSang))
                    errors.Add("Chuyen vien bat buoc nhap dau hieu lam sang.");
                if (string.IsNullOrWhiteSpace(paper.LyDoChuyenTuyen))
                    errors.Add("Chuyen vien bat buoc chon ly do chuyen tuyen.");
                if (string.IsNullOrWhiteSpace(paper.HuongDieuTriChuyenTuyen))
                    errors.Add("Chuyen vien bat buoc nhap huong dieu tri.");
                if (string.IsNullOrWhiteSpace(paper.PhuongTienVanChuyen))
                    errors.Add("Chuyen vien bat buoc nhap phuong tien van chuyen.");
            }

            if (isNoExam && string.IsNullOrWhiteSpace(paper.LyDoKhongKham))
                errors.Add("Khong kham/bo ve bat buoc nhap ly do.");

            return errors;
        }

        private static string GetTreatmentKey(LanKhamUpdateDto dto)
        {
            return FoldText(dto.KetThucKham?.HuongDieuTri
                ?? dto.GiayKetLuanKham?.HinhThucDieuTri
                ?? dto.GiayHenKhamLai?.HinhThucDieuTri
                ?? dto.HuongXuTri);
        }

        private static bool IsTreatment(string treatmentKey, string expected)
        {
            return string.Equals(treatmentKey, expected, StringComparison.OrdinalIgnoreCase);
        }

        private static bool HasMultipleDiagnoses(string? value)
        {
            if (string.IsNullOrWhiteSpace(value)) return false;
            return value.Contains(';') || value.Contains('\n') || value.Contains('|');
        }

        private HoSoTransitionResult EnsureHoSoDoctorStatus(HoSoBenhAn hoSo, string targetStatus, long? actorId, string action, string? note)
        {
            var target = _hoSoTrangThai.NormalizeStatus(targetStatus);
            var direct = _hoSoTrangThai.ApplyTransition(hoSo, target, actorId, action, note);
            if (direct.Success) return direct;

            foreach (var intermediate in GetDoctorPrepPath(_hoSoTrangThai.NormalizeStatus(hoSo.TrangThai), target))
            {
                var prep = _hoSoTrangThai.ApplyTransition(hoSo, intermediate, actorId, $"{action}_PREP", note);
                if (!prep.Success)
                    continue;

                var retry = _hoSoTrangThai.ApplyTransition(hoSo, target, actorId, action, note);
                if (retry.Success) return retry;
            }

            return direct;
        }

        private static IEnumerable<string> GetDoctorPrepPath(string currentStatus, string targetStatus)
        {
            static IEnumerable<string> StopAtTarget(IEnumerable<string> path, string target)
            {
                foreach (var status in path)
                {
                    yield return status;
                    if (string.Equals(status, target, StringComparison.OrdinalIgnoreCase))
                        yield break;
                }
            }

            var current = Normalize(currentStatus);
            var target = Normalize(targetStatus);

            var path = current switch
            {
                "" => new[]
                {
                    HoSoTrangThaiService.MoiTao,
                    HoSoTrangThaiService.DaTiepDon,
                    HoSoTrangThaiService.ChoDichVu,
                    HoSoTrangThaiService.ChoKham,
                    HoSoTrangThaiService.DangKham
                },
                HoSoTrangThaiService.MoiTao => new[]
                {
                    HoSoTrangThaiService.DaTiepDon,
                    HoSoTrangThaiService.ChoDichVu,
                    HoSoTrangThaiService.ChoKham,
                    HoSoTrangThaiService.DangKham
                },
                HoSoTrangThaiService.DaTiepDon => new[]
                {
                    HoSoTrangThaiService.ChoDichVu,
                    HoSoTrangThaiService.ChoKham,
                    HoSoTrangThaiService.DangKham
                },
                HoSoTrangThaiService.ChoDichVu or
                HoSoTrangThaiService.DichVuNhap or
                HoSoTrangThaiService.DaNhanKhuMoi or
                HoSoTrangThaiService.HuyChuyenKhu or
                HoSoTrangThaiService.DaThanhToan => new[]
                {
                    HoSoTrangThaiService.ChoKham,
                    HoSoTrangThaiService.DangKham
                },
                HoSoTrangThaiService.ChoKham => new[]
                {
                    HoSoTrangThaiService.DangKham
                },
                _ => Array.Empty<string>()
            };

            return StopAtTarget(path, target);
        }

        private async Task<int> CountRemainingActiveRooms(long currentLanKhamId, long? idHoSo)
        {
            if (!idHoSo.HasValue) return 0;

            return await _db.LanKhams.CountAsync(x =>
                x.IdHoSo == idHoSo &&
                x.Id != currentLanKhamId &&
                (x.TrangThai == null ||
                 (x.TrangThai != TrangThai.DaKham &&
                  x.TrangThai != TrangThai.Huy &&
                  x.TrangThai != "HUY" &&
                  x.TrangThai != "DA_DONG" &&
                  x.TrangThai != "DONG")));
        }

        private async Task<bool> HasPaidInvoiceForVisit(long idLanKham)
        {
            return await _db.HoaDons.AnyAsync(h =>
                h.IdLanKham == idLanKham &&
                h.TrangThai != null &&
                (h.TrangThai.ToUpper() == "DA_THANH_TOAN" ||
                 h.TrangThai.ToUpper() == "PAID" ||
                 h.TrangThai.ToUpper() == "THANH_TOAN"));
        }

        private async Task<bool> HasPendingElectronicPaymentForVisit(long idLanKham)
        {
            return await _db.HoaDons.AnyAsync(h =>
                h.IdLanKham == idLanKham &&
                h.TrangThai != null &&
                h.TrangThai.ToUpper() == "DANG_THANH_TOAN");
        }

        private async Task<bool> HasLockedClinicalServices(long idLanKham)
        {
            var lockedDvkt = await _db.ChiDinhDvkts.AnyAsync(x =>
                x.IdLanKham == idLanKham &&
                (x.TrangThai == DvktTrangThai.Sent ||
                 x.TrangThai == DvktTrangThai.Processing ||
                 x.TrangThai == DvktTrangThai.Done ||
                 x.TrangThai == DvktTrangThai.Paid ||
                 x.NhanLuc != null ||
                 x.HoanThanhLuc != null ||
                 x.DvktKetQuas.Any()));

            if (lockedDvkt) return true;

            return await _db.LanKhamDichVus.AnyAsync(x =>
                x.IdLanKham == idLanKham &&
                x.TrangThaiThucHien != null &&
                x.TrangThaiThucHien != TrangThai.ChoThucHien &&
                x.TrangThaiThucHien != TrangThai.Huy &&
                x.TrangThaiThucHien != "HUY" &&
                x.TrangThaiThucHien != "canceled");
        }

        private async Task CancelPendingClinicalOrders(long idLanKham)
        {
            var pendingOrders = await _db.ChiDinhDvkts
                .Where(x => x.IdLanKham == idLanKham && x.TrangThai == DvktTrangThai.Pending)
                .ToListAsync();

            foreach (var order in pendingOrders)
                order.TrangThai = DvktTrangThai.Canceled;

            var pendingServices = await _db.LanKhamDichVus
                .Where(x => x.IdLanKham == idLanKham && x.TrangThaiThucHien == TrangThai.ChoThucHien)
                .ToListAsync();

            foreach (var service in pendingServices)
                service.TrangThaiThucHien = TrangThai.Huy;

            var openDvktInvoices = await _db.HoaDons
                .Where(x => x.IdLanKham == idLanKham
                    && x.LoaiHoaDon == "DVKT"
                    && x.TrangThai != "DA_THANH_TOAN"
                    && x.TrangThai != "DANG_THANH_TOAN"
                    && x.TrangThai != "HUY"
                    && x.TrangThai != "DA_HUY")
                .ToListAsync();

            foreach (var invoice in openDvktInvoices)
            {
                invoice.TrangThai = "HUY";
                invoice.GhiChu = string.IsNullOrWhiteSpace(invoice.GhiChu)
                    ? "Hủy do bác sĩ kết luận Không khám."
                    : $"{invoice.GhiChu} | Hủy do bác sĩ kết luận Không khám.";
            }
        }

        private static string? ReadMetaString(string? raw, string propertyName)
        {
            if (string.IsNullOrWhiteSpace(raw) || !raw.StartsWith(MetaPrefix, StringComparison.Ordinal))
                return null;

            try
            {
                using var doc = JsonDocument.Parse(raw[MetaPrefix.Length..]);
                return doc.RootElement.TryGetProperty(propertyName, out var prop) && prop.ValueKind == JsonValueKind.String
                    ? prop.GetString()
                    : null;
            }
            catch
            {
                return null;
            }
        }

        private static int GetPriorityRank(string? priority)
        {
            var folded = FoldText(priority);
            if (folded.Contains("CAP CUU") || folded.Contains("CAP_CUU") || folded.Contains("KHAN"))
                return 0;
            if (folded.Contains("UU TIEN") || folded.Contains("VIP") || folded.Contains("NGUOI GIA") || folded.Contains("TRE EM"))
                return 1;
            if (folded.Contains("HEN"))
                return 2;
            return 9;
        }

        private sealed record QueueVisitRow(
            long Id,
            long? IdBenhNhan,
            string? BenhNhan,
            string? MaBenhNhan,
            string? MaHoSo,
            string? HoSoGhiChu,
            DateTime? CreatedAt,
            DateTime? ThoiGianBatDau,
            DateTime? ThoiGianKetThuc,
            string? TrangThai,
            string? ChanDoanCuoi,
            string? HuongXuTri
        );

        private static List<object> BuildQueueList(IEnumerable<QueueVisitRow> rows)
        {
            return rows
                .Select(x => new
                {
                    Row = x,
                    MucUuTien = ReadMetaString(x.HoSoGhiChu, "priority"),
                    PriorityRank = GetPriorityRank(ReadMetaString(x.HoSoGhiChu, "priority")),
                    SortTime = x.ThoiGianBatDau ?? x.CreatedAt ?? DateTime.MaxValue
                })
                .OrderBy(x => x.PriorityRank)
                .ThenBy(x => x.SortTime)
                .ThenBy(x => x.Row.Id)
                .Select((x, index) => (object)new
                {
                    x.Row.Id,
                    x.Row.IdBenhNhan,
                    BenhNhan = x.Row.BenhNhan,
                    MaBenhNhan = x.Row.MaBenhNhan,
                    MaHoSo = x.Row.MaHoSo,
                    x.Row.CreatedAt,
                    x.Row.ThoiGianBatDau,
                    x.Row.ThoiGianKetThuc,
                    x.Row.TrangThai,
                    x.Row.ChanDoanCuoi,
                    x.Row.HuongXuTri,
                    MucUuTien = x.MucUuTien,
                    SttKham = index + 1
                })
                .ToList();
        }
    }
}
