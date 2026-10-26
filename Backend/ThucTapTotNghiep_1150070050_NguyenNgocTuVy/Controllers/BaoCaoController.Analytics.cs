using System.Globalization;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using ThucTapTotNghiep_1150070050_NguyenNgocTuVy.Services;

namespace ThucTapTotNghiep_1150070050_NguyenNgocTuVy.Controllers;

public partial class BaoCaoController
{
    [HttpGet("visits")]
    public async Task<IActionResult> Visits([FromQuery] DateTime? fromDate, [FromQuery] DateTime? toDate,
        [FromQuery] int horizon = 6, [FromQuery] int testMonths = 6, [FromQuery] bool demo = false, CancellationToken ct = default)
    {
        var access = EnsureReportAccess("visit-analytics", await GetCurrentRolesAsync());
        if (access.Result != null) return access.Result;
        var range = AnalyticsRange(fromDate, toDate, horizon, testMonths);
        if (range.Error != null) return BadRequest(new { message = range.Error });
        return Ok(demo ? VisitAnalyticsService.BuildDemo(range.From, range.To, horizon, testMonths)
            : await new VisitAnalyticsService(_db).BuildAsync(range.From, range.To, horizon, testMonths, ct));
    }

    [HttpGet("visits/export")]
    public async Task<IActionResult> ExportVisits([FromQuery] DateTime? fromDate, [FromQuery] DateTime? toDate,
        [FromQuery] int horizon = 6, [FromQuery] int testMonths = 6, [FromQuery] string format = "csv", [FromQuery] bool demo = false, CancellationToken ct = default)
    {
        var access = EnsureReportAccess("visit-analytics", await GetCurrentRolesAsync());
        if (access.Result != null) return access.Result;
        var range = AnalyticsRange(fromDate, toDate, horizon, testMonths);
        if (range.Error != null) return BadRequest(new { message = range.Error });
        if (format != "csv" && format != "json") return BadRequest(new { message = "Định dạng xuất phải là csv hoặc json." });
        var report = demo ? VisitAnalyticsService.BuildDemo(range.From, range.To, horizon, testMonths)
            : await new VisitAnalyticsService(_db).BuildAsync(range.From, range.To, horizon, testMonths, ct);
        var filename = $"phan-tich-luot-kham-{(demo ? "MO-PHONG-" : "")}{range.From:yyyyMMdd}-{range.To:yyyyMMdd}";
        if (format == "json")
            return File(JsonSerializer.SerializeToUtf8Bytes(report, new JsonSerializerOptions(JsonSerializerDefaults.Web) { WriteIndented = true }),
                "application/json; charset=utf-8", filename + ".json");
        return File(Encoding.UTF8.GetPreamble().Concat(Encoding.UTF8.GetBytes(AnalyticsCsv(report))).ToArray(),
            "text/csv; charset=utf-8", filename + ".csv");
    }

    private static (DateTime From, DateTime To, string? Error) AnalyticsRange(DateTime? from, DateTime? to, int horizon, int testMonths)
    {
        var today = DateTime.UtcNow.AddHours(7).Date;
        var thisMonth = new DateTime(today.Year, today.Month, 1);
        var start = (from ?? thisMonth.AddMonths(-36)).Date;
        var end = (to ?? thisMonth.AddDays(-1)).Date;
        var error = horizon is < 1 or > 12 || testMonths is < 1 or > 12
            ? "Số tháng dự báo và kiểm tra phải từ 1 đến 12."
            : start > end || start.Year < 1900 || end > today || (end - start).TotalDays > 3660
                ? "Chọn khoảng thống kê hợp lệ, tối đa 10 năm và không vượt ngày hiện tại." : null;
        return (start, end, error);
    }

    private static string AnalyticsCsv(VisitAnalyticsReport report)
    {
        var csv = new StringBuilder("section,period,label,actual,trend,predicted\r\n");
        string Cell(object? value)
        {
            var text = Convert.ToString(value, CultureInfo.InvariantCulture) ?? "";
            if (value is string && text.TrimStart().Length > 0 && "=+-@".Contains(text.TrimStart()[0])) text = "'" + text;
            return "\"" + text.Replace("\"", "\"\"") + "\"";
        }
        void Row(params object?[] cells) => csv.AppendLine(string.Join(",", cells.Select(Cell)));
        Row("metadata", "", "source", report.Source, null, null);
        Row("metadata", "", "dataKind", report.DataKind, null, null);
        Row("metadata", "", "generatedAt", report.GeneratedAt.ToString("O"), null, null);
        Row("metadata", "", "from", report.From, null, null);
        Row("metadata", "", "to", report.To, null, null);
        Row("metadata", "", "validCount", report.ValidCount, null, null);
        Row("metadata", "", "excludedCancelled", report.ExcludedCancelled, null, null);
        Row("metadata", "", "excludedInvalid", report.ExcludedInvalid, null, null);
        Row("metadata", "", "excludedReceptionOnly", report.ExcludedReceptionOnly, null, null);
        Row("metadata", "", "demoCount", report.DemoCount, null, null);
        Row("metadata", "", "undatedCount_all_database", report.UndatedCount, null, null);
        Row("metadata", "", "seasonLength", report.Forecast.SeasonLength, null, null);
        Row("metadata", "", "trainCount", report.Forecast.TrainCount, null, null);
        Row("metadata", "", "testCount", report.Forecast.TestCount, null, null);
        Row("metadata", "", "forecastMessage", report.Forecast.Message, null, null);
        if (report.Trend != null)
        {
            Row("regression", "", "intercept", report.Trend.Intercept, null, null);
            Row("regression", "", "slope", report.Trend.Slope, null, null);
            Row("regression", "", "rSquared", report.Trend.RSquared, null, null);
        }
        if (report.Forecast.Parameters is { } p)
        {
            Row("parameters", "", "alpha", p.Alpha, null, null);
            Row("parameters", "", "beta", p.Beta, null, null);
            Row("parameters", "", "gamma", p.Gamma, null, null);
        }
        void Metrics(string label, ForecastErrors? metrics)
        {
            if (metrics == null) return;
            Row(label, "", "MAE", metrics.Mae, null, null);
            Row(label, "", "RMSE", metrics.Rmse, null, null);
            Row(label, "", "MAPE", metrics.Mape, null, null);
            Row(label, "", "MAPE_count", metrics.MapeCount, null, null);
            Row(label, "", "zero_actual_count", metrics.ZeroActualCount, null, null);
        }
        Metrics("holdout_metrics", report.Forecast.Metrics);
        Metrics("seasonal_naive_metrics", report.Forecast.BaselineMetrics);
        foreach (var x in report.Monthly) Row("monthly", x.Month, "Lượt khám", x.Count,
            report.Trend?.Points.FirstOrDefault(t => t.Month == x.Month)?.Value, null);
        foreach (var x in report.Forecast.Validation)
        {
            Row("test", x.Month, "Holt-Winters", x.Actual, null, x.Predicted);
            Row("test", x.Month, "Seasonal naive", x.Actual, null, x.SeasonalNaive);
        }
        foreach (var x in report.Forecast.Future) Row("forecast", x.Month, "Holt-Winters", null, null, x.Predicted);
        foreach (var x in report.Daily) Row("daily", x.Date, "Lượt khám", x.Count, null, null);
        foreach (var (name, rows) in new[] { ("hourly", report.Hourly), ("doctors", report.Doctors), ("specialties", report.Specialties), ("disease_groups", report.DiseaseGroups) })
            foreach (var x in rows) Row(name, "", x.Label, x.Count, null, null);
        foreach (var note in report.Notes) Row("note", "", note, null, null, null);
        return csv.ToString();
    }
}
