using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using ThucTapTotNghiep_1150070050_NguyenNgocTuVy.Data;
using ThucTapTotNghiep_1150070050_NguyenNgocTuVy.Models;
using ThucTapTotNghiep_1150070050_NguyenNgocTuVy.Services;
using Microsoft.AspNetCore.Authorization;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using QRCoder;
using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;

namespace ThucTapTotNghiep_1150070050_NguyenNgocTuVy.Controllers.PDF
{
    [ApiController]
    [Authorize]
    [Route("api/pdf/donthuoc")]
    [Authorize]
    public class DonThuocPDFController : ControllerBase
    {
        private readonly DACNDbContext _db;
        private readonly IKhamBenhAuditService _audit;

        public DonThuocPDFController(DACNDbContext db, IKhamBenhAuditService audit)
        {
            _db = db;
            _audit = audit;
            QuestPDF.Settings.License = LicenseType.Community;
        }

        [HttpGet("tong-hop/{idLanKham}")]
        public async Task<IActionResult> ExportTongHop(long idLanKham)
        {
            var current = await _db.LanKhams.AsNoTracking().FirstOrDefaultAsync(x => x.Id == idLanKham);
            if (current == null) return NotFound(new { message = "Không tìm thấy lần khám." });

            var visits = await LoadRelatedVisits(current);
            var blocking = visits.Where(x => !IsVisitConcluded(x.TrangThai)).ToList();
            if (blocking.Count > 0)
            {
                return BadRequest(new
                {
                    message = "Chỉ in đơn tổng sau khi các phòng liên quan đã kết luận.",
                    rooms = blocking.Select(x => x.IdPhongNavigation?.TenPhong ?? $"Lượt khám #{x.Id}")
                });
            }

            var visitIds = visits.Select(x => x.Id).ToList();
            var prescriptions = await _db.DonThuocs
                .AsNoTracking()
                .Include(x => x.IdBacSiNavigation)
                .Where(x => x.IdLanKham.HasValue && visitIds.Contains(x.IdLanKham.Value))
                .OrderBy(x => x.NgayKe)
                .ToListAsync();

            var donIds = prescriptions.Select(x => x.Id).ToList();
            var details = await _db.ChiTietDonThuocs
                .AsNoTracking()
                .Include(x => x.IdThuocNavigation)
                    .ThenInclude(x => x!.IdNhomNavigation)
                .Where(x => x.IdDonThuoc.HasValue && donIds.Contains(x.IdDonThuoc.Value))
                .ToListAsync();

            var papers = await LoadLatestConclusionPapers(visitIds);
            var detailByDon = details.GroupBy(x => x.IdDonThuoc ?? 0).ToDictionary(g => g.Key, g => g.ToList());
            var qrBytes = GenerateQrCode($"DONTHUOC-TONGHOP|LK:{idLanKham}|HS:{current.IdHoSo}");

            var pdf = Document.Create(container =>
            {
                container.Page(page =>
                {
                    page.Margin(32);
                    page.Size(PageSizes.A4);
                    page.DefaultTextStyle(TextStyle.Default.FontFamily("Times New Roman").FontSize(11));

                    page.Header().Element(c => BuildHeader(c, "ĐƠN THUỐC TỔNG HỢP", qrBytes, current));
                    page.Content().Column(col =>
                    {
                        col.Spacing(10);
                        col.Item().Element(c => BuildPatientBlock(c, visits.FirstOrDefault(), papers.Values.OrderByDescending(x => x.CreatedAt).FirstOrDefault()));

                        foreach (var visit in visits)
                        {
                            var don = prescriptions.FirstOrDefault(x => x.IdLanKham == visit.Id);
                            var rows = don != null && detailByDon.TryGetValue(don.Id, out var r) ? r : new List<ChiTietDonThuoc>();
                            papers.TryGetValue(visit.Id, out var paper);
                            col.Item().Element(c => BuildPrescriptionRoom(c, visit, don, rows, paper));
                        }
                    });
                    page.Footer().Element(BuildFooter);
                });
            }).GeneratePdf();

            await _audit.WriteAsync(
                idLanKham,
                "PRINT_DOCUMENT",
                doiTuong: "DON_THUOC_TONG_HOP",
                idDoiTuong: idLanKham,
                duLieuSau: new
                {
                    fileName = $"DonThuocTongHop_{current.IdHoSo ?? idLanKham}.pdf",
                    visitIds,
                    prescriptionIds = donIds
                });

            return File(pdf, "application/pdf", $"DonThuocTongHop_{current.IdHoSo ?? idLanKham}.pdf");
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> Export(long id)
        {
            var don = await _db.DonThuocs
                .Include(x => x.IdBenhNhanNavigation)
                .Include(x => x.IdBacSiNavigation)
                .Include(x => x.IdLanKhamNavigation)
                    .ThenInclude(x => x!.IdPhongNavigation)
                .Include(x => x.IdLanKhamNavigation)
                    .ThenInclude(x => x!.IdBenhNavigation)
                .FirstOrDefaultAsync(x => x.Id == id);

            if (don == null)
                return NotFound(new { message = "Không tìm thấy đơn thuốc!" });

            if (!IsVisitConcluded(don.IdLanKhamNavigation?.TrangThai))
                return BadRequest(new { message = "Chỉ in đơn thuốc sau khi lượt khám đã kết luận." });

            var chiTiet = await _db.ChiTietDonThuocs
                .Include(x => x.IdThuocNavigation)
                    .ThenInclude(x => x!.IdNhomNavigation)
                .Where(x => x.IdDonThuoc == id)
                .ToListAsync();

            var paper = don.IdLanKham.HasValue
                ? await _db.GiayKetLuanKhams
                    .AsNoTracking()
                    .Where(x => x.IdLanKham == don.IdLanKham.Value)
                    .OrderByDescending(x => x.CreatedAt)
                    .FirstOrDefaultAsync()
                : null;
            var qrBytes = GenerateQrCode($"{don.IdBenhNhanNavigation?.HoTen} | BN:{don.IdBenhNhan} | Đơn:{don.Id}");

            var pdf = Document.Create(container =>
            {
                container.Page(page =>
                {
                    page.Margin(32);
                    page.Size(PageSizes.A4);
                    page.DefaultTextStyle(TextStyle.Default.FontFamily("Times New Roman").FontSize(11));

                    page.Header().Element(c => BuildHeader(c, "ĐƠN THUỐC", qrBytes, don.IdLanKhamNavigation));
                    page.Content().Column(col =>
                    {
                        col.Spacing(10);
                        col.Item().Element(c => BuildPatientBlock(c, don.IdLanKhamNavigation, paper, don.IdBenhNhanNavigation));
                        col.Item().Element(c => BuildPrescriptionRoom(c, don.IdLanKhamNavigation, don, chiTiet, paper));
                    });
                    page.Footer().Element(BuildFooter);
                });
            }).GeneratePdf();

            await _audit.WriteAsync(
                don.IdLanKham,
                "PRINT_DOCUMENT",
                doiTuong: "DON_THUOC",
                idDoiTuong: don.Id,
                duLieuSau: new
                {
                    fileName = $"DonThuoc_{don.IdBenhNhan}_{don.Id}.pdf",
                    don.IdBenhNhan,
                    soDongThuoc = chiTiet.Count
                });

            return File(pdf, "application/pdf", $"DonThuoc_{don.IdBenhNhan}_{don.Id}.pdf");
        }

        private async Task<List<LanKham>> LoadRelatedVisits(LanKham current)
        {
            var query = _db.LanKhams
                .AsNoTracking()
                .Include(x => x.IdBenhNhanNavigation)
                .Include(x => x.IdPhongNavigation)
                .Include(x => x.IdBacSiNavigation)
                .Include(x => x.IdBenhNavigation)
                .Include(x => x.LanKhamBenhKemTheos)
                    .ThenInclude(x => x.IdBenhNavigation)
                .AsQueryable();

            if (current.IdHoSo.HasValue)
            {
                query = query.Where(x => x.IdHoSo == current.IdHoSo);
            }
            else
            {
                var day = (current.CreatedAt ?? DateTime.Today).Date;
                var nextDay = day.AddDays(1);
                query = query.Where(x =>
                    x.IdBenhNhan == current.IdBenhNhan &&
                    x.CreatedAt >= day &&
                    x.CreatedAt < nextDay);
            }

            return await query.OrderBy(x => x.CreatedAt).ThenBy(x => x.Id).ToListAsync();
        }

        private async Task<Dictionary<long, GiayKetLuanKham>> LoadLatestConclusionPapers(List<long> visitIds)
        {
            var papers = await _db.GiayKetLuanKhams
                .AsNoTracking()
                .Where(x => visitIds.Contains(x.IdLanKham))
                .OrderByDescending(x => x.CreatedAt)
                .ToListAsync();

            return papers.GroupBy(x => x.IdLanKham).ToDictionary(g => g.Key, g => g.First());
        }

        private void BuildHeader(IContainer container, string title, byte[] qr, LanKham? visit)
        {
            container.Column(col =>
            {
                col.Item().Row(row =>
                {
                    row.RelativeItem().Column(left =>
                    {
                        left.Item().Text("BỘ Y TẾ").FontSize(10);
                        left.Item().Text("PHÒNG KHÁM ĐA KHOA").Bold().FontSize(15).FontColor("#075985");
                        left.Item().Text(visit?.IdPhongNavigation?.KhoaPhong ?? "Khoa Khám bệnh").SemiBold().FontColor("#0369A1");
                    });

                    row.ConstantItem(130).AlignCenter().Column(mid =>
                    {
                        mid.Item().Height(52).Image(qr);
                        mid.Item().AlignCenter().Text($"Mã lượt khám: {visit?.Id}").FontSize(8).FontColor(Colors.Grey.Darken1);
                    });

                    row.RelativeItem().AlignRight().Column(right =>
                    {
                        right.Item().Text(visit?.IdPhongNavigation?.TenPhong ?? "Phòng khám").Bold().FontSize(11).FontColor("#075985");
                        right.Item().Text($"Mã HS: {visit?.IdHoSo?.ToString() ?? "---"}").FontSize(10).FontColor("#075985");
                        right.Item().Text($"Mã BN: {visit?.IdBenhNhan?.ToString() ?? "---"}").FontSize(10).FontColor("#075985");
                    });
                });

                col.Item().PaddingTop(8).LineHorizontal(1).LineColor(Colors.Grey.Darken2);
                col.Item().PaddingTop(8).AlignCenter().Text(title).Bold().FontSize(18);
            });
        }

        private void BuildPatientBlock(IContainer container, LanKham? visit, GiayKetLuanKham? paper, BenhNhan? patientOverride = null)
        {
            var patient = patientOverride ?? visit?.IdBenhNhanNavigation;
            container.Border(0.5f).BorderColor(Colors.Grey.Lighten1).Padding(8).Column(col =>
            {
                col.Spacing(4);
                col.Item().Text("THÔNG TIN NGƯỜI BỆNH").Bold().FontColor("#075985");
                col.Item().Row(row =>
                {
                    row.RelativeItem().Text(t =>
                    {
                        t.Span("Họ và tên: ").Bold();
                        t.Span(patient?.HoTen?.ToUpperInvariant() ?? "---").Bold().FontColor("#075985");
                    });
                    row.RelativeItem().Text($"Ngày sinh: {FormatDate(patient?.NgaySinh)}");
                    row.RelativeItem().Text($"Giới tính: {patient?.GioiTinh ?? "---"}");
                });
                col.Item().Text($"Địa chỉ: {BuildAddress(patient)}");
                col.Item().Text(t =>
                {
                    t.Span("Chẩn đoán: ").Bold().Underline();
                    t.Span(BuildDiagnosisText(visit));
                });

                if (paper?.NgayHen != null)
                    col.Item().Text($"Ngày hẹn khám lại: {paper.NgayHen:dd/MM/yyyy} tại {paper.PhongHen ?? visit?.IdPhongNavigation?.TenPhong ?? "---"}").FontColor("#B91C1C");
            });
        }

        private void BuildPrescriptionRoom(IContainer container, LanKham? visit, DonThuoc? don, List<ChiTietDonThuoc> list, GiayKetLuanKham? paper)
        {
            container.Border(0.5f).BorderColor(Colors.Grey.Lighten1).Padding(8).Column(col =>
            {
                col.Spacing(7);
                col.Item().Row(row =>
                {
                    row.RelativeItem().Text($"{visit?.IdPhongNavigation?.TenPhong ?? "Phòng khám"}").Bold().FontColor("#075985");
                    row.RelativeItem().AlignRight().Text($"Bác sĩ kê: {don?.IdBacSiNavigation?.HoTen ?? visit?.IdBacSiNavigation?.HoTen ?? "---"}").Bold();
                });

                col.Item().Text($"Chẩn đoán/lời dặn: {BuildDiagnosisText(visit)}").FontSize(10);
                if (!string.IsNullOrWhiteSpace(don?.GhiChu))
                    col.Item().Text($"Lời dặn đơn thuốc: {don.GhiChu}").FontSize(10);
                if (!string.IsNullOrWhiteSpace(paper?.LoiDan))
                    col.Item().Text($"Lời dặn kết luận: {paper.LoiDan}").FontSize(10);

                if (list.Count == 0)
                {
                    col.Item().Padding(8).Background("#F8FAFC").Text("Phòng này không kê thuốc. Ghi chú/lời dặn vẫn được đưa vào đơn tổng nếu có.").Italic();
                    return;
                }

                col.Item().Table(table =>
                {
                    table.ColumnsDefinition(columns =>
                    {
                        columns.ConstantColumn(28);
                        columns.RelativeColumn(2.5f);
                        columns.ConstantColumn(45);
                        columns.RelativeColumn(1.2f);
                        columns.RelativeColumn(1.1f);
                        columns.RelativeColumn(2f);
                    });

                    table.Header(header =>
                    {
                        HeaderCell(header.Cell()).Text("STT").Bold();
                        HeaderCell(header.Cell()).Text("Tên thuốc").Bold();
                        HeaderCell(header.Cell()).Text("SL").Bold();
                        HeaderCell(header.Cell()).Text("Đơn vị").Bold();
                        HeaderCell(header.Cell()).Text("Loại").Bold();
                        HeaderCell(header.Cell()).Text("Cách dùng").Bold();
                    });

                    var index = 1;
                    foreach (var group in list.GroupBy(x => GetMedicineCategory(x.IdThuocNavigation)))
                    {
                        table.Cell().ColumnSpan(6).Background("#EAF6FF").Border(0.5f).Padding(4)
                            .Text(group.Key).Bold().FontColor("#075985");

                        foreach (var item in group)
                        {
                            BodyCell(table.Cell()).Text(index.ToString());
                            BodyCell(table.Cell()).Text($"{item.IdThuocNavigation?.Ten ?? "---"}{FormatIngredient(item.IdThuocNavigation)}");
                            BodyCell(table.Cell()).AlignCenter().Text((item.SoLuong ?? 0).ToString());
                            BodyCell(table.Cell()).AlignCenter().Text(item.DonVi ?? item.IdThuocNavigation?.DonVi ?? "---");
                            BodyCell(table.Cell()).AlignCenter().Text(group.Key);
                            BodyCell(table.Cell()).Text(BuildUsage(item));
                            index++;
                        }
                    }
                });

                col.Item().PaddingTop(8).Row(row =>
                {
                    row.RelativeItem().Text($"Tổng tiền: {FormatMoney(list.Sum(x => (x.IdThuocNavigation?.DonGia ?? 0m) * (x.SoLuong ?? 0)))}").Bold();
                    row.RelativeItem().AlignRight().Column(sign =>
                    {
                        sign.Item().Text($"Ngày {DateTime.Now:dd} tháng {DateTime.Now:MM} năm {DateTime.Now:yyyy}").Italic();
                        sign.Item().Text("BÁC SĨ KÊ ĐƠN").Bold();
                        sign.Item().Text("(Ký, ghi rõ họ tên)").Italic();
                        sign.Item().PaddingTop(45).Text(don?.IdBacSiNavigation?.HoTen ?? visit?.IdBacSiNavigation?.HoTen ?? "").Bold();
                    });
                });
            });
        }

        private static IContainer HeaderCell(IContainer container)
        {
            return container.Border(0.5f).Background("#F1F9FF").Padding(4).AlignCenter();
        }

        private static IContainer BodyCell(IContainer container)
        {
            return container.Border(0.5f).Padding(4);
        }

        private static void BuildFooter(IContainer container)
        {
            container.AlignLeft().PaddingTop(8).Text("Lời dặn: dùng thuốc đúng hướng dẫn; mang theo đơn thuốc và giấy hẹn khi tái khám.").FontSize(9).Italic();
        }

        private static string BuildDiagnosisText(LanKham? visit)
        {
            var main = visit?.IdBenhNavigation != null
                ? $"{visit.IdBenhNavigation.Ma} - {visit.IdBenhNavigation.Ten}"
                : visit?.ChanDoanCuoi;

            var comorbid = visit?.LanKhamBenhKemTheos?
                .OrderBy(x => x.ThuTu)
                .Select(x => x.IdBenhNavigation == null ? null : $"{x.IdBenhNavigation.Ma} - {x.IdBenhNavigation.Ten}")
                .Where(x => !string.IsNullOrWhiteSpace(x))
                .ToList() ?? new List<string?>();

            if (!string.IsNullOrWhiteSpace(visit?.BenhKemTheo))
                comorbid.Add(visit.BenhKemTheo);

            var parts = new List<string>();
            if (!string.IsNullOrWhiteSpace(main)) parts.Add(main!);
            if (comorbid.Count > 0) parts.Add("Bệnh kèm theo: " + string.Join("; ", comorbid));

            return parts.Count == 0 ? "---" : string.Join(" | ", parts);
        }

        private static string BuildUsage(ChiTietDonThuoc item)
        {
            var doses = new List<string>();
            if ((item.Sang ?? 0) > 0) doses.Add($"Sáng {item.Sang}");
            if ((item.Trua ?? 0) > 0) doses.Add($"Trưa {item.Trua}");
            if ((item.Chieu ?? 0) > 0) doses.Add($"Chiều {item.Chieu}");
            if ((item.Toi ?? 0) > 0) doses.Add($"Tối {item.Toi}");
            if ((item.Khuya ?? 0) > 0) doses.Add($"Khuya {item.Khuya}");

            var text = doses.Count == 0 ? "Theo hướng dẫn bác sĩ" : string.Join(", ", doses);
            if ((item.SoNgayUong ?? 0) > 0) text += $" trong {item.SoNgayUong} ngày";
            if (!string.IsNullOrWhiteSpace(item.GhiChu)) text += $". {item.GhiChu}";
            return text;
        }

        private static string FormatIngredient(Thuoc? thuoc)
        {
            var ingredient = GetHoatChatLabel(thuoc);
            return string.IsNullOrWhiteSpace(ingredient) || ingredient == thuoc?.Ten ? "" : $" ({ingredient})";
        }

        private static string FormatDate(DateOnly? date)
        {
            return date.HasValue ? date.Value.ToString("dd/MM/yyyy") : "---";
        }

        private static string BuildAddress(BenhNhan? patient)
        {
            if (patient == null) return "---";
            var parts = new[]
            {
                patient.DiaChiDuong,
                patient.DiaChiXa,
                patient.DiaChiHuyen,
                patient.DiaChiTinh
            }.Where(x => !string.IsNullOrWhiteSpace(x));
            var address = string.Join(", ", parts);
            return string.IsNullOrWhiteSpace(address) ? "---" : address;
        }

        private static string FormatMoney(decimal value)
        {
            return value.ToString("N0", new CultureInfo("vi-VN")) + "đ";
        }

        private static bool IsVisitConcluded(string? status)
        {
            var normalized = (status ?? string.Empty).Trim().ToUpperInvariant();
            return normalized is "DA_KHAM" or "DA_DONG" or "DONG" or "DA_HUY" or "HUY";
        }

        private static string GetMedicineCategory(Thuoc? thuoc)
        {
            var raw = (thuoc?.LoaiThuoc ?? thuoc?.IdNhomNavigation?.Ten ?? string.Empty).Trim();
            var normalized = NormalizeKey(raw);

            if (normalized.Contains("BHYT")) return "BHYT";
            if (normalized.Contains("GAY NGHIEN") || normalized.Contains("NGHIEN")) return "Gây nghiện";
            if (normalized.Contains("HUONG THAN") || normalized.Contains("TAM THAN")) return "Hướng thần";
            if (normalized.Contains("MUA NGOAI") || normalized.Contains("NGOAI")) return "Mua ngoài";
            if (normalized.Contains("TU PHI") || normalized.Contains("DICH VU")) return "Tự phí";

            return string.IsNullOrWhiteSpace(raw) ? "Tự phí" : raw;
        }

        private static string GetHoatChatLabel(Thuoc? thuoc)
        {
            if (thuoc == null) return string.Empty;
            if (!string.IsNullOrWhiteSpace(thuoc.HoatChat)) return thuoc.HoatChat.Trim();

            var match = Regex.Match(thuoc.MoTa ?? string.Empty, @"(?:ho[aạ]t\s*ch[aấ]t|active\s*ingredient)\s*[:=\-]\s*(.+)", RegexOptions.IgnoreCase);
            return match.Success ? match.Groups[1].Value.Trim() : thuoc.Ten;
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

            return Regex.Replace(builder.ToString().Normalize(NormalizationForm.FormC).ToUpperInvariant(), @"[^A-Z0-9]+", " ").Trim();
        }

        private static byte[] GenerateQrCode(string text)
        {
            using var generator = new QRCodeGenerator();
            using var data = generator.CreateQrCode(text, QRCodeGenerator.ECCLevel.Q);
            using var qr = new QRCode(data);
            using var bmp = qr.GetGraphic(5);
            using var ms = new MemoryStream();
            bmp.Save(ms, System.Drawing.Imaging.ImageFormat.Png);
            return ms.ToArray();
        }
    }
}
