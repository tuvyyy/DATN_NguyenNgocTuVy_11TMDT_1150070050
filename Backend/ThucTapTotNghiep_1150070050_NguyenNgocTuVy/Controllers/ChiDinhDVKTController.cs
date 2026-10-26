using ThucTapTotNghiep_1150070050_NguyenNgocTuVy.Data;
using ThucTapTotNghiep_1150070050_NguyenNgocTuVy.Dtos;
using ThucTapTotNghiep_1150070050_NguyenNgocTuVy.Models;
using ThucTapTotNghiep_1150070050_NguyenNgocTuVy.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace DACN.Controllers
{
    [ApiController]
    [Authorize]
    [RequireFeature("KHAM_BENH")]
    [Route("api/bacsi/dvkt")]
    public class ChiDinhDVKTController : ControllerBase
    {
        private readonly DACNDbContext _db;
        private readonly ICodeGenerator _code;
        private readonly IKhamBenhAuditService _audit;
        private const string FeatureKhamBenh = "KHAM_BENH";

        public ChiDinhDVKTController(DACNDbContext db, ICodeGenerator code, IWebHostEnvironment env, IKhamBenhAuditService audit)
        {
            _db = db;
            _code = code;
            _audit = audit;
        }

        private long GetBacSiId()
        {
            var id = GetBacSiIdFromToken();

            if (string.IsNullOrEmpty(id))
                throw new Exception("Token khong chua claim ID bac si.");

            return long.Parse(id);
        }

        private string? GetBacSiIdFromToken()
        {
            return User?.Claims?.FirstOrDefault(c =>
                c.Type == "sub" ||
                c.Type == ClaimTypes.NameIdentifier ||
                c.Type == "nameid")?.Value;
        }

        private long? TryGetBacSiId()
        {
            var id = GetBacSiIdFromToken();
            return long.TryParse(id, out var value) ? value : null;
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

        private async Task<IActionResult?> EnsureKhamBenhPermissionAsync(long actorId, string action)
        {
            if (await HasKhamBenhPermissionAsync(actorId, action))
                return null;

            return StatusCode(403, new
            {
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

        private async Task<(bool ok, IActionResult? error, LanKham? lk)> CheckLanKham(
            long idLanKham,
            long? idBacSi,
            bool requireEditable = true,
            string? action = null)
        {
            var lk = await _db.LanKhams.FirstOrDefaultAsync(x => x.Id == idLanKham);
            if (lk == null)
                return (false, NotFound($"Khong tim thay lan kham {idLanKham}."), null);

            if (requireEditable && IsVisitLocked(lk.TrangThai))
                return (false, BadRequest("Lan kham da khoa, khong the thao tac chi dinh DVKT."), null);

            if (!string.IsNullOrWhiteSpace(action))
            {
                var actorId = TryGetBacSiId();
                if (!actorId.HasValue)
                    return (false, Unauthorized(new { message = "Phien dang nhap khong hop le." }), null);

                var featurePermissionError = await EnsureKhamBenhPermissionAsync(actorId.Value, action);
                if (featurePermissionError != null)
                    return (false, featurePermissionError, null);
            }

            if (!idBacSi.HasValue)
                idBacSi = lk.IdBacSi;

            if (!idBacSi.HasValue && requireEditable)
                return (false, BadRequest("Khong xac dinh duoc bac si dang chi dinh DVKT."), null);

            if (lk.IdBacSi == null && requireEditable && idBacSi.HasValue)
            {
                lk.IdBacSi = idBacSi.Value;
                lk.UpdatedAt = DateTime.Now;
                await _db.SaveChangesAsync();
            }

            if (lk.IdBacSi != null && idBacSi.HasValue && lk.IdBacSi != idBacSi.Value)
            {
                if (!requireEditable)
                    return (true, null, lk);

                if (await HasCrossDoctorEditPermission(idBacSi.Value))
                    return (true, null, lk);

                return (false, BadRequest("Lan kham dang duoc gan cho bac si khac. Vui long mo lai ho so hoac cap quyen lien khoa truoc khi thao tac DVKT."), null);
            }

            return (true, null, lk);
        }

        [HttpPost("chidinh")]
        [Authorize]
        public async Task<IActionResult> ChiDinh(CreateChiDinhDVKTDto dto)
        {
            if (dto.SoLuong <= 0)
                return BadRequest("So luong phai >= 1.");

            var idBacSi = TryGetBacSiId() ?? dto.IdBacSi;
            var check = await CheckLanKham(dto.IdLanKham, idBacSi, action: "them");
            if (!check.ok) return check.error!;

            var dvkt = await _db.Dvkts
                .Include(x => x.DvktGia)
                .FirstOrDefaultAsync(x => x.Id == dto.IdDVKT);

            if (dvkt == null)
                return BadRequest("DVKT khong ton tai.");

            if (!dvkt.HoatDong)
                return BadRequest("DVKT dang tam ngung su dung.");

            var today = DateOnly.FromDateTime(DateTime.Now);
            var giaHieuLuc = dvkt.DvktGia
                .Where(g => g.TuNgay <= today && (g.DenNgay == null || g.DenNgay >= today))
                .OrderByDescending(g => g.TuNgay)
                .FirstOrDefault();

            if (giaHieuLuc == null)
                return BadRequest("DVKT nay khong co gia dang hieu luc.");

            var duplicateToday = await FindDuplicateToday(dto.IdLanKham, check.lk!, (int)dto.IdDVKT);
            if (duplicateToday != null)
            {
                return BadRequest(
                    $"Benh nhan da co DVKT nay trong ngay tai phong {duplicateToday.PhongKham ?? "khac"} (chi dinh #{duplicateToday.Id}). Khong tao trung."
                );
            }

            var hoaDonCls = await GetLatestOpenDvktInvoice(dto.IdLanKham);
            if (IsPendingElectronicPayment(hoaDonCls))
            {
                return Conflict(new
                {
                    state = "PAYMENT_TRANSACTION_PENDING",
                    message = "Phiếu DVKT đang có giao dịch QR/VNPay chờ kết quả. Không được thêm chỉ định hoặc làm thay đổi số tiền trong lúc giao dịch đang xử lý."
                });
            }

            var cd = new ChiDinhDvkt
            {
                IdLanKham = dto.IdLanKham,
                IdDvkt = (int)dto.IdDVKT,
                SoLuong = dto.SoLuong,
                GhiChu = dto.GhiChu,
                TrangThai = DvktTrangThai.Pending,
                CreatedAt = DateTime.Now
            };

            _db.ChiDinhDvkts.Add(cd);
            await _db.SaveChangesAsync();

            if (hoaDonCls == null)
            {
                hoaDonCls = new HoaDon
                {
                    MaHd = _code.GenMa("HDCLS"),
                    IdBenhNhan = check.lk!.IdBenhNhan,
                    IdLanKham = dto.IdLanKham,
                    LoaiHoaDon = "DVKT",
                    HinhThucTt = "TIEN_MAT",
                    TrangThai = "CHUA_THANH_TOAN",
                    NgayTao = DateTime.Now,
                    TongTienTruoc = 0,
                    TongTien = 0
                };

                _db.HoaDons.Add(hoaDonCls);
                await _db.SaveChangesAsync();
            }

            var donGia = giaHieuLuc.DonGia;
            hoaDonCls.ChiTietHoaDons.Add(new ChiTietHoaDon
            {
                IdHoaDon = hoaDonCls.Id,
                LoaiThamChieu = "DVKT",
                IdThamChieu = dvkt.Id,
                MoTa = $"CLS: {dvkt.TenDvkt}",
                SoLuong = cd.SoLuong,
                DonGia = donGia,
                ThanhTien = donGia * cd.SoLuong
            });

            RecalculateInvoice(hoaDonCls);
            await _db.SaveChangesAsync();
            await _audit.WriteAsync(
                dto.IdLanKham,
                "CREATE_DVKT_ORDER",
                "CHI_DINH_DVKT",
                cd.Id,
                duLieuSau: new
                {
                    cd.Id,
                    cd.IdDvkt,
                    dvkt.MaDvkt,
                    dvkt.TenDvkt,
                    cd.SoLuong,
                    cd.GhiChu,
                    cd.TrangThai,
                    HoaDonId = hoaDonCls.Id
                });

            return Ok(new
            {
                success = true,
                message = "Chi dinh DVKT thanh cong.",
                data = new
                {
                    id = cd.Id,
                    idLanKham = cd.IdLanKham,
                    idDvkt = cd.IdDvkt,
                    soLuong = cd.SoLuong,
                    ghiChu = cd.GhiChu,
                    trangThai = cd.TrangThai,
                    createdAt = cd.CreatedAt,
                    thoiGianChiDinh = cd.CreatedAt,
                    donGia = giaHieuLuc.DonGia,
                    tenDvkt = dvkt.TenDvkt
                }
            });
        }

        [HttpGet("lankham/{idLanKham}")]
        public async Task<IActionResult> GetByLanKham(long idLanKham)
        {
            var idBacSi = TryGetBacSiId();
            var check = await CheckLanKham(idLanKham, idBacSi, requireEditable: false);
            if (!check.ok) return check.error!;

            var orders = await LoadClinicalOrders(_db.ChiDinhDvkts.Where(x => x.IdLanKham == idLanKham));
            var data = await BuildClinicalOrderRows(orders, idLanKham);

            return Ok(data);
        }

        [HttpGet("lankham/{idLanKham}/tonghop")]
        public async Task<IActionResult> GetTongHopLanKham(long idLanKham)
        {
            var idBacSi = TryGetBacSiId();
            var check = await CheckLanKham(idLanKham, idBacSi, requireEditable: false);
            if (!check.ok) return check.error!;

            var lk = await _db.LanKhams
                .AsNoTracking()
                .Include(x => x.IdHoSoNavigation)
                .FirstOrDefaultAsync(x => x.Id == idLanKham);

            if (lk == null)
                return NotFound("Khong tim thay lan kham.");

            var currentOrders = await LoadClinicalOrders(_db.ChiDinhDvkts.Where(x => x.IdLanKham == idLanKham));

            var start = DateTime.Today;
            var end = start.AddDays(1);
            var episodeOrders = await LoadClinicalOrders(_db.ChiDinhDvkts.Where(x =>
                x.IdLanKham == idLanKham ||
                (lk.IdHoSo.HasValue && x.IdLanKhamNavigation.IdHoSo == lk.IdHoSo) ||
                (lk.IdBenhNhan.HasValue &&
                 x.IdLanKhamNavigation.IdBenhNhan == lk.IdBenhNhan &&
                 x.CreatedAt.HasValue &&
                 x.CreatedAt.Value >= start &&
                 x.CreatedAt.Value < end)));

            return Ok(new
            {
                hienTai = await BuildClinicalOrderRows(currentOrders, idLanKham),
                tongHop = await BuildClinicalOrderRows(episodeOrders, idLanKham)
            });
        }

        [HttpPatch("{id}/doctor-read")]
        [Authorize]
        public async Task<IActionResult> DoctorReadResult(long id)
        {
            var cd = await _db.ChiDinhDvkts
                .Include(x => x.IdLanKhamNavigation)
                .Include(x => x.DvktKetQuas)
                .FirstOrDefaultAsync(x => x.Id == id);

            if (cd == null)
                return NotFound("Khong tim thay chi dinh.");

            var idBacSi = TryGetBacSiId();
            var check = await CheckLanKham(cd.IdLanKham, idBacSi, requireEditable: false, action: "sua");
            if (!check.ok) return check.error!;

            var hasResult = cd.DvktKetQuas.Any() ||
                            cd.TrangThai == DvktTrangThai.Done ||
                            cd.TrangThai == DvktTrangThai.Sent ||
                            cd.TrangThai == DvktTrangThai.Paid ||
                            cd.HoanThanhLuc.HasValue;

            if (!hasResult)
                return BadRequest("Chi dinh chua co ket qua de xac nhan da doc.");

            cd.BacSiDaDocKetQua = true;
            cd.BacSiDocKetQuaLuc = DateTime.Now;
            cd.IdBacSiDocKetQua = idBacSi ?? cd.IdLanKhamNavigation.IdBacSi;

            _db.DvktThucHienLogs.Add(new DvktThucHienLog
            {
                IdChiDinhDvkt = cd.Id,
                IdNguoiThucHien = cd.IdBacSiDocKetQua ?? 0,
                Action = "bac_si_doc_ket_qua",
                Note = "Bac si xac nhan da doc ket qua CLS/DVKT.",
                CreatedAt = DateTime.Now
            });

            await _db.SaveChangesAsync();
            await _audit.WriteAsync(
                cd.IdLanKham,
                "READ_CLS_RESULT",
                "CHI_DINH_DVKT",
                cd.Id,
                duLieuSau: new { cd.Id, cd.BacSiDaDocKetQua, cd.BacSiDocKetQuaLuc, cd.IdBacSiDocKetQua });

            return Ok(new
            {
                success = true,
                message = "Da xac nhan bac si da doc ket qua.",
                data = new
                {
                    id = cd.Id,
                    bacSiDaDocKetQua = cd.BacSiDaDocKetQua,
                    bacSiDocKetQuaLuc = cd.BacSiDocKetQuaLuc
                }
            });
        }

        [HttpPut("{id}")]
        [Authorize]
        public async Task<IActionResult> Update(long id, UpdateChiDinhDVKTDto dto)
        {
            if (dto.SoLuong <= 0)
                return BadRequest("So luong phai >= 1.");

            var cd = await _db.ChiDinhDvkts
                .Include(x => x.IdLanKhamNavigation)
                .FirstOrDefaultAsync(x => x.Id == id);

            if (cd == null)
                return NotFound("Khong tim thay chi dinh.");

            var beforeAudit = new { cd.Id, cd.IdLanKham, cd.IdDvkt, cd.SoLuong, cd.GhiChu, cd.TrangThai };

            var idBacSi = TryGetBacSiId();
            var check = await CheckLanKham(cd.IdLanKham, idBacSi, action: "sua");
            if (!check.ok) return check.error!;

            if (cd.TrangThai != DvktTrangThai.Pending)
                return BadRequest("Chi dinh da duoc xu ly, khong the cap nhat.");

            var hoaDon = await GetOpenDvktInvoiceForOrder(cd.IdLanKham, cd.IdDvkt);
            if (IsPendingElectronicPayment(hoaDon))
            {
                return Conflict(new
                {
                    state = "PAYMENT_TRANSACTION_PENDING",
                    message = "Phiếu DVKT đang có giao dịch QR/VNPay chờ kết quả. Không được sửa số lượng hoặc nội dung chỉ định."
                });
            }
            if (hoaDon == null && await HasPaidDvktDetail(cd.IdLanKham, cd.IdDvkt))
                return BadRequest("Chi dinh da nam trong hoa don da thanh toan, khong the cap nhat.");

            cd.SoLuong = dto.SoLuong;
            cd.GhiChu = dto.GhiChu;

            if (hoaDon != null)
            {
                var detail = hoaDon.ChiTietHoaDons.FirstOrDefault(x =>
                    x.LoaiThamChieu == "DVKT" &&
                    x.IdThamChieu == cd.IdDvkt);

                if (detail != null)
                {
                    detail.SoLuong = dto.SoLuong;
                    detail.ThanhTien = (detail.DonGia ?? 0m) * dto.SoLuong;
                    RecalculateInvoice(hoaDon);
                }
            }

            await _db.SaveChangesAsync();
            await _audit.WriteAsync(
                cd.IdLanKham,
                "UPDATE_DVKT_ORDER",
                "CHI_DINH_DVKT",
                cd.Id,
                duLieuTruoc: beforeAudit,
                duLieuSau: new { cd.Id, cd.IdLanKham, cd.IdDvkt, cd.SoLuong, cd.GhiChu, cd.TrangThai });
            return Ok(new { success = true, message = "Da cap nhat chi dinh.", data = cd });
        }

        [HttpDelete("{id}")]
        [Authorize]
        public async Task<IActionResult> Cancel(long id)
        {
            var cd = await _db.ChiDinhDvkts
                .Include(x => x.IdLanKhamNavigation)
                .Include(x => x.DvktKetQuas)
                .FirstOrDefaultAsync(x => x.Id == id);

            if (cd == null)
                return NotFound("Khong tim thay chi dinh.");

            var beforeAudit = new { cd.Id, cd.IdLanKham, cd.IdDvkt, cd.SoLuong, cd.GhiChu, cd.TrangThai };

            var idBacSi = TryGetBacSiId();
            var check = await CheckLanKham(cd.IdLanKham, idBacSi, action: "xoa");
            if (!check.ok) return check.error!;

            var hoaDon = await GetOpenDvktInvoiceForOrder(cd.IdLanKham, cd.IdDvkt);
            if (IsPendingElectronicPayment(hoaDon))
            {
                return Conflict(new
                {
                    state = "PAYMENT_TRANSACTION_PENDING",
                    message = "Phiếu DVKT đang có giao dịch QR/VNPay chờ kết quả. Không được hủy chỉ định trong lúc giao dịch đang xử lý."
                });
            }
            if (hoaDon == null && await HasPaidDvktDetail(cd.IdLanKham, cd.IdDvkt))
                return BadRequest("Chi dinh da nam trong hoa don da thanh toan, khong the huy.");

            if (cd.TrangThai != DvktTrangThai.Pending)
                return BadRequest("Khong the huy chi dinh da gui thuc hien/da co ket qua.");

            if (cd.NhanLuc != null || cd.HoanThanhLuc != null || cd.DvktKetQuas.Any())
                return BadRequest("Chi dinh da duoc tiep nhan hoac co ket qua, khong the huy thang.");

            cd.TrangThai = DvktTrangThai.Canceled;

            if (hoaDon != null)
            {
                var details = hoaDon.ChiTietHoaDons
                    .Where(x => x.LoaiThamChieu == "DVKT" && x.IdThamChieu == cd.IdDvkt)
                    .ToList();

                if (details.Count > 0)
                {
                    _db.ChiTietHoaDons.RemoveRange(details);
                    foreach (var detail in details)
                        hoaDon.ChiTietHoaDons.Remove(detail);
                    RecalculateInvoice(hoaDon);
                }
            }

            await _db.SaveChangesAsync();
            await _audit.WriteAsync(
                cd.IdLanKham,
                "CANCEL_DVKT_ORDER",
                "CHI_DINH_DVKT",
                cd.Id,
                "Bac si huy chi dinh DVKT.",
                beforeAudit,
                new { cd.Id, cd.IdLanKham, cd.IdDvkt, cd.TrangThai });
            return Ok("Da huy chi dinh.");
        }

        [HttpGet("full")]
        public async Task<IActionResult> GetAllFull()
        {
            var today = DateOnly.FromDateTime(DateTime.Now);

            var services = await _db.Dvkts
                .Include(d => d.DvktGia)
                .Include(d => d.DvktPhongs)
                    .ThenInclude(p => p.IdPhongNavigation)
                .Where(d => d.HoatDong)
                .OrderBy(d => d.TenDvkt)
                .ToListAsync();

            var data = services.Select(d =>
            {
                var price = d.DvktGia
                    .Where(g => g.TuNgay <= today && (g.DenNgay == null || g.DenNgay >= today))
                    .OrderByDescending(g => g.TuNgay)
                    .FirstOrDefault();

                var phongs = d.DvktPhongs
                    .Where(p => p.IdPhongNavigation != null)
                    .Select(p => new
                    {
                        idPhong = p.IdPhongNavigation!.Id,
                        tenPhong = p.IdPhongNavigation.TenPhong,
                        tang = p.IdPhongNavigation.Tang
                    })
                    .Distinct()
                    .ToList();

                return new
                {
                    id = d.Id,
                    maDvkt = d.MaDvkt,
                    tenDvkt = d.TenDvkt,
                    loai = d.IdNhom,
                    donGia = price?.DonGia ?? 0m,
                    phong = phongs.FirstOrDefault(),
                    phongs
                };
            }).ToList();

            return Ok(data);
        }

        private async Task<List<ChiDinhDvkt>> LoadClinicalOrders(IQueryable<ChiDinhDvkt> query)
        {
            return await query
                .AsNoTracking()
                .Include(x => x.IdLanKhamNavigation)
                    .ThenInclude(x => x.IdPhongNavigation)
                .Include(x => x.IdLanKhamNavigation)
                    .ThenInclude(x => x.IdHoSoNavigation)
                .Include(x => x.IdDvktNavigation)
                    .ThenInclude(x => x.IdNhomNavigation)
                .Include(x => x.IdDvktNavigation)
                    .ThenInclude(x => x.DvktPhongs)
                        .ThenInclude(x => x.IdPhongNavigation)
                .Include(x => x.DvktKetQuas)
                    .ThenInclude(x => x.DvktKetQuaChiTiets)
                .OrderByDescending(x => x.CreatedAt)
                .ThenByDescending(x => x.Id)
                .ToListAsync();
        }

        private async Task<List<object>> BuildClinicalOrderRows(List<ChiDinhDvkt> orders, long? currentLanKhamId = null)
        {
            if (orders.Count == 0)
                return new List<object>();

            var visitIds = orders.Select(x => x.IdLanKham).Distinct().ToList();
            var serviceIds = orders.Select(x => (long)x.IdDvkt).Distinct().ToList();

            var invoiceDetails = await _db.ChiTietHoaDons
                .AsNoTracking()
                .Include(x => x.IdHoaDonNavigation)
                .Where(x =>
                    x.IdHoaDonNavigation != null &&
                    x.IdHoaDonNavigation.IdLanKham.HasValue &&
                    visitIds.Contains(x.IdHoaDonNavigation.IdLanKham.Value) &&
                    x.IdHoaDonNavigation.LoaiHoaDon == "DVKT" &&
                    x.LoaiThamChieu == "DVKT" &&
                    x.IdThamChieu.HasValue &&
                    serviceIds.Contains(x.IdThamChieu.Value))
                .ToListAsync();

            return orders.Select(order =>
            {
                var latestResult = order.DvktKetQuas
                    .OrderByDescending(x => x.ThoiGianThucHien ?? DateTime.MinValue)
                    .ThenByDescending(x => x.Id)
                    .FirstOrDefault();

                var details = invoiceDetails
                    .Where(x => x.IdHoaDonNavigation?.IdLanKham == order.IdLanKham && x.IdThamChieu == order.IdDvkt)
                    .ToList();

                var paid = details.Any(x => IsPaidInvoice(x.IdHoaDonNavigation));
                var openInvoice = details.Any(x => IsOpenInvoice(x.IdHoaDonNavigation));
                var hasResult = latestResult != null ||
                                order.TrangThai == DvktTrangThai.Done ||
                                order.TrangThai == DvktTrangThai.Sent ||
                                order.TrangThai == DvktTrangThai.Paid ||
                                order.HoanThanhLuc.HasValue;

                var statusLabel = DvktDisplayStatus(order, latestResult);
                var firstRoom = order.IdDvktNavigation.DvktPhongs
                    .Select(x => x.IdPhongNavigation)
                    .FirstOrDefault(x => x != null);

                return (object)new
                {
                    id = order.Id,
                    idLanKham = order.IdLanKham,
                    idHoSo = order.IdLanKhamNavigation.IdHoSo,
                    maHoSo = order.IdLanKhamNavigation.IdHoSoNavigation?.MaHs,
                    idDvkt = order.IdDvkt,
                    maDvkt = order.IdDvktNavigation.MaDvkt,
                    tenDvkt = order.IdDvktNavigation.TenDvkt,
                    nhom = order.IdDvktNavigation.IdNhomNavigation?.TenNhom,
                    loaiKetQua = ClassifyClinicalResultType(order.IdDvktNavigation),
                    phongChiDinh = order.IdLanKhamNavigation.IdPhongNavigation?.TenPhong,
                    phongThucHien = firstRoom?.TenPhong,
                    tang = firstRoom?.Tang,
                    soLuong = order.SoLuong,
                    trangThai = order.TrangThai,
                    trangThaiHienThi = statusLabel,
                    ghiChu = order.GhiChu,
                    createdAt = order.CreatedAt,
                    thoiGianChiDinh = order.CreatedAt,
                    ketQuaId = latestResult?.Id,
                    ketQuaTong = latestResult?.KetQuaText,
                    trangThaiKetQua = latestResult?.TrangThai,
                    thoiGianThucHien = latestResult?.ThoiGianThucHien ?? order.HoanThanhLuc,
                    nguoiThucHien = latestResult?.NguoiThucHien,
                    hasResult,
                    canPreview = hasResult,
                    daThanhToan = paid,
                    coHoaDonMo = openInvoice,
                    bacSiDaDocKetQua = order.BacSiDaDocKetQua,
                    bacSiDocKetQuaLuc = order.BacSiDocKetQuaLuc,
                    canEdit = order.TrangThai == DvktTrangThai.Pending && !paid && !hasResult,
                    canDelete = order.TrangThai == DvktTrangThai.Pending && !paid && !hasResult,
                    canMarkRead = hasResult && !order.BacSiDaDocKetQua,
                    source = currentLanKhamId.HasValue && order.IdLanKham != currentLanKhamId.Value ? "summary" : "current"
                };
            }).ToList();
        }

        private static string DvktDisplayStatus(ChiDinhDvkt order, DvktKetQua? latestResult)
        {
            var status = NormalizeStatus(order.TrangThai);
            var resultStatus = NormalizeStatus(latestResult?.TrangThai);

            if (status is "CANCELED" or "CANCELLED" or "DA_HUY" or "HUY")
                return "Đã hủy";
            if (status is "SENT" || resultStatus is "SENT" or "APPROVED" or "DA_GUI")
                return "Đã gửi";
            if (latestResult != null || status is "DONE" or "PAID" or "DA_HOAN_THANH" or "DA_THANH_TOAN")
                return "Đã có kết quả";
            if (status is "PROCESSING" or "DANG_THUC_HIEN")
                return "Đang thực hiện";
            if (order.NhanLuc.HasValue)
                return "Đã tiếp nhận";

            return "Chờ thực hiện";
        }

        private static string ClassifyClinicalResultType(Dvkt dvkt)
        {
            var text = $"{dvkt.MaDvkt} {dvkt.TenDvkt} {dvkt.IdNhomNavigation?.TenNhom}".ToUpperInvariant();
            if (text.Contains("CDHA") || text.Contains("SIÊU ÂM") || text.Contains("SIEU AM") || text.Contains("MRI") || text.Contains("CT "))
                return "CĐHA";
            if (text.Contains("TDCN") || text.Contains("ĐIỆN TIM") || text.Contains("DIEN TIM") || text.Contains("ECG"))
                return "TDCN";
            if (text.Contains("NỘI SOI") || text.Contains("NOI SOI"))
                return "Nội soi";
            if (text.Contains("SINH THIẾT") || text.Contains("SINH THIET"))
                return "Sinh thiết";
            return "Xét nghiệm";
        }

        private static bool IsVisitLocked(string? status)
        {
            var normalized = (status ?? string.Empty).Trim().ToUpperInvariant();
            return normalized is
                "DA_KHAM" or
                "CHO_THANH_TOAN" or
                "DA_THANH_TOAN" or
                "DA_HUY" or
                "HUY" or
                "DONG" or
                "DA_DONG";
        }

        private static string NormalizeStatus(string? status)
            => (status ?? string.Empty).Trim().ToUpperInvariant();

        private static bool IsPaidInvoice(HoaDon? invoice)
        {
            var status = (invoice?.TrangThai ?? string.Empty).Trim().ToUpperInvariant();
            return status is "DA_THANH_TOAN" or "PAID" or "THANH_TOAN";
        }

        private static bool IsCanceledInvoice(HoaDon? invoice)
        {
            var status = (invoice?.TrangThai ?? string.Empty).Trim().ToUpperInvariant();
            return status is "DA_HUY" or "HUY" or "CANCELED" or "CANCELLED";
        }

        private static bool IsPendingElectronicPayment(HoaDon? invoice)
            => string.Equals(
                invoice?.TrangThai?.Trim(),
                "DANG_THANH_TOAN",
                StringComparison.OrdinalIgnoreCase);

        private static bool IsOpenInvoice(HoaDon? invoice)
            => invoice != null && !IsPaidInvoice(invoice) && !IsCanceledInvoice(invoice);

        private async Task<HoaDon?> GetLatestOpenDvktInvoice(long idLanKham)
        {
            var invoices = await _db.HoaDons
                .Include(h => h.ChiTietHoaDons)
                .Where(h => h.IdLanKham == idLanKham && h.LoaiHoaDon == "DVKT")
                .OrderByDescending(h => h.NgayTao)
                .ThenByDescending(h => h.Id)
                .ToListAsync();

            return invoices.FirstOrDefault(IsOpenInvoice);
        }

        private async Task<HoaDon?> GetOpenDvktInvoiceForOrder(long idLanKham, int idDvkt)
        {
            var invoices = await _db.HoaDons
                .Include(h => h.ChiTietHoaDons)
                .Where(h => h.IdLanKham == idLanKham && h.LoaiHoaDon == "DVKT")
                .OrderByDescending(h => h.NgayTao)
                .ThenByDescending(h => h.Id)
                .ToListAsync();

            return invoices.FirstOrDefault(h =>
                IsOpenInvoice(h) &&
                h.ChiTietHoaDons.Any(x => x.LoaiThamChieu == "DVKT" && x.IdThamChieu == idDvkt));
        }

        private async Task<bool> HasPaidDvktDetail(long idLanKham, int idDvkt)
        {
            var invoices = await _db.HoaDons
                .Include(h => h.ChiTietHoaDons)
                .Where(h => h.IdLanKham == idLanKham && h.LoaiHoaDon == "DVKT")
                .ToListAsync();

            return invoices.Any(h =>
                IsPaidInvoice(h) &&
                h.ChiTietHoaDons.Any(x => x.LoaiThamChieu == "DVKT" && x.IdThamChieu == idDvkt));
        }

        private static void RecalculateInvoice(HoaDon invoice)
        {
            var subtotal = invoice.ChiTietHoaDons.Sum(x => x.ThanhTien ?? 0m);
            invoice.TongTienTruoc = subtotal;
            invoice.TongTien = subtotal - (invoice.GiamGia ?? 0m) + (invoice.ThueVat ?? 0m);
        }

        private async Task<DuplicateDvktInfo?> FindDuplicateToday(long currentLanKhamId, LanKham lanKham, int idDvkt)
        {
            if (!lanKham.IdBenhNhan.HasValue)
                return null;

            var start = DateTime.Today;
            var end = start.AddDays(1);

            return await _db.ChiDinhDvkts
                .Include(x => x.IdLanKhamNavigation)
                    .ThenInclude(lk => lk.IdPhongNavigation)
                .Where(x =>
                    x.IdDvkt == idDvkt &&
                    x.TrangThai != DvktTrangThai.Canceled &&
                    x.TrangThai != "canceled" &&
                    x.TrangThai != "DA_HUY" &&
                    x.TrangThai != "HUY" &&
                    x.IdLanKhamNavigation.IdBenhNhan == lanKham.IdBenhNhan &&
                    x.CreatedAt.HasValue &&
                    x.CreatedAt.Value >= start &&
                    x.CreatedAt.Value < end)
                .Select(x => new DuplicateDvktInfo(
                    x.Id,
                    x.IdLanKham,
                    x.IdLanKhamNavigation.IdPhongNavigation != null
                        ? x.IdLanKhamNavigation.IdPhongNavigation.TenPhong
                        : null
                ))
                .FirstOrDefaultAsync();
        }

        private sealed record DuplicateDvktInfo(long Id, long IdLanKham, string? PhongKham);
    }
}
