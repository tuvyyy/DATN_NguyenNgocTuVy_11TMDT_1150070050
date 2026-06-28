using ThucTapTotNghiep_1150070050_NguyenNgocTuVy.Data;
using ThucTapTotNghiep_1150070050_NguyenNgocTuVy.Dtos;
using ThucTapTotNghiep_1150070050_NguyenNgocTuVy.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ThucTapTotNghiep_1150070050_NguyenNgocTuVy.Controllers;

[ApiController]
[Authorize]
[Route("api/chidinh")]
public class ChiDinhKhamController : ControllerBase
{
    private readonly DACNDbContext _db;
    private readonly PricingService _pricing;
    private readonly ICodeGenerator _code;
    private readonly IHoSoTrangThaiService _hoSoTrangThai;

    public ChiDinhKhamController(
        DACNDbContext db,
        PricingService pricing,
        ICodeGenerator code,
        IHoSoTrangThaiService hoSoTrangThai)
    {
        _db = db;
        _pricing = pricing;
        _code = code;
        _hoSoTrangThai = hoSoTrangThai;
    }

    /// <summary>
    /// Láº¥y danh sĂ¡ch phĂ²ng khĂ¡m Ä‘ang hoáº¡t Ä‘á»™ng kĂ¨m dá»‹ch vá»¥ & giĂ¡ hiá»‡n hĂ nh (náº¿u cĂ³).
    /// </summary>
    [HttpGet("clinics/prices")]
    public async Task<IActionResult> GetClinicsWithCurrentPrice()
    {
        var query =
            from p in _db.PhongKhams
            where p.HoatDong == true
            join dv in _db.DichVus on p.Id equals dv.IdPhong
            where dv.HoatDong == true
            select new { p.Id, p.TenPhong, IdDichVu = dv.Id, dv.Ten };

        var baseList = await query.ToListAsync();
        var result = new List<ClinicWithPriceDto>();

        foreach (var item in baseList)
        {
            var price = await _pricing.GetCurrentPriceAsync(item.IdDichVu, item.Id);
            if (price.HasValue)
            {
                result.Add(new ClinicWithPriceDto
                {
                    IdPhong = item.Id,
                    TenPhong = item.TenPhong,
                    IdDichVu = item.IdDichVu,
                    TenDichVu = item.Ten,
                    DonGia = price.Value
                });
            }
        }
        return Ok(result);
    }

    /// <summary>
    /// Chá»‰ Ä‘á»‹nh khĂ¡m: táº¡o cĂ¡c láº§n khĂ¡m theo phĂ²ng Ä‘Ă£ chá»n + táº¡o hĂ³a Ä‘Æ¡n & chi tiáº¿t tiá»n khĂ¡m.
    /// </summary>
    [HttpPost]
    public async Task<IActionResult> CreateChiDinh([FromBody] ChiDinhKhamRequest req)
    {
        // âœ… Validate cÄƒn báº£n
        if (req.IdBenhNhan <= 0) return BadRequest("IdBenhNhan khĂ´ng há»£p lá»‡.");
        if (req.IdHoSo <= 0) return BadRequest("IdHoSo khĂ´ng há»£p lá»‡.");
        if (req.IdPhongChon == null || req.IdPhongChon.Count == 0)
            return BadRequest("Vui lĂ²ng chá»n Ă­t nháº¥t má»™t phĂ²ng.");

        // âœ… Äáº£m báº£o há»“ sÆ¡ tá»“n táº¡i
        var hoSo = await _db.HoSoBenhAns.FirstOrDefaultAsync(h => h.Id == req.IdHoSo && h.IdBenhNhan == req.IdBenhNhan);
        if (hoSo == null) return NotFound("KhĂ´ng tĂ¬m tháº¥y há»“ sÆ¡ bá»‡nh Ă¡n phĂ¹ há»£p.");

        var today = DateTime.Today;
        if (!hoSo.NgayTao.HasValue)
            return BadRequest("Há»“ sÆ¡ khĂ´ng cĂ³ ngĂ y tiáº¿p Ä‘Ă³n há»£p lá»‡, khĂ´ng thá»ƒ chuyá»ƒn chá»‰ Ä‘á»‹nh.");

        if (hoSo.NgayTao.Value.Date != today)
            return BadRequest(
                $"Há»“ sÆ¡ nĂ y Ä‘Æ°á»£c táº¡o ngĂ y {hoSo.NgayTao.Value:dd/MM/yyyy}. " +
                $"Chá»‰ cho phĂ©p chuyá»ƒn chá»‰ Ä‘á»‹nh tá»« há»“ sÆ¡ tiáº¿p Ä‘Ă³n trong ngĂ y ({today:dd/MM/yyyy}).");

        // âœ… Láº¥y DV thuá»™c cĂ¡c phĂ²ng Ä‘Ă£ chá»n (Ä‘ang hoáº¡t Ä‘á»™ng)

        var status = _hoSoTrangThai.NormalizeStatus(hoSo.TrangThai);
        if (status == "CHI_DINH")
            return Conflict(new
            {
                message = "Ho so nay da chi dinh truoc do, khong the chi dinh lai.",
                state = "ALREADY_ORDERED",
                idHoSo = hoSo.Id,
                maHs = hoSo.MaHs
            });

        if (status == "DA_KHAM" || status == "DONG")
            return BadRequest("Ho so da hoan tat, khong the chi dinh them.");

        if (status == "HUY")
            return BadRequest("Ho so da huy, khong the chi dinh.");

        var canOrderFromStatus = string.IsNullOrWhiteSpace(status)
                                 || status == "MOI"
                                 || status == "CHUA_CHI_DINH"
                                 || status == "CHO_CHI_DINH";
        if (!canOrderFromStatus)
            return BadRequest($"Trang thai ho so '{status}' khong hop le de chi dinh.");

        var hasActiveOrderedRoom = await _db.LanKhams.AnyAsync(lk =>
            lk.IdHoSo == req.IdHoSo &&
            lk.IdPhong.HasValue &&
            lk.TrangThai != "DA_HUY");

        if (hasActiveOrderedRoom)
            return Conflict(new
            {
                message = "Ho so nay da co chi dinh phong kham truoc do. Khong the tao chi dinh trung.",
                state = "ORDER_EXISTS"
            });

        var dichVus = await _db.DichVus
            .Where(d => d.HoatDong == true && d.IdPhong != null && req.IdPhongChon.Contains(d.IdPhong.Value))
            .ToListAsync();

        var now = DateTime.Now;
        var lanKhams = new List<Models.LanKham>();

        // âœ… Táº¡o láº§n khĂ¡m theo tá»«ng phĂ²ng
        foreach (var idPhong in req.IdPhongChon.Distinct())
        {
            // Bá» qua phĂ²ng khĂ´ng tá»“n táº¡i / Ä‘Ă£ ngÆ°ng
            var phongExist = await _db.PhongKhams.AnyAsync(p => p.Id == idPhong && p.HoatDong == true);
            if (!phongExist) continue;

            // TĂ¬m bĂ¡c sÄ© Ä‘ang phá»¥ trĂ¡ch phĂ²ng nĂ y trong báº£ng trung gian BAC_SI_PHONG
            long? idBacSiTrongPhong = await _db.BacSiPhongs
                .Where(x => x.IdPhong == idPhong)
                .Select(x => (long?)x.IdBacSi)
                .FirstOrDefaultAsync();

            // Náº¿u khĂ´ng tĂ¬m tháº¥y mĂ  request cĂ³ IdBacSi thĂ¬ xĂ i táº¡m IdBacSi trong request
            if (!idBacSiTrongPhong.HasValue && req.IdBacSi > 0)
            {
                idBacSiTrongPhong = req.IdBacSi;
            }

            // Táº¡o láº§n khĂ¡m
            var lk = new Models.LanKham
            {
                IdHoSo = req.IdHoSo,
                IdBenhNhan = req.IdBenhNhan,
                IdPhong = idPhong,
                IdBacSi = idBacSiTrongPhong,     // â­ GĂN Tá»° Äá»˜NG THEO PHĂ’NG
                TrangThai = "CHO_KHAM",
                CreatedAt = now,
                UpdatedAt = now,
                LyDo = string.IsNullOrWhiteSpace(req.GhiChu) ? "CHIDINH" : req.GhiChu
            };

            _db.LanKhams.Add(lk);
            lanKhams.Add(lk);
        }


        await _db.SaveChangesAsync(); // cáº§n Ä‘á»ƒ cĂ³ Id lan_kham

        // Náº¿u khĂ´ng táº¡o Ä‘Æ°á»£c láº§n khĂ¡m nĂ o
        if (lanKhams.Count == 0) return BadRequest("KhĂ´ng táº¡o Ä‘Æ°á»£c láº§n khĂ¡m nĂ o (kiá»ƒm tra phĂ²ng Ä‘ang chá»n).");

        // âœ… Táº¡o hĂ³a Ä‘Æ¡n khung
        var hd = new Models.HoaDon
        {
            MaHd = _code.GenMa("HD"),
            IdBenhNhan = req.IdBenhNhan,
            LoaiHoaDon = "KHAM",
            HinhThucTt = "TIEN_MAT",
            TongTienTruoc = 0,
            GiamGia = 0,
            ThueVat = 0,
            TongTien = 0,
            TrangThai = "TAO",
            NgayTao = now,
            IdThuNgan = req.IdThuNgan,
            GhiChu = req.GhiChu
        };
        _db.HoaDons.Add(hd);
        await _db.SaveChangesAsync();

        // âœ… Táº¡o chi tiáº¿t hĂ³a Ä‘Æ¡n theo tá»«ng láº§n khĂ¡m/phĂ²ng
        decimal tong = 0m;
        var chiTiet = new List<ChiTietPhongKhamItem>();

        foreach (var lk in lanKhams)
        {
            var dv = dichVus.FirstOrDefault(d => d.IdPhong == lk.IdPhong);
            if (dv == null) continue;

            var donGia = await _pricing.GetCurrentPriceAsync(dv.Id, lk.IdPhong);
            if (!donGia.HasValue) continue;

            var ct = new Models.ChiTietHoaDon
            {
                IdHoaDon = hd.Id,
                LoaiThamChieu = "PHONG_KHAM",
                IdThamChieu = lk.Id, // tham chiáº¿u láº§n khĂ¡m
                MoTa = $"KhĂ¡m táº¡i phĂ²ng: {lk.IdPhong} - {dv.Ten}",
                SoLuong = 1,
                DonGia = donGia.Value,
                ThanhTien = donGia.Value,
                ThueVat = 0
            };
            _db.ChiTietHoaDons.Add(ct);
            tong += donGia.Value;

            var tenPhong = await _db.PhongKhams
                .Where(p => p.Id == lk.IdPhong)
                .Select(p => p.TenPhong)
                .FirstAsync();

            chiTiet.Add(new ChiTietPhongKhamItem
            {
                IdPhong = lk.IdPhong ?? 0,
                TenPhong = tenPhong,
                TenDichVu = dv.Ten,
                DonGia = donGia.Value,
                IdLanKham = lk.Id
            });
        }

        // âœ… Cáº­p nháº­t tá»•ng tiá»n
        hd.TongTienTruoc = tong;
        hd.TongTien = tong;

        var transition = _hoSoTrangThai.ApplyTransition(
            hoSo,
            "CHI_DINH",
            req.IdThuNgan > 0 ? req.IdThuNgan : null,
            "CHI_DINH_KHAM_CREATED",
            "Táº¡o chá»‰ Ä‘á»‹nh khĂ¡m tá»« luá»“ng tiáº¿p Ä‘Ă³n."
        );
        if (!transition.Success)
        {
            hd.GhiChu = $"{hd.GhiChu} | STATE_WARNING: {transition.ErrorMessage}".Trim();
        }

        await _db.SaveChangesAsync();

        return Ok(new
        {
            hd.Id,
            hd.MaHd,
            hd.TongTien,
            ChiTiet = chiTiet
        });
    }
}


