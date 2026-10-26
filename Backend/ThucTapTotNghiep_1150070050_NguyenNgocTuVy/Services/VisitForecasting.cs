namespace ThucTapTotNghiep_1150070050_NguyenNgocTuVy.Services;

public record MonthlyVisit(string Month, int Count);
public record TrendPoint(string Month, double Value);
public record VisitTrend(double Intercept, double Slope, double RSquared, string Direction, List<TrendPoint> Points);
public record ForecastParameters(double Alpha, double Beta, double Gamma);
public record ForecastPoint(string Month, double Predicted);
public record ValidationPoint(string Month, int Actual, double Predicted, double SeasonalNaive);
public record ForecastErrors(double Mae, double Rmse, double? Mape, int MapeCount, int ZeroActualCount);
public record VisitForecast
{
    public bool Available { get; init; }
    public string Message { get; init; } = "";
    public string Method { get; init; } = "Holt-Winters additive";
    public int SeasonLength { get; init; } = 12;
    public int Horizon { get; init; }
    public int TrainCount { get; init; }
    public int TestCount { get; init; }
    public string? TrainFrom { get; init; }
    public string? TrainTo { get; init; }
    public string? TestFrom { get; init; }
    public string? TestTo { get; init; }
    public ForecastParameters? Parameters { get; init; }
    public ForecastErrors? Metrics { get; init; }
    public ForecastErrors? BaselineMetrics { get; init; }
    public List<ValidationPoint> Validation { get; init; } = new();
    public List<ForecastPoint> Future { get; init; } = new();
}

/// <summary>Deterministic algorithms; no database access, random split, or test-set parameter tuning.</summary>
public static class VisitForecasting
{
    public const int SeasonLength = 12;

    public static VisitTrend? LinearTrend(IReadOnlyList<MonthlyVisit> months)
    {
        if (months.Count < 2) return null;
        var meanX = (months.Count - 1) / 2.0;
        var meanY = months.Average(x => (double)x.Count);
        var xx = Enumerable.Range(0, months.Count).Sum(i => Math.Pow(i - meanX, 2));
        var slope = Enumerable.Range(0, months.Count).Sum(i => (i - meanX) * (months[i].Count - meanY)) / xx;
        var intercept = meanY - slope * meanX;
        var sst = months.Sum(x => Math.Pow(x.Count - meanY, 2));
        var sse = Enumerable.Range(0, months.Count).Sum(i => Math.Pow(months[i].Count - (intercept + slope * i), 2));
        return new(intercept, slope, sst < 1e-12 ? 1 : Math.Clamp(1 - sse / sst, 0, 1),
            Math.Abs(slope) < 1e-8 ? "Ổn định" : slope > 0 ? "Tăng" : "Giảm",
            months.Select((x, i) => new TrendPoint(x.Month, intercept + slope * i)).ToList());
    }

    public static ForecastErrors Errors(IReadOnlyList<double> actual, IReadOnlyList<double> predicted)
    {
        if (actual.Count == 0 || actual.Count != predicted.Count
            || actual.Any(x => !double.IsFinite(x) || x < 0)
            || predicted.Any(x => !double.IsFinite(x)))
            throw new ArgumentException("Các chuỗi sai số phải cùng độ dài, có giá trị hữu hạn và không rỗng.");
        var differences = actual.Select((x, i) => Math.Abs(x - predicted[i])).ToArray();
        var percentages = actual.Select((x, i) => x == 0 ? (double?)null : differences[i] / x * 100)
            .Where(x => x.HasValue).Select(x => x!.Value).ToArray();
        return new(differences.Average(), Math.Sqrt(differences.Average(x => x * x)),
            percentages.Length == 0 ? null : percentages.Average(), percentages.Length, actual.Count(x => x == 0));
    }

    public static VisitForecast Forecast(IReadOnlyList<MonthlyVisit> months, int horizon = 6, int testMonths = 6)
    {
        if (horizon is < 1 or > 12 || testMonths is < 1 or > 12)
            throw new ArgumentException("Số tháng dự báo và kiểm tra phải từ 1 đến 12.");
        if (months.Any(x => x.Count < 0)) throw new ArgumentException("Số lượt khám không được âm.");
        for (var i = 0; i < months.Count; i++)
        {
            var date = DateTime.ParseExact(months[i].Month, "yyyy-MM", System.Globalization.CultureInfo.InvariantCulture);
            if (i > 0 && date != DateTime.ParseExact(months[i - 1].Month, "yyyy-MM", System.Globalization.CultureInfo.InvariantCulture).AddMonths(1))
                throw new ArgumentException("Chuỗi tháng phải liên tục và theo thứ tự thời gian.");
        }
        var trainCount = Math.Max(0, months.Count - testMonths);
        if (trainCount < 2 * SeasonLength)
            return new()
            {
                Horizon = horizon, TrainCount = trainCount, TestCount = Math.Min(testMonths, months.Count),
                Message = $"Chưa đủ dữ liệu: có {months.Count} tháng đầy đủ; cần ít nhất {2 * SeasonLength + testMonths} tháng "
                    + $"(24 tháng huấn luyện và {testMonths} tháng kiểm tra). Không tạo dự báo khi thiếu lịch sử."
            };

        var training = months.Take(trainCount).Select(x => (double)x.Count).ToArray();
        // Select smoothing parameters using training SSE only. The trailing holdout is never used here.
        ForecastParameters? best = null;
        var bestSse = double.PositiveInfinity;
        foreach (var alpha in new[] { 0.1, 0.3, 0.5, 0.7, 0.9 })
        foreach (var beta in new[] { 0.0, 0.1, 0.3 })
        foreach (var gamma in new[] { 0.0, 0.1, 0.3, 0.5 })
        {
            if (gamma > 1 - alpha + 1e-10) continue;
            var candidate = new ForecastParameters(alpha, beta, gamma);
            var fit = Fit(training, candidate);
            if (fit.Sse < bestSse)
            {
                bestSse = fit.Sse;
                best = candidate;
            }
        }
        var validationState = Fit(training, best!);
        var predictions = Predict(validationState, testMonths);
        var validation = months.Skip(trainCount).Select((x, i) => new ValidationPoint(x.Month, x.Count,
            predictions[i], training[training.Length - SeasonLength + i % SeasonLength])).ToList();
        var actual = validation.Select(x => (double)x.Actual).ToArray();
        // Refit on all available complete months using the already selected parameters for deployment forecasts.
        var finalState = Fit(months.Select(x => (double)x.Count).ToArray(), best!);
        var future = Predict(finalState, horizon);
        var lastMonth = DateTime.ParseExact(months[^1].Month, "yyyy-MM", System.Globalization.CultureInfo.InvariantCulture);
        return new()
        {
            Available = true, Horizon = horizon, TrainCount = trainCount, TestCount = testMonths,
            TrainFrom = months[0].Month, TrainTo = months[trainCount - 1].Month,
            TestFrom = months[trainCount].Month, TestTo = months[^1].Month, Parameters = best,
            Metrics = Errors(actual, predictions), BaselineMetrics = Errors(actual, validation.Select(x => x.SeasonalNaive).ToArray()),
            Validation = validation,
            Future = future.Select((x, i) => new ForecastPoint(lastMonth.AddMonths(i + 1).ToString("yyyy-MM"), x)).ToList(),
            Message = "Sai số được tính trên các tháng kiểm tra chưa dùng để chọn tham số. Dự báo tiếp theo dùng mô hình khớp lại trên toàn bộ chuỗi."
        };
    }

    private record State(double Level, double Trend, double[] Seasons, int Count, double Sse);

    private static State Fit(double[] data, ForecastParameters p)
    {
        var m = SeasonLength;
        var firstMean = data.Take(m).Average();
        var trend = (data.Skip(m).Take(m).Average() - firstMean) / m;
        var level = firstMean + trend * (m - 1) / 2.0;
        var seasons = Enumerable.Range(0, m).Select(i => data[i] - (firstMean + trend * (i - (m - 1) / 2.0))).ToArray();
        var sse = 0.0;
        for (var t = m; t < data.Length; t++)
        {
            var index = t % m;
            var oldLevel = level;
            var oldTrend = trend;
            var oldSeason = seasons[index];
            var error = data[t] - (oldLevel + oldTrend + oldSeason);
            sse += error * error;
            level = p.Alpha * (data[t] - oldSeason) + (1 - p.Alpha) * (oldLevel + oldTrend);
            trend = p.Beta * (level - oldLevel) + (1 - p.Beta) * oldTrend;
            seasons[index] = p.Gamma * (data[t] - oldLevel - oldTrend) + (1 - p.Gamma) * oldSeason;
        }
        return new(level, trend, seasons, data.Length, sse);
    }

    private static double[] Predict(State state, int horizon) => Enumerable.Range(0, horizon)
        .Select(i => Math.Max(0, state.Level + (i + 1) * state.Trend + state.Seasons[(state.Count + i) % SeasonLength])).ToArray();
}
