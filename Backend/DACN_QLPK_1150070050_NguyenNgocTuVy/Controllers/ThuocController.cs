using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using DACN_QLPK_1150070050_NguyenNgocTuVy.Data;

[ApiController]
[Route("api/[controller]")]
public class ThuocController : ControllerBase
{
    private readonly DACNDbContext _db;
    public ThuocController(DACNDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var list = await _db.Thuocs
            .Include(x => x.IdNhomNavigation)
            .Where(x => x.HoatDong == true)
            .OrderBy(x => x.Ten)
            .Select(x => new
            {
                x.Id,
                x.Ma,
                x.Ten,
                x.HamLuong,
                x.HoatChat,
                x.LoaiThuoc,
                x.DonVi,
                x.DonGia,
                x.SoLuongTon,
                TenNhom = x.IdNhomNavigation != null ? x.IdNhomNavigation.Ten : null
            })
            .ToListAsync();

        return Ok(list);
    }
}
