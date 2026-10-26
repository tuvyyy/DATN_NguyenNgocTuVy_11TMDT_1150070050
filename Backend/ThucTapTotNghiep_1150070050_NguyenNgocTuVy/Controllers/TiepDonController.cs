using System.Data;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using ThucTapTotNghiep_1150070050_NguyenNgocTuVy.Data;
using ThucTapTotNghiep_1150070050_NguyenNgocTuVy.Dtos;
using ThucTapTotNghiep_1150070050_NguyenNgocTuVy.Models;
using ThucTapTotNghiep_1150070050_NguyenNgocTuVy.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;

namespace ThucTapTotNghiep_1150070050_NguyenNgocTuVy.Controllers;

[Authorize]
[ApiController]
[Route("api/reception")]
public class TiepDonController : ControllerBase
{
    private const string FeatureCode = "TIEP_DON";
    private static readonly HashSet<string> UnfinishedStatuses = new(StringComparer.OrdinalIgnoreCase)
    {
        "MOI",
        "CHUA_CHI_DINH",
        "CHO_CHI_DINH",
        "CHI_DINH"
    };

    private static readonly HashSet<string> PendingTodayStatuses = new(StringComparer.OrdinalIgnoreCase)
    {
        "MOI",
        "CHUA_CHI_DINH",
        "CHO_CHI_DINH"
    };

    private readonly DACNDbContext _db;
    private readonly ICodeGenerator _code;
    private readonly IHoSoTrangThaiService _hoSoTrangThai;
    private readonly IConfiguration _configuration;

    public TiepDonController(
        DACNDbContext db,
        ICodeGenerator code,
        IHoSoTrangThaiService hoSoTrangThai,
        IConfiguration configuration)
    {
        _db = db;
        _code = code;
        _hoSoTrangThai = hoSoTrangThai;
        _configuration = configuration;
    }

    private IActionResult? RejectLegacyMutation()
    {
        if (_configuration.GetValue("Reception:AllowLegacyMutations", false))
            return null;

        return StatusCode(StatusCodes.Status410Gone, new
        {
            state = "LEGACY_RECEPTION_MUTATION_DISABLED",
            message = "API tiếp đón cũ đã ngừng cho phép ghi dữ liệu vì có thể bỏ qua khu/quầy, kiểm soát tài chính và state machine. Vui lòng sử dụng API /api/tiepdon/v2."
        });
    }

    [HttpGet("list-today")]
    public async Task<IActionResult> GetTodayReceptions([FromQuery] ReceptionListQueryDto query)
    {
        var denied = await EnsurePermissionAsync("xem");
        if (denied != null) return denied;

        if (!query.Date.HasValue && !query.FromDate.HasValue && !query.ToDate.HasValue)
        {
            query.Date = DateTime.Today;
        }

        var baseQuery = BuildReceptionQuery(query, cancelledOnly: false);
        var total = await baseQuery.CountAsync();
        var (page, pageSize) = NormalizePaging(query.Page, query.PageSize);
        var totalPages = total == 0 ? 1 : (int)Math.Ceiling(total / (double)pageSize);
        page = Math.Min(page, totalPages);

        var sortedQuery = ApplySorting(baseQuery, query.SortBy, query.SortDir);
        var items = await sortedQuery
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(h => new
            {
                h.Id,
                h.MaHs,
                h.TrangThai,
                h.NgayTao,
                h.UpdatedAt,
                IdBenhNhan = h.IdBenhNhan,
                BenhNhan = new
                {
                    IdBenhNhan = h.IdBenhNhanNavigation != null ? h.IdBenhNhanNavigation.Id : 0,
                    MaBn = h.IdBenhNhanNavigation != null ? h.IdBenhNhanNavigation.MaBn : null,
                    HoTen = h.IdBenhNhanNavigation != null ? h.IdBenhNhanNavigation.HoTen : null,
                    GioiTinh = h.IdBenhNhanNavigation != null ? h.IdBenhNhanNavigation.GioiTinh : null,
                    NgaySinh = h.IdBenhNhanNavigation != null ? h.IdBenhNhanNavigation.NgaySinh : null,
                    SoDienThoai = h.IdBenhNhanNavigation != null ? h.IdBenhNhanNavigation.SoDienThoai : null,
                    Cccd = h.IdBenhNhanNavigation != null ? h.IdBenhNhanNavigation.Cccd : null
                }
            })
            .ToListAsync();

        return Ok(new
        {
            items,
            total,
            page,
            pageSize,
            totalPages
        });
    }

    [HttpPost("create-full")]
    public async Task<IActionResult> CreateFullReception([FromBody] FullReceptionRequest req)
    {
        var legacyBlocked = RejectLegacyMutation();
        if (legacyBlocked != null) return legacyBlocked;

        var denied = await EnsurePermissionAsync("them");
        if (denied != null) return denied;

        var actorId = ResolveActorId(req.IdNguoiTao);
        var now = DateTime.Now;
        var today = now.Date;

        await using var tx = await _db.Database.BeginTransactionAsync(IsolationLevel.Serializable);

        var hs = await _db.HoSoBenhAns
            .FirstOrDefaultAsync(h => h.IdBenhNhan == req.IdBenhNhan
                                   && h.NgayTao.HasValue
                                   && h.NgayTao.Value.Date == today);

        if (hs == null)
        {
            hs = new HoSoBenhAn
            {
                IdBenhNhan = req.IdBenhNhan,
                MaHs = _code.GenMa("HS"),
                NgayTao = now,
                IdNguoiTao = actorId,
                TrangThai = null
            };
            _db.HoSoBenhAns.Add(hs);
            await _db.SaveChangesAsync();

            var transition = _hoSoTrangThai.ApplyTransition(
                hs,
                "MOI",
                actorId,
                "CREATE_FULL_RECEPTION",
                "Táº¡o tiáº¿p Ä‘Ă³n Ä‘áº§y Ä‘á»§ (walk-in)."
            );
            if (!transition.Success)
            {
                await tx.RollbackAsync();
                return BadRequest(new { message = transition.ErrorMessage });
            }
        }

        var lk = new LanKham
        {
            IdHoSo = hs.Id,
            IdBenhNhan = req.IdBenhNhan,
            IdPhong = req.IdPhong,
            TrangThai = "CHO_KHAM",
            ThoiGianBatDau = now,
            CreatedAt = now,
            UpdatedAt = now,
            IdTiepDon = actorId
        };

        _db.LanKhams.Add(lk);
        await _db.SaveChangesAsync();

        var sh = new SinhHieu
        {
            IdLanKham = lk.Id,
            NhietDo = req.NhietDo,
            HuyetApTamThu = req.HuyetApTamThu,
            HuyetApTamTruong = req.HuyetApTamTruong,
            NhipTim = req.NhipTim,
            NhipTho = req.NhipTho,
            CanNang = req.CanNang,
            ChieuCao = req.ChieuCao,
            SpO2 = req.SpO2,
            ThoiGianDo = now
        };
        _db.SinhHieus.Add(sh);
        await _db.SaveChangesAsync();

        lk.IdSinhHieu = sh.Id;
        await _db.SaveChangesAsync();
        await tx.CommitAsync();

        return Ok(new
        {
            message = "Tiáº¿p Ä‘Ă³n Ä‘áº§y Ä‘á»§ thĂ nh cĂ´ng",
            hoSo = new { hs.Id, hs.MaHs, hs.TrangThai },
            lanKham = new { lk.Id, lk.IdPhong, lk.TrangThai },
            sinhHieu = new { sh.Id, sh.NhietDo, sh.HuyetApTamThu, sh.HuyetApTamTruong }
        });
    }

    [HttpGet("patients/check")]
    public async Task<IActionResult> CheckPatient([FromQuery] PatientLookupRequest req)
    {
        var denied = await EnsurePermissionAsync("xem");
        if (denied != null) return denied;

        if (string.IsNullOrWhiteSpace(req.SoDienThoai) && string.IsNullOrWhiteSpace(req.CCCD))
            return BadRequest("Cáº§n cung cáº¥p sá»‘ Ä‘iá»‡n thoáº¡i hoáº·c CCCD.");

        var q = _db.BenhNhans.AsQueryable();

        if (!string.IsNullOrWhiteSpace(req.SoDienThoai))
            q = q.Where(x => x.SoDienThoai == req.SoDienThoai);
        if (!string.IsNullOrWhiteSpace(req.CCCD))
            q = q.Where(x => x.Cccd == req.CCCD);

        var found = await q.Select(x => new
        {
            x.Id,
            x.MaBn,
            x.HoTen,
            x.NgaySinh,
            x.GioiTinh,
            x.Cccd,
            x.SoDienThoai,
            x.Email,
            x.NgheNghiep,
            x.DiaChiDuong,
            x.DiaChiXa,
            x.DiaChiHuyen,
            x.DiaChiTinh,
            x.QuocTich,
            x.DanToc,
            x.QuocGia
        }).FirstOrDefaultAsync();

        var today = DateTime.Today;
        object? todayRecord = null;

        if (found != null)
        {
            var rec = await _db.HoSoBenhAns
                .Where(h => h.IdBenhNhan == found.Id && h.NgayTao.HasValue && h.NgayTao.Value.Date == today)
                .OrderByDescending(h => h.NgayTao)
                .Select(h => new
                {
                    h.Id,
                    h.MaHs,
                    TrangThai = h.TrangThai
                })
                .FirstOrDefaultAsync();

            if (rec != null)
            {
                todayRecord = new
                {
                    exists = true,
                    rec.Id,
                    rec.MaHs,
                    rec.TrangThai
                };
            }
        }

        return Ok(new
        {
            exists = found != null,
            patient = found,
            todayRecord
        });
    }

    [HttpPost("patients")]
    public async Task<IActionResult> CreatePatient([FromBody] PatientCreateRequest req)
    {
        var legacyBlocked = RejectLegacyMutation();
        if (legacyBlocked != null) return legacyBlocked;

        var denied = await EnsurePermissionAsync("them");
        if (denied != null) return denied;

        if (string.IsNullOrWhiteSpace(req.Ho_ten))
            return BadRequest("Thiáº¿u há» tĂªn bá»‡nh nhĂ¢n.");

        if (string.IsNullOrWhiteSpace(req.CCCD) && string.IsNullOrWhiteSpace(req.So_dien_thoai))
            return BadRequest("Cáº§n nháº­p Ă­t nháº¥t CCCD hoáº·c sá»‘ Ä‘iá»‡n thoáº¡i.");

        var hasCccd = !string.IsNullOrWhiteSpace(req.CCCD);
        var hasPhone = !string.IsNullOrWhiteSpace(req.So_dien_thoai);

        BenhNhan? existing;
        if (hasCccd && hasPhone)
        {
            existing = await _db.BenhNhans
                .FirstOrDefaultAsync(x => x.Cccd == req.CCCD || x.SoDienThoai == req.So_dien_thoai);
        }
        else if (hasCccd)
        {
            existing = await _db.BenhNhans
                .FirstOrDefaultAsync(x => x.Cccd == req.CCCD);
        }
        else
        {
            existing = await _db.BenhNhans
                .FirstOrDefaultAsync(x => x.SoDienThoai == req.So_dien_thoai);
        }

        var today = DateTime.Today;

        if (existing != null)
        {
            var latestPreviousRecord = await FindLatestUnfinishedPreviousRecordAsync(existing.Id, today);
            if (latestPreviousRecord != null)
            {
                var previousStatus = _hoSoTrangThai.NormalizeStatus(latestPreviousRecord.TrangThai);
                if (UnfinishedStatuses.Contains(previousStatus))
                {
                    var previousDate = latestPreviousRecord.NgayTao?.ToString("dd/MM/yyyy") ?? "--";
                    return Conflict(new
                    {
                        message =
                            $"Benh nhan con ho so chua hoan tat (Ma HS: {latestPreviousRecord.MaHs}, ngay {previousDate}, trang thai {previousStatus}). " +
                            "Vui long xu ly ho so cu truoc khi tiep don moi.",
                        state = "PREVIOUS_RECORD_PENDING",
                        idHoSo = latestPreviousRecord.Id,
                        maHs = latestPreviousRecord.MaHs,
                        trangThai = previousStatus
                    });
                }
            }

            var existingRecord = await _db.HoSoBenhAns
                .Where(h => h.IdBenhNhan == existing.Id && h.NgayTao.HasValue && h.NgayTao.Value.Date == today)
                .OrderByDescending(h => h.NgayTao)
                .FirstOrDefaultAsync();

            if (existingRecord != null)
            {
                var status = _hoSoTrangThai.NormalizeStatus(existingRecord.TrangThai);

                switch (status)
                {
                    case "MOI":
                    case "CHUA_CHI_DINH":
                    case "CHO_CHI_DINH":
                        return Ok(new
                        {
                            state = "NEED_ORDER",
                            message = "Bá»‡nh nhĂ¢n Ä‘Ă£ Ä‘Æ°á»£c tiáº¿p Ä‘Ă³n hĂ´m nay nhÆ°ng chÆ°a chá»‰ Ä‘á»‹nh dá»‹ch vá»¥.",
                            benhNhan = new
                            {
                                IdBenhNhan = existing.Id,
                                MaBn = existing.MaBn,
                                existing.HoTen,
                                existing.GioiTinh,
                                existing.NgaySinh,
                                CCCD = existing.Cccd,
                                SoDienThoai = existing.SoDienThoai,
                                existing.Email,
                                existing.NgheNghiep,
                                existing.DiaChiDuong,
                                existing.DiaChiXa,
                                existing.DiaChiHuyen,
                                existing.DiaChiTinh,
                                existing.QuocGia
                            },
                            hoSo = new
                            {
                                IdHoSo = existingRecord.Id,
                                MaHs = existingRecord.MaHs,
                                TrangThai = status
                            }
                        });

                    case "CHI_DINH":
                        return Ok(new
                        {
                            state = "ORDERED_WAITING_DOCTOR",
                            message = "Bá»‡nh nhĂ¢n Ä‘Ă£ Ä‘Æ°á»£c chá»‰ Ä‘á»‹nh, Ä‘ang chá» bĂ¡c sÄ© khĂ¡m.",
                            benhNhan = new { IdBenhNhan = existing.Id, MaBn = existing.MaBn },
                            hoSo = new { IdHoSo = existingRecord.Id, MaHs = existingRecord.MaHs, TrangThai = status }
                        });

                    case "DA_KHAM":
                    case "DONG":
                        return Ok(new
                        {
                            state = "EXAM_DONE_OR_CLOSED",
                            message = "Bá»‡nh nhĂ¢n Ä‘Ă£ khĂ¡m xong/Ä‘Ă£ Ä‘Ă³ng há»“ sÆ¡.",
                            benhNhan = new { IdBenhNhan = existing.Id, MaBn = existing.MaBn },
                            hoSo = new { IdHoSo = existingRecord.Id, MaHs = existingRecord.MaHs, TrangThai = status }
                        });

                    case "HUY":
                        return Ok(new
                        {
                            state = "NEED_CREATE_RECORD",
                            message = "Há»“ sÆ¡ gáº§n nháº¥t Ä‘Ă£ há»§y. CĂ³ thá»ƒ táº¡o há»“ sÆ¡ má»›i.",
                            IdBenhNhan = existing.Id,
                            MaBn = existing.MaBn
                        });

                    default:
                        return Ok(new
                        {
                            state = "UNKNOWN_STATE",
                            message = "Há»“ sÆ¡ hĂ´m nay cĂ³ tráº¡ng thĂ¡i khĂ´ng xĂ¡c Ä‘á»‹nh.",
                            benhNhan = new { IdBenhNhan = existing.Id, MaBn = existing.MaBn },
                            hoSo = new { IdHoSo = existingRecord.Id, MaHs = existingRecord.MaHs, TrangThai = status }
                        });
                }
            }

            return Ok(new
            {
                state = "NEED_CREATE_RECORD",
                message = "Bá»‡nh nhĂ¢n Ä‘Ă£ tá»“n táº¡i, chÆ°a cĂ³ há»“ sÆ¡ hĂ´m nay.",
                IdBenhNhan = existing.Id,
                MaBn = existing.MaBn
            });
        }

        var entity = new BenhNhan
        {
            MaBn = _code.GenMa("BN"),
            HoTen = req.Ho_ten,
            NgaySinh = req.Ngay_sinh.HasValue ? DateOnly.FromDateTime(req.Ngay_sinh.Value) : null,
            GioiTinh = req.Gioi_tinh,
            Cccd = req.CCCD,
            SoDienThoai = req.So_dien_thoai,
            Email = req.Email,
            QuocTich = req.Quoc_tich,
            DanToc = req.Dan_toc,
            NgheNghiep = req.Nghe_nghiep,
            DiaChiDuong = req.Dia_chi_duong,
            DiaChiXa = req.Dia_chi_xa,
            DiaChiHuyen = req.Dia_chi_huyen,
            DiaChiTinh = req.Dia_chi_tinh,
            QuocGia = req.Quoc_gia,
            CreatedAt = DateTime.Now,
            UpdatedAt = DateTime.Now
        };

        _db.BenhNhans.Add(entity);
        await _db.SaveChangesAsync();

        return Ok(new
        {
            state = "NEW_PATIENT_CREATED",
            message = "Táº¡o má»›i bá»‡nh nhĂ¢n thĂ nh cĂ´ng.",
            IdBenhNhan = entity.Id,
            MaBn = entity.MaBn
        });
    }

    [HttpPost("records")]
    public async Task<IActionResult> CreateRecord([FromBody] RecordCreateDto dto)
    {
        var legacyBlocked = RejectLegacyMutation();
        if (legacyBlocked != null) return legacyBlocked;

        var denied = await EnsurePermissionAsync("them");
        if (denied != null) return denied;

        if (dto == null || dto.IdBenhNhan == 0)
            return BadRequest(new { message = "Dá»¯ liá»‡u khĂ´ng há»£p lá»‡" });

        var actorId = ResolveActorId(dto.IdNguoiTao);
        var now = DateTime.Now;
        var today = now.Date;

        var latestPreviousRecord = await FindLatestUnfinishedPreviousRecordAsync(dto.IdBenhNhan, today);
        if (latestPreviousRecord != null)
        {
            var previousStatus = _hoSoTrangThai.NormalizeStatus(latestPreviousRecord.TrangThai);
            if (UnfinishedStatuses.Contains(previousStatus))
            {
                var previousDate = latestPreviousRecord.NgayTao?.ToString("dd/MM/yyyy") ?? "--";
                return Conflict(new
                {
                    message =
                        $"Benh nhan con ho so chua hoan tat (Ma HS: {latestPreviousRecord.MaHs}, ngay {previousDate}, trang thai {previousStatus}). " +
                        "Vui long xu ly ho so cu truoc khi tiep don moi.",
                    state = "PREVIOUS_RECORD_PENDING",
                    idHoSo = latestPreviousRecord.Id,
                    maHs = latestPreviousRecord.MaHs,
                    trangThai = previousStatus
                });
            }
        }

        await using var tx = await _db.Database.BeginTransactionAsync(IsolationLevel.Serializable);

        try
        {
            var hsToday = await _db.HoSoBenhAns
                .Where(h => h.IdBenhNhan == dto.IdBenhNhan && h.NgayTao.HasValue && h.NgayTao.Value.Date == today)
                .OrderByDescending(h => h.NgayTao)
                .FirstOrDefaultAsync();

            HoSoBenhAn? hs = hsToday;
            var reused = false;

            if (hsToday != null)
            {
                var currentTodayStatus = _hoSoTrangThai.NormalizeStatus(hsToday.TrangThai);
                if (string.Equals(currentTodayStatus, "HUY", StringComparison.OrdinalIgnoreCase))
                {
                    hs = null;
                }
                else if (PendingTodayStatuses.Contains(currentTodayStatus))
                {
                    reused = true;
                }
                else if (string.Equals(currentTodayStatus, "CHI_DINH", StringComparison.OrdinalIgnoreCase))
                {
                    await tx.RollbackAsync();
                    return Conflict(new
                    {
                        message = "Ho so hom nay da chi dinh. Khong the tao lai tiep don/chuyen chi dinh.",
                        state = "ORDERED_WAITING_DOCTOR",
                        idHoSo = hsToday.Id,
                        maHs = hsToday.MaHs,
                        trangThai = currentTodayStatus
                    });
                }
                else if (string.Equals(currentTodayStatus, "DA_KHAM", StringComparison.OrdinalIgnoreCase) ||
                         string.Equals(currentTodayStatus, "DONG", StringComparison.OrdinalIgnoreCase))
                {
                    await tx.RollbackAsync();
                    return Conflict(new
                    {
                        message = "Ho so hom nay da hoan tat. Khong the tiep don moi tren cung benh nhan.",
                        state = "EXAM_DONE_OR_CLOSED",
                        idHoSo = hsToday.Id,
                        maHs = hsToday.MaHs,
                        trangThai = currentTodayStatus
                    });
                }
                else
                {
                    reused = true;
                }
            }

            if (hs == null)
            {
                hs = new HoSoBenhAn
                {
                    IdBenhNhan = dto.IdBenhNhan,
                    MaHs = _code.GenMa("HS"),
                    NgayTao = now,
                    IdNguoiTao = actorId,
                    TrangThai = null
                };

                await _db.HoSoBenhAns.AddAsync(hs);
                await _db.SaveChangesAsync();

                var transition = _hoSoTrangThai.ApplyTransition(
                    hs,
                    "CHO_CHI_DINH",
                    actorId,
                    "CREATE_RECORD",
                    "Táº¡o há»“ sÆ¡ tiáº¿p Ä‘Ă³n má»›i."
                );
                if (!transition.Success)
                {
                    await tx.RollbackAsync();
                    return BadRequest(new { message = transition.ErrorMessage });
                }
                await _db.SaveChangesAsync();
            }

            var lk = await _db.LanKhams
                .Where(x => x.IdHoSo == hs.Id)
                .OrderByDescending(x => x.CreatedAt ?? x.ThoiGianBatDau)
                .FirstOrDefaultAsync();

            if (lk == null)
            {
                lk = new LanKham
                {
                    IdHoSo = hs.Id,
                    IdBenhNhan = dto.IdBenhNhan,
                    TrangThai = "CHO_KHAM",
                    ThoiGianBatDau = now,
                    CreatedAt = now,
                    UpdatedAt = now,
                    IdTiepDon = actorId
                };

                await _db.LanKhams.AddAsync(lk);
                await _db.SaveChangesAsync();
            }

            if (dto.SinhHieu != null)
            {
                SinhHieu? sh = null;

                if (lk.IdSinhHieu.HasValue)
                {
                    sh = await _db.SinhHieus.FirstOrDefaultAsync(x => x.Id == lk.IdSinhHieu.Value);
                }

                if (sh == null)
                {
                    sh = await _db.SinhHieus
                        .Where(x => x.IdLanKham == lk.Id)
                        .OrderByDescending(x => x.ThoiGianDo)
                        .FirstOrDefaultAsync();
                }

                if (sh == null)
                {
                    sh = new SinhHieu
                    {
                        IdLanKham = lk.Id,
                        ThoiGianDo = now
                    };
                    _db.SinhHieus.Add(sh);
                }

                sh.NhietDo = dto.SinhHieu.NhietDo;
                sh.HuyetApTamThu = dto.SinhHieu.HuyetApTamThu;
                sh.HuyetApTamTruong = dto.SinhHieu.HuyetApTamTruong;
                sh.NhipTim = dto.SinhHieu.NhipTim;
                sh.NhipTho = dto.SinhHieu.NhipTho;
                sh.SpO2 = dto.SinhHieu.SpO2;
                sh.CanNang = dto.SinhHieu.CanNang;
                sh.ChieuCao = dto.SinhHieu.ChieuCao;
                sh.Bmi = dto.SinhHieu.Bmi;
                sh.ThoiGianDo = now;

                await _db.SaveChangesAsync();

                lk.IdSinhHieu = sh.Id;
                lk.UpdatedAt = now;
                await _db.SaveChangesAsync();
            }

            await tx.CommitAsync();

            return Ok(new
            {
                idHoSo = hs.Id,
                maHs = hs.MaHs,
                idLanKham = lk.Id,
                reused,
                trangThai = hs.TrangThai
            });
        }
        catch (DbUpdateException ex) when (IsUniqueConstraintViolation(ex))
        {
            await tx.RollbackAsync();

            var existing = await _db.HoSoBenhAns
                .Where(h => h.IdBenhNhan == dto.IdBenhNhan && h.NgayTao.HasValue && h.NgayTao.Value.Date == today)
                .OrderByDescending(h => h.NgayTao)
                .FirstOrDefaultAsync();

            if (existing != null)
            {
                var existingLanKham = await _db.LanKhams
                    .Where(x => x.IdHoSo == existing.Id)
                    .OrderByDescending(x => x.CreatedAt ?? x.ThoiGianBatDau)
                    .Select(x => x.Id)
                    .FirstOrDefaultAsync();

                return Ok(new
                {
                    idHoSo = existing.Id,
                    maHs = existing.MaHs,
                    idLanKham = existingLanKham,
                    reused = true,
                    message = "Há»“ sÆ¡ trong ngĂ y Ä‘Ă£ tá»“n táº¡i, tráº£ vá» há»“ sÆ¡ hiá»‡n cĂ³."
                });
            }

            return Conflict(new
            {
                message = "PhĂ¡t hiá»‡n xung Ä‘á»™t dá»¯ liá»‡u khi táº¡o há»“ sÆ¡. Vui lĂ²ng thá»­ láº¡i."
            });
        }
    }

    [HttpPatch("{id:long}/status")]
    public async Task<IActionResult> UpdateReceptionStatus(long id, [FromBody] ReceptionStatusUpdateDto dto)
    {
        var legacyBlocked = RejectLegacyMutation();
        if (legacyBlocked != null) return legacyBlocked;

        var denied = await EnsurePermissionAsync("sua");
        if (denied != null) return denied;

        if (dto == null || string.IsNullOrWhiteSpace(dto.ToStatus))
            return BadRequest(new { message = "Thiáº¿u tráº¡ng thĂ¡i cáº§n cáº­p nháº­t." });

        var actorId = GetCurrentUserId();
        var record = await _db.HoSoBenhAns.FirstOrDefaultAsync(h => h.Id == id);
        if (record == null)
            return NotFound(new { message = "KhĂ´ng tĂ¬m tháº¥y há»“ sÆ¡." });

        var transition = _hoSoTrangThai.ApplyTransition(
            record,
            dto.ToStatus,
            actorId,
            "MANUAL_STATUS_UPDATE",
            dto.Note
        );
        if (!transition.Success)
        {
            return BadRequest(new { message = transition.ErrorMessage });
        }

        await _db.SaveChangesAsync();

        return Ok(new
        {
            message = transition.Changed
                ? "Cáº­p nháº­t tráº¡ng thĂ¡i há»“ sÆ¡ thĂ nh cĂ´ng."
                : "Tráº¡ng thĂ¡i há»“ sÆ¡ khĂ´ng thay Ä‘á»•i.",
            fromStatus = transition.FromStatus,
            toStatus = transition.ToStatus,
            changed = transition.Changed
        });
    }

    [HttpPatch("cancel/{id}")]
    public async Task<IActionResult> CancelReception(long id)
    {
        var legacyBlocked = RejectLegacyMutation();
        if (legacyBlocked != null) return legacyBlocked;

        var denied = await EnsurePermissionAsync("xoa");
        if (denied != null) return denied;

        var actorId = GetCurrentUserId();

        var record = await _db.HoSoBenhAns
            .Include(h => h.LanKhams)
                .ThenInclude(l => l.ChiDinhDvkts)
            .Include(h => h.LanKhams)
                .ThenInclude(l => l.LanKhamDichVus)
            .FirstOrDefaultAsync(h => h.Id == id);

        if (record == null)
            return NotFound(new { message = "KhĂ´ng tĂ¬m tháº¥y há»“ sÆ¡." });

        var currentStatus = _hoSoTrangThai.NormalizeStatus(record.TrangThai);
        if (currentStatus == "DA_KHAM" || currentStatus == "DONG")
            return BadRequest(new { message = "KhĂ´ng thá»ƒ há»§y há»“ sÆ¡ Ä‘Ă£ khĂ¡m hoáº·c Ä‘Ă£ Ä‘Ă³ng." });

        var lanKhamIds = record.LanKhams.Select(l => l.Id).ToList();
        var hasRecordDate = record.NgayTao.HasValue;
        var recordDate = hasRecordDate ? record.NgayTao!.Value.Date : DateTime.MinValue;

        var invoiceQuery = _db.HoaDons.Where(h =>
            (h.IdLanKham.HasValue && lanKhamIds.Contains(h.IdLanKham.Value)) ||
            (record.IdBenhNhan.HasValue
             && h.IdBenhNhan == record.IdBenhNhan
             && hasRecordDate
             && h.NgayTao.HasValue
             && h.NgayTao.Value.Date == recordDate
             && h.LoaiHoaDon == "KHAM")
        );

        var hasPaidInvoice = await invoiceQuery.AnyAsync(h => h.TrangThai == "DA_THANH_TOAN");
        if (hasPaidInvoice)
        {
            return BadRequest(new
            {
                message = "KhĂ´ng thá»ƒ há»§y tiáº¿p Ä‘Ă³n vĂ¬ Ä‘Ă£ cĂ³ hĂ³a Ä‘Æ¡n liĂªn quan Ä‘Æ°á»£c thanh toĂ¡n."
            });
        }

        await using var tx = await _db.Database.BeginTransactionAsync();

        var relatedInvoices = await invoiceQuery.ToListAsync();
        foreach (var hd in relatedInvoices.Where(x => x.TrangThai != "HUY"))
        {
            hd.TrangThai = "HUY";
            hd.GhiChu = AppendNote(hd.GhiChu, "Há»§y theo há»“ sÆ¡ tiáº¿p Ä‘Ă³n.");
        }

        foreach (var lk in record.LanKhams.Where(x => x.TrangThai != "DA_HUY"))
        {
            lk.TrangThai = "DA_HUY";
            lk.UpdatedAt = DateTime.Now;
            lk.ThoiGianKetThuc ??= DateTime.Now;
            lk.GhiChu = AppendNote(lk.GhiChu, "Há»§y theo há»“ sÆ¡ tiáº¿p Ä‘Ă³n.");
        }

        var affectedChiDinh = 0;
        foreach (var cd in record.LanKhams.SelectMany(x => x.ChiDinhDvkts))
        {
            var current = (cd.TrangThai ?? string.Empty).Trim().ToLowerInvariant();
            if (current is "done" or "completed" or "canceled") continue;
            cd.TrangThai = "canceled";
            affectedChiDinh++;
        }

        var affectedLanKhamDichVu = 0;
        foreach (var dv in record.LanKhams.SelectMany(x => x.LanKhamDichVus))
        {
            var current = (dv.TrangThaiThucHien ?? string.Empty).Trim().ToUpperInvariant();
            if (current is "HOAN_THANH" or "DA_HUY") continue;
            dv.TrangThaiThucHien = "DA_HUY";
            dv.GhiChu = AppendNote(dv.GhiChu, "Há»§y theo há»“ sÆ¡ tiáº¿p Ä‘Ă³n.");
            affectedLanKhamDichVu++;
        }

        var transition = _hoSoTrangThai.ApplyTransition(
            record,
            "HUY",
            actorId,
            "CANCEL_RECEPTION",
            "Há»§y tiáº¿p Ä‘Ă³n vĂ  Ä‘á»“ng bá»™ tráº¡ng thĂ¡i liĂªn quan.",
            new
            {
                invoices = relatedInvoices.Count,
                lanKhams = record.LanKhams.Count,
                chiDinh = affectedChiDinh,
                lanKhamDichVu = affectedLanKhamDichVu
            }
        );
        if (!transition.Success)
        {
            await tx.RollbackAsync();
            return BadRequest(new { message = transition.ErrorMessage });
        }

        await _db.SaveChangesAsync();
        await tx.CommitAsync();

        return Ok(new
        {
            message = "ÄĂ£ há»§y tiáº¿p Ä‘Ă³n thĂ nh cĂ´ng.",
            record.Id,
            record.MaHs,
            cascaded = new
            {
                invoices = relatedInvoices.Count,
                lanKhams = record.LanKhams.Count,
                chiDinh = affectedChiDinh,
                lanKhamDichVu = affectedLanKhamDichVu
            }
        });
    }

    [HttpGet("cancelled")]
    public async Task<IActionResult> GetCancelledReceptions([FromQuery] ReceptionListQueryDto query)
    {
        var denied = await EnsurePermissionAsync("xem");
        if (denied != null) return denied;

        var baseQuery = BuildReceptionQuery(query, cancelledOnly: true);
        var total = await baseQuery.CountAsync();
        var (page, pageSize) = NormalizePaging(query.Page, query.PageSize);
        var totalPages = total == 0 ? 1 : (int)Math.Ceiling(total / (double)pageSize);
        page = Math.Min(page, totalPages);

        var sortedQuery = ApplySorting(baseQuery, query.SortBy, query.SortDir);
        var items = await sortedQuery
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(h => new
            {
                h.Id,
                h.MaHs,
                h.TrangThai,
                h.NgayTao,
                h.UpdatedAt,
                IdBenhNhan = h.IdBenhNhan,
                BenhNhan = new
                {
                    IdBenhNhan = h.IdBenhNhanNavigation != null ? h.IdBenhNhanNavigation.Id : 0,
                    MaBn = h.IdBenhNhanNavigation != null ? h.IdBenhNhanNavigation.MaBn : null,
                    HoTen = h.IdBenhNhanNavigation != null ? h.IdBenhNhanNavigation.HoTen : null,
                    GioiTinh = h.IdBenhNhanNavigation != null ? h.IdBenhNhanNavigation.GioiTinh : null,
                    NgaySinh = h.IdBenhNhanNavigation != null ? h.IdBenhNhanNavigation.NgaySinh : null,
                    SoDienThoai = h.IdBenhNhanNavigation != null ? h.IdBenhNhanNavigation.SoDienThoai : null,
                    Cccd = h.IdBenhNhanNavigation != null ? h.IdBenhNhanNavigation.Cccd : null
                }
            })
            .ToListAsync();

        return Ok(new
        {
            items,
            total,
            page,
            pageSize,
            totalPages
        });
    }

    [HttpGet("{id:long}/status-logs")]
    public async Task<IActionResult> GetStatusLogs(long id, [FromQuery] int limit = 80)
    {
        var denied = await EnsurePermissionAsync("xem");
        if (denied != null) return denied;

        if (limit <= 0) limit = 80;
        limit = Math.Min(limit, 500);

        var exists = await _db.HoSoBenhAns.AnyAsync(h => h.Id == id);
        if (!exists)
        {
            return NotFound(new { message = "KhĂ´ng tĂ¬m tháº¥y há»“ sÆ¡." });
        }

        var logs = await _db.TiepDonTrangThaiLogs
            .AsNoTracking()
            .Where(l => l.IdHoSo == id)
            .OrderByDescending(l => l.CreatedAt)
            .Take(limit)
            .Select(l => new
            {
                l.Id,
                l.IdHoSo,
                l.FromTrangThai,
                l.ToTrangThai,
                l.Action,
                l.Note,
                l.IdNguoiDung,
                NguoiDung = l.IdNguoiDungNavigation != null
                    ? (l.IdNguoiDungNavigation.HoTen ?? l.IdNguoiDungNavigation.TenDangNhap)
                    : null,
                l.CreatedAt,
                l.Metadata
            })
            .ToListAsync();

        return Ok(logs);
    }

    [HttpGet("stats")]
    public async Task<IActionResult> GetReceptionStats()
    {
        var denied = await EnsurePermissionAsync("xem");
        if (denied != null) return denied;

        var today = DateTime.Today;

        var totalToday = await _db.HoSoBenhAns
            .CountAsync(h => h.NgayTao.HasValue && h.NgayTao.Value.Date == today);

        var cancelled = await _db.HoSoBenhAns
            .CountAsync(h => h.TrangThai == "HUY" && h.NgayTao.HasValue && h.NgayTao.Value.Date == today);

        var newPatients = await _db.BenhNhans
            .CountAsync(b => b.CreatedAt.HasValue && b.CreatedAt.Value.Date == today);

        var reExam = await _db.HoSoBenhAns
            .CountAsync(h => h.TrangThai == "DA_KHAM" && h.NgayTao.HasValue && h.NgayTao.Value.Date == today);

        return Ok(new
        {
            totalToday,
            cancelled,
            newPatients,
            reExam
        });
    }

    [HttpGet("export")]
    public async Task<IActionResult> ExportReceptions([FromQuery] ReceptionExportQueryDto query)
    {
        var denied = await EnsurePermissionAsync("xuat");
        if (denied != null) return denied;

        var actorId = GetCurrentUserId();
        var tab = (query.Tab ?? "today").Trim().ToLowerInvariant();
        var format = (query.Format ?? "csv").Trim().ToLowerInvariant();

        if (format != "csv")
        {
            return BadRequest(new { message = "Äá»‹nh dáº¡ng export hiá»‡n chá»‰ há»— trá»£ CSV." });
        }

        var listQuery = new ReceptionListQueryDto
        {
            Date = query.Date,
            FromDate = query.FromDate,
            ToDate = query.ToDate,
            Keyword = query.Keyword,
            Status = query.Status,
            SortBy = query.SortBy,
            SortDir = query.SortDir
        };

        var cancelledOnly = tab == "cancelled";
        if (tab is "today" && !listQuery.Date.HasValue && !listQuery.FromDate.HasValue && !listQuery.ToDate.HasValue)
        {
            listQuery.Date = DateTime.Today;
        }

        var startedAt = DateTime.Now;
        var exportQuery = BuildReceptionQuery(listQuery, cancelledOnly);
        exportQuery = ApplySorting(exportQuery, listQuery.SortBy, listQuery.SortDir);

        var rows = await exportQuery
            .Select(h => new
            {
                h.MaHs,
                h.TrangThai,
                h.NgayTao,
                h.UpdatedAt,
                MaBn = h.IdBenhNhanNavigation != null ? h.IdBenhNhanNavigation.MaBn : null,
                HoTen = h.IdBenhNhanNavigation != null ? h.IdBenhNhanNavigation.HoTen : null,
                GioiTinh = h.IdBenhNhanNavigation != null ? h.IdBenhNhanNavigation.GioiTinh : null,
                NgaySinh = h.IdBenhNhanNavigation != null ? h.IdBenhNhanNavigation.NgaySinh : null,
                SoDienThoai = h.IdBenhNhanNavigation != null ? h.IdBenhNhanNavigation.SoDienThoai : null,
                Cccd = h.IdBenhNhanNavigation != null ? h.IdBenhNhanNavigation.Cccd : null
            })
            .ToListAsync();

        var csv = new StringBuilder();
        csv.AppendLine("ma_hs,ma_bn,ho_ten,gioi_tinh,ngay_sinh,so_dien_thoai,cccd,trang_thai,ngay_tao,updated_at");
        foreach (var row in rows)
        {
            csv.AppendLine(string.Join(",",
                EscapeCsv(row.MaHs),
                EscapeCsv(row.MaBn),
                EscapeCsv(row.HoTen),
                EscapeCsv(row.GioiTinh),
                EscapeCsv(row.NgaySinh?.ToString("yyyy-MM-dd")),
                EscapeCsv(row.SoDienThoai),
                EscapeCsv(row.Cccd),
                EscapeCsv(row.TrangThai),
                EscapeCsv(row.NgayTao?.ToString("yyyy-MM-dd HH:mm:ss")),
                EscapeCsv(row.UpdatedAt?.ToString("yyyy-MM-dd HH:mm:ss"))
            ));
        }

        var report = new BaoCao
        {
            MaBc = GenerateBaoCaoCode(),
            Loai = "TIEP_DON_EXPORT",
            ThamSo = JsonSerializer.Serialize(new
            {
                tab,
                query.Date,
                query.FromDate,
                query.ToDate,
                query.Keyword,
                query.Status,
                query.SortBy,
                query.SortDir
            }),
            NgayBatDau = query.FromDate.HasValue
                ? DateOnly.FromDateTime(query.FromDate.Value)
                : query.Date.HasValue ? DateOnly.FromDateTime(query.Date.Value) : null,
            NgayKetThuc = query.ToDate.HasValue
                ? DateOnly.FromDateTime(query.ToDate.Value)
                : query.Date.HasValue ? DateOnly.FromDateTime(query.Date.Value) : null,
            DinhDang = "CSV",
            NgayTao = startedAt,
            IdNguoiDung = actorId,
            DuLieu = $"rows={rows.Count};tab={tab}"
        };
        _db.BaoCaos.Add(report);
        await _db.SaveChangesAsync();

        var fileName = $"tiuv_reception_{tab}_{DateTime.Now:yyyyMMdd_HHmmss}.csv";

        _db.BaoCaoXuats.Add(new BaoCaoXuat
        {
            IdBaoCao = report.Id,
            IdNguoiDung = actorId,
            DinhDang = "CSV",
            ThoiGianBatDau = startedAt,
            ThoiGianKetThuc = DateTime.Now,
            DuongDanFile = fileName
        });
        await _db.SaveChangesAsync();

        var textBytes = Encoding.UTF8.GetBytes(csv.ToString());
        var bytes = Encoding.UTF8.GetPreamble().Concat(textBytes).ToArray();

        return File(bytes, "text/csv; charset=utf-8", fileName);
    }

    private IQueryable<HoSoBenhAn> BuildReceptionQuery(ReceptionListQueryDto query, bool cancelledOnly)
    {
        var q = _db.HoSoBenhAns
            .AsNoTracking()
            .Where(h => h.IdBenhNhanNavigation != null);

        if (cancelledOnly)
        {
            q = q.Where(h => h.TrangThai == "HUY");
        }
        else
        {
            q = q.Where(h => h.TrangThai == null || h.TrangThai != "HUY");
        }

        if (query.Date.HasValue)
        {
            var date = query.Date.Value.Date;
            q = q.Where(h => h.NgayTao.HasValue && h.NgayTao.Value.Date == date);
        }

        if (query.FromDate.HasValue)
        {
            var from = query.FromDate.Value.Date;
            q = q.Where(h => h.NgayTao.HasValue && h.NgayTao.Value.Date >= from);
        }

        if (query.ToDate.HasValue)
        {
            var to = query.ToDate.Value.Date;
            q = q.Where(h => h.NgayTao.HasValue && h.NgayTao.Value.Date <= to);
        }

        if (!string.IsNullOrWhiteSpace(query.Status) &&
            !string.Equals(query.Status, "ALL", StringComparison.OrdinalIgnoreCase))
        {
            var status = query.Status.Trim().ToUpperInvariant();
            q = q.Where(h => h.TrangThai != null && h.TrangThai.ToUpper() == status);
        }

        if (!string.IsNullOrWhiteSpace(query.Keyword))
        {
            var keyword = query.Keyword.Trim();
            q = q.Where(h =>
                (h.MaHs != null && h.MaHs.Contains(keyword)) ||
                (h.IdBenhNhanNavigation != null && (
                    (h.IdBenhNhanNavigation.MaBn != null && h.IdBenhNhanNavigation.MaBn.Contains(keyword)) ||
                    (h.IdBenhNhanNavigation.HoTen != null && h.IdBenhNhanNavigation.HoTen.Contains(keyword)) ||
                    (h.IdBenhNhanNavigation.SoDienThoai != null && h.IdBenhNhanNavigation.SoDienThoai.Contains(keyword)) ||
                    (h.IdBenhNhanNavigation.Cccd != null && h.IdBenhNhanNavigation.Cccd.Contains(keyword))
                )));
        }

        return q;
    }

    private static IQueryable<HoSoBenhAn> ApplySorting(IQueryable<HoSoBenhAn> query, string? sortBy, string? sortDir)
    {
        var sort = (sortBy ?? "ngay_tao").Trim().ToLowerInvariant();
        var asc = string.Equals(sortDir, "asc", StringComparison.OrdinalIgnoreCase);

        return (sort, asc) switch
        {
            ("ma_hs", true) => query.OrderBy(h => h.MaHs),
            ("ma_hs", false) => query.OrderByDescending(h => h.MaHs),
            ("ho_ten", true) => query.OrderBy(h => h.IdBenhNhanNavigation!.HoTen),
            ("ho_ten", false) => query.OrderByDescending(h => h.IdBenhNhanNavigation!.HoTen),
            ("trang_thai", true) => query.OrderBy(h => h.TrangThai),
            ("trang_thai", false) => query.OrderByDescending(h => h.TrangThai),
            ("updated_at", true) => query.OrderBy(h => h.UpdatedAt ?? h.NgayTao),
            ("updated_at", false) => query.OrderByDescending(h => h.UpdatedAt ?? h.NgayTao),
            (_, true) => query.OrderBy(h => h.NgayTao),
            _ => query.OrderByDescending(h => h.NgayTao)
        };
    }

    private static (int page, int pageSize) NormalizePaging(int page, int pageSize)
    {
        var p = page <= 0 ? 1 : page;
        var ps = pageSize <= 0 ? 20 : pageSize;
        ps = Math.Min(ps, 200);
        return (p, ps);
    }

    private async Task<IActionResult?> EnsurePermissionAsync(string action)
    {
        var userId = GetCurrentUserId();
        if (!userId.HasValue)
        {
            return Unauthorized(new { message = "KhĂ´ng xĂ¡c Ä‘á»‹nh Ä‘Æ°á»£c ngÆ°á»i dĂ¹ng tá»« token." });
        }

        var allowed = await HasPermissionAsync(userId.Value, action);
        if (allowed) return null;

        return StatusCode(403, new { message = $"Báº¡n khĂ´ng cĂ³ quyá»n '{action}' cho chá»©c nÄƒng tiáº¿p Ä‘Ă³n." });
    }

    private async Task<bool> HasPermissionAsync(long userId, string action)
    {
        var feature = FeatureCode.ToUpperInvariant();
        var normalizedAction = action.Trim().ToLowerInvariant();

        var roleNames = await (
            from ndvt in _db.NguoiDungVaiTros
            join vt in _db.VaiTros on ndvt.IdVaiTro equals vt.Id
            where ndvt.IdNguoiDung == userId && vt.Ten != null
            select vt.Ten.ToUpper()
        ).Distinct().ToListAsync();

        if (roleNames.Contains("ADMIN") || roleNames.Contains("QUAN_TRI"))
            return true;

        var query = from ndvt in _db.NguoiDungVaiTros
                    join vtq in _db.VaiTroQuyens on ndvt.IdVaiTro equals vtq.IdVaiTro
                    join q in _db.Quyens on vtq.IdQuyen equals q.Id
                    join cn in _db.ChucNangs on q.IdChucNang equals cn.Id
                    where ndvt.IdNguoiDung == userId
                          && cn.MaChucNang.ToUpper() == feature
                    select new
                    {
                        Xem = (vtq.Xem ?? false) && (q.Xem ?? false),
                        Them = (vtq.Them ?? false) && (q.Them ?? false),
                        Sua = (vtq.Sua ?? false) && (q.Sua ?? false),
                        Xoa = (vtq.Xoa ?? false) && (q.Xoa ?? false),
                        Xuat = (vtq.Xuat ?? false) && (q.Xuat ?? false)
                    };

        return normalizedAction switch
        {
            "xem" => await query.AnyAsync(x => x.Xem),
            "them" => await query.AnyAsync(x => x.Them),
            "sua" => await query.AnyAsync(x => x.Sua),
            "xoa" => await query.AnyAsync(x => x.Xoa),
            "xuat" => await query.AnyAsync(x => x.Xuat),
            _ => false
        };
    }

    private long? GetCurrentUserId()
    {
        var raw = User.FindFirstValue("sub")
                  ?? User.FindFirstValue(ClaimTypes.NameIdentifier)
                  ?? User.FindFirstValue("nameid");

        return long.TryParse(raw, out var id) ? id : null;
    }

    private long ResolveActorId(long? fallback)
    {
        var current = GetCurrentUserId();
        if (current.HasValue && current.Value > 0) return current.Value;
        if (fallback.HasValue && fallback.Value > 0) return fallback.Value;
        return 0;
    }

    private static bool IsUniqueConstraintViolation(DbUpdateException ex)
    {
        if (ex.InnerException is SqlException sqlEx)
        {
            return sqlEx.Number is 2601 or 2627;
        }
        return false;
    }

    private static string EscapeCsv(string? input)
    {
        var value = input ?? string.Empty;
        if (value.Contains('"') || value.Contains(',') || value.Contains('\n') || value.Contains('\r'))
        {
            return "\"" + value.Replace("\"", "\"\"") + "\"";
        }
        return value;
    }

    private static string GenerateBaoCaoCode()
    {
        return $"TD{DateTime.Now:yyMMddHHmmss}{Random.Shared.Next(100, 1000)}";
    }

    private static string AppendNote(string? source, string note)
    {
        if (string.IsNullOrWhiteSpace(source)) return note;
        return $"{source} | {note}";
    }

    private async Task<HoSoBenhAn?> FindLatestUnfinishedPreviousRecordAsync(long patientId, DateTime today)
    {
        var previousRecords = await _db.HoSoBenhAns
            .Where(h => h.IdBenhNhan == patientId && h.NgayTao.HasValue && h.NgayTao.Value.Date < today)
            .OrderByDescending(h => h.NgayTao)
            .ToListAsync();

        foreach (var record in previousRecords)
        {
            var normalized = _hoSoTrangThai.NormalizeStatus(record.TrangThai);
            if (UnfinishedStatuses.Contains(normalized))
            {
                return record;
            }
        }

        return null;
    }
}

