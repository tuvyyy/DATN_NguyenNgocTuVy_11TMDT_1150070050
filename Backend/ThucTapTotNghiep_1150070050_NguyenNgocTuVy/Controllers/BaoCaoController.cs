using System.Security.Claims;
using System.Text;
using ThucTapTotNghiep_1150070050_NguyenNgocTuVy.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ThucTapTotNghiep_1150070050_NguyenNgocTuVy.Controllers;

[ApiController]
[Authorize]
[Route("api/bao-cao")]
public partial class BaoCaoController : ControllerBase
{
    private readonly DACNDbContext _db;

    private static readonly ReportDefinition[] Definitions =
    {
        new("reception", "Báo cáo tiếp đón", "TIEP_DON"),
        new("cashier", "Báo cáo thu ngân", "THU_NGAN"),
        new("doctor", "Báo cáo bác sĩ", "BAC_SI"),
        new("lab", "Báo cáo cận lâm sàng", "KY_THUAT_VIEN"),
        new("admin-summary", "Báo cáo tổng hợp quản trị", "ADMIN"),
        new("visit-analytics", "Phân tích và dự báo lượt khám", "ADMIN")
    };

    public BaoCaoController(DACNDbContext db)
    {
        _db = db;
    }

    [HttpGet("options")]
    public async Task<IActionResult> Options()
    {
        var roles = await GetCurrentRolesAsync();
        var reports = GetAllowedDefinitions(roles)
            .Select(x => new { type = x.Type, label = x.Label, ownerRole = x.OwnerRole })
            .ToList();

        return Ok(new
        {
            reports,
            defaultFrom = DateTime.Today.AddDays(-30).ToString("yyyy-MM-dd"),
            defaultTo = DateTime.Today.ToString("yyyy-MM-dd")
        });
    }

    [HttpGet("summary")]
    public async Task<IActionResult> Summary([FromQuery] string type, [FromQuery] DateTime? fromDate, [FromQuery] DateTime? toDate)
    {
        var roles = await GetCurrentRolesAsync();
        var access = EnsureReportAccess(type, roles);
        if (access.Result != null) return access.Result;

        var range = NormalizeRange(fromDate, toDate);
        var userId = GetCurrentUserId();
        var isAdmin = access.IsAdmin;

        var summary = type switch
        {
            "reception" => await ReceptionSummary(range, userId, isAdmin),
            "cashier" => await CashierSummary(range, userId, isAdmin),
            "doctor" => await DoctorSummary(range, userId, isAdmin),
            "lab" => await LabSummary(range, userId, isAdmin),
            "admin-summary" => await AdminSummary(range),
            _ => null
        };

        if (summary == null) return BadRequest(new { message = "Loại báo cáo không hợp lệ." });
        return Ok(summary);
    }

    [HttpGet("export")]
    public async Task<IActionResult> Export([FromQuery] string type, [FromQuery] DateTime? fromDate, [FromQuery] DateTime? toDate)
    {
        var roles = await GetCurrentRolesAsync();
        var access = EnsureReportAccess(type, roles);
        if (access.Result != null) return access.Result;

        var range = NormalizeRange(fromDate, toDate);
        var userId = GetCurrentUserId();
        var isAdmin = access.IsAdmin;

        var csv = type switch
        {
            "reception" => await ReceptionCsv(range, userId, isAdmin),
            "cashier" => await CashierCsv(range, userId, isAdmin),
            "doctor" => await DoctorCsv(range, userId, isAdmin),
            "lab" => await LabCsv(range, userId, isAdmin),
            "admin-summary" => await AdminCsv(range),
            _ => null
        };

        if (csv == null) return BadRequest(new { message = "Loại báo cáo không hợp lệ." });

        var bytes = Encoding.UTF8.GetPreamble()
            .Concat(Encoding.UTF8.GetBytes(csv))
            .ToArray();
        var fileName = $"bao-cao-{type}-{range.From:yyyyMMdd}-{range.To:yyyyMMdd}.csv";
        return File(bytes, "text/csv; charset=utf-8", fileName);
    }

    private async Task<object> ReceptionSummary(DateRange range, long? userId, bool isAdmin)
    {
        var query = _db.HoSoBenhAns.AsNoTracking()
            .Where(x => x.NgayTao >= range.Start && x.NgayTao < range.EndExclusive);

        var statuses = await query.GroupBy(x => x.TrangThai ?? "")
            .Select(g => new { status = g.Key, count = g.Count() })
            .OrderBy(x => x.status)
            .ToListAsync();

        return new
        {
            total = statuses.Sum(x => x.count),
            amount = 0,
            breakdown = statuses
        };
    }

    private async Task<object> CashierSummary(DateRange range, long? userId, bool isAdmin)
    {
        var query = _db.HoaDons.AsNoTracking()
            .Where(x => x.NgayTao >= range.Start && x.NgayTao < range.EndExclusive);

        var rows = await query.Select(x => new { x.TrangThai, x.TongTien }).ToListAsync();
        return new
        {
            total = rows.Count,
            amount = rows.Sum(x => x.TongTien ?? 0m),
            paid = rows.Count(x => string.Equals(x.TrangThai, "DA_THANH_TOAN", StringComparison.OrdinalIgnoreCase)),
            unpaid = rows.Count(x => !string.Equals(x.TrangThai, "DA_THANH_TOAN", StringComparison.OrdinalIgnoreCase))
        };
    }

    private async Task<object> DoctorSummary(DateRange range, long? userId, bool isAdmin)
    {
        var query = _db.LanKhams.AsNoTracking()
            .Where(x => (x.ThoiGianBatDau ?? x.CreatedAt) >= range.Start && (x.ThoiGianBatDau ?? x.CreatedAt) < range.EndExclusive);
        if (!isAdmin) query = userId.HasValue ? query.Where(x => x.IdBacSi == userId.Value) : query.Where(x => false);

        var statuses = await query.GroupBy(x => x.TrangThai ?? "")
            .Select(g => new { status = g.Key, count = g.Count() })
            .OrderBy(x => x.status)
            .ToListAsync();

        return new
        {
            total = statuses.Sum(x => x.count),
            amount = 0,
            breakdown = statuses
        };
    }

    private async Task<object> LabSummary(DateRange range, long? userId, bool isAdmin)
    {
        var query = _db.ChiDinhDvkts.AsNoTracking()
            .Where(x => x.CreatedAt >= range.Start && x.CreatedAt < range.EndExclusive);

        var statuses = await query.GroupBy(x => x.TrangThai)
            .Select(g => new { status = g.Key, count = g.Count() })
            .OrderBy(x => x.status)
            .ToListAsync();

        return new
        {
            total = statuses.Sum(x => x.count),
            amount = 0,
            breakdown = statuses
        };
    }

    private async Task<object> AdminSummary(DateRange range)
    {
        var encounters = await _db.HoSoBenhAns.AsNoTracking()
            .Where(x => x.NgayTao >= range.Start && x.NgayTao < range.EndExclusive)
            .Select(x => x.TrangThai)
            .ToListAsync();
        var invoices = await _db.HoaDons.AsNoTracking()
            .Where(x => x.NgayTao >= range.Start && x.NgayTao < range.EndExclusive)
            .Select(x => new { x.TrangThai, x.TongTien })
            .ToListAsync();
        var labCount = await _db.ChiDinhDvkts.AsNoTracking()
            .CountAsync(x => x.CreatedAt >= range.Start && x.CreatedAt < range.EndExclusive);

        return new
        {
            total = encounters.Count,
            amount = invoices.Sum(x => x.TongTien ?? 0m),
            cancelled = encounters.Count(x => string.Equals(x, "DA_HUY", StringComparison.OrdinalIgnoreCase) || string.Equals(x, "HUY", StringComparison.OrdinalIgnoreCase)),
            completed = encounters.Count(x => string.Equals(x, "DA_KHAM", StringComparison.OrdinalIgnoreCase) || string.Equals(x, "DA_DONG", StringComparison.OrdinalIgnoreCase)),
            invoices = invoices.Count,
            paidInvoices = invoices.Count(x => string.Equals(x.TrangThai, "DA_THANH_TOAN", StringComparison.OrdinalIgnoreCase)),
            labOrders = labCount
        };
    }

    private async Task<string> ReceptionCsv(DateRange range, long? userId, bool isAdmin)
    {
        var query = _db.HoSoBenhAns.AsNoTracking()
            .Include(x => x.IdBenhNhanNavigation)
            .Include(x => x.IdNguoiTaoNavigation)
            .Where(x => x.NgayTao >= range.Start && x.NgayTao < range.EndExclusive);

        var rows = await query.OrderByDescending(x => x.NgayTao)
            .Select(x => new
            {
                x.MaHs,
                MaBn = x.IdBenhNhanNavigation != null ? x.IdBenhNhanNavigation.MaBn : "",
                HoTen = x.IdBenhNhanNavigation != null ? x.IdBenhNhanNavigation.HoTen : "",
                x.NgayTao,
                x.TrangThai,
                NguoiTiepDon = x.IdNguoiTaoNavigation != null ? x.IdNguoiTaoNavigation.HoTen : ""
            })
            .ToListAsync();

        var csv = NewCsv("ma_hs,ma_bn,ho_ten,ngay_tao,trang_thai,nguoi_tiep_don");
        foreach (var row in rows)
            csv.AppendLine(JoinCsv(row.MaHs, row.MaBn, row.HoTen, FormatDate(row.NgayTao), row.TrangThai, row.NguoiTiepDon));
        return csv.ToString();
    }

    private async Task<string> CashierCsv(DateRange range, long? userId, bool isAdmin)
    {
        var query = _db.HoaDons.AsNoTracking()
            .Include(x => x.IdBenhNhanNavigation)
            .Include(x => x.IdThuNganNavigation)
            .Where(x => x.NgayTao >= range.Start && x.NgayTao < range.EndExclusive);

        var rows = await query.OrderByDescending(x => x.NgayTao)
            .Select(x => new
            {
                x.MaHd,
                MaBn = x.IdBenhNhanNavigation != null ? x.IdBenhNhanNavigation.MaBn : "",
                HoTen = x.IdBenhNhanNavigation != null ? x.IdBenhNhanNavigation.HoTen : "",
                x.NgayTao,
                x.NgayThanhToan,
                x.TrangThai,
                x.HinhThucTt,
                x.TongTien,
                ThuNgan = x.IdThuNganNavigation != null ? x.IdThuNganNavigation.HoTen : ""
            })
            .ToListAsync();

        var csv = NewCsv("ma_hd,ma_bn,ho_ten,ngay_tao,ngay_thanh_toan,trang_thai,hinh_thuc,tong_tien,thu_ngan");
        foreach (var row in rows)
            csv.AppendLine(JoinCsv(row.MaHd, row.MaBn, row.HoTen, FormatDate(row.NgayTao), FormatDate(row.NgayThanhToan), row.TrangThai, row.HinhThucTt, FormatMoney(row.TongTien), row.ThuNgan));
        return csv.ToString();
    }

    private async Task<string> DoctorCsv(DateRange range, long? userId, bool isAdmin)
    {
        var query = _db.LanKhams.AsNoTracking()
            .Include(x => x.IdHoSoNavigation)
            .Include(x => x.IdBenhNhanNavigation)
            .Include(x => x.IdBacSiNavigation)
            .Include(x => x.IdPhongNavigation)
            .Where(x => (x.ThoiGianBatDau ?? x.CreatedAt) >= range.Start && (x.ThoiGianBatDau ?? x.CreatedAt) < range.EndExclusive);
        if (!isAdmin) query = userId.HasValue ? query.Where(x => x.IdBacSi == userId.Value) : query.Where(x => false);

        var rows = await query.OrderByDescending(x => x.ThoiGianBatDau ?? x.CreatedAt)
            .Select(x => new
            {
                MaHs = x.IdHoSoNavigation != null ? x.IdHoSoNavigation.MaHs : "",
                MaBn = x.IdBenhNhanNavigation != null ? x.IdBenhNhanNavigation.MaBn : "",
                HoTen = x.IdBenhNhanNavigation != null ? x.IdBenhNhanNavigation.HoTen : "",
                BacSi = x.IdBacSiNavigation != null ? x.IdBacSiNavigation.HoTen : "",
                Phong = x.IdPhongNavigation != null ? x.IdPhongNavigation.TenPhong : "",
                x.ThoiGianBatDau,
                x.ThoiGianKetThuc,
                x.TrangThai,
                x.ChanDoanCuoi,
                x.HuongXuTri
            })
            .ToListAsync();

        var csv = NewCsv("ma_hs,ma_bn,ho_ten,bac_si,phong,bat_dau,ket_thuc,trang_thai,chan_doan,huong_xu_tri");
        foreach (var row in rows)
            csv.AppendLine(JoinCsv(row.MaHs, row.MaBn, row.HoTen, row.BacSi, row.Phong, FormatDate(row.ThoiGianBatDau), FormatDate(row.ThoiGianKetThuc), row.TrangThai, row.ChanDoanCuoi, row.HuongXuTri));
        return csv.ToString();
    }

    private async Task<string> LabCsv(DateRange range, long? userId, bool isAdmin)
    {
        var query = _db.ChiDinhDvkts.AsNoTracking()
            .Include(x => x.IdDvktNavigation)
            .Include(x => x.IdLanKhamNavigation).ThenInclude(x => x.IdHoSoNavigation)
            .Include(x => x.IdLanKhamNavigation).ThenInclude(x => x.IdBenhNhanNavigation)
            .Include(x => x.DvktKetQuas)
            .Where(x => x.CreatedAt >= range.Start && x.CreatedAt < range.EndExclusive);

        var rows = await query.OrderByDescending(x => x.CreatedAt)
            .Select(x => new
            {
                MaHs = x.IdLanKhamNavigation.IdHoSoNavigation != null ? x.IdLanKhamNavigation.IdHoSoNavigation.MaHs : "",
                MaBn = x.IdLanKhamNavigation.IdBenhNhanNavigation != null ? x.IdLanKhamNavigation.IdBenhNhanNavigation.MaBn : "",
                HoTen = x.IdLanKhamNavigation.IdBenhNhanNavigation != null ? x.IdLanKhamNavigation.IdBenhNhanNavigation.HoTen : "",
                Dvkt = x.IdDvktNavigation.TenDvkt,
                x.SoLuong,
                x.TrangThai,
                x.CreatedAt,
                x.NhanLuc,
                x.HoanThanhLuc,
                x.IdNguoiThucHien,
                TrangThaiKetQua = x.DvktKetQuas.OrderByDescending(k => k.Id).Select(k => k.TrangThai).FirstOrDefault()
            })
            .ToListAsync();

        var userIds = rows.Where(x => x.IdNguoiThucHien.HasValue).Select(x => x.IdNguoiThucHien!.Value).Distinct().ToList();
        var users = await _db.NguoiDungs.AsNoTracking()
            .Where(x => userIds.Contains(x.Id))
            .ToDictionaryAsync(x => x.Id, x => x.HoTen);

        var csv = NewCsv("ma_hs,ma_bn,ho_ten,dvkt,so_luong,trang_thai_chi_dinh,trang_thai_ket_qua,created_at,nhan_luc,hoan_thanh_luc,ktv");
        foreach (var row in rows)
        {
            users.TryGetValue(row.IdNguoiThucHien ?? 0, out var ktv);
            csv.AppendLine(JoinCsv(row.MaHs, row.MaBn, row.HoTen, row.Dvkt, row.SoLuong, row.TrangThai, row.TrangThaiKetQua, FormatDate(row.CreatedAt), FormatDate(row.NhanLuc), FormatDate(row.HoanThanhLuc), ktv));
        }
        return csv.ToString();
    }

    private async Task<string> AdminCsv(DateRange range)
    {
        var encounters = await _db.HoSoBenhAns.AsNoTracking()
            .Where(x => x.NgayTao >= range.Start && x.NgayTao < range.EndExclusive)
            .Select(x => new { Date = x.NgayTao!.Value.Date, x.TrangThai })
            .ToListAsync();
        var invoices = await _db.HoaDons.AsNoTracking()
            .Where(x => x.NgayTao >= range.Start && x.NgayTao < range.EndExclusive)
            .Select(x => new { Date = x.NgayTao!.Value.Date, x.TrangThai, x.TongTien })
            .ToListAsync();
        var labOrders = await _db.ChiDinhDvkts.AsNoTracking()
            .Where(x => x.CreatedAt >= range.Start && x.CreatedAt < range.EndExclusive)
            .Select(x => new { Date = x.CreatedAt!.Value.Date, x.TrangThai })
            .ToListAsync();

        var dates = Enumerable.Range(0, (range.To - range.From).Days + 1)
            .Select(offset => range.From.AddDays(offset))
            .ToList();

        var csv = NewCsv("ngay,ho_so,ho_so_huy,ho_so_hoan_tat,hoa_don,hoa_don_da_thanh_toan,doanh_thu,dvkt");
        foreach (var date in dates)
        {
            var e = encounters.Where(x => x.Date == date).ToList();
            var i = invoices.Where(x => x.Date == date).ToList();
            var l = labOrders.Count(x => x.Date == date);
            csv.AppendLine(JoinCsv(
                date.ToString("yyyy-MM-dd"),
                e.Count,
                e.Count(x => string.Equals(x.TrangThai, "DA_HUY", StringComparison.OrdinalIgnoreCase) || string.Equals(x.TrangThai, "HUY", StringComparison.OrdinalIgnoreCase)),
                e.Count(x => string.Equals(x.TrangThai, "DA_KHAM", StringComparison.OrdinalIgnoreCase) || string.Equals(x.TrangThai, "DA_DONG", StringComparison.OrdinalIgnoreCase)),
                i.Count,
                i.Count(x => string.Equals(x.TrangThai, "DA_THANH_TOAN", StringComparison.OrdinalIgnoreCase)),
                FormatMoney(i.Sum(x => x.TongTien ?? 0m)),
                l));
        }
        return csv.ToString();
    }

    private ReportAccess EnsureReportAccess(string? type, HashSet<string> roles)
    {
        var normalized = (type ?? "").Trim().ToLowerInvariant();
        var allowed = GetAllowedDefinitions(roles).Any(x => x.Type == normalized);
        var isAdmin = IsAdmin(roles);

        if (string.IsNullOrWhiteSpace(normalized))
            return new ReportAccess(null, isAdmin, BadRequest(new { message = "Thiếu loại báo cáo." }));
        if (!allowed)
            return new ReportAccess(null, isAdmin, Forbid());
        return new ReportAccess(normalized, isAdmin, null);
    }

    private List<ReportDefinition> GetAllowedDefinitions(HashSet<string> roles)
    {
        if (IsAdmin(roles)) return Definitions.ToList();
        var allowed = new List<ReportDefinition>();
        if (roles.Contains("TIEP_DON") || roles.Any(x => x.StartsWith("TIEP_DON_PRESET", StringComparison.OrdinalIgnoreCase)))
            allowed.Add(Definitions.First(x => x.Type == "reception"));
        if (roles.Contains("THU_NGAN"))
            allowed.Add(Definitions.First(x => x.Type == "cashier"));
        if (roles.Contains("BAC_SI"))
            allowed.Add(Definitions.First(x => x.Type == "doctor"));
        if (roles.Contains("KY_THUAT_VIEN") || roles.Contains("KTV") || roles.Contains("CAN_LAM_SANG"))
            allowed.Add(Definitions.First(x => x.Type == "lab"));
        return allowed;
    }

    private async Task<HashSet<string>> GetCurrentRolesAsync()
    {
        var userId = GetCurrentUserId();
        if (userId.HasValue)
        {
            var dbRoles = await _db.NguoiDungVaiTros
                .AsNoTracking()
                .Where(x => x.IdNguoiDung == userId.Value && x.IdVaiTroNavigation != null)
                .Select(x => x.IdVaiTroNavigation!.Ten)
                .ToListAsync();

            if (dbRoles.Count > 0)
            {
                return dbRoles
                    .Select(x => x.Trim().ToUpperInvariant())
                    .Where(x => !string.IsNullOrWhiteSpace(x))
                    .ToHashSet(StringComparer.OrdinalIgnoreCase);
            }
        }

        return User.Claims
            .Where(c => c.Type == ClaimTypes.Role || c.Type == "role" || c.Type.EndsWith("/role"))
            .Select(c => c.Value.Trim().ToUpperInvariant())
            .Where(x => !string.IsNullOrWhiteSpace(x))
            .ToHashSet(StringComparer.OrdinalIgnoreCase);
    }

    private static bool IsAdmin(HashSet<string> roles) => roles.Contains("ADMIN") || roles.Contains("QUAN_TRI");

    private long? GetCurrentUserId()
    {
        var raw = User.FindFirstValue("sub")
                  ?? User.FindFirstValue(ClaimTypes.NameIdentifier)
                  ?? User.FindFirstValue("nameid");
        return long.TryParse(raw, out var id) ? id : null;
    }

    private static DateRange NormalizeRange(DateTime? fromDate, DateTime? toDate)
    {
        var from = (fromDate ?? DateTime.Today.AddDays(-30)).Date;
        var to = (toDate ?? DateTime.Today).Date;
        if (to < from) (from, to) = (to, from);
        return new DateRange(from, to, to.AddDays(1));
    }

    private static StringBuilder NewCsv(string header)
    {
        var csv = new StringBuilder();
        csv.AppendLine(header);
        return csv;
    }

    private static string JoinCsv(params object?[] values) => string.Join(",", values.Select(EscapeCsv));

    private static string EscapeCsv(object? value)
    {
        var text = Convert.ToString(value) ?? "";
        text = text.Replace("\"", "\"\"");
        return $"\"{text}\"";
    }

    private static string FormatDate(DateTime? value) => value?.ToString("yyyy-MM-dd HH:mm:ss") ?? "";
    private static string FormatMoney(decimal? value) => (value ?? 0m).ToString("0.##");

    private record ReportDefinition(string Type, string Label, string OwnerRole);
    private record DateRange(DateTime From, DateTime To, DateTime EndExclusive)
    {
        public DateTime Start => From;
    }
    private record ReportAccess(string? Type, bool IsAdmin, IActionResult? Result);
}
