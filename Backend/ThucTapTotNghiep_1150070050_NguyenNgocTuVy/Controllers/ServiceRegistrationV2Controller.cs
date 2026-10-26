using System.Security.Claims;
using System.Text.Encodings.Web;
using System.Text.Json;
using ThucTapTotNghiep_1150070050_NguyenNgocTuVy.Data;
using ThucTapTotNghiep_1150070050_NguyenNgocTuVy.Dtos;
using ThucTapTotNghiep_1150070050_NguyenNgocTuVy.Models;
using ThucTapTotNghiep_1150070050_NguyenNgocTuVy.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace ThucTapTotNghiep_1150070050_NguyenNgocTuVy.Controllers;

[Authorize]
[ApiController]
[Route("api/chidinh/v2")]
public class ServiceRegistrationV2Controller : ControllerBase
{
    private const string FeatureCode = "TIEP_DON";
    private const string IdempotencyCachePrefix = "SERVICE_ORDER_CONFIRM";
    private static readonly JsonSerializerOptions CompactJsonOptions = new()
    {
        Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping
    };

    private readonly DACNDbContext _db;
    private readonly PricingService _pricing;
    private readonly ICodeGenerator _code;
    private readonly IHoSoTrangThaiService _status;
    private readonly IConfiguration _configuration;
    private readonly IMemoryCache _cache;

    public ServiceRegistrationV2Controller(
        DACNDbContext db,
        PricingService pricing,
        ICodeGenerator code,
        IHoSoTrangThaiService status,
        IConfiguration configuration,
        IMemoryCache cache)
    {
        _db = db;
        _pricing = pricing;
        _code = code;
        _status = status;
        _configuration = configuration;
        _cache = cache;
    }

    [HttpGet("encounters/{id:long}")]
    public async Task<IActionResult> GetEncounterSummary(long id)
    {
        var denied = await EnsurePermissionAsync("xem");
        if (denied != null) return denied;

        var encounter = await _db.HoSoBenhAns
            .AsNoTracking()
            .Include(h => h.IdBenhNhanNavigation)
            .Include(h => h.IdKhuTiepDonNavigation)
            .Include(h => h.IdQuayTiepDonNavigation)
            .FirstOrDefaultAsync(h => h.Id == id);

        if (encounter == null || encounter.IdBenhNhanNavigation == null)
        {
            return NotFound(new { message = "Không tìm thấy hồ sơ tiếp đón." });
        }

        var patient = encounter.IdBenhNhanNavigation;
        string? sourceType = null;
        string? visitType = null;
        string? priority = null;
        string? paymentObject = null;
        string? reasonForVisit = null;

        if (!string.IsNullOrWhiteSpace(encounter.GhiChu) && encounter.GhiChu.StartsWith("[RECEPTION_META]", StringComparison.Ordinal))
        {
            try
            {
                using var doc = JsonDocument.Parse(encounter.GhiChu["[RECEPTION_META]".Length..]);
                var root = doc.RootElement;
                sourceType = root.TryGetProperty("sourceType", out var sourceEl) ? sourceEl.GetString() : null;
                visitType = root.TryGetProperty("visitType", out var visitEl) ? visitEl.GetString() : null;
                priority = root.TryGetProperty("priority", out var priorityEl) ? priorityEl.GetString() : null;
                paymentObject = root.TryGetProperty("paymentObject", out var paymentEl) ? paymentEl.GetString() : null;
                reasonForVisit = root.TryGetProperty("reasonForVisit", out var reasonEl) ? reasonEl.GetString() : null;
            }
            catch
            {
                // Ignore malformed metadata from legacy records.
            }
        }
        var encounterLanKhamIds = await _db.LanKhams
            .AsNoTracking()
            .Where(l => l.IdHoSo == encounter.Id)
            .Select(l => l.Id)
            .ToListAsync();

        HoaDon? order = null;
        if (encounterLanKhamIds.Count > 0)
        {
            order = await _db.HoaDons
                .AsNoTracking()
                .Include(h => h.ChiTietHoaDons)
                .Where(h =>
                    h.IdLanKham.HasValue &&
                    encounterLanKhamIds.Contains(h.IdLanKham.Value) &&
                    h.LoaiHoaDon == "DANG_KY_DICH_VU" &&
                    h.TrangThai != "HUY")
                .OrderByDescending(h => h.NgayTao)
                .FirstOrDefaultAsync();
        }

        var orderLines = new List<object>();
        if (order != null)
        {
            var serviceIds = order.ChiTietHoaDons
                .Where(x =>
                    string.Equals(x.LoaiThamChieu, "SERVICE_ORDER_LINE", StringComparison.OrdinalIgnoreCase) &&
                    x.IdThamChieu.HasValue)
                .Select(x => x.IdThamChieu!.Value)
                .Distinct()
                .ToList();

            var serviceLookup = serviceIds.Count == 0
                ? new Dictionary<long, DichVu>()
                : await _db.DichVus
                    .AsNoTracking()
                    .Include(d => d.IdPhongNavigation)
                        .ThenInclude(p => p.IdKhuTiepDonNavigation)
                    .Where(d => serviceIds.Contains(d.Id))
                    .ToDictionaryAsync(d => d.Id);

            foreach (var line in order.ChiTietHoaDons.Where(x =>
                         string.Equals(x.LoaiThamChieu, "SERVICE_ORDER_LINE", StringComparison.OrdinalIgnoreCase)))
            {
                var sid = line.IdThamChieu ?? 0;
                serviceLookup.TryGetValue(sid, out var service);

                string roomName = service?.IdPhongNavigation?.TenPhong ?? string.Empty;
                if (!string.IsNullOrWhiteSpace(line.MoTa))
                {
                    try
                    {
                        using var doc = JsonDocument.Parse(line.MoTa);
                        if (string.IsNullOrWhiteSpace(roomName)
                            && doc.RootElement.TryGetProperty("roomName", out var roomEl))
                        {
                            roomName = roomEl.GetString() ?? roomName;
                        }
                    }
                    catch
                    {
                        // Keep fallback values from snapshot/join.
                    }
                }

                orderLines.Add(new
                {
                    line.Id,
                    serviceId = sid,
                    serviceCode = service?.Ma,
                    serviceName = service?.Ten,
                    roomId = service?.IdPhong,
                    roomName,
                    roomAreaId = service?.IdPhongNavigation?.IdKhuTiepDon,
                    roomAreaCode = service?.IdPhongNavigation?.IdKhuTiepDonNavigation?.MaKhu,
                    roomAreaName = service?.IdPhongNavigation?.IdKhuTiepDonNavigation?.TenKhu,
                    unitPrice = line.DonGia,
                    totalPrice = line.ThanhTien
                });
            }
        }

        return Ok(new
        {
            encounter = new
            {
                encounter.Id,
                encounter.MaHs,
                TrangThai = _status.NormalizeStatus(encounter.TrangThai),
                encounter.NgayTao,
                sourceType,
                visitType,
                priority,
                paymentObject,
                reasonForVisit,
                khuTiepDon = encounter.IdKhuTiepDon.HasValue
                    ? new
                    {
                        id = encounter.IdKhuTiepDon,
                        maKhu = encounter.IdKhuTiepDonNavigation?.MaKhu,
                        tenKhu = encounter.IdKhuTiepDonNavigation?.TenKhu
                    }
                    : null,
                quayTiepDon = encounter.IdQuayTiepDon.HasValue
                    ? new
                    {
                        id = encounter.IdQuayTiepDon,
                        maQuay = encounter.IdQuayTiepDonNavigation?.MaQuay,
                        tenQuay = encounter.IdQuayTiepDonNavigation?.TenQuay
                    }
                    : null
            },
            patient = new
            {
                patient.Id,
                patient.MaBn,
                patient.HoTen,
                NgaySinh = patient.NgaySinh?.ToString("yyyy-MM-dd"),
                patient.GioiTinh,
                patient.SoDienThoai
            },
            serviceOrder = order == null
                ? null
                : new
                {
                    order.Id,
                    order.MaHd,
                    order.TrangThai,
                    temporaryTotal = order.TongTienTruoc ?? order.TongTien ?? 0m,
                    lines = orderLines
                }
        });
    }

    [HttpGet("services")]
    public async Task<IActionResult> GetServiceCatalog([FromQuery] ServiceCatalogQueryDto query)
    {
        var denied = await EnsurePermissionAsync("xem");
        if (denied != null) return denied;

        int? encounterAreaId = null;
        string? paymentObject = null;
        if (query.EncounterId.HasValue && query.EncounterId.Value > 0)
        {
            var encounterSnapshot = await _db.HoSoBenhAns
                .AsNoTracking()
                .Where(h => h.Id == query.EncounterId.Value)
                .Select(h => new { h.IdKhuTiepDon, h.GhiChu })
                .FirstOrDefaultAsync();
            encounterAreaId = encounterSnapshot?.IdKhuTiepDon;
            paymentObject = ExtractEncounterPaymentObject(encounterSnapshot?.GhiChu);
        }
        var targetAreaId = encounterAreaId ?? query.IdKhuTiepDon;

        var services = await _db.DichVus
            .AsNoTracking()
            .Include(d => d.IdPhongNavigation)
                .ThenInclude(p => p.IdKhuTiepDonNavigation)
            .Include(d => d.IdNhomNavigation)
            .Where(d => d.HoatDong == true && d.IdPhongNavigation != null)
            .ToListAsync();

        var roomQueueLookup = await _db.LanKhams
            .AsNoTracking()
            .Where(l => l.IdPhong.HasValue && (l.TrangThai == "CHO_KHAM" || l.TrangThai == "DANG_KHAM"))
            .GroupBy(l => l.IdPhong!.Value)
            .Select(g => new { IdPhong = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.IdPhong, x => x.Count);

        var roomNameCanon = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        string NormalizeRoomName(string? name)
        {
            var n = (name ?? string.Empty).Trim();
            if (string.IsNullOrWhiteSpace(n)) return "Phòng khám";
            if (!roomNameCanon.TryGetValue(n, out var canon))
            {
                canon = string.Join(" ", n.Split(' ', StringSplitOptions.RemoveEmptyEntries));
                roomNameCanon[n] = canon;
            }
            return canon;
        }

        var result = new List<ClinicWithPriceDto>();
        foreach (var dv in services)
        {
            if (!dv.IdPhong.HasValue || dv.IdPhongNavigation == null) continue;

            var donGia = await _pricing.GetCurrentPriceAsync(dv.Id, dv.IdPhong.Value, paymentObject);
            if (!donGia.HasValue || donGia.Value <= 0) continue;

            var roomStatus = dv.IdPhongNavigation.HoatDong == true ? "DANG_MO" : "TAM_NGUNG";
            var roomAreaId = dv.IdPhongNavigation.IdKhuTiepDon;
            var roomActive = dv.IdPhongNavigation.HoatDong == true;
            var areaMatched = targetAreaId.HasValue
                && roomAreaId.HasValue
                && roomAreaId.Value == targetAreaId.Value;
            string? disableReason = null;
            if (!targetAreaId.HasValue)
            {
                disableReason = "Hồ sơ chưa có khu tiếp đón.";
            }
            else if (!roomAreaId.HasValue)
            {
                disableReason = "Phòng chưa được map khu tiếp đón.";
            }
            else if (roomAreaId.Value != targetAreaId.Value)
            {
                disableReason = "Phòng thuộc khu khác với khu tiếp đón của hồ sơ.";
            }
            else if (!roomActive)
            {
                disableReason = "Phòng đang tạm ngưng hoặc hết giờ.";
            }

            result.Add(new ClinicWithPriceDto
            {
                IdPhong = dv.IdPhong.Value,
                TenPhong = NormalizeRoomName(dv.IdPhongNavigation.TenPhong),
                IdKhuTiepDon = roomAreaId,
                MaKhuTiepDon = dv.IdPhongNavigation.IdKhuTiepDonNavigation?.MaKhu,
                TenKhuTiepDon = dv.IdPhongNavigation.IdKhuTiepDonNavigation?.TenKhu,
                IdKhuHoSo = targetAreaId,
                KhuHopLe = areaMatched,
                CanSelect = string.IsNullOrWhiteSpace(disableReason),
                LyDoKhongChon = disableReason,
                TrangThaiPhong = roomStatus,
                SoChoDangCho = roomQueueLookup.TryGetValue(dv.IdPhong.Value, out var waiting) ? waiting : 0,
                IdDichVu = dv.Id,
                MaDichVu = dv.Ma,
                TenDichVu = dv.Ten ?? string.Empty,
                NhomDichVu = dv.IdNhomNavigation?.Ten ?? "Khám phòng",
                DonGia = donGia.Value
            });
        }

        return Ok(result.OrderBy(x => x.TenPhong).ThenBy(x => x.TenDichVu));
    }

    [HttpPost("service-orders/draft")]
    public Task<IActionResult> SaveDraft([FromBody] ServiceOrderRequestDto req)
        => SaveOrderInternal(req, isDraft: true);

    [HttpPost("service-orders/confirm")]
    public Task<IActionResult> ConfirmOrder([FromBody] ServiceOrderRequestDto req)
        => SaveOrderInternal(req, isDraft: false);

    private async Task<IActionResult> SaveOrderInternal(ServiceOrderRequestDto req, bool isDraft)
    {
        var denied = await EnsurePermissionAsync("them");
        if (denied != null) return denied;

        if (req == null || req.EncounterId <= 0 || req.PatientId <= 0)
        {
            return BadRequest(new { message = "Thiếu dữ liệu hồ sơ/bệnh nhân." });
        }

        var distinctServiceIds = (req.ServiceIds ?? new List<long>())
            .Where(x => x > 0)
            .Distinct()
            .ToList();

        if (distinctServiceIds.Count == 0)
        {
            return BadRequest(new { message = "Cần chọn ít nhất 1 dịch vụ." });
        }

        var actorId = GetCurrentUserId();
        var now = DateTime.Now;
        var roleCode = (User.FindFirstValue(ClaimTypes.Role) ?? User.FindFirstValue("role") ?? string.Empty).Trim().ToUpperInvariant();
        var idempotencyKey = BuildIdempotencyKey(IdempotencyCachePrefix, actorId ?? 0, req.EncounterId, req.IdempotencyKey);

        if (!isDraft && TryGetIdempotentResult(idempotencyKey, out var cachedPayload))
        {
            return Ok(cachedPayload);
        }

        var encounter = await _db.HoSoBenhAns
            .Include(h => h.IdBenhNhanNavigation)
            .Include(h => h.IdKhuTiepDonNavigation)
            .FirstOrDefaultAsync(h => h.Id == req.EncounterId && h.IdBenhNhan == req.PatientId);
        if (encounter == null)
        {
            return NotFound(new { message = "Không tìm thấy hồ sơ phù hợp." });
        }

        var status = _status.NormalizeStatus(encounter.TrangThai);
        if (_status.IsCancelled(status))
        {
            return BadRequest(new { message = "Hồ sơ đã hủy, không thể đăng ký dịch vụ." });
        }
        if (_status.IsClosedOrCompleted(status))
        {
            return BadRequest(new { message = "Hồ sơ đã hoàn tất/đóng, không thể đăng ký dịch vụ." });
        }

        if (status is HoSoTrangThaiService.ChoKham
            or HoSoTrangThaiService.DangKham
            or HoSoTrangThaiService.ChoCanLamSang
            or HoSoTrangThaiService.ChoKetQua
            or HoSoTrangThaiService.ChoKetLuan)
        {
            return BadRequest(new
            {
                message = "Hồ sơ đã qua bước đăng ký dịch vụ ban đầu, Reception không thể xác nhận lại dịch vụ."
            });
        }

        if (!_status.CanEditServiceOrder(status, roleCode))
        {
            return BadRequest(new { message = $"Trạng thái '{status}' không hợp lệ để đăng ký dịch vụ." });
        }

        var selectedServices = await _db.DichVus
            .Include(x => x.IdPhongNavigation)
                .ThenInclude(p => p.IdKhuTiepDonNavigation)
            .Where(x => distinctServiceIds.Contains(x.Id) && x.HoatDong == true && x.IdPhong.HasValue)
            .ToListAsync();

        if (selectedServices.Count != distinctServiceIds.Count)
        {
            return BadRequest(new { message = "Có dịch vụ không hợp lệ hoặc đã ngưng hoạt động." });
        }

        var roomInactive = selectedServices.FirstOrDefault(s => s.IdPhongNavigation?.HoatDong != true);
        if (roomInactive != null)
        {
            return BadRequest(new
            {
                message = $"Phòng của dịch vụ '{roomInactive.Ten}' đang tạm ngưng hoặc hết giờ."
            });
        }

        if (!encounter.IdKhuTiepDon.HasValue)
        {
            return BadRequest(new
            {
                state = "ENCOUNTER_AREA_MISSING",
                message = "Hồ sơ chưa có khu tiếp đón. Vui lòng cập nhật khu tiếp đón trước khi chỉ định dịch vụ."
            });
        }

        var areaMismatch = selectedServices
            .Where(s => s.IdPhongNavigation == null
                || !s.IdPhongNavigation.IdKhuTiepDon.HasValue
                || s.IdPhongNavigation.IdKhuTiepDon.Value != encounter.IdKhuTiepDon.Value)
            .Select(s => new
            {
                serviceId = s.Id,
                serviceCode = s.Ma,
                serviceName = s.Ten,
                roomId = s.IdPhong,
                roomName = s.IdPhongNavigation?.TenPhong,
                roomAreaId = s.IdPhongNavigation?.IdKhuTiepDon,
                roomAreaCode = s.IdPhongNavigation?.IdKhuTiepDonNavigation?.MaKhu,
                roomAreaName = s.IdPhongNavigation?.IdKhuTiepDonNavigation?.TenKhu,
                reason = s.IdPhongNavigation?.IdKhuTiepDon == null
                    ? "ROOM_AREA_MISSING"
                    : "ROOM_AREA_MISMATCH"
            })
            .ToList();

        if (areaMismatch.Count > 0)
        {
            return BadRequest(new
            {
                state = areaMismatch.Any(x => x.reason == "ROOM_AREA_MISSING")
                    ? "ROOM_AREA_MISSING"
                    : "SERVICE_AREA_MISMATCH",
                message = "Có dịch vụ/phòng không thuộc khu tiếp đón của hồ sơ. Vui lòng chỉ chọn dịch vụ đúng khu.",
                encounterArea = new
                {
                    id = encounter.IdKhuTiepDon,
                    maKhu = encounter.IdKhuTiepDonNavigation?.MaKhu,
                    tenKhu = encounter.IdKhuTiepDonNavigation?.TenKhu
                },
                invalidServices = areaMismatch
            });
        }

        var existingServiceLines = await (
            from line in _db.LanKhamDichVus.AsNoTracking()
            join visit in _db.LanKhams.AsNoTracking() on line.IdLanKham equals visit.Id
            join service in _db.DichVus.AsNoTracking() on line.IdDichVu equals service.Id
            join room in _db.PhongKhams.AsNoTracking() on visit.IdPhong equals (int?)room.Id into roomJoin
            from room in roomJoin.DefaultIfEmpty()
            where visit.IdHoSo == encounter.Id
                  && line.IdDichVu.HasValue
                  && distinctServiceIds.Contains(line.IdDichVu.Value)
                  && line.TrangThaiThucHien != "DA_HUY"
                  && visit.TrangThai != "DA_HUY"
            select new
            {
                serviceId = service.Id,
                serviceCode = service.Ma,
                serviceName = service.Ten,
                visitId = visit.Id,
                roomId = visit.IdPhong,
                roomName = room != null ? room.TenPhong : null,
                status = line.TrangThaiThucHien
            }).ToListAsync();

        if (existingServiceLines.Count > 0)
        {
            return BadRequest(new
            {
                state = "DUPLICATE_SERVICE_IN_ENCOUNTER",
                message = "Hồ sơ đã có dịch vụ trùng trong ngày. Không tạo thêm dịch vụ/phòng trùng khi chưa hủy hợp lệ.",
                duplicates = existingServiceLines
            });
        }

        var visitType = ExtractEncounterVisitType(encounter.GhiChu);
        var paymentObject = ExtractEncounterPaymentObject(encounter.GhiChu);
        var configuredMode = DetermineServiceSelectionMode(req.Mode, visitType);
        if (string.Equals(configuredMode, "SINGLE_MAIN_ROOM", StringComparison.OrdinalIgnoreCase))
        {
            var distinctRooms = selectedServices
                .Where(x => x.IdPhong.HasValue)
                .Select(x => x.IdPhong!.Value)
                .Distinct()
                .Count();

            if (distinctRooms > 1)
            {
                return BadRequest(new
                {
                    message = "Loại khám hiện tại chỉ cho phép 1 phòng khám chính. Vui lòng chọn dịch vụ cùng phòng hoặc chuyển mode nhiều dịch vụ."
                });
            }
        }

        var requirePaymentBeforeQueue = req.ForceRequirePayment
            ?? _configuration.GetValue<bool>("Reception:RequirePaymentBeforeQueue", false);
        var allowQueueBeforePayment = req.AllowQueueBeforePayment
            ?? _configuration.GetValue<bool>("Reception:AllowQueueBeforePayment", false);

        await using var tx = await _db.Database.BeginTransactionAsync();

        var baseLanKham = await _db.LanKhams
            .Where(l => l.IdHoSo == encounter.Id && !l.IdPhong.HasValue)
            .OrderByDescending(l => l.CreatedAt ?? l.ThoiGianBatDau)
            .FirstOrDefaultAsync();

        if (baseLanKham == null)
        {
            baseLanKham = new LanKham
            {
                IdHoSo = encounter.Id,
                IdBenhNhan = encounter.IdBenhNhan,
                TrangThai = "TIEP_DON",
                CreatedAt = now,
                UpdatedAt = now,
                IdTiepDon = actorId
            };
            _db.LanKhams.Add(baseLanKham);
            await _db.SaveChangesAsync();
        }

        var order = await _db.HoaDons
            .Include(h => h.ChiTietHoaDons)
            .Where(h => h.IdLanKham == baseLanKham.Id && h.LoaiHoaDon == "DANG_KY_DICH_VU" && h.TrangThai != "HUY")
            .OrderByDescending(h => h.NgayTao)
            .FirstOrDefaultAsync();

        if (order == null)
        {
            order = new HoaDon
            {
                MaHd = _code.GenMa("PDV"),
                IdLanKham = baseLanKham.Id,
                IdBenhNhan = encounter.IdBenhNhan,
                IdThuNgan = actorId,
                LoaiHoaDon = "DANG_KY_DICH_VU",
                HinhThucTt = "CHUA_XAC_DINH",
                TrangThai = "NHAP",
                NgayTao = now
            };
            _db.HoaDons.Add(order);
            await _db.SaveChangesAsync();
        }
        else if (string.Equals(order.TrangThai, "DA_THANH_TOAN", StringComparison.OrdinalIgnoreCase))
        {
            await tx.RollbackAsync();
            return BadRequest(new { message = "Phiếu dịch vụ đã thanh toán, không thể chỉnh sửa trực tiếp." });
        }
        else if (string.Equals(order.TrangThai, "CHO_KHAM", StringComparison.OrdinalIgnoreCase))
        {
            await tx.RollbackAsync();
            return BadRequest(new
            {
                state = "SERVICE_ORDER_ALREADY_QUEUED",
                message = "Phiếu dịch vụ đã xác nhận và đưa vào hàng đợi khám. Không thể ghi đè; hãy hủy/đổi phòng đúng nghiệp vụ."
            });
        }

        if (order.ChiTietHoaDons.Count > 0)
        {
            _db.ChiTietHoaDons.RemoveRange(order.ChiTietHoaDons);
        }

        decimal tamTinh = 0m;
        var lineResult = new List<ServiceOrderLineResultDto>();

        foreach (var service in selectedServices)
        {
            var price = await _pricing.GetCurrentPriceAsync(service.Id, service.IdPhong, paymentObject);
            if (!price.HasValue || price <= 0)
            {
                await tx.RollbackAsync();
                return BadRequest(new { message = $"Không tìm thấy đơn giá hợp lệ cho dịch vụ '{service.Ten}'." });
            }

            var roomName = service.IdPhongNavigation?.TenPhong ?? $"Phòng {service.IdPhong}";
            var roomAreaId = service.IdPhongNavigation?.IdKhuTiepDon;
            var roomAreaCode = service.IdPhongNavigation?.IdKhuTiepDonNavigation?.MaKhu;
            var roomAreaName = service.IdPhongNavigation?.IdKhuTiepDonNavigation?.TenKhu;
            var detailDescription = JsonSerializer.Serialize(new
            {
                serviceCode = service.Ma,
                roomId = service.IdPhong,
                roomName,
                roomAreaId,
                roomAreaCode
            }, CompactJsonOptions);
            if (detailDescription.Length > 255)
            {
                detailDescription = JsonSerializer.Serialize(new
                {
                    serviceCode = service.Ma,
                    roomId = service.IdPhong,
                    roomName = roomName.Length > 120 ? roomName[..120] : roomName
                }, CompactJsonOptions);
            }

            _db.ChiTietHoaDons.Add(new ChiTietHoaDon
            {
                IdHoaDon = order.Id,
                LoaiThamChieu = "SERVICE_ORDER_LINE",
                IdThamChieu = service.Id,
                MoTa = detailDescription,
                SoLuong = 1,
                DonGia = price.Value,
                ThanhTien = price.Value,
                ThueVat = 0
            });

            tamTinh += price.Value;
            lineResult.Add(new ServiceOrderLineResultDto
            {
                ServiceId = service.Id,
                ServiceCode = service.Ma,
                ServiceName = service.Ten ?? string.Empty,
                RoomId = service.IdPhong!.Value,
                RoomName = roomName,
                RoomAreaId = roomAreaId,
                RoomAreaCode = roomAreaCode,
                RoomAreaName = roomAreaName,
                UnitPrice = price.Value,
                Status = isDraft ? "DRAFT" : "CONFIRMED"
            });
        }

        order.TongTienTruoc = tamTinh;
        order.TongTien = tamTinh;
        order.GhiChu = req.Note;
        order.TrangThai = isDraft ? "NHAP" : (requirePaymentBeforeQueue ? "CHO_THANH_TOAN" : "CHO_KHAM");

        var action = isDraft ? "SERVICE_ORDER_DRAFT_SAVED" : "SERVICE_ORDER_CONFIRMED";
        var nextStatus = isDraft
            ? HoSoTrangThaiService.DichVuNhap
            : (requirePaymentBeforeQueue ? HoSoTrangThaiService.ChoThanhToan : HoSoTrangThaiService.ChoKham);

        var transition = _status.ApplyTransition(
            encounter,
            nextStatus,
            actorId,
            action,
            req.Note,
            new
            {
                orderCode = order.MaHd,
                serviceCount = lineResult.Count,
                temporaryTotal = tamTinh,
                requirePaymentBeforeQueue,
                allowQueueBeforePayment,
                mode = configuredMode
            });
        if (!transition.Success)
        {
            await tx.RollbackAsync();
            return BadRequest(new { message = transition.ErrorMessage });
        }

        if (!transition.Changed)
        {
            _db.TiepDonTrangThaiLogs.Add(new TiepDonTrangThaiLog
            {
                IdHoSo = encounter.Id,
                FromTrangThai = _status.NormalizeStatus(encounter.TrangThai),
                ToTrangThai = _status.NormalizeStatus(encounter.TrangThai),
                Action = action,
                Note = req.Note,
                IdNguoiDung = actorId,
                CreatedAt = now,
                Metadata = JsonSerializer.Serialize(new
                {
                    orderCode = order.MaHd,
                    serviceCount = lineResult.Count,
                    temporaryTotal = tamTinh,
                    requirePaymentBeforeQueue,
                    allowQueueBeforePayment,
                    mode = configuredMode
                })
            });
        }

        var shouldCreateQueue = !isDraft && (!requirePaymentBeforeQueue || allowQueueBeforePayment);
        if (shouldCreateQueue)
        {
            foreach (var line in lineResult)
            {
                var queueLanKham = await _db.LanKhams
                    .Where(l =>
                        l.IdHoSo == encounter.Id &&
                        l.IdPhong == line.RoomId &&
                        l.TrangThai != "DA_HUY")
                    .OrderByDescending(l => l.CreatedAt ?? l.ThoiGianBatDau)
                    .FirstOrDefaultAsync();

                if (queueLanKham == null)
                {
                    var assignedDoctor = await _db.BacSiPhongs
                        .Where(x => x.IdPhong == line.RoomId)
                        .Select(x => (long?)x.IdBacSi)
                        .FirstOrDefaultAsync();

                    queueLanKham = new LanKham
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
                    _db.LanKhams.Add(queueLanKham);
                    await _db.SaveChangesAsync();
                }

                var duplicateLine = await _db.LanKhamDichVus.AnyAsync(x =>
                    x.IdLanKham == queueLanKham.Id &&
                    x.IdDichVu == line.ServiceId &&
                    x.TrangThaiThucHien != "DA_HUY");
                if (duplicateLine) continue;

                _db.LanKhamDichVus.Add(new LanKhamDichVu
                {
                    IdLanKham = queueLanKham.Id,
                    IdDichVu = line.ServiceId,
                    SoLuong = 1,
                    DonGia = line.UnitPrice,
                    TrangThaiThucHien = "CHO_THUC_HIEN",
                    GhiChu = $"PDV:{order.MaHd}"
                });
            }

            _db.TiepDonTrangThaiLogs.Add(new TiepDonTrangThaiLog
            {
                IdHoSo = encounter.Id,
                FromTrangThai = _status.NormalizeStatus(encounter.TrangThai),
                ToTrangThai = _status.NormalizeStatus(encounter.TrangThai),
                Action = "QUEUE_TICKETS_CREATED",
                Note = "Đã tạo hàng đợi khám theo phòng từ phiếu dịch vụ.",
                IdNguoiDung = actorId,
                CreatedAt = now,
                Metadata = JsonSerializer.Serialize(new
                {
                    serviceCount = lineResult.Count,
                    mode = configuredMode,
                    allowQueueBeforePayment
                })
            });
        }

        await _db.SaveChangesAsync();
        await tx.CommitAsync();

        var payload = new ServiceOrderActionResultDto
        {
            OrderId = order.Id,
            OrderCode = order.MaHd,
            EncounterStatus = _status.NormalizeStatus(encounter.TrangThai),
            TemporaryTotal = tamTinh,
            ServiceCount = lineResult.Count,
            RequirePaymentBeforeQueue = requirePaymentBeforeQueue,
            QueueCreated = shouldCreateQueue,
            Mode = configuredMode,
            Lines = lineResult
        };

        if (!isDraft)
        {
            SetIdempotentResult(idempotencyKey, payload);
        }

        return Ok(payload);
    }

    [HttpPatch("encounters/{encounterId:long}/visits/{visitId:long}/room")]
    public async Task<IActionResult> ChangeQueueRoom(long encounterId, long visitId, [FromBody] ChangeQueueRoomRequestDto req)
    {
        var denied = await EnsurePermissionAsync("sua");
        if (denied != null) return denied;

        if (req == null || req.NewRoomId <= 0)
            return BadRequest(new { message = "Cần chọn phòng mới." });

        var reason = (req.Reason ?? string.Empty).Trim();
        if (string.IsNullOrWhiteSpace(reason))
            return BadRequest(new { message = "Đổi phòng phải nhập lý do." });

        var actorId = GetCurrentUserId();
        var now = DateTime.Now;

        var encounter = await _db.HoSoBenhAns
            .Include(h => h.IdKhuTiepDonNavigation)
            .FirstOrDefaultAsync(h => h.Id == encounterId);
        if (encounter == null)
            return NotFound(new { message = "Không tìm thấy hồ sơ tiếp đón." });

        var encounterStatus = _status.NormalizeStatus(encounter.TrangThai);
        if (_status.IsCancelled(encounterStatus) || _status.IsClosedOrCompleted(encounterStatus))
            return BadRequest(new { message = "Hồ sơ đã hủy/hoàn tất, không thể đổi phòng." });

        var visit = await _db.LanKhams
            .Include(v => v.IdPhongNavigation)
                .ThenInclude(p => p.IdKhuTiepDonNavigation)
            .Include(v => v.LanKhamDichVus)
            .FirstOrDefaultAsync(v => v.Id == visitId && v.IdHoSo == encounterId);
        if (visit == null)
            return NotFound(new { message = "Không tìm thấy lượt/phòng cần đổi." });
        if (!visit.IdPhong.HasValue)
            return BadRequest(new { message = "Lượt tiếp đón gốc chưa có phòng, không xử lý đổi phòng tại đây." });
        if (visit.IdPhong.Value == req.NewRoomId)
            return BadRequest(new { message = "Phòng mới trùng với phòng hiện tại." });

        var visitStatus = (visit.TrangThai ?? string.Empty).Trim().ToUpperInvariant();
        if (visitStatus is "DANG_KHAM" or "DA_KHAM" or "DA_HUY" or "HOAN_THANH")
            return BadRequest(new { message = "Lượt khám đã bắt đầu/hoàn tất/hủy, không thể đổi phòng." });

        var visitIds = await _db.LanKhams
            .AsNoTracking()
            .Where(v => v.IdHoSo == encounterId)
            .Select(v => v.Id)
            .ToListAsync();

        var hasPaidInvoice = await _db.HoaDons
            .AsNoTracking()
            .AnyAsync(h => h.IdLanKham.HasValue
                && visitIds.Contains(h.IdLanKham.Value)
                && h.TrangThai == "DA_THANH_TOAN");
        if (hasPaidInvoice)
            return BadRequest(new { state = "VISIT_HAS_PAID_INVOICE", message = "Hồ sơ/lượt khám đã thanh toán, không được đổi phòng." });

        var hasPerformedService = visit.LanKhamDichVus.Any(x =>
            x.TrangThaiThucHien != null &&
            x.TrangThaiThucHien != "CHO_THUC_HIEN" &&
            x.TrangThaiThucHien != "DA_HUY");
        var hasPerformedCls = await _db.ChiDinhDvkts
            .AsNoTracking()
            .AnyAsync(x => x.IdLanKham == visit.Id
                && x.TrangThai != null
                && x.TrangThai.ToLower() != "pending"
                && x.TrangThai.ToLower() != "ordered"
                && x.TrangThai.ToLower() != "canceled");
        if (hasPerformedService || hasPerformedCls)
            return BadRequest(new { state = "VISIT_HAS_RESULT_OR_PERFORMED_SERVICE", message = "Dịch vụ đã thực hiện/có kết quả, không được đổi phòng." });

        var targetRoom = await _db.PhongKhams
            .Include(p => p.IdKhuTiepDonNavigation)
            .FirstOrDefaultAsync(p => p.Id == req.NewRoomId && p.HoatDong == true);
        if (targetRoom == null)
            return BadRequest(new { message = "Phòng mới không hợp lệ hoặc đã tạm ngưng." });
        if (!targetRoom.IdKhuTiepDon.HasValue)
            return BadRequest(new { state = "ROOM_AREA_MISSING", message = "Phòng mới chưa được map khu tiếp đón." });
        if (encounter.IdKhuTiepDon.HasValue && targetRoom.IdKhuTiepDon.Value != encounter.IdKhuTiepDon.Value)
        {
            return BadRequest(new
            {
                state = "ROOM_AREA_MISMATCH",
                message = "Phòng mới thuộc khu khác với khu tiếp đón của hồ sơ.",
                encounterArea = new
                {
                    id = encounter.IdKhuTiepDon,
                    maKhu = encounter.IdKhuTiepDonNavigation?.MaKhu,
                    tenKhu = encounter.IdKhuTiepDonNavigation?.TenKhu
                },
                roomArea = new
                {
                    id = targetRoom.IdKhuTiepDon,
                    maKhu = targetRoom.IdKhuTiepDonNavigation?.MaKhu,
                    tenKhu = targetRoom.IdKhuTiepDonNavigation?.TenKhu
                }
            });
        }

        var activeServiceIds = visit.LanKhamDichVus
            .Where(x => x.IdDichVu.HasValue && x.TrangThaiThucHien != "DA_HUY")
            .Select(x => x.IdDichVu!.Value)
            .Distinct()
            .ToList();
        if (activeServiceIds.Count > 0)
        {
            var duplicateAtTarget = await (
                from otherVisit in _db.LanKhams.AsNoTracking()
                join line in _db.LanKhamDichVus.AsNoTracking() on otherVisit.Id equals line.IdLanKham
                where otherVisit.IdHoSo == encounterId
                      && otherVisit.Id != visit.Id
                      && otherVisit.IdPhong == req.NewRoomId
                      && otherVisit.TrangThai != "DA_HUY"
                      && line.IdDichVu.HasValue
                      && activeServiceIds.Contains(line.IdDichVu.Value)
                      && line.TrangThaiThucHien != "DA_HUY"
                select new { line.IdDichVu, otherVisit.IdPhong }).AnyAsync();
            if (duplicateAtTarget)
                return BadRequest(new { state = "DUPLICATE_SERVICE_IN_TARGET_ROOM", message = "Phòng mới đã có dịch vụ trùng trong hồ sơ này." });
        }

        var oldRoomId = visit.IdPhong;
        var oldRoomName = visit.IdPhongNavigation?.TenPhong;
        var assignedDoctor = await _db.BacSiPhongs
            .Where(x => x.IdPhong == targetRoom.Id)
            .Select(x => (long?)x.IdBacSi)
            .FirstOrDefaultAsync();

        visit.IdPhong = targetRoom.Id;
        visit.IdBacSi = assignedDoctor;
        visit.UpdatedAt = now;
        visit.GhiChu = AppendNote(visit.GhiChu, $"Doi phong: {oldRoomName ?? oldRoomId?.ToString()} -> {targetRoom.TenPhong}. Ly do: {reason}");

        _db.TiepDonTrangThaiLogs.Add(new TiepDonTrangThaiLog
        {
            IdHoSo = encounter.Id,
            FromTrangThai = encounterStatus,
            ToTrangThai = encounterStatus,
            Action = "QUEUE_ROOM_CHANGED",
            Note = reason,
            IdNguoiDung = actorId,
            CreatedAt = now,
            Metadata = JsonSerializer.Serialize(new
            {
                visitId = visit.Id,
                oldRoomId,
                oldRoomName,
                newRoomId = targetRoom.Id,
                newRoomName = targetRoom.TenPhong,
                areaId = targetRoom.IdKhuTiepDon,
                areaCode = targetRoom.IdKhuTiepDonNavigation?.MaKhu,
                areaName = targetRoom.IdKhuTiepDonNavigation?.TenKhu,
                reason
            })
        });

        await _db.SaveChangesAsync();

        return Ok(new
        {
            message = "Đã đổi phòng khám.",
            visit = new
            {
                visit.Id,
                visit.IdHoSo,
                room = new
                {
                    id = targetRoom.Id,
                    maPhong = targetRoom.MaPhong,
                    tenPhong = targetRoom.TenPhong,
                    khuTiepDon = targetRoom.IdKhuTiepDon.HasValue
                        ? new
                        {
                            id = targetRoom.IdKhuTiepDon,
                            maKhu = targetRoom.IdKhuTiepDonNavigation?.MaKhu,
                            tenKhu = targetRoom.IdKhuTiepDonNavigation?.TenKhu
                        }
                        : null
                }
            }
        });
    }

    private string DetermineServiceSelectionMode(string? requestedMode, string? visitType)
    {
        var normalizedReq = (requestedMode ?? string.Empty).Trim().ToUpperInvariant();
        if (normalizedReq is "SINGLE_MAIN_ROOM" or "MULTI_SERVICE")
        {
            return normalizedReq;
        }

        var multiVisitTypes = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "Khám tổng quát",
            "Khám theo gói",
            "Khám doanh nghiệp"
        };

        if (!string.IsNullOrWhiteSpace(visitType) && multiVisitTypes.Contains(visitType.Trim()))
        {
            return "MULTI_SERVICE";
        }

        var defaultMode = _configuration["Reception:DefaultServiceSelectionMode"];
        if (!string.IsNullOrWhiteSpace(defaultMode)
            && defaultMode.Trim().ToUpperInvariant() is "SINGLE_MAIN_ROOM" or "MULTI_SERVICE")
        {
            return defaultMode.Trim().ToUpperInvariant();
        }

        return "SINGLE_MAIN_ROOM";
    }

    private static string? ExtractEncounterVisitType(string? rawMeta)
    {
        if (string.IsNullOrWhiteSpace(rawMeta)) return null;

        const string prefix = "[RECEPTION_META]";
        if (!rawMeta.StartsWith(prefix, StringComparison.Ordinal))
        {
            return null;
        }

        try
        {
            using var doc = JsonDocument.Parse(rawMeta[prefix.Length..]);
            return doc.RootElement.TryGetProperty("visitType", out var visit) ? visit.GetString() : null;
        }
        catch
        {
            return null;
        }
    }

    private static string? ExtractEncounterPaymentObject(string? rawMeta)
    {
        if (string.IsNullOrWhiteSpace(rawMeta)) return null;

        const string prefix = "[RECEPTION_META]";
        if (!rawMeta.StartsWith(prefix, StringComparison.Ordinal))
        {
            return null;
        }

        try
        {
            using var doc = JsonDocument.Parse(rawMeta[prefix.Length..]);
            return doc.RootElement.TryGetProperty("paymentObject", out var payment) ? payment.GetString() : null;
        }
        catch
        {
            return null;
        }
    }

    private static string BuildIdempotencyKey(string prefix, long actorId, long encounterId, string? rawKey)
    {
        var key = (rawKey ?? string.Empty).Trim();
        if (string.IsNullOrWhiteSpace(key)) return string.Empty;
        return $"{prefix}:{actorId}:{encounterId}:{key}";
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

    private static string AppendNote(string? current, string note)
    {
        var cleanNote = (note ?? string.Empty).Trim();
        if (string.IsNullOrWhiteSpace(cleanNote)) return current ?? string.Empty;
        if (string.IsNullOrWhiteSpace(current)) return cleanNote;
        return $"{current.Trim()} | {cleanNote}";
    }

    private async Task<IActionResult?> EnsurePermissionAsync(string action)
    {
        var userId = GetCurrentUserId();
        if (!userId.HasValue)
            return Unauthorized(new { message = "Không xác định được người dùng từ token." });

        var allowed = await HasPermissionAsync(userId.Value, action);
        if (allowed) return null;

        return StatusCode(403, new { message = $"Bạn không có quyền '{action}' cho chức năng tiếp đón." });
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
}
