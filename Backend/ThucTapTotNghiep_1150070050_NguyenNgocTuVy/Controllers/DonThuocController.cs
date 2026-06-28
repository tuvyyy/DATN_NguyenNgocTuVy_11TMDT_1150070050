using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ThucTapTotNghiep_1150070050_NguyenNgocTuVy.Data;
using ThucTapTotNghiep_1150070050_NguyenNgocTuVy.Dtos;
using ThucTapTotNghiep_1150070050_NguyenNgocTuVy.Models;
using ThucTapTotNghiep_1150070050_NguyenNgocTuVy.Services;
using Microsoft.AspNetCore.Authorization;
using System.Globalization;
using System.Security.Claims;
using System.Text;
using System.Text.RegularExpressions;

namespace ThucTapTotNghiep_1150070050_NguyenNgocTuVy.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class DonThuocController : ControllerBase
    {
        private readonly DACNDbContext _db;
        private readonly DonThuocValidatorService _validator;
        private readonly IKhamBenhAuditService _audit;
        private const string FeatureKhamBenh = "KHAM_BENH";

        public DonThuocController(DACNDbContext db, DonThuocValidatorService validator, IKhamBenhAuditService audit)
        {
            _db = db;
            _validator = validator;
            _audit = audit;
        }

        // ==========================================================
        // 1) API CHECK ĐƠN THUỐC (dùng trước khi nhấn "Lưu")
        // ==========================================================
        [HttpPost("check")]
        [Authorize]
        public async Task<IActionResult> CheckDon([FromBody] DonThuocCreateDto dto)
        {
            if (dto.ChiTiet.Count == 0 && string.IsNullOrWhiteSpace(NormalizePrescriptionNote(dto)))
            {
                return Ok(new
                {
                    isSafe = false,
                    warnings = Array.Empty<string>(),
                    errors = new[] { "Đơn trắng cần có ghi chú/lời dặn của bác sĩ." }
                });
            }

            var (warnings, errors) = await _validator.ValidateFull(dto);

            return Ok(new
            {
                isSafe = errors.Count == 0,
                warnings,
                errors
            });
        }
        // ==========================================================
        // 2) TẠO ĐƠN THUỐC — FULL SAFE + TRANSACTION
        // ==========================================================
        [HttpPost]
        [Authorize]
        public async Task<IActionResult> CreateDon([FromBody] DonThuocCreateDto dto)
        {
            if (dto.ChiTiet.Count == 0 && string.IsNullOrWhiteSpace(NormalizePrescriptionNote(dto)))
                return BadRequest(new { message = "Đơn trắng cần có ghi chú/lời dặn của bác sĩ." });

            // 1. Validate an toàn đơn thuốc
            var (warnings, errors) = await _validator.ValidateFull(dto);
            if (errors.Any())
                return BadRequest(new { message = "Đơn thuốc KHÔNG AN TOÀN", errors });

            // 2. Lấy thông tin LẦN KHÁM để đảm bảo FK đúng
            var lanKham = await _db.LanKhams
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.Id == dto.IdLanKham);

            if (lanKham == null)
                return BadRequest(new { message = $"Lần khám {dto.IdLanKham} không tồn tại!" });

            if (IsVisitLocked(lanKham.TrangThai))
                return BadRequest(new { message = "Lần khám đã khóa, không thể tạo đơn thuốc." });

            var permissionError = await EnsureCanTouchPrescription(lanKham, lanKham.IdBacSi, "them");
            if (permissionError != null)
                return permissionError;

            var exists = await _db.DonThuocs.AnyAsync(x => x.IdLanKham == dto.IdLanKham);
            if (exists)
                return BadRequest(new { message = "Lần khám đã có đơn thuốc, vui lòng cập nhật đơn hiện có." });

            // Lấy id bệnh nhân & bác sĩ từ lần khám (đảm bảo khớp FK)
            var idBenhNhan = lanKham.IdBenhNhan;
            var idBacSi = lanKham.IdBacSi ?? GetCurrentUserId() ?? dto.IdBacSi;

            // Double-check bệnh nhân có tồn tại trong bảng benh_nhan
            var benhNhanExists = await _db.BenhNhans
                .AsNoTracking()
                .AnyAsync(b => b.Id == idBenhNhan);

            if (!benhNhanExists)
                return BadRequest(new { message = $"Bệnh nhân {idBenhNhan} không tồn tại!" });

            using var tx = await _db.Database.BeginTransactionAsync();

            try
            {
                // 3. Tạo đơn thuốc (DÙ FE GỬI idBenhNhan GÌ THÌ CŨNG BỎ QUA,
                //    CHỈ DÙNG id lấy từ LanKham)
                var don = new DonThuoc
                {
                    IdLanKham = lanKham.Id,
                    IdBenhNhan = idBenhNhan,
                    IdBacSi = idBacSi,
                    NgayKe = DateTime.Now,
                    SoNgayUong = dto.SoNgayUong,
                    GhiChu = NormalizePrescriptionNote(dto)
                };

                _db.DonThuocs.Add(don);
                await _db.SaveChangesAsync();

                decimal tongTien = 0;
                var dsThuoc = await _db.Thuocs.ToListAsync();

                foreach (var ct in dto.ChiTiet)
                {
                    var t = dsThuoc.First(x => x.Id == ct.IdThuoc);
                    t.SoLuongTon -= ct.SoLuong ?? 0;

                    tongTien += (t.DonGia ?? 0m) * (ct.SoLuong ?? 0);

                    _db.ChiTietDonThuocs.Add(new ChiTietDonThuoc
                    {
                        IdDonThuoc = don.Id,
                        IdThuoc = ct.IdThuoc,
                        SoLuong = ct.SoLuong,
                        DonVi = ct.DonVi,
                        DungTich = ct.DungTich,
                        Sang = ct.Sang,
                        Trua = ct.Trua,
                        Chieu = ct.Chieu,
                        Toi = ct.Toi,
                        Khuya = ct.Khuya,
                        SoNgayUong = ct.SoNgayUong,
                        GhiChu = ct.GhiChu
                    });
                }

                don.TongTien = tongTien;
                await _db.SaveChangesAsync();

                await tx.CommitAsync();
                await _audit.WriteAsync(
                    lanKham.Id,
                    "CREATE_PRESCRIPTION",
                    "DON_THUOC",
                    don.Id,
                    duLieuSau: new
                    {
                        don.Id,
                        don.IdBacSi,
                        don.SoNgayUong,
                        don.TongTien,
                        don.GhiChu,
                        SoDong = dto.ChiTiet.Count
                    });

                return Ok(new
                {
                    message = "Tạo đơn thuốc thành công!",
                    id = don.Id,
                    warnings
                });
            }
            catch
            {
                await tx.RollbackAsync();
                throw;
            }
        }


        // ==========================================================
        // 3) CẬP NHẬT ĐƠN THUỐC — RESTORE TỒN KHO — REVALIDATE
        // ==========================================================
        [HttpPut("{id}")]
        [Authorize]
        public async Task<IActionResult> UpdateDon(long id, [FromBody] DonThuocCreateDto dto)
        {
            if (dto.ChiTiet.Count == 0 && string.IsNullOrWhiteSpace(NormalizePrescriptionNote(dto)))
                return BadRequest(new { message = "Đơn trắng cần có ghi chú/lời dặn của bác sĩ." });

            var don = await _db.DonThuocs
                .Include(x => x.IdLanKhamNavigation)
                .FirstOrDefaultAsync(x => x.Id == id);
            if (don == null) return NotFound();

            if (IsVisitLocked(don.IdLanKhamNavigation?.TrangThai))
                return BadRequest(new { message = "Lần khám đã khóa, không thể cập nhật đơn thuốc." });

            var permissionError = await EnsureCanTouchPrescription(don.IdLanKhamNavigation, don.IdBacSi, "sua");
            if (permissionError != null)
                return permissionError;

            if (await HasPaidMedicineItems(id))
                return BadRequest(new { message = "Đơn thuốc đã có thuốc thanh toán, không thể cập nhật trực tiếp." });

            var oldCt = await _db.ChiTietDonThuocs.Where(x => x.IdDonThuoc == id).ToListAsync();
            var beforeAudit = new
            {
                don.Id,
                don.IdLanKham,
                don.IdBacSi,
                don.SoNgayUong,
                don.TongTien,
                don.GhiChu,
                ChiTiet = oldCt.Select(x => new { x.Id, x.IdThuoc, x.SoLuong, x.GhiChu }).ToList()
            };

            using var tx = await _db.Database.BeginTransactionAsync();

            try
            {
                var dsThuoc = await _db.Thuocs.ToListAsync();

                foreach (var c in oldCt)
                {
                    var t = dsThuoc.First(x => x.Id == c.IdThuoc);
                    t.SoLuongTon += c.SoLuong ?? 0;
                }

                _db.ChiTietDonThuocs.RemoveRange(oldCt);
                await _db.SaveChangesAsync();

                var (warnings, errors) = await _validator.ValidateFull(dto);
                if (errors.Any())
                {
                    await tx.RollbackAsync();
                    return BadRequest(new { message = "Đơn KHÔNG AN TOÀN", errors });
                }

                decimal tongTien = 0;

                foreach (var ct in dto.ChiTiet)
                {
                    var t = dsThuoc.First(x => x.Id == ct.IdThuoc);
                    t.SoLuongTon -= ct.SoLuong ?? 0;

                    tongTien += (t.DonGia ?? 0m) * (ct.SoLuong ?? 0);

                    _db.ChiTietDonThuocs.Add(new ChiTietDonThuoc
                    {
                        IdDonThuoc = don.Id,
                        IdThuoc = ct.IdThuoc,
                        SoLuong = ct.SoLuong,
                        DonVi = ct.DonVi,
                        DungTich = ct.DungTich,
                        Sang = ct.Sang,
                        Trua = ct.Trua,
                        Chieu = ct.Chieu,
                        Toi = ct.Toi,
                        Khuya = ct.Khuya,
                        SoNgayUong = ct.SoNgayUong,
                        GhiChu = ct.GhiChu
                    });
                }

                don.TongTien = tongTien;
                don.GhiChu = NormalizePrescriptionNote(dto);
                don.SoNgayUong = dto.SoNgayUong;

                await _db.SaveChangesAsync();
                await tx.CommitAsync();
                await _audit.WriteAsync(
                    don.IdLanKham,
                    "UPDATE_PRESCRIPTION",
                    "DON_THUOC",
                    don.Id,
                    duLieuTruoc: beforeAudit,
                    duLieuSau: new
                    {
                        don.Id,
                        don.IdLanKham,
                        don.IdBacSi,
                        don.SoNgayUong,
                        don.TongTien,
                        don.GhiChu,
                        ChiTiet = dto.ChiTiet.Select(x => new { x.IdThuoc, x.SoLuong, x.GhiChu }).ToList()
                    });

                return Ok(new { message = "Cập nhật đơn thành công!", warnings });
            }
            catch
            {
                await tx.RollbackAsync();
                throw;
            }
        }

        // ==========================================================
        // 4) XÓA ĐƠN — PHỤC HỒI TỒN KHO
        // ==========================================================
        [HttpDelete("{id}")]
        [Authorize]
        public async Task<IActionResult> Delete(long id)
        {
            var don = await _db.DonThuocs
                .Include(x => x.IdLanKhamNavigation)
                .FirstOrDefaultAsync(x => x.Id == id);
            if (don == null) return NotFound();

            if (IsVisitLocked(don.IdLanKhamNavigation?.TrangThai))
                return BadRequest(new { message = "Lần khám đã khóa, không thể xóa đơn thuốc." });

            var permissionError = await EnsureCanTouchPrescription(don.IdLanKhamNavigation, don.IdBacSi, "xoa");
            if (permissionError != null)
                return permissionError;

            if (await HasPaidMedicineItems(id))
                return BadRequest(new { message = "Đơn thuốc đã có thuốc thanh toán, không thể xóa trực tiếp." });

            var idLanKham = don.IdLanKham;
            using var tx = await _db.Database.BeginTransactionAsync();

            try
            {
                var ct = await _db.ChiTietDonThuocs.Where(x => x.IdDonThuoc == id).ToListAsync();
                var beforeAudit = new
                {
                    don.Id,
                    don.IdLanKham,
                    don.IdBacSi,
                    don.SoNgayUong,
                    don.TongTien,
                    don.GhiChu,
                    ChiTiet = ct.Select(x => new { x.Id, x.IdThuoc, x.SoLuong, x.GhiChu }).ToList()
                };
                var dsThuoc = await _db.Thuocs.ToListAsync();

                foreach (var c in ct)
                {
                    var t = dsThuoc.First(x => x.Id == c.IdThuoc);
                    t.SoLuongTon += c.SoLuong ?? 0;
                }

                _db.ChiTietDonThuocs.RemoveRange(ct);
                _db.DonThuocs.Remove(don);

                await _db.SaveChangesAsync();
                await tx.CommitAsync();
                await _audit.WriteAsync(
                    idLanKham,
                    "DELETE_PRESCRIPTION",
                    "DON_THUOC",
                    id,
                    "Bac si xoa don thuoc chua thanh toan.",
                    beforeAudit,
                    null);

                return Ok(new { message = "Xóa đơn thuốc thành công!" });
            }
            catch
            {
                await tx.RollbackAsync();
                throw;
            }
        }

        // ==========================================================
        // 5) GỢI Ý THUỐC THAY THẾ AN TOÀN
        // ==========================================================
        [HttpGet("goi-y/{idThuoc}")]
        public async Task<IActionResult> GoiYThuoc(long idThuoc)
        {
            var interact = await _db.TuongTacThuocs
                .Where(x => x.IdThuoc1 == idThuoc || x.IdThuoc2 == idThuoc)
                .Select(x => x.IdThuoc1 == idThuoc ? x.IdThuoc2 : x.IdThuoc1)
                .ToListAsync();

            var unsafeIds = new HashSet<long>(interact);

            var safeMedicines = await _db.Thuocs
                .Where(t => t.HoatDong == true && !unsafeIds.Contains(t.Id))
                .Select(t => new { t.Id, t.Ten })
                .ToListAsync();

            return Ok(safeMedicines);
        }

        // 6) LẤY ĐƠN THEO LẦN KHÁM
        [HttpGet("lan-kham/{idLanKham}")]
        public async Task<IActionResult> GetByLanKham(long idLanKham)
        {
            try
            {
                // ⭐ LẤY ĐƠN MỚI NHẤT THEO LẦN KHÁM
                var don = await _db.DonThuocs
                    .AsNoTracking()
                    .Include(x => x.IdLanKhamNavigation)
                        .ThenInclude(x => x!.IdPhongNavigation)
                    .Include(x => x.IdLanKhamNavigation)
                        .ThenInclude(x => x!.IdBenhNavigation)
                    .Include(x => x.IdBacSiNavigation)
                    .Where(x => x.IdLanKham == idLanKham)
                    .OrderByDescending(x => x.Id)   // ⭐ VERY IMPORTANT
                    .FirstOrDefaultAsync();

                if (don == null)
                    return Ok(null);

                // Lấy chi tiết
                var chiTiet = await _db.ChiTietDonThuocs
                    .Where(c => c.IdDonThuoc == don.Id)
                    .Include(c => c.IdThuocNavigation)
                        .ThenInclude(t => t!.IdNhomNavigation)
                    .AsNoTracking()
                    .ToListAsync();

                var paidIds = await GetPaidMedicineDetailIds(chiTiet.Select(x => x.Id).ToList());
                var latestPaper = await GetLatestConclusionPaper(idLanKham);

                var result = new
                {
                    don.Id,
                    don.NgayKe,
                    don.SoNgayUong,
                    don.GhiChu,
                    BacSi = BuildDoctorDto(don.IdBacSiNavigation),
                    Phong = BuildRoomDto(don.IdLanKhamNavigation?.IdPhongNavigation),
                    ChanDoanCuoi = don.IdLanKhamNavigation?.ChanDoanCuoi,
                    IdBenh = don.IdLanKhamNavigation?.IdBenh,
                    MaBenh = don.IdLanKhamNavigation?.IdBenhNavigation?.Ma,
                    TenBenh = don.IdLanKhamNavigation?.IdBenhNavigation?.Ten,
                    BenhKemTheo = don.IdLanKhamNavigation?.BenhKemTheo,
                    NgayHen = latestPaper?.NgayHen,
                    CanEdit = !IsVisitLocked(don.IdLanKhamNavigation?.TrangThai) && !paidIds.Any(),
                    CanPrint = IsVisitConcluded(don.IdLanKhamNavigation?.TrangThai),
                    ChiTiet = chiTiet.Select(x => new
                    {
                        x.Id,
                        x.IdThuoc,
                        MaThuoc = x.IdThuocNavigation?.Ma,
                        TenThuoc = x.IdThuocNavigation?.Ten ?? "(Thuốc không tồn tại)",
                        HoatChat = GetHoatChatLabel(x.IdThuocNavigation),
                        LoaiThuoc = GetMedicineCategory(x.IdThuocNavigation),
                        TenNhom = x.IdThuocNavigation?.IdNhomNavigation?.Ten,
                        DonGia = x.IdThuocNavigation?.DonGia,
                        SoLuongTon = x.IdThuocNavigation?.SoLuongTon,
                        DaThanhToan = paidIds.Contains(x.Id),
                        CanEdit = !paidIds.Contains(x.Id) && !IsVisitLocked(don.IdLanKhamNavigation?.TrangThai),
                        x.SoLuong,
                        x.DonVi,
                        x.DungTich,
                        x.Sang,
                        x.Trua,
                        x.Chieu,
                        x.Toi,
                        x.Khuya,
                        x.SoNgayUong,
                        x.GhiChu
                    })
                };

                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    message = "Lỗi GetByLanKham",
                    detail = ex.Message,
                    stack = ex.StackTrace
                });
            }
        }


        [HttpGet("tong-hop/lan-kham/{idLanKham}")]
        public async Task<IActionResult> GetTongHopTheoLanKham(long idLanKham)
        {
            var current = await _db.LanKhams
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.Id == idLanKham);

            if (current == null)
                return NotFound(new { message = "Không tìm thấy lần khám." });

            var visitQuery = _db.LanKhams
                .AsNoTracking()
                .Include(x => x.IdPhongNavigation)
                .Include(x => x.IdBacSiNavigation)
                .Include(x => x.IdBenhNavigation)
                .Include(x => x.LanKhamBenhKemTheos)
                    .ThenInclude(x => x.IdBenhNavigation)
                .AsQueryable();

            if (current.IdHoSo.HasValue)
            {
                visitQuery = visitQuery.Where(x => x.IdHoSo == current.IdHoSo);
            }
            else
            {
                var day = (current.CreatedAt ?? DateTime.Today).Date;
                var nextDay = day.AddDays(1);
                visitQuery = visitQuery.Where(x =>
                    x.IdBenhNhan == current.IdBenhNhan &&
                    x.CreatedAt >= day &&
                    x.CreatedAt < nextDay);
            }

            var visits = await visitQuery
                .OrderBy(x => x.CreatedAt)
                .ThenBy(x => x.Id)
                .ToListAsync();

            var visitIds = visits.Select(x => x.Id).ToList();
            var dons = await _db.DonThuocs
                .AsNoTracking()
                .Include(x => x.IdBacSiNavigation)
                .Where(x => x.IdLanKham.HasValue && visitIds.Contains(x.IdLanKham.Value))
                .OrderByDescending(x => x.Id)
                .ToListAsync();

            var donIds = dons.Select(x => x.Id).ToList();
            var chiTiet = await _db.ChiTietDonThuocs
                .AsNoTracking()
                .Include(x => x.IdThuocNavigation)
                    .ThenInclude(t => t!.IdNhomNavigation)
                .Where(x => x.IdDonThuoc.HasValue && donIds.Contains(x.IdDonThuoc.Value))
                .ToListAsync();

            var paidIds = await GetPaidMedicineDetailIds(chiTiet.Select(x => x.Id).ToList());
            var papers = await _db.GiayKetLuanKhams
                .AsNoTracking()
                .Where(x => visitIds.Contains(x.IdLanKham))
                .OrderByDescending(x => x.CreatedAt)
                .ToListAsync();

            var latestPaperByVisit = papers
                .GroupBy(x => x.IdLanKham)
                .ToDictionary(g => g.Key, g => g.First());

            var detailByDon = chiTiet
                .GroupBy(x => x.IdDonThuoc ?? 0)
                .ToDictionary(g => g.Key, g => g.ToList());

            var blockingRooms = visits
                .Where(x => !IsVisitConcluded(x.TrangThai))
                .Select(x => new
                {
                    x.Id,
                    TrangThai = x.TrangThai,
                    Phong = x.IdPhongNavigation?.TenPhong ?? $"Phòng #{x.IdPhong}"
                })
                .ToList();

            var rooms = visits.Select(v =>
            {
                var don = dons.FirstOrDefault(d => d.IdLanKham == v.Id);
                var details = don != null && detailByDon.TryGetValue(don.Id, out var rows)
                    ? rows
                    : new List<ChiTietDonThuoc>();
                latestPaperByVisit.TryGetValue(v.Id, out var paper);

                return new
                {
                    IdLanKham = v.Id,
                    v.IdHoSo,
                    TrangThai = v.TrangThai,
                    Phong = BuildRoomDto(v.IdPhongNavigation),
                    BacSi = BuildDoctorDto(v.IdBacSiNavigation),
                    ChanDoanCuoi = v.ChanDoanCuoi,
                    KetQuaKham = v.KetQuaKham,
                    HuongXuTri = v.HuongXuTri,
                    Benh = v.IdBenhNavigation == null ? null : new { v.IdBenhNavigation.Id, v.IdBenhNavigation.Ma, v.IdBenhNavigation.Ten },
                    BenhKemTheo = v.BenhKemTheo,
                    BenhKemTheoList = v.LanKhamBenhKemTheos
                        .OrderBy(x => x.ThuTu)
                        .Select(x => new
                        {
                            x.IdBenh,
                            Ma = x.IdBenhNavigation?.Ma,
                            Ten = x.IdBenhNavigation?.Ten
                        })
                        .ToList(),
                    GiayKetLuan = paper == null ? null : new
                    {
                        paper.LoaiGiay,
                        paper.HinhThucDieuTri,
                        paper.KetQua,
                        paper.NgayHen,
                        paper.PhongHen,
                        paper.LoiDan,
                        paper.GhiChu
                    },
                    DonThuoc = don == null ? null : new
                    {
                        don.Id,
                        don.NgayKe,
                        don.SoNgayUong,
                        don.GhiChu,
                        BacSi = BuildDoctorDto(don.IdBacSiNavigation),
                        TongTien = details.Sum(x => (x.IdThuocNavigation?.DonGia ?? 0m) * (x.SoLuong ?? 0)),
                        CoThuocDaThanhToan = details.Any(x => paidIds.Contains(x.Id)),
                        ChiTiet = details.Select(x => BuildMedicineDetailDto(x, paidIds)).ToList()
                    },
                    NhomThuoc = details
                        .GroupBy(x => GetMedicineCategory(x.IdThuocNavigation))
                        .Select(g => new
                        {
                            LoaiThuoc = g.Key,
                            SoDong = g.Count(),
                            TongTien = g.Sum(x => (x.IdThuocNavigation?.DonGia ?? 0m) * (x.SoLuong ?? 0)),
                            ChiTiet = g.Select(x => BuildMedicineDetailDto(x, paidIds)).ToList()
                        })
                        .ToList()
                };
            }).ToList();

            return Ok(new
            {
                IdLanKham = current.Id,
                current.IdHoSo,
                CanPrintTongHop = blockingRooms.Count == 0,
                BlockingRooms = blockingRooms,
                TotalRooms = rooms.Count,
                TotalPrescriptions = rooms.Count(x => x.DonThuoc != null),
                TotalMedicines = chiTiet.Count,
                TongTien = chiTiet.Sum(x => (x.IdThuocNavigation?.DonGia ?? 0m) * (x.SoLuong ?? 0)),
                Rooms = rooms
            });
        }


        [HttpDelete("chi-tiet/{id}")]
        [Authorize]
        public async Task<IActionResult> DeleteChiTiet(long id)
        {
            var ct = await _db.ChiTietDonThuocs
                .Include(x => x.IdDonThuocNavigation)
                    .ThenInclude(d => d.IdLanKhamNavigation)
                .FirstOrDefaultAsync(x => x.Id == id);
            if (ct == null) return NotFound();

            if (IsVisitLocked(ct.IdDonThuocNavigation?.IdLanKhamNavigation?.TrangThai))
                return BadRequest(new { message = "Lần khám đã khóa, không thể xóa thuốc trong đơn." });

            var permissionError = await EnsureCanTouchPrescription(ct.IdDonThuocNavigation?.IdLanKhamNavigation, ct.IdDonThuocNavigation?.IdBacSi, "xoa");
            if (permissionError != null)
                return permissionError;

            if (await IsMedicineDetailPaid(ct.Id))
                return BadRequest(new { message = "Thuốc đã thanh toán, không thể xóa trực tiếp." });

            var beforeAudit = new { ct.Id, ct.IdDonThuoc, ct.IdThuoc, ct.SoLuong, ct.GhiChu };
            var thuoc = await _db.Thuocs.FirstAsync(t => t.Id == ct.IdThuoc);
            thuoc.SoLuongTon += ct.SoLuong ?? 0;

            _db.ChiTietDonThuocs.Remove(ct);
            await _db.SaveChangesAsync();
            await _audit.WriteAsync(
                ct.IdDonThuocNavigation?.IdLanKham,
                "DELETE_PRESCRIPTION_ITEM",
                "CHI_TIET_DON_THUOC",
                id,
                "Bac si xoa dong thuoc chua thanh toan.",
                beforeAudit,
                null);

            return Ok(new { message = "Xóa thuốc thành công!" });
        }

        [HttpPut("chi-tiet/{id}")]
        [Authorize]
        public async Task<IActionResult> UpdateChiTiet(long id, [FromBody] ChiTietUpdateDto dto)
        {
            var ct = await _db.ChiTietDonThuocs
                .Include(x => x.IdDonThuocNavigation)
                    .ThenInclude(d => d.IdLanKhamNavigation)
                .FirstOrDefaultAsync(x => x.Id == id);
            if (ct == null) return NotFound();

            if (IsVisitLocked(ct.IdDonThuocNavigation?.IdLanKhamNavigation?.TrangThai))
                return BadRequest(new { message = "Lần khám đã khóa, không thể cập nhật thuốc trong đơn." });

            var permissionError = await EnsureCanTouchPrescription(ct.IdDonThuocNavigation?.IdLanKhamNavigation, ct.IdDonThuocNavigation?.IdBacSi, "sua");
            if (permissionError != null)
                return permissionError;

            if (await IsMedicineDetailPaid(ct.Id))
                return BadRequest(new { message = "Thuốc đã thanh toán, không thể cập nhật trực tiếp." });

            var beforeAudit = new { ct.Id, ct.IdDonThuoc, ct.IdThuoc, ct.SoLuong, ct.Sang, ct.Trua, ct.Chieu, ct.Toi, ct.Khuya, ct.SoNgayUong, ct.GhiChu };

            // Phục hồi tồn kho cũ
            var thuoc = await _db.Thuocs.FirstAsync(t => t.Id == ct.IdThuoc);
            thuoc.SoLuongTon += ct.SoLuong ?? 0;

            // Cập nhật lại
            ct.SoLuong = dto.SoLuong;
            ct.Sang = dto.Sang;
            ct.Trua = dto.Trua;
            ct.Chieu = dto.Chieu;
            ct.Toi = dto.Toi;
            ct.Khuya = dto.Khuya;
            ct.SoNgayUong = dto.SoNgayUong;
            ct.GhiChu = dto.GhiChu;

            // Trừ tồn kho mới
            thuoc.SoLuongTon -= dto.SoLuong;

            await _db.SaveChangesAsync();
            await _audit.WriteAsync(
                ct.IdDonThuocNavigation?.IdLanKham,
                "UPDATE_PRESCRIPTION_ITEM",
                "CHI_TIET_DON_THUOC",
                ct.Id,
                duLieuTruoc: beforeAudit,
                duLieuSau: new { ct.Id, ct.IdDonThuoc, ct.IdThuoc, ct.SoLuong, ct.Sang, ct.Trua, ct.Chieu, ct.Toi, ct.Khuya, ct.SoNgayUong, ct.GhiChu });

            return Ok(new { message = "Cập nhật thuốc thành công!" });
        }

        private long? GetCurrentUserId()
        {
            var raw = User.FindFirstValue("sub")
                      ?? User.FindFirstValue(ClaimTypes.NameIdentifier)
                      ?? User.FindFirstValue("nameid");

            return long.TryParse(raw, out var id) ? id : null;
        }

        private async Task<IActionResult?> EnsureKhamBenhPermissionAsync(long actorId, string action)
        {
            if (await HasKhamBenhPermissionAsync(actorId, action))
                return null;

            return StatusCode(403, new
            {
                message = $"Bạn không có quyền {action} trên chức năng khám bệnh."
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

        private async Task<IActionResult?> EnsureCanTouchPrescription(LanKham? lanKham, long? ownerDoctorId, string action)
        {
            var actorId = GetCurrentUserId();
            if (!actorId.HasValue)
                return Unauthorized(new { message = "Phiên đăng nhập không hợp lệ." });

            var featurePermissionError = await EnsureKhamBenhPermissionAsync(actorId.Value, action);
            if (featurePermissionError != null)
                return featurePermissionError;

            var ownerId = ownerDoctorId ?? lanKham?.IdBacSi;
            if (ownerId.HasValue && ownerId.Value != actorId.Value)
            {
                if (await HasCrossDoctorEditPermission(actorId.Value))
                    return null;

                return BadRequest(new { message = "Không thể sửa đơn thuốc của bác sĩ khác nếu chưa có quyền liên khoa." });
            }

            if (!ownerId.HasValue && lanKham?.IdPhong.HasValue == true)
            {
                var doctorInRoom = await _db.BacSiPhongs
                    .AsNoTracking()
                    .AnyAsync(x => x.IdBacSi == actorId.Value && x.IdPhong == lanKham.IdPhong.Value);

                if (!doctorInRoom && !await HasCrossDoctorEditPermission(actorId.Value))
                    return BadRequest(new { message = "Bác sĩ chưa được phân quyền phòng khám này." });
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

        private async Task<List<long>> GetPaidMedicineDetailIds(List<long> detailIds)
        {
            if (detailIds.Count == 0) return new List<long>();
            var paidStatuses = new[] { "DA_THANH_TOAN", "THANH_TOAN", "PAID", "SUCCESS" };

            return await _db.ChiTietHoaDons
                .AsNoTracking()
                .Include(x => x.IdHoaDonNavigation)
                .Where(x =>
                    x.LoaiThamChieu == "THUOC" &&
                    x.IdThamChieu.HasValue &&
                    detailIds.Contains(x.IdThamChieu.Value) &&
                    x.IdHoaDonNavigation != null &&
                    paidStatuses.Contains((x.IdHoaDonNavigation.TrangThai ?? string.Empty).ToUpper()))
                .Select(x => x.IdThamChieu!.Value)
                .Distinct()
                .ToListAsync();
        }

        private async Task<bool> IsMedicineDetailPaid(long detailId)
        {
            var paidStatuses = new[] { "DA_THANH_TOAN", "THANH_TOAN", "PAID", "SUCCESS" };
            return await _db.ChiTietHoaDons
                .AsNoTracking()
                .Include(x => x.IdHoaDonNavigation)
                .AnyAsync(x =>
                    x.LoaiThamChieu == "THUOC" &&
                    x.IdThamChieu == detailId &&
                    x.IdHoaDonNavigation != null &&
                    paidStatuses.Contains((x.IdHoaDonNavigation.TrangThai ?? string.Empty).ToUpper()));
        }

        private async Task<bool> HasPaidMedicineItems(long donThuocId)
        {
            var detailIds = await _db.ChiTietDonThuocs
                .AsNoTracking()
                .Where(x => x.IdDonThuoc == donThuocId)
                .Select(x => x.Id)
                .ToListAsync();

            if (detailIds.Count == 0) return false;
            var paidIds = await GetPaidMedicineDetailIds(detailIds);
            return paidIds.Count > 0;
        }

        private async Task<GiayKetLuanKham?> GetLatestConclusionPaper(long idLanKham)
        {
            return await _db.GiayKetLuanKhams
                .AsNoTracking()
                .Where(x => x.IdLanKham == idLanKham)
                .OrderByDescending(x => x.CreatedAt)
                .FirstOrDefaultAsync();
        }

        private static object? BuildRoomDto(PhongKham? phong)
        {
            if (phong == null) return null;
            return new
            {
                phong.Id,
                phong.MaPhong,
                phong.TenPhong,
                phong.KhoaPhong
            };
        }

        private static object? BuildDoctorDto(NguoiDung? bacSi)
        {
            if (bacSi == null) return null;
            return new
            {
                bacSi.Id,
                bacSi.HoTen,
                bacSi.TenDangNhap,
                bacSi.ChucDanh,
                bacSi.KhoaPhong
            };
        }

        private static object BuildMedicineDetailDto(ChiTietDonThuoc x, IReadOnlyCollection<long> paidIds)
        {
            var paid = paidIds.Contains(x.Id);
            return new
            {
                x.Id,
                x.IdThuoc,
                MaThuoc = x.IdThuocNavigation?.Ma,
                TenThuoc = x.IdThuocNavigation?.Ten ?? "(Thuốc không tồn tại)",
                HoatChat = GetHoatChatLabel(x.IdThuocNavigation),
                LoaiThuoc = GetMedicineCategory(x.IdThuocNavigation),
                TenNhom = x.IdThuocNavigation?.IdNhomNavigation?.Ten,
                DonGia = x.IdThuocNavigation?.DonGia,
                SoLuongTon = x.IdThuocNavigation?.SoLuongTon,
                DaThanhToan = paid,
                CanEdit = !paid,
                x.SoLuong,
                x.DonVi,
                x.DungTich,
                x.Sang,
                x.Trua,
                x.Chieu,
                x.Toi,
                x.Khuya,
                x.SoNgayUong,
                x.GhiChu
            };
        }

        private static string NormalizePrescriptionNote(DonThuocCreateDto dto)
        {
            return string.IsNullOrWhiteSpace(dto.LoiDan) ? dto.GhiChu?.Trim() ?? string.Empty : dto.LoiDan.Trim();
        }

        private static bool IsPaidStatus(string? status)
        {
            var normalized = NormalizeStatus(status);
            return normalized is "DA_THANH_TOAN" or "THANH_TOAN" or "PAID" or "SUCCESS";
        }

        private static bool IsVisitConcluded(string? status)
        {
            var normalized = NormalizeStatus(status);
            return normalized is "DA_KHAM" or "DA_DONG" or "DONG" or "DA_HUY" or "HUY";
        }

        private static string GetMedicineCategory(Thuoc? thuoc)
        {
            var raw = (thuoc?.LoaiThuoc ?? thuoc?.IdNhomNavigation?.Ten ?? string.Empty).Trim();
            var normalized = NormalizeKey(raw);

            if (normalized.Contains("BHYT")) return "BHYT";
            if (normalized.Contains("GAY NGHIEN") || normalized.Contains("NGHIEN")) return "Gây nghiện";
            if (normalized.Contains("HUONG THAN") || normalized.Contains("TAM THAN")) return "Hướng thần";
            if (normalized.Contains("MUA NGOAI") || normalized.Contains("NGOAI")) return "Mua ngoài";
            if (normalized.Contains("TU PHI") || normalized.Contains("DICH VU")) return "Tự phí";

            return string.IsNullOrWhiteSpace(raw) ? "Tự phí" : raw;
        }

        private static string GetHoatChatLabel(Thuoc? thuoc)
        {
            if (thuoc == null) return string.Empty;
            var fromColumn = thuoc.HoatChat?.Trim();
            if (!string.IsNullOrWhiteSpace(fromColumn)) return fromColumn;

            var fromMeta = ExtractHoatChatFromText(thuoc.MoTa);
            return string.IsNullOrWhiteSpace(fromMeta) ? thuoc.Ten : fromMeta;
        }

        private static string? ExtractHoatChatFromText(string? value)
        {
            if (string.IsNullOrWhiteSpace(value)) return null;
            var match = Regex.Match(value, @"(?:ho[aạ]t\s*ch[aấ]t|active\s*ingredient)\s*[:=\-]\s*(.+)", RegexOptions.IgnoreCase);
            return match.Success ? match.Groups[1].Value.Trim() : null;
        }

        private static string NormalizeKey(string? value)
        {
            if (string.IsNullOrWhiteSpace(value)) return string.Empty;
            var normalized = value.Normalize(NormalizationForm.FormD);
            var builder = new StringBuilder();
            foreach (var ch in normalized)
            {
                if (CharUnicodeInfo.GetUnicodeCategory(ch) != UnicodeCategory.NonSpacingMark)
                    builder.Append(ch);
            }

            var text = builder.ToString().Normalize(NormalizationForm.FormC).ToUpperInvariant();
            text = Regex.Replace(text, @"[^A-Z0-9]+", " ").Trim();
            return text;
        }

        private static string NormalizeStatus(string? status)
        {
            return (status ?? string.Empty).Trim().ToUpperInvariant();
        }

        private static bool IsVisitLocked(string? status)
        {
            var normalized = NormalizeStatus(status);
            return normalized is
                "DA_KHAM" or
                "CHO_THANH_TOAN" or
                "DA_THANH_TOAN" or
                "DA_HUY" or
                "HUY" or
                "DONG" or
                "DA_DONG";
        }

    }
}
