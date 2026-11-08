using Microsoft.EntityFrameworkCore;
using Clinic.Api.Data;

namespace Clinic.Api.Services;

public class VisitAnalyticsService(DACNDbContext db)
{
    public async Task<VisitAnalyticsReport> BuildAsync(DateTime from, DateTime to, int horizon, int testMonths, CancellationToken ct)
    {
        var end = to.Date.AddDays(1);
        // Resolve referenced rows in bounded batches: six optional joins produced slow
        // SQL plans for multi-year ranges. Only reporting fields are loaded, without tracking.
        var visits = await db.LanKhams.AsNoTracking()
            .Where(x => (x.ThoiGianBatDau ?? x.CreatedAt) >= from.Date && (x.ThoiGianBatDau ?? x.CreatedAt) < end)
            .Select(x => new { x.Id, x.IdBenhNhan, x.IdHoSo, x.IdBacSi, x.IdPhong, x.IdBenh,
                At = x.ThoiGianBatDau ?? x.CreatedAt, x.TrangThai })
            .ToListAsync(ct);
        // Constant ID batches avoid SQL Server OPENJSON plans that also timed out here.
        var records = await LoadLookupAsync(visits.Select(x => x.IdHoSo),
            ids => db.HoSoBenhAns.AsNoTracking().Where(x => EF.Constant(ids).Contains(x.Id))
                .Select(x => new { x.Id, x.TrangThai, x.MaHs }), x => x.Id, ct);
        var patients = await LoadLookupAsync(visits.Select(x => x.IdBenhNhan),
            ids => db.BenhNhans.AsNoTracking().Where(x => EF.Constant(ids).Contains(x.Id))
                .Select(x => new { x.Id, x.MaBn }), x => x.Id, ct);
        var doctors = await LoadLookupAsync(visits.Select(x => x.IdBacSi),
            ids => db.NguoiDungs.AsNoTracking().Where(x => EF.Constant(ids).Contains(x.Id))
                .Select(x => new { x.Id, x.HoTen, x.KhoaPhong }), x => x.Id, ct);
        var rooms = await LoadLookupAsync(visits.Select(x => x.IdPhong),
            ids => db.PhongKhams.AsNoTracking().Where(x => EF.Constant(ids).Contains(x.Id))
                .Select(x => new { x.Id, x.KhoaPhong }), x => x.Id, ct);
        var diseases = await LoadLookupAsync(visits.Select(x => x.IdBenh),
            ids => db.Benhs.AsNoTracking().Where(x => EF.Constant(ids).Contains(x.Id))
                .Select(x => new { x.Id, x.Ma }), x => x.Id, ct);
        var rows = visits.Select(x =>
        {
            var record = x.IdHoSo.HasValue ? records.GetValueOrDefault(x.IdHoSo.Value) : null;
            var patient = x.IdBenhNhan.HasValue ? patients.GetValueOrDefault(x.IdBenhNhan.Value) : null;
            var doctor = x.IdBacSi.HasValue ? doctors.GetValueOrDefault(x.IdBacSi.Value) : null;
            var room = x.IdPhong.HasValue ? rooms.GetValueOrDefault(x.IdPhong.Value) : null;
            var disease = x.IdBenh.HasValue ? diseases.GetValueOrDefault(x.IdBenh.Value) : null;
            return new VisitObservation(x.Id, x.IdBenhNhan, x.At, x.TrangThai, record?.TrangThai,
                doctor?.HoTen, !string.IsNullOrWhiteSpace(room?.KhoaPhong) ? room.KhoaPhong : doctor?.KhoaPhong,
                disease?.Ma, IsDemoCode(patient?.MaBn, "DEMO-", "DM") || IsDemoCode(record?.MaHs, "HS-DEMO-", "HS-DM"),
                x.IdBacSi, x.IdPhong == null && x.IdBacSi == null);
        });
        var undated = await db.LanKhams.CountAsync(x => x.ThoiGianBatDau == null && x.CreatedAt == null, ct);
        return VisitAnalyticsBuilder.Build(rows, from, to, DateTime.UtcNow.AddHours(7).Date, horizon, testMonths)
            with { UndatedCount = undated };
    }

    private static bool IsDemoCode(string? code, string firstPrefix, string secondPrefix) => code != null
        && (code.StartsWith(firstPrefix, StringComparison.OrdinalIgnoreCase) || code.StartsWith(secondPrefix, StringComparison.OrdinalIgnoreCase));

    private static async Task<Dictionary<TKey, T>> LoadLookupAsync<TKey, T>(IEnumerable<TKey?> ids,
        Func<TKey[], IQueryable<T>> query, Func<T, TKey> key, CancellationToken ct) where TKey : struct
    {
        var result = new Dictionary<TKey, T>();
        foreach (var batch in ids.Where(x => x.HasValue).Select(x => x!.Value).Distinct().Chunk(500))
            foreach (var row in await query(batch).ToListAsync(ct)) result[key(row)] = row;
        return result;
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
