using DACN_QLPK_1150070050_NguyenNgocTuVy.Data;
using DACN_QLPK_1150070050_NguyenNgocTuVy.Dtos;
using DACN_QLPK_1150070050_NguyenNgocTuVy.Models;
using Microsoft.EntityFrameworkCore;
using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;

namespace DACN_QLPK_1150070050_NguyenNgocTuVy.Services
{
    public class DonThuocValidatorService
    {
        private readonly DACNDbContext _db;

        public DonThuocValidatorService(DACNDbContext db)
        {
            _db = db;
        }

        // ======================================================
        // 1️⃣ CHECK DỊ ỨNG
        // ======================================================
        public async Task<List<string>> CheckDiUng(long idBenhNhan, List<long> listIdThuoc)
        {
            var result = new List<string>();

            var diUng = await _db.BenhNhanDiUngThuocs
                .Where(x => x.IdBenhNhan == idBenhNhan)
                .Include(x => x.IdThuocNavigation)
                .ToListAsync();

            var trung = diUng.Where(x => listIdThuoc.Contains(x.IdThuoc)).ToList();

            if (trung.Any())
            {
                string txt = string.Join(", ", trung.Select(x => x.IdThuocNavigation.Ten));
                result.Add($"🚫 Dị ứng: {txt}");
            }

            return result;
        }

        // ======================================================
        // 2️⃣ CHECK TƯƠNG TÁC THUỐC
        // ======================================================
        public async Task<(List<string> warnings, List<string> errors)> CheckTuongTac(List<long> ids)
        {
            var warnings = new List<string>();
            var errors = new List<string>();

            var interactions = await _db.TuongTacThuocs
                .Include(x => x.IdThuoc1Navigation)
                .Include(x => x.IdThuoc2Navigation)
                .ToListAsync();

            foreach (var a in ids)
            {
                foreach (var b in ids)
                {
                    if (a >= b) continue;

                    var inter = interactions.FirstOrDefault(x =>
                        (x.IdThuoc1 == a && x.IdThuoc2 == b) ||
                        (x.IdThuoc1 == b && x.IdThuoc2 == a));

                    if (inter != null)
                    {
                        string msg = $"{inter.IdThuoc1Navigation.Ten} + {inter.IdThuoc2Navigation.Ten} ({inter.CanhBao})";

                        if (inter.MucDo == 3)
                            errors.Add("❌ " + msg);
                        else
                            warnings.Add("⚠️ " + msg);
                    }
                }
            }
            return (warnings, errors);
        }

        // ======================================================
        // 3️⃣ CHECK CHỐNG CHỈ ĐỊNH THEO BỆNH
        // ======================================================
        public async Task<List<string>> CheckChongChiDinh(long? idBenh, List<long> ids)
        {
            var errors = new List<string>();
            if (idBenh == null) return errors;

            var ccd = await _db.ChongChiDinhBenhThuocs
                .Where(x => x.IdBenh == idBenh)
                .Include(x => x.IdThuocNavigation)
                .Include(x => x.IdBenhNavigation)
                .ToListAsync();

            var trung = ccd.Where(x => ids.Contains(x.IdThuoc)).ToList();

            if (trung.Any())
            {
                string msg = string.Join(", ", trung.Select(x =>
                    $"{x.IdThuocNavigation.Ten} (Không dùng cho bệnh {x.IdBenhNavigation.Ten})"));

                errors.Add("⛔ Chống chỉ định: " + msg);
            }

            return errors;
        }

        // ======================================================
        // 4️⃣ CHECK QUÁ LIỀU
        // ======================================================
        public async Task<List<string>> CheckQuaLieu(List<DonThuocChiTietCreateDto> chiTiet)
        {
            var result = new List<string>();
            var maxDose = await _db.ThuocLieuChuans.ToListAsync();

            foreach (var ct in chiTiet)
            {
                int tong =
                    (ct.Sang ?? 0) +
                    (ct.Trua ?? 0) +
                    (ct.Chieu ?? 0) +
                    (ct.Toi ?? 0) +
                    (ct.Khuya ?? 0);

                int max = maxDose.FirstOrDefault(x => x.IdThuoc == ct.IdThuoc)?.LieuToiDaNgay ?? 0;

                if (max > 0 && tong > max)
                {
                    var ten = await _db.Thuocs.Where(x => x.Id == ct.IdThuoc)
                        .Select(x => x.Ten).FirstOrDefaultAsync();

                    result.Add($"⚠️ Quá liều {ten}: {tong}/{max} lần/ngày");
                }
            }
            return result;
        }

        // ======================================================
        // 5️⃣ CHECK HẠN SỬ DỤNG – TỒN KHO
        // ======================================================
        public async Task<(List<string> warnings, List<string> errors)> CheckHanDungKho(List<DonThuocChiTietCreateDto> chiTiet)
        {
            var warnings = new List<string>();
            var errors = new List<string>();

            var dsThuoc = await _db.Thuocs.ToListAsync();

            foreach (var ct in chiTiet)
            {
                var t = dsThuoc.FirstOrDefault(x => x.Id == ct.IdThuoc);

                if (t == null)
                {
                    errors.Add($"Thuốc ID {ct.IdThuoc} không tồn tại");
                    continue;
                }

                if (t.HanSuDung != null &&
                    t.HanSuDung < DateOnly.FromDateTime(DateTime.Today))
                {
                    errors.Add($"❌ Thuốc {t.Ten} đã hết hạn dùng");
                }

                if (t.SoLuongTon < (ct.SoLuong ?? 0))
                {
                    warnings.Add($"⚠️ Thuốc {t.Ten} tồn kho: {t.SoLuongTon}, kê: {ct.SoLuong}");
                }
            }

            return (warnings, errors);
        }

        public async Task<List<string>> CheckTrungHoatChat(List<long> ids)
        {
            var errors = new List<string>();
            if (ids.Count < 2) return errors;

            var thuocs = await _db.Thuocs
                .Where(x => ids.Contains(x.Id))
                .ToListAsync();

            var duplicated = thuocs
                .GroupBy(GetHoatChatKey)
                .Where(g => !string.IsNullOrWhiteSpace(g.Key) && g.Count() > 1)
                .ToList();

            foreach (var group in duplicated)
            {
                var names = string.Join(", ", group.Select(x => x.Ten).Distinct());
                var label = group.First().HoatChat?.Trim();
                if (string.IsNullOrWhiteSpace(label)) label = group.First().Ten;
                errors.Add($"Trùng hoạt chất {label}: {names}");
            }

            return errors;
        }

        // ======================================================
        // 6️⃣ HÀM TỔNG HỢP KIỂM TRA
        // ======================================================
        public async Task<(List<string> warnings, List<string> errors)> ValidateFull(DonThuocCreateDto dto)
        {
            var warnings = new List<string>();
            var errors = new List<string>();

            var ids = dto.ChiTiet.Select(x => x.IdThuoc).Distinct().ToList();

            errors.AddRange(await CheckTrungHoatChat(ids));

            errors.AddRange(await CheckDiUng(dto.IdBenhNhan, ids));

            var (w2, e2) = await CheckTuongTac(ids);
            warnings.AddRange(w2);
            errors.AddRange(e2);

            var lan = await _db.LanKhams.FirstOrDefaultAsync(x => x.Id == dto.IdLanKham);
            errors.AddRange(await CheckChongChiDinh(lan?.IdBenh, ids));

            warnings.AddRange(await CheckQuaLieu(dto.ChiTiet));

            var (w5, e5) = await CheckHanDungKho(dto.ChiTiet);
            warnings.AddRange(w5);
            errors.AddRange(e5);

            return (warnings, errors);
        }

        private static string GetHoatChatKey(Thuoc thuoc)
        {
            var value = ExtractHoatChatFromText(thuoc.HoatChat)
                        ?? ExtractHoatChatFromText(thuoc.MoTa)
                        ?? thuoc.Ten;
            return NormalizeKey(value);
        }

        private static string? ExtractHoatChatFromText(string? value)
        {
            if (string.IsNullOrWhiteSpace(value)) return null;
            var match = Regex.Match(value, @"(?:ho[aạ]t\s*ch[aấ]t|active\s*ingredient)\s*[:=\-]\s*(.+)", RegexOptions.IgnoreCase);
            return match.Success ? match.Groups[1].Value.Trim() : value.Trim();
        }

        private static string NormalizeKey(string? value)
        {
            if (string.IsNullOrWhiteSpace(value)) return string.Empty;
            var normalized = value.Normalize(NormalizationForm.FormD);
            var builder = new StringBuilder();
            foreach (var ch in normalized)
            {
                if (CharUnicodeInfo.GetUnicodeCategory(ch) != UnicodeCategory.NonSpacingMark)
                    builder.Append(ch);
            }

            var text = builder.ToString().Normalize(NormalizationForm.FormC).ToUpperInvariant();
            text = Regex.Replace(text, @"\b(\d+([,.]\d+)?\s*(MG|G|ML|MCG|IU|UI|%|VIEN|ONG|GOI|CHAI|TUYP))\b", " ");
            text = Regex.Replace(text, @"[^A-Z0-9]+", " ").Trim();
            return text;
        }
    }
}
