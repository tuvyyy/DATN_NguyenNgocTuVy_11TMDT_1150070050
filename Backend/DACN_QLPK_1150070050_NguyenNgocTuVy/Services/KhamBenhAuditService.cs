using System.Security.Claims;
using System.Text.Json;
using System.Text.Json.Serialization;
using DACN_QLPK_1150070050_NguyenNgocTuVy.Data;
using DACN_QLPK_1150070050_NguyenNgocTuVy.Models;
using Microsoft.EntityFrameworkCore;

namespace DACN_QLPK_1150070050_NguyenNgocTuVy.Services;

public interface IKhamBenhAuditService
{
    Task WriteAsync(
        long? idLanKham,
        string hanhDong,
        string? doiTuong = null,
        long? idDoiTuong = null,
        string? lyDo = null,
        object? duLieuTruoc = null,
        object? duLieuSau = null);
}

public class KhamBenhAuditService : IKhamBenhAuditService
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        ReferenceHandler = ReferenceHandler.IgnoreCycles,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
    };

    private readonly DACNDbContext _db;
    private readonly IHttpContextAccessor _http;

    public KhamBenhAuditService(DACNDbContext db, IHttpContextAccessor http)
    {
        _db = db;
        _http = http;
    }

    public async Task WriteAsync(
        long? idLanKham,
        string hanhDong,
        string? doiTuong = null,
        long? idDoiTuong = null,
        string? lyDo = null,
        object? duLieuTruoc = null,
        object? duLieuSau = null)
    {
        var httpContext = _http.HttpContext;
        var actorId = GetActorId(httpContext?.User);
        var actorName = await GetActorName(actorId, httpContext?.User);

        LanKham? lanKham = null;
        if (idLanKham.HasValue)
        {
            lanKham = await _db.LanKhams
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.Id == idLanKham.Value);
        }

        _db.KhamBenhAuditLogs.Add(new KhamBenhAuditLog
        {
            IdLanKham = idLanKham,
            IdHoSo = lanKham?.IdHoSo,
            IdBenhNhan = lanKham?.IdBenhNhan,
            IdPhong = lanKham?.IdPhong,
            IdBacSiChuSoHuu = lanKham?.IdBacSi,
            IdNguoiThucHien = actorId,
            TenNguoiThucHien = actorName,
            HanhDong = NormalizeAction(hanhDong),
            DoiTuong = string.IsNullOrWhiteSpace(doiTuong) ? null : doiTuong.Trim(),
            IdDoiTuong = idDoiTuong,
            LyDo = string.IsNullOrWhiteSpace(lyDo) ? null : lyDo.Trim(),
            DuLieuTruoc = Serialize(duLieuTruoc),
            DuLieuSau = Serialize(duLieuSau),
            IpAddress = httpContext?.Connection.RemoteIpAddress?.ToString(),
            UserAgent = httpContext?.Request.Headers["User-Agent"].ToString(),
            CreatedAt = DateTime.Now
        });

        await _db.SaveChangesAsync();
    }

    private static long? GetActorId(ClaimsPrincipal? user)
    {
        var raw = user?.FindFirstValue("sub")
                  ?? user?.FindFirstValue(ClaimTypes.NameIdentifier)
                  ?? user?.FindFirstValue("nameid");

        return long.TryParse(raw, out var id) ? id : null;
    }

    private async Task<string?> GetActorName(long? actorId, ClaimsPrincipal? user)
    {
        var claimName = user?.FindFirstValue("username")
                        ?? user?.Identity?.Name;
        if (!string.IsNullOrWhiteSpace(claimName))
            return claimName.Trim();

        if (!actorId.HasValue)
            return null;

        return await _db.NguoiDungs
            .AsNoTracking()
            .Where(x => x.Id == actorId.Value)
            .Select(x => x.HoTen ?? x.TenDangNhap)
            .FirstOrDefaultAsync();
    }

    private static string NormalizeAction(string action)
    {
        var value = (action ?? string.Empty).Trim().ToUpperInvariant();
        return string.IsNullOrWhiteSpace(value) ? "UNKNOWN" : value[..Math.Min(value.Length, 80)];
    }

    private static string? Serialize(object? value)
    {
        if (value == null)
            return null;

        try
        {
            return JsonSerializer.Serialize(value, JsonOptions);
        }
        catch
        {
            return JsonSerializer.Serialize(new { value = value.ToString() }, JsonOptions);
        }
    }
}
