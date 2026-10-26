using Microsoft.EntityFrameworkCore;
using ThucTapTotNghiep_1150070050_NguyenNgocTuVy.Data;

namespace ThucTapTotNghiep_1150070050_NguyenNgocTuVy.Services;

public class VisitAnalyticsService(DACNDbContext db)
{
    public async Task<VisitAnalyticsReport> BuildAsync(DateTime from, DateTime to, int horizon, int testMonths, CancellationToken ct)
    {
        var end = to.Date.AddDays(1);
        // Navigation projections use many-to-one joins only: never join prescriptions or technical orders.
        var rows = await db.LanKhams.AsNoTracking()
            .Where(x => (x.ThoiGianBatDau ?? x.CreatedAt) >= from.Date && (x.ThoiGianBatDau ?? x.CreatedAt) < end)
            .Select(x => new VisitObservation(x.Id, x.IdBenhNhan, x.ThoiGianBatDau ?? x.CreatedAt, x.TrangThai,
                x.IdHoSoNavigation == null ? null : x.IdHoSoNavigation.TrangThai,
                x.IdBacSiNavigation == null ? null : x.IdBacSiNavigation.HoTen,
                x.IdPhongNavigation != null && x.IdPhongNavigation.KhoaPhong != null && x.IdPhongNavigation.KhoaPhong != ""
                    ? x.IdPhongNavigation.KhoaPhong : x.IdBacSiNavigation == null ? null : x.IdBacSiNavigation.KhoaPhong,
                x.IdBenhNavigation == null ? null : x.IdBenhNavigation.Ma,
                (x.IdBenhNhanNavigation != null && (x.IdBenhNhanNavigation.MaBn.StartsWith("DEMO-") || x.IdBenhNhanNavigation.MaBn.StartsWith("DM")))
                    || (x.IdHoSoNavigation != null && (x.IdHoSoNavigation.MaHs.StartsWith("HS-DEMO-") || x.IdHoSoNavigation.MaHs.StartsWith("HS-DM"))), x.IdBacSi, x.IdPhong == null && x.IdBacSi == null))
            .ToListAsync(ct);
        var undated = await db.LanKhams.CountAsync(x => x.ThoiGianBatDau == null && x.CreatedAt == null, ct);
        return VisitAnalyticsBuilder.Build(rows, from, to, DateTime.UtcNow.AddHours(7).Date, horizon, testMonths)
            with { UndatedCount = undated };
    }

    public static VisitAnalyticsReport BuildDemo(DateTime from, DateTime to, int horizon, int testMonths)
    {
        // Explicit, reproducible demonstration only. Never insert simulated clinical visits into SQL Server.
        int[] season = { -45, -35, 5, 10, 15, 25, 40, 35, 15, 5, -20, -50 };
        var rows = new List<VisitObservation>();
        long id = 0;
        for (var month = new DateTime(from.Year, from.Month, 1); month <= to; month = month.AddMonths(1))
        {
            var index = (month.Year - 2020) * 12 + month.Month - 1;
            var count = Math.Max(20, 180 + 2 * index + season[month.Month - 1] + (index * 7 % 17) - 8);
            for (var i = 0; i < count; i++)
            {
                var at = month.AddDays(i % DateTime.DaysInMonth(month.Year, month.Month)).AddHours(7 + i % 9).AddMinutes(i * 7 % 60);
                if (at.Date < from.Date || at.Date > to.Date) continue;
                rows.Add(new(++id, 1, at, "DA_KHAM", "DA_DONG", "Mô phỏng", "Mô phỏng", null, true));
            }
        }
        var report = VisitAnalyticsBuilder.Build(rows, from, to, DateTime.UtcNow.AddHours(7).Date, horizon, testMonths);
        return report with
        {
            DataKind = "synthetic", Source = "synthetic-monthly-v1: deterministic trend + annual seasonality + noise; no database writes",
            Notes = new List<string> { "TOÀN BỘ kết quả này là dữ liệu mô phỏng để minh họa thuật toán, không phải hoạt động thực của phòng khám. Không dùng sai số này để kết luận độ chính xác trên dữ liệu thật." }.Concat(report.Notes).ToList()
        };
    }
}
