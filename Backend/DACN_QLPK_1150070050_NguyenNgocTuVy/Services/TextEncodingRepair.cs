using System.Text;

namespace DACN_QLPK_1150070050_NguyenNgocTuVy.Services;

public static class TextEncodingRepair
{
    private static readonly string[] MojibakeMarkers =
    [
        "\u00C3", "\u00C2", "\u00C4", "\u0102", "\u00E2\u0080",
        "\u00E2\u0082\u00AC", "\u00EF\u00BF\u00BD", "\uFFFD"
    ];

    public static string? Repair(string? value)
    {
        if (string.IsNullOrWhiteSpace(value) || !LooksBroken(value))
        {
            return value;
        }

        var best = value;
        var bestScore = Score(value);

        foreach (var codePage in new[] { 1258, 1252 })
        {
            var current = value;
            for (var i = 0; i < 3; i++)
            {
                var candidate = TryReinterpretAsUtf8(current, codePage);
                if (string.IsNullOrEmpty(candidate) || candidate == current)
                {
                    break;
                }

                var score = Score(candidate);
                if (score < bestScore)
                {
                    best = candidate;
                    bestScore = score;
                }

                current = candidate;
            }
        }

        return best;
    }

    private static bool LooksBroken(string value) =>
        MojibakeMarkers.Any(value.Contains);

    private static int Score(string value)
    {
        var score = 0;
        foreach (var marker in MojibakeMarkers)
        {
            score += CountOccurrences(value, marker) * 10;
        }

        score += value.Count(ch => ch == '?' || ch == '\uFFFD') * 20;
        return score;
    }

    private static int CountOccurrences(string value, string marker)
    {
        var count = 0;
        var index = 0;
        while ((index = value.IndexOf(marker, index, StringComparison.Ordinal)) >= 0)
        {
            count++;
            index += marker.Length;
        }

        return count;
    }

    private static string? TryReinterpretAsUtf8(string value, int codePage)
    {
        try
        {
            var sourceEncoding = Encoding.GetEncoding(
                codePage,
                EncoderFallback.ExceptionFallback,
                DecoderFallback.ExceptionFallback);

            return Encoding.UTF8.GetString(sourceEncoding.GetBytes(value));
        }
        catch
        {
            return null;
        }
    }
}
