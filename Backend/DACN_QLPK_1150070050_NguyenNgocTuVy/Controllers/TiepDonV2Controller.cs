using System.Data;
using System.Globalization;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using DACN_QLPK_1150070050_NguyenNgocTuVy.Data;
using DACN_QLPK_1150070050_NguyenNgocTuVy.Dtos;
using DACN_QLPK_1150070050_NguyenNgocTuVy.Models;
using DACN_QLPK_1150070050_NguyenNgocTuVy.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace DACN_QLPK_1150070050_NguyenNgocTuVy.Controllers;

[Authorize]
[ApiController]
[Route("api/tiepdon/v2")]
[Route("api/reception/v2")]
public class TiepDonV2Controller : ControllerBase
{
    private const string FeatureCode = "TIEP_DON";
    private const string MetaPrefix = "[RECEPTION_META]";
    private const string IdempotencyCachePrefix = "RECEPTION_ENCOUNTER_SAVE";
    private const string PatientIdempotencyCachePrefix = "RECEPTION_PATIENT_UPSERT";

    private static readonly Regex PhoneRegex = new(@"^(0|\+84)(3|5|7|8|9)\d{8}$", RegexOptions.Compiled);
    private static readonly Regex CitizenIdRegex = new(@"^\d{9}(\d{3})?$", RegexOptions.Compiled);
    private static readonly object LocationCacheLock = new();
    private static List<WardSearchItem>? _wardSearchCache;

    private static readonly Dictionary<string, string> NguonTiepNhanCatalog = new(StringComparer.OrdinalIgnoreCase)
    {
        ["tructiep"] = "Trực tiếp",
        ["datlich"] = "Đặt lịch",
        ["taikham"] = "Tái khám",
        ["chuyentuyen"] = "Chuyển tuyến",
        ["capcuu"] = "Cấp cứu",
        ["khamdoan"] = "Khám đoàn",
        ["doanhnghiep"] = "Doanh nghiệp"
    };

    private static readonly Dictionary<string, string> LoaiKhamCatalog = new(StringComparer.OrdinalIgnoreCase)
    {
        ["khammoi"] = "Khám mới",
        ["taikham"] = "Tái khám",
        ["capcuu"] = "Cấp cứu",
        ["khamdichvu"] = "Khám dịch vụ",
        ["khamtongquat"] = "Khám tổng quát",
        ["khamtheogoi"] = "Khám theo gói",
        ["khamdoanhnghiep"] = "Khám doanh nghiệp"
    };

    private static readonly Dictionary<string, string> MucUuTienCatalog = new(StringComparer.OrdinalIgnoreCase)
    {
        ["thuong"] = "Thường",
        ["uutien"] = "Ưu tiên",
        ["capcuu"] = "Cấp cứu",
        ["hentruoc"] = "Hẹn trước",
        ["vip"] = "VIP"
    };

    private static readonly Dictionary<string, string> DoiTuongThanhToanCatalog = new(StringComparer.OrdinalIgnoreCase)
    {
        ["tuphi"] = "Tự phí",
        ["baohiem"] = "Bảo hiểm",
        ["dichvuyeucau"] = "Dịch vụ yêu cầu",
        ["congtychitra"] = "Công ty chi trả",
        ["miengiam"] = "Miễn giảm"
    };

    private readonly DACNDbContext _db;
    private readonly ICodeGenerator _code;
    private readonly IHoSoTrangThaiService _status;
    private readonly IWebHostEnvironment _env;
    private readonly IMemoryCache _cache;

    public TiepDonV2Controller(
        DACNDbContext db,
        ICodeGenerator code,
        IHoSoTrangThaiService status,
        IWebHostEnvironment env,
        IMemoryCache cache)
    {
        _db = db;
        _code = code;
        _status = status;
        _env = env;
        _cache = cache;
    }

    private sealed record ReceptionAreaSelection(
        bool Success,
        string? Error,
        KhuTiepDon? Area,
        QuayTiepDon? Counter,
        bool UsedDefault);

    private sealed record UserAreaAccess(int IdKhuTiepDon, bool? LaMacDinh);

    [HttpGet("patients/lookup")]
    public async Task<IActionResult> LookupPatient([FromQuery] PatientLookupRequest query)
    {
        var denied = await EnsurePermissionAsync("xem");
        if (denied != null) return denied;

        var patient = await FindPatientByPriorityAsync(query);
        if (patient == null)
        {
            return Ok(new { exists = false, patient = (object?)null, todayRecord = (object?)null });
        }

        var today = DateTime.Today;
        var requestedArea = await FindAreaForLookupAsync(query);
        var todayEncounterRaw = await _db.HoSoBenhAns
            .AsNoTracking()
            .Where(h => h.IdBenhNhan == patient.Id && h.NgayTao.HasValue && h.NgayTao.Value.Date == today)
            .OrderByDescending(h => h.NgayTao)
            .Select(h => new
            {
                h.Id,
                h.MaHs,
                h.TrangThai,
                h.NgayTao,
                h.IdKhuTiepDon,
                KhuMa = h.IdKhuTiepDonNavigation != null ? h.IdKhuTiepDonNavigation.MaKhu : null,
                KhuTen = h.IdKhuTiepDonNavigation != null ? h.IdKhuTiepDonNavigation.TenKhu : null,
                h.IdQuayTiepDon,
                QuayMa = h.IdQuayTiepDonNavigation != null ? h.IdQuayTiepDonNavigation.MaQuay : null,
                QuayTen = h.IdQuayTiepDonNavigation != null ? h.IdQuayTiepDonNavigation.TenQuay : null
            })
            .FirstOrDefaultAsync();

        var todayEncounter = todayEncounterRaw == null
            ? null
            : new
            {
                todayEncounterRaw.Id,
                todayEncounterRaw.MaHs,
                TrangThai = _status.NormalizeStatus(todayEncounterRaw.TrangThai),
                todayEncounterRaw.NgayTao,
                KhuTiepDon = BuildAreaDto(todayEncounterRaw.IdKhuTiepDon, todayEncounterRaw.KhuMa, todayEncounterRaw.KhuTen),
                QuayTiepDon = BuildCounterDto(todayEncounterRaw.IdQuayTiepDon, todayEncounterRaw.QuayMa, todayEncounterRaw.QuayTen),
                IsOtherArea = requestedArea?.Id != null
                    && todayEncounterRaw.IdKhuTiepDon.HasValue
                    && requestedArea.Id != todayEncounterRaw.IdKhuTiepDon.Value
            };

        return Ok(new
        {
            exists = true,
            patient = ToPatientDto(patient),
            todayRecord = todayEncounter
        });
    }

    [HttpGet("locations/wards")]
    public async Task<IActionResult> SearchWards([FromQuery] WardSearchQueryDto query)
    {
        var denied = await EnsurePermissionAsync("xem");
        if (denied != null) return denied;

        var keyword = Clean(query.Q);
        if (string.IsNullOrWhiteSpace(keyword))
        {
            return Ok(Array.Empty<object>());
        }

        var items = GetWardSearchItems();
        if (items.Count == 0)
        {
            return Ok(Array.Empty<object>());
        }

        var normalized = NormalizeSearchText(keyword);
        var compact = CompactSearchText(normalized);
        if (string.IsNullOrWhiteSpace(compact))
        {
            return Ok(Array.Empty<object>());
        }

        var limit = query.Limit <= 0 ? 12 : Math.Min(query.Limit, 30);

        var result = items
            .Select(x => new { item = x, score = ComputeWardMatchScore(x, compact) })
            .Where(x => x.score >= 0)
            .OrderBy(x => x.score)
            .ThenBy(x => x.item.Name)
            .Take(limit)
            .Select(x => new
            {
                code = x.item.Code,
                type = x.item.Type,
                name = x.item.Name,
                nameWithType = x.item.NameWithType,
                provinceCode = x.item.ProvinceCode,
                provinceName = x.item.ProvinceName,
                provinceWithType = x.item.ProvinceWithType,
                path = x.item.Path,
                pathWithType = x.item.PathWithType,
                displayLabel = $"{x.item.NameWithType} - {x.item.ProvinceName}"
            })
            .ToList();

        return Ok(result);
    }

    [HttpGet("areas")]
    public async Task<IActionResult> GetReceptionAreas()
    {
        var denied = await EnsurePermissionAsync("xem");
        if (denied != null) return denied;

        var userId = GetCurrentUserId();
        var allowedAreaIds = userId.HasValue
            ? await _db.NguoiDungKhus
                .AsNoTracking()
                .Where(x => x.IdNguoiDung == userId.Value && x.HoatDong == true)
                .Select(x => new UserAreaAccess(x.IdKhuTiepDon, x.LaMacDinh))
                .ToListAsync()
            : new List<UserAreaAccess>();

        var hasAssignments = allowedAreaIds.Count > 0;
        var allowedSet = allowedAreaIds.Select(x => x.IdKhuTiepDon).ToHashSet();

        var areas = await _db.KhuTiepDons
            .AsNoTracking()
            .Include(x => x.QuayTiepDons)
            .Where(x => x.HoatDong == true && (!hasAssignments || allowedSet.Contains(x.Id)))
            .OrderBy(x => x.MaKhu)
            .ToListAsync();

        var defaultAreaId = allowedAreaIds.FirstOrDefault(x => x.LaMacDinh == true)?.IdKhuTiepDon
            ?? areas.FirstOrDefault()?.Id;
        var defaultCounterId = areas
            .FirstOrDefault(x => x.Id == defaultAreaId)?
            .QuayTiepDons
            .Where(x => x.HoatDong == true)
            .OrderBy(x => x.ThuTu ?? int.MaxValue)
            .ThenBy(x => x.MaQuay)
            .Select(x => (int?)x.Id)
            .FirstOrDefault();

        return Ok(new
        {
            defaultAreaId,
            defaultCounterId,
            items = areas.Select(area => new
            {
                id = area.Id,
                maKhu = area.MaKhu,
                tenKhu = area.TenKhu,
                moTa = area.MoTa,
                hoatDong = area.HoatDong,
                isDefault = defaultAreaId.HasValue && area.Id == defaultAreaId.Value,
                counters = area.QuayTiepDons
                    .Where(q => q.HoatDong == true)
                    .OrderBy(q => q.ThuTu ?? int.MaxValue)
                    .ThenBy(q => q.MaQuay)
                    .Select(q => new
                    {
                        id = q.Id,
                        maQuay = q.MaQuay,
                        tenQuay = q.TenQuay,
                        thuTu = q.ThuTu,
                        hoatDong = q.HoatDong,
                        idKhuTiepDon = q.IdKhuTiepDon,
                        isDefault = defaultCounterId.HasValue && q.Id == defaultCounterId.Value
                    })
            })
        });
    }

    [HttpPost("patients/upsert")]
    public async Task<IActionResult> UpsertPatient([FromBody] PatientCreateRequest req)
    {
        var denied = await EnsurePermissionAsync("them");
        if (denied != null) return denied;

        if (req == null)
        {
            return BadRequest(new { message = "Thiáº¿u dá»¯ liá»‡u bá»‡nh nhĂ¢n." });
        }

        var actorId = ResolveActorId(0);
        var patientDomainId = ComputePatientDomainKey(req);
        var patientIdemCacheKey = BuildIdempotencyKey(PatientIdempotencyCachePrefix, actorId, patientDomainId, req.IdempotencyKey);
        if (TryGetIdempotentResult(patientIdemCacheKey, out var cachedPayload))
        {
            return Ok(cachedPayload);
        }

        var errors = ValidatePatientRequest(req);
        if (errors.Count > 0)
        {
            return BadRequest(new { message = "Dá»¯ liá»‡u bá»‡nh nhĂ¢n chÆ°a há»£p lá»‡.", errors });
        }

        var cleanedCccd = Clean(req.CCCD);
        var cleanedPhone = Clean(req.So_dien_thoai);
        var cleanedFullName = Clean(req.Ho_ten);
        var cleanedGender = Clean(req.Gioi_tinh);

        var now = DateTime.Now;
        var existing = await FindPatientByPriorityAsync(new PatientLookupRequest
        {
            CCCD = cleanedCccd,
            MaBenhNhan = null,
            SoDienThoai = cleanedPhone,
            HoTen = cleanedFullName,
            NgaySinh = req.Ngay_sinh,
            GioiTinh = cleanedGender
        });
        var isNewPatient = existing == null;

        if (isNewPatient)
        {
            existing = new BenhNhan
            {
                MaBn = _code.GenMa("BN"),
                CreatedAt = now
            };
            _db.BenhNhans.Add(existing);
        }

        if (!string.IsNullOrWhiteSpace(cleanedCccd))
        {
            var duplicateCitizen = await _db.BenhNhans
                .AnyAsync(x => x.Id != existing.Id && x.Cccd == cleanedCccd);
            if (duplicateCitizen)
            {
                return Conflict(new { message = "CCCD Ä‘Ă£ tá»“n táº¡i á»Ÿ bá»‡nh nhĂ¢n khĂ¡c." });
            }
        }

        if (!string.IsNullOrWhiteSpace(cleanedPhone))
        {
            var duplicatePhone = await _db.BenhNhans
                .AnyAsync(x => x.Id != existing.Id && x.SoDienThoai == cleanedPhone);
            if (duplicatePhone)
            {
                return Conflict(new { message = "Sá»‘ Ä‘iá»‡n thoáº¡i Ä‘Ă£ tá»“n táº¡i á»Ÿ bá»‡nh nhĂ¢n khĂ¡c." });
            }
        }

        existing.HoTen = cleanedFullName;
        existing.NgaySinh = req.Ngay_sinh.HasValue ? DateOnly.FromDateTime(req.Ngay_sinh.Value) : null;
        existing.GioiTinh = cleanedGender;
        existing.Cccd = cleanedCccd;
        existing.SoDienThoai = cleanedPhone;
        existing.Email = Clean(req.Email);
        existing.NgheNghiep = Clean(req.Nghe_nghiep);
        existing.DiaChiDuong = Clean(req.Dia_chi_duong);
        existing.DiaChiXa = Clean(req.Dia_chi_xa);
        existing.DiaChiHuyen = Clean(req.Dia_chi_huyen);
        existing.DiaChiTinh = Clean(req.Dia_chi_tinh);
        existing.DanToc = Clean(req.Dan_toc);
        existing.QuocTich = Clean(req.Quoc_tich);
        existing.QuocGia = Clean(req.Quoc_gia) ?? "Viá»‡t Nam";
        existing.NguoiLienHeKhanCap = Clean(req.Nguoi_lien_he_khan_cap);
        existing.SdtLienHeKhanCap = Clean(req.Sdt_lien_he_khan_cap);
        existing.QuanHeLienHeKhanCap = Clean(req.Quan_he_lien_he_khan_cap);
        existing.NguoiGiamHo = Clean(req.Nguoi_giam_ho);
        existing.SdtGiamHo = Clean(req.Sdt_giam_ho);
        existing.QuanHeGiamHo = Clean(req.Quan_he_giam_ho);
        existing.GhiChuDinhDanh = Clean(req.Ghi_chu_dinh_danh);
        existing.IsPotentialDuplicate = req.Is_potential_duplicate;
        if (req.Is_potential_duplicate == true && !string.IsNullOrWhiteSpace(req.Duplicate_reason))
        {
            existing.GhiChuDinhDanh = AppendNote(existing.GhiChuDinhDanh, $"[Nghi trĂ¹ng] {req.Duplicate_reason.Trim()}");
        }
        existing.UpdatedAt = now;

        try
        {
            await _db.SaveChangesAsync();
        }
        catch (DbUpdateException ex) when (ex.InnerException is Microsoft.Data.SqlClient.SqlException sqlEx
            && (sqlEx.Number == 2601 || sqlEx.Number == 2627))
        {
            if (sqlEx.Message.Contains("UQ_BenhNhan_CCCD", StringComparison.OrdinalIgnoreCase))
            {
                return Conflict(new { message = "CCCD Ä‘Ă£ tá»“n táº¡i á»Ÿ bá»‡nh nhĂ¢n khĂ¡c." });
            }

            if (sqlEx.Message.Contains("UQ_BenhNhan_SDT", StringComparison.OrdinalIgnoreCase))
            {
                return Conflict(new { message = "Sá»‘ Ä‘iá»‡n thoáº¡i Ä‘Ă£ tá»“n táº¡i á»Ÿ bá»‡nh nhĂ¢n khĂ¡c." });
            }

            throw;
        }

        var today = DateTime.Today;
        var todayRecordRaw = await _db.HoSoBenhAns
            .AsNoTracking()
            .Where(h => h.IdBenhNhan == existing.Id && h.NgayTao.HasValue && h.NgayTao.Value.Date == today)
            .OrderByDescending(h => h.NgayTao)
            .Select(h => new
            {
                h.Id,
                h.MaHs,
                h.TrangThai
            })
            .FirstOrDefaultAsync();

        var todayRecord = todayRecordRaw == null
            ? null
            : new
            {
                todayRecordRaw.Id,
                todayRecordRaw.MaHs,
                TrangThai = _status.NormalizeStatus(todayRecordRaw.TrangThai)
            };

        var responsePayload = new
        {
            state = isNewPatient ? "NEW_PATIENT_CREATED" : "PATIENT_UPDATED",
            patient = ToPatientDto(existing),
            todayRecord,
            message = isNewPatient
                ? "Táº¡o bá»‡nh nhĂ¢n thĂ nh cĂ´ng."
                : "Cáº­p nháº­t thĂ´ng tin bá»‡nh nhĂ¢n thĂ nh cĂ´ng."
        };

        SetIdempotentResult(patientIdemCacheKey, responsePayload);
        return Ok(responsePayload);
    }

    [HttpPost("encounters/save")]
    public async Task<IActionResult> SaveEncounter([FromBody] ReceptionCreateRecordRequest dto)
    {
        var denied = await EnsurePermissionAsync("them");
        if (denied != null) return denied;

        if (dto == null || dto.IdBenhNhan <= 0)
        {
            return BadRequest(new { message = "ThiĂ¡ÂºÂ¿u bĂ¡Â»â€¡nh nhÄ‚Â¢n Ă„â€˜Ă¡Â»Æ’ tĂ¡ÂºÂ¡o tiĂ¡ÂºÂ¿p Ă„â€˜Ä‚Â³n." });
        }

        var actorId = ResolveActorId(dto.IdNguoiTao);
        var idemCacheKey = BuildIdempotencyKey(IdempotencyCachePrefix, actorId, dto.IdBenhNhan, dto.IdempotencyKey);
        if (TryGetIdempotentResult(idemCacheKey, out var cachedPayload))
        {
            return Ok(cachedPayload);
        }

        var intake = dto.ThongTinTiepDon;
        if (intake != null)
        {
            CanonicalizeReceptionInfo(intake);
            if (IsLooseEqual(intake.NguonTiepNhan, "Cấp cứu")
                || IsLooseEqual(intake.LoaiKham, "Cấp cứu")
                || IsLooseEqual(intake.MucUuTien, "Cấp cứu"))
            {
                intake.MucUuTien = "Cấp cứu";
                intake.LoaiKham = "Cấp cứu";
                if (string.IsNullOrWhiteSpace(intake.NguonTiepNhan))
                    intake.NguonTiepNhan = "Cấp cứu";
            }

            if (!intake.MucDoDau.HasValue && dto.SinhHieu?.MucDoDau.HasValue == true)
            {
                intake.MucDoDau = dto.SinhHieu.MucDoDau;
            }
            if (string.IsNullOrWhiteSpace(intake.BenhNen) && !string.IsNullOrWhiteSpace(dto.SinhHieu?.BenhNen))
            {
                intake.BenhNen = dto.SinhHieu?.BenhNen;
            }
            if (string.IsNullOrWhiteSpace(intake.TinhTrangDiUngThuoc) && !string.IsNullOrWhiteSpace(dto.SinhHieu?.DiUngThuoc))
            {
                intake.TinhTrangDiUngThuoc = dto.SinhHieu?.DiUngThuoc;
            }
            if (string.IsNullOrWhiteSpace(intake.TinhTrangMangThai) && !string.IsNullOrWhiteSpace(dto.SinhHieu?.TinhTrangMangThai))
            {
                intake.TinhTrangMangThai = dto.SinhHieu?.TinhTrangMangThai;
            }
            if ((intake.TrieuChungNguyHiem == null || intake.TrieuChungNguyHiem.Count == 0)
                && dto.SinhHieu?.TrieuChungNguyHiem?.Count > 0)
            {
                intake.TrieuChungNguyHiem = dto.SinhHieu.TrieuChungNguyHiem;
            }
        }

        var areaSelection = await ResolveReceptionAreaAsync(intake, actorId);
        if (!areaSelection.Success || areaSelection.Area == null)
        {
            return BadRequest(new
            {
                message = areaSelection.Error ?? "Chưa chọn khu tiếp đón hợp lệ.",
                errors = new Dictionary<string, string>
                {
                    ["id_khu_tiep_don"] = areaSelection.Error ?? "Chưa chọn khu tiếp đón hợp lệ."
                }
            });
        }
        ApplyReceptionArea(intake, areaSelection.Area, areaSelection.Counter);

        var intakeErrors = ValidateReceptionInfo(intake);
        if (intakeErrors.Count > 0)
        {
            return BadRequest(new { message = "ThÄ‚Â´ng tin tiĂ¡ÂºÂ¿p Ă„â€˜Ä‚Â³n chĂ†Â°a hĂ¡Â»Â£p lĂ¡Â»â€¡.", errors = intakeErrors });
        }

        if (dto.SinhHieu != null)
        {
            var vitalErrors = ValidateVitalSigns(dto.SinhHieu);
            if (vitalErrors.Count > 0)
            {
                return BadRequest(new { message = "Sinh hiĂ¡Â»â€¡u chĂ†Â°a hĂ¡Â»Â£p lĂ¡Â»â€¡.", errors = vitalErrors });
            }
        }

        var patient = await _db.BenhNhans.FirstOrDefaultAsync(x => x.Id == dto.IdBenhNhan);
        if (patient == null)
        {
            return NotFound(new { message = "KhÄ‚Â´ng tÄ‚Â¬m thĂ¡ÂºÂ¥y bĂ¡Â»â€¡nh nhÄ‚Â¢n." });
        }

        var now = DateTime.Now;
        var today = now.Date;
        DatLich? matchedAppointment = null;
        var isLateAppointment = false;
        var currentRole = GetCurrentRoleCode();

        if (!string.IsNullOrWhiteSpace(intake?.NguonTiepNhan)
            && IsLooseEqual(intake.NguonTiepNhan, "Đặt lịch")
            && !string.IsNullOrWhiteSpace(intake.AppointmentCode))
        {
            matchedAppointment = await _db.DatLiches
                .FirstOrDefaultAsync(x =>
                    x.MaDatLich == intake.AppointmentCode!.Trim()
                    && x.IdBenhNhan == dto.IdBenhNhan);

            if (matchedAppointment != null)
            {
                var expectedDateTime = matchedAppointment.Ngay.ToDateTime(matchedAppointment.GioBatDau);
                isLateAppointment = now > expectedDateTime.AddMinutes(15);
                matchedAppointment.TrangThai = "DA_CHECKIN";
                matchedAppointment.UpdatedAt = now;
                intake.IsAppointmentLate = isLateAppointment;
            }
        }

        if (dto.IdHoSo.HasValue && dto.IdHoSo.Value > 0)
        {
            var hoSoUpdate = await _db.HoSoBenhAns
                .Include(h => h.LanKhams)
                    .ThenInclude(l => l.SinhHieus)
                .FirstOrDefaultAsync(h => h.Id == dto.IdHoSo.Value && h.IdBenhNhan == dto.IdBenhNhan);

            if (hoSoUpdate == null)
            {
                return NotFound(new { message = "KhÄ‚Â´ng tÄ‚Â¬m thĂ¡ÂºÂ¥y hĂ¡Â»â€œ sĂ†Â¡ Ă„â€˜Ă¡Â»Æ’ cĂ¡ÂºÂ­p nhĂ¡ÂºÂ­t." });
            }

            if (!_status.CanEditEncounter(hoSoUpdate.TrangThai, currentRole))
            {
                return BadRequest(new { message = "HĂ¡Â»â€œ sĂ†Â¡ hiĂ¡Â»â€¡n tĂ¡ÂºÂ¡i khÄ‚Â´ng cho phÄ‚Â©p Reception cĂ¡ÂºÂ­p nhĂ¡ÂºÂ­t thÄ‚Â´ng tin tiĂ¡ÂºÂ¿p Ă„â€˜Ä‚Â³n." });
            }

            var oldAreaId = hoSoUpdate.IdKhuTiepDon;
            var isCrossAreaUpdate = oldAreaId.HasValue && oldAreaId.Value != areaSelection.Area.Id;
            if (isCrossAreaUpdate && string.IsNullOrWhiteSpace(intake?.LyDoChuyenKhu))
            {
                return BadRequest(new
                {
                    state = "NEED_AREA_TRANSFER_REASON",
                    message = "Hồ sơ đang thuộc khu khác. Cần nhập lý do chuyển/nhận hồ sơ sang khu hiện tại.",
                    errors = new Dictionary<string, string>
                    {
                        ["ly_do_chuyen_khu"] = "Cần nhập lý do chuyển/nhận hồ sơ sang khu hiện tại."
                    }
                });
            }

            hoSoUpdate.IdKhuTiepDon = areaSelection.Area.Id;
            hoSoUpdate.IdQuayTiepDon = areaSelection.Counter?.Id;
            hoSoUpdate.GhiChu = SerializeEncounterMeta(intake);
            hoSoUpdate.UpdatedAt = now;

            if (isCrossAreaUpdate)
            {
                _db.TiepDonTrangThaiLogs.Add(new TiepDonTrangThaiLog
                {
                    IdHoSo = hoSoUpdate.Id,
                    FromTrangThai = _status.NormalizeStatus(hoSoUpdate.TrangThai),
                    ToTrangThai = _status.NormalizeStatus(hoSoUpdate.TrangThai),
                    Action = "CROSS_AREA_RECEIVED",
                    Note = $"Nhận hồ sơ sang {areaSelection.Area.TenKhu}: {intake?.LyDoChuyenKhu}",
                    IdNguoiDung = actorId,
                    CreatedAt = now,
                    Metadata = JsonSerializer.Serialize(new
                    {
                        fromAreaId = oldAreaId,
                        toAreaId = areaSelection.Area.Id,
                        counterId = areaSelection.Counter?.Id,
                        reason = intake?.LyDoChuyenKhu
                    })
                });
            }

            _db.TiepDonTrangThaiLogs.Add(new TiepDonTrangThaiLog
            {
                IdHoSo = hoSoUpdate.Id,
                FromTrangThai = _status.NormalizeStatus(hoSoUpdate.TrangThai),
                ToTrangThai = _status.NormalizeStatus(hoSoUpdate.TrangThai),
                Action = "ENCOUNTER_UPDATED",
                Note = "CĂ¡ÂºÂ­p nhĂ¡ÂºÂ­t thÄ‚Â´ng tin tiĂ¡ÂºÂ¿p Ă„â€˜Ä‚Â³n/hÄ‚Â nh chÄ‚Â­nh.",
                IdNguoiDung = actorId,
                CreatedAt = now
            });

            if (dto.ChuyenSangDangKyDichVu)
            {
                var moveResult = _status.ApplyTransition(
                    hoSoUpdate,
                    HoSoTrangThaiService.ChoDichVu,
                    actorId,
                    "MOVE_TO_SERVICE_REGISTRATION",
                    "MĂ¡Â»Å¸ lĂ¡ÂºÂ¡i bĂ†Â°Ă¡Â»â€ºc Ă„â€˜Ă„Æ’ng kÄ‚Â½ dĂ¡Â»â€¹ch vĂ¡Â»Â¥ tĂ¡Â»Â« hĂ¡Â»â€œ sĂ†Â¡ hiĂ¡Â»â€¡n tĂ¡ÂºÂ¡i.");
                if (!moveResult.Success)
                {
                    return BadRequest(new { message = moveResult.ErrorMessage });
                }
            }

            var lanKhamUpdate = hoSoUpdate.LanKhams
                .OrderByDescending(l => l.CreatedAt ?? l.ThoiGianBatDau)
                .FirstOrDefault();

            if (lanKhamUpdate == null)
            {
                lanKhamUpdate = new LanKham
                {
                    IdHoSo = hoSoUpdate.Id,
                    IdBenhNhan = hoSoUpdate.IdBenhNhan,
                    TrangThai = "TIEP_DON",
                    CreatedAt = now,
                    UpdatedAt = now,
                    IdTiepDon = actorId
                };
                _db.LanKhams.Add(lanKhamUpdate);
                await _db.SaveChangesAsync();
            }

            lanKhamUpdate.LyDo = intake?.LyDoKham;
            lanKhamUpdate.UpdatedAt = now;

            if (dto.SinhHieu != null)
            {
                var existingVital = lanKhamUpdate.IdSinhHieu.HasValue
                    ? await _db.SinhHieus.FirstOrDefaultAsync(x => x.Id == lanKhamUpdate.IdSinhHieu.Value)
                    : await _db.SinhHieus
                        .OrderByDescending(x => x.ThoiGianDo)
                        .FirstOrDefaultAsync(x => x.IdLanKham == lanKhamUpdate.Id);

                if (existingVital == null)
                {
                    existingVital = new SinhHieu
                    {
                        IdLanKham = lanKhamUpdate.Id,
                        ThoiGianDo = now
                    };
                    _db.SinhHieus.Add(existingVital);
                }

                existingVital.NhietDo = dto.SinhHieu.NhietDo;
                existingVital.HuyetApTamThu = dto.SinhHieu.HuyetApTamThu;
                existingVital.HuyetApTamTruong = dto.SinhHieu.HuyetApTamTruong;
                existingVital.NhipTim = dto.SinhHieu.NhipTim;
                existingVital.NhipTho = dto.SinhHieu.NhipTho;
                existingVital.SpO2 = dto.SinhHieu.SpO2;
                existingVital.ChieuCao = dto.SinhHieu.ChieuCao;
                existingVital.CanNang = dto.SinhHieu.CanNang;
                existingVital.Bmi = dto.SinhHieu.Bmi;
                existingVital.ThoiGianDo = now;

                _db.TiepDonTrangThaiLogs.Add(new TiepDonTrangThaiLog
                {
                    IdHoSo = hoSoUpdate.Id,
                    FromTrangThai = _status.NormalizeStatus(hoSoUpdate.TrangThai),
                    ToTrangThai = _status.NormalizeStatus(hoSoUpdate.TrangThai),
                    Action = "VITALS_UPDATED",
                    Note = "CĂ¡ÂºÂ­p nhĂ¡ÂºÂ­t sinh hiĂ¡Â»â€¡u tĂ¡ÂºÂ¡i mÄ‚Â n tiĂ¡ÂºÂ¿p Ă„â€˜Ä‚Â³n.",
                    IdNguoiDung = actorId,
                    CreatedAt = now,
                    Metadata = JsonSerializer.Serialize(new
                    {
                        dto.SinhHieu.NhietDo,
                        dto.SinhHieu.NhipTim,
                        dto.SinhHieu.SpO2,
                        dto.SinhHieu.HuyetApTamThu,
                        dto.SinhHieu.HuyetApTamTruong
                    })
                });
            }

            await _db.SaveChangesAsync();
            var updatePayload = new
            {
                state = "ENCOUNTER_UPDATED",
                message = dto.ChuyenSangDangKyDichVu
                    ? "Ă„ÂÄ‚Â£ cĂ¡ÂºÂ­p nhĂ¡ÂºÂ­t tiĂ¡ÂºÂ¿p Ă„â€˜Ä‚Â³n, chuyĂ¡Â»Æ’n sang bĂ†Â°Ă¡Â»â€ºc chĂ¡Â»Ân dĂ¡Â»â€¹ch vĂ¡Â»Â¥."
                    : "CĂ¡ÂºÂ­p nhĂ¡ÂºÂ­t tiĂ¡ÂºÂ¿p Ă„â€˜Ä‚Â³n thÄ‚Â nh cÄ‚Â´ng.",
                encounter = new
                {
                    hoSoUpdate.Id,
                    hoSoUpdate.MaHs,
                    TrangThai = _status.NormalizeStatus(hoSoUpdate.TrangThai),
                    hoSoUpdate.NgayTao,
                    IdLanKham = lanKhamUpdate.Id,
                    KhuTiepDon = BuildAreaDto(areaSelection.Area.Id, areaSelection.Area.MaKhu, areaSelection.Area.TenKhu),
                    QuayTiepDon = BuildCounterDto(areaSelection.Counter?.Id, areaSelection.Counter?.MaQuay, areaSelection.Counter?.TenQuay)
                }
            };

            SetIdempotentResult(idemCacheKey, updatePayload);
            return Ok(updatePayload);
        }

        await using var tx = await _db.Database.BeginTransactionAsync(IsolationLevel.Serializable);

        var todayRecords = await _db.HoSoBenhAns
            .Include(h => h.IdKhuTiepDonNavigation)
            .Include(h => h.IdQuayTiepDonNavigation)
            .Where(h => h.IdBenhNhan == dto.IdBenhNhan && h.NgayTao.HasValue && h.NgayTao.Value.Date == today)
            .OrderByDescending(h => h.NgayTao)
            .ToListAsync();

        var activeRecord = todayRecords.FirstOrDefault(r => _status.IsActiveReceptionFlow(r.TrangThai));
        if (activeRecord != null)
        {
            await tx.RollbackAsync();
            return Conflict(new
            {
                state = activeRecord.IdKhuTiepDon.HasValue && activeRecord.IdKhuTiepDon.Value != areaSelection.Area.Id
                    ? "ACTIVE_ENCOUNTER_IN_OTHER_AREA"
                    : "ACTIVE_ENCOUNTER_EXISTS",
                message = activeRecord.IdKhuTiepDon.HasValue && activeRecord.IdKhuTiepDon.Value != areaSelection.Area.Id
                    ? $"Bệnh nhân đang có hồ sơ hoạt động tại {activeRecord.IdKhuTiepDonNavigation?.TenKhu ?? "khu khác"}. Vui lòng nạp hồ sơ cũ và nhập lý do chuyển/nhận khu nếu cần."
                    : "Bệnh nhân đã có hồ sơ đang hoạt động trong ngày. Vui lòng mở lại hồ sơ cũ.",
                encounter = BuildEncounterRef(activeRecord)
            });
        }

        var completedRecord = todayRecords.FirstOrDefault(r => _status.IsClosedOrCompleted(r.TrangThai));
        if (completedRecord != null && string.IsNullOrWhiteSpace(intake?.LyDoTaoThemLuotTrongNgay))
        {
            await tx.RollbackAsync();
            return Conflict(new
            {
                state = "NEED_ADDITIONAL_VISIT_REASON",
                message = "BĂ¡Â»â€¡nh nhÄ‚Â¢n Ă„â€˜Ä‚Â£ khÄ‚Â¡m xong trong ngÄ‚Â y. CĂ¡ÂºÂ§n nhĂ¡ÂºÂ­p lÄ‚Â½ do tĂ¡ÂºÂ¡o thÄ‚Âªm lĂ†Â°Ă¡Â»Â£t khÄ‚Â¡m.",
                encounter = BuildEncounterRef(completedRecord)
            });
        }

        var hoSo = new HoSoBenhAn
        {
            IdBenhNhan = patient.Id,
            MaHs = _code.GenMa("HS"),
            NgayTao = now,
            IdNguoiTao = actorId,
            IdKhuTiepDon = areaSelection.Area.Id,
            IdQuayTiepDon = areaSelection.Counter?.Id,
            GhiChu = SerializeEncounterMeta(intake),
            TrangThai = null
        };
        _db.HoSoBenhAns.Add(hoSo);
        try
        {
            await _db.SaveChangesAsync();
        }
        catch (DbUpdateException ex) when (IsDuplicateActiveEncounterIndex(ex))
        {
            await tx.RollbackAsync();
            return Conflict(new
            {
                state = "ACTIVE_ENCOUNTER_EXISTS",
                message = "BĂ¡Â»â€¡nh nhÄ‚Â¢n Ă„â€˜Ä‚Â£ cÄ‚Â³ hĂ¡Â»â€œ sĂ†Â¡ Ă„â€˜ang hoĂ¡ÂºÂ¡t Ă„â€˜Ă¡Â»â„¢ng trong ngÄ‚Â y. Vui lÄ‚Â²ng mĂ¡Â»Å¸ lĂ¡ÂºÂ¡i hĂ¡Â»â€œ sĂ†Â¡ cĂ…Â©."
            });
        }

        var trans1 = _status.ApplyTransition(
            hoSo,
            HoSoTrangThaiService.MoiTao,
            actorId,
            "ENCOUNTER_CREATED",
            "TĂ¡ÂºÂ¡o hĂ¡Â»â€œ sĂ†Â¡ lĂ†Â°Ă¡Â»Â£t khÄ‚Â¡m mĂ¡Â»â€ºi tĂ¡Â»Â« tiĂ¡ÂºÂ¿p Ă„â€˜Ä‚Â³n."
        );
        if (!trans1.Success)
        {
            await tx.RollbackAsync();
            return BadRequest(new { message = trans1.ErrorMessage });
        }

        var trans2 = _status.ApplyTransition(
            hoSo,
            HoSoTrangThaiService.DaTiepDon,
            actorId,
            "RECEPTION_COMPLETED",
            "HoÄ‚Â n tĂ¡ÂºÂ¥t nhĂ¡ÂºÂ­p thÄ‚Â´ng tin tiĂ¡ÂºÂ¿p Ă„â€˜Ä‚Â³n."
        );
        if (!trans2.Success)
        {
            await tx.RollbackAsync();
            return BadRequest(new { message = trans2.ErrorMessage });
        }

        if (dto.ChuyenSangDangKyDichVu)
        {
            var trans3 = _status.ApplyTransition(
                hoSo,
                HoSoTrangThaiService.ChoDichVu,
                actorId,
                "MOVE_TO_SERVICE_REGISTRATION",
                "ChuyĂ¡Â»Æ’n sang mÄ‚Â n Ă„â€˜Ă„Æ’ng kÄ‚Â½ dĂ¡Â»â€¹ch vĂ¡Â»Â¥ phÄ‚Â²ng khÄ‚Â¡m."
            );
            if (!trans3.Success)
            {
                await tx.RollbackAsync();
                return BadRequest(new { message = trans3.ErrorMessage });
            }
        }

        if (matchedAppointment != null)
        {
            _db.TiepDonTrangThaiLogs.Add(new TiepDonTrangThaiLog
            {
                IdHoSo = hoSo.Id,
                FromTrangThai = _status.NormalizeStatus(hoSo.TrangThai),
                ToTrangThai = _status.NormalizeStatus(hoSo.TrangThai),
                Action = "APPOINTMENT_CHECKED_IN",
                Note = isLateAppointment
                    ? "Check-in lĂ¡Â»â€¹ch hĂ¡ÂºÂ¹n: bĂ¡Â»â€¡nh nhÄ‚Â¢n Ă„â€˜Ă¡ÂºÂ¿n trĂ¡Â»â€¦ so vĂ¡Â»â€ºi giĂ¡Â»Â hĂ¡ÂºÂ¹n."
                    : "Check-in lĂ¡Â»â€¹ch hĂ¡ÂºÂ¹n thÄ‚Â nh cÄ‚Â´ng.",
                IdNguoiDung = actorId,
                CreatedAt = now,
                Metadata = JsonSerializer.Serialize(new
                {
                    matchedAppointment.Id,
                    matchedAppointment.MaDatLich,
                    matchedAppointment.Ngay,
                    matchedAppointment.GioBatDau,
                    isLate = isLateAppointment
                })
            });
        }

        var lanKham = new LanKham
        {
            IdHoSo = hoSo.Id,
            IdBenhNhan = patient.Id,
            TrangThai = "TIEP_DON",
            LyDo = intake?.LyDoKham,
            CreatedAt = now,
            UpdatedAt = now,
            IdTiepDon = actorId,
            ThoiGianBatDau = now
        };
        _db.LanKhams.Add(lanKham);
        await _db.SaveChangesAsync();

        if (dto.SinhHieu != null)
        {
            var sh = new SinhHieu
            {
                IdLanKham = lanKham.Id,
                NhietDo = dto.SinhHieu.NhietDo,
                HuyetApTamThu = dto.SinhHieu.HuyetApTamThu,
                HuyetApTamTruong = dto.SinhHieu.HuyetApTamTruong,
                NhipTim = dto.SinhHieu.NhipTim,
                NhipTho = dto.SinhHieu.NhipTho,
                SpO2 = dto.SinhHieu.SpO2,
                ChieuCao = dto.SinhHieu.ChieuCao,
                CanNang = dto.SinhHieu.CanNang,
                Bmi = dto.SinhHieu.Bmi,
                ThoiGianDo = now
            };
            _db.SinhHieus.Add(sh);
            await _db.SaveChangesAsync();

            lanKham.IdSinhHieu = sh.Id;
            lanKham.UpdatedAt = now;

            _db.TiepDonTrangThaiLogs.Add(new TiepDonTrangThaiLog
            {
                IdHoSo = hoSo.Id,
                FromTrangThai = _status.NormalizeStatus(hoSo.TrangThai),
                ToTrangThai = _status.NormalizeStatus(hoSo.TrangThai),
                Action = "VITALS_CAPTURED",
                Note = "NhĂ¡ÂºÂ­p sinh hiĂ¡Â»â€¡u ban Ă„â€˜Ă¡ÂºÂ§u tĂ¡ÂºÂ¡i quĂ¡ÂºÂ§y tiĂ¡ÂºÂ¿p Ă„â€˜Ä‚Â³n.",
                IdNguoiDung = actorId,
                CreatedAt = now,
                Metadata = JsonSerializer.Serialize(new
                {
                    dto.SinhHieu.NhietDo,
                    dto.SinhHieu.NhipTim,
                    dto.SinhHieu.SpO2,
                    dto.SinhHieu.HuyetApTamThu,
                    dto.SinhHieu.HuyetApTamTruong
                })
            });
            await _db.SaveChangesAsync();
        }

        await tx.CommitAsync();

        var responsePayload = new
        {
            state = "ENCOUNTER_CREATED",
            message = dto.ChuyenSangDangKyDichVu
                ? "LĂ†Â°u tiĂ¡ÂºÂ¿p Ă„â€˜Ä‚Â³n thÄ‚Â nh cÄ‚Â´ng, sĂ¡ÂºÂµn sÄ‚Â ng chĂ¡Â»Ân dĂ¡Â»â€¹ch vĂ¡Â»Â¥."
                : "LĂ†Â°u tiĂ¡ÂºÂ¿p Ă„â€˜Ä‚Â³n thÄ‚Â nh cÄ‚Â´ng.",
            encounter = new
            {
                hoSo.Id,
                hoSo.MaHs,
                TrangThai = _status.NormalizeStatus(hoSo.TrangThai),
                hoSo.NgayTao,
                IdLanKham = lanKham.Id,
                KhuTiepDon = BuildAreaDto(areaSelection.Area.Id, areaSelection.Area.MaKhu, areaSelection.Area.TenKhu),
                QuayTiepDon = BuildCounterDto(areaSelection.Counter?.Id, areaSelection.Counter?.MaQuay, areaSelection.Counter?.TenQuay)
            }
        };

        SetIdempotentResult(idemCacheKey, responsePayload);
        return Ok(responsePayload);
    }

    [HttpPatch("encounters/{id:long}/cancel")]
    public async Task<IActionResult> CancelEncounter(long id, [FromBody] CancelReceptionRequest req)
    {
        var denied = await EnsurePermissionAsync("xoa");
        if (denied != null) return denied;

        if (req == null)
        {
            return BadRequest(new { message = "ThiĂ¡ÂºÂ¿u thÄ‚Â´ng tin hĂ¡Â»Â§y hĂ¡Â»â€œ sĂ†Â¡." });
        }

        var cancelReasonCatalog = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            ["BENH_NHAN_KHONG_TIEP_TUC"] = "Bệnh nhân không tiếp tục khám",
            ["NHAP_NHAM_THONG_TIN"] = "Nhập nhầm thông tin",
            ["TAO_TRUNG_HO_SO"] = "Tạo trùng hồ sơ",
            ["SAI_DICH_VU_PHONG"] = "Sai dịch vụ/phòng khám",
            ["CHUYEN_CO_SO"] = "Bệnh nhân chuyển cơ sở khác",
            ["KHAC"] = "Lý do khác"
        };

        var reasonCode = Clean(req.MaLyDoHuy);
        if (!string.IsNullOrWhiteSpace(reasonCode) && !cancelReasonCatalog.ContainsKey(reasonCode))
        {
            return BadRequest(new { message = "MÄ‚Â£ lÄ‚Â½ do hĂ¡Â»Â§y khÄ‚Â´ng hĂ¡Â»Â£p lĂ¡Â»â€¡." });
        }

        var reasonText = Clean(req.LyDoHuy);
        if (string.IsNullOrWhiteSpace(reasonText) && !string.IsNullOrWhiteSpace(reasonCode))
        {
            reasonText = cancelReasonCatalog[reasonCode];
        }

        if (string.IsNullOrWhiteSpace(reasonText))
        {
            return BadRequest(new { message = "LÄ‚Â½ do hĂ¡Â»Â§y lÄ‚Â  bĂ¡ÂºÂ¯t buĂ¡Â»â„¢c." });
        }

        if (string.Equals(reasonCode, "KHAC", StringComparison.OrdinalIgnoreCase)
            && string.IsNullOrWhiteSpace(req.GhiChu))
        {
            return BadRequest(new { message = "ChĂ¡Â»Ân 'LÄ‚Â½ do khÄ‚Â¡c' thÄ‚Â¬ cĂ¡ÂºÂ§n nhĂ¡ÂºÂ­p ghi chÄ‚Âº." });
        }

        var actorId = GetCurrentUserId();
        var currentRole = GetCurrentRoleCode();
        var hoSo = await _db.HoSoBenhAns
            .Include(h => h.LanKhams)
                .ThenInclude(l => l.LanKhamDichVus)
            .Include(h => h.LanKhams)
                .ThenInclude(l => l.ChiDinhDvkts)
            .FirstOrDefaultAsync(h => h.Id == id);

        if (hoSo == null)
        {
            return NotFound(new { message = "KhÄ‚Â´ng tÄ‚Â¬m thĂ¡ÂºÂ¥y hĂ¡Â»â€œ sĂ†Â¡." });
        }

        var normalized = _status.NormalizeStatus(hoSo.TrangThai);
        if (!_status.CanCancelEncounter(normalized, currentRole))
        {
            return BadRequest(new { message = "TrĂ¡ÂºÂ¡ng thÄ‚Â¡i hiĂ¡Â»â€¡n tĂ¡ÂºÂ¡i khÄ‚Â´ng cho phÄ‚Â©p hĂ¡Â»Â§y hĂ¡Â»â€œ sĂ†Â¡ tiĂ¡ÂºÂ¿p Ă„â€˜Ä‚Â³n." });
        }

        var guard = await GetEncounterMutationGuardAsync(hoSo.Id, hoSo.IdBenhNhan, hoSo.NgayTao);
        if (guard.BlocksCancel)
        {
            return BadRequest(new
            {
                state = guard.State,
                message = guard.Message,
                details = guard.Details
            });
        }

        await using var tx = await _db.Database.BeginTransactionAsync();

        foreach (var lk in hoSo.LanKhams)
        {
            var lkStatus = (lk.TrangThai ?? string.Empty).Trim().ToUpperInvariant();
            if (lkStatus is "DA_KHAM" or "DA_THANH_TOAN") continue;

            lk.TrangThai = "DA_HUY";
            lk.UpdatedAt = DateTime.Now;
            lk.GhiChu = AppendNote(lk.GhiChu, $"HĂ¡Â»Â§y tiĂ¡ÂºÂ¿p Ă„â€˜Ä‚Â³n: {reasonText}");

            foreach (var line in lk.LanKhamDichVus)
            {
                var lineStatus = (line.TrangThaiThucHien ?? string.Empty).Trim().ToUpperInvariant();
                if (lineStatus is "HOAN_THANH" or "DA_HUY") continue;
                line.TrangThaiThucHien = "DA_HUY";
                line.GhiChu = AppendNote(line.GhiChu, $"HĂ¡Â»Â§y tĂ¡Â»Â« tiĂ¡ÂºÂ¿p Ă„â€˜Ä‚Â³n: {reasonText}");
            }

            foreach (var cd in lk.ChiDinhDvkts)
            {
                var cdStatus = (cd.TrangThai ?? string.Empty).Trim().ToLowerInvariant();
                if (cdStatus is "done" or "completed" or "canceled") continue;
                cd.TrangThai = "canceled";
            }
        }

        var relatedInvoices = await _db.HoaDons
            .Where(h => h.IdBenhNhan == hoSo.IdBenhNhan
                && h.NgayTao.HasValue
                && hoSo.NgayTao.HasValue
                && h.NgayTao.Value.Date == hoSo.NgayTao.Value.Date
                && h.TrangThai != "DA_THANH_TOAN")
            .ToListAsync();

        foreach (var hd in relatedInvoices)
        {
            hd.TrangThai = "HUY";
            hd.GhiChu = AppendNote(hd.GhiChu, $"HĂ¡Â»Â§y hĂ¡Â»â€œ sĂ†Â¡ tiĂ¡ÂºÂ¿p Ă„â€˜Ä‚Â³n: {reasonText}");
        }

        var transition = _status.ApplyTransition(
            hoSo,
            HoSoTrangThaiService.DaHuy,
            actorId,
            "CANCEL_ENCOUNTER",
            req.GhiChu ?? reasonText,
            new
            {
                reasonCode,
                reason = reasonText,
                note = req.GhiChu
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
            message = "Ă„ÂÄ‚Â£ hĂ¡Â»Â§y hĂ¡Â»â€œ sĂ†Â¡ tiĂ¡ÂºÂ¿p Ă„â€˜Ä‚Â³n thÄ‚Â nh cÄ‚Â´ng.",
            encounter = new { hoSo.Id, hoSo.MaHs, TrangThai = _status.NormalizeStatus(hoSo.TrangThai) }
        });
    }

    [HttpPatch("encounters/{id:long}/transfer/request")]
    public async Task<IActionResult> RequestAreaTransfer(long id, [FromBody] AreaTransferRequestDto req)
    {
        var denied = await EnsurePermissionAsync("sua");
        if (denied != null) return denied;

        if (req == null || req.IdKhuTiepDonMoi <= 0)
            return BadRequest(new { message = "Cần chọn khu tiếp đón đích." });
        if (string.IsNullOrWhiteSpace(req.LyDo))
            return BadRequest(new { message = "Chuyển khu phải nhập lý do." });

        var actorId = GetCurrentUserId();
        var role = GetCurrentRoleCode();
        var hoSo = await _db.HoSoBenhAns
            .Include(h => h.IdKhuTiepDonNavigation)
            .FirstOrDefaultAsync(h => h.Id == id);
        if (hoSo == null)
            return NotFound(new { message = "Không tìm thấy hồ sơ tiếp đón." });

        var status = _status.NormalizeStatus(hoSo.TrangThai);
        if (!_status.CanEditEncounter(status, role))
            return BadRequest(new { message = $"Trạng thái '{status}' không cho phép yêu cầu chuyển khu." });
        if (hoSo.IdKhuTiepDon == req.IdKhuTiepDonMoi)
            return BadRequest(new { message = "Hồ sơ đã thuộc khu được chọn." });

        var guard = await GetEncounterMutationGuardAsync(hoSo.Id, hoSo.IdBenhNhan, hoSo.NgayTao);
        if (guard.BlocksAreaTransfer)
            return BadRequest(new { state = guard.State, message = guard.Message, details = guard.Details });

        var targetArea = await _db.KhuTiepDons.FirstOrDefaultAsync(x => x.Id == req.IdKhuTiepDonMoi && x.HoatDong == true);
        if (targetArea == null)
            return BadRequest(new { message = "Khu tiếp đón đích không hợp lệ hoặc đã tạm ngưng." });

        QuayTiepDon? targetCounter = null;
        if (req.IdQuayTiepDonMoi.HasValue)
        {
            targetCounter = await _db.QuayTiepDons.FirstOrDefaultAsync(x =>
                x.Id == req.IdQuayTiepDonMoi.Value &&
                x.IdKhuTiepDon == targetArea.Id &&
                x.HoatDong == true);
            if (targetCounter == null)
                return BadRequest(new { message = "Quầy tiếp đón đích không thuộc khu được chọn hoặc đã tạm ngưng." });
        }

        var transition = _status.ApplyTransition(
            hoSo,
            HoSoTrangThaiService.ChoChuyenKhu,
            actorId,
            "AREA_TRANSFER_REQUESTED",
            req.LyDo,
            new
            {
                fromStatus = status,
                fromAreaId = hoSo.IdKhuTiepDon,
                fromAreaCode = hoSo.IdKhuTiepDonNavigation?.MaKhu,
                fromAreaName = hoSo.IdKhuTiepDonNavigation?.TenKhu,
                targetAreaId = targetArea.Id,
                targetAreaCode = targetArea.MaKhu,
                targetAreaName = targetArea.TenKhu,
                targetCounterId = targetCounter?.Id,
                targetCounterCode = targetCounter?.MaQuay,
                targetCounterName = targetCounter?.TenQuay,
                note = req.GhiChu
            });
        if (!transition.Success)
            return BadRequest(new { message = transition.ErrorMessage });

        await _db.SaveChangesAsync();
        return Ok(new
        {
            message = "Đã tạo yêu cầu chuyển khu.",
            encounter = new
            {
                hoSo.Id,
                hoSo.MaHs,
                trangThai = _status.NormalizeStatus(hoSo.TrangThai),
                targetArea = BuildAreaDto(targetArea.Id, targetArea.MaKhu, targetArea.TenKhu),
                targetCounter = BuildCounterDto(targetCounter?.Id, targetCounter?.MaQuay, targetCounter?.TenQuay)
            }
        });
    }

    [HttpPatch("encounters/{id:long}/transfer/accept")]
    public async Task<IActionResult> AcceptAreaTransfer(long id, [FromBody] AreaTransferAcceptDto req)
    {
        var denied = await EnsurePermissionAsync("sua");
        if (denied != null) return denied;

        var actorId = GetCurrentUserId();
        var hoSo = await _db.HoSoBenhAns.FirstOrDefaultAsync(h => h.Id == id);
        if (hoSo == null)
            return NotFound(new { message = "Không tìm thấy hồ sơ tiếp đón." });

        var status = _status.NormalizeStatus(hoSo.TrangThai);
        if (status != HoSoTrangThaiService.ChoChuyenKhu)
            return BadRequest(new { message = "Hồ sơ chưa ở trạng thái chờ chuyển khu." });

        var transferLog = await GetLatestAreaTransferLogAsync(id);
        var targetAreaId = ReadIntFromLogMetadata(transferLog?.Metadata, "targetAreaId");
        if (!targetAreaId.HasValue)
            return BadRequest(new { message = "Không tìm thấy thông tin khu đích của yêu cầu chuyển." });

        var targetArea = await _db.KhuTiepDons.FirstOrDefaultAsync(x => x.Id == targetAreaId.Value && x.HoatDong == true);
        if (targetArea == null)
            return BadRequest(new { message = "Khu tiếp đón đích không còn hợp lệ." });

        var counterId = req?.IdQuayTiepDonMoi ?? ReadIntFromLogMetadata(transferLog?.Metadata, "targetCounterId");
        QuayTiepDon? targetCounter = null;
        if (counterId.HasValue)
        {
            targetCounter = await _db.QuayTiepDons.FirstOrDefaultAsync(x =>
                x.Id == counterId.Value &&
                x.IdKhuTiepDon == targetArea.Id &&
                x.HoatDong == true);
            if (targetCounter == null)
                return BadRequest(new { message = "Quầy tiếp đón nhận khu không hợp lệ." });
        }

        var fromAreaId = hoSo.IdKhuTiepDon;
        hoSo.IdKhuTiepDon = targetArea.Id;
        hoSo.IdQuayTiepDon = targetCounter?.Id;

        var transition = _status.ApplyTransition(
            hoSo,
            HoSoTrangThaiService.DaNhanKhuMoi,
            actorId,
            "AREA_TRANSFER_ACCEPTED",
            req?.GhiChu ?? $"Đã nhận hồ sơ tại {targetArea.TenKhu}",
            new
            {
                fromAreaId,
                toAreaId = targetArea.Id,
                toAreaCode = targetArea.MaKhu,
                toAreaName = targetArea.TenKhu,
                counterId = targetCounter?.Id,
                counterCode = targetCounter?.MaQuay,
                counterName = targetCounter?.TenQuay
            });
        if (!transition.Success)
            return BadRequest(new { message = transition.ErrorMessage });

        await _db.SaveChangesAsync();
        return Ok(new
        {
            message = "Đã nhận hồ sơ sang khu mới.",
            encounter = new
            {
                hoSo.Id,
                hoSo.MaHs,
                trangThai = _status.NormalizeStatus(hoSo.TrangThai),
                khuTiepDon = BuildAreaDto(targetArea.Id, targetArea.MaKhu, targetArea.TenKhu),
                quayTiepDon = BuildCounterDto(targetCounter?.Id, targetCounter?.MaQuay, targetCounter?.TenQuay)
            }
        });
    }

    [HttpPatch("encounters/{id:long}/transfer/cancel")]
    public async Task<IActionResult> CancelAreaTransfer(long id, [FromBody] AreaTransferCancelDto req)
    {
        var denied = await EnsurePermissionAsync("sua");
        if (denied != null) return denied;

        var actorId = GetCurrentUserId();
        var hoSo = await _db.HoSoBenhAns.FirstOrDefaultAsync(h => h.Id == id);
        if (hoSo == null)
            return NotFound(new { message = "Không tìm thấy hồ sơ tiếp đón." });

        var status = _status.NormalizeStatus(hoSo.TrangThai);
        if (status != HoSoTrangThaiService.ChoChuyenKhu)
            return BadRequest(new { message = "Chỉ hủy chuyển khu khi hồ sơ đang chờ chuyển khu." });

        var reason = Clean(req?.LyDo) ?? Clean(req?.GhiChu);
        if (string.IsNullOrWhiteSpace(reason))
            return BadRequest(new { message = "Hủy chuyển khu phải nhập lý do." });

        var transition = _status.ApplyTransition(
            hoSo,
            HoSoTrangThaiService.HuyChuyenKhu,
            actorId,
            "AREA_TRANSFER_CANCELLED",
            reason,
            new { reason, note = req?.GhiChu });
        if (!transition.Success)
            return BadRequest(new { message = transition.ErrorMessage });

        await _db.SaveChangesAsync();
        return Ok(new
        {
            message = "Đã hủy yêu cầu chuyển khu.",
            encounter = new { hoSo.Id, hoSo.MaHs, trangThai = _status.NormalizeStatus(hoSo.TrangThai) }
        });
    }

    [HttpGet("encounters")]
    public async Task<IActionResult> GetEncounters([FromQuery] ReceptionListQueryDto query)
    {
        var denied = await EnsurePermissionAsync("xem");
        if (denied != null) return denied;

        if (!query.Date.HasValue && !query.FromDate.HasValue && !query.ToDate.HasValue)
        {
            query.Date = DateTime.Today;
        }

        var rows = await BuildEncounterRowsAsync(query);

        var total = rows.Count;
        var (page, pageSize) = NormalizePaging(query.Page, query.PageSize);
        var totalPages = total == 0 ? 1 : (int)Math.Ceiling(total / (double)pageSize);
        if (page > totalPages) page = totalPages;

        var items = rows.Skip((page - 1) * pageSize).Take(pageSize).ToList();

        return Ok(new
        {
            items,
            total,
            page,
            pageSize,
            totalPages
        });
    }

    [HttpGet("stats")]
    public async Task<IActionResult> GetStats([FromQuery] DateTime? date, [FromQuery] DateTime? fromDate, [FromQuery] DateTime? toDate)
    {
        var denied = await EnsurePermissionAsync("xem");
        if (denied != null) return denied;

        if (!date.HasValue && !fromDate.HasValue && !toDate.HasValue)
        {
            date = DateTime.Today;
        }

        var query = _db.HoSoBenhAns.AsNoTracking().Where(h => h.NgayTao.HasValue);
        query = ApplyDateFilter(query, date, fromDate, toDate);

        var statuses = await query.Select(h => h.TrangThai).ToListAsync();
        var normalized = statuses.Select(_status.NormalizeStatus).ToList();

        var total = normalized.Count;
        var cancelled = normalized.Count(s => s == HoSoTrangThaiService.DaHuy);
        var completed = normalized.Count(s => s is HoSoTrangThaiService.DaKham or HoSoTrangThaiService.DaDong);
        var waitingService = normalized.Count(s =>
            s == HoSoTrangThaiService.ChoDichVu
            || s == HoSoTrangThaiService.DichVuNhap);

        var patientQuery = _db.BenhNhans.AsNoTracking().Where(p => p.CreatedAt.HasValue);
        if (date.HasValue)
        {
            var d = date.Value.Date;
            patientQuery = patientQuery.Where(p => p.CreatedAt!.Value.Date == d);
        }
        if (fromDate.HasValue)
        {
            var f = fromDate.Value.Date;
            patientQuery = patientQuery.Where(p => p.CreatedAt!.Value.Date >= f);
        }
        if (toDate.HasValue)
        {
            var t = toDate.Value.Date;
            patientQuery = patientQuery.Where(p => p.CreatedAt!.Value.Date <= t);
        }

        var newPatients = await patientQuery.CountAsync();

        return Ok(new
        {
            total,
            cancelled,
            completed,
            waitingService,
            newPatients
        });
    }

    [HttpGet("dictionaries")]
    public async Task<IActionResult> GetReceptionDictionaries()
    {
        var denied = await EnsurePermissionAsync("xem");
        if (denied != null) return denied;

        return Ok(new
        {
            nguonTiepNhan = NguonTiepNhanCatalog.Values.ToArray(),
            loaiKham = LoaiKhamCatalog.Values.ToArray(),
            mucUuTien = MucUuTienCatalog.Values.ToArray(),
            doiTuongThanhToan = DoiTuongThanhToanCatalog.Values.ToArray(),
            lyDoHuy = new[]
            {
                new { code = "BENH_NHAN_KHONG_TIEP_TUC", label = "Bệnh nhân không tiếp tục khám" },
                new { code = "NHAP_NHAM_THONG_TIN", label = "Nhập nhầm thông tin" },
                new { code = "TAO_TRUNG_HO_SO", label = "Tạo trùng hồ sơ" },
                new { code = "SAI_DICH_VU_PHONG", label = "Sai dịch vụ/phòng khám" },
                new { code = "CHUYEN_CO_SO", label = "Bệnh nhân chuyển cơ sở khác" },
                new { code = "KHAC", label = "Lý do khác" }
            }
        });
    }

    [HttpGet("encounters/{id:long}/timeline")]
    public async Task<IActionResult> GetTimeline(long id, [FromQuery] int limit = 100)
    {
        var denied = await EnsurePermissionAsync("xem");
        if (denied != null) return denied;

        if (limit <= 0) limit = 100;
        if (limit > 500) limit = 500;

        var exists = await _db.HoSoBenhAns.AnyAsync(h => h.Id == id);
        if (!exists)
        {
            return NotFound(new { message = "KhÄ‚Â´ng tÄ‚Â¬m thĂ¡ÂºÂ¥y hĂ¡Â»â€œ sĂ†Â¡." });
        }

        var logsRaw = await _db.TiepDonTrangThaiLogs
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

        var logs = logsRaw.Select(l => new
        {
            l.Id,
            l.IdHoSo,
            FromTrangThai = _status.NormalizeStatus(l.FromTrangThai),
            ToTrangThai = _status.NormalizeStatus(l.ToTrangThai),
            l.Action,
            Note = TextEncodingRepair.Repair(l.Note),
            l.IdNguoiDung,
            NguoiDung = TextEncodingRepair.Repair(l.NguoiDung),
            l.CreatedAt,
            l.Metadata
        });

        return Ok(logs);
    }

    [HttpGet("encounters/{id:long}/exam-ticket")]
    public async Task<IActionResult> GetExamTicket(long id)
    {
        var denied = await EnsurePermissionAsync("xem");
        if (denied != null) return denied;

        var hoSo = await _db.HoSoBenhAns
            .AsNoTracking()
            .Include(h => h.IdBenhNhanNavigation)
            .Include(h => h.IdKhuTiepDonNavigation)
            .Include(h => h.IdQuayTiepDonNavigation)
            .FirstOrDefaultAsync(h => h.Id == id);
        if (hoSo == null || hoSo.IdBenhNhanNavigation == null)
            return NotFound(new { message = "Không tìm thấy hồ sơ tiếp đón." });

        var meta = DeserializeEncounterMeta(hoSo.GhiChu);
        var encounterDate = hoSo.NgayTao?.Date ?? DateTime.Today;
        var sameLaneIds = await _db.HoSoBenhAns
            .AsNoTracking()
            .Where(h => h.NgayTao.HasValue
                && h.NgayTao.Value.Date == encounterDate
                && h.IdKhuTiepDon == hoSo.IdKhuTiepDon
                && h.IdQuayTiepDon == hoSo.IdQuayTiepDon)
            .OrderBy(h => h.NgayTao)
            .ThenBy(h => h.Id)
            .Select(h => h.Id)
            .ToListAsync();
        var stt = sameLaneIds.FindIndex(x => x == hoSo.Id) + 1;
        if (stt <= 0) stt = 1;

        var rooms = await _db.LanKhams
            .AsNoTracking()
            .Where(l => l.IdHoSo == id && l.IdPhong.HasValue && l.TrangThai != "DA_HUY")
            .Join(_db.PhongKhams.AsNoTracking(), l => l.IdPhong, p => (int?)p.Id, (l, p) => new
            {
                visitId = l.Id,
                roomId = p.Id,
                p.MaPhong,
                p.TenPhong,
                status = l.TrangThai
            })
            .ToListAsync();

        var services = await (
            from line in _db.LanKhamDichVus.AsNoTracking()
            join visit in _db.LanKhams.AsNoTracking() on line.IdLanKham equals visit.Id
            join service in _db.DichVus.AsNoTracking() on line.IdDichVu equals service.Id
            join room in _db.PhongKhams.AsNoTracking() on visit.IdPhong equals (int?)room.Id into roomJoin
            from room in roomJoin.DefaultIfEmpty()
            where visit.IdHoSo == id
                  && line.TrangThaiThucHien != "DA_HUY"
                  && visit.TrangThai != "DA_HUY"
            select new
            {
                serviceId = service.Id,
                serviceCode = service.Ma,
                serviceName = service.Ten,
                roomId = visit.IdPhong,
                roomName = room != null ? room.TenPhong : null,
                line.SoLuong,
                line.DonGia,
                status = line.TrangThaiThucHien
            }).ToListAsync();

        return Ok(new
        {
            type = "PHIEU_KHAM",
            printedAt = DateTime.Now,
            encounter = new
            {
                hoSo.Id,
                hoSo.MaHs,
                trangThai = _status.NormalizeStatus(hoSo.TrangThai),
                hoSo.NgayTao,
                sttTiepDon = stt,
                maSttTiepDon = $"{(hoSo.IdKhuTiepDonNavigation?.MaKhu ?? "KHU")}-{stt:000}",
                khuTiepDon = BuildAreaDto(hoSo.IdKhuTiepDon, hoSo.IdKhuTiepDonNavigation?.MaKhu, hoSo.IdKhuTiepDonNavigation?.TenKhu),
                quayTiepDon = BuildCounterDto(hoSo.IdQuayTiepDon, hoSo.IdQuayTiepDonNavigation?.MaQuay, hoSo.IdQuayTiepDonNavigation?.TenQuay),
                loaiKham = meta.LoaiKham,
                nguonTiepNhan = meta.NguonTiepNhan,
                mucUuTien = meta.MucUuTien,
                lyDoKham = meta.LyDoKham,
                doiTuongThanhToan = meta.DoiTuongThanhToan
            },
            patient = new
            {
                id = hoSo.IdBenhNhanNavigation.Id,
                maBn = hoSo.IdBenhNhanNavigation.MaBn,
                hoTen = hoSo.IdBenhNhanNavigation.HoTen,
                gioiTinh = hoSo.IdBenhNhanNavigation.GioiTinh,
                ngaySinh = hoSo.IdBenhNhanNavigation.NgaySinh?.ToString("yyyy-MM-dd"),
                soDienThoai = hoSo.IdBenhNhanNavigation.SoDienThoai,
                cccd = hoSo.IdBenhNhanNavigation.Cccd,
                diaChi = string.Join(", ", new[]
                {
                    hoSo.IdBenhNhanNavigation.DiaChiDuong,
                    hoSo.IdBenhNhanNavigation.DiaChiXa,
                    hoSo.IdBenhNhanNavigation.DiaChiHuyen,
                    hoSo.IdBenhNhanNavigation.DiaChiTinh
                }.Where(x => !string.IsNullOrWhiteSpace(x)))
            },
            rooms,
            services
        });
    }

    [HttpGet("export")]
    public async Task<IActionResult> Export([FromQuery] ReceptionExportQueryDto query)
    {
        var denied = await EnsurePermissionAsync("xuat");
        if (denied != null) return denied;

        var rows = await BuildEncounterRowsAsync(query);

        var csv = new StringBuilder();
        csv.AppendLine("ma_hs,ma_bn,ho_ten,gioi_tinh,ngay_sinh,so_dien_thoai,cccd,trang_thai,loai_kham,nguon_tiep_nhan,muc_uu_tien,ly_do_kham,thoi_gian_tiep_don");
        foreach (dynamic row in rows)
        {
            csv.AppendLine(string.Join(",",
                EscapeCsv((string?)row.maHs),
                EscapeCsv((string?)row.benhNhan.maBn),
                EscapeCsv((string?)row.benhNhan.hoTen),
                EscapeCsv((string?)row.benhNhan.gioiTinh),
                EscapeCsv((string?)row.benhNhan.ngaySinh),
                EscapeCsv((string?)row.benhNhan.soDienThoai),
                EscapeCsv((string?)row.benhNhan.cccd),
                EscapeCsv((string?)row.trangThai),
                EscapeCsv((string?)row.loaiKham),
                EscapeCsv((string?)row.nguonTiepNhan),
                EscapeCsv((string?)row.mucUuTien),
                EscapeCsv((string?)row.lyDoKham),
                EscapeCsv((string?)row.ngayTao?.ToString())
            ));
        }

        var bytes = Encoding.UTF8.GetPreamble().Concat(Encoding.UTF8.GetBytes(csv.ToString())).ToArray();
        return File(bytes, "text/csv; charset=utf-8", $"tiuv-reception-{DateTime.Now:yyyyMMdd-HHmmss}.csv");
    }

    private async Task<List<object>> BuildEncounterRowsAsync(ReceptionListQueryDto query)
    {
        var tab = Clean(query.Tab)?.ToLowerInvariant() ?? "today";
        var anchorDate = query.Date?.Date
            ?? query.ToDate?.Date
            ?? DateTime.Today;

        var q = _db.HoSoBenhAns
            .AsNoTracking()
            .Include(h => h.IdBenhNhanNavigation)
            .Include(h => h.IdNguoiTaoNavigation)
            .Include(h => h.IdKhuTiepDonNavigation)
            .Include(h => h.IdQuayTiepDonNavigation)
            .Where(h => h.IdBenhNhanNavigation != null && h.NgayTao.HasValue);

        if (tab == "pending")
        {
            q = q.Where(h => h.NgayTao.HasValue && h.NgayTao.Value.Date < anchorDate);
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
        }
        else if (tab == "today")
        {
            q = ApplyReceptionAndCarryOverDateFilter(q, query.Date, query.FromDate, query.ToDate, anchorDate);
        }
        else
        {
            q = ApplyDateFilter(q, query.Date, query.FromDate, query.ToDate);
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

        if (query.IdKhuTiepDon.HasValue)
        {
            q = q.Where(h => h.IdKhuTiepDon == query.IdKhuTiepDon.Value);
        }
        else if (!string.IsNullOrWhiteSpace(query.MaKhuTiepDon))
        {
            var maKhu = query.MaKhuTiepDon.Trim();
            q = q.Where(h => h.IdKhuTiepDonNavigation != null && h.IdKhuTiepDonNavigation.MaKhu == maKhu);
        }

        var rawRows = await q
            .Select(h => new
            {
                h.Id,
                h.MaHs,
                h.TrangThai,
                h.NgayTao,
                h.GhiChu,
                h.IdKhuTiepDon,
                KhuMa = h.IdKhuTiepDonNavigation != null ? h.IdKhuTiepDonNavigation.MaKhu : null,
                KhuTen = h.IdKhuTiepDonNavigation != null ? h.IdKhuTiepDonNavigation.TenKhu : null,
                h.IdQuayTiepDon,
                QuayMa = h.IdQuayTiepDonNavigation != null ? h.IdQuayTiepDonNavigation.MaQuay : null,
                QuayTen = h.IdQuayTiepDonNavigation != null ? h.IdQuayTiepDonNavigation.TenQuay : null,
                NguoiTiepDon = h.IdNguoiTaoNavigation != null ? (h.IdNguoiTaoNavigation.HoTen ?? h.IdNguoiTaoNavigation.TenDangNhap) : null,
                BenhNhan = new
                {
                    IdBenhNhan = h.IdBenhNhanNavigation != null ? h.IdBenhNhanNavigation.Id : 0,
                    MaBn = h.IdBenhNhanNavigation != null ? h.IdBenhNhanNavigation.MaBn : null,
                    HoTen = h.IdBenhNhanNavigation != null ? h.IdBenhNhanNavigation.HoTen : null,
                    GioiTinh = h.IdBenhNhanNavigation != null ? h.IdBenhNhanNavigation.GioiTinh : null,
                    NgaySinh = h.IdBenhNhanNavigation != null ? h.IdBenhNhanNavigation.NgaySinh : null,
                    SoDienThoai = h.IdBenhNhanNavigation != null ? h.IdBenhNhanNavigation.SoDienThoai : null,
                    Cccd = h.IdBenhNhanNavigation != null ? h.IdBenhNhanNavigation.Cccd : null,
                    Email = h.IdBenhNhanNavigation != null ? h.IdBenhNhanNavigation.Email : null,
                    NgheNghiep = h.IdBenhNhanNavigation != null ? h.IdBenhNhanNavigation.NgheNghiep : null,
                    DiaChiDuong = h.IdBenhNhanNavigation != null ? h.IdBenhNhanNavigation.DiaChiDuong : null,
                    DiaChiXa = h.IdBenhNhanNavigation != null ? h.IdBenhNhanNavigation.DiaChiXa : null,
                    DiaChiHuyen = h.IdBenhNhanNavigation != null ? h.IdBenhNhanNavigation.DiaChiHuyen : null,
                    DiaChiTinh = h.IdBenhNhanNavigation != null ? h.IdBenhNhanNavigation.DiaChiTinh : null,
                    DanToc = h.IdBenhNhanNavigation != null ? h.IdBenhNhanNavigation.DanToc : null,
                    QuocGia = h.IdBenhNhanNavigation != null ? h.IdBenhNhanNavigation.QuocGia : null
                }
            })
            .ToListAsync();

        var hoSoIds = rawRows.Select(x => x.Id).ToList();
        var roomByHoSo = await _db.LanKhams
            .Where(l => l.IdHoSo.HasValue && hoSoIds.Contains(l.IdHoSo.Value) && l.IdPhong.HasValue)
            .Join(_db.PhongKhams, l => l.IdPhong, p => p.Id, (l, p) => new { l.IdHoSo, p.TenPhong })
            .ToListAsync();

        var roomLookup = roomByHoSo
            .GroupBy(x => x.IdHoSo!.Value)
            .ToDictionary(
                g => g.Key,
                g => string.Join(", ", g
                    .Select(x => Clean(x.TenPhong))
                    .Where(x => !string.IsNullOrWhiteSpace(x))
                    .Distinct(StringComparer.OrdinalIgnoreCase))
            );

        var sttLookup = rawRows
            .OrderBy(x => x.NgayTao)
            .ThenBy(x => x.Id)
            .GroupBy(x => new
            {
                Ngay = x.NgayTao?.Date,
                Khu = x.IdKhuTiepDon,
                Quay = x.IdQuayTiepDon
            })
            .SelectMany(g => g.Select((row, index) => new
            {
                row.Id,
                Stt = index + 1,
                MaStt = $"{(string.IsNullOrWhiteSpace(row.KhuMa) ? "KHU" : row.KhuMa)}-{index + 1:000}"
            }))
            .ToDictionary(x => x.Id, x => new { x.Stt, x.MaStt });

        var currentRole = GetCurrentRoleCode();
        var mapped = rawRows.Select(row =>
        {
            var meta = DeserializeEncounterMeta(row.GhiChu);
            var status = _status.NormalizeStatus(row.TrangThai);
            sttLookup.TryGetValue(row.Id, out var sttInfo);

            return new
            {
                id = row.Id,
                maHs = row.MaHs,
                sttTiepDon = sttInfo?.Stt,
                maSttTiepDon = sttInfo?.MaStt,
                trangThai = status,
                ngayTao = row.NgayTao,
                loaiKham = meta.LoaiKham,
                nguonTiepNhan = meta.NguonTiepNhan,
                mucUuTien = meta.MucUuTien,
                lyDoKham = meta.LyDoKham,
                trieuChungBanDau = meta.TrieuChungBanDau,
                doiTuongThanhToan = meta.DoiTuongThanhToan,
                ghiChuTiepDon = meta.GhiChuTiepDon,
                lyDoTaoThemLuotTrongNgay = meta.LyDoTaoThemLuotTrongNgay,
                appointmentCode = meta.AppointmentCode,
                mucDoDau = meta.MucDoDau,
                lyDoChuyenKhu = meta.LyDoChuyenKhu,
                khuTiepDon = BuildAreaDto(row.IdKhuTiepDon, row.KhuMa ?? meta.MaKhuTiepDon, row.KhuTen ?? meta.TenKhuTiepDon),
                quayTiepDon = BuildCounterDto(row.IdQuayTiepDon, row.QuayMa ?? meta.MaQuayTiepDon, row.QuayTen ?? meta.TenQuayTiepDon),
                phongDangKy = roomLookup.TryGetValue(row.Id, out var roomNames) && !string.IsNullOrWhiteSpace(roomNames)
                    ? roomNames
                    : "ChĂ†Â°a chĂ¡Â»Ân",
                nguoiTiepDon = row.NguoiTiepDon,
                benhNhan = new
                {
                    idBenhNhan = row.BenhNhan.IdBenhNhan,
                    maBn = row.BenhNhan.MaBn,
                    hoTen = row.BenhNhan.HoTen,
                    gioiTinh = row.BenhNhan.GioiTinh,
                    ngaySinh = row.BenhNhan.NgaySinh?.ToString("yyyy-MM-dd"),
                    soDienThoai = row.BenhNhan.SoDienThoai,
                    cccd = row.BenhNhan.Cccd,
                    email = row.BenhNhan.Email,
                    ngheNghiep = row.BenhNhan.NgheNghiep,
                    diaChiDuong = row.BenhNhan.DiaChiDuong,
                    diaChiXa = row.BenhNhan.DiaChiXa,
                    diaChiHuyen = row.BenhNhan.DiaChiHuyen,
                    diaChiTinh = row.BenhNhan.DiaChiTinh,
                    danToc = row.BenhNhan.DanToc,
                    quocGia = row.BenhNhan.QuocGia,
                    nguoiLienHeKhanCap = (string?)null,
                    sdtLienHeKhanCap = (string?)null,
                    quanHeLienHeKhanCap = (string?)null,
                    nguoiGiamHo = (string?)null,
                    sdtGiamHo = (string?)null,
                    quanHeGiamHo = (string?)null,
                    ghiChuDinhDanh = (string?)null
                },
                canEditEncounter = _status.CanEditEncounter(status, currentRole),
                canCancel = _status.CanCancelEncounter(status, currentRole),
                canSelectService = _status.CanEditServiceOrder(status, currentRole),
            };
        }).ToList();

        IEnumerable<dynamic> filtered = mapped;

        filtered = tab switch
        {
            "cancelled" => filtered.Where(x => x.trangThai == HoSoTrangThaiService.DaHuy),
            "completed" => filtered.Where(x => x.trangThai is HoSoTrangThaiService.DaKham or HoSoTrangThaiService.DaDong),
            "pending" => filtered.Where(x => _status.IsPendingCarryOverStatus((string?)x.trangThai)),
            "today" => filtered.Where(x =>
                _status.IsProcessingTabStatus((string?)x.trangThai) ||
                _status.IsPendingCarryOverStatus((string?)x.trangThai)),
            _ => filtered.Where(x => _status.IsProcessingTabStatus((string?)x.trangThai))
        };

        if (!string.IsNullOrWhiteSpace(query.Status) && !string.Equals(query.Status, "ALL", StringComparison.OrdinalIgnoreCase))
        {
            var status = _status.NormalizeStatus(query.Status);
            filtered = filtered.Where(x => x.trangThai == status);
        }

        if (!string.IsNullOrWhiteSpace(query.LoaiKham))
        {
            filtered = filtered.Where(x => string.Equals(x.loaiKham, query.LoaiKham, StringComparison.OrdinalIgnoreCase));
        }

        if (!string.IsNullOrWhiteSpace(query.NguonTiepNhan))
        {
            filtered = filtered.Where(x => string.Equals(x.nguonTiepNhan, query.NguonTiepNhan, StringComparison.OrdinalIgnoreCase));
        }

        if (!string.IsNullOrWhiteSpace(query.MucUuTien))
        {
            filtered = filtered.Where(x => string.Equals(x.mucUuTien, query.MucUuTien, StringComparison.OrdinalIgnoreCase));
        }

        var sort = (query.SortBy ?? "ngay_tao").Trim().ToLowerInvariant();
        var asc = string.Equals(query.SortDir, "asc", StringComparison.OrdinalIgnoreCase);

        filtered = (sort, asc) switch
        {
            ("ma_hs", true) => filtered.OrderBy(x => x.maHs),
            ("ma_hs", false) => filtered.OrderByDescending(x => x.maHs),
            ("ho_ten", true) => filtered.OrderBy(x => (string?)x.benhNhan.hoTen),
            ("ho_ten", false) => filtered.OrderByDescending(x => (string?)x.benhNhan.hoTen),
            ("trang_thai", true) => filtered.OrderBy(x => x.trangThai),
            ("trang_thai", false) => filtered.OrderByDescending(x => x.trangThai),
            (_, true) => filtered.OrderBy(x => x.ngayTao),
            _ => filtered.OrderByDescending(x => x.ngayTao)
        };

        return filtered.Cast<object>().ToList();
    }

    private static IQueryable<HoSoBenhAn> ApplyReceptionAndCarryOverDateFilter(
        IQueryable<HoSoBenhAn> q,
        DateTime? date,
        DateTime? fromDate,
        DateTime? toDate,
        DateTime anchorDate)
    {
        var anchor = anchorDate.Date;

        if (date.HasValue && !fromDate.HasValue && !toDate.HasValue)
        {
            return q.Where(h => h.NgayTao.HasValue && h.NgayTao.Value.Date <= date.Value.Date);
        }

        if (fromDate.HasValue || toDate.HasValue)
        {
            var from = fromDate?.Date;
            var to = toDate?.Date;
            return q.Where(h =>
                h.NgayTao.HasValue &&
                (
                    ((!from.HasValue || h.NgayTao.Value.Date >= from.Value) &&
                     (!to.HasValue || h.NgayTao.Value.Date <= to.Value)) ||
                    h.NgayTao.Value.Date < anchor
                ));
        }

        return q.Where(h => h.NgayTao.HasValue && h.NgayTao.Value.Date <= anchor);
    }

    private static IQueryable<HoSoBenhAn> ApplyDateFilter(
        IQueryable<HoSoBenhAn> q,
        DateTime? date,
        DateTime? fromDate,
        DateTime? toDate)
    {
        if (date.HasValue)
        {
            var d = date.Value.Date;
            q = q.Where(h => h.NgayTao.HasValue && h.NgayTao.Value.Date == d);
        }

        if (fromDate.HasValue)
        {
            var from = fromDate.Value.Date;
            q = q.Where(h => h.NgayTao.HasValue && h.NgayTao.Value.Date >= from);
        }

        if (toDate.HasValue)
        {
            var to = toDate.Value.Date;
            q = q.Where(h => h.NgayTao.HasValue && h.NgayTao.Value.Date <= to);
        }

        return q;
    }

    private async Task<BenhNhan?> FindPatientByPriorityAsync(PatientLookupRequest query)
    {
        var cccd = Clean(query.CCCD);
        var maBn = Clean(query.MaBenhNhan);
        var maHoSo = Clean(query.MaHoSo);
        var phone = Clean(query.SoDienThoai);
        var fullName = Clean(query.HoTen);
        var gender = Clean(query.GioiTinh);

        if (!string.IsNullOrWhiteSpace(maHoSo))
        {
            var byEncounter = await _db.HoSoBenhAns
                .AsNoTracking()
                .Include(h => h.IdBenhNhanNavigation)
                .Where(h => h.MaHs == maHoSo && h.IdBenhNhanNavigation != null)
                .Select(h => h.IdBenhNhanNavigation!)
                .FirstOrDefaultAsync();
            if (byEncounter != null) return byEncounter;
        }

        if (!string.IsNullOrWhiteSpace(cccd))
        {
            var byCitizen = await _db.BenhNhans.AsNoTracking().FirstOrDefaultAsync(x => x.Cccd == cccd);
            if (byCitizen != null) return byCitizen;
        }

        if (!string.IsNullOrWhiteSpace(maBn))
        {
            var byCode = await _db.BenhNhans.AsNoTracking().FirstOrDefaultAsync(x => x.MaBn == maBn);
            if (byCode != null) return byCode;
        }

        if (!string.IsNullOrWhiteSpace(phone) && query.NgaySinh.HasValue)
        {
            var dob = DateOnly.FromDateTime(query.NgaySinh.Value.Date);
            var byPhoneDob = await _db.BenhNhans.AsNoTracking()
                .FirstOrDefaultAsync(x => x.SoDienThoai == phone && x.NgaySinh == dob);
            if (byPhoneDob != null) return byPhoneDob;
        }

        if (!string.IsNullOrWhiteSpace(fullName) && query.NgaySinh.HasValue && !string.IsNullOrWhiteSpace(gender))
        {
            var dob = DateOnly.FromDateTime(query.NgaySinh.Value.Date);
            var byNameDobGender = await _db.BenhNhans.AsNoTracking()
                .FirstOrDefaultAsync(x =>
                    x.HoTen == fullName &&
                    x.NgaySinh == dob &&
                    x.GioiTinh == gender);
            if (byNameDobGender != null) return byNameDobGender;
        }

        if (!string.IsNullOrWhiteSpace(phone))
        {
            var byPhone = await _db.BenhNhans.AsNoTracking().FirstOrDefaultAsync(x => x.SoDienThoai == phone);
            if (byPhone != null) return byPhone;
        }

        return null;
    }

    private IReadOnlyList<WardSearchItem> GetWardSearchItems()
    {
        if (_wardSearchCache != null) return _wardSearchCache;

        lock (LocationCacheLock)
        {
            if (_wardSearchCache != null) return _wardSearchCache;
            _wardSearchCache = LoadWardSearchItems();
            return _wardSearchCache;
        }
    }

    private List<WardSearchItem> LoadWardSearchItems()
    {
        var wardPath = ResolveLocationFilePath("ward.json");
        if (string.IsNullOrWhiteSpace(wardPath) || !System.IO.File.Exists(wardPath))
            return new List<WardSearchItem>();

        var provincePath = ResolveLocationFilePath("province.json");
        var provinceMap = LoadProvinceMap(provincePath);

        using var doc = JsonDocument.Parse(System.IO.File.ReadAllText(wardPath, Encoding.UTF8));
        if (doc.RootElement.ValueKind != JsonValueKind.Object)
            return new List<WardSearchItem>();

        var list = new List<WardSearchItem>(capacity: 4096);
        foreach (var prop in doc.RootElement.EnumerateObject())
        {
            var row = prop.Value;
            if (row.ValueKind != JsonValueKind.Object) continue;

            var code = ReadJsonString(row, "code") ?? prop.Name;
            var name = ReadJsonString(row, "name");
            if (string.IsNullOrWhiteSpace(name)) continue;

            var provinceCode = ReadJsonString(row, "parent_code");
            provinceMap.TryGetValue(provinceCode ?? string.Empty, out var provinceInfo);

            var ward = new WardSearchItem
            {
                Code = code,
                Type = ReadJsonString(row, "type") ?? string.Empty,
                Name = name,
                NameWithType = ReadJsonString(row, "name_with_type") ?? name,
                Path = ReadJsonString(row, "path") ?? name,
                PathWithType = ReadJsonString(row, "path_with_type") ?? name,
                Slug = CompactSearchText(ReadJsonString(row, "slug") ?? string.Empty),
                ProvinceCode = provinceCode ?? string.Empty,
                ProvinceName = provinceInfo.Name ?? ExtractProvinceFromPath(ReadJsonString(row, "path")),
                ProvinceWithType = provinceInfo.NameWithType ?? ExtractProvinceFromPath(ReadJsonString(row, "path_with_type"))
            };

            ward.NameNorm = NormalizeSearchText(ward.Name);
            ward.NameCompact = CompactSearchText(ward.NameNorm);
            ward.NameWithTypeCompact = CompactSearchText(NormalizeSearchText(ward.NameWithType));
            ward.PathCompact = CompactSearchText(NormalizeSearchText($"{ward.Path} {ward.PathWithType}"));
            ward.Initials = BuildInitials(ward.NameNorm);
            ward.PathInitials = BuildInitials(NormalizeSearchText(ward.Path));

            list.Add(ward);
        }

        return list;
    }

    private string? ResolveLocationFilePath(string fileName)
    {
        var candidates = new[]
        {
            Path.Combine(_env.ContentRootPath, fileName),
            Path.Combine(_env.ContentRootPath, "..", fileName),
            Path.Combine(_env.ContentRootPath, "..", "..", fileName),
            Path.Combine(Directory.GetCurrentDirectory(), fileName),
            Path.Combine(AppContext.BaseDirectory, fileName)
        };

        foreach (var path in candidates)
        {
            if (System.IO.File.Exists(path))
                return path;
        }

        return null;
    }

    private static Dictionary<string, ProvinceInfo> LoadProvinceMap(string? provincePath)
    {
        var result = new Dictionary<string, ProvinceInfo>(StringComparer.OrdinalIgnoreCase);
        if (string.IsNullOrWhiteSpace(provincePath) || !System.IO.File.Exists(provincePath))
            return result;

        using var doc = JsonDocument.Parse(System.IO.File.ReadAllText(provincePath, Encoding.UTF8));
        if (doc.RootElement.ValueKind != JsonValueKind.Object)
            return result;

        foreach (var prop in doc.RootElement.EnumerateObject())
        {
            var row = prop.Value;
            if (row.ValueKind != JsonValueKind.Object) continue;

            var code = ReadJsonString(row, "code") ?? prop.Name;
            var name = ReadJsonString(row, "name");
            if (string.IsNullOrWhiteSpace(name)) continue;

            result[code] = new ProvinceInfo
            {
                Name = name,
                NameWithType = ReadJsonString(row, "name_with_type") ?? name
            };
        }

        return result;
    }

    private static int ComputeWardMatchScore(WardSearchItem item, string compactKeyword)
    {
        if (string.IsNullOrWhiteSpace(compactKeyword))
            return -1;

        if (item.NameCompact.StartsWith(compactKeyword, StringComparison.Ordinal))
            return 0;
        if (item.Initials.StartsWith(compactKeyword, StringComparison.Ordinal))
            return 1;
        if (item.NameCompact.Contains(compactKeyword, StringComparison.Ordinal))
            return 2;
        if (item.NameWithTypeCompact.Contains(compactKeyword, StringComparison.Ordinal))
            return 3;
        if (item.PathCompact.Contains(compactKeyword, StringComparison.Ordinal))
            return 4;
        if (item.PathInitials.StartsWith(compactKeyword, StringComparison.Ordinal))
            return 5;
        if (!string.IsNullOrWhiteSpace(item.Slug) && item.Slug.Contains(compactKeyword, StringComparison.Ordinal))
            return 6;

        return -1;
    }

    private static string NormalizeSearchText(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return string.Empty;

        var normalized = value.Normalize(NormalizationForm.FormD);
        var sb = new StringBuilder(normalized.Length);
        foreach (var ch in normalized)
        {
            var category = CharUnicodeInfo.GetUnicodeCategory(ch);
            if (category == UnicodeCategory.NonSpacingMark) continue;

            if (ch == '\u0111' || ch == '\u0110')
            {
                sb.Append('d');
                continue;
            }

            if (char.IsLetterOrDigit(ch))
            {
                sb.Append(char.ToLowerInvariant(ch));
            }
            else
            {
                sb.Append(' ');
            }
        }

        return Regex.Replace(sb.ToString(), @"\s+", " ").Trim();
    }

    private static string CompactSearchText(string? value)
    {
        return string.IsNullOrWhiteSpace(value)
            ? string.Empty
            : value.Replace(" ", string.Empty, StringComparison.Ordinal);
    }

    private static string BuildInitials(string? normalizedText)
    {
        if (string.IsNullOrWhiteSpace(normalizedText)) return string.Empty;
        var parts = normalizedText.Split(' ', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        if (parts.Length == 0) return string.Empty;

        var sb = new StringBuilder(parts.Length);
        foreach (var part in parts)
        {
            sb.Append(part[0]);
        }
        return sb.ToString();
    }

    private static string ExtractProvinceFromPath(string? path)
    {
        if (string.IsNullOrWhiteSpace(path)) return string.Empty;

        var parts = path.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        return parts.Length == 0 ? path : parts[^1];
    }

    private static string? ReadJsonString(JsonElement row, string key)
    {
        if (!row.TryGetProperty(key, out var value)) return null;
        return value.ValueKind == JsonValueKind.String ? value.GetString() : null;
    }

    private static void CanonicalizeReceptionInfo(ReceptionInfoDto? info)
    {
        if (info == null) return;

        info.NguonTiepNhan = CanonicalizeOption(info.NguonTiepNhan, NguonTiepNhanCatalog);
        info.LoaiKham = CanonicalizeOption(info.LoaiKham, LoaiKhamCatalog);
        info.MucUuTien = CanonicalizeOption(info.MucUuTien, MucUuTienCatalog);
        info.DoiTuongThanhToan = CanonicalizeOption(info.DoiTuongThanhToan, DoiTuongThanhToanCatalog);
        info.TrieuChungNguyHiem = info.TrieuChungNguyHiem?
            .Select(Clean)
            .Where(x => !string.IsNullOrWhiteSpace(x))
            .Cast<string>()
            .ToList();
    }

    private static string? CanonicalizeOption(string? value, IReadOnlyDictionary<string, string> catalog)
    {
        var cleaned = Clean(value);
        if (string.IsNullOrWhiteSpace(cleaned)) return null;

        var key = ToLooseKey(cleaned);
        return catalog.TryGetValue(key, out var canonical) ? canonical : cleaned;
    }

    private static bool IsLooseEqual(string? value, string expected)
        => string.Equals(ToLooseKey(value), ToLooseKey(expected), StringComparison.OrdinalIgnoreCase);

    private static string ToLooseKey(string? value)
    {
        var cleaned = Clean(value);
        if (string.IsNullOrWhiteSpace(cleaned)) return string.Empty;

        var normalized = cleaned.Normalize(NormalizationForm.FormD);
        var sb = new StringBuilder(normalized.Length);
        foreach (var ch in normalized)
        {
            if (CharUnicodeInfo.GetUnicodeCategory(ch) == UnicodeCategory.NonSpacingMark)
            {
                continue;
            }

            if (ch is 'đ' or 'Đ')
            {
                sb.Append('d');
                continue;
            }

            if (char.IsLetterOrDigit(ch))
            {
                sb.Append(char.ToLowerInvariant(ch));
            }
        }

        return sb.ToString();
    }

    private async Task<KhuTiepDon?> FindAreaForLookupAsync(PatientLookupRequest query)
    {
        if (query.IdKhuTiepDon.HasValue)
        {
            return await _db.KhuTiepDons
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.Id == query.IdKhuTiepDon.Value && x.HoatDong == true);
        }

        var maKhu = Clean(query.MaKhuTiepDon);
        if (!string.IsNullOrWhiteSpace(maKhu))
        {
            return await _db.KhuTiepDons
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.MaKhu == maKhu && x.HoatDong == true);
        }

        return null;
    }

    private async Task<ReceptionAreaSelection> ResolveReceptionAreaAsync(ReceptionInfoDto? info, long actorId)
    {
        KhuTiepDon? area = null;
        var requestedAreaId = info?.IdKhuTiepDon;
        var requestedAreaCode = Clean(info?.MaKhuTiepDon);

        if (requestedAreaId.HasValue)
        {
            area = await _db.KhuTiepDons
                .Include(x => x.QuayTiepDons)
                .FirstOrDefaultAsync(x => x.Id == requestedAreaId.Value && x.HoatDong == true);
        }
        else if (!string.IsNullOrWhiteSpace(requestedAreaCode))
        {
            area = await _db.KhuTiepDons
                .Include(x => x.QuayTiepDons)
                .FirstOrDefaultAsync(x => x.MaKhu == requestedAreaCode && x.HoatDong == true);
        }

        var usedDefault = false;
        if (area == null && actorId > 0)
        {
            area = await _db.NguoiDungKhus
                .Include(x => x.IdKhuTiepDonNavigation)
                    .ThenInclude(x => x.QuayTiepDons)
                .Where(x => x.IdNguoiDung == actorId
                    && x.HoatDong == true
                    && x.IdKhuTiepDonNavigation.HoatDong == true)
                .OrderByDescending(x => x.LaMacDinh == true)
                .ThenBy(x => x.IdKhuTiepDonNavigation.MaKhu)
                .Select(x => x.IdKhuTiepDonNavigation)
                .FirstOrDefaultAsync();
            usedDefault = area != null;
        }

        if (area == null)
        {
            area = await _db.KhuTiepDons
                .Include(x => x.QuayTiepDons)
                .Where(x => x.HoatDong == true)
                .OrderBy(x => x.MaKhu)
                .FirstOrDefaultAsync();
            usedDefault = area != null;
        }

        if (area == null)
        {
            return new ReceptionAreaSelection(false, "Chưa cấu hình khu tiếp đón hoạt động.", null, null, usedDefault);
        }

        if (!await IsUserAllowedInAreaAsync(actorId, area.Id))
        {
            return new ReceptionAreaSelection(false, $"Bạn không được phân quyền tiếp đón tại {area.TenKhu}.", area, null, usedDefault);
        }

        QuayTiepDon? counter = null;
        if (info?.IdQuayTiepDon.HasValue == true)
        {
            counter = area.QuayTiepDons.FirstOrDefault(x => x.Id == info.IdQuayTiepDon.Value && x.HoatDong == true);
        }

        var counterCode = Clean(info?.MaQuayTiepDon);
        if (counter == null && !string.IsNullOrWhiteSpace(counterCode))
        {
            counter = area.QuayTiepDons.FirstOrDefault(x =>
                string.Equals(x.MaQuay, counterCode, StringComparison.OrdinalIgnoreCase)
                && x.HoatDong == true);
        }

        counter ??= area.QuayTiepDons
            .Where(x => x.HoatDong == true)
            .OrderBy(x => x.ThuTu ?? int.MaxValue)
            .ThenBy(x => x.MaQuay)
            .FirstOrDefault();

        if (counter == null)
        {
            return new ReceptionAreaSelection(false, $"{area.TenKhu} chưa có quầy tiếp đón hoạt động.", area, null, usedDefault);
        }

        return new ReceptionAreaSelection(true, null, area, counter, usedDefault);
    }

    private async Task<bool> IsUserAllowedInAreaAsync(long actorId, int areaId)
    {
        if (actorId <= 0) return true;

        var hasAreaAssignments = await _db.NguoiDungKhus
            .AsNoTracking()
            .AnyAsync(x => x.IdNguoiDung == actorId && x.HoatDong == true);
        if (!hasAreaAssignments) return true;

        return await _db.NguoiDungKhus
            .AsNoTracking()
            .AnyAsync(x => x.IdNguoiDung == actorId && x.IdKhuTiepDon == areaId && x.HoatDong == true);
    }

    private static void ApplyReceptionArea(ReceptionInfoDto? info, KhuTiepDon area, QuayTiepDon? counter)
    {
        if (info == null) return;

        info.IdKhuTiepDon = area.Id;
        info.MaKhuTiepDon = area.MaKhu;
        info.TenKhuTiepDon = area.TenKhu;
        info.IdQuayTiepDon = counter?.Id;
        info.MaQuayTiepDon = counter?.MaQuay;
        info.TenQuayTiepDon = counter?.TenQuay;
    }

    private object BuildEncounterRef(HoSoBenhAn record)
        => new
        {
            record.Id,
            record.MaHs,
            TrangThai = _status.NormalizeStatus(record.TrangThai),
            record.NgayTao,
            KhuTiepDon = BuildAreaDto(
                record.IdKhuTiepDon,
                record.IdKhuTiepDonNavigation?.MaKhu,
                record.IdKhuTiepDonNavigation?.TenKhu),
            QuayTiepDon = BuildCounterDto(
                record.IdQuayTiepDon,
                record.IdQuayTiepDonNavigation?.MaQuay,
                record.IdQuayTiepDonNavigation?.TenQuay)
        };

    private static object? BuildAreaDto(int? id, string? maKhu, string? tenKhu)
    {
        if (!id.HasValue && string.IsNullOrWhiteSpace(maKhu) && string.IsNullOrWhiteSpace(tenKhu)) return null;
        return new
        {
            id,
            maKhu = Clean(maKhu),
            tenKhu = Clean(tenKhu)
        };
    }

    private static object? BuildCounterDto(int? id, string? maQuay, string? tenQuay)
    {
        if (!id.HasValue && string.IsNullOrWhiteSpace(maQuay) && string.IsNullOrWhiteSpace(tenQuay)) return null;
        return new
        {
            id,
            maQuay = Clean(maQuay),
            tenQuay = Clean(tenQuay)
        };
    }

    private static Dictionary<string, string> ValidatePatientRequest(PatientCreateRequest req)
    {
        var errors = new Dictionary<string, string>();

        if (string.IsNullOrWhiteSpace(req.Ho_ten))
        {
            errors["ho_ten"] = "Họ tên là bắt buộc.";
        }

        if (!req.Ngay_sinh.HasValue)
        {
            errors["ngay_sinh"] = "Ngày sinh là bắt buộc.";
        }
        else if (req.Ngay_sinh.Value.Date > DateTime.Today)
        {
            errors["ngay_sinh"] = "Ngày sinh không được lớn hơn ngày hiện tại.";
        }

        if (string.IsNullOrWhiteSpace(req.Gioi_tinh))
        {
            errors["gioi_tinh"] = "Giới tính là bắt buộc.";
        }

        if (string.IsNullOrWhiteSpace(req.So_dien_thoai))
        {
            errors["so_dien_thoai"] = "Số điện thoại là bắt buộc.";
        }
        else if (!PhoneRegex.IsMatch(req.So_dien_thoai.Trim()))
        {
            errors["so_dien_thoai"] = "Số điện thoại không đúng định dạng Việt Nam.";
        }

        if (!string.IsNullOrWhiteSpace(req.CCCD) && !CitizenIdRegex.IsMatch(req.CCCD.Trim()))
        {
            errors["cccd"] = "CCCD/CMND phải có 9 hoặc 12 chữ số.";
        }

        if (!string.IsNullOrWhiteSpace(req.Email))
        {
            try
            {
                _ = new System.Net.Mail.MailAddress(req.Email.Trim());
            }
            catch
            {
                errors["email"] = "Email không đúng định dạng.";
            }
        }

        if (!string.IsNullOrWhiteSpace(req.Sdt_lien_he_khan_cap) && !PhoneRegex.IsMatch(req.Sdt_lien_he_khan_cap.Trim()))
        {
            errors["sdt_lien_he_khan_cap"] = "SĐT liên hệ khẩn cấp không đúng định dạng Việt Nam.";
        }

        if (!string.IsNullOrWhiteSpace(req.Sdt_giam_ho) && !PhoneRegex.IsMatch(req.Sdt_giam_ho.Trim()))
        {
            errors["sdt_giam_ho"] = "SĐT người giám hộ không đúng định dạng Việt Nam.";
        }

        if (req.Ngay_sinh.HasValue)
        {
            var dob = req.Ngay_sinh.Value.Date;
            var today = DateTime.Today;
            var age = today.Year - dob.Year;
            if (dob > today.AddYears(-age)) age--;

            if (age < 16)
            {
                if (string.IsNullOrWhiteSpace(req.Nguoi_giam_ho))
                    errors["nguoi_giam_ho"] = "Bệnh nhân dưới 16 tuổi cần nhập người giám hộ.";
                if (string.IsNullOrWhiteSpace(req.Sdt_giam_ho))
                    errors["sdt_giam_ho"] = "Bệnh nhân dưới 16 tuổi cần nhập SĐT người giám hộ.";
            }

        }

        return errors;
    }

    private static Dictionary<string, string> ValidateReceptionInfo(ReceptionInfoDto? info)
    {
        var errors = new Dictionary<string, string>();
        if (info == null)
        {
            errors["thong_tin_tiep_don"] = "Thiếu thông tin tiếp đón.";
            return errors;
        }

        if (!info.IdKhuTiepDon.HasValue && string.IsNullOrWhiteSpace(info.MaKhuTiepDon))
            errors["id_khu_tiep_don"] = "Khu tiếp đón là bắt buộc.";
        if (!info.IdQuayTiepDon.HasValue && string.IsNullOrWhiteSpace(info.MaQuayTiepDon))
            errors["id_quay_tiep_don"] = "Quầy tiếp đón là bắt buộc.";
        if (string.IsNullOrWhiteSpace(info.NguonTiepNhan))
            errors["nguon_tiep_nhan"] = "Nguồn tiếp nhận là bắt buộc.";
        if (string.IsNullOrWhiteSpace(info.LoaiKham))
            errors["loai_kham"] = "Loại khám là bắt buộc.";
        if (string.IsNullOrWhiteSpace(info.LyDoKham))
            errors["ly_do_kham"] = "Lý do khám là bắt buộc.";
        if (string.IsNullOrWhiteSpace(info.MucUuTien))
            errors["muc_uu_tien"] = "Mức ưu tiên là bắt buộc.";
        if (string.IsNullOrWhiteSpace(info.DoiTuongThanhToan))
            errors["doi_tuong_thanh_toan"] = "Đối tượng thanh toán là bắt buộc.";

        if (IsLooseEqual(info.NguonTiepNhan, "Đặt lịch") && string.IsNullOrWhiteSpace(info.AppointmentCode))
        {
            errors["appointment_code"] = "Nguồn tiếp nhận là Đặt lịch thì cần mã lịch hẹn/check-in.";
        }

        if (IsLooseEqual(info.DoiTuongThanhToan, "Bảo hiểm"))
        {
            if (string.IsNullOrWhiteSpace(info.InsuranceSoThe))
            {
                errors["so_the_bhyt"] = "Người bệnh thanh toán bằng BHYT cần nhập số thẻ BHYT.";
            }

            if (!info.InsuranceNgayHetHan.HasValue)
            {
                errors["han_bhyt"] = "Người bệnh BHYT cần nhập hạn thẻ BHYT.";
            }
            else if (info.InsuranceNgayHetHan.Value.Date < DateTime.Today)
            {
                errors["han_bhyt"] = "Thẻ BHYT đã hết hạn.";
            }

            if (string.IsNullOrWhiteSpace(info.InsuranceNoiDangKyKcb))
            {
                errors["noi_dang_ky_kcb"] = "Người bệnh BHYT cần nhập nơi đăng ký KCB ban đầu.";
            }

            if (string.IsNullOrWhiteSpace(info.InsuranceTuyenKham))
            {
                errors["tuyen_kham"] = "Người bệnh BHYT cần nhập tuyến khám.";
            }
            else if ((IsLooseEqual(info.InsuranceTuyenKham, "Chuyển tuyến")
                    || IsLooseEqual(info.InsuranceTuyenKham, "Trái tuyến")
                    || IsLooseEqual(info.NguonTiepNhan, "Chuyển tuyến"))
                && string.IsNullOrWhiteSpace(info.InsuranceGiayChuyenTuyen))
            {
                errors["giay_chuyen_tuyen"] = "BHYT chuyển tuyến/trái tuyến cần nhập giấy chuyển tuyến hoặc ghi chú xử lý tuyến.";
            }
        }

        return errors;
    }

    private static Dictionary<string, string> ValidateVitalSigns(SinhHieuDto dto)
    {
        var errors = new Dictionary<string, string>();

        if (dto.SpO2.HasValue && (dto.SpO2 < 0 || dto.SpO2 > 100))
            errors["spo2"] = "SpO2 phĂ¡ÂºÂ£i nĂ¡ÂºÂ±m trong khoĂ¡ÂºÂ£ng 0-100.";
        if (dto.NhietDo.HasValue && (dto.NhietDo < 30 || dto.NhietDo > 45))
            errors["nhiet_do"] = "NhiĂ¡Â»â€¡t Ă„â€˜Ă¡Â»â„¢ phĂ¡ÂºÂ£i nĂ¡ÂºÂ±m trong khoĂ¡ÂºÂ£ng 30-45Ă‚Â°C.";
        if (dto.NhipTim.HasValue && (dto.NhipTim < 30 || dto.NhipTim > 220))
            errors["nhip_tim"] = "NhĂ¡Â»â€¹p tim phĂ¡ÂºÂ£i nĂ¡ÂºÂ±m trong khoĂ¡ÂºÂ£ng 30-220.";
        if (dto.NhipTho.HasValue && dto.NhipTho <= 0)
            errors["nhip_tho"] = "NhĂ¡Â»â€¹p thĂ¡Â»Å¸ phĂ¡ÂºÂ£i lÄ‚Â  sĂ¡Â»â€˜ dĂ†Â°Ă†Â¡ng.";
        if (dto.HuyetApTamThu.HasValue && dto.HuyetApTamThu <= 0)
            errors["ha_tam_thu"] = "HA tÄ‚Â¢m thu phĂ¡ÂºÂ£i lÄ‚Â  sĂ¡Â»â€˜ dĂ†Â°Ă†Â¡ng.";
        if (dto.HuyetApTamTruong.HasValue && dto.HuyetApTamTruong <= 0)
            errors["ha_tam_truong"] = "HA tÄ‚Â¢m trĂ†Â°Ă†Â¡ng phĂ¡ÂºÂ£i lÄ‚Â  sĂ¡Â»â€˜ dĂ†Â°Ă†Â¡ng.";
        if (dto.ChieuCao.HasValue && dto.ChieuCao <= 0)
            errors["chieu_cao"] = "ChiĂ¡Â»Âu cao phĂ¡ÂºÂ£i lÄ‚Â  sĂ¡Â»â€˜ dĂ†Â°Ă†Â¡ng.";
        if (dto.CanNang.HasValue && dto.CanNang <= 0)
            errors["can_nang"] = "CÄ‚Â¢n nĂ¡ÂºÂ·ng phĂ¡ÂºÂ£i lÄ‚Â  sĂ¡Â»â€˜ dĂ†Â°Ă†Â¡ng.";
        if (dto.MucDoDau.HasValue && (dto.MucDoDau < 0 || dto.MucDoDau > 10))
            errors["muc_do_dau"] = "MĂ¡Â»Â©c Ă„â€˜Ă¡Â»â„¢ Ă„â€˜au phĂ¡ÂºÂ£i tĂ¡Â»Â« 0 Ă„â€˜Ă¡ÂºÂ¿n 10.";

        return errors;
    }

    private static string? Clean(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return null;
        return value.Trim();
    }

    private static object ToPatientDto(BenhNhan bn)
    {
        return new
        {
            bn.Id,
            bn.MaBn,
            bn.HoTen,
            NgaySinh = bn.NgaySinh?.ToString("yyyy-MM-dd"),
            bn.GioiTinh,
            CCCD = bn.Cccd,
            SoDienThoai = bn.SoDienThoai,
            bn.Email,
            bn.NgheNghiep,
            bn.DiaChiDuong,
            bn.DiaChiXa,
            bn.DiaChiHuyen,
            bn.DiaChiTinh,
            bn.DanToc,
            QuocTich = bn.QuocTich,
            bn.QuocGia,
            bn.NguoiLienHeKhanCap,
            bn.SdtLienHeKhanCap,
            bn.QuanHeLienHeKhanCap,
            bn.NguoiGiamHo,
            bn.SdtGiamHo,
            bn.QuanHeGiamHo,
            bn.GhiChuDinhDanh,
            bn.IsPotentialDuplicate
        };
    }

    private static string SerializeEncounterMeta(ReceptionInfoDto? info)
    {
        var payload = new
        {
            receptionArea = new
            {
                idKhu = info?.IdKhuTiepDon,
                maKhu = Clean(info?.MaKhuTiepDon),
                tenKhu = Clean(info?.TenKhuTiepDon),
                idQuay = info?.IdQuayTiepDon,
                maQuay = Clean(info?.MaQuayTiepDon),
                tenQuay = Clean(info?.TenQuayTiepDon),
                lyDoChuyenKhu = Clean(info?.LyDoChuyenKhu)
            },
            sourceType = Clean(info?.NguonTiepNhan),
            visitType = Clean(info?.LoaiKham),
            reasonForVisit = Clean(info?.LyDoKham),
            initialSymptoms = Clean(info?.TrieuChungBanDau),
            symptomStartedAt = info?.ThoiGianXuatHienTrieuChung,
            painScore = info?.MucDoDau,
            priority = Clean(info?.MucUuTien),
            receptionNote = Clean(info?.GhiChuTiepDon),
            paymentObject = Clean(info?.DoiTuongThanhToan),
            additionalVisitReason = Clean(info?.LyDoTaoThemLuotTrongNgay),
            appointmentCode = Clean(info?.AppointmentCode),
            isAppointmentLate = info?.IsAppointmentLate,
            insurance = new
            {
                soThe = Clean(info?.InsuranceSoThe),
                ngayHetHan = info?.InsuranceNgayHetHan,
                noiDangKyKcb = Clean(info?.InsuranceNoiDangKyKcb),
                tuyenKham = Clean(info?.InsuranceTuyenKham),
                giayChuyenTuyen = Clean(info?.InsuranceGiayChuyenTuyen)
            },
            quickScreening = new
            {
                diUngThuoc = Clean(info?.TinhTrangDiUngThuoc),
                benhNen = Clean(info?.BenhNen),
                tinhTrangMangThai = Clean(info?.TinhTrangMangThai),
                trieuChungNguyHiem = info?.TrieuChungNguyHiem ?? new List<string>()
            }
        };
        return MetaPrefix + JsonSerializer.Serialize(payload);
    }

    private static ReceptionInfoDto DeserializeEncounterMeta(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return new ReceptionInfoDto();

        if (!raw.StartsWith(MetaPrefix, StringComparison.Ordinal))
        {
            return new ReceptionInfoDto
            {
                GhiChuTiepDon = raw
            };
        }

        try
        {
            var json = raw[MetaPrefix.Length..];
            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;
            var dto = new ReceptionInfoDto
            {
                NguonTiepNhan = root.TryGetProperty("sourceType", out var source) ? source.GetString() : null,
                LoaiKham = root.TryGetProperty("visitType", out var visit) ? visit.GetString() : null,
                LyDoKham = root.TryGetProperty("reasonForVisit", out var reason) ? reason.GetString() : null,
                TrieuChungBanDau = root.TryGetProperty("initialSymptoms", out var symptom) ? symptom.GetString() : null,
                ThoiGianXuatHienTrieuChung = root.TryGetProperty("symptomStartedAt", out var symptomAt)
                    && symptomAt.ValueKind == JsonValueKind.String
                    && DateTime.TryParse(symptomAt.GetString(), out var parsedSymptomAt)
                        ? parsedSymptomAt
                        : null,
                MucDoDau = root.TryGetProperty("painScore", out var pain) && pain.TryGetInt32(out var painScore)
                    ? painScore
                    : null,
                MucUuTien = root.TryGetProperty("priority", out var priority) ? priority.GetString() : null,
                GhiChuTiepDon = root.TryGetProperty("receptionNote", out var note) ? note.GetString() : null,
                DoiTuongThanhToan = root.TryGetProperty("paymentObject", out var pay) ? pay.GetString() : null,
                LyDoTaoThemLuotTrongNgay = root.TryGetProperty("additionalVisitReason", out var add) ? add.GetString() : null,
                AppointmentCode = root.TryGetProperty("appointmentCode", out var appCode) ? appCode.GetString() : null,
                IsAppointmentLate = root.TryGetProperty("isAppointmentLate", out var appLate) && appLate.ValueKind is JsonValueKind.True or JsonValueKind.False
                    ? appLate.GetBoolean()
                    : null,
            };

            if (root.TryGetProperty("receptionArea", out var receptionArea) && receptionArea.ValueKind == JsonValueKind.Object)
            {
                dto.IdKhuTiepDon = receptionArea.TryGetProperty("idKhu", out var idKhu) && idKhu.TryGetInt32(out var parsedKhu)
                    ? parsedKhu
                    : null;
                dto.MaKhuTiepDon = receptionArea.TryGetProperty("maKhu", out var maKhu) ? maKhu.GetString() : null;
                dto.TenKhuTiepDon = receptionArea.TryGetProperty("tenKhu", out var tenKhu) ? tenKhu.GetString() : null;
                dto.IdQuayTiepDon = receptionArea.TryGetProperty("idQuay", out var idQuay) && idQuay.TryGetInt32(out var parsedQuay)
                    ? parsedQuay
                    : null;
                dto.MaQuayTiepDon = receptionArea.TryGetProperty("maQuay", out var maQuay) ? maQuay.GetString() : null;
                dto.TenQuayTiepDon = receptionArea.TryGetProperty("tenQuay", out var tenQuay) ? tenQuay.GetString() : null;
                dto.LyDoChuyenKhu = receptionArea.TryGetProperty("lyDoChuyenKhu", out var areaReason) ? areaReason.GetString() : null;
            }

            if (root.TryGetProperty("insurance", out var insurance) && insurance.ValueKind == JsonValueKind.Object)
            {
                dto.InsuranceSoThe = insurance.TryGetProperty("soThe", out var soThe) ? soThe.GetString() : null;
                dto.InsuranceNoiDangKyKcb = insurance.TryGetProperty("noiDangKyKcb", out var noiKcb) ? noiKcb.GetString() : null;
                dto.InsuranceTuyenKham = insurance.TryGetProperty("tuyenKham", out var tuyen) ? tuyen.GetString() : null;
                dto.InsuranceGiayChuyenTuyen = insurance.TryGetProperty("giayChuyenTuyen", out var gct) ? gct.GetString() : null;
                if (insurance.TryGetProperty("ngayHetHan", out var expiry)
                    && expiry.ValueKind == JsonValueKind.String
                    && DateTime.TryParse(expiry.GetString(), out var parsedExpiry))
                {
                    dto.InsuranceNgayHetHan = parsedExpiry;
                }
            }

            if (root.TryGetProperty("quickScreening", out var quick) && quick.ValueKind == JsonValueKind.Object)
            {
                dto.TinhTrangDiUngThuoc = quick.TryGetProperty("diUngThuoc", out var allergy) ? allergy.GetString() : null;
                dto.BenhNen = quick.TryGetProperty("benhNen", out var chronic) ? chronic.GetString() : null;
                dto.TinhTrangMangThai = quick.TryGetProperty("tinhTrangMangThai", out var preg) ? preg.GetString() : null;
                if (quick.TryGetProperty("trieuChungNguyHiem", out var danger) && danger.ValueKind == JsonValueKind.Array)
                {
                    dto.TrieuChungNguyHiem = danger.EnumerateArray()
                        .Where(x => x.ValueKind == JsonValueKind.String)
                        .Select(x => x.GetString() ?? string.Empty)
                        .Where(x => !string.IsNullOrWhiteSpace(x))
                        .ToList();
                }
            }
            return dto;
        }
        catch
        {
            return new ReceptionInfoDto();
        }
    }

    private sealed record EncounterMutationGuard(
        bool HasPaidInvoice,
        bool HasPerformedService,
        bool BlocksCancel,
        bool BlocksAreaTransfer,
        string State,
        string Message,
        object Details);

    private sealed record GuardInvoiceSnapshot(long Id, string MaHd, string? LoaiHoaDon, decimal? TongTien);
    private sealed record GuardPerformedServiceSnapshot(long Id, long? IdLanKham, long? IdDichVu, string? TrangThai);
    private sealed record GuardPerformedClsSnapshot(long Id, long IdLanKham, long? IdDvkt, string? TrangThai);

    private async Task<EncounterMutationGuard> GetEncounterMutationGuardAsync(long encounterId, long? patientId, DateTime? encounterDate)
    {
        var visitIds = await _db.LanKhams
            .AsNoTracking()
            .Where(l => l.IdHoSo == encounterId)
            .Select(l => l.Id)
            .ToListAsync();

        var paidInvoicesByVisit = new List<GuardInvoiceSnapshot>();
        if (visitIds.Count > 0)
        {
            paidInvoicesByVisit = await _db.HoaDons
                .AsNoTracking()
                .Where(h => h.IdLanKham.HasValue
                    && visitIds.Contains(h.IdLanKham.Value)
                    && h.TrangThai == "DA_THANH_TOAN")
                .Select(h => new GuardInvoiceSnapshot(h.Id, h.MaHd, h.LoaiHoaDon, h.TongTien))
                .ToListAsync();
        }

        var paidInvoicesByDay = new List<GuardInvoiceSnapshot>();
        if (patientId.HasValue && encounterDate.HasValue)
        {
            var date = encounterDate.Value.Date;
            paidInvoicesByDay = await _db.HoaDons
                .AsNoTracking()
                .Where(h => h.IdBenhNhan == patientId.Value
                    && h.NgayTao.HasValue
                    && h.NgayTao.Value.Date == date
                    && h.TrangThai == "DA_THANH_TOAN")
                .Select(h => new GuardInvoiceSnapshot(h.Id, h.MaHd, h.LoaiHoaDon, h.TongTien))
                .ToListAsync();
        }

        var paidInvoices = paidInvoicesByVisit
            .Concat(paidInvoicesByDay)
            .GroupBy(x => x.Id)
            .Select(g => g.First())
            .ToList();

        var performedDv = new List<GuardPerformedServiceSnapshot>();
        if (visitIds.Count > 0)
        {
            performedDv = await _db.LanKhamDichVus
                .AsNoTracking()
                .Where(x => x.IdLanKham.HasValue
                    && visitIds.Contains(x.IdLanKham.Value)
                    && x.TrangThaiThucHien != null
                    && x.TrangThaiThucHien != "CHO_THUC_HIEN"
                    && x.TrangThaiThucHien != "DA_HUY")
                .Select(x => new GuardPerformedServiceSnapshot(x.Id, x.IdLanKham, x.IdDichVu, x.TrangThaiThucHien))
                .ToListAsync();
        }

        var performedCls = new List<GuardPerformedClsSnapshot>();
        if (visitIds.Count > 0)
        {
            performedCls = await _db.ChiDinhDvkts
                .AsNoTracking()
                .Where(x => visitIds.Contains(x.IdLanKham)
                    && x.TrangThai != null
                    && x.TrangThai.ToLower() != "pending"
                    && x.TrangThai.ToLower() != "ordered"
                    && x.TrangThai.ToLower() != "canceled")
                .Select(x => new GuardPerformedClsSnapshot(x.Id, x.IdLanKham, x.IdDvkt, x.TrangThai))
                .ToListAsync();
        }

        var hasPaidInvoice = paidInvoices.Count > 0;
        var hasPerformedService = performedDv.Count > 0 || performedCls.Count > 0;
        var blocks = hasPaidInvoice || hasPerformedService;
        var state = hasPaidInvoice
            ? "ENCOUNTER_HAS_PAID_INVOICE"
            : hasPerformedService
                ? "ENCOUNTER_HAS_PERFORMED_SERVICE"
                : "OK";
        var message = hasPaidInvoice
            ? "Hồ sơ đã có hóa đơn thanh toán, không cho phép hủy/chuyển khu trực tiếp."
            : hasPerformedService
                ? "Hồ sơ đã có dịch vụ thực hiện/có kết quả, không cho phép hủy/chuyển khu trực tiếp."
                : string.Empty;

        return new EncounterMutationGuard(
            hasPaidInvoice,
            hasPerformedService,
            blocks,
            blocks,
            state,
            message,
            new
            {
                paidInvoices,
                performedServices = performedDv,
                performedCls
            });
    }

    private Task<TiepDonTrangThaiLog?> GetLatestAreaTransferLogAsync(long encounterId) =>
        _db.TiepDonTrangThaiLogs
            .AsNoTracking()
            .Where(x => x.IdHoSo == encounterId && x.Action == "AREA_TRANSFER_REQUESTED")
            .OrderByDescending(x => x.CreatedAt)
            .ThenByDescending(x => x.Id)
            .FirstOrDefaultAsync();

    private static int? ReadIntFromLogMetadata(string? metadata, string propertyName)
    {
        if (string.IsNullOrWhiteSpace(metadata)) return null;

        try
        {
            using var doc = JsonDocument.Parse(metadata);
            if (!doc.RootElement.TryGetProperty(propertyName, out var value)) return null;
            if (value.ValueKind == JsonValueKind.Number && value.TryGetInt32(out var number)) return number;
            if (value.ValueKind == JsonValueKind.String && int.TryParse(value.GetString(), out var parsed)) return parsed;
        }
        catch
        {
            return null;
        }

        return null;
    }

    private async Task<IActionResult?> EnsurePermissionAsync(string action)
    {
        var userId = GetCurrentUserId();
        if (!userId.HasValue)
            return Unauthorized(new { message = "KhÄ‚Â´ng xÄ‚Â¡c Ă„â€˜Ă¡Â»â€¹nh Ă„â€˜Ă†Â°Ă¡Â»Â£c ngĂ†Â°Ă¡Â»Âi dÄ‚Â¹ng tĂ¡Â»Â« token." });

        var allowed = await HasPermissionAsync(userId.Value, action);
        if (allowed) return null;

        return StatusCode(403, new { message = $"BĂ¡ÂºÂ¡n khÄ‚Â´ng cÄ‚Â³ quyĂ¡Â»Ân '{action}' cho chĂ¡Â»Â©c nĂ„Æ’ng tiĂ¡ÂºÂ¿p Ă„â€˜Ä‚Â³n." });
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

    private string GetCurrentRoleCode()
    {
        var role = User.FindFirstValue(ClaimTypes.Role)
                   ?? User.FindFirstValue("role")
                   ?? string.Empty;
        return role.Trim().ToUpperInvariant();
    }

    private long ResolveActorId(long? fallback)
    {
        var current = GetCurrentUserId();
        if (current.HasValue && current.Value > 0) return current.Value;
        if (fallback.HasValue && fallback.Value > 0) return fallback.Value;
        return 0;
    }

    private static string BuildIdempotencyKey(string prefix, long actorId, long domainId, string? rawKey)
    {
        var normalized = Clean(rawKey);
        if (string.IsNullOrWhiteSpace(normalized)) return string.Empty;
        return $"{prefix}:{actorId}:{domainId}:{normalized}";
    }

    private static long ComputePatientDomainKey(PatientCreateRequest req)
    {
        var signature = string.Join("|",
            Clean(req.CCCD) ?? string.Empty,
            Clean(req.So_dien_thoai) ?? string.Empty,
            Clean(req.Ho_ten) ?? string.Empty,
            req.Ngay_sinh?.ToString("yyyyMMdd") ?? string.Empty);

        return Math.Abs(signature.GetHashCode());
    }

    private bool TryGetIdempotentResult(string cacheKey, out object payload)
    {
        payload = null!;
        if (string.IsNullOrWhiteSpace(cacheKey)) return false;
        if (_cache.TryGetValue(cacheKey, out object? cached) && cached != null)
        {
            payload = cached;
            return true;
        }
        return false;
    }

    private void SetIdempotentResult(string cacheKey, object payload)
    {
        if (string.IsNullOrWhiteSpace(cacheKey) || payload == null) return;
        _cache.Set(cacheKey, payload, TimeSpan.FromMinutes(3));
    }

    private static bool IsDuplicateActiveEncounterIndex(DbUpdateException ex)
    {
        var message = ex.InnerException?.Message ?? ex.Message ?? string.Empty;
        return message.Contains("UX_ho_so_benh_an_bn_day_active", StringComparison.OrdinalIgnoreCase);
    }

    private static (int page, int pageSize) NormalizePaging(int page, int pageSize)
    {
        var p = page <= 0 ? 1 : page;
        var ps = pageSize <= 0 ? 20 : pageSize;
        ps = Math.Min(ps, 200);
        return (p, ps);
    }

    private static string EscapeCsv(string? input)
    {
        var value = input ?? string.Empty;
        if (value.Contains('"') || value.Contains(',') || value.Contains('\n') || value.Contains('\r'))
            return "\"" + value.Replace("\"", "\"\"") + "\"";
        return value;
    }

    private static string AppendNote(string? source, string note)
    {
        if (string.IsNullOrWhiteSpace(source)) return note;
        return $"{source} | {note}";
    }

    private sealed class WardSearchItem
    {
        public string Code { get; set; } = string.Empty;
        public string Type { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string NameWithType { get; set; } = string.Empty;
        public string Path { get; set; } = string.Empty;
        public string PathWithType { get; set; } = string.Empty;
        public string ProvinceCode { get; set; } = string.Empty;
        public string ProvinceName { get; set; } = string.Empty;
        public string ProvinceWithType { get; set; } = string.Empty;
        public string Slug { get; set; } = string.Empty;
        public string NameNorm { get; set; } = string.Empty;
        public string NameCompact { get; set; } = string.Empty;
        public string NameWithTypeCompact { get; set; } = string.Empty;
        public string PathCompact { get; set; } = string.Empty;
        public string Initials { get; set; } = string.Empty;
        public string PathInitials { get; set; } = string.Empty;
    }

    private sealed class ProvinceInfo
    {
        public string Name { get; set; } = string.Empty;
        public string NameWithType { get; set; } = string.Empty;
    }
}

