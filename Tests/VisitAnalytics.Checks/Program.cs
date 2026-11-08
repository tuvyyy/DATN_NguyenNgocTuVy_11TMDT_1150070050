using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using System.Globalization;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Hosting.Server;
using Microsoft.AspNetCore.Hosting.Server.Features;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.IdentityModel.Tokens;
using Clinic.Api.Controllers;
using Clinic.Api.Data;
using Clinic.Api.Services;

var passed = 0;
void Check(bool condition, string label)
{
    if (!condition) throw new Exception("FAIL: " + label);
    passed++; Console.WriteLine("PASS: " + label);
}
bool Near(double x, double y) => Math.Abs(x - y) < 1e-7;
void Reject(Action action, string label)
{
    try { action(); } catch (ArgumentException) { Check(true, label); return; }
    Check(false, label);
}
List<MonthlyVisit> Series(int count, Func<int, int> value) => Enumerable.Range(0, count)
    .Select(i => new MonthlyVisit(new DateTime(2022, 1, 1).AddMonths(i).ToString("yyyy-MM"), value(i))).ToList();
int[] seasons = { -20, -15, 0, 5, 10, 20, 30, 15, 0, -5, -15, -25 };
var trend = VisitForecasting.LinearTrend(Series(12, i => 100 + 2 * i))!;
Check(Near(trend.Intercept, 100) && Near(trend.Slope, 2) && Near(trend.RSquared, 1), "OLS exact line has correct intercept, slope and R2");
Check(VisitForecasting.LinearTrend(Series(1, _ => 5)) == null, "OLS rejects a single point");
var errors = VisitForecasting.Errors(new double[] { 0, 10 }, new double[] { 5, 8 });
Check(Near(errors.Mae, 3.5) && Near(errors.Rmse, Math.Sqrt(14.5)) && Near(errors.Mape!.Value, 20)
    && errors.MapeCount == 1 && errors.ZeroActualCount == 1, "MAE, RMSE, MAPE and zero denominator policy");
var signedError = new ValidationPoint("2024-01", 8, 10, 6);
Check(Near(signedError.Residual, -2) && Near(signedError.AbsoluteError, 2) && Near(signedError.SeasonalNaiveResidual, 2),
    "Signed errors distinguish overforecasting from underforecasting for both models");
Reject(() => VisitForecasting.Errors(new double[] { 1 }, Array.Empty<double>()), "Reject inconsistent metric inputs");
Reject(() => VisitForecasting.Errors(new double[] { double.NaN }, new double[] { 1 }), "Reject nonfinite metric inputs");
var known = Series(36, i => 200 + 2 * i + seasons[i % 12]);
var prediction = VisitForecasting.Forecast(known);
Check(prediction.Available && prediction.TrainCount == 30 && prediction.TestCount == 6, "Temporal 30/6 train-test split");
Check(prediction.Validation.All(x => Near(x.Actual, x.Predicted)), "Recover exact additive trend-seasonal holdout");
Check(prediction.Future.Select((x, i) => Near(x.Predicted, 200 + 2 * (36 + i) + seasons[i % 12])).All(x => x), "Recover exact future seasonal cycle");
Check(prediction.Future[0].Month == "2025-01", "Forecast month labels cross calendar years");
var changedHoldout = known.Select((x, i) => i >= 30 ? x with { Count = x.Count + 500 } : x).ToList();
var changed = VisitForecasting.Forecast(changedHoldout);
Check(changed.Parameters == prediction.Parameters && changed.Validation.Select(x => x.Predicted).SequenceEqual(prediction.Validation.Select(x => x.Predicted)), "Changing holdout cannot affect parameter selection or holdout forecasts");
Check(Near(changed.Metrics!.Mae, changed.Validation.Average(x => x.AbsoluteError))
    && Near(changed.Metrics.Rmse, Math.Sqrt(changed.Validation.Average(x => x.Residual * x.Residual))),
    "Published per-month errors reconcile with holdout MAE and RMSE");
Check(!VisitForecasting.Forecast(Series(29, _ => 100)).Available, "29 months insufficient for 24 train and 6 test");
var shortHistory = VisitForecasting.Forecast(Series(12, _ => 100), testMonths: 3);
Check(!shortHistory.Available && shortHistory.RequiredMonths == 27 && shortHistory.Future.Count == 0,
    "Insufficient-history response reports the selected holdout requirement without fabricating forecasts");
Check(VisitForecasting.Forecast(Series(30, _ => 100)).Available, "Exact 24-train/6-test threshold supported");
var zero = VisitForecasting.Forecast(Series(36, _ => 0));
Check(zero.Available && zero.Metrics!.Mape == null && zero.Metrics.ZeroActualCount == 6 && zero.Future.All(x => Near(x.Predicted, 0)), "All-zero series has finite forecasts and undefined MAPE");
var decreasing = VisitForecasting.Forecast(Series(36, i => 120 - 3 * i), 12);
Check(decreasing.Future.All(x => x.Predicted >= 0) && decreasing.Future.Any(x => x.Predicted == 0), "Count forecasts are constrained to nonnegative values");
Reject(() => VisitForecasting.Forecast(known, 13), "Reject oversized forecast horizon");
Reject(() => VisitForecasting.Forecast(known, 6, 0), "Reject empty holdout");
Reject(() => VisitForecasting.Forecast(Series(36, _ => -1)), "Reject negative historical counts");
Reject(() => VisitForecasting.Forecast(known.Where((_, i) => i != 10).ToList()), "Reject noncontiguous time series");

VisitObservation Visit(long id, DateTime? at, string status = "DA_KHAM", string? recordStatus = "DA_DONG", long? patient = 1)
    => new(id, patient, at, status, recordStatus, "Bác sĩ A", "Nội", "J10", false);
var january = Visit(1, new DateTime(2024, 1, 10, 9, 0, 0));
var march = Visit(2, new DateTime(2024, 3, 10, 10, 0, 0));
var observations = new[] { january, january, march,
    Visit(3, new DateTime(2024, 2, 1), "DA_HUY"), Visit(4, new DateTime(2024, 2, 1), recordStatus: " HUY "),
    Visit(5, new DateTime(2024, 2, 1), patient: null), Visit(6, null), Visit(7, new DateTime(2024, 2, 1), "DRAFT") };
var report = VisitAnalyticsBuilder.Build(observations, new(2023, 10, 1), new(2024, 5, 31), new(2024, 6, 15));
Check(report.RawCount == 7 && report.ValidCount == 2 && report.ExcludedCancelled == 2 && report.ExcludedInvalid == 3, "Deduplicate visits and exclude cancelled parents, drafts, missing patients and missing dates");
Check(report.Monthly.Select(x => x.Count).SequenceEqual(new[] { 1, 0, 1, 0, 0 }) && report.Monthly[0].Month == "2024-01", "Zero fill interior/trailing months without inventing earlier history");
Check(report.Hourly.Sum(x => x.Count) == report.ValidCount && report.Doctors.Sum(x => x.Count) == report.ValidCount
    && report.DiseaseGroups.Single().Label == "J10", "Aggregate dimensions reconcile to unique visit totals");
var hourlyReport = VisitAnalyticsBuilder.Build(new[] {
    Visit(11, new DateTime(2024, 1, 1, 8, 0, 0)), Visit(12, new DateTime(2024, 1, 1, 8, 30, 0)),
    Visit(13, new DateTime(2024, 1, 1, 9, 0, 0)), Visit(14, new DateTime(2024, 1, 1, 9, 30, 0)),
    Visit(15, new DateTime(2024, 1, 1, 10, 0, 0)), Visit(16, new DateTime(2024, 1, 1, 9, 15, 0), "DA_HUY"),
    Visit(11, new DateTime(2024, 1, 1, 8, 0, 0))
}, new(2024, 1, 1), new(2024, 1, 31), new(2024, 2, 1));
Check(hourlyReport.RankedHours.Select(x => x.Rank).SequenceEqual(new[] { 1, 1, 3 })
    && hourlyReport.RankedHours.Select(x => x.Label[..2]).SequenceEqual(new[] { "08", "09", "10" })
    && hourlyReport.RankedHours.Select(x => x.Count).SequenceEqual(new[] { 2, 2, 1 }),
    "Peak-hour ranking preserves ties, excludes cancelled/duplicate visits and omits zero-count hours");
Check(Near(hourlyReport.RankedHours.Sum(x => x.SharePercent), 100)
    && Near(hourlyReport.RankedHours[0].SharePercent, 40), "Hourly shares use valid visits as the denominator");
Check(VisitAnalyticsBuilder.Build(Array.Empty<VisitObservation>(), new(2024, 1, 1), new(2024, 1, 31), new(2024, 2, 1)).RankedHours.Count == 0,
    "Empty input has no artificial peak hour or division by zero");
var sameName = VisitAnalyticsBuilder.Build(new[] { january with { DoctorId = 1 }, march with { DoctorId = 2 } }, new(2024, 1, 1), new(2024, 5, 31), new(2024, 6, 15));
Check(sameName.Doctors.Count == 2, "Doctors with identical names retain separate counts by ID");
var placeholder = VisitAnalyticsBuilder.Build(new[] { january, march with { IsRegistrationPlaceholder = true } }, new(2024, 1, 1), new(2024, 5, 31), new(2024, 6, 15));
Check(placeholder.ValidCount == 1 && placeholder.ExcludedReceptionOnly == 1, "Reception-only base records do not inflate clinical visit counts");
var partial = VisitAnalyticsBuilder.Build(new[] { january, march }, new(2024, 1, 15), new(2024, 3, 15), new(2024, 3, 15));
Check(partial.Monthly.Count == 0, "Partial boundary/current months are excluded and no pre-observation history is fabricated");
var current = VisitAnalyticsBuilder.Build(new[] { january, march }, new(2024, 1, 1), new(2024, 3, 31), new(2024, 3, 31));
Check(current.Monthly.Count == 2 && current.Monthly[^1].Month == "2024-02", "Even the last day of the current month is not used for training");
Check(!VisitAnalyticsBuilder.Build(Array.Empty<VisitObservation>(), new(2024, 1, 1), new(2024, 12, 31), new(2025, 1, 1)).Forecast.Available, "Empty database does not fabricate a zero-valued history");
var simulated = VisitAnalyticsService.BuildDemo(new(2022, 1, 1), new(2024, 12, 31), 6, 6);
Check(simulated.DataKind == "synthetic" && simulated.Forecast.Available && simulated.ValidCount == simulated.DemoCount, "Explicitly labeled simulated data exercises the complete report");

var experimentOutput = Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "../../../../../TestResults"));
if (args.Contains("--export-experiment"))
{
    Directory.CreateDirectory(experimentOutput);
    var jsonOptions = new JsonSerializerOptions(JsonSerializerDefaults.Web) { WriteIndented = true };
    await File.WriteAllTextAsync(Path.Combine(experimentOutput, "DuBao_MoPhong_36Thang.json"), JsonSerializer.Serialize(simulated, jsonOptions));
    var csv = new StringBuilder("Thang,ThucTe,XuHuong,TapDuLieu,DuBaoKiemTra,DuBaoTiepTheo\r\n");
    string Numeric(double? value) => value?.ToString("0.########", CultureInfo.InvariantCulture) ?? "";
    foreach (var month in simulated.Monthly)
    {
        var fit = simulated.Trend!.Points.Single(x => x.Month == month.Month).Value;
        var test = simulated.Forecast.Validation.FirstOrDefault(x => x.Month == month.Month);
        csv.AppendLine($"{month.Month},{month.Count},{Numeric(fit)},{(test == null ? "train" : "test")},{Numeric(test?.Predicted)},");
    }
    foreach (var month in simulated.Forecast.Future) csv.AppendLine($"{month.Month},,,forecast,,{Numeric(month.Predicted)}");
    await File.WriteAllTextAsync(Path.Combine(experimentOutput, "DuBao_MoPhong_36Thang.csv"), csv.ToString(), new UTF8Encoding(true));
    Console.WriteLine("Exported reproducible synthetic experiment (2022-01 through 2024-12).");
}

if (args.Contains("--database"))
{
    var root = Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "../../../../../"));
    var backend = Path.Combine(root, "Backend/Clinic.Api");
    if (!Directory.Exists(backend)) throw new Exception("Cannot locate repository for read-only database checks.");
    var config = new ConfigurationBuilder().SetBasePath(backend).AddJsonFile("appsettings.json").AddJsonFile("appsettings.Development.json", true).Build();
    var builder = WebApplication.CreateBuilder();
    builder.Logging.ClearProviders();
    builder.WebHost.UseUrls("http://127.0.0.1:0");
    builder.Services.AddDbContext<DACNDbContext>(options => options.UseSqlServer(config.GetConnectionString("DefaultConnection")));
    builder.Services.AddControllers().AddApplicationPart(typeof(BaoCaoController).Assembly);
    builder.Services.AddEndpointsApiExplorer();
    builder.Services.AddSwaggerGen(options => options.SwaggerDoc("v1", new Microsoft.OpenApi.Models.OpenApiInfo { Title = "Clinic API checks", Version = "v1" }));
    const string testKey = "Test-host-only-key-not-valid-for-production-2026";
    builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new()
        {
            ValidateIssuer = true, ValidIssuer = "analytics-checks", ValidateAudience = true, ValidAudience = "analytics-checks",
            ValidateLifetime = true, ValidateIssuerSigningKey = true, IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(testKey))
        };
    });
    builder.Services.AddAuthorization();
    await using var app = builder.Build();
    app.UseSwagger();
    app.UseAuthentication(); app.UseAuthorization(); app.MapControllers();
    await app.StartAsync();
    using var client = new HttpClient { BaseAddress = new Uri(app.Services.GetRequiredService<IServer>().Features.Get<IServerAddressesFeature>()!.Addresses.Single()) };
    var swaggerResponse = await client.GetAsync("/swagger/v1/swagger.json");
    Check(swaggerResponse.IsSuccessStatusCode, "Swagger generates documentation for all controllers without upload parameter errors");
    using var swaggerDocument = JsonDocument.Parse(await swaggerResponse.Content.ReadAsStringAsync());
    var swaggerRoot = swaggerDocument.RootElement;
    Check(swaggerRoot.GetProperty("paths").GetProperty("/api/Auth/me/{id}/avatar").GetProperty("post")
        .GetProperty("requestBody").GetProperty("content").TryGetProperty("multipart/form-data", out _),
        "Avatar upload retains multipart form binding in the API contract");
    Check(swaggerRoot.GetProperty("components").GetProperty("schemas").GetProperty("VisitAnalyticsReport")
        .GetProperty("properties").TryGetProperty("rankedHours", out _), "Swagger publishes the analytics response schema");
    string Token(string role) => new JwtSecurityTokenHandler().WriteToken(new JwtSecurityToken("analytics-checks", "analytics-checks",
        new[] { new Claim(ClaimTypes.Role, role) }, expires: DateTime.UtcNow.AddMinutes(5),
        signingCredentials: new SigningCredentials(new SymmetricSecurityKey(Encoding.UTF8.GetBytes(testKey)), SecurityAlgorithms.HmacSha256)));
    Check((await client.GetAsync("/api/bao-cao/visits")).StatusCode == HttpStatusCode.Unauthorized, "Anonymous analytics request returns 401");
    client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", Token("TIEP_DON"));
    Check((await client.GetAsync("/api/bao-cao/visits")).StatusCode == HttpStatusCode.Forbidden, "Reception role cannot access clinic-wide analytics");
    Check((await client.GetAsync("/api/bao-cao/visits/export?format=json&demo=true")).StatusCode == HttpStatusCode.Forbidden, "Nonadmin cannot bypass access through export or simulation");
    client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", Token("ADMIN"));
    foreach (var query in new[] { "horizon=13", "testMonths=0", "fromDate=2025-02-01&toDate=2025-01-01", "toDate=2099-01-01", "fromDate=not-a-date" })
        Check((await client.GetAsync("/api/bao-cao/visits?" + query)).StatusCode == HttpStatusCode.BadRequest, "API rejects invalid query: " + query);
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<DACNDbContext>();
    var before = await db.LanKhams.CountAsync();
    const string dates = "fromDate=2022-01-01&toDate=2024-12-31";
    var demoResponse = await client.GetAsync("/api/bao-cao/visits?demo=true&" + dates);
    Check(demoResponse.IsSuccessStatusCode, "Admin simulation endpoint succeeds");
    var demo = (await demoResponse.Content.ReadFromJsonAsync<VisitAnalyticsReport>())!;
    Check(demo.DataKind == "synthetic" && demo.Forecast.Available, "Simulation API exposes data label and complete forecasts");
    Check(demo.RankedHours.Count > 0 && demo.RankedHours[0].Rank == 1 && demo.Forecast.RequiredMonths == 30,
        "API includes peak-hour ranking and data requirements");
    var reportTimer = System.Diagnostics.Stopwatch.StartNew();
    var liveResponse = await client.GetAsync("/api/bao-cao/visits?fromDate=2022-01-01&toDate=" + DateTime.UtcNow.AddHours(7).ToString("yyyy-MM-dd"));
    reportTimer.Stop();
    if (!liveResponse.IsSuccessStatusCode) throw new Exception("Live API failed: " + await liveResponse.Content.ReadAsStringAsync());
    var live = (await liveResponse.Content.ReadFromJsonAsync<VisitAnalyticsReport>())!;
    Console.WriteLine($"Multi-year SQL report completed in {reportTimer.Elapsed.TotalSeconds:F2}s.");
    Check(reportTimer.Elapsed < TimeSpan.FromSeconds(10), "Multi-year report finishes within the frontend request deadline");
    if (args.Contains("--export-experiment"))
    {
        // Only clinic-level aggregates are published; never export patient records or staff names.
        await File.WriteAllTextAsync(Path.Combine(experimentOutput, "DuLieuHienTai_TongHop.json"), JsonSerializer.Serialize(new
        {
            live.DataKind, live.GeneratedAt, live.From, live.To, live.RawCount, live.ValidCount,
            live.ExcludedCancelled, live.ExcludedInvalid, live.ExcludedReceptionOnly, live.UndatedCount, live.DemoCount,
            live.Monthly, live.Trend, live.Forecast, forecastAvailable = live.Forecast.Available, forecastMessage = live.Forecast.Message,
            note = "Số liệu tổng hợp từ database phát triển, có dữ liệu demo; không khẳng định đây là lịch sử vận hành thực tế."
        }, new JsonSerializerOptions(JsonSerializerDefaults.Web) { WriteIndented = true }));
    }
    Check(live.DataKind == "database" && live.RawCount == before, "Real SQL Server query translates and source count matches database");
    Check(live.ValidCount + live.ExcludedCancelled + live.ExcludedInvalid == live.RawCount && live.Daily.Sum(x => x.Count) == live.ValidCount, "Real database preprocessing reconciles counts");
    var fromDate = new DateTime(2022, 1, 1);
    var endDate = DateTime.UtcNow.AddHours(7).Date.AddDays(1);
    var sqlValidCount = await db.Database.SqlQuery<int>($@"
        SELECT COUNT(*) AS [Value] FROM dbo.lan_kham lk
        LEFT JOIN dbo.ho_so_benh_an hs ON hs.id = lk.id_ho_so
        WHERE lk.id > 0 AND lk.id_benh_nhan > 0
          AND (lk.id_phong IS NOT NULL OR lk.id_bac_si IS NOT NULL)
          AND COALESCE(lk.thoi_gian_bat_dau, lk.created_at) >= {fromDate}
          AND COALESCE(lk.thoi_gian_bat_dau, lk.created_at) < {endDate}
          AND UPPER(LTRIM(RTRIM(COALESCE(lk.trang_thai, '')))) NOT IN ('', 'NHAP', 'DRAFT', 'HUY', 'DA_HUY', 'CANCELLED', 'CANCELED')
          AND UPPER(LTRIM(RTRIM(COALESCE(hs.trang_thai, '')))) NOT IN ('HUY', 'DA_HUY', 'CANCELLED', 'CANCELED')").SingleAsync();
    Check(live.ValidCount == sqlValidCount, "Independent SQL count matches the filtered analytics total");
    Console.WriteLine($"Live aggregates only: {live.RawCount} source, {live.ValidCount} valid, {live.Monthly.Count} complete months, forecast available={live.Forecast.Available}.");
    var jsonExport = await client.GetAsync("/api/bao-cao/visits/export?format=json&demo=true&" + dates);
    Check(jsonExport.IsSuccessStatusCode && jsonExport.Content.Headers.ContentDisposition?.FileName?.Contains("MO-PHONG") == true, "JSON export marks simulation in filename");
    using var json = JsonDocument.Parse(await jsonExport.Content.ReadAsStringAsync());
    Check(json.RootElement.GetProperty("forecast").GetProperty("parameters").GetProperty("alpha").GetDouble() >= 0, "Export includes reproducible model parameters");
    var exportedPoint = json.RootElement.GetProperty("forecast").GetProperty("validation")[0];
    Check(Near(exportedPoint.GetProperty("residual").GetDouble(), exportedPoint.GetProperty("actual").GetDouble() - exportedPoint.GetProperty("predicted").GetDouble())
        && json.RootElement.GetProperty("rankedHours").GetArrayLength() > 0, "JSON export carries signed errors and peak-hour ranks");
    var csvExport = await client.GetAsync("/api/bao-cao/visits/export?format=csv&demo=true&" + dates);
    var csv = await csvExport.Content.ReadAsStringAsync();
    Check(csvExport.IsSuccessStatusCode && csv.Contains("holdout_metrics") && csv.Contains("seasonal_naive_metrics") && csv.Contains("synthetic"), "CSV exports evaluation, baseline and data provenance");
    var csvTestRows = csv.Split("\r\n", StringSplitOptions.RemoveEmptyEntries).Where(x => x.StartsWith("\"test\","))
        .Select(x => x.Split(',').Select(v => v.Trim('"')).ToArray()).ToList();
    double CsvNumber(string value) => double.Parse(value, CultureInfo.InvariantCulture);
    Check(csv.StartsWith("section,period,label,actual,trend,predicted,residual,absolute_error\r\n")
        && csvTestRows.Count == demo.Forecast.TestCount * 2
        && csvTestRows.All(x => x.Length == 8 && Near(CsvNumber(x[6]), CsvNumber(x[3]) - CsvNumber(x[5]))
            && Near(CsvNumber(x[7]), Math.Abs(CsvNumber(x[6]))))
        && csv.Contains("hourly_rank") && csv.Contains("trainFrom"),
        "CSV signed errors match actual minus predicted for both models and include ranking and training periods");
    var monthlyExport = await client.GetAsync("/api/bao-cao/visits/export?format=monthly&demo=true&" + dates);
    var monthlyCsv = await monthlyExport.Content.ReadAsStringAsync();
    Check(monthlyExport.IsSuccessStatusCode && monthlyCsv.Contains("Tháng,Số lượt đã ghi nhận,Số lượt dự kiến")
        && monthlyCsv.Contains("Số liệu minh họa") && !monthlyCsv.Contains("holdout_metrics")
        && monthlyCsv.Split("\r\n", StringSplitOptions.RemoveEmptyEntries).Length == demo.Monthly.Count + demo.Forecast.Future.Count + 2,
        "Monthly download contains plain-language headings, observed and future months, and a sample-data label");
    Check((await client.GetAsync("/api/bao-cao/visits/export?format=exe")).StatusCode == HttpStatusCode.BadRequest, "Export rejects unsupported formats");
    Check(await db.LanKhams.CountAsync() == before, "Reporting and simulation never insert clinical visits");
    await app.StopAsync();
}
Console.WriteLine($"All {passed} checks passed.");
if (args.Contains("--export-experiment"))
    await File.WriteAllTextAsync(Path.Combine(experimentOutput, "KiemThuThongKe.json"), JsonSerializer.Serialize(new
    { completedAt = DateTimeOffset.UtcNow, passed, databaseChecks = args.Contains("--database"), success = true }, new JsonSerializerOptions { WriteIndented = true }));
