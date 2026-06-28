using DACN_QLPK_1150070050_NguyenNgocTuVy.Data;
using Microsoft.EntityFrameworkCore;
using System.Globalization;
using System.Text;

namespace DACN_QLPK_1150070050_NguyenNgocTuVy.Services
{
    /// <summary>
    /// 🧾 Service tra cứu đơn giá hiện hành của dịch vụ (theo phòng & ngày áp dụng).
    /// Dành cho phần tiếp đón, chỉ định, thu ngân.
    /// </summary>
    public class PricingService
    {
        private readonly DACNDbContext _db;

        public PricingService(DACNDbContext db)
        {
            _db = db;
        }

        /// <summary>
        /// ✅ Lấy giá hiện hành của dịch vụ theo phòng (ưu tiên bản ghi còn hiệu lực mới nhất).
        /// </summary>
        /// <param name="idDichVu">ID dịch vụ</param>
        /// <param name="idPhong">ID phòng (có thể null)</param>
        /// <returns>Đơn giá hiện hành, hoặc null nếu không tìm thấy</returns>
        public async Task<decimal?> GetCurrentPriceAsync(long idDichVu, long? idPhong)
            => await GetCurrentPriceAsync(idDichVu, idPhong, null);

        public async Task<decimal?> GetCurrentPriceAsync(long idDichVu, long? idPhong, string? doiTuongThanhToan)
        {
            var today = DateOnly.FromDateTime(DateTime.Now);
            var targetKeys = BuildPriceObjectKeys(doiTuongThanhToan);

            var prices = await _db.DichVuGia
                .Where(g => g.IdDichVu == idDichVu
                            && g.HoatDong == true
                            && (g.IdPhong == null || (idPhong.HasValue && g.IdPhong == idPhong.Value))
                            && (g.NgayApDung == default || g.NgayApDung <= today)
                            && (g.NgayHetHan == null || g.NgayHetHan >= today))
                .OrderByDescending(g => g.IdPhong == idPhong)
                .ThenByDescending(g => g.NgayApDung)
                .ToListAsync();

            if (prices.Count == 0) return null;

            decimal? Pick(bool roomOnly, bool objectSpecific)
            {
                var price = prices
                    .Where(g => roomOnly ? g.IdPhong == idPhong : g.IdPhong == null)
                    .Where(g => objectSpecific
                        ? PriceObjectMatches(g.DoiTuongApDung, targetKeys)
                        : IsGenericPriceObject(g.DoiTuongApDung))
                    .OrderByDescending(g => g.NgayApDung)
                    .Select(g => (decimal?)g.DonGia)
                    .FirstOrDefault();

                return price.HasValue && price.Value > 0 ? price : null;
            }

            if (idPhong.HasValue && targetKeys.Count > 0 && Pick(roomOnly: true, objectSpecific: true) is { } roomObject)
                return roomObject;
            if (targetKeys.Count > 0 && Pick(roomOnly: false, objectSpecific: true) is { } commonObject)
                return commonObject;
            if (idPhong.HasValue && Pick(roomOnly: true, objectSpecific: false) is { } roomGeneric)
                return roomGeneric;
            if (Pick(roomOnly: false, objectSpecific: false) is { } commonGeneric)
                return commonGeneric;

            var fallback = prices
                .OrderByDescending(g => g.IdPhong == idPhong)
                .ThenByDescending(g => g.NgayApDung)
                .Select(g => (decimal?)g.DonGia)
                .FirstOrDefault();

            return fallback.HasValue && fallback.Value > 0 ? fallback : null;
        }

        private static HashSet<string> BuildPriceObjectKeys(string? doiTuongThanhToan)
        {
            var key = NormalizePriceObject(doiTuongThanhToan);
            var keys = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            if (string.IsNullOrWhiteSpace(key)) return keys;

            keys.Add(key);
            if (key.Contains("bhyt") || key.Contains("baohiem"))
            {
                keys.UnionWith(new[] { "bhyt", "baohiemyte", "baohiem" });
            }
            else if (key.Contains("tuphi") || key.Contains("tutuc"))
            {
                keys.UnionWith(new[] { "tuphi", "tutuc", "vienphi" });
            }
            else if (key.Contains("dichvu") || key.Contains("yeucau") || key.Contains("vip"))
            {
                keys.UnionWith(new[] { "dichvuyeucau", "dichvu", "yeucau", "vip" });
            }
            else if (key.Contains("congty") || key.Contains("doanhnghiep"))
            {
                keys.UnionWith(new[] { "congty", "congtychitra", "doanhnghiep" });
            }

            return keys;
        }

        private static bool PriceObjectMatches(string? raw, HashSet<string> targetKeys)
        {
            if (targetKeys.Count == 0) return false;
            var key = NormalizePriceObject(raw);
            return !string.IsNullOrWhiteSpace(key) && targetKeys.Contains(key);
        }

        private static bool IsGenericPriceObject(string? raw)
        {
            var key = NormalizePriceObject(raw);
            return string.IsNullOrWhiteSpace(key)
                || key is "tatca" or "all" or "chung" or "macdinh" or "default";
        }

        private static string NormalizePriceObject(string? raw)
        {
            if (string.IsNullOrWhiteSpace(raw)) return string.Empty;

            var normalized = raw.Trim().ToLowerInvariant().Normalize(NormalizationForm.FormD);
            var builder = new StringBuilder(normalized.Length);
            foreach (var c in normalized)
            {
                var category = CharUnicodeInfo.GetUnicodeCategory(c);
                if (category == UnicodeCategory.NonSpacingMark) continue;
                if (char.IsLetterOrDigit(c)) builder.Append(c == 'đ' ? 'd' : c);
            }

            return builder.ToString().Normalize(NormalizationForm.FormC);
        }

        /// <summary>
        /// ✅ Lấy toàn bộ bảng giá hiện hành của dịch vụ (hiển thị trong giao diện quản lý giá).
        /// </summary>
        public async Task<List<PricingItem>> GetAllActivePricesAsync(long idDichVu)
        {
            var today = DateOnly.FromDateTime(DateTime.Now);

            var list = await _db.DichVuGia
                .Where(g => g.IdDichVu == idDichVu
                            && g.HoatDong == true
                            && (g.NgayApDung == default || g.NgayApDung <= today)
                            && (g.NgayHetHan == null || g.NgayHetHan >= today))
                .OrderByDescending(g => g.NgayApDung)
                .Select(g => new PricingItem
                {
                    Id = g.Id,
                    IdPhong = g.IdPhong,
                    DonGia = g.DonGia,
                    NgayApDung = g.NgayApDung,
                    NgayHetHan = g.NgayHetHan,
                    DoiTuongApDung = g.DoiTuongApDung,
                    GhiChu = g.GhiChu
                })
                .ToListAsync();

            return list;
        }
    }

    /// <summary>
    /// DTO phụ để trả ra thông tin bảng giá hiện hành
    /// </summary>
    public class PricingItem
    {
        public long Id { get; set; }
        public long? IdPhong { get; set; }
        public decimal DonGia { get; set; }
        public DateOnly NgayApDung { get; set; }
        public DateOnly? NgayHetHan { get; set; }
        public string? DoiTuongApDung { get; set; }
        public string? GhiChu { get; set; }
    }
}
