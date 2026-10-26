namespace ThucTapTotNghiep_1150070050_NguyenNgocTuVy.Services;

public record VisitObservation(long Id, long? PatientId, DateTime? At, string? Status, string? RecordStatus,
    string? Doctor, string? Specialty, string? DiseaseCode, bool IsDemo, long? DoctorId = null, bool IsRegistrationPlaceholder = false);
public record VisitCount(string Label, int Count);
public record DailyVisit(string Date, int Count);
public record VisitAnalyticsReport
{
    public string From { get; init; } = "";
    public string To { get; init; } = "";
    public DateTimeOffset GeneratedAt { get; init; }
    public string Source { get; init; } = "lan_kham; COUNT DISTINCT id; thoi_gian_bat_dau ?? created_at";
    public string DataKind { get; init; } = "database";
    public int UndatedCount { get; init; }
    public int RawCount { get; init; }
    public int ValidCount { get; init; }
    public int ExcludedCancelled { get; init; }
    public int ExcludedInvalid { get; init; }
    public int ExcludedReceptionOnly { get; init; }
    public int DemoCount { get; init; }
    public List<string> Notes { get; init; } = new();
    public List<DailyVisit> Daily { get; init; } = new();
    public List<MonthlyVisit> Monthly { get; init; } = new();
    public List<VisitCount> Hourly { get; init; } = new();
    public List<VisitCount> Doctors { get; init; } = new();
    public List<VisitCount> Specialties { get; init; } = new();
    public List<VisitCount> DiseaseGroups { get; init; } = new();
    public VisitTrend? Trend { get; init; }
    public VisitForecast Forecast { get; init; } = new();
}

public static class VisitAnalyticsBuilder
{
    private static readonly HashSet<string> Cancelled = new(StringComparer.OrdinalIgnoreCase) { "HUY", "DA_HUY", "CANCELLED", "CANCELED" };
    private static readonly HashSet<string> Draft = new(StringComparer.OrdinalIgnoreCase) { "NHAP", "DRAFT" };

    public static VisitAnalyticsReport Build(IEnumerable<VisitObservation> observations, DateTime from, DateTime to,
        DateTime today, int horizon = 6, int testMonths = 6)
    {
        from = from.Date; to = to.Date; today = today.Date;
        if (from > to || to > today || (to - from).TotalDays > 3660)
            throw new ArgumentException("Khoảng thống kê không hợp lệ: tối đa 10 năm và không vượt ngày hiện tại.");
        var rows = observations.GroupBy(x => x.Id).Select(g => g.First()).ToList();
        var cancelled = rows.Where(x => Cancelled.Contains(x.Status?.Trim() ?? "") || Cancelled.Contains(x.RecordStatus?.Trim() ?? "")).ToList();
        var nonCancelled = rows.Except(cancelled).ToList();
        bool IsValid(VisitObservation x) => !x.IsRegistrationPlaceholder && x.Id > 0 && x.PatientId > 0 && x.At.HasValue
            && x.At.Value.Date >= from && x.At.Value.Date <= to
            && !string.IsNullOrWhiteSpace(x.Status) && !Draft.Contains(x.Status.Trim());
        var valid = nonCancelled.Where(IsValid).ToList();
        var dailyCounts = valid.GroupBy(x => x.At!.Value.Date).ToDictionary(g => g.Key, g => g.Count());
        var daily = Enumerable.Range(0, (to - from).Days + 1).Select(i => from.AddDays(i))
            .Select(d => new DailyVisit(d.ToString("yyyy-MM-dd"), dailyCounts.GetValueOrDefault(d))).ToList();
        var firstMonth = new DateTime(from.Year, from.Month, 1);
        if (from.Day != 1) firstMonth = firstMonth.AddMonths(1);
        // Do not invent zero history before the first usable record, or train on an unfinished month.
        if (valid.Count > 0)
        {
            var firstObservation = valid.Min(x => x.At!.Value);
            var observedMonth = new DateTime(firstObservation.Year, firstObservation.Month, 1);
            if (observedMonth > firstMonth) firstMonth = observedMonth;
        }
        var currentMonth = new DateTime(today.Year, today.Month, 1);
        var endMonthExclusive = new DateTime(to.Year, to.Month, 1);
        if (to == endMonthExclusive.AddMonths(1).AddDays(-1)) endMonthExclusive = endMonthExclusive.AddMonths(1);
        if (endMonthExclusive > currentMonth) endMonthExclusive = currentMonth;
        var monthCounts = valid.GroupBy(x => x.At!.Value.ToString("yyyy-MM")).ToDictionary(g => g.Key, g => g.Count());
        var monthly = new List<MonthlyVisit>();
        if (valid.Count > 0)
            for (var month = firstMonth; month < endMonthExclusive; month = month.AddMonths(1))
                monthly.Add(new(month.ToString("yyyy-MM"), monthCounts.GetValueOrDefault(month.ToString("yyyy-MM"))));
        List<VisitCount> Group(Func<VisitObservation, string?> key) => valid.GroupBy(x => string.IsNullOrWhiteSpace(key(x)) ? "Chưa xác định" : key(x)!.Trim())
            .Select(g => new VisitCount(g.Key, g.Count())).OrderByDescending(x => x.Count).ThenBy(x => x.Label).ToList();
        var notes = new List<string>
        {
            "Mỗi id lượt khám được tính một lần; loại lượt/hồ sơ hủy, bản nháp, thiếu bệnh nhân, thời điểm hoặc trạng thái.",
            "Loại lượt nền của tiếp đón chưa có cả phòng khám lẫn bác sĩ; chỉ tính lượt đã được phân phòng hoặc bác sĩ, tránh đếm thêm lượt nền khi thu ngân tạo hàng đợi khám.",
            "Ngày thống kê dùng thời gian bắt đầu khám; nếu chưa có, dùng thời điểm tạo lượt. Các lượt đang chờ hợp lệ vẫn được tính; bản ghi không có cả hai thời điểm không thể gán vào khoảng lọc.",
            "Hồi quy và dự báo chỉ dùng tháng đầy đủ; không dùng tháng hiện tại hoặc tháng bị cắt bởi bộ lọc.",
            "Chuỗi bắt đầu từ tháng có lượt hợp lệ đầu tiên trong khoảng chọn; tháng trống sau đó được tính 0, cần xác nhận độ đầy đủ của dữ liệu nguồn.",
            "Nhóm bệnh dùng 3 ký tự đầu mã ICD; lượt có nhiều chẩn đoán chỉ tính bệnh chính. Chuyên khoa lấy từ phòng khám, sau đó từ bác sĩ."
        };
        var demoCount = valid.Count(x => x.IsDemo);
        if (demoCount > 0) notes.Add($"Có {demoCount} lượt mang mã dữ liệu demo. Sai số trên dữ liệu này chỉ phục vụ thực nghiệm, không chứng minh chất lượng trên dữ liệu vận hành thật.");
        if (valid.Any(x => x.At!.Value.TimeOfDay == TimeSpan.Zero)) notes.Add("Một số lượt có thời điểm 00:00; cần kiểm tra giờ thực tế trước khi kết luận về khung giờ cao điểm.");
        if (monthly.Count > 0 && monthly.All(x => x.Count == monthly[0].Count)) notes.Add("Chuỗi tháng không biến động; kết quả dự báo có thể đơn giản và không thể hiện mùa vụ.");
        return new()
        {
            From = from.ToString("yyyy-MM-dd"), To = to.ToString("yyyy-MM-dd"), GeneratedAt = DateTimeOffset.UtcNow.ToOffset(TimeSpan.FromHours(7)),
            RawCount = rows.Count, ValidCount = valid.Count, ExcludedCancelled = cancelled.Count,
            ExcludedInvalid = nonCancelled.Count - valid.Count, DemoCount = demoCount, Notes = notes,
            ExcludedReceptionOnly = nonCancelled.Count(x => x.IsRegistrationPlaceholder),
            Daily = daily, Monthly = monthly,
            Hourly = Enumerable.Range(0, 24).Select(h => new VisitCount($"{h:00}:00–{h:00}:59", valid.Count(x => x.At!.Value.Hour == h))).ToList(),
            Doctors = Group(x => x.DoctorId.HasValue ? $"{x.Doctor ?? "Chưa xác định"} (#{x.DoctorId})" : x.Doctor), Specialties = Group(x => x.Specialty),
            DiseaseGroups = Group(x => string.IsNullOrWhiteSpace(x.DiseaseCode) ? null : x.DiseaseCode.Trim().ToUpperInvariant()[..Math.Min(3, x.DiseaseCode.Trim().Length)]),
            Trend = VisitForecasting.LinearTrend(monthly), Forecast = VisitForecasting.Forecast(monthly, horizon, testMonths)
        };
    }
}
